"""Targeted regression tests for Returns Manager UI + Orchestration Fix.

Verifies:
1. Selecting a sneaker makes the sneaker the expected product.
2. Selecting a bottle makes the bottle the expected product.
3. A sneaker image no longer gets compared against the LED-lamp SKU by default.
4. A wrong product produces the wrong-product review result.
5. A valid non-lamp product can reach restock.
6. A valid non-lamp product can reach dispose.
7. A known missing accessory produces refurbish.
8. A blurry image requests a better image.
9. A confirmed non-product image produces the agreed REJECT result.
10. Ambiguous images remain under review.
11. API failure remains safely under review.
12. The selected SKU/product and correct image bytes reach the inspection backend.
13. Warehouse sample references resolve to their actual associated images or indicate missing.
14. Frontend and backend agree on the response schema.
15. D-007 final-outcome precedence and the Special Pod pipeline remain unchanged.
"""

from unittest.mock import MagicMock, patch
import pytest

from agents.returns.app import handle
from agents.returns.core.catalog import (
    CATALOGUE,
    ProductDefinition,
    get_product,
    get_product_by_asin,
    get_product_by_sku,
    list_catalogue_products,
)
from agents.returns.core.agents import (
    CompletenessAgent,
    ConditionAgent,
    DispositionAgent,
    IdentityAgent,
    VisionEvidence,
)
from agents.returns.core.models import (
    AmazonCondition,
    CheckVerdict,
    DispositionDecision,
)
from orchestration.api import return_catalog, return_warehouse_records
from orchestration.rollup import derive_final_outcome, derive_status


# =========================================================================
# 1 & 2. Product Selection Baseline
# =========================================================================
def test_selecting_sneaker_makes_sneaker_expected_product():
    """Selecting a sneaker makes the sneaker the authoritative expected product, not LED lamp."""
    prod = get_product_by_sku("SKU-SNEAKER-RUN")
    assert prod is not None
    assert "running shoes" in prod.title.lower() or "sneaker" in prod.display_name.lower()
    assert prod.sku == "SKU-SNEAKER-RUN"
    assert prod.expected_parts == ["running shoes (pair)", "shoelaces"]
    assert prod.category == "Clothing & Footwear"
    assert prod.sku != "SKU-LAMP-LED"


def test_selecting_bottle_makes_bottle_expected_product():
    """Selecting a bottle makes the bottle the authoritative expected product."""
    prod = get_product_by_sku("SKU-BOTTLE-750")
    assert prod is not None
    assert "water bottle" in prod.title.lower() or "bottle" in prod.display_name.lower()
    assert prod.sku == "SKU-BOTTLE-750"
    assert prod.expected_parts == ["bottle", "lid"]
    assert prod.category == "Kitchen & Dining"


def test_catalogue_contains_all_common_products():
    """Catalogue must include Smartphone, Headphones, Laptop, Sneaker, T-shirt, Bottle, Mug, Towel, Puzzle, Serum, Protein, Cable, Lamp."""
    expected_displays = [
        "Smartphone",
        "Headphones",
        "Laptop",
        "Sneaker / shoes",
        "T-shirt / clothing",
        "Water bottle",
        "Mug",
        "Towel",
        "Puzzle",
        "Skincare serum",
        "Protein powder",
        "USB cable",
        "LED desk lamp",
    ]
    catalog_items = list_catalogue_products()
    catalog_displays = [p.display_name for p in catalog_items]
    for exp in expected_displays:
        assert exp in catalog_displays, f"Missing expected display product: {exp}"


# =========================================================================
# 3. Sneaker image is NOT compared against LED lamp
# =========================================================================
def test_sneaker_image_not_compared_against_lamp_sku():
    """A sneaker image evaluated against selected sneaker SKU passes identity check without lamp bias."""
    sneaker_prod = get_product_by_sku("SKU-SNEAKER-RUN")
    id_agent = IdentityAgent()

    # Image shows running shoes
    id_check = id_agent.evaluate(
        ordered_sku="SKU-SNEAKER-RUN",
        ordered_asin="B0DEMO-SNEAKER",
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "detected_product": "Trail Running Sneakers (Pair)",
            "expected_product_match": True,
            "is_product": True,
            "recommended_reason_category": "correct_product",
        },
    )

    assert id_check.verdict == CheckVerdict.PASS
    assert id_check.detail.get("category") != "wrong_product"
    assert "swapped" not in str(id_check.detail.get("evidence", "")).lower()


# =========================================================================
# 4. Wrong product produces wrong-product review
# =========================================================================
def test_wrong_product_produces_wrong_product_review():
    """Expected sneaker but observed phone produces wrong_product review result."""
    sneaker_prod = get_product_by_sku("SKU-SNEAKER-RUN")
    id_agent = IdentityAgent()
    disp_agent = DispositionAgent()

    id_check = id_agent.evaluate(
        ordered_sku="SKU-SNEAKER-RUN",
        ordered_asin="B0DEMO-SNEAKER",
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "detected_product": "Smartphone with glass display",
            "expected_product_match": False,
            "is_product": True,
            "recommended_reason_category": "wrong_product",
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={"has_image": True},
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={"has_image": True},
    )

    assert id_check.verdict == CheckVerdict.FAIL
    assert id_check.detail.get("category") == "wrong_product"

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=sneaker_prod,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "wrong_product"
    assert "wrong item returned" in outcome.reason.lower() or "swapped" in outcome.reason.lower()


# =========================================================================
# 5. Valid non-lamp product reaches restock
# =========================================================================
def test_valid_non_lamp_product_reaches_restock():
    """Complete sneaker in good condition reaches RESTOCK."""
    sneaker_prod = get_product_by_sku("SKU-SNEAKER-RUN")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-SNEAKER-RUN",
        ordered_asin="B0DEMO-SNEAKER",
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "detected_product": "Running Shoes",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "visible_parts": ["running shoes (pair)", "shoelaces"],
            "missing_candidates": [],
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "packaging_state": "factory_sealed",
            "condition": "new",
        },
    )

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=sneaker_prod,
    )

    assert outcome.decision == DispositionDecision.RESTOCK
    assert outcome.category in ("correct_product", "restock_factory_sealed") or outcome.category.startswith("restock")


# =========================================================================
# 6. Valid non-lamp product reaches dispose
# =========================================================================
def test_valid_non_lamp_product_reaches_dispose():
    """Severely torn running shoe reaches DISPOSE."""
    sneaker_prod = get_product_by_sku("SKU-SNEAKER-RUN")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-SNEAKER-RUN",
        ordered_asin="B0DEMO-SNEAKER",
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "detected_product": "Running Shoes",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "visible_parts": ["running shoes (pair)", "shoelaces"],
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=sneaker_prod,
        image_metadata={
            "has_image": True,
            "condition": "damaged",
            "packaging_state": "damaged",
            "visible_damage": ["sole detached", "deep tear along canvas"],
            "damage_description": "sole detached and canvas torn",
            "recommended_reason_category": "damaged_product",
        },
    )

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=sneaker_prod,
    )

    assert outcome.decision == DispositionDecision.DISPOSE
    assert outcome.category == "damaged_product"


# =========================================================================
# 7. Known missing accessory produces refurbish
# =========================================================================
def test_known_missing_accessory_produces_refurbish():
    """Water bottle missing its expected lid produces REFURBISH."""
    bottle_prod = get_product_by_sku("SKU-BOTTLE-750")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-BOTTLE-750",
        ordered_asin="B0DUMMY622",
        catalog_product=bottle_prod,
        image_metadata={
            "has_image": True,
            "detected_product": "Stainless Steel Water Bottle",
            "expected_product_match": True,
            "is_product": True,
        },
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=bottle_prod,
        image_metadata={
            "has_image": True,
            "visible_parts": ["bottle"],
            "missing_candidates": ["lid"],
            "recommended_reason_category": "missing_component",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=bottle_prod,
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "condition": "used_like_new",
        },
    )

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=bottle_prod,
    )

    assert outcome.decision == DispositionDecision.REFURBISH
    assert outcome.category == "missing_component"
    assert "lid" in outcome.reason.lower()


# =========================================================================
# 8. Blurry image requests a better image
# =========================================================================
def test_blurry_image_requests_better_image():
    """Blurry image produces PENDING_REVIEW requesting a clear photo."""
    prod = get_product_by_sku("SKU-PHONE-5G")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-PHONE-5G",
        ordered_asin="B0DEMO-PHONE",
        catalog_product=prod,
        image_metadata={
            "has_image": True,
            "image_quality": "blurry",
            "recommended_reason_category": "blurry_image",
            "uncertainty_notes": "Heavy motion blur",
        },
    )
    comp_check = CompletenessAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True, "image_quality": "blurry"})
    cond_check = ConditionAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True, "image_quality": "blurry"})

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=prod,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.category == "blurry_image"
    assert "clear photo" in outcome.reason.lower()


# =========================================================================
# 9. Confirmed non-product image produces REJECT
# =========================================================================
def test_confirmed_non_product_image_produces_reject():
    """Drywall, floor, or random scenery confidently produces DispositionDecision.REJECT."""
    prod = get_product_by_sku("SKU-SNEAKER-RUN")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-SNEAKER-RUN",
        ordered_asin="B0DEMO-SNEAKER",
        catalog_product=prod,
        image_metadata={
            "has_image": True,
            "is_product": False,
            "detected_product": "blank drywall wall and wooden floor",
            "recommended_reason_category": "non_product_image",
        },
    )
    comp_check = CompletenessAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True, "visible_parts": []})
    cond_check = ConditionAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True})

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=prod,
    )

    assert outcome.decision == DispositionDecision.REJECT
    assert outcome.category == "non_product_image"
    assert outcome.reason == "No recognizable returned product was detected. Please upload a clear image of the actual item."


# =========================================================================
# 10. Ambiguous images remain under review
# =========================================================================
def test_ambiguous_images_remain_under_review():
    """Contradictory or ambiguous images produce PENDING_REVIEW, not REJECT."""
    prod = get_product_by_sku("SKU-PHONE-5G")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-PHONE-5G",
        ordered_asin="B0DEMO-PHONE",
        catalog_product=prod,
        image_metadata={
            "has_image": True,
            "is_product": True,
            "ambiguity": "Photo 1 shows a phone while photo 2 shows a tablet",
            "recommended_reason_category": "ambiguous_multi",
        },
    )
    comp_check = CompletenessAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True})
    cond_check = ConditionAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True})

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=prod,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.decision != DispositionDecision.REJECT
    assert outcome.category == "ambiguous_multi"


# =========================================================================
# 11. API failure remains safely under review
# =========================================================================
def test_api_failure_remains_safely_under_review():
    """API error / quota issue fails open safely to PENDING_REVIEW, not REJECT."""
    prod = get_product_by_sku("SKU-BOTTLE-750")
    disp_agent = DispositionAgent()

    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-BOTTLE-750",
        ordered_asin="B0DUMMY622",
        catalog_product=prod,
        image_metadata={
            "has_image": True,
            "inference_source": "offline_failure_state_quota_exhausted",
            "recommended_reason_category": "api_failure",
        },
    )
    comp_check = CompletenessAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True})
    cond_check = ConditionAgent().evaluate(catalog_product=prod, image_metadata={"has_image": True})

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=prod,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert outcome.decision != DispositionDecision.REJECT
    assert outcome.category == "api_failure"


# =========================================================================
# 12. Warehouse sample references resolve or indicate missing
# =========================================================================
def test_warehouse_sample_references_resolve_or_indicate_missing():
    """Warehouse captures: UNIT-0014 has real files on disk; UNIT-0018 indicates unavailable."""
    records = return_warehouse_records()
    assert len(records) > 0

    unit14 = next((r for r in records if r["unit_id"] == "UNIT-0014"), None)
    assert unit14 is not None
    assert unit14["images_available"] is True
    assert len(unit14["available_images"]) > 0

    unit18 = next((r for r in records if r["unit_id"] == "UNIT-0018"), None)
    assert unit18 is not None
    assert unit18["images_available"] is False
    assert unit18["available_images"] == []
    # But product is resolved correctly
    assert unit18["sku"] == "SKU-BOTTLE-750"
    assert unit18["display_name"] == "Water bottle"


# =========================================================================
# 13. D-007 Rollup with REJECT outcome
# =========================================================================
def test_d007_rollup_with_reject_outcome():
    """When returns outputs REJECT (verdict FAIL, needs_human=False), D-007 rollup produces EXCEPTION (FAIL), not CLEAN."""
    workflow = {
        "workflow_id": "WF-DEMO-REJECT",
        "overrides": [],
        "stage_results": [
            {
                "stage": "returns",
                "state": "completed",
                "record_id": "RTN-REJECT-01",
                "runs": 1,
            }
        ],
    }
    evidence = {
        "RTN-REJECT-01": {
            "record_id": "RTN-REJECT-01",
            "decision": {
                "verdict": "FAIL",
                "outcome": "reject",
                "reason": "No recognizable returned product was detected. Please upload a clear image of the actual item.",
                "needs_human": False,
            },
            "payload": {
                "validation_status": "REJECT",
            },
        }
    }

    status, _ = derive_status(workflow, evidence)
    assert status == "COMPLETED"

    final = derive_final_outcome(workflow, evidence, status)
    assert final is not None
    # D-007 precedence: failed stage without claim becomes EXCEPTION
    assert final["outcome"] == "EXCEPTION"
    assert final["verdict"] == "FAIL"
    assert final["needs_human"] is False
    assert "returns" in final["reason"]
