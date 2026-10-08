"""Recovery Manager: agent entry point.
Integrated with Gemini-powered Tri-State FBA Audit Engine from Round 2.
"""
import os
import json
import uuid
import hashlib
from datetime import datetime
from pydantic import BaseModel
import google.generativeai as genai

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import STUB_MODEL, effective_verdict, previous

STAGE = "recovery"
AGENT_ID = "recovery-vishruth@1"
MODEL_NAME = "gemini-1.5-flash"
MODEL_INFO = {"name": "gemini-1.5-flash", "version": "1.5", "provider": "google"}

# Configure Gemini (Pulls from pod's environment variables)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

# ── Authoritative Amazon FBA constants (not model memory) ─────────────────────
FBA_CLAIM_WINDOW_DAYS = 60

class RecoveryEvidenceRecord(BaseModel):
    record_id: str
    organization_id: str
    outcome: dict
    status: str
    content_hash: str = ""

    def compute_hash(self) -> str:
        serialized = json.dumps(
            {"record_id": self.record_id, "outcome": self.outcome},
            sort_keys=True
        )
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

class RecoveryAuditEngine:
    def __init__(self, api_key: str):
        self.api_key = api_key
        if not api_key:
            self.model = None
            return
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                MODEL_NAME,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.0,
                }
            )
        except Exception:
            self.model = None

    def audit_charge(self, org_id: str, fee_row: dict, evidence_records: list, compliance_rule: str = "") -> RecoveryEvidenceRecord:
        record_id = f"REC-AUDIT-{uuid.uuid4().hex[:8].upper()}"
        try:
            return self._run_audit(record_id, org_id, fee_row, evidence_records, compliance_rule)
        except Exception as exc:
            outcome = {
                "assessment": "UNCERTAIN",
                "decision": "PENDING_REVIEW",
                "recoverable_amount": 0.0,
                "reason": f"SYSTEM ERROR: {type(exc).__name__}: {exc}. Queued for manual adjudication.",
                "rule_cited": "Fail-Open Safety Protocol",
                "supporting_evidence": [],
            }
            rec = RecoveryEvidenceRecord(record_id=record_id, organization_id=org_id, outcome=outcome, status="ERROR_PENDING_REVIEW")
            rec.content_hash = rec.compute_hash()
            return rec

    def _run_audit(self, record_id: str, org_id: str, fee_row: dict, evidence_records: list, compliance_rule: str) -> RecoveryEvidenceRecord:
        amount = float(fee_row.get("amount_usd", 0.0) or fee_row.get("amount", 0.0))
        days = int(fee_row.get("days_since_event", 14) or 14)

        for ev in evidence_records:
            ev_org = ev.get("org_id", org_id)
            if ev_org != org_id:
                return self._build_rec(record_id, org_id, "SILENT", "NOT_SUPPORTED", 0.0, "TENANCY VIOLATION: Cross-tenant evidence.", "REJECTED_TENANCY")

        if fee_row.get("is_duplicate"):
            return self._build_rec(record_id, org_id, "DUPLICATE_CHARGE", "CLAIM_APPROVED", amount, "DUPLICATE TRANSACTION DETECTED.", "COMPLETED")

        if fee_row.get("already_reimbursed") or fee_row.get("reimbursement_id"):
            return self._build_rec(record_id, org_id, "ALREADY_REIMBURSED", "NOT_SUPPORTED", 0.0, "SUPPRESSED — ALREADY REIMBURSED.", "COMPLETED")

        if days > FBA_CLAIM_WINDOW_DAYS:
            return self._build_rec(record_id, org_id, "SILENT", "NOT_SUPPORTED", 0.0, f"TIME EXPIRED: >{FBA_CLAIM_WINDOW_DAYS} days.", "COMPLETED")

        if not evidence_records:
            return self._build_rec(record_id, org_id, "SILENT", "NOT_SUPPORTED", 0.0, "SILENT — insufficient evidence.", "COMPLETED")

        if self.model:
            try:
                ai_result = self._ai_evaluate(fee_row, evidence_records, compliance_rule)
                rec = RecoveryEvidenceRecord(record_id=record_id, organization_id=org_id, outcome=ai_result, status="COMPLETED")
                rec.content_hash = rec.compute_hash()
                return rec
            except Exception:
                pass 

        return self._deterministic_audit(record_id, org_id, fee_row, evidence_records, compliance_rule)

    def _build_rec(self, rid, oid, ass, dec, amt, rsn, stat):
        outcome = {"assessment": ass, "decision": dec, "recoverable_amount": amt, "reason": rsn, "supporting_evidence": []}
        rec = RecoveryEvidenceRecord(record_id=rid, organization_id=oid, outcome=outcome, status=stat)
        rec.content_hash = rec.compute_hash()
        return rec

    def _ai_evaluate(self, fee_row: dict, evidence_records: list, compliance_rule: str) -> dict:
        amount = float(fee_row.get("amount_usd", 0.0) or fee_row.get("amount", 0.0))
        system_prompt = f"""You are an AI Recovery Manager for Amazon FBA dispute reconciliation.
Track 05 — Cube Buildathon. Structured evidence-based reasoning ONLY.
Look at the evidence records' compliance_status.
A) If compliance_status == "FAIL": assessment="SUPPORTS", decision="NOT_SUPPORTED", recoverable_amount=0.0
B) If compliance_status == "PASS": assessment="CONTRADICTED", decision="CLAIM_APPROVED", recoverable_amount={amount}
C) If "UNCERTAIN": assessment="SILENT", decision="NEEDS_MANUAL_REVIEW", recoverable_amount=0.0
Do NOT return CONTRADICTED when evidence shows FAIL.
Do NOT return SUPPORTS when evidence shows PASS.
OUTPUT FORMAT: JSON with keys: assessment, decision, recoverable_amount, reason, rule_cited, supporting_evidence"""
        user_prompt = f"FEE REPORT:\n{json.dumps(fee_row)}\nEVIDENCE:\n{json.dumps(evidence_records)}"
        response = self.model.generate_content(system_prompt + "\n\n" + user_prompt)
        return json.loads(response.text.strip())

    def _deterministic_audit(self, record_id: str, org_id: str, fee_row: dict, evidence_records: list, compliance_rule: str) -> RecoveryEvidenceRecord:
        amount = float(fee_row.get("amount_usd", 0.0) or fee_row.get("amount", 0.0))
        ev = evidence_records[0] if evidence_records else {}
        stat = str(ev.get("compliance_status", "")).upper()
        if "FAIL" in stat:
            return self._build_rec(record_id, org_id, "SUPPORTS", "NOT_SUPPORTED", 0.0, "Warehouse evidence confirms defect.", "COMPLETED")
        elif "PASS" in stat:
            return self._build_rec(record_id, org_id, "CONTRADICTED", "CLAIM_APPROVED", amount, "Record proves unit was COMPLIANT.", "COMPLETED")
        return self._build_rec(record_id, org_id, "SILENT", "NOT_SUPPORTED", 0.0, "Ambiguous or partial evidence.", "COMPLETED")

# Instantiate the engine globally for the module
audit_engine = RecoveryAuditEngine(api_key=os.environ.get("GEMINI_API_KEY", ""))

def position(line: dict, request: dict) -> tuple[str, str, list[str]]:
    """(CONTRADICTS | SUPPORTS | SILENT, detail, evidence record ids)."""
    ctype = line["charge_type"]
    org_id = request["subject"]["org_id"]
    
    # Adhere to Round 3 explicit finding rules
    if ctype == "fulfilment_fee_weight_tier":
        return "SILENT", "no measured weight/dimensions upstream (finding F-07)", []
    if ctype == "lost_inbound":
        return "SILENT", "receiving shortfall is supplier-side, not channel-side loss (finding F-10)", []

    ret = previous(request, "returns")
    if ctype == "refund_issued_item_not_returned":
        # Resolution of Finding F-11:
        if ret and ret.get("status") == "completed":
            ret_verdict = ret.get("decision", {}).get("verdict", "")
            disposition = ret.get("decision", {}).get("outcome", "unknown")
            if ret_verdict == "PASS" or disposition in ("restock", "liquidate"):
                return "CONTRADICTS", f"Returns evidence ({ret['record_id']}) proves item returned with disposition '{disposition}' (finding F-11)", [ret["record_id"]]
            return "SILENT", f"Returns evidence ({ret['record_id']}) is {ret_verdict} / unverified (finding F-11)", [ret["record_id"]]
        return "SILENT", "no seller-side return record to contradict refund (finding F-11)", []

    prep = previous(request, "prep")
    rcv = previous(request, "receiving")
    if ctype == "inbound_defect_fee":
        if prep and prep.get("status") == "completed":
            stat = effective_verdict(request, prep)
            if stat == "PASS":
                return "CONTRADICTS", "Prep evidence shows the unit compliant", [prep["record_id"]]
            elif stat == "FAIL":
                return "SUPPORTS", "Prep evidence confirms defect", [prep["record_id"]]
            return "SILENT", "Prep evidence is uncertain", [prep["record_id"]]
        if rcv and rcv.get("status") == "completed":
            stat = effective_verdict(request, rcv)
            if stat == "PASS":
                return "CONTRADICTS", "Receiving evidence shows the unit compliant", [rcv["record_id"]]
            elif stat == "FAIL":
                return "SUPPORTS", "Receiving evidence confirms inbound defect", [rcv["record_id"]]
            return "SILENT", "Receiving evidence is uncertain", [rcv["record_id"]]

    # Map upstream records into our engine's standard evidence format
    evidence_records = []
    if prep and prep.get("status") == "completed":
        prep_ev = dict(prep)
        prep_ev["source_manager"] = "prep"
        prep_ev["compliance_status"] = effective_verdict(request, prep)
        evidence_records.append(prep_ev)
        
    if ret and ret.get("status") == "completed":
        ret_ev = dict(ret)
        ret_ev["source_manager"] = "returns"
        if ret.get("checks"):
            ret_ev["compliance_status"] = ret["checks"][0].get("verdict", "UNCERTAIN")
        evidence_records.append(ret_ev)

    # Trigger the Round 2 AI Engine!
    rec = audit_engine.audit_charge(org_id=org_id, fee_row=line, evidence_records=evidence_records)
    
    # Map the engine's rich assessment back into the exact Tri-State string expected by the stub
    pos = rec.outcome.get("assessment", "SILENT")
    if pos in ("DUPLICATE_CHARGE", "CONTRADICTED", "CONTRADICTS"):
        pos = "CONTRADICTS"
    elif pos in ("ALREADY_REIMBURSED", "UNCERTAIN"):
        pos = "SILENT"
        
    why = rec.outcome.get("reason", "Evaluated by AI Engine")
    ids = [ev["record_id"] for ev in evidence_records if ev.get("record_id")]
    
    return pos, why, ids


def handle(request: dict) -> dict:
    s = request["subject"]
    
    # Tenancy Guardrail
    if not sample_data.has("receiving", s["subject_id"], s["org_id"]):
        raise LookupError(f"unknown subject {s['subject_id']} in {s['org_id']}")

    lines = sample_data.fee_lines(s["subject_id"], s["org_id"])
    checks, charges, claimable = [], [], 0.0
    
    # Organizer's required strict output formatting loop
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
        request, agent_id=AGENT_ID, record_id=f"RCY-{s['subject_id']}", model=MODEL_INFO,
        captured_at=max((l["posted_date"] + "T00:00:00Z" for l in lines), default=utcnow()),
        checks=checks, outcome=outcome, verdict=verdict,
        needs_human=False,
        reason=f"Gemini Audit: {len(charges)} charge(s), {sum(c['position'] == 'CONTRADICTS' for c in charges)} contradicted",
        payload={"charges": charges, "claimable_usd": round(claimable, 2),
                 "unclaimable": [c for c in charges if c["position"] != "CONTRADICTS"]},
    )
    return build_output(record, next_step="complete")

app = make_app(STAGE, handle)
