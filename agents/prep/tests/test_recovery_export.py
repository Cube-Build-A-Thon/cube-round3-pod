"""Integration test: Agent 02 (Prep) -> Agent 05 (Recovery) dispute proof export."""
from agents.prep.app import handle as prep_handle
from agents.prep.adapters.recovery_adapter import export_dispute_evidence_pack


def test_prep_recovery_dispute_pack_export():
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
    dispute_pack = export_dispute_evidence_pack(ev)

    assert dispute_pack["record_id"] == ev["record_id"]
    assert dispute_pack["unit_id"] == unit_id
    assert "overall_verdict" in dispute_pack
    assert "dispute_ready" in dispute_pack
