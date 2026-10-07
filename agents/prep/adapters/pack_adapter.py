"""Pack Adapter: Extracts overall_verdict: PASS and prepped details for Agent 03 (Pack)."""
from typing import Any
from agents.prep.schemas import PrepRecord


def export_for_pack(record: PrepRecord | dict[str, Any]) -> dict[str, Any]:
    """Prepares cartonization payload from Prep inspection results."""
    if isinstance(record, PrepRecord):
        verdict = record.overall_verdict
        unit_id = record.unit_id
        sku = record.sku
        fnsku = record.fnsku
        prep_price = record.prep_price_usd
    else:
        decision = record.get("decision", {})
        verdict = decision.get("verdict", "UNCERTAIN")
        unit_id = record.get("subject", {}).get("subject_id")
        refs = record.get("refs", {})
        sku = refs.get("sku")
        fnsku = refs.get("fnsku")
        prep_price = record.get("payload", {}).get("prep_price_usd", 0.0)

    return {
        "unit_id": unit_id,
        "sku": sku,
        "fnsku": fnsku,
        "overall_verdict": verdict,
        "ready_for_pack": verdict == "PASS",
        "prep_price_usd": prep_price,
        "gate_status": "ALLOW" if verdict == "PASS" else "HOLD"
    }

export_to_pack_manifest = export_for_pack
