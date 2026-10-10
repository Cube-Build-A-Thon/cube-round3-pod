"""Condition Agent for Returns Inspection.

Classifies returned product condition strictly using the official Amazon Condition Taxonomy:
- New
- Used - Like New
- Used - Very Good
- Used - Good
- Used - Acceptable
- Unacceptable
- UNCERTAIN (when evidence is unclear, obscured, or ambiguous)

Decision Priority:
1. Vision Agent evidence (HIGHEST)
2. Explicit operator evidence (Headless Bench Evaluation)
3. Catalogue data (Baseline reference only)

Rules:
- Never trusts observed_state dropdown alone when an image is present.
- Requires affirmative visual evidence for damage and packaging state.
- Otherwise returns UNCERTAIN. Never invents custom condition labels.
"""

import re
import time
from typing import Any, Dict, List, Optional, Tuple
from ..catalog import ProductDefinition
from ..models import AmazonCondition, CheckResult, CheckVerdict
from ..utils import contains_damage_terms

NEGATED_DAMAGE_RE = re.compile(
    r"\b(?:no|not|none|without|zero|never|free\s+of|lack\s+of)\b(?:\s+\w+){0,4}?\s+\b(?:damage|damaged|damages|defect|defects|breakage|broken|fracture|fractured|fractures|crack|cracked|cracks|dent|dented|dents|tear|tears|rip|rips|leak|leaks|blemish|blemishes|scratch|scratches|wear|scuff|scuffs)(?:\s*(?:,|or|and)\s*(?:damage|damaged|damages|defect|defects|breakage|broken|fracture|fractured|fractures|crack|cracked|cracks|dent|dented|dents|tear|tears|rip|rips|leak|leaks|blemish|blemishes|scratch|scratches|wear|scuff|scuffs))*\b",
    re.IGNORECASE,
)

PREFIX_NEGATED_RE = re.compile(
    r"\bun[\s-]?(?:damaged?|broken|cracked?|dented?|scratched?|bent|torn|marred|blemished?|fractured?|severed?)\b",
    re.IGNORECASE,
)

SUFFIX_FREE_RE = re.compile(
    r"\b(?:crack|damage|defect|scratch|dent|blemish|break|tear|leak|fracture|flaw|chip)s?[\s-]+free\b",
    re.IGNORECASE,
)

PACKAGING_DAMAGE_RE = re.compile(
    r"\b(?:box|packaging|carton|parcel|container|package|shipping\s+box|outer\s+box|exterior\s+box)\b[^\.;,]{0,30}?\b(?:crushed|damaged|damage|dented|dent|torn|tear|tears|ripped|rip|rips|scuffed|scuff|scuffs|smashed|opened|broken)\b|\b(?:crushed|damaged|damage|dented|dent|torn|tear|tears|ripped|rip|rips|scuffed|scuff|scuffs|smashed|opened|broken)\b[^\.;,]{0,30}?\b(?:box|packaging|carton|parcel|container|package|shipping\s+box|outer\s+box|exterior\s+box)\b",
    re.IGNORECASE,
)

POSITIVE_DAMAGE_KEYWORDS = [
    "broken", "crack", "cracked", "cracks", "fracture", "fractured", "fractures",
    "shatter", "shattered", "dent", "dented", "dents", "bent", "torn", "frayed",
    "leak", "leaking", "breakage", "damage", "damaged", "smashed", "severed", "crushed"
]

POSITIVE_DAMAGE_RE = re.compile(
    r"\b(?:structural\s+damage|damage\s+observed|damage\s+detected|"
    + "|".join(re.escape(k) for k in POSITIVE_DAMAGE_KEYWORDS if " " not in k)
    + r")\b",
    re.IGNORECASE,
)


class ConditionAgent:
    def __init__(self, model_version: str = "condition-agent-v2.0"):
        self.model_version = model_version

    @staticmethod
    def _is_negated_phrase(text: Optional[str]) -> bool:
        """Returns True if the entire text represents a negated or non-damage statement."""
        if not text:
            return True
        norm = text.strip().lower().rstrip(".,;!")
        if norm in {
            "none", "no", "n/a", "na", "nil", "intact", "pristine", "clean",
            "normal", "ok", "okay", "undamaged", "zero", "unbroken", "un-damaged",
            "un-broken", "crack-free", "crack free", "damage-free", "damage free",
            "scratch-free", "defect-free", "blemish-free", "flawless", "mint"
        }:
            return True
        # Affirmative intact statement such as "the item is undamaged", "item is crack-free"
        if re.match(
            r"^(?:the\s+)?(?:item|product|unit|device|packaging|merchandise)?\s*(?:is|appears|looks)?\s*(?:completely|totally|entirely)?\s*(?:undamaged|unbroken|intact|pristine|clean|flawless|crack-free|damage-free|defect-free|scratch-free)[\.\,\!]?$",
            norm,
        ):
            return True
        neg_full = re.match(
            r"^(?:there\s+is\s+|there\s+are\s+)?(?:no|not|none|without|zero|never|free\s+of)\b(?:\s+\w+){0,4}?\s+\b(?:damage|damaged|damages|defect|defects|breakage|broken|fracture|fractured|fractures|crack|cracked|cracks|dent|dented|dents|tear|tears|rip|rips|leak|leaks|blemish|blemishes|scratch|scratches|wear|scuff|scuffs)(?:\s+(?:observed|found|seen|detected|present|noted|reported|visible|apparent|to\s+[\w\s]+))*[\.\,\!]?$",
            norm,
        )
        return bool(neg_full)

    @classmethod
    def _extract_positive_product_damage(
        cls,
        visible_damage: Any,
        notes: Optional[str],
        catalog_product: Optional[ProductDefinition] = None,
    ) -> Tuple[bool, str]:
        """Detects explicit positive product damage, strictly excluding negated notes and packaging-only states."""
        items: List[str] = []
        if isinstance(visible_damage, str):
            items = [visible_damage]
        elif isinstance(visible_damage, (list, tuple)):
            items = [str(x) for x in visible_damage if x]

        # 1. Check visible_damage items for explicit positive product damage
        for item in items:
            norm = item.strip().lower()
            if not norm or cls._is_negated_phrase(norm):
                continue
            cleaned = PREFIX_NEGATED_RE.sub(" ", norm)
            cleaned = SUFFIX_FREE_RE.sub(" ", cleaned)
            cleaned = NEGATED_DAMAGE_RE.sub(" ", cleaned)
            is_box_only = any(b in cleaned for b in ["box", "packaging", "carton", "parcel", "package"]) and not any(
                p in cleaned for p in ["product", "item", "screen", "cable", "unit", "device", "component", "lens", "glass", "chassis", "housing", "surface", "body", "part"]
            )
            if is_box_only:
                continue
            if POSITIVE_DAMAGE_RE.search(cleaned) or "mismatch" in cleaned:
                return True, item

        # 2. Check notes for affirmative descriptive product damage
        if notes:
            norm_notes = notes.strip().lower()
            if not cls._is_negated_phrase(norm_notes):
                cleaned_notes = PREFIX_NEGATED_RE.sub(" ", norm_notes)
                cleaned_notes = SUFFIX_FREE_RE.sub(" ", cleaned_notes)
                cleaned_notes = NEGATED_DAMAGE_RE.sub(" ", cleaned_notes)
                cleaned_notes = PACKAGING_DAMAGE_RE.sub(" ", cleaned_notes)
                if POSITIVE_DAMAGE_RE.search(cleaned_notes) or "mismatch" in cleaned_notes:
                    return True, notes

        return False, ""

    def evaluate(
        self,
        catalog_product: Optional[ProductDefinition],
        observed_labels: Optional[Dict[str, Any]] = None,
        image_metadata: Optional[Dict[str, Any]] = None,
    ) -> CheckResult:
        start_time = time.time()
        observed_labels = observed_labels or {}
        image_metadata = image_metadata or {}

        has_image = image_metadata.get("has_image", False)
        vision_pkg_state = (image_metadata.get("packaging_state") or "").lower()
        vision_damage = image_metadata.get("visible_damage", [])

        operator_state = (observed_labels.get("observed_state") or "").lower()
        operator_defect = (observed_labels.get("defect_type") or "").lower()

        def is_consumable_violation(defect_str: str) -> bool:
            if catalog_product and not catalog_product.restockable_open_box:
                if catalog_product.category in ["Beauty & Personal Care", "Health & Household"]:
                    cleaned = NEGATED_DAMAGE_RE.sub(" ", (defect_str or "").lower())
                    return any(w in cleaned for w in ["tamper", "foil", "broken seal", "opened seal"])
            return False

        if has_image:
            notes_str = (image_metadata.get("uncertainty_notes") or image_metadata.get("ambiguity") or "").strip().lower()
            img_quality = image_metadata.get("image_quality") or "good"
            rec_cat = image_metadata.get("recommended_reason_category")

            # Rule 8: Gemini/API failure
            if rec_cat == "api_failure" or str(image_metadata.get("inference_source", "")).startswith("offline_failure_state"):
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.30,
                    detail={
                        "amazon_condition": AmazonCondition.UNCERTAIN.value,
                        "observed_state": "uncertain",
                        "reason": "model_error",
                        "category": "api_failure",
                        "evidence": "Vision model unavailable or API failure; cannot evaluate condition.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 5: Blurry or unusable image - do NOT guess condition
            if img_quality in ("blurry", "unusable") or rec_cat in ("blurry_image", "unusable_image"):
                latency_ms = int((time.time() - start_time) * 1000)
                is_blurry = img_quality == "blurry" or rec_cat == "blurry_image"
                cat_name = "blurry_image" if is_blurry else "unusable_image"
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.25,
                    detail={
                        "amazon_condition": AmazonCondition.UNCERTAIN.value,
                        "observed_state": "uncertain",
                        "reason": "poor_image",
                        "category": cat_name,
                        "evidence": "Image is too blurry, dark, or unusable for reliable product inspection. Condition cannot be graded.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 3: Affirmative product damage detection
            damage_desc = image_metadata.get("damage_description")
            has_affirmative_damage, damage_evidence = self._extract_positive_product_damage(
                vision_damage if not damage_desc else ([damage_desc] + list(vision_damage)),
                image_metadata.get("uncertainty_notes") or image_metadata.get("ambiguity"),
                catalog_product,
            )
            if not has_affirmative_damage and damage_desc and not self._is_negated_phrase(damage_desc):
                has_affirmative_damage = True
                damage_evidence = damage_desc
            if not has_affirmative_damage and image_metadata.get("condition") == "damaged":
                has_affirmative_damage = True
                damage_evidence = damage_desc or "Observed physical damage on product"
            if not has_affirmative_damage and is_consumable_violation(", ".join(vision_damage) if isinstance(vision_damage, list) else str(vision_damage)):
                has_affirmative_damage = True
                damage_evidence = "tamper seal breach on consumable product"

            if has_affirmative_damage:
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.FAIL,
                    confidence=0.96,
                    detail={
                        "amazon_condition": AmazonCondition.UNACCEPTABLE.value,
                        "observed_state": "damaged",
                        "category": "damaged_product",
                        "evidence": f"Visual damage observed: {damage_evidence}. Exceeds acceptable cosmetic wear threshold.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Direct condition classification from model
            model_cond = (image_metadata.get("condition") or "").lower()
            if model_cond == "new":
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.96,
                    detail={
                        "amazon_condition": AmazonCondition.NEW.value,
                        "observed_state": "new",
                        "evidence": "Visual inspection confirms item is in new, pristine condition.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )
            if model_cond in ("used_like_new", "like_new"):
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.94,
                    detail={
                        "amazon_condition": AmazonCondition.USED_LIKE_NEW.value,
                        "observed_state": "opened_unused",
                        "evidence": "Visual inspection confirms item is in like-new condition.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )
            if model_cond in ("used_good", "good", "used_acceptable", "acceptable"):
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.90,
                    detail={
                        "amazon_condition": AmazonCondition.USED_GOOD.value,
                        "observed_state": "signs_of_use",
                        "evidence": "Visual inspection confirms item is in good, acceptable functional condition.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # 2. A damaged box by itself must not return product FAIL; if the item's condition cannot be established, return UNCERTAIN.
            if vision_pkg_state in ["damaged", "empty_box"]:
                latency_ms = int((time.time() - start_time) * 1000)
                evidence_desc = (
                    "Packaging is damaged, but item condition cannot be conclusively established without secondary inspection."
                    if vision_pkg_state == "damaged"
                    else "Packaging is empty; returned item condition cannot be established."
                )
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.55,
                    detail={
                        "amazon_condition": AmazonCondition.UNCERTAIN.value,
                        "observed_state": vision_pkg_state,
                        "reason": "insufficient_evidence",
                        "evidence": evidence_desc,
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # 3. Genuine optical / visibility uncertainty: only evaluated when affirmative damage is absent
            # and notes are not purely negated damage notes (e.g. "no visible damage" does not trigger optical uncertainty)
            genuine_optical_uncertainty = any(
                term in notes_str
                for term in [
                    "glare", "blur", "out of focus", "defocused", "obscur", "unclear",
                    "cannot determine", "cannot verify", "lighting", "low resolution",
                    "resolution", "hidden", "ambiguous", "unable to assess", "unable to grade",
                ]
            )

            if genuine_optical_uncertainty or vision_pkg_state == "uncertain" or not vision_pkg_state:
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.50,
                    detail={
                        "amazon_condition": AmazonCondition.UNCERTAIN.value,
                        "observed_state": vision_pkg_state or "uncertain",
                        "reason": "poor_image" if genuine_optical_uncertainty else "insufficient_evidence",
                        "evidence": image_metadata.get("uncertainty_notes") or "Vision evidence cannot conclusively grade condition without manual secondary inspection. Never trusting dropdown alone.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            if vision_pkg_state == "factory_sealed":
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.99,
                    detail={
                        "amazon_condition": AmazonCondition.NEW.value,
                        "observed_state": "factory_sealed",
                        "evidence": "Visual confirmation of intact factory seal; pristine manufacturer packaging.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            if vision_pkg_state == "opened_unused":
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.94,
                    detail={
                        "amazon_condition": AmazonCondition.USED_LIKE_NEW.value,
                        "observed_state": "opened_unused",
                        "evidence": "Visual confirmation of open packaging with zero cosmetic blemishes on product.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            if vision_pkg_state == "signs_of_use":
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="condition",
                    verdict=CheckVerdict.PASS,
                    confidence=0.89,
                    detail={
                        "amazon_condition": AmazonCondition.USED_GOOD.value,
                        "observed_state": "signs_of_use",
                        "evidence": "Visual confirmation of moderate cosmetic wear consistent with normal use.",
                        "official_taxonomy": "Amazon Official Condition Guidelines",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.52,
                detail={
                    "amazon_condition": AmazonCondition.UNCERTAIN.value,
                    "observed_state": vision_pkg_state,
                    "reason": "insufficient_evidence",
                    "evidence": "Vision evidence could not grade condition with high confidence.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        unclear_operator = observed_labels.get("unclear_evidence", False) or operator_state == "uncertain"
        if unclear_operator:
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.50,
                detail={
                    "amazon_condition": AmazonCondition.UNCERTAIN.value,
                    "observed_state": "uncertain",
                    "reason": "insufficient_evidence",
                    "evidence": "Operator marked condition as uncertain; lighting or angle prevents grading.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        has_operator_damage = False
        if operator_defect and not self._is_negated_phrase(operator_defect):
            cleaned_defect = PREFIX_NEGATED_RE.sub(" ", operator_defect.lower())
            cleaned_defect = SUFFIX_FREE_RE.sub(" ", cleaned_defect)
            cleaned_defect = NEGATED_DAMAGE_RE.sub(" ", cleaned_defect)
            if contains_damage_terms(cleaned_defect) or is_consumable_violation(cleaned_defect):
                has_operator_damage = True

        if has_operator_damage:
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.FAIL,
                confidence=0.96,
                detail={
                    "amazon_condition": AmazonCondition.UNACCEPTABLE.value,
                    "observed_state": operator_state or "damaged",
                    "evidence": f"Damage observed in inspection ({operator_defect}). Exceeds acceptable wear threshold.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state in ["damaged", "empty_box"]:
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.50,
                detail={
                    "amazon_condition": AmazonCondition.UNCERTAIN.value,
                    "observed_state": operator_state,
                    "reason": "insufficient_evidence",
                    "evidence": f"Packaging is {operator_state}, but item condition cannot be conclusively established without secondary inspection.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state == "factory_sealed":
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.PASS,
                confidence=0.99,
                detail={
                    "amazon_condition": AmazonCondition.NEW.value,
                    "observed_state": "factory_sealed",
                    "evidence": "Operator confirmed factory seal intact; pristine manufacturer packaging.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state == "opened_unused":
            cond = AmazonCondition.USED_VERY_GOOD if "crumpled" in operator_defect or "corner" in operator_defect else AmazonCondition.USED_LIKE_NEW
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.PASS,
                confidence=0.93,
                detail={
                    "amazon_condition": cond.value,
                    "observed_state": "opened_unused",
                    "evidence": "Operator verified open box in pristine operational condition.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state == "signs_of_use":
            cond = AmazonCondition.USED_ACCEPTABLE if any(w in operator_defect for w in ["deep", "heavy", "stain"]) else AmazonCondition.USED_GOOD
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="condition",
                verdict=CheckVerdict.PASS,
                confidence=0.89,
                detail={
                    "amazon_condition": cond.value,
                    "observed_state": "signs_of_use",
                    "evidence": "Operator verified moderate cosmetic wear consistent with normal prior use.",
                    "official_taxonomy": "Amazon Official Condition Guidelines",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(
            check_key="condition",
            verdict=CheckVerdict.UNCERTAIN,
            confidence=0.50,
            detail={
                "amazon_condition": AmazonCondition.UNCERTAIN.value,
                "observed_state": operator_state,
                "evidence": "Dropdown state alone cannot verify Amazon condition without affirmative physical or visual evidence.",
                "official_taxonomy": "Amazon Official Condition Guidelines",
            },
            model_version=self.model_version,
            latency_ms=latency_ms,
        )
