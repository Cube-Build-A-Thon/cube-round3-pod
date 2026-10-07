"""Round 3 Prep Manager agent."""

from shared.utils import sample_data
from shared.utils.records import (
    build_output,
    build_record,
    check,
    utcnow,
)
from shared.utils.server import make_app

from .prep_logic import (
    build_observations_from_inputs,
    build_observations_from_sample_row,
    evaluate_observations,
    overall_verdict,
)

STAGE = "prep"
AGENT_ID = "prep-manager@1.0.0"


def handle(request: dict) -> dict:
    subject = request["subject"]

    # Refuse requests for units that do not belong to this organization.
    sample_data.row(
        "prep",
        subject["subject_id"],
        subject["org_id"],
    )

    # This agent only handles Prep requests.
    if request["stage"] != STAGE:
        raise LookupError("Request does not belong to the Prep Agent.")

    inputs = request.get("inputs", [])

    # Use supplied inputs when available.
    # Otherwise use the deterministic integration fixture.
    if inputs:
        observations = build_observations_from_inputs(inputs)
        sample_row = None
    else:
        sample_row = sample_data.row(
            "prep",
            subject["subject_id"],
            subject["org_id"],
        )
        observations = build_observations_from_sample_row(sample_row)

    # Apply deterministic Prep rules.
    checks_raw = evaluate_observations(observations)

    # Convert rule results into the shared contract format.
    checks = [
        check(
            item["check_key"],
            item["verdict"],
            item["confidence"],
            observed=item.get("observed"),
            detail=item.get("detail", ""),
            evidence_refs=item.get("evidence_refs"),
            uncertain_reason=item.get("uncertain_reason"),
        )
        for item in checks_raw
    ]

    verdict = overall_verdict(checks)

    outcome = {
        "PASS": "compliant",
        "FAIL": "non_compliant",
        "UNCERTAIN": "pending_review",
    }[verdict]

    # Same request_id must produce the same record_id.
    safe_request_id = request["request_id"].replace(":", "-")
    record_id = f"PRP-{safe_request_id}"

    # Use physical capture time when the fixture provides it.
    captured_at = (
        sample_row["captured_at"]
        if sample_row is not None
        else utcnow()
    )

    # Prep price comes from the fixture when available.
    prep_price_usd = (
        float(sample_row["prep_price_usd"])
        if sample_row is not None
        else None
    )

    # Rule source is recorded when the fixture provides it.
    rule_source = (
        {
            "url": "https://sellercentral.amazon.com/help/hub/reference/G200141480",
            "retrieved_at": sample_row["captured_at"],
        }
        if sample_row is not None
        else None
    )

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=record_id,
        captured_at=captured_at,
        operator_id=(
            sample_row["operator_id"]
            if sample_row is not None
            else None
     ),
        checks=checks,
        outcome=outcome,
        verdict=verdict,
        reason=(
            "Prep checks completed from available evidence."
            if verdict != "UNCERTAIN"
            else "Available input references do not provide sufficient "
                 "verified visual evidence for a reliable Prep judgment."
        ),
        model={
            "name": "rules",
            "version": "1.0.0",
            "provider": "local",
            "prompt_version": "none",
            "calls": 0,
            "cost_usd": 0,
        },
        inputs=inputs,
        payload={
            "prep_price_usd": prep_price_usd,
            "measurements": {
                "weight_g": None,
                "length_mm": None,
                "width_mm": None,
                "height_mm": None,
            },
            "rule_source": rule_source,
        },
        upstream_refs=[
            evidence["record_id"]
            for evidence in request.get("previous_evidence", [])
        ],
    )

    next_step = {
        "PASS": "continue",
        "FAIL": "route_to_recovery",
        "UNCERTAIN": "review",
    }[verdict]

    return build_output(
        record,
        next_step=next_step,
        reason=record["decision"]["reason"],
    )


app = make_app(STAGE, handle, version="1.0.0")