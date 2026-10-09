"""Returns Manager: agent entry point.

This adapter connects the Round 3 Orchestrator to the external Returns Manager API.
"""
import os
import requests
import base64
from pathlib import Path
from shared.utils import sample_data
from shared.utils.stubs import photos
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app

STAGE = "returns"
AGENT_ID = "returns-manager"
RETURNS_URL = os.environ.get("RETURNS_API_URL", "https://returns-manager-390y.onrender.com/api/v1/returns/process")

def load_image_base64_uri(ref: str) -> str:
    # Try multiple paths to find the image
    for base in [Path("data/input"), Path("data/sample")]:
        p = base / ref
        if p.exists():
            raw = p.read_bytes()
            b64 = base64.b64encode(raw).decode("ascii")
            ext = p.suffix.lower().strip(".")
            if ext == "jpg":
                ext = "jpeg"
            return f"data:image/{ext};base64,{b64}"
            
    # Dummy transparent 1x1 image if file not found locally
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="

def handle(request: dict) -> dict:
    s = request["subject"]
    unit_id = s["subject_id"]
    org_id = s["org_id"]
    
    try:
        r = sample_data.row("returns", unit_id, org_id)
        
        photo_refs = []
        for inp in request.get("inputs", []):
            if inp.get("kind") == "image":
                photo_refs.append(load_image_base64_uri(inp["ref"]))
                
        if not photo_refs:
            for p in photos(r):
                photo_refs.append(load_image_base64_uri(p["ref"]))
                
        payload = {
            "unit_id": unit_id,
            "organization_id": org_id,
            "operator_label": r.get("operator_id", "operator_jenny"),
            "order_id": r.get("order_id", ""),
            "ordered_sku": r.get("ordered_sku", ""),
            "parts_list": r.get("parts_list", ""),
            "photo_refs": photo_refs[:3],  # API specifies up to 3 images max
            "operator_observations": r.get("observed_state", "") or r.get("operator_notes", "")
        }
    except LookupError:
        # Fallback if no sample data is available
        payload = {
            "unit_id": unit_id,
            "organization_id": org_id,
            "operator_label": "unknown",
            "order_id": "",
            "ordered_sku": "",
            "parts_list": "",
            "photo_refs": [],
            "operator_observations": ""
        }

    headers = {
        "Content-Type": "application/json",
        "x-org-id": org_id
    }
    
    try:
        resp = requests.post(RETURNS_URL, json=payload, headers=headers, timeout=60.0)
    except Exception as e:
        return pending_output(request, code="NETWORK_ERROR", message=str(e), retryable=True, agent_id=AGENT_ID)

    if resp.status_code != 200:
        return pending_output(request, code=f"HTTP_{resp.status_code}", message=resp.text, retryable=True, agent_id=AGENT_ID)

    try:
        data = resp.json()
    except Exception as e:
        return pending_output(request, code="INVALID_JSON", message=str(e), retryable=True, agent_id=AGENT_ID)

    # Translate the custom Returns Manager response into standard Evidence Record
    checks = []
    for c in data.get("checks", []):
        checks.append(check(
            check_key=c.get("check_key", "unknown"),
            verdict=c.get("verdict", "UNCERTAIN"),
            confidence=c.get("confidence", 0.9),
            detail=c.get("detail", "")
        ))

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=data.get("record_id", f"RTN-{unit_id}"),
        captured_at=data.get("captured_at", utcnow()),
        checks=checks,
        outcome=data.get("outcome", "pending_review"),
        reason="Returns agent decision",
        model={"name": "remote-returns", "version": "1.0", "calls": 1},
        payload={"observed_state": payload["operator_observations"], "condition_graded": True}
    )

    # Automatically wraps it in the Agent Output envelope for the orchestrator
    return build_output(record)

app = make_app(STAGE, handle)
