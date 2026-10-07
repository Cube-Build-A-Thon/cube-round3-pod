"""Typed Pydantic data contracts for Prep Manager (KI Rule: Strict typing at all boundaries)."""

from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field


# Check Status Types (aligned with data/prep_sample.csv)
PolybagStatus = Literal["yes", "not_sealed", "missing", "uncertain", "not_required"]
SuffocationWarningStatus = Literal["legible", "obscured_by_fold", "missing", "uncertain", "not_required"]
FNSKUPlacementStatus = Literal["flat", "on_seam", "on_curve", "on_edge", "missing", "uncertain"]
BarcodeCoveredStatus = Literal["yes", "no", "uncertain"]
ExpiryDateStatus = Literal["legible", "illegible_after_wrap", "uncertain", "not_required"]
HandlingMarksStatus = Literal["all_present", "some_missing", "uncertain", "not_required"]

OverallVerdict = Literal["PASS", "FAIL", "UNCERTAIN", "pending_review"]
CheckVerdict = Literal["PASS", "FAIL", "UNCERTAIN", "N/A"]


class WorkOrder(BaseModel):
    """Work order specifications dictating expected prep requirements."""
    work_order_id: str = "WO-3000"
    unit_id: str = "UNIT-0001"
    org_id: str = "org_demo_alpha"
    fba_shipment_id: str = "FBA-DUMMY-100"
    sku: str = "SKU-SAMPLE"
    asin: str = "B0DUMMY001"
    fnsku: str = "X00DUMMY001"
    prep_price_usd: float = Field(default=0.75, ge=0.40, le=1.10)
    wo_polybag: bool = True
    wo_suffocation_warning: bool = True
    wo_expiry_date: bool = False
    wo_handling_marks: str = ""  # e.g. "fragile", "this_way_up", or ""


class GroundingEvidence(BaseModel):
    """Visual grounding bounding box for decision traceability."""
    check_id: str
    photo_ref: str
    bbox: list[int] = Field(..., min_length=4, max_length=4, description="[ymin, xmin, ymax, xmax] in 0-1000")
    confidence: float = Field(ge=0.0, le=1.0)
    observation_text: str


class BatchedVLMPayload(BaseModel):
    """Single multimodal model response carrying all 6 checks (Engineering Rule 2)."""
    polybag_status: PolybagStatus
    polybag_confidence: float = 0.95
    polybag_bbox: list[int] = [100, 100, 900, 900]

    suffocation_status: SuffocationWarningStatus
    suffocation_confidence: float = 0.92
    suffocation_bbox: list[int] = [150, 200, 350, 700]

    fnsku_status: FNSKUPlacementStatus
    fnsku_confidence: float = 0.96
    fnsku_bbox: list[int] = [600, 300, 850, 750]

    barcode_covered_status: BarcodeCoveredStatus
    barcode_confidence: float = 0.94
    barcode_bbox: list[int] = [600, 300, 850, 750]

    expiry_status: ExpiryDateStatus
    expiry_confidence: float = 0.90
    expiry_bbox: list[int] = [700, 700, 850, 900]

    handling_status: HandlingMarksStatus
    handling_confidence: float = 0.93
    handling_bbox: list[int] = [150, 150, 300, 300]

    raw_reasoning: str = ""


class ComplianceChecks(BaseModel):
    """The 6 check outcomes."""
    polybag_present_sealed: PolybagStatus
    suffocation_warning: SuffocationWarningStatus
    fnsku_label_placement: FNSKUPlacementStatus
    original_barcode_covered: BarcodeCoveredStatus
    expiry_date: ExpiryDateStatus
    handling_marks: HandlingMarksStatus


class OperatorOverride(BaseModel):
    """Permanent record of human override with required reason (Honesty Rule)."""
    original_verdict: OverallVerdict
    new_verdict: OverallVerdict
    operator_id: str
    reason: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PrepRecord(BaseModel):
    """Complete cross-pod evidence record (PRP-XXXX) for Recovery Manager."""
    record_id: str
    unit_id: str
    org_id: str
    work_order_id: str
    fba_shipment_id: str
    sku: str
    asin: str
    fnsku: str
    prep_price_usd: float
    overall_verdict: OverallVerdict
    checks: ComplianceChecks
    evidence_grounding: list[GroundingEvidence] = []
    operator_override: OperatorOverride | None = None
    photo_refs: list[str]
    operator_id: str
    captured_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
