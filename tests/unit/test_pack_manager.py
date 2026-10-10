"""Pack Manager: fail-open behaviour, input resolution, order lines, tenancy, and mocked Gemini verdicts.

Gemini is always mocked here: these tests never touch the network or need a key.
"""
import hashlib
import json
from pathlib import Path

import pytest

from agents.pack import app as pack
from orchestration.orchestrator import load_flow, run_workflow
from orchestration.store import MemoryStore
from shared.utils import schema

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "data/sample/cases.json").read_text())
MFN = next(c for c in CASES if c["route"] == "mfn")
KEYS = {"items_present", "quantities_correct", "no_extra_items"}


def make_request(case=MFN, inputs=None, org_id=None):
    wf = f"WF-{case['org_id']}-{case['unit_id']}"
    return {
        "schema_version": "1.0", "request_id": f"{wf}:pack", "workflow_id": wf, "stage": "pack",
        "subject": {"org_id": org_id or case["org_id"], "subject_id": case["unit_id"], "route": case["route"]},
        "inputs": inputs or [], "previous_evidence": [], "context": {"overrides": [], "case": case},
    }


@pytest.fixture
def photo(tmp_path, monkeypatch):
    """One fake box photo under INPUT_DIR, referenced the way the orchestrator does (relative to INPUT_DIR)."""
    monkeypatch.setenv("INPUT_DIR", str(tmp_path))
    folder = tmp_path / MFN["unit_id"] / "pack"
    folder.mkdir(parents=True)
    f = folder / "1.jpg"
    f.write_bytes(b"\xff\xd8\xff fake jpeg bytes")
    return {"ref": f"{MFN['unit_id']}/pack/1.jpg", "kind": "image", "sha256": hashlib.sha256(f.read_bytes()).hexdigest()}


@pytest.fixture
def gemini(monkeypatch):
    """Pretend a key is configured; return a dict the test fills with the model's reply (and a call log)."""
    state = {"result": {}, "calls": []}
    monkeypatch.setattr(pack, "is_configured", lambda: True)

    def fake_inspect(image_paths, expected_items_str, order_lines_parsed):
        state["calls"].append((image_paths, expected_items_str, order_lines_parsed))
        if isinstance(state["result"], Exception):
            raise state["result"]
        return state["result"]

    monkeypatch.setattr(pack, "inspect_package", fake_inspect)
    return state


def model_reply(**verdicts):
    return {"model_version": "mock", "checks": [{"check_key": k, "verdict": verdicts.get(k, "PASS"), "confidence": 0.9} for k in KEYS]}


def assert_valid(out):
    assert schema.errors("agent-output", out) == []
    assert schema.errors("evidence", out["evidence"]) == []


def assert_completed_uncertain(out, code):
    ev = out["evidence"]
    assert_valid(out)
    assert ev["status"] == "completed"          # NOT pending/error: the workflow must not end FAILED
    assert ev["error"] is None
    assert out["verdict"] == "UNCERTAIN" and ev["decision"]["needs_human"] is True
    assert ev["decision"]["outcome"] == "pending_review"
    assert {c["check_key"] for c in ev["checks"]} == KEYS
    assert all(c["verdict"] == "UNCERTAIN" for c in ev["checks"])
    assert code in ev["decision"]["reason"]


# ---------------------------------------------------------------- fail-open (completed UNCERTAIN)

def test_no_key_is_completed_uncertain(monkeypatch):
    monkeypatch.setattr(pack, "is_configured", lambda: False)
    assert_completed_uncertain(pack.handle(make_request()), "gemini_not_configured")


def test_no_inputs_is_completed_uncertain(gemini):
    assert_completed_uncertain(pack.handle(make_request()), "no_inputs")
    assert gemini["calls"] == []


def test_missing_file_is_completed_uncertain(gemini, photo):
    ghost = {**photo, "ref": f"{MFN['unit_id']}/pack/nope.jpg"}
    assert_completed_uncertain(pack.handle(make_request(inputs=[ghost])), "invalid_input")
    assert gemini["calls"] == []


def test_hash_mismatch_is_completed_uncertain_and_not_sent_to_model(gemini, photo):
    bad = {**photo, "sha256": "0" * 64}
    assert_completed_uncertain(pack.handle(make_request(inputs=[bad])), "invalid_input")
    assert gemini["calls"] == []


def test_path_traversal_is_refused(gemini, photo):
    evil = {"ref": "../../README.md", "kind": "other"}
    assert_completed_uncertain(pack.handle(make_request(inputs=[evil])), "invalid_input")
    assert gemini["calls"] == []


def test_transient_model_error_stays_retryable_pending(gemini, photo):
    gemini["result"] = TimeoutError("boom")
    out = pack.handle(make_request(inputs=[photo]))
    assert_valid(out)
    assert out["evidence"]["status"] == "pending" and out["evidence"]["error"]["retryable"] is True
    assert out["verdict"] == "UNCERTAIN"


# ---------------------------------------------------------------- inputs and order lines

def test_ref_relative_to_input_dir_is_resolved(gemini, photo):
    gemini["result"] = model_reply()
    pack.handle(make_request(inputs=[photo]))
    assert len(gemini["calls"]) == 1
    assert Path(gemini["calls"][0][0][0]).as_posix().endswith(f"{MFN['unit_id']}/pack/1.jpg")  # same check on Windows


def test_order_lines_come_from_the_order_record(gemini, photo):
    gemini["result"] = model_reply()
    out = pack.handle(make_request(inputs=[photo]))
    _, expected_str, parsed = gemini["calls"][0]
    assert parsed, "order lines must not be empty"
    assert all(item["sku"] in expected_str for item in parsed)
    assert "No structured order lines" not in expected_str
    assert out["evidence"]["payload"]["expected_items"] == expected_str


def test_parse_order_lines():
    assert pack._parse_order_lines("SKU-A:1;SKU-B:2") == [{"sku": "SKU-A", "quantity": 1}, {"sku": "SKU-B", "quantity": 2}]
    assert pack._parse_order_lines("SKU-A") == [{"sku": "SKU-A", "quantity": 1}]
    assert pack._parse_order_lines("") == []


# ---------------------------------------------------------------- mocked Gemini verdicts

@pytest.mark.parametrize("verdicts,outcome,verdict", [
    ({}, "seal", "PASS"),
    ({"quantities_correct": "FAIL"}, "stop_and_fix", "FAIL"),
    ({"no_extra_items": "UNCERTAIN"}, "pending_review", "UNCERTAIN"),
    ({"items_present": "FAIL", "no_extra_items": "UNCERTAIN"}, "stop_and_fix", "FAIL"),  # FAIL outranks UNCERTAIN
])
def test_model_verdicts_map_to_outcomes(gemini, photo, verdicts, outcome, verdict):
    gemini["result"] = model_reply(**verdicts)
    out = pack.handle(make_request(inputs=[photo]))
    assert_valid(out)
    assert (out["evidence"]["decision"]["outcome"], out["verdict"]) == (outcome, verdict)
    assert out["evidence"]["model"]["calls"] == 1


def test_missing_model_check_becomes_schema_valid_uncertain(gemini, photo):
    reply = model_reply()
    reply["checks"] = reply["checks"][:2]   # Gemini "forgot" one required check
    gemini["result"] = reply
    out = pack.handle(make_request(inputs=[photo]))
    assert_valid(out)
    assert out["verdict"] == "UNCERTAIN"


def test_invented_uncertain_reason_is_coerced_to_valid_enum(gemini, photo):
    reply = model_reply(items_present="UNCERTAIN")
    reply["checks"][0]["uncertain_reason"] = "model felt unsure"
    gemini["result"] = reply
    assert_valid(pack.handle(make_request(inputs=[photo])))


# ---------------------------------------------------------------- tenancy

def test_other_tenant_is_refused(gemini, photo):
    other = "org_demo_alpha" if MFN["org_id"] != "org_demo_alpha" else "org_demo_bravo"
    with pytest.raises(LookupError):
        pack.handle(make_request(inputs=[photo], org_id=other))
    assert gemini["calls"] == []


# ---------------------------------------------------------------- orchestrated

def test_unconfigured_pack_ends_blocked_for_review_not_failed(monkeypatch):
    monkeypatch.setattr(pack, "is_configured", lambda: False)
    flow = load_flow(ROOT / "orchestration/flow.specialist.json")
    wf = run_workflow({**MFN}, flow, MemoryStore())
    pack_stage = next(s for s in wf["stage_results"] if s["stage"] == "pack")
    assert pack_stage["state"] == "completed" and pack_stage["verdict"] == "UNCERTAIN"
    assert wf["status"] != "FAILED"
    assert wf["final_outcome"]["outcome"] != "INCOMPLETE"
