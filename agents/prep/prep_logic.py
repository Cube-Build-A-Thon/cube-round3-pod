"""Prep compliance rules for the Round 3 Prep Agent."""

CHECK_KEYS = [
    "polybag_sealed",
    "suffocation_warning",
    "fnsku_label_placement",
    "original_barcode_covered",
    "expiry_legible",
    "handling_marks",
]

PASS_VALUES = {
    "polybag_sealed": {"yes"},
    "suffocation_warning": {"legible"},
    "fnsku_label_placement": {"flat"},
    "original_barcode_covered": {"yes"},
    "expiry_legible": {"legible"},
    "handling_marks": {"all_present"},
}

FAIL_VALUES = {
    "polybag_sealed": {"not_sealed", "missing"},
    "suffocation_warning": {"obscured_by_fold", "missing"},
    "fnsku_label_placement": {"on_seam", "on_curve", "on_edge", "missing"},
    "original_barcode_covered": {"no"},
    "expiry_legible": {"illegible_after_wrap"},
    "handling_marks": {"some_missing"},
}


def evaluate_observation(
    check_key: str,
    value: str,
    *,
    applicable: bool = True,
) -> dict | None:
    """Convert one observation into a contract-compatible check."""

    # Round 3 contract: not-required checks are omitted.
    if not applicable or value == "not_required":
        return None

    if value in PASS_VALUES.get(check_key, set()):
        verdict = "PASS"
        detail = f"Observed '{value}', which satisfies this check."
        uncertain_reason = None

    elif value in FAIL_VALUES.get(check_key, set()):
        verdict = "FAIL"
        detail = f"Observed '{value}', which does not satisfy this check."
        uncertain_reason = None

    else:
        verdict = "UNCERTAIN"
        detail = "The observation is insufficient for a reliable judgment."
        uncertain_reason = "insufficient_evidence"

    result = {
        "check_key": check_key,
        "verdict": verdict,
        "confidence": None,
        "observed": value,
        "detail": detail,
    }

    if verdict == "UNCERTAIN":
        result["uncertain_reason"] = uncertain_reason

    return result


def evaluate_observations(
    observations: list[dict],
    applicable_checks: set[str] | None = None,
) -> list[dict]:
    checks = []

    for observation in observations:
        check_key = observation["check_key"]
        value = observation.get("value", "uncertain")

        check = evaluate_observation(
            check_key,
            value,
            applicable=(
                applicable_checks is None
                or check_key in applicable_checks
            ),
        )

        if check is not None:
            if observation.get("confidence") is not None:
                check["confidence"] = observation["confidence"]

            if observation.get("evidence_refs"):
                check["evidence_refs"] = observation["evidence_refs"]

            checks.append(check)

    return checks


def overall_verdict(checks: list[dict]) -> str:
    """FAIL > UNCERTAIN > PASS. Empty checks are UNCERTAIN."""

    verdicts = {check["verdict"] for check in checks}

    if "FAIL" in verdicts:
        return "FAIL"

    if "UNCERTAIN" in verdicts or not verdicts:
        return "UNCERTAIN"

    return "PASS"

def build_observations_from_inputs(inputs: list[dict]) -> list[dict]:
    """
    Convert Round 3 input references into observations.

    The Round 3 contract gives us references/hashes, not image bytes.
    Therefore this adapter does NOT pretend to analyze image pixels.
    """
    if not inputs:
        return []

    return [
        {
            "check_key": check_key,
            "value": "uncertain",
            "confidence": None,
            "evidence_refs": [
                item["ref"]
                for item in inputs
                if item.get("ref")
            ],
        }
        for check_key in CHECK_KEYS
    ]

def build_observations_from_sample_row(row: dict) -> list[dict]:
    """Adapter for the repository's deterministic integration fixtures."""

    field_map = {
        "polybag_sealed": "polybag_present_sealed",
        "suffocation_warning": "suffocation_warning",
        "fnsku_label_placement": "fnsku_label_placement",
        "original_barcode_covered": "original_barcode_covered",
        "expiry_legible": "expiry_date",
        "handling_marks": "handling_marks",
    }

    photo_refs = [
        ref.strip()
        for ref in row.get("photo_refs", "").split(";")
        if ref.strip()
    ]

    return [
        {
            "check_key": check_key,
            "value": row[field],
            "confidence": None,
            "evidence_refs": photo_refs,
        }
        for check_key, field in field_map.items()
        if field in row
    ]
    """Adapter for the repository's deterministic integration fixtures."""

    field_map = {
        "polybag_sealed": "polybag_present_sealed",
        "suffocation_warning": "suffocation_warning",
        "fnsku_label_placement": "fnsku_label_placement",
        "original_barcode_covered": "original_barcode_covered",
        "expiry_legible": "expiry_date",
        "handling_marks": "handling_marks",
    }

    return [
        {
            "check_key": check_key,
            "value": row[field],
            "confidence": None,
            "evidence_refs": [],
        }
        for check_key, field in field_map.items()
        if field in row
    ]