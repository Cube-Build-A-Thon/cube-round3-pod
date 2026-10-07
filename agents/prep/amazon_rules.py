"""Authoritative Amazon FBA Prep Rules Engine (Engineering Rules 4 & 5)."""

from typing import Tuple
from agents.prep.schemas import WorkOrder, BatchedVLMPayload, ComplianceChecks, CheckVerdict, OverallVerdict


def evaluate_polybag(wo: WorkOrder, vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: Polybags must completely enclose item and be heat-sealed or securely taped."""
    if not wo.wo_polybag:
        return "PASS", "Polybag packaging not required by work order specifications."
    if vlm.polybag_status == "yes":
        return "PASS", "Polybag fully encloses unit and is securely heat-sealed/taped."
    if vlm.polybag_status == "not_sealed":
        return "FAIL", "Amazon Packaging Violation: Polybag is open or improperly sealed."
    if vlm.polybag_status == "missing":
        return "FAIL", "Amazon Packaging Violation: Required polybag is absent."
    return "UNCERTAIN", "Insufficient visual evidence to verify polybag seal completeness."


def evaluate_suffocation_warning(wo: WorkOrder, vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: Polybags with >= 5 inch opening require prominent, legible warning clear of folds."""
    if not wo.wo_suffocation_warning:
        return "PASS", "Suffocation warning not required for this package dimension."
    if vlm.suffocation_status == "legible":
        return "PASS", "Suffocation warning is printed/labeled in compliant font size and fully legible."
    if vlm.suffocation_status == "obscured_by_fold":
        return "FAIL", "Amazon Packaging Violation: Suffocation warning is concealed inside bag fold."
    if vlm.suffocation_status == "missing":
        return "FAIL", "Amazon Packaging Violation: Required suffocation warning is absent."
    return "UNCERTAIN", "Suffocation warning text is obscured by glare, angle, or low resolution."


def evaluate_fnsku_placement(vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: FNSKU barcode must be on a flat surface; never on edge, seam, or curve."""
    if vlm.fnsku_status == "flat":
        return "PASS", "FNSKU barcode is placed flat on package surface with required quiet zone."
    if vlm.fnsku_status in ["on_seam", "on_curve", "on_edge"]:
        return "FAIL", f"Amazon Labeling Violation: FNSKU label placed on {vlm.fnsku_status.replace('_', ' ')}."
    if vlm.fnsku_status == "missing":
        return "FAIL", "Amazon Labeling Violation: Required FNSKU label is missing."
    return "UNCERTAIN", "FNSKU barcode orientation cannot be validated from current capture angle."


def evaluate_barcode_coverage(vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: Original manufacturer barcode (UPC/EAN/ISBN) must be completely covered."""
    if vlm.barcode_covered_status == "yes":
        return "PASS", "Original manufacturer UPC/EAN barcode is completely obscured."
    if vlm.barcode_covered_status == "no":
        return "FAIL", "Amazon Receiving Violation: Original manufacturer barcode is exposed (mis-scan risk)."
    return "UNCERTAIN", "Unable to confirm whether underlying UPC is covered from available views."


def evaluate_expiry_date(wo: WorkOrder, vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: Consumables must display expiration date clearly visible after prep wrapping."""
    if not wo.wo_expiry_date:
        return "PASS", "Product is non-perishable; expiry date verification not required."
    if vlm.expiry_status == "legible":
        return "PASS", "Expiry date remains clearly visible and legible through external wrap."
    if vlm.expiry_status == "illegible_after_wrap":
        return "FAIL", "Amazon Date Marking Violation: Expiry date is obscured by opaque wrap or label."
    return "UNCERTAIN", "Expiry date location is not visible in current photographs."


def evaluate_handling_marks(wo: WorkOrder, vlm: BatchedVLMPayload) -> Tuple[CheckVerdict, str]:
    """Amazon rule: Fragile/liquid handling marks must be visible on outermost packaging layer."""
    if not wo.wo_handling_marks:
        return "PASS", "Special handling labels not mandated for this commodity type."
    if vlm.handling_status == "all_present":
        return "PASS", f"Mandatory handling marks ('{wo.wo_handling_marks}') verified."
    if vlm.handling_status == "some_missing":
        return "FAIL", f"Amazon Handling Violation: Missing required mark for '{wo.wo_handling_marks}'."
    return "UNCERTAIN", "Cannot confirm handling mark visibility across all exterior faces."


def aggregate_compliance(wo: WorkOrder, vlm: BatchedVLMPayload) -> Tuple[OverallVerdict, ComplianceChecks, list[str]]:
    """Evaluate all 6 checks deterministically and aggregate overall verdict."""
    results = [
        evaluate_polybag(wo, vlm),
        evaluate_suffocation_warning(wo, vlm),
        evaluate_fnsku_placement(vlm),
        evaluate_barcode_coverage(vlm),
        evaluate_expiry_date(wo, vlm),
        evaluate_handling_marks(wo, vlm),
    ]

    verdicts = [res[0] for res in results]
    reasons = [res[1] for res in results]

    # Overall Verdict Aggregation:
    # 1. Any FAIL -> FAIL
    # 2. Else any UNCERTAIN -> UNCERTAIN
    # 3. Else -> PASS
    if any(v == "FAIL" for v in verdicts):
        overall = "FAIL"
    elif any(v == "UNCERTAIN" for v in verdicts):
        overall = "UNCERTAIN"
    else:
        overall = "PASS"

    checks = ComplianceChecks(
        polybag_present_sealed=vlm.polybag_status if wo.wo_polybag else "not_required",
        suffocation_warning=vlm.suffocation_status if wo.wo_suffocation_warning else "not_required",
        fnsku_label_placement=vlm.fnsku_status,
        original_barcode_covered=vlm.barcode_covered_status,
        expiry_date=vlm.expiry_status if wo.wo_expiry_date else "not_required",
        handling_marks=vlm.handling_status if wo.wo_handling_marks else "not_required",
    )

    return overall, checks, reasons
