"""Fail-Open Architecture Boundary (Engineering Rule 3: Fail Open - Line Never Blocks)."""

import functools
import logging
from typing import Callable, Any
from agents.prep.schemas import PrepRecord, ComplianceChecks, WorkOrder

logger = logging.getLogger("prep_manager.fail_open")


def fail_open_boundary(func: Callable) -> Callable:
    """Decorator ensuring any model error or timeout saves the capture and returns status=pending_review."""
    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> PrepRecord:
        try:
            return await func(*args, **kwargs)
        except Exception as exc:
            logger.error(f"FAIL-OPEN TRIGGERED: Model execution error or timeout: {exc}", exc_info=True)

            # Extract work order and captured photo refs if provided in kwargs or args
            wo = kwargs.get("work_order") or next((a for a in args if isinstance(a, WorkOrder)), WorkOrder())
            photo_refs = kwargs.get("photo_refs") or next((a for a in args if isinstance(a, list)), ["fixtures/pending_capture.jpg"])
            operator_id = kwargs.get("operator_id") or next((a for a in args if isinstance(a, str) and a.startswith("op_")), "op_station_1")

            # Construct safe fail-open pending record so packing station NEVER blocks
            return PrepRecord(
                record_id=f"PRP-{wo.unit_id.split('-')[-1]}",
                unit_id=wo.unit_id,
                org_id=wo.org_id,
                work_order_id=wo.work_order_id,
                fba_shipment_id=wo.fba_shipment_id,
                sku=wo.sku,
                asin=wo.asin,
                fnsku=wo.fnsku,
                prep_price_usd=wo.prep_price_usd,
                overall_verdict="pending_review",
                checks=ComplianceChecks(
                    polybag_present_sealed="uncertain",
                    suffocation_warning="uncertain",
                    fnsku_label_placement="uncertain",
                    original_barcode_covered="uncertain",
                    expiry_date="uncertain",
                    handling_marks="uncertain"
                ),
                evidence_grounding=[],
                photo_refs=photo_refs,
                operator_id=operator_id
            )
    return wrapper
