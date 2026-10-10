"""Pod 15 (Specialist, no Prep): end-to-end workflows with the REAL agents on the Pod's own sample units.

Unlike tests/e2e/test_examples.py (which now uses fake agents to check the documented example outcomes),
every stage here runs the Pod's actual Receiving / Pack / Returns / Recovery code through the orchestrator,
offline and with no API keys (as in CI and a judge's fresh clone). Handbook section 12, "Minimum testing plan":
clean, exception, claim, UNCERTAIN + auditable override, injected failure, wrong tenant.

Units were chosen from a full run of all 100 sample cases on the Specialist flow (see docs/evaluation.md).
"""
import json
from pathlib import Path

import pytest

import tests.helpers as h
from orchestration.orchestrator import apply_override, load_flow, run_workflow
from orchestration.store import MemoryStore
from shared.utils.schema import errors

ROOT = Path(__file__).resolve().parents[2]
FLOW = load_flow(ROOT / "orchestration/flow.specialist.json")
CASES = {(c["org_id"], c["unit_id"]): c for c in json.loads((ROOT / "data/sample/cases.json").read_text())}


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    """No model keys: the agents must fail open (UNCERTAIN), never call a paid API from a test."""
    for k in ("OPENROUTER_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.delenv(k, raising=False)


def run(unit, org="org_demo_alpha", store=None, **clients):
    store = store or MemoryStore()
    return run_workflow(CASES[(org, unit)], FLOW, store, clients or None), store


def stage(wf, name):
    return next(s for s in wf["stage_results"] if s["stage"] == name)


def evidence_is_valid(wf, store):
    for rid in wf["evidence_references"]:
        assert errors("evidence", store.get_evidence(rid)) == [], rid


def test_specialist_flow_never_runs_prep():
    wf, store = run("UNIT-0010")
    assert "prep" not in {s["stage"] for s in wf["stage_results"] if s.get("state") != "skipped"}
    assert not any(store.get_evidence(r)["stage"] == "prep" for r in wf["evidence_references"])


def test_clean_unit_completes_clean():
    wf, store = run("UNIT-0010")
    assert (wf["status"], wf["final_outcome"]["outcome"]) == ("COMPLETED", "CLEAN")
    assert stage(wf, "receiving")["verdict"] == "PASS"
    evidence_is_valid(wf, store)


def test_receiving_exception_is_completed_as_exception():
    wf, store = run("UNIT-0004")
    assert (wf["status"], wf["final_outcome"]["outcome"]) == ("COMPLETED", "EXCEPTION")
    assert stage(wf, "receiving")["verdict"] == "FAIL"
    evidence_is_valid(wf, store)


def test_claim_is_recommended_and_traceable_to_recovery_evidence():
    wf, store = run("UNIT-0071")
    assert (wf["status"], wf["final_outcome"]["outcome"]) == ("COMPLETED", "CLAIM_RECOMMENDED")
    rcy = store.get_evidence(stage(wf, "recovery")["record_id"])
    assert rcy["decision"]["outcome"] == "claim_recommended"
    assert rcy["upstream_refs"], "the claim must cite the upstream evidence it relied on"
    evidence_is_valid(wf, store)


def test_inbound_defect_charges_stay_silent_without_prep_evidence():
    """Specialist Pod: no Prep evidence, so Recovery may not claim an inbound-defect fee (handbook section 9)."""
    wf, store = run("UNIT-0014")
    rcy = store.get_evidence(stage(wf, "recovery")["record_id"])
    assert rcy["decision"]["outcome"] != "claim_recommended"
    assert all(c["verdict"] != "FAIL" for c in rcy["checks"] if "prep" in (c.get("detail") or "").lower())


def test_uncertain_blocks_for_review_and_an_override_resolves_it_without_rewriting_evidence():
    wf, store = run("UNIT-0008")                                    # Pack cannot judge offline -> UNCERTAIN
    assert (wf["status"], wf["final_outcome"]["outcome"]) == ("BLOCKED", "NEEDS_REVIEW")
    pack_id = stage(wf, "pack")["record_id"]
    before = json.dumps(store.get_evidence(pack_id), sort_keys=True)

    wf = apply_override(wf["workflow_id"], store, record_id=pack_id, new_verdict="PASS",
                        actor="op_devika", reason="Box re-inspected by hand: items and quantities match the order.")
    assert wf["status"] != "BLOCKED" and wf["final_outcome"]["outcome"] != "NEEDS_REVIEW"
    o = wf["overrides"][-1]
    assert o["supersedes"]["record_id"] == pack_id and o["actor"] == "op_devika" and o["reason"]
    assert json.dumps(store.get_evidence(pack_id), sort_keys=True) == before, "original evidence must stay intact"


@pytest.mark.parametrize("broken", [h.Boom(h.AgentUnavailable("returns service down")),
                                    h.Boom(RuntimeError("returns crashed"))])
def test_injected_agent_failure_is_recorded_and_never_success(broken):
    wf, store = run("UNIT-0014", returns=broken)                  # Receiving + Recovery stay real
    sr = stage(wf, "returns")
    assert sr["state"] == "error" and sr["error"]["code"] in ("agent_unavailable", "agent_exception")
    assert wf["status"] == "FAILED" and wf["final_outcome"]["outcome"] not in ("CLEAN", "CLAIM_RECOMMENDED")
    evidence_is_valid(wf, store)


def test_output_for_another_tenant_is_rejected_as_a_security_event():
    wf, store = run("UNIT-0010", receiving=h.Mangle("receiving", "other_tenant"))
    sr = stage(wf, "receiving")
    assert sr["state"] == "error" and sr["error"]["code"] == "tenant_mismatch"
    assert wf["status"] != "COMPLETED"


@pytest.mark.parametrize("stage_name", ["receiving", "pack", "returns", "recovery"])
def test_real_agents_refuse_a_subject_of_another_tenant(stage_name):
    from orchestration.clients import client_for
    from tests.conftest import make_input
    alpha_unit = CASES[("org_demo_alpha", "UNIT-0014")]
    req = make_input(stage_name, {**alpha_unit, "org_id": "org_demo_bravo"})
    try:
        out = client_for(stage_name).run(req, 30)
    except (LookupError, h.AgentRejected):
        return                                                     # refused: correct
    # an agent may also answer "pending" without data, but never with the other tenant's evidence
    assert out["evidence"]["subject"]["org_id"] == "org_demo_bravo"
    assert out["verdict"] != "PASS" or not out["evidence"]["checks"]
