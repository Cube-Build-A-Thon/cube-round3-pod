"""Receiving Manager: agent entry point.

Round 2 Receiving Manager pipeline (Multi-parameter visual perception +
Deterministic Decision Engine, strict UNCERTAIN handling, and multi-provider fallback)
behind a Round 3 adapter.
"""
from __future__ import annotations

import os
from typing import Any

from agents.receiving.r2.decision_engine import evaluate_inspection
from agents.receiving.r2.perception import observe_deterministic, observe_gemini
from agents.receiving.r2.schemas import PurchaseOrderInput
from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, pending_output
from shared.utils.server import make_app
from shared.utils.stubs import photos

STAGE = "receiving"
AGENT_ID = "receiving-manager-rcv0138@2"


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s["subject_id"]
    org_id = s["org_id"]

    # 1. Tenancy and PO row lookup (LookupError -> 404 for wrong tenant or unknown subject)
    r = sample_data.row("receiving", subject_id, org_id)

    # 2. Input captures discovery
    input_items = request.get("inputs") or photos(r)
    refs = [p["ref"] for p in input_items]

    # 3. Construct Purchase Order specification input
    po = PurchaseOrderInput(
        order_number=r.get("po_number", ""),
        po_line=r.get("po_line", "1"),
        sku=r.get("sku", ""),
        asin=r.get("asin", ""),
        product_name=r.get("product_title", ""),
        supplier=r.get("supplier", ""),
        expected_quantity=int(r.get("qty_ordered", 0)),
        expected_cartons=int(r.get("cartons_ordered", 0)),
        expected_units_per_carton=int(r.get("units_per_carton_ordered", 1)),
        expected_variant=r.get("spec_variant", ""),
        expected_colour=r.get("spec_colour", ""),
        expected_components=[c.strip() for c in (r.get("spec_components") or "").split(";") if c.strip()],
    )

    # 4. Multimodal Perception (Live Gemini on demand; Deterministic Replay by default)
    mode = os.environ.get("RECEIVING_MODEL_MODE", "replay")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if mode == "live" and gemini_key:
        try:
            obs, model_meta = observe_gemini(po, refs, gemini_key)
        except Exception as exc:
            # Fail open on model failure per contract
            return pending_output(
                request,
                code="model_error",
                message=f"Gemini perception failed: {exc}",
                retryable=True,
                agent_id=AGENT_ID,
            )
    else:
        obs, model_meta = observe_deterministic(po, r, refs)

    # 5. Deterministic Business Rules Decision Engine
    decision_res = evaluate_inspection(po, obs, refs)

    checks = [
        check(
            c.check_key,
            c.verdict,
            c.confidence,
            expected=c.expected,
            observed=c.observed,
            detail=c.detail,
            evidence_refs=c.evidence_refs,
            uncertain_reason=c.uncertain_reason,
        )
        for c in decision_res.checks
    ]

    qo, qr = po.expected_quantity, int(r.get("qty_received", 0))
    flags = [f for f in r.get("quality_flags", "").split(";") if f]

    # 6. Build contract-compliant Evidence Record
    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=r["record_id"],
        captured_at=r["captured_at"],
        operator_id=r.get("operator_id"),
        unit_scope="po_line",
        refs={
            "po_number": r["po_number"],
            "po_line": r["po_line"],
            "sku": r["sku"],
            "asin": r["asin"],
        },
        checks=checks,
        outcome=decision_res.outcome,
        verdict=decision_res.verdict,
        reason=decision_res.reason,
        model=model_meta,
        inputs=input_items,
        needs_human=decision_res.needs_human,
        payload={
            "supplier": r["supplier"],
            "qty_ordered": qo,
            "qty_received": qr,
            "shortfall_units": max(qo - qr, 0),
            "quality_flags": flags,
        },
    )

    return build_output(record)


app = make_app(STAGE, handle)
