from __future__ import annotations

from typing import Any

from shared.utils.stubs import effective_verdict, previous


def reconcile_upstream(
    request: dict,
    ordered_sku: str,
    used_pack_as_reference: bool = False,
    used_rcv_as_reference: bool = False,
) -> tuple[dict[str, Any], list[str]]:
    """Reconciles earlier stages' evidence (Pack & Receiving) per §4.3."""
    reconciliation: dict[str, Any] = {
        "pack": None,
        "receiving": None,
        "sku_consistent_with_order": True,
        "notes": [],
    }
    consumed_refs: list[str] = []

    # 1. Pack stage
    pack_rec = previous(request, "pack")
    if pack_rec:
        consumed_refs.append(pack_rec["record_id"])
        eff_v = effective_verdict(request, pack_rec)
        shipped_sku = pack_rec.get("subject", {}).get("refs", {}).get("sku")
        reconciliation["pack"] = {
            "record_id": pack_rec["record_id"],
            "effective_verdict": eff_v,
            "shipped_sku": shipped_sku,
            "used_as_reference": used_pack_as_reference,
        }
        if shipped_sku and ordered_sku and shipped_sku != ordered_sku:
            reconciliation["sku_consistent_with_order"] = False
            reconciliation["notes"].append(f"Pack record indicates shipped SKU {shipped_sku} differs from ordered SKU {ordered_sku}")

    # 2. Receiving stage
    rcv_rec = previous(request, "receiving")
    if rcv_rec:
        consumed_refs.append(rcv_rec["record_id"])
        eff_v = effective_verdict(request, rcv_rec)
        rcv_sku = rcv_rec.get("subject", {}).get("refs", {}).get("sku")
        reconciliation["receiving"] = {
            "record_id": rcv_rec["record_id"],
            "effective_verdict": eff_v,
            "received_sku": rcv_sku,
            "used_as_reference": used_rcv_as_reference,
        }
        if rcv_sku and ordered_sku and rcv_sku != ordered_sku:
            reconciliation["sku_consistent_with_order"] = False
            reconciliation["notes"].append(f"Receiving record indicates inbound SKU {rcv_sku} differs from ordered SKU {ordered_sku}")

    return reconciliation, consumed_refs


def check_packing_error(reconciliation: dict[str, Any], identity_verdict: str) -> str | None:
    """Detects packing error vs customer swap per §4.3."""
    pack = reconciliation.get("pack")
    if pack and pack.get("effective_verdict") == "FAIL" and identity_verdict == "FAIL":
        note = "Packing stage recorded FAIL (wrong or extra item packed); returns identity mismatch may stem from warehouse packing error rather than customer swap."
        if note not in reconciliation["notes"]:
            reconciliation["notes"].append(note)
        return note
    return None
