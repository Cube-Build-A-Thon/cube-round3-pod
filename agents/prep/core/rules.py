"""Pure Python port of the Prep deterministic inspection engine.
Ports rules from agents/prep/src/lib/rules.ts and prepRequirements.ts.
Fixes schema violations, enforces photo index bounds (D1), and strictly returns PASS, FAIL, or UNCERTAIN.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple
from agents.prep.core.security import PhotoBoundaryValidator

# Canonical Amazon FBA Prep & Labeling Rulebook Clauses (§2.1 - §4.2)
FBA_CLAUSES = {
    "polybag_sealed": {
        "clause": "§2.2 Sealing",
        "title": "Poly-bag sealed",
        "quote": "Poly bags must be completely sealed. The product must not be able to fall out of the bag.",
        "expected": "Poly bag completely sealed with no open edge.",
        "weight": 2.0,
    },
    "suffocation_warning": {
        "clause": "§2.3 Suffocation warning",
        "title": "Suffocation warning legible",
        "quote": "Any poly bag with an opening of 5 inches or larger must carry a legible suffocation warning.",
        "expected": "Suffocation warning visible and legible on polybag.",
        "weight": 3.0,
    },
    "fnsku_label_placement": {
        "clause": "§3.2 Label placement",
        "title": "FNSKU on flat surface",
        "quote": "The FNSKU label must be placed on a flat surface. Do not place across curves, seams, or edges.",
        "expected": "FNSKU label lies flat on smooth surface away from seams or folds.",
        "weight": 3.0,
    },
    "original_barcode_covered": {
        "clause": "§3.4 Original barcodes",
        "title": "Original manufacturer barcode covered",
        "quote": "Any pre-existing barcode on the exterior must be covered or rendered unscannable so only FNSKU scans.",
        "expected": "Manufacturer UPC/EAN barcode fully covered by opaque label.",
        "weight": 2.0,
    },
    "expiry_legible": {
        "clause": "§4.1 Expiration dates",
        "title": "Expiry date visible",
        "quote": "Expiration dates must remain visible after prep and must not be obscured by folds or tape.",
        "expected": "Expiration date printed and clearly legible through polybag wrapping.",
        "weight": 2.5,
    },
    "handling_marks": {
        "clause": "§4.2 Handling marks",
        "title": "Handling marks present",
        "quote": "Fragile units must display required handling markings (e.g., 'Fragile') on the exterior.",
        "expected": "Required handling markings (e.g. Fragile, This Side Up) visible on exterior.",
        "weight": 1.5,
    },
}

# Trusted internal catalog specifications (S2 Fix: never trust caller flags)
INTERNAL_CATALOG: Dict[str, Dict[str, Any]] = {
    "PC-IP15-BLK": {
        "name": "Silicone Phone Case (iPhone 15, Black)",
        "category": "Electronics Accessories",
        "expected_fnsku": "X001ABC123",
        "requires_polybag": True,
        "has_expiry": False,
        "is_fragile": False,
        "cover_original_barcode": True,
    },
    "BTL-GLS-750": {
        "name": "Glass Water Bottle 750 ml",
        "category": "Home & Kitchen",
        "expected_fnsku": "X002DEF456",
        "requires_polybag": True,
        "has_expiry": False,
        "is_fragile": True,
        "cover_original_barcode": True,
    },
    "VIT-D3-120": {
        "name": "Vitamin D3 Softgels (120 ct)",
        "category": "Health & Household",
        "expected_fnsku": "X003GHI789",
        "requires_polybag": True,
        "has_expiry": True,
        "is_fragile": False,
        "cover_original_barcode": False,
    },
    "SKU-CANDLE-3": {
        "name": "Scented Pillar Candle 3-Pack",
        "category": "Home & Kitchen",
        "expected_fnsku": "X00DUMMY002",
        "requires_polybag": False,
        "has_expiry": False,
        "is_fragile": True,
        "cover_original_barcode": True,
    },
    "SKU-PUZZLE-500": {
        "name": "Jigsaw Puzzle 500 Pieces",
        "category": "Toys & Games",
        "expected_fnsku": "X00DUMMY003",
        "requires_polybag": True,
        "has_expiry": False,
        "is_fragile": False,
        "cover_original_barcode": True,
    },
    "SKU-PROT-1KG": {
        "name": "Whey Protein Powder 1kg Tub",
        "category": "Dietary Supplements",
        "expected_fnsku": "X00DUMMY004",
        "requires_polybag": False,
        "has_expiry": True,
        "is_fragile": False,
        "cover_original_barcode": True,
    },
    "SKU-LAMP-LED": {
        "name": "Desk Lamp LED Adjustable",
        "category": "Home & Office",
        "expected_fnsku": "X00DUMMY014",
        "requires_polybag": False,
        "has_expiry": False,
        "is_fragile": True,
        "cover_original_barcode": True,
    },
}

DEFAULT_CRITERIA: Dict[str, Any] = {
    "name": "Standard FBA Inbound Unit",
    "category": "General Merchandise",
    "expected_fnsku": "",
    "requires_polybag": True,
    "has_expiry": False,
    "is_fragile": False,
    "cover_original_barcode": True,
}


class DeterministicPrepEngine:
    """Evaluates physical observations against trusted FBA rulebooks."""

    @classmethod
    def get_trusted_criteria(cls, sku: str, sample_row: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Loads trusted product specifications from catalog or authoritative sample row work orders.
        
        Crucial S2 Security Rule: Ignores caller-supplied overrides.
        """
        if sku in INTERNAL_CATALOG:
            return INTERNAL_CATALOG[sku]

        if sample_row:
            # Derive trusted criteria from work order columns in sample data if available
            wo_poly = sample_row.get("wo_polybag") == "True" or sample_row.get("polybag_present_sealed") != "not_required"
            wo_expiry = sample_row.get("wo_expiry_date") == "True" or sample_row.get("expiry_date") != "not_required"
            wo_handling = bool(sample_row.get("wo_handling_marks") or sample_row.get("handling_marks") != "not_required")
            return {
                "name": sample_row.get("sku", "Inbound SKU"),
                "category": "General Merchandise",
                "expected_fnsku": sample_row.get("fnsku", ""),
                "requires_polybag": wo_poly,
                "has_expiry": wo_expiry,
                "is_fragile": wo_handling,
                "cover_original_barcode": True,
            }

        return DEFAULT_CRITERIA

    @classmethod
    def evaluate(
        cls,
        sku: str,
        observations: List[Dict[str, Any]],
        inputs: List[Dict[str, Any]],
        sample_row: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], str, str, float]:
        """Evaluates observations and produces strictly compliant check dictionaries.
        
        Returns:
            Tuple: (checks, verdict, outcome, overall_confidence)
        """
        criteria = cls.get_trusted_criteria(sku, sample_row)
        obs_map = {o.get("check_key"): o for o in observations}
        checks: List[Dict[str, Any]] = []

        total_weight = 0.0
        weighted_confidence_sum = 0.0

        for key, clause_info in FBA_CLAUSES.items():
            # Check applicability: omit non-applicable checks entirely per contract rules
            if key in ("polybag_sealed", "suffocation_warning") and not criteria["requires_polybag"]:
                continue
            if key == "original_barcode_covered" and not criteria["cover_original_barcode"]:
                continue
            if key == "expiry_legible" and not criteria["has_expiry"]:
                continue
            if key == "handling_marks" and not criteria["is_fragile"]:
                continue

            weight = clause_info["weight"]
            total_weight += weight
            obs = obs_map.get(key)

            # Missing observation -> UNCERTAIN
            if not obs:
                checks.append({
                    "check_key": key,
                    "verdict": "UNCERTAIN",
                    "confidence": None,
                    "expected": clause_info["expected"],
                    "observed": "Observation missing from inspection report.",
                    "detail": f"Clause {clause_info['clause']} could not be verified.",
                    "evidence_refs": [],
                    "uncertain_reason": "insufficient_evidence",
                })
                continue

            # D1 Photo Boundary Check: validate cited photo_index against inputs
            photo_idx = obs.get("photo_index")
            is_valid_photo, photo_ref = PhotoBoundaryValidator.validate_photo_index(photo_idx, inputs)

            if photo_idx is not None and not is_valid_photo:
                checks.append({
                    "check_key": key,
                    "verdict": "UNCERTAIN",
                    "confidence": 0.0,
                    "expected": clause_info["expected"],
                    "observed": f"Cited photo_index {photo_idx} out of bounds ({len(inputs)} captures provided).",
                    "detail": "Observation cited an invalid or non-existent photo.",
                    "evidence_refs": [],
                    "uncertain_reason": "insufficient_evidence",
                })
                continue

            evidence_refs = [photo_ref] if photo_ref else [p.get("ref") for p in inputs if p.get("ref")]
            status = obs.get("status", "cant_tell")  # met | not_met | cant_tell
            conf_val = obs.get("confidence", 0.5)
            confidence = float(conf_val) if isinstance(conf_val, (int, float)) else 0.5
            observed_text = obs.get("evidence", "").strip()

            weighted_confidence_sum += weight * confidence

            # Low confidence or cant_tell drops strictly to UNCERTAIN
            if status == "cant_tell" or confidence < 0.70 or not observed_text:
                checks.append({
                    "check_key": key,
                    "verdict": "UNCERTAIN",
                    "confidence": round(confidence, 2),
                    "expected": clause_info["expected"],
                    "observed": observed_text or "Ambiguous or low confidence visual observation.",
                    "detail": f"{clause_info['title']} could not be verified reliably. Clause: {clause_info['clause']}",
                    "evidence_refs": evidence_refs,
                    "uncertain_reason": "poor_image" if not observed_text else "insufficient_evidence",
                })
                continue

            verdict = "PASS" if status == "met" else "FAIL"
            checks.append({
                "check_key": key,
                "verdict": verdict,
                "confidence": round(confidence, 2),
                "expected": clause_info["expected"],
                "observed": observed_text,
                "detail": f"Complies with {clause_info['clause']}" if verdict == "PASS" else f"Violates {clause_info['clause']}: {clause_info['quote']}",
                "evidence_refs": evidence_refs,
            })

        # Calculate weighted confidence
        overall_conf = round(weighted_confidence_sum / total_weight, 2) if total_weight > 0 else 0.50

        # Rollup decision
        if any(c["verdict"] == "FAIL" for c in checks):
            dec_verdict = "FAIL"
            dec_outcome = "non_compliant"
        elif any(c["verdict"] == "UNCERTAIN" for c in checks) or not checks:
            dec_verdict = "UNCERTAIN"
            dec_outcome = "pending_review"
        else:
            dec_verdict = "PASS"
            dec_outcome = "compliant"

        return checks, dec_verdict, dec_outcome, overall_conf
