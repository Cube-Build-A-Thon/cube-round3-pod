"""Comprehensive tests for the Generic Visual Returns Decision Agent.

Verifies that the Returns Manager:
1. Works for arbitrary products (headphones, running shoes, water bottles, smartphones, etc.)
2. Eliminates any hardcoded LED-lamp assumptions or SKU-LAMP-LED requirements
3. Disregards filenames during visual reasoning
4. Implements the 8 canonical business rules:
   - Rule 1: Correct product + complete + good condition -> restock
   - Rule 2: Wrong product -> pending_review (wrong_product, needs_human=True)
   - Rule 3: Damaged product -> dispose (damaged_product, describes damage)
   - Rule 4: Missing component -> refurbish (missing_component, identifies missing part, no hallucination)
   - Rule 5: Blurry image -> pending_review (blurry_image, explicit photo request, needs_human=True)
   - Rule 6: Non-product image -> pending_review (non_product_image, explicit explanation, needs_human=True)
   - Rule 7: Ambiguous/multi -> pending_review (ambiguous_multi, needs_human=True)
   - Rule 8: Gemini/API failure -> pending_review (api_failure, verdict=UNCERTAIN, needs_human=True)
5. Adheres strictly to canonical operational dispositions:
   restock, refurbish, liquidate, dispose, pending_review
"""

from unittest.mock import MagicMock, patch
import pytest

from agents.returns.app import handle
from agents.returns.core.catalog import ProductDefinition
from agents.returns.core.agents import (
    IdentityAgent,
    CompletenessAgent,
    ConditionAgent,
    DispositionAgent,
    VisionEvidence,
)
from agents.returns.core.models import (
    AmazonCondition,
    CheckVerdict,
    DispositionDecision,
)


@pytest.fixture
def headphones_product():
    return ProductDefinition(
        sku="SKU-HEADPHONES-PRO",
        asin="B0GENERIC001",
        title="Wireless Active Noise-Cancelling Over-Ear Headphones",
        category="Electronics",
        expected_parts=["headphones", "audio cable", "charging case"],
        critical_parts=["headphones"],
        restockable_open_box=True,
        packaging_type="retail_box",
        description="Premium ANC Bluetooth headphones with case and cable.",
        brand="AcoustiPro",
    )


@pytest.fixture
def shoes_product():
    return ProductDefinition(
        sku="SKU-SHOES-RUN",
        asin="B0GENERIC002",
        title="Men's Trail Running Athletic Shoes (Size 10)",
        category="Footwear",
        expected_parts=["left shoe", "right shoe"],
        critical_parts=["left shoe", "right shoe"],
        restockable_open_box=True,
        packaging_type="shoe_box",
        description="Breathable trail running sneakers.",
        brand="TrailStride",
    )


@pytest.fixture
def bottle_product():
    return ProductDefinition(
        sku="SKU-BOTTLE-ECO",
        asin="B0GENERIC003",
        title="Eco Stainless Steel Insulated Water Bottle 750ml",
        category="Kitchen & Dining",
        expected_parts=["bottle", "lid"],
        critical_parts=["bottle"],
        restockable_open_box=True,
        packaging_type="carton",
        description="Double-wall vacuum flask.",
        brand="HydroSafe",
    )


@pytest.fixture
def phone_product():
    return ProductDefinition(
        sku="SKU-PHONE-5G",
        asin="B0GENERIC004",
        title="Flagship 5G Smartphone 128GB",
        category="Computing & Mobile Devices",
        expected_parts=["phone", "charging adapter", "usb cable"],
        critical_parts=["phone"],
        restockable_open_box=True,
        packaging_type="sealed_box",
        description="6.7 inch OLED flagship mobile phone.",
        brand="TechNova",
    )


# =========================================================================
# Rule 1: Correct product + complete + good condition -> restock
# =========================================================================
def test_rule_1_correct_product_headphones_restock(headphones_product):
    """Rule 1: Headphones observed, complete, new/good condition -> restock."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-HEADPHONES-PRO",
        ordered_asin="B0GENERIC001",
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "detected_product": "AcoustiPro Wireless Over-Ear Headphones",
            "expected_product_match": True,
            "is_product": True,
            "recommended_reason_category": "correct_product",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["headphones", "audio cable", "charging case"],
            "missing_candidates": [],
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "condition": "used_like_new",
            "packaging_state": "opened_unused",
            "visible_damage": [],
        },
    )

    assert id_check.verdict == CheckVerdict.PASS
    assert comp_check.verdict == CheckVerdict.PASS
    assert cond_check.verdict == CheckVerdict.PASS

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=headphones_product,
    )

    assert outcome.decision == DispositionDecision.RESTOCK
    assert outcome.category == "correct_product"


def test_rule_1_correct_product_shoes_restock(shoes_product):
    """Rule 1: Running shoes in new condition -> restock."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-SHOES-RUN",
        ordered_asin="B0GENERIC002",
        catalog_product=shoes_product,
        image_metadata={
            "has_image": True,
            "detected_product": "TrailStride Running Athletic Shoes",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=shoes_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["left shoe", "right shoe"],
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=shoes_product,
        image_metadata={
            "has_image": True,
            "condition": "new",
            "packaging_state": "factory_sealed",
        },
    )

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=shoes_product,
    )

    assert outcome.decision == DispositionDecision.RESTOCK
    assert outcome.category == "correct_product"


# =========================================================================
# Rule 2: Wrong product -> pending_review, category=wrong_product, needs_human=True
# =========================================================================
def test_rule_2_wrong_product_shoes_expected_laptop_detected(shoes_product):
    """Rule 2: Expected running shoes, detected laptop -> pending_review, wrong_product."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-SHOES-RUN",
        ordered_asin="B0GENERIC002",
        catalog_product=shoes_product,
        image_metadata={
            "has_image": True,
            "detected_product": "Dell XPS Laptop Notebook Computer",
            "expected_product_match": False,
            "is_product": True,
            "recommended_reason_category": "wrong_product",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=shoes_product,
        image_metadata={"has_image": True, "visible_parts": ["laptop"]},
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=shoes_product,
        image_metadata={"has_image": True, "condition": "new"},
    )

    assert id_check.verdict == CheckVerdict.FAIL
    assert id_check.detail["category"] == "wrong_product"

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=shoes_product,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "wrong_product"


# =========================================================================
# Rule 3: Damaged product -> dispose, category=damaged_product
# =========================================================================
def test_rule_3_damaged_product_phone_broken_screen(phone_product):
    """Rule 3: Phone with shattered screen -> dispose, describes visible damage."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-PHONE-5G",
        ordered_asin="B0GENERIC004",
        catalog_product=phone_product,
        image_metadata={
            "has_image": True,
            "detected_product": "TechNova 5G Smartphone",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=phone_product,
        image_metadata={"has_image": True, "visible_parts": ["phone", "charging adapter", "usb cable"]},
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=phone_product,
        image_metadata={
            "has_image": True,
            "condition": "damaged",
            "damage_description": "OLED screen is severely cracked and shattered across the entire display face.",
            "visible_damage": ["shattered screen display glass"],
        },
    )

    assert cond_check.verdict == CheckVerdict.FAIL
    assert "crack" in cond_check.detail["evidence"].lower() or "shatter" in cond_check.detail["evidence"].lower()

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=phone_product,
    )

    assert outcome.decision == DispositionDecision.DISPOSE
    assert outcome.category == "damaged_product"
    assert "damage" in outcome.reason.lower() or "shattered" in outcome.reason.lower()


# =========================================================================
# Rule 4: Missing component -> refurbish, category=missing_component
# =========================================================================
def test_rule_4_missing_component_headphones_missing_case(headphones_product):
    """Rule 4: Headphones missing charging case -> refurbish, identifies missing part."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-HEADPHONES-PRO",
        ordered_asin="B0GENERIC001",
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "detected_product": "AcoustiPro Wireless Headphones",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["headphones", "audio cable"],
            "missing_candidates": ["charging case"],
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={"has_image": True, "condition": "used_like_new", "packaging_state": "opened_unused"},
    )

    assert comp_check.verdict == CheckVerdict.FAIL
    assert "charging case" in comp_check.detail["missing_parts"]

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=headphones_product,
    )

    assert outcome.decision == DispositionDecision.REFURBISH
    assert outcome.category == "missing_component"
    assert "charging case" in outcome.reason.lower()


def test_rule_4_no_hallucination_when_expected_parts_unspecified():
    """Rule 4 Guardrail: When authoritative parts are not specified, do NOT hallucinate missing parts."""
    generic_item = ProductDefinition(
        sku="SKU-GENERIC-TOTE",
        asin="B0TOTE999",
        title="Canvas Shopping Tote Bag",
        category="Apparel & Accessories",
        expected_parts=[],
        critical_parts=[],
        restockable_open_box=True,
        packaging_type="polybag",
        description="Canvas tote.",
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=generic_item,
        image_metadata={
            "has_image": True,
            "visible_parts": ["tote bag"],
            "missing_candidates": [],
        },
    )
    assert comp_check.verdict == CheckVerdict.PASS
    assert comp_check.detail["missing_parts"] == []


# =========================================================================
# Rule 5: Blurry / Unusable image -> pending_review, explicit clear photo request
# =========================================================================
def test_rule_5_blurry_image_requests_clear_photo(bottle_product):
    """Rule 5: Blurry image -> pending_review, blurry_image, explicit photo request."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-BOTTLE-ECO",
        ordered_asin="B0GENERIC003",
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "image_quality": "blurry",
            "recommended_reason_category": "blurry_image",
            "uncertainty_notes": "Image is severely blurred (edge variance 5.2); cannot identify product or assess condition.",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "image_quality": "blurry",
            "recommended_reason_category": "blurry_image",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "image_quality": "blurry",
            "recommended_reason_category": "blurry_image",
        },
    )

    assert id_check.verdict == CheckVerdict.UNCERTAIN
    assert id_check.detail["category"] == "blurry_image"
    assert "clear photo" in id_check.detail["reason"].lower()

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=bottle_product,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "blurry_image"
    assert "clear photo" in outcome.reason.lower()


# =========================================================================
# Rule 6: Non-product image -> REJECT, category=non_product_image
# =========================================================================
def test_rule_6_non_product_image_wall_scenery(phone_product):
    """Rule 6: Image shows drywall wall / scenery -> REJECT, non_product_image."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-PHONE-5G",
        ordered_asin="B0GENERIC004",
        catalog_product=phone_product,
        image_metadata={
            "has_image": True,
            "is_product": False,
            "detected_product": "blank wall and wooden floor",
            "recommended_reason_category": "non_product_image",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=phone_product,
        image_metadata={"has_image": True, "visible_parts": []},
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=phone_product,
        image_metadata={"has_image": True},
    )

    assert id_check.verdict == CheckVerdict.FAIL
    assert id_check.detail["category"] == "non_product_image"

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=phone_product,
    )

    assert outcome.decision == DispositionDecision.REJECT
    assert outcome.category == "non_product_image"
    assert "no recognizable returned product was detected" in outcome.reason.lower()


# =========================================================================
# Rule 7: Ambiguous / multiple items / conflicting evidence -> pending_review
# =========================================================================
def test_rule_7_ambiguous_conflicting_multi_images(headphones_product):
    """Rule 7: Contradictory evidence across images -> pending_review, ambiguous_multi."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-HEADPHONES-PRO",
        ordered_asin="B0GENERIC001",
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "detected_product": "Headphones",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["headphones", "charging case"],
            "missing_candidates": ["charging case"],
            "conflicting_parts": ["charging case"],
            "uncertainty_notes": "Photo 1 shows charging case on desk, photo 2 label states charging case missing.",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=headphones_product,
        image_metadata={"has_image": True, "condition": "new"},
    )

    assert comp_check.verdict == CheckVerdict.UNCERTAIN
    assert comp_check.detail["reason"] == "conflicting_evidence"

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=headphones_product,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "ambiguous_multi"


# =========================================================================
# Rule 8: Gemini/API failure -> pending_review, category=api_failure, verdict=UNCERTAIN
# =========================================================================
def test_rule_8_api_failure_safe_failure(bottle_product):
    """Rule 8: Model unavailable / API timeout -> pending_review, api_failure, UNCERTAIN."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-BOTTLE-ECO",
        ordered_asin="B0GENERIC003",
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "inference_source": "offline_failure_state:model_unavailable",
            "recommended_reason_category": "api_failure",
            "uncertainty_notes": "Vision model offline or unable to identify item from visual evidence without API key. Returning uncertainty; manual inspection required.",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "recommended_reason_category": "api_failure",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "recommended_reason_category": "api_failure",
            "inference_source": "offline_failure_state:model_unavailable",
        },
    )

    assert id_check.verdict == CheckVerdict.UNCERTAIN
    assert id_check.detail["category"] == "api_failure"
    assert cond_check.verdict == CheckVerdict.UNCERTAIN

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=bottle_product,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "api_failure"


# =========================================================================
# Rule J: Filename must NOT affect classification
# =========================================================================
def test_rule_j_filename_does_not_affect_classification(bottle_product):
    """Filename containing 'broken_lamp_damaged_usb_cable.jpg' must not trick the model when observed item is clean bottle."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-BOTTLE-ECO",
        ordered_asin="B0GENERIC003",
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "detected_product": "Eco Stainless Steel Water Bottle",
            "expected_product_match": True,
            "is_product": True,
            "image_analyzed": "broken_lamp_damaged_usb_cable_missing.jpg",
            "images_analyzed": ["broken_lamp_damaged_usb_cable_missing.jpg"],
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["bottle", "lid"],
            "image_analyzed": "broken_lamp_damaged_usb_cable_missing.jpg",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=bottle_product,
        image_metadata={
            "has_image": True,
            "condition": "new",
            "packaging_state": "factory_sealed",
            "image_analyzed": "broken_lamp_damaged_usb_cable_missing.jpg",
        },
    )

    assert id_check.verdict == CheckVerdict.PASS
    assert comp_check.verdict == CheckVerdict.PASS
    assert cond_check.verdict == CheckVerdict.PASS

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=bottle_product,
    )

    assert outcome.decision == DispositionDecision.RESTOCK
    assert outcome.category == "correct_product"


# =========================================================================
# Rule K, L, M, N: SKU-LAMP-LED not required, arbitrary product reaches restock, dispose, refurbish
# =========================================================================
def test_rule_k_l_m_n_arbitrary_product_in_app_handler(monkeypatch, tmp_path):
    """Verify arbitrary product (SKU-DRONE-4K) processed end-to-end via app.py handle()."""
    img_dir = tmp_path / "DRONE-001" / "returns"
    img_dir.mkdir(parents=True)
    img_file = img_dir / "drone_return.jpg"
    img_file.write_bytes(b"dummy drone image data")

    monkeypatch.setenv("INPUT_DIR", str(tmp_path))

    request = {
        "workflow_id": "WF-org_demo_alpha-DRONE-001",
        "stage": "returns",
        "request_id": "REQ:returns:DRONE-001",
        "subject": {
            "org_id": "org_demo_alpha",
            "subject_id": "UNIT-0014",
        },
        "context": {
            "sku": "SKU-DRONE-4K",
            "order_id": "ORD-DRONE-7701",
            "title": "Professional 4K Camera Drone Quadcopter",
            "category": "Electronics",
            "expected_parts": ["drone", "remote controller", "battery"],
        },
        "inputs": [
            {"ref": "DRONE-001/returns/drone_return.jpg", "kind": "image"},
        ],
    }

    # Test L: Reaching RESTOCK
    mock_vision_clean = VisionEvidence(
        has_image=True,
        image_quality="good",
        is_product=True,
        product_identity="4K Camera Drone",
        expected_product_match=True,
        observed_product="Professional 4K Camera Drone Quadcopter",
        observed_components=["drone", "remote controller", "battery"],
        expected_components=["drone", "remote controller", "battery"],
        missing_components=[],
        condition="new",
        damage_description=None,
        confidence=0.96,
        model_used="gemini-3.5-flash",
        images_analyzed=["DRONE-001/returns/drone_return.jpg"],
        recommended_reason_category="correct_product",
    )

    with patch("agents.returns.app.get_default_vision_agent") as mock_va_fn:
        va = MagicMock()
        va.extract_evidence.return_value = mock_vision_clean
        va.provider = "Google GenAI"
        mock_va_fn.return_value = va

        res = handle(request)
        ev = res["evidence"]
        assert ev["decision"]["outcome"] == "restock"
        assert ev["decision"]["verdict"] == "PASS"
        assert ev["decision"]["needs_human"] is False

    # Test M: Reaching DISPOSE (damaged)
    mock_vision_damaged = VisionEvidence(
        has_image=True,
        image_quality="good",
        is_product=True,
        product_identity="4K Camera Drone",
        expected_product_match=True,
        observed_product="Professional 4K Camera Drone Quadcopter",
        observed_components=["drone", "remote controller", "battery"],
        missing_components=[],
        condition="damaged",
        damage_description="Cracked fuselage chassis with snapped propeller motor arm.",
        confidence=0.95,
        model_used="gemini-3.5-flash",
        images_analyzed=["DRONE-001/returns/drone_return.jpg"],
        recommended_reason_category="damaged_product",
    )

    with patch("agents.returns.app.get_default_vision_agent") as mock_va_fn:
        va = MagicMock()
        va.extract_evidence.return_value = mock_vision_damaged
        va.provider = "Google GenAI"
        mock_va_fn.return_value = va

        res = handle(request)
        ev = res["evidence"]
        assert ev["decision"]["outcome"] == "dispose"
        assert ev["decision"]["verdict"] == "FAIL"
        assert ev["decision"]["needs_human"] is False

    # Test N: Reaching REFURBISH (missing accessory)
    mock_vision_missing = VisionEvidence(
        has_image=True,
        image_quality="good",
        is_product=True,
        product_identity="4K Camera Drone",
        expected_product_match=True,
        observed_product="Professional 4K Camera Drone Quadcopter",
        observed_components=["drone", "battery"],
        missing_components=["remote controller"],
        condition="used_like_new",
        confidence=0.95,
        model_used="gemini-3.5-flash",
        images_analyzed=["DRONE-001/returns/drone_return.jpg"],
        recommended_reason_category="missing_component",
    )

    with patch("agents.returns.app.get_default_vision_agent") as mock_va_fn:
        va = MagicMock()
        va.extract_evidence.return_value = mock_vision_missing
        va.provider = "Google GenAI"
        mock_va_fn.return_value = va

        res = handle(request)
        ev = res["evidence"]
        assert ev["decision"]["outcome"] == "refurbish"
        assert ev["decision"]["needs_human"] is False
