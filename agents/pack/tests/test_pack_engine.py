"""Unit tests for the Pack Reconciliation Engine."""
import pytest
from agents.pack.adapter.engine import aggregate_items, parse_order_lines, reconcile_pack


def test_perfect_pack_reconciles_to_seal():
    order_lines = [{"sku": "SKU-A", "quantity": 2}, {"sku": "SKU-B", "quantity": 1}]
    extracted = {
        "observations": [
            {"sku": "SKU-A", "quantity": 2, "confidence": 0.99},
            {"sku": "SKU-B", "quantity": 1, "confidence": 0.98},
        ],
        "decoys": [],
        "occlusion": {"status": "clear", "details": "all items in full view"},
        "status": "complete",
    }
    result = reconcile_pack(order_lines, extracted)
    assert result["verdict"] == "SEAL"
    assert result["all_items_present"] is True
    assert result["quantities_correct"] is True
    assert len(result["missing_items"]) == 0
    assert len(result["unexpected_items"]) == 0


def test_missing_item_triggers_stop_and_fix():
    order_lines = [{"sku": "SKU-A", "quantity": 2}, {"sku": "SKU-B", "quantity": 1}]
    extracted = {
        "observations": [
            {"sku": "SKU-A", "quantity": 2, "confidence": 0.99},
        ],
        "decoys": [],
        "occlusion": {"status": "clear", "details": ""},
        "status": "complete",
    }
    result = reconcile_pack(order_lines, extracted)
    assert result["verdict"] == "STOP_AND_FIX"
    assert "SKU-B" in result["missing_items"]


def test_quantity_mismatch_triggers_stop_and_fix():
    order_lines = [{"sku": "SKU-A", "quantity": 2}]
    extracted = {
        "observations": [
            {"sku": "SKU-A", "quantity": 1, "confidence": 0.99},
        ],
        "decoys": [],
        "occlusion": {"status": "clear", "details": ""},
        "status": "complete",
    }
    result = reconcile_pack(order_lines, extracted)
    assert result["verdict"] == "STOP_AND_FIX"
    assert result["quantity_mismatches"][0]["expected"] == 2
    assert result["quantity_mismatches"][0]["observed"] == 1


def test_decoy_or_foreign_object_triggers_stop_and_fix():
    order_lines = [{"sku": "SKU-A", "quantity": 1}]
    extracted = {
        "observations": [
            {"sku": "SKU-A", "quantity": 1, "confidence": 0.99},
        ],
        "decoys": [
            {"label": "BOX_CUTTER", "quantity": 1, "reason": "Accidental packer tool left in box"}
        ],
        "occlusion": {"status": "clear", "details": ""},
        "status": "complete",
    }
    result = reconcile_pack(order_lines, extracted)
    assert result["verdict"] == "STOP_AND_FIX"
    assert any(u["sku"] == "BOX_CUTTER" for u in result["unexpected_items"])


def test_occlusion_triggers_uncertain_verdict():
    order_lines = [{"sku": "SKU-A", "quantity": 2}]
    extracted = {
        "observations": [
            {"sku": "SKU-A", "quantity": 1, "confidence": 0.70},
        ],
        "decoys": [],
        "occlusion": {"status": "severe", "details": "Kraft paper obstructing bottom layer"},
        "status": "uncertain",
        "reason": "Carton contents partly occluded by dunnage",
    }
    result = reconcile_pack(order_lines, extracted)
    assert result["verdict"] == "UNCERTAIN"
    assert "occluded" in result["reason"].lower() or "occlusion" in result["reason"].lower()


def test_parse_order_lines():
    text = "SKU-PUZZLE-500:1;SKU-BOTTLE-750:2"
    parsed = parse_order_lines(text)
    assert parsed == [{"sku": "SKU-PUZZLE-500", "quantity": 1}, {"sku": "SKU-BOTTLE-750", "quantity": 2}]

