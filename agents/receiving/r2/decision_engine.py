"""Deterministic Business Decision Engine for Receiving Inspection.

Architectural Principle:
    AI OBSERVES. APPLICATION DECIDES.
The AI is restricted strictly to perceptual feature extraction.
Deterministic application code evaluates observed facts against PO specs.
"""
from __future__ import annotations

from typing import Any
from .schemas import (
    CheckResult,
    DecisionEngineResult,
    PurchaseOrderInput,
    VisionObservation,
)

DAMAGE_OK = {"none", "no", ""}
DAMAGE_BAD = {"crushing", "water", "tears", "torn", "punctured", "crushed"}


def _get_uncertainty(obs: VisionObservation, field_name: str) -> str | None:
    for u in obs.uncertainty:
        if u.field.lower() == field_name.lower():
            return u.reason
    return None


def _get_evidence_refs(obs: VisionObservation, field_name: str, default_refs: list[str]) -> list[str]:
    matching = [e.image_id for e in obs.evidence if e.field.lower() == field_name.lower() and e.image_id]
    return matching if matching else default_refs


def evaluate_inspection(
    po: PurchaseOrderInput,
    obs: VisionObservation,
    default_refs: list[str],
) -> DecisionEngineResult:
    checks: list[CheckResult] = []

    # 1. Identity match (SKU & Product)
    exp_identity = f"{po.sku} ({po.product_name})"
    observed_sku = obs.product.observed_sku
    sku_conf = obs.product.confidence
    sku_ev = _get_evidence_refs(obs, "product", default_refs)
    sku_unc = _get_uncertainty(obs, "product")

    if observed_sku is None or sku_conf < 0.5 or str(observed_sku).lower() == "uncertain":
        checks.append(CheckResult(
            check_key="identity_match",
            verdict="UNCERTAIN",
            expected=exp_identity,
            observed=observed_sku or "uncertain",
            confidence=sku_conf,
            detail=sku_unc or "Observed SKU could not be clearly verified from visual evidence.",
            evidence_refs=sku_ev,
            uncertain_reason="poor_image",
        ))
    elif str(observed_sku).lower() in ("yes", po.sku.lower(), exp_identity.lower()):
        checks.append(CheckResult(
            check_key="identity_match",
            verdict="PASS",
            expected=exp_identity,
            observed=observed_sku,
            confidence=sku_conf,
            detail=f"Observed SKU matches expected PO specification.",
            evidence_refs=sku_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="identity_match",
            verdict="FAIL",
            expected=exp_identity,
            observed=observed_sku,
            confidence=sku_conf,
            detail=f"Observed SKU does not match expected PO specification.",
            evidence_refs=sku_ev,
        ))

    # 2. Carton Count
    exp_cartons = po.expected_cartons
    obs_cartons = obs.quantity.observed_cartons
    cartons_ev = _get_evidence_refs(obs, "quantity", default_refs)
    cartons_unc = _get_uncertainty(obs, "quantity")

    if obs_cartons is None or obs.quantity.confidence < 0.5:
        checks.append(CheckResult(
            check_key="carton_count",
            verdict="UNCERTAIN",
            expected=exp_cartons,
            observed=obs_cartons,
            confidence=obs.quantity.confidence,
            detail=cartons_unc or "Carton count could not be reliably established from photos.",
            evidence_refs=cartons_ev,
            uncertain_reason="poor_image",
        ))
    elif obs_cartons == exp_cartons:
        checks.append(CheckResult(
            check_key="carton_count",
            verdict="PASS",
            expected=exp_cartons,
            observed=obs_cartons,
            confidence=obs.quantity.confidence,
            detail=f"Carton count ({obs_cartons}) matches PO expected ({exp_cartons}).",
            evidence_refs=cartons_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="carton_count",
            verdict="FAIL",
            expected=exp_cartons,
            observed=obs_cartons,
            confidence=obs.quantity.confidence,
            detail=f"Carton count discrepancy: ordered {exp_cartons}, received {obs_cartons}.",
            evidence_refs=cartons_ev,
        ))

    # 3. Quantity (Units)
    exp_qty = po.expected_quantity
    obs_qty = obs.quantity.observed_units
    qty_ev = _get_evidence_refs(obs, "quantity", default_refs)
    qty_unc = _get_uncertainty(obs, "quantity")

    if obs_qty is None or obs.quantity.confidence < 0.5:
        checks.append(CheckResult(
            check_key="quantity",
            verdict="UNCERTAIN",
            expected=exp_qty,
            observed=obs_qty,
            confidence=obs.quantity.confidence,
            detail=qty_unc or "Shipment quantity could not be visually counted.",
            evidence_refs=qty_ev,
            uncertain_reason="poor_image",
        ))
    elif obs_qty == exp_qty:
        checks.append(CheckResult(
            check_key="quantity",
            verdict="PASS",
            expected=exp_qty,
            observed=obs_qty,
            confidence=obs.quantity.confidence,
            detail=f"Unit quantity ({obs_qty}) matches PO expected ({exp_qty}).",
            evidence_refs=qty_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="quantity",
            verdict="FAIL",
            expected=exp_qty,
            observed=obs_qty,
            confidence=obs.quantity.confidence,
            detail=f"Unit count discrepancy: ordered {exp_qty}, received {obs_qty}.",
            evidence_refs=qty_ev,
        ))

    # 4. Carton Damage
    obs_cd = (obs.condition.carton_damage or "none").lower()
    cd_conf = obs.condition.confidence
    cd_ev = _get_evidence_refs(obs, "condition", default_refs)
    cd_unc = _get_uncertainty(obs, "condition")

    if obs_cd in ("uncertain", "unclear") or cd_conf < 0.5:
        checks.append(CheckResult(
            check_key="carton_damage",
            verdict="UNCERTAIN",
            expected="none",
            observed=obs_cd,
            confidence=cd_conf,
            detail=cd_unc or "Carton exterior could not be fully assessed for damage.",
            evidence_refs=cd_ev,
            uncertain_reason="poor_image",
        ))
    elif obs_cd in DAMAGE_OK:
        checks.append(CheckResult(
            check_key="carton_damage",
            verdict="PASS",
            expected="none",
            observed=obs_cd,
            confidence=cd_conf,
            detail="No carton damage observed.",
            evidence_refs=cd_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="carton_damage",
            verdict="FAIL",
            expected="none",
            observed=obs_cd,
            confidence=cd_conf,
            detail=f"Visible carton damage: {obs_cd}.",
            evidence_refs=cd_ev,
        ))

    # 5. Unit Damage
    obs_ud = (obs.condition.unit_damage or "none").lower()
    ud_conf = obs.condition.confidence
    ud_ev = _get_evidence_refs(obs, "condition", default_refs)
    ud_unc = _get_uncertainty(obs, "condition")

    if obs_ud in ("uncertain", "unclear") or ud_conf < 0.5:
        checks.append(CheckResult(
            check_key="unit_damage",
            verdict="UNCERTAIN",
            expected="none",
            observed=obs_ud,
            confidence=ud_conf,
            detail=ud_unc or "Unit physical condition obscured from camera angles.",
            evidence_refs=ud_ev,
            uncertain_reason="poor_image",
        ))
    elif obs_ud in DAMAGE_OK:
        checks.append(CheckResult(
            check_key="unit_damage",
            verdict="PASS",
            expected="none",
            observed=obs_ud,
            confidence=ud_conf,
            detail="No unit damage observed.",
            evidence_refs=ud_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="unit_damage",
            verdict="FAIL",
            expected="none",
            observed=obs_ud,
            confidence=ud_conf,
            detail=f"Visible unit damage: {obs_ud}.",
            evidence_refs=ud_ev,
        ))

    # 6. Quality Flags
    flags = obs.quality_flags
    qf_ev = _get_evidence_refs(obs, "quality_flags", default_refs)

    if flags:
        checks.append(CheckResult(
            check_key="quality_flags",
            verdict="FAIL",
            expected=[],
            observed=flags,
            confidence=1.0,
            detail=f"Quality exceptions identified: {', '.join(flags)}.",
            evidence_refs=qf_ev,
        ))
    else:
        checks.append(CheckResult(
            check_key="quality_flags",
            verdict="PASS",
            expected=[],
            observed=[],
            confidence=1.0,
            detail="No quality exceptions flagged.",
            evidence_refs=qf_ev,
        ))

    # Overall Decision Rollup
    has_fail = any(c.verdict == "FAIL" for c in checks)
    has_uncertain = any(c.verdict == "UNCERTAIN" for c in checks)

    if has_fail:
        overall_verdict = "FAIL"
        outcome = "accept_with_exceptions"
        failed_count = sum(1 for c in checks if c.verdict == "FAIL")
        reason = f"Shipment inspected with {failed_count} exception(s) detected against PO specifications."
        needs_human = False
    elif has_uncertain:
        overall_verdict = "UNCERTAIN"
        outcome = "pending_review"
        uncertain_count = sum(1 for c in checks if c.verdict == "UNCERTAIN")
        reason = f"Shipment inspection contains {uncertain_count} parameter(s) requiring human operator review."
        needs_human = True
    else:
        overall_verdict = "PASS"
        outcome = "accept"
        reason = "Shipment fully complies with PO specifications and receiving condition standards."
        needs_human = False

    return DecisionEngineResult(
        verdict=overall_verdict,
        outcome=outcome,
        reason=reason,
        checks=checks,
        needs_human=needs_human,
    )
