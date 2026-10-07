"""Integration test: Agent 02 (Prep) -> Agent 03 (Pack) cartonization adapter."""
from agents.prep.app import handle as prep_handle
from agents.prep.adapters.pack_adapter import export_for_pack


def test_prep_to_pack_cartonization_gate():
    org_id = "org_demo_alpha"
    unit_id = "UNIT-0014"
    req = {
        "schema_version": "1.0",
        "request_id": f"prp-{unit_id}",
        "workflow_id": f"WF-{org_id}-{unit_id}",
        "stage": "prep",
        "subject": {"org_id": org_id, "subject_id": unit_id, "route": "fba"},
        "inputs": [],
        "previous_evidence": [],
        "context": {}
    }
    prep_out = prep_handle(req)
    ev = prep_out["evidence"]
    manifest = export_for_pack(ev)

    assert manifest["unit_id"] == unit_id
    assert manifest["overall_verdict"] in ("PASS", "FAIL", "UNCERTAIN")
    assert manifest["ready_for_pack"] == (manifest["overall_verdict"] == "PASS")
