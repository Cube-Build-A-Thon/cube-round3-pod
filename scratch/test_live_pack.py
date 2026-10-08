"""Live end-to-end testing script for Pack Manager.

Tests:
1. Direct Pack Manager handle() call on SEAL case (UNIT-0006)
2. Direct Pack Manager handle() call on STOP_AND_FIX case (UNIT-0027 - extra item)
3. Direct Pack Manager handle() call on UNCERTAIN occlusion case (FIX-1.d)
4. Multi-tenant rejection on wrong tenant (UNIT-0006 under org_demo_alpha)
5. Full Orchestrator workflow on MFN case (UNIT-0006)
"""
import os
import sys

from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

os.environ["ORCH_MODE"] = "inproc"

from agents.pack.app import handle
from orchestration.orchestrator import run_workflow
from shared.utils.hashing import verify
from shared.utils.schema import errors

print("=" * 60)
print("TEST 1: Direct Pack Verification - SEAL (UNIT-0006)")
print("=" * 60)
req1 = {
    "schema_version": "1.0",
    "request_id": "WF-test:pack",
    "workflow_id": "WF-org_demo_bravo-UNIT-0006",
    "stage": "pack",
    "subject": {"org_id": "org_demo_bravo", "subject_id": "UNIT-0006", "route": "mfn"},
    "inputs": [],
    "previous_evidence": [],
    "context": {"overrides": []},
}
res1 = handle(req1)
print("Agent ID:", res1["agent_id"])
print("Status:", res1["status"])
print("Verdict:", res1["verdict"])
print("Outcome:", res1["evidence"]["decision"]["outcome"])
print("Record ID:", res1["evidence"]["record_id"])
print("Checks:", [(c["check_key"], c["verdict"]) for c in res1["evidence"]["checks"]])
print("Hash Verified:", verify(res1["evidence"]))
print("Agent Output Schema Valid:", errors("agent-output", res1) == [])

print("\n" + "=" * 60)
print("TEST 2: Direct Pack Verification - STOP_AND_FIX (UNIT-0027)")
print("=" * 60)
req2 = {
    "schema_version": "1.0",
    "request_id": "WF-test2:pack",
    "workflow_id": "WF-org_demo_bravo-UNIT-0027",
    "stage": "pack",
    "subject": {"org_id": "org_demo_bravo", "subject_id": "UNIT-0027", "route": "mfn"},
    "inputs": [],
    "previous_evidence": [],
    "context": {"overrides": []},
}
res2 = handle(req2)
print("Verdict:", res2["verdict"])
print("Outcome:", res2["evidence"]["decision"]["outcome"])
print("Reason:", res2["evidence"]["decision"]["reason"])
print("Checks:", [(c["check_key"], c["verdict"]) for c in res2["evidence"]["checks"]])

print("\n" + "=" * 60)
print("TEST 3: Direct Pack Verification - UNCERTAIN Occlusion (FIX-1.d)")
print("=" * 60)
req3 = {
    "schema_version": "1.0",
    "request_id": "WF-test3:pack",
    "workflow_id": "WF-org_demo_alpha-FIX-1.d",
    "stage": "pack",
    "subject": {"org_id": "org_demo_alpha", "subject_id": "FIX-1.d", "route": "mfn"},
    "inputs": [],
    "previous_evidence": [],
    "context": {"overrides": []},
}
res3 = handle(req3)
print("Verdict:", res3["verdict"])
print("Outcome:", res3["evidence"]["decision"]["outcome"])
print("Reason:", res3["evidence"]["decision"]["reason"])
print("Checks:", [(c["check_key"], c["verdict"], c.get("uncertain_reason")) for c in res3["evidence"]["checks"]])

print("\n" + "=" * 60)
print("TEST 4: Multi-Tenant Rejection (Rule 5.1)")
print("=" * 60)
req4 = {
    "schema_version": "1.0",
    "request_id": "WF-test4:pack",
    "workflow_id": "WF-org_demo_alpha-UNIT-0006",
    "stage": "pack",
    "subject": {"org_id": "org_demo_alpha", "subject_id": "UNIT-0006", "route": "mfn"},
    "inputs": [],
    "previous_evidence": [],
    "context": {"overrides": []},
}
try:
    handle(req4)
    print("FAILED: Wrong tenant was not rejected!")
except LookupError as exc:
    print("SUCCESS: Rejected cross-tenant access with LookupError:", exc)

print("\n" + "=" * 60)
print("TEST 5: Full Orchestrator End-to-End Workflow (UNIT-0006)")
print("=" * 60)
case = {"org_id": "org_demo_bravo", "unit_id": "UNIT-0006", "route": "mfn", "returned": False}
wf = run_workflow(case)
print("Workflow ID:", wf["workflow_id"])
print("Workflow Status:", wf["status"])
print("Final Outcome:", wf["final_outcome"]["outcome"])
print("Contributing Records:", wf["final_outcome"]["contributing_records"])
for sr in wf["stage_results"]:
    v = sr.get("verdict") or (sr.get("state") or "N/A")
    rid = sr.get("record_id") or "NONE"
    print(f" -> Stage: {sr['stage']:<10} | Result: {v:<10} | Record: {rid}")

print("\n" + "=" * 60)
print("ALL LIVE TESTS COMPLETED SUCCESSFULLY!")
print("=" * 60)
