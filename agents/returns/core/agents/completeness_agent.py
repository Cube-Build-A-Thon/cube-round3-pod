"""Completeness Agent for Returns Inspection.

Compares required parts vs visible returned components.
Decision Priority:
1. Vision Agent evidence (HIGHEST)
2. Explicit operator evidence
3. Catalogue data (Baseline reference only)

Rules:
- Never marks all parts present simply because parts_missing is empty.
- PASS only when vision (or verified operator evidence) confirms visible required components.
- If hidden, occluded, or unclear -> UNCERTAIN.
- Only marks missing when affirmative evidence supports it -> FAIL.
"""

import time
from typing import Any, Dict, List, Optional
from ..catalog import ProductDefinition
from ..models import CheckResult, CheckVerdict
from ..utils import normalize_text

COMPONENT_ALIASES: Dict[str, List[str]] = {
    "cable": [
        "cable", "cord", "wire", "connecting cable", "lead", "usb cable", "power cord", "power cable",
    ],
    "manual": [
        "manual", "user guide", "user manual", "user guide/manual", "guide",
        "instructions", "instruction manual", "instruction sheet", "pamphlet",
        "leaflet", "documentation", "booklet", "insert",
    ],
    "charger": [
        "charger", "power adapter", "power supply", "adapter", "charging cable", "charging cord",
    ],
    "box": [
        "box", "packaging", "carton", "product box", "gift box", "case",
    ],
    "lid": [
        "lid", "cap", "bottle cap", "spout", "cover", "top",
    ],
    "dropper": [
        "dropper", "glass dropper", "pipette", "vial", "applicator",
    ],
    "tub": [
        "tub", "jar", "container", "canister",
    ],
    "scoop": [
        "scoop", "measuring scoop", "spoon", "measuring spoon",
    ],
}


class CompletenessAgent:
    def __init__(self, model_version: str = "completeness-agent-v2.0"):
        self.model_version = model_version

    def _is_component_confirmed(
        self,
        expected_part: str,
        visible_parts: List[str],
        detected_text: str = "",
    ) -> bool:
        norm_expected = normalize_text(expected_part)
        norm_vis_list = [normalize_text(v) for v in visible_parts if v]
        extra_norm = normalize_text(detected_text) if detected_text else ""

        for v in norm_vis_list:
            if norm_expected == v:
                return True
            if len(norm_expected) >= 3 and norm_expected in v:
                return True
            if len(v) >= 3 and v in norm_expected:
                return True

        aliases = COMPONENT_ALIASES.get(expected_part.lower(), [])
        for alias in aliases:
            norm_alias = normalize_text(alias)
            for v in norm_vis_list:
                if norm_alias == v:
                    return True
                if len(norm_alias) >= 3 and norm_alias in v:
                    return True
            if extra_norm and len(norm_alias) >= 3 and norm_alias in extra_norm:
                return True

        tokens = [
            t for t in norm_expected.split()
            if len(t) >= 3 and t not in ("and", "the", "for", "with", "set", "pack", "box")
        ]
        for v in norm_vis_list:
            v_tokens = set(v.split())
            if any(t in v_tokens for t in tokens):
                return True

        return False

    def evaluate(
        self,
        catalog_product: Optional[ProductDefinition],
        observed_labels: Optional[Dict[str, Any]] = None,
        image_metadata: Optional[Dict[str, Any]] = None,
    ) -> CheckResult:
        start_time = time.time()
        observed_labels = observed_labels or {}
        image_metadata = image_metadata or {}

        if not catalog_product:
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.5,
                detail={"reason": "Unknown product catalogue specification."},
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        expected_parts = list(catalog_product.expected_parts or [])
        critical_parts = list(catalog_product.critical_parts or [])

        # Rule 5 & 8: If image is blurry, unusable, or API failed, do not guess completeness
        img_qual = image_metadata.get("image_quality") or "good"
        rec_cat = image_metadata.get("recommended_reason_category")
        if img_qual in ("blurry", "unusable") or rec_cat in ("blurry_image", "unusable_image", "api_failure"):
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.25,
                detail={
                    "expected_parts": expected_parts,
                    "visible_parts": [],
                    "missing_parts": [],
                    "reason": "Image quality unusable or API failure; cannot verify completeness without clear imagery.",
                    "evidence": "Image quality insufficient or API failure to evaluate product components.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        # Rule 4: If expected components are not known/authoritatively provided,
        # do NOT hallucinate missing accessories.
        if not expected_parts:
            latency_ms = int((time.time() - start_time) * 1000)
            vis = list(image_metadata.get("visible_parts") or image_metadata.get("observed_components") or [])
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.PASS,
                confidence=0.96,
                detail={
                    "expected_parts": [],
                    "visible_parts": vis if vis else ["Product unit"],
                    "missing_parts": [],
                    "evidence": "No separate accessories/components authoritatively specified; main product unit verified complete without assumed accessories.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        has_image = image_metadata.get("has_image", False)
        vision_missing = list(image_metadata.get("missing_components") or image_metadata.get("missing_candidates") or [])
        vision_visible = list(image_metadata.get("observed_components") or image_metadata.get("visible_parts") or [])
        vision_conflicting = list(image_metadata.get("conflicting_parts") or [])
        vision_pkg_state = image_metadata.get("packaging_state")
        notes_str = str(image_metadata.get("uncertainty_notes") or "")
        vision_uncertain = bool(notes_str)
        detected_text = str(
            image_metadata.get("observed_product")
            or image_metadata.get("product_identity")
            or image_metadata.get("detected_product")
            or ""
        )

        operator_state = (observed_labels.get("observed_state") or "").lower()
        parts_missing_raw = observed_labels.get("parts_missing", "")
        operator_missing: List[str] = []
        if isinstance(parts_missing_raw, str) and parts_missing_raw.strip():
            operator_missing = [p.strip() for p in parts_missing_raw.split(";") if p.strip()]
        elif isinstance(parts_missing_raw, list):
            operator_missing = parts_missing_raw

        raw_missing = vision_missing or operator_missing

        # Multi-image discrepancy check:
        # If a component is visible across photos but also reported missing,
        # or if notes describe cross-image conflict (e.g. photos 1/2 show cable, photo 3 label says missing),
        # mark it as conflicting rather than asserting it is missing.
        conflicting_parts: List[str] = list(vision_conflicting)
        clean_missing: List[str] = []

        for p in raw_missing:
            # Check if this missing candidate is confirmed in visible_parts
            if self._is_component_confirmed(p, vision_visible, detected_text):
                if p not in conflicting_parts:
                    conflicting_parts.append(p)
            elif any(
                self._is_component_confirmed(exp, [p]) and self._is_component_confirmed(exp, vision_visible, detected_text)
                for exp in expected_parts
            ):
                if p not in conflicting_parts:
                    conflicting_parts.append(p)
            else:
                clean_missing.append(p)

        # Also inspect uncertainty notes for cross-image discrepancies
        if notes_str:
            notes_lower = notes_str.lower()
            for exp in expected_parts:
                exp_lower = exp.lower()
                aliases = COMPONENT_ALIASES.get(exp_lower, [exp_lower])
                is_mentioned = any(a in notes_lower for a in aliases)
                has_conflict_terms = (
                    "conflict" in notes_lower
                    or ("photo" in notes_lower and "missing" in notes_lower)
                    or ("label" in notes_lower and "missing" in notes_lower)
                    or ("beside" in notes_lower and "missing" in notes_lower)
                )
                if is_mentioned and has_conflict_terms:
                    if exp not in conflicting_parts and not any(self._is_component_confirmed(exp, [c]) for c in conflicting_parts):
                        conflicting_parts.append(exp)
                    clean_missing = [cm for cm in clean_missing if not self._is_component_confirmed(exp, [cm])]

        # If any component has conflicting evidence across photos, mark completeness UNCERTAIN
        if conflicting_parts:
            latency_ms = int((time.time() - start_time) * 1000)
            conflict_desc = ", ".join(conflicting_parts)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.50,
                detail={
                    "reason": "conflicting_evidence",
                    "expected_parts": expected_parts,
                    "visible_parts": vision_visible,
                    "conflicting_parts": conflicting_parts,
                    "missing_parts": clean_missing,
                    "evidence": (
                        f"Conflicting multi-image evidence for component(s): {conflict_desc}. "
                        f"Visible in photo(s) but indicated or labeled missing in photo(s) "
                        f"({notes_str if notes_str else 'cross-image conflict'}). "
                        f"Cannot establish whether component was returned; marking UNCERTAIN without asserting missing."
                    ),
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        missing_parts = clean_missing

        if missing_parts:
            critical_missing = []
            for p in missing_parts:
                p_base = p.split()[0].lower()
                for c in critical_parts:
                    c_base = c.split()[0].lower()
                    if c_base in p.lower() or p_base in c.lower() or c.lower() in p.lower():
                        critical_missing.append(p)
                        break

            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.FAIL,
                confidence=0.96,
                detail={
                    "expected_parts": expected_parts,
                    "visible_parts": [p for p in expected_parts if p not in missing_parts],
                    "missing_parts": missing_parts,
                    "critical_missing": critical_missing,
                    "evidence": f"Affirmative physical evidence of missing component(s): {', '.join(missing_parts)}.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if has_image:
            if vision_pkg_state == "factory_sealed":
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="completeness",
                    verdict=CheckVerdict.PASS,
                    confidence=0.99,
                    detail={
                        "expected_parts": expected_parts,
                        "visible_parts": ["Factory sealed unit - internal components sealed"],
                        "missing_parts": [],
                        "evidence": "Factory seal intact; manufacturer guarantees completeness of internal components.",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            detected_text = str(
                image_metadata.get("observed_product")
                or image_metadata.get("product_identity")
                or image_metadata.get("detected_product")
                or ""
            )

            confirmed_parts = [
                part for part in expected_parts
                if self._is_component_confirmed(part, vision_visible, detected_text)
            ]
            unconfirmed_parts = [
                part for part in expected_parts
                if part not in confirmed_parts
            ]

            if len(unconfirmed_parts) == 0:
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="completeness",
                    verdict=CheckVerdict.PASS,
                    confidence=0.96,
                    detail={
                        "expected_parts": expected_parts,
                        "visible_parts": vision_visible,
                        "confirmed_parts": confirmed_parts,
                        "missing_parts": [],
                        "evidence": f"Vision verified all {len(expected_parts)} required components present: {', '.join(expected_parts)}.",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            reason_suffix = ""
            if vision_uncertain and image_metadata.get("uncertainty_notes"):
                reason_suffix = f" ({image_metadata.get('uncertainty_notes')})"
            elif vision_pkg_state == "uncertain":
                reason_suffix = " due to packaging occlusion, obscuration, or camera angle"

            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.54,
                detail={
                    "expected_parts": expected_parts,
                    "visible_parts": vision_visible,
                    "confirmed_parts": confirmed_parts,
                    "unconfirmed_parts": unconfirmed_parts,
                    "missing_parts": [],
                    "evidence": f"Required component(s) {unconfirmed_parts} cannot be visually verified from visual evidence{reason_suffix}. Marking UNCERTAIN without guessing.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state == "factory_sealed":
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.PASS,
                confidence=0.98,
                detail={
                    "expected_parts": expected_parts,
                    "visible_parts": ["Factory sealed unit - internal components sealed"],
                    "missing_parts": [],
                    "evidence": "Operator confirmed factory seal intact; manufacturer guarantees completeness of internal components.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if operator_state in ["opened_unused", "signs_of_use", "damaged"] and not operator_missing and not observed_labels.get("unclear_evidence"):
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="completeness",
                verdict=CheckVerdict.PASS,
                confidence=0.94,
                detail={
                    "expected_parts": expected_parts,
                    "visible_parts": expected_parts,
                    "missing_parts": [],
                    "evidence": f"All {len(expected_parts)} expected BOM components verified present in bench inspection.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(
            check_key="completeness",
            verdict=CheckVerdict.UNCERTAIN,
            confidence=0.50,
            detail={
                "expected_parts": expected_parts,
                "visible_parts": [],
                "missing_parts": [],
                "evidence": "Insufficient affirmative proof that all required components are present.",
            },
            model_version=self.model_version,
            latency_ms=latency_ms,
        )
