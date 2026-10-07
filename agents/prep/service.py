"""Core Prep Manager Service (KI Rule: Concise, typed, single-responsibility)."""

from agents.prep.schemas import WorkOrder, PrepRecord, GroundingEvidence
from agents.prep.vlm_client import vlm_client
from agents.prep.amazon_rules import aggregate_compliance
from agents.prep.fail_open import fail_open_boundary
from agents.prep.repository import prep_repo
from agents.prep.tenancy import get_current_org


@fail_open_boundary
async def inspect_prepped_unit(work_order: WorkOrder, photo_refs: list[str], operator_id: str = "op_amira") -> PrepRecord:
    """Core inspection workflow: 1 Batched VLM Call -> Authoritative Rules -> Evidence Record."""
    # 1. Single Batched Multimodal VLM Call (Rule 2)
    vlm = await vlm_client.inspect_unit(photo_refs, work_order)

    # 2. Deterministic Amazon FBA Rules Engine (Rule 4 & Rule 5)
    overall_verdict, checks, reasons = aggregate_compliance(work_order, vlm)

    # 3. Build Traceable Evidence Grounding Bounding Boxes
    grounding = [
        GroundingEvidence(check_id="polybag", photo_ref=photo_refs[0], bbox=vlm.polybag_bbox, confidence=vlm.polybag_confidence, observation_text=reasons[0]),
        GroundingEvidence(check_id="suffocation", photo_ref=photo_refs[1] if len(photo_refs) > 1 else photo_refs[0], bbox=vlm.suffocation_bbox, confidence=vlm.suffocation_confidence, observation_text=reasons[1]),
        GroundingEvidence(check_id="fnsku", photo_ref=photo_refs[-1], bbox=vlm.fnsku_bbox, confidence=vlm.fnsku_confidence, observation_text=reasons[2]),
        GroundingEvidence(check_id="barcode_coverage", photo_ref=photo_refs[-1], bbox=vlm.barcode_bbox, confidence=vlm.barcode_confidence, observation_text=reasons[3]),
        GroundingEvidence(check_id="expiry", photo_ref=photo_refs[0], bbox=vlm.expiry_bbox, confidence=vlm.expiry_confidence, observation_text=reasons[4]),
        GroundingEvidence(check_id="handling", photo_ref=photo_refs[0], bbox=vlm.handling_bbox, confidence=vlm.handling_confidence, observation_text=reasons[5]),
    ]

    # 4. Construct Cross-Pod Evidence Record (PRP-XXXX)
    record = PrepRecord(
        record_id=f"PRP-{work_order.unit_id.split('-')[-1]}",
        unit_id=work_order.unit_id,
        org_id=get_current_org(),
        work_order_id=work_order.work_order_id,
        fba_shipment_id=work_order.fba_shipment_id,
        sku=work_order.sku,
        asin=work_order.asin,
        fnsku=work_order.fnsku,
        prep_price_usd=work_order.prep_price_usd,
        overall_verdict=overall_verdict,
        checks=checks,
        evidence_grounding=grounding,
        photo_refs=photo_refs,
        operator_id=operator_id
    )

    # 5. Persist with Tenancy Isolation (Rule 1)
    return prep_repo.save(record)
