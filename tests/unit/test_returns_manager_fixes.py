"""Focused tests for Returns Manager fixes observed in live UNIT-0014 run:

1. Conflicting multi-image evidence on completeness:
   Photos 1 and 2 show a cable beside the item; photo 3 contains a "USB Cable Missing" label.
   CompletenessAgent must mark UNCERTAIN with reason "conflicting_evidence" and explain the conflict
   instead of asserting the cable is missing.

2. ConditionAgent descriptive damage notes vs. affirmative damage:
   Affirmative visual damage (broken lamp head and clamp) must NOT be downgraded to UNCERTAIN
   just because descriptive/explanatory notes exist in uncertainty_notes.

3. Escalation & Orchestration human-review state:
   A pending_review returns decision or uncertain check must set needs_human=True
   and keep the workflow in the BLOCKED / human-review state rather than completing with CLAIM_RECOMMENDED.
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch
import pytest

from agents.returns.app import handle
from agents.returns.core.agents import (
    CompletenessAgent,
    ConditionAgent,
    DispositionAgent,
    IdentityAgent,
    VisionEvidence,
)
from agents.returns.core.catalog import get_product_by_sku
from agents.returns.core.models import AmazonCondition, CheckVerdict, DispositionDecision
from orchestration.orchestrator import MemoryStore, run_workflow
from orchestration.rollup import derive_final_outcome, derive_status
from shared.utils.records import build_record, check


@pytest.fixture
def lamp_product():
    return get_product_by_sku("SKU-LAMP-LED")


# ---------------------------------------------------------------------------
# Test Suite 1: Conflicting Multi-Image Evidence on Completeness
# ---------------------------------------------------------------------------
def test_completeness_agent_conflicting_cable_evidence_marks_uncertain(lamp_product):
    """When photos show cable present but label or missing candidate reports it missing,
    CompletenessAgent must mark UNCERTAIN with reason conflicting_evidence without asserting FAIL.
    """
    agent = CompletenessAgent()
    # Image metadata representing UNIT-0014:
    # Photos 1 and 2 show cable visible; photo 3 has "USB Cable Missing" label
    image_metadata = {
        "has_image": True,
        "visible_parts": ["lamp", "cable"],
        "missing_candidates": ["usb cable"],
        "packaging_state": "signs_of_use",
        "uncertainty_notes": (
            "Photos 1 and 2 show a cable beside the item; photo 3 contains a 'USB Cable Missing' label."
        ),
    }

    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata=image_metadata,
    )

    assert result.verdict == CheckVerdict.UNCERTAIN
    assert result.detail.get("reason") == "conflicting_evidence"
    assert "usb cable" in result.detail.get("conflicting_parts", []) or "cable" in [
        c.lower() for c in result.detail.get("conflicting_parts", [])
    ]
    assert "usb cable" not in result.detail.get("missing_parts", [])
    assert "Conflicting multi-image evidence" in result.detail.get("evidence", "")


def test_completeness_agent_notes_mentioning_cable_label_conflict(lamp_product):
    """When uncertainty notes explain a cross-photo discrepancy between visible cable and missing label."""
    agent = CompletenessAgent()
    image_metadata = {
        "has_image": True,
        "visible_parts": ["lamp", "desk lamp"],
        "missing_candidates": [],
        "packaging_state": "opened_unused",
        "uncertainty_notes": (
            "Photos 1 and 2 show a cable beside the item; photo 3 contains a 'USB Cable Missing' label."
        ),
    }

    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata=image_metadata,
    )

    assert result.verdict == CheckVerdict.UNCERTAIN
    assert result.detail.get("reason") == "conflicting_evidence"
    assert any("cable" in p.lower() for p in result.detail.get("conflicting_parts", []))


# ---------------------------------------------------------------------------
# Test Suite 2: Condition Damage Priority vs. Descriptive Notes
# ---------------------------------------------------------------------------
def test_condition_agent_preserves_affirmative_damage_despite_descriptive_notes(lamp_product):
    """Visual damage findings (broken lamp head and clamp) must NOT be downgraded to UNCERTAIN
    just because uncertainty_notes contains descriptive damage explanations.
    """
    agent = ConditionAgent()
    image_metadata = {
        "has_image": True,
        "packaging_state": "damaged",
        "visible_damage": ["broken lamp head and clamp"],
        "uncertainty_notes": (
            "Lamp head is fractured off articulated arm; clamp base is cracked at the mounting bracket."
        ),
    }

    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata=image_metadata,
    )

    assert result.verdict == CheckVerdict.FAIL
    assert result.detail.get("amazon_condition") == AmazonCondition.UNACCEPTABLE.value
    assert "broken lamp head and clamp" in result.detail.get("evidence", "").lower()


def test_condition_agent_damage_described_only_in_notes_still_fails(lamp_product):
    """Even if visible_damage is a general damage descriptor, damage detailed in notes classifies Unacceptable."""
    agent = ConditionAgent()
    image_metadata = {
        "has_image": True,
        "packaging_state": "signs_of_use",
        "visible_damage": [],
        "uncertainty_notes": "Broken lamp head and clamp observed in return photos.",
    }

    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata=image_metadata,
    )

    assert result.verdict == CheckVerdict.FAIL
    assert result.detail.get("amazon_condition") == AmazonCondition.UNACCEPTABLE.value


def test_condition_agent_genuine_optical_uncertainty_remains_uncertain(lamp_product):
    """When notes describe genuine optical ambiguity (glare, blur, poor lighting) with NO affirmative damage,
    ConditionAgent returns UNCERTAIN.
    """
    agent = ConditionAgent()
    image_metadata = {
        "has_image": True,
        "packaging_state": "opened_unused",
        "visible_damage": [],
        "uncertainty_notes": "Severe glare and reflections on surface prevent visual inspection.",
    }

    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata=image_metadata,
    )

    assert result.verdict == CheckVerdict.UNCERTAIN
    assert result.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value


def test_condition_agent_negated_notes_do_not_count_as_damage(lamp_product):
    """Negated notes such as 'no visible damage' must not count as positive damage evidence,
    and must not trigger FAIL.
    """
    agent = ConditionAgent()

    # Case 1: opened_unused with 'no visible damage' in uncertainty_notes
    result1 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": [],
            "uncertainty_notes": "no visible damage",
        },
    )
    assert result1.verdict == CheckVerdict.PASS
    assert result1.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # Case 2: visible_damage explicitly contains negated item 'no visible damage'
    result2 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": ["no visible damage"],
            "uncertainty_notes": "no apparent damage to the item",
        },
    )
    assert result2.verdict == CheckVerdict.PASS
    assert result2.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # Case 3: factory_sealed with 'no damage observed'
    result3 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "factory_sealed",
            "visible_damage": ["none"],
            "uncertainty_notes": "no damage observed; intact seals",
        },
    )
    assert result3.verdict == CheckVerdict.PASS
    assert result3.detail.get("amazon_condition") == AmazonCondition.NEW.value


def test_condition_agent_undamaged_unbroken_crack_free_negations(lamp_product):
    """Terms such as 'undamaged', 'unbroken', and 'crack-free' must not be classified as FAIL.
    They represent intact / negated condition.
    """
    agent = ConditionAgent()

    # 1. 'undamaged' note returns PASS / Used - Like New
    res_undamaged = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": [],
            "uncertainty_notes": "The lamp is undamaged.",
        },
    )
    assert res_undamaged.verdict == CheckVerdict.PASS
    assert res_undamaged.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # 2. 'unbroken' note returns PASS / Used - Like New
    res_unbroken = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": [],
            "uncertainty_notes": "The lamp is unbroken.",
        },
    )
    assert res_unbroken.verdict == CheckVerdict.PASS
    assert res_unbroken.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # 3. 'crack-free' note returns PASS / Used - Like New
    res_crack_free = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": [],
            "uncertainty_notes": "The lamp is crack-free.",
        },
    )
    assert res_crack_free.verdict == CheckVerdict.PASS
    assert res_crack_free.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # 4. 'crack-free' in visible_damage list returns PASS / Used - Like New
    res_crack_free_list = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": ["crack-free"],
            "uncertainty_notes": None,
        },
    )
    assert res_crack_free_list.verdict == CheckVerdict.PASS
    assert res_crack_free_list.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # 5. Damaged packaging with 'undamaged' item returns UNCERTAIN (not FAIL)
    res_damaged_pkg = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "damaged",
            "visible_damage": [],
            "uncertainty_notes": "Outer box is damaged, but the lamp is undamaged.",
        },
    )
    assert res_damaged_pkg.verdict == CheckVerdict.UNCERTAIN
    assert res_damaged_pkg.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value

    # 6. Affirmative 'broken lamp head' still returns FAIL / Unacceptable
    res_broken = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "opened_unused",
            "visible_damage": [],
            "uncertainty_notes": "Broken lamp head and clamp observed in return photos.",
        },
    )
    assert res_broken.verdict == CheckVerdict.FAIL
    assert res_broken.detail.get("amazon_condition") == AmazonCondition.UNACCEPTABLE.value


def test_condition_agent_damaged_box_alone_returns_uncertain(lamp_product):
    """A damaged box by itself must not return product FAIL;
    if the item's condition cannot be established, return UNCERTAIN.
    """
    agent = ConditionAgent()

    # Case 1: Damaged packaging with notes confirming no damage observed to item
    result1 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "damaged",
            "visible_damage": [],
            "uncertainty_notes": "Outer box crushed during transit, no visible damage to lamp.",
        },
    )
    assert result1.verdict == CheckVerdict.UNCERTAIN
    assert result1.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value
    assert "damaged" in result1.detail.get("evidence", "").lower()

    # Case 2: Damaged packaging with no notes and no visible damage
    result2 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "damaged",
            "visible_damage": [],
            "uncertainty_notes": None,
        },
    )
    assert result2.verdict == CheckVerdict.UNCERTAIN
    assert result2.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value

    # Case 3: Damaged packaging with 'no visible damage' in visible_damage list
    result3 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "damaged",
            "visible_damage": ["no visible damage"],
            "uncertainty_notes": "Outer shipping box dented",
        },
    )
    assert result3.verdict == CheckVerdict.UNCERTAIN
    assert result3.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value


def test_condition_agent_explicit_product_damage_with_damaged_box_returns_fail(lamp_product):
    """Explicit positive product damage in visible_damage should still return FAIL / Unacceptable,
    even when packaging_state is damaged.
    """
    agent = ConditionAgent()
    result = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={},
        image_metadata={
            "has_image": True,
            "packaging_state": "damaged",
            "visible_damage": ["broken lamp head and clamp"],
            "uncertainty_notes": "Packaging is torn and lamp head is cracked.",
        },
    )
    assert result.verdict == CheckVerdict.FAIL
    assert result.detail.get("amazon_condition") == AmazonCondition.UNACCEPTABLE.value
    assert "broken lamp head and clamp" in result.detail.get("evidence", "").lower()


def test_condition_agent_operator_negation_and_packaging_separation(lamp_product):
    """Operator evaluation must also not fail on negated defect text like 'no visible damage',
    and a damaged box alone without product defect must return UNCERTAIN.
    """
    agent = ConditionAgent()

    # Negated operator defect does not fail
    res1 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={"observed_state": "opened_unused", "defect_type": "no visible damage"},
        image_metadata={},
    )
    assert res1.verdict == CheckVerdict.PASS
    assert res1.detail.get("amazon_condition") == AmazonCondition.USED_LIKE_NEW.value

    # Operator damaged packaging alone returns UNCERTAIN
    res2 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={"observed_state": "damaged", "defect_type": ""},
        image_metadata={},
    )
    assert res2.verdict == CheckVerdict.UNCERTAIN
    assert res2.detail.get("amazon_condition") == AmazonCondition.UNCERTAIN.value

    # Operator affirmative damage fails
    res3 = agent.evaluate(
        catalog_product=lamp_product,
        observed_labels={"observed_state": "damaged", "defect_type": "broken clamp bracket"},
        image_metadata={},
    )
    assert res3.verdict == CheckVerdict.FAIL
    assert res3.detail.get("amazon_condition") == AmazonCondition.UNACCEPTABLE.value



# ---------------------------------------------------------------------------
# Test Suite 3: DispositionAgent Routes Conflicting Completeness to PENDING_REVIEW
# ---------------------------------------------------------------------------
def test_disposition_agent_requires_pending_review_on_uncertain_completeness(lamp_product):
    """Even if condition failed due to damage, conflicting completeness evidence requires human review."""
    disp_agent = DispositionAgent()
    id_check = IdentityAgent().evaluate(
        ordered_sku="SKU-LAMP-LED",
        ordered_asin="B0DUMMY357",
        catalog_product=lamp_product,
        image_metadata={"has_image": True, "detected_product": "Lumina LED Desk Lamp"},
    )
    comp_check = CompletenessAgent().evaluate(
        catalog_product=lamp_product,
        image_metadata={
            "has_image": True,
            "visible_parts": ["lamp", "cable"],
            "missing_candidates": ["usb cable"],
            "uncertainty_notes": "Photos 1 and 2 show a cable beside the item; photo 3 contains a 'USB Cable Missing' label.",
        },
    )
    cond_check = ConditionAgent().evaluate(
        catalog_product=lamp_product,
        image_metadata={
            "has_image": True,
            "visible_damage": ["broken lamp head and clamp"],
            "packaging_state": "damaged",
        },
    )

    outcome = disp_agent.decide(
        identity_check=id_check,
        completeness_check=comp_check,
        condition_check=cond_check,
        catalog_product=lamp_product,
    )

    assert outcome.decision == DispositionDecision.PENDING_REVIEW
    assert "completeness" in outcome.reason.lower()


# ---------------------------------------------------------------------------
# Test Suite 4: End-to-End Orchestration and Human-Review State
# ---------------------------------------------------------------------------
def test_returns_app_unit0014_run_sets_needs_human_and_blocks_orchestrator(monkeypatch, tmp_path):
    """Simulate the live UNIT-0014 run with mocked VisionAgent results matching the observed scenario.
    Verify:
    1. Returns record sets needs_human=True, verdict=UNCERTAIN, outcome=pending_review.
    2. Orchestrator keeps workflow in BLOCKED state with NEEDS_REVIEW outcome instead of completing with CLAIM_RECOMMENDED.
    """
    mock_vision = VisionEvidence(
        has_image=True,
        physical_product_detected=True,
        detected_product="Lumina LED Desk Lamp",
        detected_brand="Lumina",
        visible_parts=["lamp", "cable"],
        missing_candidates=[],
        conflicting_parts=["usb cable"],
        visible_damage=["broken lamp head and clamp"],
        packaging_state="damaged",
        uncertainty_notes="Photos 1 and 2 show a cable beside the item; photo 3 contains a 'USB Cable Missing' label.",
        confidence=0.92,
        model_used="gemini-multimodal",
        images_analyzed=["UNIT-0014_1.jpg", "UNIT-0014_2.jpg", "UNIT-0014_3.jpg"],
    )

    # Prepare input image files
    img_dir = tmp_path / "UNIT-0014" / "returns"
    img_dir.mkdir(parents=True)
    img1 = img_dir / "UNIT-0014_1.jpg"
    img2 = img_dir / "UNIT-0014_2.jpg"
    img3 = img_dir / "UNIT-0014_3.jpg"
    img1.write_bytes(b"dummy image 1")
    img2.write_bytes(b"dummy image 2")
    img3.write_bytes(b"dummy image 3")

    monkeypatch.setenv("INPUT_DIR", str(tmp_path))

    request = {
        "workflow_id": "WF-org_demo_alpha-UNIT-0014",
        "stage": "returns",
        "request_id": "REQ:returns:UNIT-0014",
        "subject": {
            "org_id": "org_demo_alpha",
            "subject_id": "UNIT-0014",
        },
        "context": {
            "sku": "SKU-LAMP-LED",
            "order_id": "ORD-DUMMY-50014",
        },
        "inputs": [
            {"ref": "UNIT-0014/returns/UNIT-0014_1.jpg", "kind": "image"},
            {"ref": "UNIT-0014/returns/UNIT-0014_2.jpg", "kind": "image"},
            {"ref": "UNIT-0014/returns/UNIT-0014_3.jpg", "kind": "image"},
        ],
    }

    with patch("agents.returns.app.get_default_vision_agent") as mock_get_va:
        va_instance = MagicMock()
        va_instance.extract_evidence.return_value = mock_vision
        va_instance.provider = "Google GenAI"
        mock_get_va.return_value = va_instance

        output = handle(request)

    ev = output["evidence"]
    decision = ev["decision"]

    # 1. Verify returns evidence record
    assert decision["outcome"] == "pending_review"
    assert decision["verdict"] == "UNCERTAIN"
    assert decision["needs_human"] is True

    checks = {c["check_key"]: c for c in ev["checks"]}
    assert checks["identity_match"]["verdict"] == "PASS"
    assert checks["completeness"]["verdict"] == "UNCERTAIN"
    assert checks["completeness"]["uncertain_reason"] == "conflicting_evidence"
    assert checks["condition"]["verdict"] == "FAIL"

    # 2. Verify orchestrator status and final outcome derivation
    # Upstream stages passed, returns is pending review / needs human, recovery contradicted fee
    workflow = {
        "workflow_id": "WF-org_demo_alpha-UNIT-0014",
        "stage_results": [
            {"stage": "receiving", "state": "completed", "runs": 1, "record_id": "RCV-0014"},
            {"stage": "prep", "state": "completed", "runs": 1, "record_id": "PRP-0014"},
            {"stage": "returns", "state": "completed", "runs": 1, "record_id": ev["record_id"]},
            {"stage": "recovery", "state": "completed", "runs": 1, "record_id": "RCY-UNIT-0014"},
        ],
        "overrides": [],
    }

    rcv_rec = build_record(
        {"workflow_id": "WF", "stage": "receiving", "subject": {"org_id": "org_demo_alpha", "subject_id": "UNIT-0014"}},
        agent_id="receiving@1", record_id="RCV-0014", captured_at="2026-06-01T00:00:00Z",
        checks=[], outcome="accept", verdict="PASS", reason="ok", model={"name": "test", "version": "1"},
    )
    prp_rec = build_record(
        {"workflow_id": "WF", "stage": "prep", "subject": {"org_id": "org_demo_alpha", "subject_id": "UNIT-0014"}},
        agent_id="prep@1", record_id="PRP-0014", captured_at="2026-06-01T00:00:00Z",
        checks=[], outcome="compliant", verdict="PASS", reason="ok", model={"name": "test", "version": "1"},
    )
    rcy_rec = build_record(
        {"workflow_id": "WF", "stage": "recovery", "subject": {"org_id": "org_demo_alpha", "subject_id": "UNIT-0014"}},
        agent_id="recovery@1", record_id="RCY-UNIT-0014", captured_at="2026-06-01T00:00:00Z",
        checks=[], outcome="claim_recommended", verdict="FAIL", reason="contradicted charge",
        model={"name": "test", "version": "1"}, needs_human=False,
        payload={"claimable_usd": 2.0},
    )

    evidence_store = {
        "RCV-0014": rcv_rec,
        "PRP-0014": prp_rec,
        ev["record_id"]: ev,
        "RCY-UNIT-0014": rcy_rec,
    }

    status, status_reason = derive_status(workflow, evidence_store)
    final_outcome = derive_final_outcome(workflow, evidence_store, status)

    # Orchestrator MUST be BLOCKED for human review, NOT completed with CLAIM_RECOMMENDED
    assert status == "BLOCKED"
    assert "returns" in status_reason.lower()
    assert final_outcome["outcome"] == "NEEDS_REVIEW"
    assert final_outcome["verdict"] == "UNCERTAIN"
    assert final_outcome["needs_human"] is True
    assert final_outcome["provisional"] is True


# ---------------------------------------------------------------------------
# Test Suite 5: Decision D-007 Exhaustive Test Matrix
# ---------------------------------------------------------------------------
def test_build_record_needs_human_inference_and_preservation():
    """Verify build_record() infers needs_human when omitted and strictly preserves explicit booleans."""
    req = {
        "workflow_id": "WF-test",
        "stage": "prep",
        "request_id": "REQ:test",
        "subject": {"org_id": "org_test", "subject_id": "UNIT-TEST"},
    }
    dummy_model = {"name": "test", "version": "1.0"}

    # 1. PASS + pending_review + omitted needs_human -> True
    r1 = build_record(
        req, agent_id="a@1", record_id="PRP-001", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="pending_review", verdict="PASS", reason="r", model=dummy_model,
        needs_human=None,
    )
    assert r1["decision"]["needs_human"] is True

    # 2. PASS + UNCERTAIN check + omitted needs_human -> True
    c_uncertain = check("label", "UNCERTAIN", 0.5, uncertain_reason="poor_image")
    r2 = build_record(
        req, agent_id="a@1", record_id="PRP-002", captured_at="2026-01-01T00:00:00Z",
        checks=[c_uncertain], outcome="compliant", verdict="PASS", reason="r", model=dummy_model,
        needs_human=None,
    )
    assert r2["decision"]["needs_human"] is True

    # 3. PASS + explicit needs_human=True -> True
    r3 = build_record(
        req, agent_id="a@1", record_id="PRP-003", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="compliant", verdict="PASS", reason="r", model=dummy_model,
        needs_human=True,
    )
    assert r3["decision"]["needs_human"] is True

    # 4. PASS + explicit needs_human=False -> False
    r4 = build_record(
        req, agent_id="a@1", record_id="PRP-004", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="compliant", verdict="PASS", reason="r", model=dummy_model,
        needs_human=False,
    )
    assert r4["decision"]["needs_human"] is False

    # 5. UNCERTAIN + explicit needs_human=False -> False (preserves explicit False even on UNCERTAIN)
    r5 = build_record(
        req, agent_id="a@1", record_id="PRP-005", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="pending_review", verdict="UNCERTAIN", reason="r", model=dummy_model,
        needs_human=False,
    )
    assert r5["decision"]["needs_human"] is False

    # 6. UNCERTAIN + omitted needs_human -> True
    r6 = build_record(
        req, agent_id="a@1", record_id="PRP-006", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="pending_review", verdict="UNCERTAIN", reason="r", model=dummy_model,
        needs_human=None,
    )
    assert r6["decision"]["needs_human"] is True


def test_derive_final_outcome_d007_precedence_matrix():
    """Verify D-007 precedence: INCOMPLETE > NEEDS_REVIEW > CLAIM_RECOMMENDED > EXCEPTION > CLEAN."""
    req = lambda stage: {
        "workflow_id": "WF-d007", "stage": stage, "request_id": f"REQ:{stage}",
        "subject": {"org_id": "org_test", "subject_id": "UNIT-TEST"},
    }
    dummy_model = {"name": "test", "version": "1.0"}

    # Base records
    rec_pass = build_record(
        req("receiving"), agent_id="rcv@1", record_id="RCV-01", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="accept", verdict="PASS", reason="ok", model=dummy_model, needs_human=False,
    )
    rec_fail = build_record(
        req("prep"), agent_id="prp@1", record_id="PRP-01", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="non_compliant", verdict="FAIL", reason="defect", model=dummy_model, needs_human=False,
    )
    rec_review = build_record(
        req("returns"), agent_id="rtn@1", record_id="RTN-01", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="pending_review", verdict="UNCERTAIN", reason="review", model=dummy_model, needs_human=True,
    )
    rec_claim = build_record(
        req("recovery"), agent_id="rcy@1", record_id="RCY-01", captured_at="2026-01-01T00:00:00Z",
        checks=[], outcome="claim_recommended", verdict="FAIL", reason="claim", model=dummy_model, needs_human=False,
        payload={"claimable_usd": 15.0},
    )

    ev_store = {
        "RCV-01": rec_pass,
        "PRP-01": rec_fail,
        "RTN-01": rec_review,
        "RCY-01": rec_claim,
    }

    # Case 1: EXCEPTION + human review -> NEEDS_REVIEW
    wf_ex_review = {
        "workflow_id": "WF-d007",
        "stage_results": [
            {"stage": "receiving", "state": "completed", "runs": 1, "record_id": "RCV-01"},
            {"stage": "prep", "state": "completed", "runs": 1, "record_id": "PRP-01"},
            {"stage": "returns", "state": "completed", "runs": 1, "record_id": "RTN-01"},
        ],
        "overrides": [],
    }
    st1, _ = derive_status(wf_ex_review, ev_store)
    out1 = derive_final_outcome(wf_ex_review, ev_store, st1)
    assert st1 == "BLOCKED"
    assert out1["outcome"] == "NEEDS_REVIEW"
    assert out1["verdict"] == "UNCERTAIN"

    # Case 2: INCOMPLETE + human review -> INCOMPLETE
    wf_inc_review = {
        "workflow_id": "WF-d007",
        "stage_results": [
            {"stage": "receiving", "state": "completed", "runs": 1, "record_id": "RCV-01"},
            {"stage": "prep", "state": "error", "runs": 1, "record_id": None},
            {"stage": "returns", "state": "completed", "runs": 1, "record_id": "RTN-01"},
        ],
        "overrides": [],
    }
    st2, _ = derive_status(wf_inc_review, ev_store)
    out2 = derive_final_outcome(wf_inc_review, ev_store, st2)
    assert st2 == "FAILED"
    assert out2["outcome"] == "INCOMPLETE"
    assert out2["verdict"] == "UNCERTAIN"

    # Case 3: INCOMPLETE + recovery claim -> INCOMPLETE
    wf_inc_claim = {
        "workflow_id": "WF-d007",
        "stage_results": [
            {"stage": "receiving", "state": "completed", "runs": 1, "record_id": "RCV-01"},
            {"stage": "prep", "state": "error", "runs": 1, "record_id": None},
            {"stage": "recovery", "state": "completed", "runs": 1, "record_id": "RCY-01"},
        ],
        "overrides": [],
    }
    st3, _ = derive_status(wf_inc_claim, ev_store)
    out3 = derive_final_outcome(wf_inc_claim, ev_store, st3)
    assert st3 == "FAILED"
    assert out3["outcome"] == "INCOMPLETE"
    assert out3["verdict"] == "UNCERTAIN"

    # Case 4: INCOMPLETE + recovery claim + human review -> INCOMPLETE
    wf_inc_claim_rev = {
        "workflow_id": "WF-d007",
        "stage_results": [
            {"stage": "receiving", "state": "pending", "runs": 0, "record_id": None},
            {"stage": "returns", "state": "completed", "runs": 1, "record_id": "RTN-01"},
            {"stage": "recovery", "state": "completed", "runs": 1, "record_id": "RCY-01"},
        ],
        "overrides": [],
    }
    st4, _ = derive_status(wf_inc_claim_rev, ev_store)
    out4 = derive_final_outcome(wf_inc_claim_rev, ev_store, st4)
    assert st4 == "BLOCKED"  # returns asks for person, so blocked
    assert out4["outcome"] == "INCOMPLETE"  # incomplete takes precedence over review and claim
    assert out4["verdict"] == "UNCERTAIN"
