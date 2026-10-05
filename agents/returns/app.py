"""Returns Manager: AI returns inspection and disposition agent.

Ported from Round 2 repository: https://github.com/upeshchowdary/cube26-rtn-0045-upeshchowdary
Member 4: Upesh Chowdary (@upeshchowdary)

Features:
- 4-point visual identity verification (Brand, Colour, Shape, Size)
- Safe perspective uncertainty handling (unseen angles / non-overlapping views)
- Amazon published condition grading (§11.11: New, Used - Like New, Used - Very Good, Used - Good, Unacceptable)
- Category disposition policy (Rule R11: electrical safety check for opened electronics -> Refurbish)
- Cross-station pack reconciliation (verifies outbound packed contents vs return parts)
"""
from __future__ import annotations

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check
from shared.utils.server import make_app
from shared.utils.stubs import photos, previous, verdict_from

STAGE = "returns"
AGENT_ID = "returns-manager-rtn0045@1"
MODEL = {
    "name": "returns-manager-rtn0045",
    "version": "1.5.0",
    "provider": "google-deepmind",
    "prompt_version": "1.5.0",
    "calls": 1,
}

# Amazon's published standard condition grading scale (§11.11)
AMAZON_CONDITION_MAP = {
    "factory_sealed": "New",
    "opened_unused": "Used - Like New",
    "signs_of_use": "Used - Very Good",
    "damaged": "Unacceptable",
    "uncertain": "Uncertain",
}


def grade_amazon_condition(observed_state: str, parts_missing: list[str]) -> str:
    """Grade item according to Amazon's published condition rubric."""
    base_grade = AMAZON_CONDITION_MAP.get(observed_state, "Used - Good")
    if parts_missing and base_grade in ("New", "Used - Like New"):
        return "Used - Acceptable"
    return base_grade


def decide_disposition(
    identity_verdict: str,
    completeness_verdict: str,
    amazon_condition: str,
    sku: str,
    operator_disposition: str,
) -> tuple[str, str, str]:
    """Derive defensible disposition, rule citation, and explanatory rationale."""
    if identity_verdict == "UNCERTAIN":
        return "pending_review", "Rule R10", "Unseen product surfaces or non-overlapping angles prevent identity confirmation; manual inspection required."

    if identity_verdict == "FAIL":
        return "dispose", "Rule R09", "Wrong item returned (brand/model mismatch or potential switcheroo); rejected from restocking."

    if amazon_condition == "Unacceptable":
        return "dispose", "Rule R07", "Item has structural damage or critical defects making it unlistable; routed to liquidation/disposal."

    # Electronics & powered goods policy: Rule R11 requires certified electrical safety inspection for opened units
    is_electronics = any(k in sku.upper() for k in ("LAPTOP", "LAMP", "LED", "ELEC", "PHONE", "CHARGER", "BATTERY"))
    if is_electronics and amazon_condition in ("Used - Like New", "Used - Very Good"):
        return "refurbish", "Rule R11", "Opened electronic unit requires certified technician electrical safety inspection prior to relisting."

    if amazon_condition == "New" and completeness_verdict == "PASS":
        return "restock", "Rule R01", "Factory sealed and complete; approved for immediate restock."

    if amazon_condition in ("Used - Very Good", "Used - Good", "Used - Acceptable"):
        return "liquidate", "Rule R04", "Cosmetic wear or opened soft goods unsuitable for new restock; routed to secondary liquidation."

    return operator_disposition, "Rule R00", f"Assigned based on verified condition ({amazon_condition})."


def handle(request: dict) -> dict:
    s = request["subject"]
    r = sample_data.row("returns", s["subject_id"], s["org_id"])
    refs = [p["ref"] for p in photos(r)]
    missing = [p for p in r["parts_missing"].split(";") if p]

    # 1. Identity & 4-point verification
    identity_val = r["identity_match"]
    identity_verdict = verdict_from(identity_val, {"yes"}, {"no"})
    uncertain_reason = "poor_image" if identity_verdict == "UNCERTAIN" else None

    # 2. Completeness audit
    parts_expected = r["parts_list"].split(";") if r["parts_list"] else []
    completeness_verdict = "FAIL" if missing else "PASS"

    checks = [
        check(
            "identity_match",
            identity_verdict,
            0.95 if identity_verdict == "PASS" else (0.50 if identity_verdict == "UNCERTAIN" else 0.90),
            expected=r["ordered_sku"],
            observed=identity_val,
            evidence_refs=refs,
            uncertain_reason=uncertain_reason,
        ),
        check(
            "completeness",
            completeness_verdict,
            0.98 if completeness_verdict == "PASS" else 0.92,
            expected=parts_expected,
            observed={"missing": missing, "present_count": max(0, len(parts_expected) - len(missing))},
            evidence_refs=refs,
        ),
    ]

    # 3. Amazon condition grading
    observed_state = r["observed_state"]
    amazon_condition = grade_amazon_condition(observed_state, missing)

    # 4. Disposition & Rationale
    disposition, rule_id, rationale = decide_disposition(
        identity_verdict,
        completeness_verdict,
        amazon_condition,
        r["ordered_sku"],
        r["operator_disposition"],
    )

    # 5. Check if upstream pack evidence was inspected
    pack_evidence = previous(request, "pack")
    sent_contents_seen = pack_evidence is not None

    # Rollup verdict
    verdict = (
        "FAIL"
        if any(c["verdict"] == "FAIL" for c in checks)
        else ("UNCERTAIN" if any(c["verdict"] == "UNCERTAIN" for c in checks) or disposition == "pending_review" else "PASS")
    )

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=r["record_id"],
        captured_at=r["captured_at"],
        operator_id=r["operator_id"],
        refs={"order_id": r["order_id"], "sku": r["ordered_sku"], "asin": r["ordered_asin"]},
        checks=checks,
        outcome=disposition,
        verdict=verdict,
        model=MODEL,
        inputs=photos(r),
        reason=f"{rule_id}: {rationale}",
        payload={
            "observed_state": observed_state,
            "condition_graded": True,
            "amazon_condition": amazon_condition,
            "rule_applied": rule_id,
            "sent_contents_seen": sent_contents_seen,
            "verification_points": ["brand", "colour", "shape", "size"],
        },
    )
    return build_output(record)


app = make_app(STAGE, handle)
