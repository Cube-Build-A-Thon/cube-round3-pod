"""Recovery Manager: agent entry point.

This adapter connects the Round 3 Orchestrator to the external Recovery Manager API.
"""
import os
import requests
from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app

STAGE = "recovery"
AGENT_ID = "recovery-manager"
RECOVERY_URL = os.environ.get("RECOVERY_API_URL", "https://cube26-rcy-0066-https-github-com-saif8671.onrender.com/run")
RECOVERY_API_KEY = os.environ.get("RECOVERY_API_KEY", "")

def handle(request: dict) -> dict:
    s = request["subject"]
    unit_id = s["subject_id"]
    org_id = s["org_id"]
    
    try:
        if not sample_data.has("receiving", unit_id, org_id):
            raise LookupError(f"unknown subject {unit_id} in {org_id}")
            
        lines = sample_data.fee_lines(unit_id, org_id)
        
        # Build the charges array expected by the Recovery API
        charges = []
        for line in lines:
            charges.append({
                "charge_id": line.get("line_id", ""),
                "reason": line.get("charge_type", ""),
                "amount": float(line.get("amount_usd", 0.0)),
                "currency": "USD",
                "charge_date": line.get("posted_date", ""),
                "unit_id": unit_id,
                "shipment_id": line.get("shipment_id", "")
            })
            
    except LookupError:
        # Fallback if no local sample data
        charges = []

    # Map the orchestrator's previous_evidence into the flat structure the Recovery API expects
    previous_evidence = []
    for ev in request.get("previous_evidence", []):
        pe = {
            "record_id": ev.get("record_id", ""),
            "source_stage": ev.get("stage", ""),
            "finding": ev.get("decision", {}).get("verdict", "UNCERTAIN"),
            "unit_id": ev.get("subject", {}).get("unit_id", ev.get("subject", {}).get("subject_id", "")),
            "shipment_id": ev.get("subject", {}).get("refs", {}).get("shipment_id", ""),
            "captured_at": ev.get("captured_at", ""),
            "event_type": f"{ev.get('stage', 'unknown')}_compliance",
            "description": ev.get("decision", {}).get("reason", ""),
            "payload_dict": ev.get("payload", {})
        }
        previous_evidence.append(pe)

    payload = {
        "workflow_id": request.get("workflow_id", f"wf-recover-{unit_id}"),
        "stage": "recovery",
        "subject": {
            "org_id": org_id,
            "unit_id": unit_id,
            "shipment_id": request.get("subject", {}).get("refs", {}).get("shipment_id", ""),
            "order_id": request.get("subject", {}).get("refs", {}).get("order_id", ""),
            "sku": request.get("subject", {}).get("refs", {}).get("sku", ""),
            "fnsku": request.get("subject", {}).get("refs", {}).get("fnsku", "")
        },
        "charges": charges,
        "previous_evidence": previous_evidence
    }

    headers = {
        "Content-Type": "application/json",
        "x-org-id": org_id
    }
    if RECOVERY_API_KEY:
        headers["x-api-key"] = RECOVERY_API_KEY
    
    try:
        resp = requests.post(RECOVERY_URL, json=payload, headers=headers, timeout=60.0)
    except Exception as e:
        return pending_output(request, code="NETWORK_ERROR", message=str(e), retryable=True, agent_id=AGENT_ID)

    if resp.status_code != 200:
        return pending_output(request, code=f"HTTP_{resp.status_code}", message=resp.text, retryable=True, agent_id=AGENT_ID)

    try:
        data = resp.json()
    except Exception as e:
        return pending_output(request, code="INVALID_JSON", message=str(e), retryable=True, agent_id=AGENT_ID)

    # Translate the custom Recovery Manager response into standard Evidence Record
    checks = []
    import re
    cvmap = {"PASS": "PASS", "FAIL": "FAIL", "SILENT": "UNCERTAIN", "UNCERTAIN": "UNCERTAIN"}
    for c in data.get("checks", []):
        raw_key = c.get("check_key", "unknown").lower()
        safe_key = re.sub(r'[^a-z0-9_]', '_', raw_key)
        checks.append(check(
            check_key=safe_key,
            verdict=cvmap.get(c.get("verdict", "UNCERTAIN"), "UNCERTAIN"),
            confidence=c.get("confidence", 1.0),
            expected=c.get("expected", ""),
            observed=c.get("observed", ""),
            detail=c.get("detail", ""),
            evidence_refs=c.get("upstream_refs", [])
        ))

    vmap = {"claim_recommended": "FAIL", "no_claim": "PASS", "needs_human": "UNCERTAIN"}
    overall_verdict = vmap.get(data.get("verdict", "needs_human"), "UNCERTAIN")

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=f"RCY-{unit_id}",
        captured_at=utcnow(),
        checks=checks,
        outcome=data.get("outcome", "no_claim"),
        verdict=overall_verdict,
        needs_human=data.get("payload", {}).get("needs_human", False),
        reason=f"Recovery decision: {data.get('verdict', 'unknown')}",
        model={"name": "remote-recovery", "version": "1.0", "calls": 0},
        payload=data.get("payload", {})
    )

    return build_output(record, next_step="complete")

app = make_app(STAGE, handle)
