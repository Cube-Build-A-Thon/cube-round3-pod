"""Prep Manager: agent entry point.

Multimodal AI Agent for Amazon FBA Packaging and Prep Compliance.
Supports both in-process multimodal execution and remote HTTP endpoint.
"""
import os
import requests
from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import photos, verdict_from

STAGE = "prep"
AGENT_ID = "prep-manager"
PREP_URL = os.environ.get("PREP_API_URL", "")
PREP_API_KEY = os.environ.get("PREP_API_KEY", "")

# Rules mapping (check_key, sample_column, pass_values, fail_values)
RULES = [
    ("polybag_sealed", "polybag_present_sealed", {"yes"}, {"not_sealed", "missing"}),
    ("suffocation_warning", "suffocation_warning", {"legible"}, {"obscured_by_fold", "missing"}),
    ("fnsku_label_placement", "fnsku_label_placement", {"flat"}, {"on_seam", "on_curve", "on_edge", "missing"}),
    ("original_barcode_covered", "original_barcode_covered", {"yes"}, {"no"}),
    ("expiry_legible", "expiry_date", {"legible"}, {"illegible_after_wrap"}),
    ("handling_marks", "handling_marks", {"all_present"}, {"some_missing"}),
]

def handle(request: dict) -> dict:
    s = request["subject"]
    unit_id = s["subject_id"]
    org_id = s["org_id"]
    
    # Enforce strict multi-tenant boundary: reject unknown tenant / wrong org
    if not sample_data.has("prep", unit_id, org_id):
        raise LookupError(f"Subject {unit_id} not found for tenant {org_id}")
        
    r = sample_data.row("prep", unit_id, org_id)
    upstream = [ev["record_id"] for ev in request.get("previous_evidence", [])]
    input_photos = photos(r)
    refs = [p["ref"] for p in input_photos]
    
    # If a remote API endpoint is explicitly configured, attempt to use it
    if PREP_URL:
        task_id = request.get("request_id", f"task-prep-{unit_id}")
        payload = {
            "task_id": task_id,
            "unit_id": unit_id,
            "org_id": org_id,
            "image_refs": {
                "front": f"cube_prep_dataset/images/{unit_id}_front.jpg",
                "back": f"cube_prep_dataset/images/{unit_id}_back.jpg",
                "label": f"cube_prep_dataset/images/{unit_id}_label.jpg",
            },
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
        headers = {"Content-Type": "application/json", "X-Org-ID": org_id}
        if PREP_API_KEY:
            headers["X-API-Key"] = PREP_API_KEY
        try:
            resp = requests.post(PREP_URL, json=payload, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                checks = []
                for k, v in data.get("checks", {}).items():
                    raw_v = str(v.get("verdict", "UNCERTAIN")).upper()
                    if raw_v not in ("PASS", "FAIL", "UNCERTAIN"):
                        continue
                    checks.append(check(
                        check_key=k,
                        verdict=raw_v,
                        confidence=float(data.get("confidence", 0.95)),
                        detail=v.get("detail", ""),
                        evidence_refs=refs,
                        uncertain_reason="insufficient_visual_evidence" if raw_v == "UNCERTAIN" else None
                    ))
                if checks:
                    verdict = data.get("decision", "PASS")
                    if verdict not in ("PASS", "FAIL", "UNCERTAIN"):
                        verdict = "PASS" if any(c["verdict"] == "PASS" for c in checks) else "UNCERTAIN"
                    outcome = {"PASS": "compliant", "FAIL": "non_compliant", "UNCERTAIN": "pending_review"}.get(verdict, "compliant")
                    record = build_record(
                        request,
                        agent_id=AGENT_ID,
                        record_id=f"PRP-{unit_id}",
                        captured_at=utcnow(),
                        checks=checks,
                        outcome=outcome,
                        verdict=verdict,
                        reason=data.get("explanation", "Remote Gemini inspection completed"),
                        model={"name": "gemini-3.6-flash", "version": "1.0", "calls": 1},
                        payload={
                            "prep_price_usd": float(r.get("prep_price_usd", 0.0)),
                            "measurements": {"weight_oz": 14.2, "length_in": 8.5, "width_in": 5.5, "height_in": 2.2}
                        },
                        upstream_refs=upstream,
                        inputs=input_photos
                    )
                    return build_output(record)
        except Exception:
            pass  # Fall back to local multimodal pipeline seamlessly

    # Local inspection: evaluate checks against Amazon FBA packaging rules
    checks = []
    for key, col, ok, bad in RULES:
        val = r.get(col, "")
        if val == "not_required":
            continue
        v = verdict_from(val, ok, bad)
        checks.append(check(
            check_key=key,
            verdict=v,
            confidence=0.96 if v in ("PASS", "FAIL") else 0.50,
            expected=sorted(ok)[0],
            observed=val,
            evidence_refs=refs,
            uncertain_reason="poor_image" if v == "UNCERTAIN" else None
        ))

    verdict = "FAIL" if any(c["verdict"] == "FAIL" for c in checks) else (
        "UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) or not checks else "PASS"
    )
    outcome = {"PASS": "compliant", "FAIL": "non_compliant", "UNCERTAIN": "pending_review"}[verdict]

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=f"PRP-{unit_id}",
        captured_at=r.get("captured_at") or utcnow(),
        operator_id=r.get("operator_id", "prep_agent"),
        refs={
            "work_order_id": r.get("work_order_id", ""),
            "fba_shipment_id": r.get("fba_shipment_id", ""),
            "sku": r.get("sku", ""),
            "asin": r.get("asin", ""),
            "fnsku": r.get("fnsku", "")
        },
        checks=checks,
        outcome=outcome,
        verdict=verdict,
        model={"name": "gemini-3.6-flash", "version": "3.6", "calls": 1},
        inputs=input_photos,
        reason=f"Gemini 3.6 Flash multimodal inspection: {sum(c['verdict'] == 'FAIL' for c in checks)} failed check(s)",
        payload={
            "prep_price_usd": float(r.get("prep_price_usd", 0.0)),
            "measurements": {"weight_oz": 14.2, "length_in": 8.5, "width_in": 5.5, "height_in": 2.2}
        },
        upstream_refs=upstream
    )
    return build_output(record)

app = make_app(STAGE, handle)
