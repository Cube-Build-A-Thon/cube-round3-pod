"""Automated Test Suite for Prep Manager Engineering Rules & Core Workflow."""

import sys
from pathlib import Path

# Bootstrap module path
_pkg_root = Path(__file__).resolve().parent.parent
if str(_pkg_root) not in sys.path:
    sys.path.insert(0, str(_pkg_root))

import pytest
import asyncio
from agents.prep.schemas import WorkOrder, OperatorOverride, BatchedVLMPayload
from agents.prep.service import inspect_prepped_unit
from agents.prep.repository import PrepRecordRepository
from agents.prep.tenancy import set_current_org, get_current_org, verify_tenancy_isolation, TenancySecurityError
from agents.prep.amazon_rules import aggregate_compliance
from agents.prep.fail_open import fail_open_boundary



@pytest.fixture
def repo(tmp_path):
    return PrepRecordRepository(db_path=tmp_path / "test_records.json")


def test_rule_1_tenancy_isolation(repo):
    """Engineering Rule 1: Multi-tenant RLS guarantees org_demo_alpha sees 0 rows from org_demo_bravo."""
    set_current_org("org_demo_alpha")
    rec_alpha = asyncio.run(inspect_prepped_unit(WorkOrder(unit_id="UNIT-0002", org_id="org_demo_alpha"), ["fixtures/alpha.jpg"]))
    repo.save(rec_alpha)

    set_current_org("org_demo_bravo")
    rec_bravo = asyncio.run(inspect_prepped_unit(WorkOrder(unit_id="UNIT-0003", org_id="org_demo_bravo"), ["fixtures/bravo.jpg"]))
    repo.save(rec_bravo)

    # Verify bravo sees 0 alpha records
    bravo_records = repo.list_records()
    assert len(bravo_records) == 1
    assert bravo_records[0].org_id == "org_demo_bravo"
    assert repo.get(rec_alpha.record_id) is None

    # Switch to alpha, verify alpha sees 0 bravo records
    set_current_org("org_demo_alpha")
    alpha_records = repo.list_records()
    assert len(alpha_records) == 1
    assert alpha_records[0].org_id == "org_demo_alpha"
    assert repo.get(rec_bravo.record_id) is None

    # Automated isolation test utility
    assert verify_tenancy_isolation(repo)["isolation_verified"] is True


def test_rule_3_fail_open_architecture():
    """Engineering Rule 3: Model error/timeout saves capture & yields pending_review without blocking."""
    @fail_open_boundary
    async def faulty_vision_pipeline(wo, photos, operator_id="op_test"):
        raise TimeoutError("Simulated VLM inference timeout (>800ms)")

    wo = WorkOrder(unit_id="UNIT-0099", org_id="org_demo_alpha")
    record = asyncio.run(faulty_vision_pipeline(wo, ["fixtures/timeout.jpg"]))

    assert record.overall_verdict == "pending_review"
    assert record.unit_id == "UNIT-0099"
    assert record.checks.polybag_present_sealed == "uncertain"


def test_rule_4_uncertain_is_first_class_not_fail():
    """Engineering Rule 4: Not visible != missing. Blurry photos must return UNCERTAIN, not FAIL."""
    wo = WorkOrder(unit_id="UNIT-0012", org_id="org_demo_alpha", wo_polybag=True, wo_suffocation_warning=True)
    vlm = BatchedVLMPayload(
        polybag_status="yes",
        suffocation_status="uncertain",  # e.g. glare / blur
        fnsku_status="flat",
        barcode_covered_status="yes",
        expiry_status="not_required",
        handling_status="not_required"
    )

    overall, checks, reasons = aggregate_compliance(wo, vlm)
    assert checks.suffocation_warning == "uncertain"
    assert overall == "UNCERTAIN"  # Safe uncertainty prevents false pass or false rejection


def test_rule_5_authoritative_amazon_rules_defects():
    """Engineering Rule 5: Codified Amazon rules detect defects deterministically."""
    wo = WorkOrder(unit_id="UNIT-0003", org_id="org_demo_bravo", wo_polybag=True, wo_suffocation_warning=True)
    
    # Defect: Polybag unsealed
    vlm_unsealed = BatchedVLMPayload(
        polybag_status="not_sealed",
        suffocation_status="legible",
        fnsku_status="flat",
        barcode_covered_status="yes",
        expiry_status="not_required",
        handling_status="not_required"
    )
    overall, checks, _ = aggregate_compliance(wo, vlm_unsealed)
    assert checks.polybag_present_sealed == "not_sealed"
    assert overall == "FAIL"

    # Defect: FNSKU applied over a seam
    vlm_seam = BatchedVLMPayload(
        polybag_status="yes",
        suffocation_status="legible",
        fnsku_status="on_seam",
        barcode_covered_status="yes",
        expiry_status="not_required",
        handling_status="not_required"
    )
    overall, checks, _ = aggregate_compliance(wo, vlm_seam)
    assert checks.fnsku_label_placement == "on_seam"
    assert overall == "FAIL"

    # Defect: Exposed original barcode (UPC)
    vlm_exposed = BatchedVLMPayload(
        polybag_status="yes",
        suffocation_status="legible",
        fnsku_status="flat",
        barcode_covered_status="no",
        expiry_status="not_required",
        handling_status="not_required"
    )
    overall, checks, _ = aggregate_compliance(wo, vlm_exposed)
    assert checks.original_barcode_covered == "no"
    assert overall == "FAIL"


def test_honesty_rule_operator_override(repo):
    """Honesty Rule: Overrides are recorded with original, new verdict, operator ID, and reason."""
    set_current_org("org_demo_alpha")
    record = asyncio.run(inspect_prepped_unit(
        WorkOrder(unit_id="UNIT-0004", org_id="org_demo_alpha"),
        ["fixtures/prep/seam.jpg"]
    ))
    repo.save(record)

    override = OperatorOverride(
        original_verdict=record.overall_verdict,
        new_verdict="PASS",
        operator_id="op_senior_supervisor",
        reason="Visual seam does not overlap barcode quiet zone; verified scannable with handheld."
    )
    updated = repo.record_override(record.record_id, override)

    assert updated.overall_verdict == "PASS"
    assert updated.operator_override is not None
    assert updated.operator_override.original_verdict == record.overall_verdict
    assert updated.operator_override.reason.startswith("Visual seam does not overlap")


def test_rule_2_vlm_client_remote_no_not_implemented_error():
    """Rule 2 & 3: Remote VLM providers (gemini/openai) never raise NotImplementedError and fail open."""
    from agents.prep.vlm_client import BatchedVLMClient

    wo = WorkOrder(unit_id="UNIT-0050", org_id="org_demo_alpha")

    # 1. Test Gemini provider without key (never raises NotImplementedError)
    client_gemini = BatchedVLMClient(provider="gemini")
    res_gemini = asyncio.run(client_gemini.inspect_unit(["fixtures/test.jpg"], wo))
    assert isinstance(res_gemini, BatchedVLMPayload)
    assert res_gemini.polybag_status in ["yes", "not_sealed", "missing", "uncertain", "not_required"]

    # 2. Test OpenAI provider without key (never raises NotImplementedError)
    client_openai = BatchedVLMClient(provider="openai")
    res_openai = asyncio.run(client_openai.inspect_unit(["fixtures/test.jpg"], wo))
    assert isinstance(res_openai, BatchedVLMPayload)

    # 3. Test remote failure triggers fail open boundary
    client_err = BatchedVLMClient(provider="gemini")
    async def mock_network_err(*args, **kwargs):
        raise ConnectionError("Simulated remote network partition")
    client_err._call_gemini = mock_network_err
    res_fail_open = asyncio.run(client_err._call_remote_vlm(["fixtures/test.jpg"], wo))
    assert isinstance(res_fail_open, BatchedVLMPayload)


