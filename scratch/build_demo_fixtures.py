"""Generates demo photos and cassettes for Returns Manager demo units and tests."""
from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import os
import sys
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "agents" / "returns" / "r2" / "agent" / "src"))

from agents.returns.adapter.captures import resolve_captures
from agents.returns.adapter.orders import lookup_order
from agents.returns.adapter.runtime import LocalCaptureTransport
from returns_manager.batch.cards import build_card
from returns_manager.batch.io_csv import BeforeRow, ReturnedRow
from returns_manager.batch.parts import parse_parts_list
from returns_manager.batch.runner import _NoDbQuota, load_rubric, process_returned_row
from returns_manager.config import Settings
from returns_manager.llm.client import ModelClient, ModelRequest, ModelResponse, response_from_raw
from returns_manager.llm.replay_client import RecordingModelClient, ReplayModelClient
import httpx


def make_demo_image(text: str, color: tuple[int, int, int], size: tuple[int, int] = (640, 480)) -> bytes:
    img = Image.new("RGB", size, color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([size[0] // 4, size[1] // 4, 3 * size[0] // 4, 3 * size[1] // 4], outline=(255, 255, 255), width=3)
    draw.text((size[0] // 2 - 80, size[1] // 2 - 10), text, fill=(255, 255, 255))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


SCENARIOS = {
    # 1. UNIT-0016: Clean path (PASS, Restock)
    ("org_demo_alpha", "UNIT-0016"): {
        "sku": "SKU-TOWEL-BLU",
        "color": (20, 50, 120),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "none_visible",
        "cosmetic_grade": "used_like_new",
        "model_observed_state": "opened_unused",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
    # 2. UNIT-0021: Parts missing (FAIL completeness -> pending_review)
    ("org_demo_bravo", "UNIT-0021"): {
        "sku": "SKU-PUZZLE-500",
        "color": (120, 80, 20),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "incomplete",
        "parts_missing": ["puzzle pieces"],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "light",
        "cosmetic_grade": "used_acceptable",
        "model_observed_state": "damaged",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
    # 3. UNIT-0014: Right item returned (claim path -> PASS)
    ("org_demo_alpha", "UNIT-0014"): {
        "sku": "SKU-LAMP-LED",
        "color": (50, 100, 50),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "none_visible",
        "cosmetic_grade": "used_like_new",
        "model_observed_state": "opened_unused",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
    # 4. UNIT-0038: Wrong product returned (FAIL identity -> pending_review + claims)
    ("org_demo_alpha", "UNIT-0038"): {
        "sku": "SKU-PROT-1KG",
        "color": (130, 40, 40),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "no",
        "likely_actual_sku": "SKU-OTHER-ITEM",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "none_visible",
        "cosmetic_grade": "used_like_new",
        "model_observed_state": "opened_unused",
        "risk_flags": ["possible_product_swap"],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
    # 5. UNIT-0092: Blurry / single photo (UNCERTAIN identity)
    ("org_demo_alpha", "UNIT-0092"): {
        "sku": "SKU-SERUM-30",
        "color": (90, 70, 90),
        "photos": ["ref_1.jpg", "1.jpg"],  # single photo
        "identity_match": "uncertain",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "not_determinable",
        "cosmetic_grade": None,
        "model_observed_state": "uncertain",
        "risk_flags": [],
        "uncertainties": [{"area": "identity", "reason": "blur", "detail": "single blurry photo provided"}],
        "issues": ["blur"],
        "observations": [],
    },
    # 6. UNIT-0054: Damaged condition (visible chip/crack)
    ("org_demo_bravo", "UNIT-0054"): {
        "sku": "SKU-MUG-11",
        "color": (80, 80, 80),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "heavy",
        "cosmetic_grade": "used_acceptable",
        "model_observed_state": "damaged",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [
            {
                "defect_type": "chip",
                "severity": "severe",
                "location_note": "chipped rim and crack on mug body",
                "confidence": 0.90,
                "photo": "P1",
                "box_2d": None,
            }
        ],
    },
    # 7. UNIT-0039: Happy path case in examples/happy-path (Clean path -> Restock / CLEAN)
    ("org_demo_bravo", "UNIT-0039"): {
        "sku": "SKU-SERUM-30",
        "color": (70, 90, 70),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "factory_sealed_intact",
        "signs_of_use": "none_visible",
        "cosmetic_grade": "new",
        "model_observed_state": "opened_unused",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
    # 8. UNIT-0003: Used by test_full_workflow_over_http_matches_in_process (Clean pass)
    ("org_demo_bravo", "UNIT-0003"): {
        "sku": "SKU-PUZZLE-500",
        "color": (120, 80, 20),
        "photos": ["ref_1.jpg", "1.jpg", "2.jpg"],
        "identity_match": "yes",
        "presence_status": "product_present",
        "completeness_status": "complete",
        "parts_missing": [],
        "packaging_state": "opened_packaging_intact",
        "signs_of_use": "none_visible",
        "cosmetic_grade": "used_like_new",
        "model_observed_state": "opened_unused",
        "risk_flags": [],
        "uncertainties": [],
        "issues": ["none"],
        "observations": [],
    },
}


class MockLiveClient:
    def __init__(self, raw_resp: dict):
        self.raw_resp = raw_resp

    async def create(self, req: ModelRequest) -> ModelResponse:
        return response_from_raw(self.raw_resp, latency_ms=60)


def build_judgment_json(sc: dict, card: Any, rubric: Any, aliases: list[str]) -> dict:
    body_features = [
        f for f in card.distinguishing_features if f.location == "product_body" and f.importance == "critical"
    ]
    grade_code = sc["cosmetic_grade"]
    grade_text = ""
    if grade_code:
        for g in rubric.grades:
            if g.code == grade_code:
                grade_text = g.text
                break
        if not grade_text and rubric.grades:
            grade_text = rubric.grades[0].text

    feature_result = "match" if sc["identity_match"] == "yes" else ("mismatch" if sc["identity_match"] == "no" else "not_visible")

    photo_reports = [
        {
            "photo": p,
            "usable": True,
            "views": ["front"],
            "visible_regions": ["product_body", "accessory_area", "interior_of_packaging"],
            "issues": sc.get("issues", ["none"]),
        }
        for p in aliases
    ]

    components = []
    for comp in card.components:
        is_missing = comp.name in sc["parts_missing"]
        components.append({
            "component_id": comp.id,
            "observed_quantity": 0 if is_missing else comp.quantity,
            "visibility": "observed_present" if not is_missing else "not_visible",
            "status": "missing" if is_missing else "present",
            "photos": ["P1"] if not is_missing else [],
            "confidence": 0.95,
        })

    return {
        "schema_version": "judgment/v1",
        "photo_reports": photo_reports,
        "unit_presence": {
            "status": sc["presence_status"],
            "evidence": [{"photo": "P1", "box_2d": None, "observation": "product in package"}],
        },
        "identity": {
            "identity_match": sc["identity_match"],
            "observed_identifiers": [],
            "feature_checks": [{"feature_id": f.id, "result": feature_result, "photo": "P1"} for f in body_features],
            "risk_flags": sc["risk_flags"],
            "likely_actual_sku": sc.get("likely_actual_sku"),
            "uncertainty_reason": "blur" if sc["identity_match"] == "uncertain" else None,
            "confidence": 0.50 if sc["identity_match"] == "uncertain" else 0.95,
            "evidence": [{"photo": "P1", "box_2d": [100, 100, 600, 600], "observation": "visual comparison with catalogue card"}],
        },
        "completeness": {
            "components": components,
            "unexpected_items": [],
            "uncertainty_reason": None,
        },
        "condition": {
            "packaging_state": sc.get("packaging_state", "opened_packaging_intact"),
            "observations": sc.get("observations", []),
            "signs_of_use": sc.get("signs_of_use", "none_visible"),
            "cleanliness": "clean",
            "outer_shipping_damage_observed": False,
            "functional_check": "not_performed",
            "proposed_grade": {
                "grade_code": grade_code,
                "rubric_phrases_matched": [grade_text[:40]] if grade_text else [],
                "uncertainty_reason": "condition_ambiguous" if not grade_code else None,
                "confidence": 0.90 if grade_code else 0.50,
            },
        },
        "model_observed_state": sc["model_observed_state"],
        "retake_requests": [],
        "uncertainties": sc["uncertainties"],
        "untrusted_text_observed": [],
    }


async def generate_all():
    settings = Settings()
    input_root = REPO_ROOT / "data" / "input"
    cassettes_root = REPO_ROOT / "agents" / "returns" / "cassettes"
    r2_ref_dir = REPO_ROOT / "agents" / "returns" / "r2" / "reference"

    for (org_id, unit_id), sc in SCENARIOS.items():
        print(f"Generating fixtures for {unit_id} ({org_id})...")
        # 1. Create images
        unit_folder = input_root / unit_id / "returns"
        unit_folder.mkdir(parents=True, exist_ok=True)
        for photo_name in sc["photos"]:
            p_path = unit_folder / photo_name
            text = f"{sc['sku']} {photo_name}"
            data = make_demo_image(text, sc["color"])
            p_path.write_bytes(data)

        # 2. Look up order
        order = lookup_order(unit_id, org_id, input_dir=input_root, r2_ref_dir=r2_ref_dir)
        rubric = load_rubric(order.category)

        # 3. Resolve captures
        req = {
            "subject": {"org_id": org_id, "subject_id": unit_id},
            "inputs": [],
        }
        captures = resolve_captures(req, input_dir=input_root)

        # 4. Build card to get aliases & features
        parts = parse_parts_list(order.parts_list)
        card = build_card(org_id=org_id, sku=order.ordered_sku, asin=order.ordered_asin, category_key=order.category, parts=parts, list_price_minor=order.list_price_minor)
        aliases = [f"P{i + 1}" for i in range(len(captures.return_urls))]

        # 5. Build JudgmentV1 JSON
        j_dict = build_judgment_json(sc, card, rubric, aliases)

        raw_response = {
            "id": f"interaction-{unit_id}",
            "status": "completed",
            "steps": [
                {
                    "type": "model_output",
                    "content": [{"type": "text", "text": json.dumps(j_dict, ensure_ascii=False)}],
                }
            ],
            "usage": {
                "total_input_tokens": 1250,
                "total_output_tokens": 420,
                "total_thought_tokens": 0,
                "total_cached_tokens": 0,
                "total_tool_use_tokens": 0,
                "total_tokens": 1670,
            },
            "errors": [],
        }

        # 6. Record cassette via RecordingModelClient through process_returned_row
        cassette_dir = cassettes_root / org_id
        cassette_dir.mkdir(parents=True, exist_ok=True)
        cassette_path = cassette_dir / f"{unit_id}.jsonl"
        if cassette_path.exists():
            cassette_path.unlink()

        mock_live = MockLiveClient(raw_response)
        recording_client = RecordingModelClient(mock_live, cassette_path)
        quota = _NoDbQuota(rpm=6000.0, max_requests=10)

        before = BeforeRow(
            record_id=order.record_id,
            unit_id=order.unit_id,
            org_id=order.org_id,
            order_id=order.order_id,
            ordered_sku=order.ordered_sku,
            ordered_asin=order.ordered_asin,
            identity_match="",
            parts_list=order.parts_list,
            time="2026-06-25T07:31:00Z",
            photo_ref=captures.reference_url,
            category=order.category,
            list_price_minor=order.list_price_minor,
        )

        returned = ReturnedRow(
            record_id=order.record_id,
            unit_id=order.unit_id,
            org_id=order.org_id,
            order_id=order.order_id,
            ordered_sku=order.ordered_sku,
            ordered_asin=order.ordered_asin,
            returned_photo_refs=tuple(captures.return_urls),
            time="2026-06-25T07:31:00Z",
        )

        transport = LocalCaptureTransport(input_root)
        async with httpx.AsyncClient(transport=transport, timeout=30.0) as http_client:
            res = await process_returned_row(
                returned,
                {order.unit_id: before},
                settings=settings,
                client=recording_client,
                http_client=http_client,
                quota=quota,
                default_category=order.category,
                list_price_minor=order.list_price_minor,
            )

        print(f"Recorded cassette for {unit_id}. Note={res.note}, auto_approved={res.output_row.get('auto_approved')}")

        # 7. Verify replay immediately
        replay_client = ReplayModelClient(cassette_path)
        quota_replay = _NoDbQuota(rpm=6000.0, max_requests=10)
        async with httpx.AsyncClient(transport=transport, timeout=30.0) as http_client:
            res_replay = await process_returned_row(
                returned,
                {order.unit_id: before},
                settings=settings,
                client=replay_client,
                http_client=http_client,
                quota=quota_replay,
                default_category=order.category,
                list_price_minor=order.list_price_minor,
            )
        assert res_replay.note == res.note, f"Replay mismatch for {unit_id}"
        print(f"Replay verified successfully for {unit_id}!")

    print("All fixtures and cassettes recorded & verified successfully!")


if __name__ == "__main__":
    asyncio.run(generate_all())
