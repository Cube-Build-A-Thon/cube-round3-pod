"""Headless Agent CLI Runner (Face 3: Headless agent on fixtures)."""

import asyncio
import sys
from pathlib import Path

# Bootstrap module path
_agent_dir = Path(__file__).resolve().parent
_pkg_root = _agent_dir.parent
if str(_pkg_root) not in sys.path:
    sys.path.insert(0, str(_pkg_root))

from agents.prep.schemas import WorkOrder, OperatorOverride
from agents.prep.service import inspect_prepped_unit
from agents.prep.repository import prep_repo
from agents.prep.tenancy import set_current_org, get_current_org, verify_tenancy_isolation


async def run_sample_inspection(unit_id: str = "UNIT-0002", org_id: str = "org_demo_alpha") -> None:
    """Execute a headless inspection on a fixture unit."""
    set_current_org(org_id)
    print(f"\n======================================================================")
    print(f"> RUNNING HEADLESS PREP COMPLIANCE CHECK: {unit_id} (Tenant: {org_id})")
    print(f"======================================================================")

    # Simulated Work Order for UNIT-0002 (matches data/prep_sample.csv)
    wo = WorkOrder(
        work_order_id="WO-3000",
        unit_id=unit_id,
        org_id=org_id,
        fba_shipment_id="FBA-DUMMY-100",
        sku="SKU-CANDLE-3",
        asin="B0DUMMY964",
        fnsku="X00DUMMY002",
        prep_price_usd=0.40,
        wo_polybag=False,
        wo_suffocation_warning=False,
        wo_expiry_date=False,
        wo_handling_marks="fragile"
    )

    photo_refs = [
        f"fixtures/prep/{unit_id}_front.jpg",
        f"fixtures/prep/{unit_id}_back.jpg",
        f"fixtures/prep/{unit_id}_label.jpg"
    ]

    record = await inspect_prepped_unit(wo, photo_refs, operator_id="op_amira")

    print(f"Record ID:        {record.record_id}")
    print(f"Overall Verdict:  {record.overall_verdict}")
    print(f"Prep Fee Charged: ${record.prep_price_usd:.2f} USD")
    print("\n--- Individual Requirement Checks ---")
    print(f"1. Polybag Sealed:       {record.checks.polybag_present_sealed}")
    print(f"2. Suffocation Warning:  {record.checks.suffocation_warning}")
    print(f"3. FNSKU Placement:      {record.checks.fnsku_label_placement}")
    print(f"4. Original Barcode Cov: {record.checks.original_barcode_covered}")
    print(f"5. Expiry Date:          {record.checks.expiry_date}")
    print(f"6. Handling Marks:       {record.checks.handling_marks}")

    print("\n--- Visual Grounding Bounding Boxes ---")
    for g in record.evidence_grounding:
        print(f" * [{g.check_id:18s}] bbox={g.bbox} conf={g.confidence:.2f} | {g.observation_text}")

    print("\n[OK] Headless inspection completed and cross-pod evidence record persisted.")


def run_isolation_check() -> None:
    """Run Engineering Rule 1 Tenancy Isolation Test."""
    print("\n======================================================================")
    print("> RUNNING ENGINEERING RULE 1: TENANCY ISOLATION VERIFICATION")
    print("======================================================================")
    # Ensure both tenants have records
    set_current_org("org_demo_alpha")
    existing_alpha = prep_repo.get("PRP-0002")
    if not existing_alpha:
        asyncio.run(inspect_prepped_unit(WorkOrder(unit_id="UNIT-0002", org_id="org_demo_alpha"), ["fixtures/alpha.jpg"]))

    set_current_org("org_demo_bravo")
    asyncio.run(inspect_prepped_unit(WorkOrder(unit_id="UNIT-0003", org_id="org_demo_bravo"), ["fixtures/bravo.jpg"]))

    result = verify_tenancy_isolation(prep_repo)
    print(f"org_demo_alpha isolated from bravo: {result['alpha_isolated']}")
    print(f"org_demo_bravo isolated from alpha: {result['bravo_isolated']}")
    print(f"TENANCY ISOLATION STATUS:          {'PASSED (Zero Leakage)' if result['isolation_verified'] else 'FAILED'}")
    assert result["isolation_verified"], "Rule 1 Violation: Cross-tenant data leakage detected!"


if __name__ == "__main__":
    asyncio.run(run_sample_inspection("UNIT-0002", "org_demo_alpha"))
    run_isolation_check()
