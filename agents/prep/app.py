"""Prep Manager: agent entry point.

This adapter connects the Round 3 Orchestrator to the external Prep Manager API.
"""
import os
import requests
from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, pending_output
from shared.utils.server import make_app

STAGE = "prep"
AGENT_ID = "prep-manager"
PREP_URL = os.environ.get("PREP_API_URL", "https://cube26-prp-0211-dhanvind360.onrender.com/run")
PREP_API_KEY = os.environ.get("PREP_API_KEY", "")

def handle(request: dict) -> dict:
    s = request["subject"]
    unit_id = s["subject_id"]
    org_id = s["org_id"]
    task_id = request.get("request_id", f"task-prep-{unit_id}")

    try:
        r = sample_data.row("prep", unit_id, org_id)
        # Using the standard image naming convention
        image_refs = {
            "front": f"cube_prep_dataset/images/{unit_id}_front.jpg",
            "back": f"cube_prep_dataset/images/{unit_id}_back.jpg",
            "label": f"cube_prep_dataset/images/{unit_id}_label.jpg",
        }
        
        payload = {
            "task_id": task_id,
            "unit_id": unit_id,
            "org_id": org_id,
            "image_refs": image_refs,
            "work_order": {
                "work_order_id": r.get("work_order_id", ""),
                "fba_shipment_id": r.get("fba_shipment_id", ""),
                "sku": r.get("sku", ""),
                "asin": r.get("asin", ""),
                "fnsku": r.get("fnsku", ""),
                "wo_polybag": True if r.get("polybag_present_sealed") != "not_required" else False,
                "wo_suffocation_warning": True if r.get("suffocation_warning") != "not_required" else False,
                "wo_expiry_date": True if r.get("expiry_date") != "not_required" else False,
                "wo_handling_marks": r.get("handling_marks", ""),
                "prep_price_usd": float(r.get("prep_price_usd", 0.0))
            },
            "force_reinspect": False
        }
    except LookupError:
        # Fallback if no local sample data is found
        payload = {
            "task_id": task_id,
            "unit_id": unit_id,
            "org_id": org_id,
            "image_refs": {"front": "", "back": "", "label": ""},
            "work_order": {},
            "force_reinspect": False
        }

    headers = {
        "Content-Type": "application/json",
        "X-Org-ID": org_id,
    }
    if PREP_API_KEY:
        headers["X-API-Key"] = PREP_API_KEY
    
    try:
        resp = requests.post(PREP_URL, json=payload, headers=headers, timeout=60.0)
    except Exception as e:
        return pending_output(request, code="NETWORK_ERROR", message=str(e), retryable=True, agent_id=AGENT_ID)

    if resp.status_code != 200:
        return pending_output(request, code=f"HTTP_{resp.status_code}", message=resp.text, retryable=True, agent_id=AGENT_ID)

    try:
        data = resp.json()
    except Exception as e:
        return pending_output(request, code="INVALID_JSON", message=str(e), retryable=True, agent_id=AGENT_ID)

    checks = []
    if "checks" in data:
        for k, v in data["checks"].items():
            checks.append(check(
                check_key=k,
                verdict=v.get("verdict", "UNCERTAIN"),
                confidence=data.get("confidence", 0.96),
                detail=v.get("detail", "")
            ))

    # Fallback to current time if missing
    from shared.utils.records import utcnow
    captured_at = data.get("record", {}).get("captured_at")
    if not captured_at:
        captured_at = utcnow()

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=data.get("record", {}).get("record_id", f"PRP-{unit_id}"),
        captured_at=captured_at,
        checks=checks,
        outcome=data.get("decision", "compliant"),
        reason=data.get("explanation", ""),
        model={"name": "remote-prep-api", "version": "1.0", "calls": 1},
        payload={"prep_price_usd": payload.get("work_order", {}).get("prep_price_usd", 0.0), "measurements": None},
        latency_ms=int(data.get("latency_ms", 0))
    )

    return build_output(record)

app = make_app(STAGE, handle)
