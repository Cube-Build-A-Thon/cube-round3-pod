"""Identity Agent for Returns Inspection.

Compares returned product against ordered SKU / ASIN using Semantic Product Matching.
Evaluates 5 core dimensions:
1. Product category
2. Key components
3. Brand
4. SKU metadata
5. Visual features

Verdict strictly: PASS, FAIL, or UNCERTAIN. Never guesses.
Only FAILS when the detected object is genuinely different (e.g. expected product vs conflicting product category).
"""

import re
import time
from typing import Any, Dict, List, Optional, Tuple
from ..catalog import CATALOGUE, ProductDefinition, get_product_by_sku
from ..models import CheckResult, CheckVerdict
from ..utils import is_non_product_media, normalize_text

def _build_product_taxonomy(catalog_product: Optional[ProductDefinition]) -> Dict[str, Any]:
    """Dynamically builds semantic taxonomy keywords from any ProductDefinition."""
    if not catalog_product:
        return {
            "category_keywords": [],
            "key_components": [],
            "visual_features": [],
            "brand_affiliations": [],
        }

    title_words = [
        w.lower() for w in re.findall(r"[A-Za-z0-9]+", catalog_product.title)
        if len(w) > 2 and w.lower() not in {"and", "the", "for", "with", "set", "pack", "pro", "new"}
    ]
    cat_words = [
        w.lower() for w in re.findall(r"[A-Za-z0-9]+", catalog_product.category)
        if len(w) > 2 and w.lower() not in {"and", "the", "for", "with"}
    ]
    parts_words: List[str] = []
    for p in catalog_product.expected_parts:
        parts_words.extend([
            w.lower() for w in re.findall(r"[A-Za-z0-9]+", p)
            if len(w) > 2 and w.lower() not in {"and", "the", "for", "with"}
        ])

    return {
        "category_keywords": list(dict.fromkeys(cat_words + title_words)),
        "key_components": list(dict.fromkeys(catalog_product.expected_parts + parts_words)),
        "visual_features": list(dict.fromkeys(title_words)),
        "brand_affiliations": [str(getattr(catalog_product, "brand", "")).lower()] if getattr(catalog_product, "brand", None) else [],
    }


INCOMPATIBLE_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "footwear": {
        "name": "Shoes & Footwear",
        "keywords": ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "footwear", "sandal", "sandals", "slippers", "loafers", "heels", "cleats", "oxfords"],
    },
    "apparel": {
        "name": "Clothing & Apparel",
        "keywords": ["shirt", "t-shirt", "pants", "jeans", "jacket", "dress", "hoodie", "sweater", "shorts", "coat", "apparel", "garment", "suit", "blouse", "sock", "socks", "underwear"],
    },
    "computing": {
        "name": "Computing & Mobile Devices",
        "keywords": ["laptop", "notebook computer", "smartphone", "cell phone", "iphone", "android phone", "tablet", "ipad", "keyboard", "mouse", "monitor", "display screen", "printer"],
    },
    "power_tools": {
        "name": "Power Tools & Heavy Hardware",
        "keywords": ["power drill", "drill", "chainsaw", "circular saw", "hammer", "wrench", "screwdriver", "pliers", "lawnmower", "leaf blower"],
    },
    "audio": {
        "name": "Headphones & Audio",
        "keywords": ["headphones", "earbuds", "headset", "airpods", "speaker", "soundbar"],
    },
    "appliances": {
        "name": "Major Kitchen Appliances",
        "keywords": ["blender", "microwave", "toaster", "air fryer", "refrigerator", "food processor"],
    },
    "books": {
        "name": "Books & Printed Media",
        "keywords": ["book", "novel", "textbook", "magazine", "comic book"],
    },
    "luggage": {
        "name": "Luggage & Bags",
        "keywords": ["backpack", "suitcase", "handbag", "purse", "wallet", "briefcase", "duffel bag"],
    },
    "non_product": {
        "name": "Non-Product Media / Document / Logo",
        "keywords": ["logo", "graphic", "screenshot", "screengrab", "document", "invoice", "receipt", "shipping label", "paper", "label sheet", "blank screen", "clipart", "wallpaper"],
    },
}

_INCOMPATIBLE_PATTERNS: Dict[str, re.Pattern] = {}
for _cat_id, _cat_info in INCOMPATIBLE_CATEGORIES.items():
    _sorted_kw = sorted(_cat_info["keywords"], key=len, reverse=True)
    _INCOMPATIBLE_PATTERNS[_cat_id] = re.compile(
        r"\b(?:" + "|".join(re.escape(k) for k in _sorted_kw) + r")\b",
        re.IGNORECASE,
    )


class IdentityAgent:
    def __init__(self, model_version: str = "semantic-identity-agent-v3.0"):
        self.model_version = model_version

    def evaluate(
        self,
        ordered_sku: str,
        ordered_asin: str,
        catalog_product: Optional[ProductDefinition],
        observed_labels: Optional[Dict[str, Any]] = None,
        image_metadata: Optional[Dict[str, Any]] = None,
    ) -> CheckResult:
        start_time = time.time()
        observed_labels = observed_labels or {}
        image_metadata = image_metadata or {}

        if not catalog_product:
            catalog_product = get_product_by_sku(ordered_sku)

        if not catalog_product:
            latency_ms = int((time.time() - start_time) * 1000)
            return CheckResult(
                check_key="identity",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.5,
                detail={
                    "reason": f"SKU {ordered_sku} not found in verified product catalogue.",
                    "ordered_sku": ordered_sku,
                    "ordered_asin": ordered_asin,
                    "evidence": "Missing catalogue baseline.",
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        has_image = image_metadata.get("has_image", False)
        detected_prod = image_metadata.get("detected_product") or image_metadata.get("product_identity") or image_metadata.get("observed_product")
        detected_brand = image_metadata.get("detected_brand")
        visible_parts = image_metadata.get("visible_parts") or image_metadata.get("observed_components") or []

        vision_uncertain = bool(image_metadata.get("uncertainty_notes")) or bool(image_metadata.get("ambiguity"))
        vision_confidence = float(image_metadata.get("confidence", 0.95))

        identity_signal = observed_labels.get("identity_match")
        observed_sku = observed_labels.get("observed_sku") or image_metadata.get("detected_sku")
        wrong_item_detected = observed_labels.get("wrong_item_detected", False) or identity_signal == "no"

        rec_category = image_metadata.get("recommended_reason_category")
        is_product_val = image_metadata.get("is_product")
        img_quality = image_metadata.get("image_quality") or "good"

        if has_image:
            # Rule 8: Gemini/API failure
            if rec_category == "api_failure" or str(image_metadata.get("inference_source", "")).startswith("offline_failure_state"):
                latency_ms = int((time.time() - start_time) * 1000)
                msg = image_metadata.get("uncertainty_notes") or "Vision model offline or unable to identify item from visual evidence without API key. Returning uncertainty; manual inspection required."
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.30,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": None,
                        "category": "api_failure",
                        "reason": msg,
                        "evidence": msg,
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 5: Blurry or unusable image
            if img_quality in ("blurry", "dark", "obstructed", "tiny", "corrupted", "unusable") or rec_category in ("blurry_image", "unusable_image"):
                latency_ms = int((time.time() - start_time) * 1000)
                is_blurry = img_quality == "blurry" or rec_category == "blurry_image" or "blur" in str(image_metadata.get("uncertainty_notes", "")).lower()
                cat_name = "blurry_image" if is_blurry else "unusable_image"
                user_msg = (
                    "Image is too blurry to reliably inspect the returned item. Please send a clear photo showing the full product and its components."
                    if is_blurry
                    else "Image is unusable, corrupted, or obstructed. Please send a clear photo showing the full product and its components."
                )
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.25,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": None,
                        "category": cat_name,
                        "reason": user_msg,
                        "evidence": user_msg,
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 6: Non-product image
            if is_product_val is False or rec_category == "non_product_image" or is_non_product_media(str(detected_prod or "")):
                latency_ms = int((time.time() - start_time) * 1000)
                user_msg = "No recognizable returned product was detected. Please upload a clear image of the actual item."
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.FAIL,
                    confidence=0.96,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": False,
                        "is_non_product": True,
                        "physical_product_detected": False,
                        "category": "non_product_image",
                        "reason": user_msg,
                        "evidence": user_msg,
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 2: Wrong product (explicit flag, swapped SKU, or visual model match=False)
            exp_match = image_metadata.get("expected_product_match")
            if wrong_item_detected or (observed_sku and observed_sku != ordered_sku) or exp_match is False or rec_category == "wrong_product":
                latency_ms = int((time.time() - start_time) * 1000)
                disp_detected = detected_prod or image_metadata.get("observed_product") or "mismatched item"
                evidence_msg = f"Returned item does not match ordered SKU {ordered_sku} ({catalog_product.title}). Swapped item detected: observed '{disp_detected}'."
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.FAIL,
                    confidence=0.96,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": False,
                        "category": "wrong_product",
                        "detected_sku": observed_sku or "MISMATCHED_RETURN_ITEM",
                        "detected_product": disp_detected,
                        "evidence": evidence_msg,
                        "reason": evidence_msg,
                        "comparison": {
                            "category": {"match": False, "note": "Explicit wrong product / swapped SKU"},
                            "key_components": {"match": False},
                            "brand": {"match": False},
                            "sku_metadata": {"match": False, "observed_sku": observed_sku},
                            "visual_features": {"match": False},
                        },
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 7: Ambiguous / multiple items / conflicting evidence
            ambiguity_val = image_metadata.get("ambiguity") or image_metadata.get("uncertainty_notes")
            if rec_category == "ambiguous_multi" or (ambiguity_val and any(term in str(ambiguity_val).lower() for term in ["multiple", "conflict", "ambiguous", "contradict"])):
                latency_ms = int((time.time() - start_time) * 1000)
                msg = f"Ambiguous product identity / conflicting images: {ambiguity_val}. Cannot reliably verify target returned item."
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.50,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": None,
                        "category": "ambiguous_multi",
                        "evidence": msg,
                        "reason": msg,
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            # Rule 1: Correct product direct confirmation from multimodal model
            if exp_match is True:
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.PASS,
                    confidence=0.96,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "catalog_title": catalog_product.title,
                        "detected_product": detected_prod or catalog_product.title,
                        "detected_brand": detected_brand or getattr(catalog_product, "brand", None),
                        "matched_expected": True,
                        "category": "correct_product",
                        "evidence": f"Vision verified item matches expected product: {catalog_product.title}.",
                        "reason": f"Correct product verified: Observed item matches {catalog_product.title}.",
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            if not detected_prod or (vision_uncertain and vision_confidence < 0.60):
                latency_ms = int((time.time() - start_time) * 1000)
                return CheckResult(
                    check_key="identity",
                    verdict=CheckVerdict.UNCERTAIN,
                    confidence=0.52,
                    detail={
                        "ordered_sku": ordered_sku,
                        "ordered_asin": ordered_asin,
                        "matched_expected": None,
                        "evidence": image_metadata.get("uncertainty_notes") or "Vision evidence cannot verify product identity against catalogue. Image quality insufficient.",
                        "comparison": {
                            "category": {"match": None, "note": "Uncertain / unidentifiable media"},
                            "key_components": {"match": None},
                            "brand": {"match": None},
                            "sku_metadata": {"match": None},
                            "visual_features": {"match": None},
                        },
                    },
                    model_version=self.model_version,
                    latency_ms=latency_ms,
                )

            semantic_res = self._evaluate_semantic_identity(
                ordered_sku=ordered_sku,
                catalog_product=catalog_product,
                detected_prod=detected_prod,
                detected_brand=detected_brand,
                visible_parts=visible_parts,
            )

            latency_ms = int((time.time() - start_time) * 1000)
            is_non_product = semantic_res.get("is_non_product", False)
            return CheckResult(
                check_key="identity",
                verdict=semantic_res["verdict"],
                confidence=semantic_res["confidence"],
                detail={
                    "ordered_sku": ordered_sku,
                    "ordered_asin": ordered_asin,
                    "catalog_title": catalog_product.title,
                    "detected_product": detected_prod,
                    "detected_brand": detected_brand,
                    "matched_expected": semantic_res["verdict"] == CheckVerdict.PASS,
                    "is_non_product": is_non_product,
                    "physical_product_detected": not is_non_product if is_non_product else image_metadata.get("physical_product_detected", True),
                    "evidence": semantic_res["reason"],
                    "reason": semantic_res["reason"],
                    "comparison": semantic_res["comparison"],
                    "category": "wrong_product" if semantic_res["verdict"] == CheckVerdict.FAIL else ("correct_product" if semantic_res["verdict"] == CheckVerdict.PASS else None),
                },
                model_version=self.model_version,
                latency_ms=latency_ms,
            )

        if wrong_item_detected or identity_signal == "no":
            return CheckResult(
                check_key="identity",
                verdict=CheckVerdict.FAIL,
                confidence=0.96,
                detail={
                    "ordered_sku": ordered_sku,
                    "ordered_asin": ordered_asin,
                    "matched_expected": False,
                    "evidence": f"Operator confirmed item mismatch for SKU {ordered_sku}.",
                    "category": "wrong_product",
                },
                model_version=self.model_version,
                latency_ms=int((time.time() - start_time) * 1000),
            )

        if identity_signal == "yes":
            return CheckResult(
                check_key="identity",
                verdict=CheckVerdict.PASS,
                confidence=0.96,
                detail={
                    "ordered_sku": ordered_sku,
                    "ordered_asin": ordered_asin,
                    "matched_expected": True,
                    "catalog_title": catalog_product.title,
                    "evidence": f"Verified physical bench inspection match for {catalog_product.title}.",
                    "category": "correct_product",
                },
                model_version=self.model_version,
                latency_ms=int((time.time() - start_time) * 1000),
            )
        elif identity_signal == "uncertain" or observed_labels.get("unclear_evidence"):
            return CheckResult(
                check_key="identity",
                verdict=CheckVerdict.UNCERTAIN,
                confidence=0.52,
                detail={
                    "ordered_sku": ordered_sku,
                    "ordered_asin": ordered_asin,
                    "evidence": "Operator marked identity as uncertain; insufficient evidence to verify SKU.",
                    "category": "ambiguous_multi",
                },
                model_version=self.model_version,
                latency_ms=int((time.time() - start_time) * 1000),
            )

        return CheckResult(
            check_key="identity",
            verdict=CheckVerdict.UNCERTAIN,
            confidence=0.50,
            detail={
                "ordered_sku": ordered_sku,
                "ordered_asin": ordered_asin,
                "evidence": "Catalogue selection alone cannot establish identity without verified visual or physical evidence.",
            },
            model_version=self.model_version,
            latency_ms=int((time.time() - start_time) * 1000),
        )

    def _evaluate_semantic_identity(
        self,
        ordered_sku: str,
        catalog_product: ProductDefinition,
        detected_prod: str,
        detected_brand: Optional[str] = None,
        visible_parts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Performs semantic product matching across 5 dimensions:
        1. Product category
        2. Key components
        3. Brand
        4. SKU metadata
        5. Visual features

        Only FAILS when the detected object is genuinely different.
        """
        visible_parts = visible_parts or []
        norm_detected = normalize_text(detected_prod)
        norm_parts = [normalize_text(p) for p in visible_parts]
        combined_text = f"{norm_detected} {' '.join(norm_parts)}".strip()

        taxonomy = _build_product_taxonomy(catalog_product)
        norm_title = normalize_text(catalog_product.title)
        norm_category = normalize_text(catalog_product.category)

        for cat_id, cat_info in INCOMPATIBLE_CATEGORIES.items():
            is_expected_in_cat = any(
                kw in norm_title or kw in norm_category
                for kw in cat_info["keywords"]
            )
            if is_expected_in_cat:
                continue

            cat_pat = _INCOMPATIBLE_PATTERNS.get(cat_id)
            if cat_pat and cat_pat.search(norm_detected):
                if cat_id == "non_product":
                    return {
                        "verdict": CheckVerdict.FAIL,
                        "confidence": 0.96,
                        "is_non_product": True,
                        "reason": "Invalid return image: non-product media detected. Manual review required.",
                        "comparison": {
                            "category": {"match": False, "expected": catalog_product.category, "detected_conflict": cat_info["name"]},
                            "key_components": {"match": False, "expected": catalog_product.expected_parts, "matched": []},
                            "brand": {"match": True, "detected": detected_brand or "Not specified"},
                            "sku_metadata": {"match": False, "ordered_sku": ordered_sku, "matched_sku_tokens": []},
                            "visual_features": {"match": False, "matched_features": []},
                        },
                    }
                return {
                    "verdict": CheckVerdict.FAIL,
                    "confidence": 0.96,
                    "reason": f"Product mismatch: Detected '{detected_prod}' ({cat_info['name']}) directly conflicts with expected SKU {ordered_sku} ({catalog_product.title} - {catalog_product.category}). Genuinely different product category.",
                    "comparison": {
                        "category": {"match": False, "expected": catalog_product.category, "detected_conflict": cat_info["name"]},
                        "key_components": {"match": False, "expected": catalog_product.expected_parts, "matched": []},
                        "brand": {"match": True, "detected": detected_brand or "Not specified"},
                        "sku_metadata": {"match": False, "ordered_sku": ordered_sku, "matched_sku_tokens": []},
                        "visual_features": {"match": False, "matched_features": []},
                    },
                }

        cat_keywords = taxonomy.get("category_keywords", [])
        matched_cat_keywords = [
            kw for kw in cat_keywords
            if re.search(r"\b" + re.escape(kw) + r"\b", combined_text, re.IGNORECASE)
        ]
        category_matched = len(matched_cat_keywords) > 0

        if not category_matched:
            # Check if detected product matches a different known catalogue SKU
            for other_sku, other_prod in CATALOGUE.items():
                if other_sku == ordered_sku:
                    continue
                other_tax = _build_product_taxonomy(other_prod)
                other_keywords = other_tax.get("category_keywords", [])
                other_specific = [k for k in other_keywords if k not in cat_keywords and len(k) > 3]
                for ok in other_specific:
                    if re.search(r"\b" + re.escape(ok) + r"\b", norm_detected, re.IGNORECASE):
                        return {
                            "verdict": CheckVerdict.FAIL,
                            "confidence": 0.96,
                            "reason": f"Product mismatch: Detected '{detected_prod}' matches different merchandise ({other_prod.title} - {other_sku}), not ordered SKU {ordered_sku}.",
                            "comparison": {
                                "category": {"match": False, "expected": catalog_product.category, "detected_conflict_sku": other_sku},
                                "key_components": {"match": False, "expected": catalog_product.expected_parts, "matched": []},
                                "brand": {"match": True, "detected": detected_brand or "Not specified"},
                                "sku_metadata": {"match": False, "ordered_sku": ordered_sku},
                                "visual_features": {"match": False, "matched_features": []},
                            },
                        }

        comp_pairs = [
            (p, [re.compile(r"\b" + re.escape(t) + r"\b", re.IGNORECASE) for t in normalize_text(p).split() if len(t) > 2])
            for p in catalog_product.expected_parts
        ]
        matched_components = []
        for comp_name, term_pats in comp_pairs:
            if any(tp.search(combined_text) for tp in term_pats):
                matched_components.append(comp_name)
        matched_components = list(dict.fromkeys(matched_components))
        components_matched = len(matched_components) > 0 or len(catalog_product.expected_parts) == 0

        brand_matched = True
        brand_note = "Aligned / Neutral"
        if detected_brand:
            norm_brand = normalize_text(detected_brand)
            if "competitor" in norm_brand:
                brand_matched = False
                brand_note = "Conflicting competitor brand"
            else:
                brand_note = f"Verified brand: {detected_brand}"

        sku_tokens = [tok.lower() for tok in ordered_sku.split("-") if len(tok) > 2 and tok.lower() != "sku"]
        matched_sku_tokens = [tok for tok in sku_tokens if re.search(r"\b" + re.escape(tok) + r"\b", combined_text, re.IGNORECASE)]
        sku_metadata_matched = len(matched_sku_tokens) > 0 or category_matched

        feat_words = taxonomy.get("visual_features", [])
        matched_features = [
            feat for feat in feat_words
            if re.search(r"\b" + re.escape(feat) + r"\b", combined_text, re.IGNORECASE)
        ]
        matched_features = list(dict.fromkeys(matched_features))
        features_matched = len(matched_features) > 0

        comparison_dict = {
            "category": {
                "match": category_matched,
                "expected": catalog_product.category,
                "matched_keywords": matched_cat_keywords,
            },
            "key_components": {
                "match": components_matched,
                "expected": catalog_product.expected_parts,
                "matched": matched_components,
            },
            "brand": {
                "match": brand_matched,
                "detected": detected_brand or "Not specified",
                "note": brand_note,
            },
            "sku_metadata": {
                "match": sku_metadata_matched,
                "ordered_sku": ordered_sku,
                "matched_sku_tokens": matched_sku_tokens,
            },
            "visual_features": {
                "match": features_matched,
                "matched_features": matched_features,
            },
        }

        if category_matched and (components_matched or features_matched) and brand_matched:
            conf = 0.96
            evidence_str = (
                f"Semantic identity match verified: Detected '{detected_prod}' aligns with catalog "
                f"{catalog_product.title} (Category: {catalog_product.category}, "
                f"Components: {', '.join(matched_components[:3]) if matched_components else 'Core Unit'}, "
                f"Features: {', '.join(matched_features[:3]) if matched_features else 'Standard'})."
            )
            return {
                "verdict": CheckVerdict.PASS,
                "confidence": conf,
                "reason": evidence_str,
                "comparison": comparison_dict,
            }

        if category_matched and brand_matched:
            conf = 0.92
            evidence_str = (
                f"Semantic identity match verified: Detected '{detected_prod}' matches product category "
                f"'{catalog_product.category}' for {catalog_product.title}."
            )
            return {
                "verdict": CheckVerdict.PASS,
                "confidence": conf,
                "reason": evidence_str,
                "comparison": comparison_dict,
            }

        return {
            "verdict": CheckVerdict.FAIL,
            "confidence": 0.95,
            "reason": (
                f"Product mismatch: Detected '{detected_prod}' does not match expected {catalog_product.title} "
                f"({catalog_product.category}). Genuinely different product."
            ),
            "comparison": comparison_dict,
        }
