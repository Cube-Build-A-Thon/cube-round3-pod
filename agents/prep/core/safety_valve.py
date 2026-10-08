"""Automated sensitivity detector and Human-In-The-Loop safety valve for Prep Manager."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

SENSITIVE_CATEGORIES = {
    "health & household",
    "dietary supplements",
    "pharmaceuticals",
    "cosmetics & beauty",
    "infant & baby",
    "ingestibles",
    "vitamins & supplements",
}

SENSITIVE_SKU_KEYWORDS = {
    "PROT",
    "VIT",
    "MED",
    "PHARM",
    "BABY",
}


class HighRiskSafetyValve:
    """Safety valve enforcing supervisor human review on sensitive or high-risk inventory."""

    @staticmethod
    def inspect_risk_profile(
        sku: str,
        category: str,
        overall_confidence: float,
        checks: List[Dict[str, Any]],
    ) -> Tuple[bool, Optional[str]]:
        """Determines if the unit must trigger a safety valve pause.
        
        Returns:
            (is_high_risk_pause, reason)
        """
        clean_cat = category.strip().lower()
        is_sensitive_cat = clean_cat in SENSITIVE_CATEGORIES
        is_sensitive_sku = any(kw in sku.upper() for kw in SENSITIVE_SKU_KEYWORDS)

        if is_sensitive_cat or is_sensitive_sku:
            # For sensitive items: enforce high confidence threshold and zero visual uncertainty
            if overall_confidence < 0.85:
                return True, (
                    f"Sensitive product '{sku}' ({category}) flagged: confidence {overall_confidence:.2f} "
                    f"falls below strict safety threshold 0.85."
                )
            if any(c["verdict"] == "UNCERTAIN" for c in checks):
                return True, (
                    f"Sensitive product '{sku}' ({category}) contains unverified visual checks; "
                    f"safety valve mandates Human-in-the-Loop physical review."
                )

        return False, None
