"""Pack Manager agent for CUBE 2026 Round 3."""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

from shared.utils import sample_data
from shared.utils.records import (
    build_output,
    build_record,
    check,
    pending_output,
    utcnow,
)
from shared.utils.server import make_app

from .gemini import inspect_package, is_configured


STAGE = "pack"
AGENT_ID = "pack-manager@1"

ROOT_DIR = Path(__file__).resolve().parents[2]


CHECK_KEYS = ("items_present", "quantities_correct", "no_extra_items")


def _uncertain_output(
    request: dict,
    *,
    code: str,
    message: str,
    uncertain_reason: str,
    inputs: list | None = None,
) -> dict:
    """A *completed* record: Pack could not judge, so every check is UNCERTAIN and a person must look.

    Unlike pending_output() (status pending/error -> the orchestrator marks the stage errored and the
    workflow FAILED/INCOMPLETE), this lets the workflow finish BLOCKED/NEEDS_REVIEW. Nothing is hidden:
    the reason is in the record, and no PASS is ever invented.
    """
    safe_id = _safe_request_id(
        str(request.get("request_id") or request.get("workflow_id", "workflow"))
    )
    checks = [
        check(
            key,
            "UNCERTAIN",
            0.0,
            detail=f"{code}: {message}",
            uncertain_reason=uncertain_reason,
        )
        for key in CHECK_KEYS
    ]
    subject = request.get("subject", {})
    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=f"PCK-{safe_id}",
        captured_at=utcnow(),
        unit_scope="order",
        refs={"order_id": subject.get("subject_id")},
        checks=checks,
        outcome="pending_review",
        verdict="UNCERTAIN",
        needs_human=True,
        model={"name": "none", "version": "0", "calls": 0},
        inputs=inputs or [],
        reason=f"{code}: {message}",
    )
    return build_output(
        record,
        next_step="review",
        reason=f"{message} Manual packing inspection required.",
    )


def _safe_request_id(request_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "-", request_id)


def _input_root() -> Path:
    """Captures live under INPUT_DIR (default data/input); the orchestrator's refs are relative to it."""
    return Path(os.environ.get("INPUT_DIR", ROOT_DIR / "data" / "input")).resolve()



def _resolve_input_path(ref: str) -> Path:
    root = _input_root()
    path = (root / ref).resolve()

    try:
        path.relative_to(root)
    except ValueError:
        raise ValueError("Input path is outside the input directory.")

    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {ref}")

    return path


def _verify_input_hash(
    path: Path,
    expected_hash: str | None,
) -> None:
    if not expected_hash:
        return

    digest = hashlib.sha256(path.read_bytes()).hexdigest()

    if digest != expected_hash:
        raise ValueError(
            f"Input hash mismatch for {path.name}."
        )

def _parse_order_lines(raw: str) -> list[dict]:
    """'SKU-A:1;SKU-B:2' -> [{'sku': 'SKU-A', 'quantity': 1}, ...]"""
    items = []
    for part in str(raw or "").split(";"):
        part = part.strip()
        if not part:
            continue
        sku, _, qty = part.partition(":")
        try:
            quantity = int(qty) if qty.strip() else 1
        except ValueError:
            quantity = 1
        items.append({"sku": sku.strip(), "quantity": quantity})
    return items

def _get_order_lines(request: dict) -> list:
    context = request.get("context") or {}
    case = context.get("case") or {}

    order_lines = case.get("order_lines")
    if order_lines:
        return order_lines

    subject = request.get("subject") or {}
    order_lines = subject.get("order_lines")
    if order_lines:
        return order_lines


    for item in request.get("inputs") or []:
        if isinstance(item, dict):
            payload = item.get("payload") or item
            if isinstance(payload, dict) and payload.get("order_lines"):
                return payload["order_lines"]

    # Fall back to the order record for this unit (tenant-scoped lookup).
    try:
        row = sample_data.row("pack", subject.get("subject_id"), subject.get("org_id"))
    except LookupError:
        return []

    return _parse_order_lines(row.get("order_lines"))

    return []

def _format_expected_items(order_lines: list) -> str:
    if not order_lines:
        return "No structured order lines were provided."

    lines = []

    for item in order_lines:
        if isinstance(item, str):
            lines.append(f"- {item}")
            continue

        if isinstance(item, dict):
            quantity = item.get("quantity", 1)

            name = (
                item.get("name")
                or item.get("item_name")
                or item.get("product_name")
                or item.get("sku")
                or "unknown item"
            )

            sku = item.get("sku")

            if sku:
                lines.append(
                    f"- {quantity} x {name} ({sku})"
                )
            else:
                lines.append(
                    f"- {quantity} x {name}"
                )

    return "\n".join(lines)


def _normalise_verdict(value: str | None) -> str:
    value = str(value or "").upper().strip()

    if value in {"PASS", "FAIL", "UNCERTAIN"}:
        return value

    if value in {"OK", "CORRECT", "MATCH", "YES"}:
        return "PASS"

    if value in {
        "WRONG",
        "MISSING",
        "EXTRA",
        "INCORRECT",
        "NO",
    }:
        return "FAIL"

    return "UNCERTAIN"


_UNCERTAIN_REASONS = {
    "poor_image", "occluded", "insufficient_evidence", "model_error",
    "rule_unavailable", "conflicting_evidence", "other",
}


def _normalise_check(
    raw_check: dict,
    check_key: str,
    evidence_refs: list[str],
) -> dict:
    verdict = _normalise_verdict(
        raw_check.get("verdict")
    )

    confidence = raw_check.get("confidence")

    if confidence is not None:
        try:
            confidence = float(confidence)
            confidence = max(
                0.0,
                min(1.0, confidence),
            )
        except (TypeError, ValueError):
            confidence = None

    detail = str(
        raw_check.get("detail")
        or raw_check.get("reason")
        or raw_check.get("observation")
        or ""
    )

    return check(
        check_key,
        verdict,
        confidence,
        expected=raw_check.get("expected"),
        observed=raw_check.get("observed"),
        detail=detail,
        evidence_refs=evidence_refs,
        uncertain_reason=(
            raw_check.get("uncertain_reason")
            if raw_check.get("uncertain_reason") in _UNCERTAIN_REASONS
            else "other"
        ),
    )


def _extract_model_checks(
    result: dict,
    evidence_refs: list[str],
) -> list[dict]:
    raw_checks = result.get("checks", [])

    if isinstance(raw_checks, dict):
        raw_checks = [
            {
                "check_key": key,
                **value,
            }
            if isinstance(value, dict)
            else {
                "check_key": key,
                "verdict": value,
            }
            for key, value in raw_checks.items()
        ]

    by_key = {}

    for item in raw_checks:
        if not isinstance(item, dict):
            continue

        key = str(
            item.get("check_key", "")
        ).strip().lower()

        if key:
            by_key[key] = item

    aliases = {
        "items_present": [
            "items_present",
            "item_identification",
            "item_presence",
        ],
        "quantities_correct": [
            "quantities_correct",
            "quantity_verification",
            "quantity_check",
        ],
        "no_extra_items": [
            "no_extra_items",
            "extra_items",
            "order_matching",
            "order_match",
        ],
    }

    checks = []

    for final_key, possible_keys in aliases.items():
        raw = None

        for key in possible_keys:
            if key in by_key:
                raw = by_key[key]
                break

        if raw is None:
            raw = {
                "verdict": "UNCERTAIN",
                "detail": (
                    "Gemini did not return the required "
                    f"'{final_key}' check."
                ),
                "uncertain_reason": "model_error",
            }

        checks.append(
            _normalise_check(
                raw,
                final_key,
                evidence_refs,
            )
        )

    return checks


def _determine_outcome(
    checks: list[dict],
) -> tuple[str, str]:
    verdicts = {
        item["verdict"]
        for item in checks
    }

    if "FAIL" in verdicts:
        return "stop_and_fix", "FAIL"

    if "UNCERTAIN" in verdicts:
        return "pending_review", "UNCERTAIN"

    return "seal", "PASS"


def _verify_tenant(
    subject_id: str,
    org_id: str,
) -> None:
    """
    Verify that the requested subject actually belongs
    to the tenant making the request.

    The integration test intentionally changes org_id
    while keeping the same subject_id. We therefore
    validate the subject against the canonical sample data.
    """

    try:
        row = sample_data.row(
            "pack",
            subject_id,
            org_id,
        )
    except Exception as exc:
        raise LookupError(
            "Pack subject does not belong to this tenant."
        ) from exc

    if not row:
        raise LookupError(
            "Pack subject does not belong to this tenant."
        )

    row_org_id = row.get("org_id")

    if row_org_id and row_org_id != org_id:
        raise LookupError(
            "Pack subject does not belong to this tenant."
        )


def handle(request: dict) -> dict:

    if request.get("stage") != STAGE:
        return pending_output(
            request,
            code="wrong_stage",
            message=(
                "Pack agent received a request "
                "for another stage."
            ),
            retryable=False,
            agent_id=AGENT_ID,
        )

    subject = request.get("subject", {})

    org_id = subject.get("org_id")
    subject_id = subject.get("subject_id")

    if not org_id or not subject_id:
        return pending_output(
            request,
            code="invalid_subject",
            message="Missing org_id or subject_id.",
            retryable=False,
            agent_id=AGENT_ID,
        )

    # ---------------------------------------------------------
    # TENANT ISOLATION
    # ---------------------------------------------------------
    _verify_tenant(
        subject_id,
        org_id,
    )

    context = request.get("context", {})
    case = context.get("case", {})

    case_org_id = (
        case.get("org_id")
        or case.get("tenant_id")
    )

    if case_org_id and case_org_id != org_id:
        raise LookupError(
            "Pack request belongs to another tenant."
        )

    # ---------------------------------------------------------
    # GEMINI CONFIGURATION
    # ---------------------------------------------------------
    if not is_configured():
        return _uncertain_output(
            request,
            code="gemini_not_configured",
            message="GEMINI_API_KEY is not configured.",
            uncertain_reason="model_error",
        )

    # ---------------------------------------------------------
    # INPUTS
    # ---------------------------------------------------------
    request_inputs = request.get(
        "inputs",
        [],
    )

    if not request_inputs:
        return _uncertain_output(
            request,
            code="no_inputs",
            message=(
                "No Pack inspection "
                "images were supplied."
            ),
            uncertain_reason="insufficient_evidence",
        )

    image_paths = []
    evidence_refs = []

    try:
        for item in request_inputs:
            ref = item.get("ref")

            if not ref:
                continue

            path = _resolve_input_path(ref)

            _verify_input_hash(
                path,
                item.get("sha256"),
            )

            image_paths.append(str(path))
            evidence_refs.append(ref)

    except (
        FileNotFoundError,
        ValueError,
    ) as exc:
        return _uncertain_output(
            request,
            code="invalid_input",
            message=str(exc),
            uncertain_reason="insufficient_evidence",
        )

    if not image_paths:
        return _uncertain_output(
            request,
            code="no_valid_images",
            message=(
                "No valid Pack inspection "
                "images were found."
            ),
            uncertain_reason="insufficient_evidence",
        )

    # ---------------------------------------------------------
    # ORDER INFORMATION
    # ---------------------------------------------------------
    order_lines = _get_order_lines(request)

    expected_items = _format_expected_items(
        order_lines
    )

    # ---------------------------------------------------------
    # GEMINI INSPECTION
    # ---------------------------------------------------------
    try:
        model_result = inspect_package(
            image_paths=image_paths,
            expected_items_str=expected_items,
            order_lines_parsed=order_lines,
        )

    except Exception as exc:
        return pending_output(
            request,
            code="model_error",
            message=(
                "Pack inspection model failed: "
                f"{exc}"
            ),
            retryable=True,
            agent_id=AGENT_ID,
        )

    if not isinstance(model_result, dict):
        return pending_output(
            request,
            code="invalid_model_response",
            message=(
                "Gemini returned an invalid response."
            ),
            retryable=True,
            agent_id=AGENT_ID,
        )

    # ---------------------------------------------------------
    # CHECKS
    # ---------------------------------------------------------
    checks = _extract_model_checks(
        model_result,
        evidence_refs,
    )

    outcome, verdict = _determine_outcome(
        checks
    )

    model_version = (
        model_result.get("model_version")
        or model_result.get("model")
        or "gemini"
    )

    latency_ms = model_result.get(
        "latency_ms"
    )

    if latency_ms is not None:
        try:
            latency_ms = int(latency_ms)
        except (TypeError, ValueError):
            latency_ms = None

    # ---------------------------------------------------------
    # RECORD
    # ---------------------------------------------------------
    request_id = str(
        request.get("request_id")
        or (
            f"{request.get('workflow_id', 'workflow')}"
            f"-{subject_id}"
        )
    )

    record_id = (
        f"PCK-{_safe_request_id(request_id)}"
    )

    operator_id = (
        case.get("operator_id")
        or subject.get("operator_id")
        or None
    )

    captured_at = (
        case.get("captured_at")
        or utcnow()
    )

    confidences = [
        c["confidence"]
        for c in checks
        if c.get("confidence") is not None
    ]

    confidence = (
        min(confidences)
        if confidences
        else None
    )

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=record_id,
        captured_at=captured_at,
        operator_id=operator_id,
        unit_scope="order",
        refs={
            "order_id": (
                case.get("order_id")
                or subject.get("order_id")
                or subject_id
            )
        },
        checks=checks,
        outcome=outcome,
        verdict=verdict,
        confidence=confidence,
        needs_human=(
            verdict == "UNCERTAIN"
        ),
        model={
            "name": "gemini",
            "version": str(
                model_version
            ),
            "calls": 1,
        },
        inputs=request_inputs,
        latency_ms=latency_ms,
        reason=(
            "Pack inspection completed. "
            f"Agent decision: {outcome}."
        ),
        payload={
            "model_decision": (
                model_result.get(
                    "decision",
                    model_result.get(
                        "overall_decision"
                    ),
                )
            ),
            "model_reason": (
                model_result.get("reason")
            ),
            "expected_items": expected_items,
        },
    )

    return build_output(record)


app = make_app(
    STAGE,
    handle,
)
