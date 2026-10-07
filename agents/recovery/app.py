"""Recovery Manager: agent entry point.
Integrated with Gemini-powered Tri-State FBA Audit Engine.
"""
import os
import google.generativeai as genai
import pandas as pd
from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import effective_verdict, previous

# Configure Gemini (Ensuring it pulls from the pod's environment variables)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

STAGE = "recovery"
AGENT_ID = "recovery-vishruth@1" # Updated ownership
MODEL_NAME = "gemini-1.5-flash"


def call_gemini_auditor(charge_type: str, evidence_context: str) -> str:
    """
    [WE WILL PASTE YOUR ROUND 2 GEMINI API CALL AND PROMPT HERE]
    This function will query Gemini and return 'CONTRADICTS', 'SUPPORTS', or 'SILENT'.
    """
    pass


def position(line: dict, request: dict) -> tuple[str, str, list[str]]:
    """(CONTRADICTS | SUPPORTS | SILENT, detail, evidence record ids)."""
    ctype = line["charge_type"]
    
    # 1. Extract upstream evidence based on the charge type
    evidence_text = ""
    evidence_ids = []
    
    if ctype == "inbound_defect_fee":
        prep = previous(request, "prep")
        if not prep or prep["status"] != "completed":
            return "SILENT", "no usable Prep record for this subject", []
        
        # [WE WILL ADAPT YOUR PANDAS/EVIDENCE FORMATTING HERE]
        evidence_text = f"Status: {prep['status']}, Verdict: {effective_verdict(request, prep)}"
        evidence_ids.append(prep["record_id"])
        
    elif ctype == "refund_issued_item_not_returned":
        ret = previous(request, "returns")
        if not ret or ret["status"] != "completed":
            return "SILENT", "no usable Returns record", []
        evidence_text = f"Return Checks: {ret.get('checks', [])}"
        evidence_ids.append(ret["record_id"])
        
    else:
        return "SILENT", f"no rule for {ctype}", []

    # 2. Trigger the Gemini Engine
    # pos = call_gemini_auditor(ctype, evidence_text)
    # [WE WILL MAP THE GEMINI RESPONSE DIRECTLY INTO THE RETURN TUPLE HERE]
    
    return "SILENT", "Pending Gemini Integration", []


def handle(request: dict) -> dict:
    s = request["subject"]
    
    # TENANCY ISOLATION GUARDRAIL (From Organizer + Your Round 2 Logic)
    if not sample_data.has("receiving", s["subject_id"], s["org_id"]):
        raise LookupError(f"unknown subject {s['subject_id']} in {s['org_id']}")  

    lines = sample_data.fee_lines(s["subject_id"], s["org_id"])
    checks, charges, claimable = [], [], 0.0
    
    # [THE REST OF THE ORGANIZER'S LOOP REMAINS UNCHANGED TO PASS TESTS]
    for line in lines:
        pos, why, ids = position(line, request)
        amount = float(line["amount_usd"])
        if pos == "CONTRADICTS" and amount <= 0:
            pos, why = "SILENT", "amount is 0.00: nothing to claim, or the amount is missing (finding F-09)"
        
        verdict = {"CONTRADICTS": "FAIL", "SUPPORTS": "PASS", "SILENT": "UNCERTAIN"}[pos]
        checks.append(check(f"charge_{line['line_id'].lower().replace('-', '_')}", verdict, None,
                            expected="charge supported by evidence", observed=pos, detail=why,
                            evidence_refs=ids, uncertain_reason="insufficient_evidence"))
        if pos == "CONTRADICTS":
            claimable += amount
        charges.append({"line_id": line["line_id"], "charge_type": line["charge_type"], "amount_usd": amount,
                        "position": pos, "reason": why, "evidence_record_ids": ids})
        
    claim = any(c["position"] == "CONTRADICTS" for c in charges)
    silent = any(c["position"] == "SILENT" for c in charges)
    verdict = "FAIL" if claim else ("UNCERTAIN" if silent else "PASS")
    outcome = "claim_recommended" if claim else ("insufficient_evidence" if silent else "no_claim")
    
    record = build_record(
        request, agent_id=AGENT_ID, record_id=f"RCY-{s['subject_id']}", model=MODEL_NAME,
        captured_at=max((l["posted_date"] + "T00:00:00Z" for l in lines), default=utcnow()),
        checks=checks, outcome=outcome, verdict=verdict,
        needs_human=False,
        reason=f"Gemini Audit: {len(charges)} charge(s), {sum(c['position'] == 'CONTRADICTS' for c in charges)} contradicted",
        payload={"charges": charges, "claimable_usd": round(claimable, 2),
                 "unclaimable": [c for c in charges if c["position"] != "CONTRADICTS"]},
    )
    return build_output(record, next_step="complete")

app = make_app(STAGE, handle)
