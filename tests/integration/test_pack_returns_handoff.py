"""Pack -> Returns hand-off: Returns receives the Pack record, reads what Pack saw in the box, and flags a likely
packing error (rather than a customer swap) when Pack failed and the returned item is the wrong one."""
from __future__ import annotations

import copy

import pytest

from orchestration.orchestrator import load_flow, run_workflow
from orchestration.store import MemoryStore

returns_app = pytest.importorskip("agents.returns.app")


def _record(store, wf, stage):
    sr = next(s for s in wf["stage_results"] if s["stage"] == stage)
    return store.get_evidence(sr["record_id"]) if sr.get("record_id") else None


@pytest.fixture(scope="module")
def mfn_run():
    store = MemoryStore()
    wf = run_workflow({"org_id": "org_demo_alpha", "unit_id": "UNIT-0016", "route": "mfn", "returned": True}, load_flow(), store)
    return store, wf


def _returns_request(wf, previous, subject_id="UNIT-0016", request_id="TEST:returns"):
    return {"schema_version": "1.0", "request_id": request_id, "workflow_id": wf["workflow_id"], "stage": "returns",
            "subject": {"org_id": "org_demo_alpha", "subject_id": subject_id, "route": "mfn"}, "inputs": [],
            "previous_evidence": previous, "context": {"overrides": [], "case": wf["context"]}}


def test_returns_consumes_the_pack_record(mfn_run):
    store, wf = mfn_run
    pck, rtn = _record(store, wf, "pack"), _record(store, wf, "returns")
    assert pck["status"] == "completed"
    assert pck["record_id"] in rtn["upstream_refs"]
    pack_view = rtn["payload"]["upstream_reconciliation"]["pack"]
    assert pack_view["record_id"] == pck["record_id"]
    assert pack_view["shipped_skus"] == ["SKU-TOWEL-BLU"]  # read from Pack's observed_in_box
    assert rtn["payload"]["upstream_reconciliation"]["sku_consistent_with_order"] is True


def test_wrong_sku_in_the_box_is_flagged(mfn_run):
    store, wf = mfn_run
    pck = copy.deepcopy(_record(store, wf, "pack"))
    pck["payload"]["observed_in_box"] = [{"sku": "SKU-MUG-11", "quantity": 1}]
    out = returns_app.handle(_returns_request(wf, [_record(store, wf, "receiving"), pck]))
    recon = out["evidence"]["payload"]["upstream_reconciliation"]
    assert recon["sku_consistent_with_order"] is False
    assert any("SKU-MUG-11" in note for note in recon["notes"])


def test_pack_fail_plus_wrong_item_notes_a_possible_packing_error(mfn_run):
    store, wf = mfn_run
    wf38 = run_workflow({"org_id": "org_demo_alpha", "unit_id": "UNIT-0038", "route": "fba", "returned": True}, load_flow(), store)
    failed_pack = copy.deepcopy(_record(store, wf, "pack"))
    failed_pack["record_id"] = "PCK-TEST-0038"
    failed_pack["decision"]["verdict"], failed_pack["decision"]["outcome"] = "FAIL", "stop_and_fix"
    out = returns_app.handle(_returns_request(wf, [_record(store, wf38, "receiving"), failed_pack],
                                              subject_id="UNIT-0038", request_id="TEST38:returns"))
    ev = out["evidence"]
    assert next(c["verdict"] for c in ev["checks"] if c["check_key"] == "identity_match") == "FAIL"
    assert any("packing error" in note for note in ev["payload"]["upstream_reconciliation"]["notes"])
