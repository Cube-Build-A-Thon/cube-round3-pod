"""Integration test: Agent 01 (Receiving) -> Agent 02 (Prep) handshake."""
from agents.receiving.app import handle as receiving_handle
from agents.prep.app import handle as prep_handle
from agents.prep.adapters.receiving_adapter import map_to_work_order


def test_receiving_to_prep_handshake():
    org_id = "org_demo_alpha"
    unit_id = "UNIT-0014"

    # 1. Run receiving agent
    rcv_req = {
        "schema_version": "1.0",
        "request_id": f"rcv-{unit_id}",
        "workflow_id": f"WF-{org_id}-{unit_id}",
        "stage": "receiving",
        "subject": {"org_id": org_id, "subject_id": unit_id, "route": "fba"},
        "inputs": [],
        "previous_evidence": [],
        "context": {}
    }
    rcv_out = receiving_handle(rcv_req)
    assert rcv_out["evidence"]["status"] == "completed"

    # 2. Hand over to Prep with previous evidence
    prep_req = {
        "schema_version": "1.0",
        "request_id": f"prp-{unit_id}",
        "workflow_id": f"WF-{org_id}-{unit_id}",
        "stage": "prep",
        "subject": {"org_id": org_id, "subject_id": unit_id, "route": "fba"},
        "inputs": [],
        "previous_evidence": [rcv_out["evidence"]],
        "context": {}
    }
    work_order = map_to_work_order(prep_req)
    assert work_order.unit_id == unit_id

    prep_out = prep_handle(prep_req)
    assert prep_out["stage"] == "prep"
    assert prep_out["evidence"]["status"] == "completed"
