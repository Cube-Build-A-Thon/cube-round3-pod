"""Receiving Manager: agent entry point.

This adapter connects the Round 3 Orchestrator to the external Receiving Manager API.
"""
import os
import requests
import base64
import re
from pathlib import Path
from shared.utils import sample_data
from shared.utils.stubs import photos
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app

STAGE = "receiving"
AGENT_ID = "receiving-manager"
RECEIVING_URL = os.environ.get("RECEIVING_API_URL", "https://cube-03-receiving-manager.onrender.com/run")
RECEIVING_API_SECRET = os.environ.get("RECEIVING_API_SECRET", "dev_secret")

def load_image_base64_uri(ref: str) -> str:
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
        r = sample_data.row("receiving", unit_id, org_id)
        
        photo_refs = []
        for p in photos(r):
            photo_refs.append(load_image_base64_uri(p["ref"]))
            
        qty_ordered = int(r.get("qty_ordered", 1))
        cartons_ordered = int(r.get("cartons_ordered", 1))
        
        payload = {
            "stage": "RECEIVING",
            "poId": r.get("po_number", unit_id),
            "sku": r.get("sku", ""),
            "expectedQuantity": qty_ordered,
            "expectedCartons": cartons_ordered,
            "unitsPerCarton": qty_ordered // cartons_ordered if cartons_ordered > 0 else 1,
            "variant": r.get("variant", ""),
            "productDescription": r.get("product_title", ""),
            "images": photo_refs[:3]  # Just send a few
        }
    except LookupError:
        # Fallback if no local sample data
        r = {}
        payload = {
            "stage": "RECEIVING",
            "poId": unit_id,
            "sku": "",
            "expectedQuantity": 1,
            "expectedCartons": 1,
            "unitsPerCarton": 1,
            "images": []
        }

    headers = {
        "Content-Type": "application/json",
        "x-tenant-id": os.environ.get("RECEIVING_TENANT_ID", "dev_tenant")
    }
    if RECEIVING_API_SECRET:
        headers["Authorization"] = f"Bearer {RECEIVING_API_SECRET}"
    
    try:
        resp = requests.post(RECEIVING_URL, json=payload, headers=headers, timeout=60.0)
    except Exception as e:
        return pending_output(request, code="NETWORK_ERROR", message=str(e), retryable=True, agent_id=AGENT_ID)

    if resp.status_code != 200:
        return pending_output(request, code=f"HTTP_{resp.status_code}", message=resp.text, retryable=True, agent_id=AGENT_ID)

    try:
        data = resp.json()
    except Exception as e:
        return pending_output(request, code="INVALID_JSON", message=str(e), retryable=True, agent_id=AGENT_ID)

    checks = []
    cvmap = {"PASS": "PASS", "FAIL": "FAIL", "UNCERTAIN": "UNCERTAIN"}
    for c in data.get("checks", []):
        raw_key = c.get("name", "unknown").lower()
        safe_key = re.sub(r'[^a-z0-9_]', '_', raw_key)
        
        conf = c.get("confidence", 1.0)
        if isinstance(conf, (int, float)) and conf > 1.0:
            conf = conf / 100.0  # Normalize 0-100 to 0.0-1.0
            
        checks.append(check(
            check_key=safe_key,
            verdict=cvmap.get(c.get("verdict", "UNCERTAIN"), "UNCERTAIN"),
            confidence=conf,
            expected=c.get("expected", ""),
            observed=c.get("observed", ""),
            detail=c.get("evidence", "")
        ))

    verdict = data.get("decision", "UNCERTAIN")
    outcome = {"PASS": "accept", "FAIL": "accept_with_exceptions", "UNCERTAIN": "pending_review"}.get(verdict, "pending_review")

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=f"RCV-{unit_id}",
        captured_at=utcnow(),
        operator_id=r.get("operator_id", "system"),
        unit_scope="po_line",
        refs={"po_number": r.get("po_number", ""), "po_line": r.get("po_line", ""), "sku": r.get("sku", ""), "asin": r.get("asin", "")},
        checks=checks,
        outcome=outcome,
        verdict=cvmap.get(verdict, "UNCERTAIN"),
        model={"name": "remote-receiving", "version": "1.0", "calls": 1},
        payload=data
    )

    return build_output(record)

app = make_app(STAGE, handle)
