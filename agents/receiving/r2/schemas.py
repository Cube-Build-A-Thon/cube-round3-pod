"""Data structures and schemas for Receiving Manager."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass
class PurchaseOrderInput:
    order_number: str
    po_line: str
    sku: str
    asin: str
    product_name: str
    supplier: str
    expected_quantity: int
    expected_cartons: int
    expected_units_per_carton: int
    expected_variant: str = ""
    expected_colour: str = ""
    expected_components: list[str] = field(default_factory=list)


@dataclass
class ImageInput:
    ref: str
    sha256: Optional[str] = None
    kind: str = "image"
    content_bytes: Optional[bytes] = None


@dataclass
class ProductObservation:
    observed_sku: Optional[str] = None
    confidence: float = 1.0


@dataclass
class QuantityObservation:
    observed_units: Optional[int] = None
    observed_cartons: Optional[int] = None
    confidence: float = 1.0


@dataclass
class VariantObservation:
    observed_variant: Optional[str] = None
    confidence: float = 1.0


@dataclass
class ConditionObservation:
    damaged: Optional[bool] = None
    carton_damage: str = "none"
    unit_damage: str = "none"
    damage_types: list[str] = field(default_factory=list)
    confidence: float = 1.0


@dataclass
class ComponentsObservation:
    missing: list[str] = field(default_factory=list)
    confidence: float = 1.0


@dataclass
class EvidenceRef:
    image_id: str
    observation: str
    field: str


@dataclass
class UncertaintyItem:
    field: str
    reason: str


@dataclass
class VisionObservation:
    product: ProductObservation = field(default_factory=ProductObservation)
    quantity: QuantityObservation = field(default_factory=QuantityObservation)
    variant: VariantObservation = field(default_factory=VariantObservation)
    condition: ConditionObservation = field(default_factory=ConditionObservation)
    components: ComponentsObservation = field(default_factory=ComponentsObservation)
    quality_flags: list[str] = field(default_factory=list)
    evidence: list[EvidenceRef] = field(default_factory=list)
    uncertainty: list[UncertaintyItem] = field(default_factory=list)


@dataclass
class CheckResult:
    check_key: str
    verdict: str  # PASS | FAIL | UNCERTAIN
    expected: Any
    observed: Any
    confidence: Optional[float] = None
    detail: str = ""
    evidence_refs: list[str] = field(default_factory=list)
    uncertain_reason: Optional[str] = None


@dataclass
class DecisionEngineResult:
    verdict: str  # PASS | FAIL | UNCERTAIN
    outcome: str  # accept | accept_with_exceptions | pending_review
    reason: str
    checks: list[CheckResult]
    needs_human: bool
