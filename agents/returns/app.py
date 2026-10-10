"""Returns Manager: agent entry point.

Adapts the Round 3 Agent Contract to the Returns Manager core agents:
- VisionAgent: extracts observable physical features and packaging state
- IdentityAgent: evaluates semantic identity against catalog product
- CompletenessAgent: verifies Bill of Materials components
- ConditionAgent: grades returned condition on Amazon's published condition scale
- DispositionAgent: policy-governed disposition decision engine
"""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from shared.utils import sample_data
from shared.utils.records import build_output, build_record, check, pending_output, utcnow
from shared.utils.server import make_app
from shared.utils.stubs import previous

from .core.agents import (
    CompletenessAgent,
    ConditionAgent,
    DispositionAgent,
    IdentityAgent,
    VisionEvidence,
    get_default_vision_agent,
)
from .core.catalog import ProductDefinition, get_product_by_asin, get_product_by_sku
from .core.models import AmazonCondition, CheckVerdict, DispositionDecision

STAGE = "returns"
AGENT_ID = "returns-manager@1.0.0"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".heic"}


def _deterministic_record_id(request_id: str) -> str:
    """Generate a collision-resistant, deterministic record ID from request_id.

    Uses an RTN prefix plus a SHA-256 digest of the full request_id string.
    Complies with schema pattern ^(RCV|PRP|PCK|RTN|RCY)-[A-Za-z0-9._-]+$.
    """
    digest = hashlib.sha256((request_id or "").encode("utf-8")).hexdigest()
    return f"RTN-{digest}"


def _is_image_input(inp: dict) -> bool:
    """Determine whether an input descriptor represents an image."""
    kind = inp.get("kind")
    if kind == "image":
        return True
    if kind and kind != "other":
        return False
    ref = inp.get("ref")
    if isinstance(ref, str):
        suffix = Path(ref).suffix.lower()
        return suffix in IMAGE_EXTENSIONS
    return False


def _resolve_return_images(
    inputs: list[dict],
) -> tuple[list[dict], list[tuple[bytes, str, str]], Optional[str]]:
    """Resolve all usable return images strictly within INPUT_DIR.

    Treats inputs[].ref as an opaque reference and verifies against directory traversal
    and symlink escapes. Does NOT search arbitrary workspace paths.

    Integrity workflow:
    1. For each image under INPUT_DIR, reads its file bytes ONCE.
    2. Computes SHA-256 digest from those exact bytes.
    3. If request.inputs[].sha256 is present, compares it to the computed hash.
       If it does not match, does NOT send that image to VisionAgent and returns
       an honest failure reason explaining that the evidence hash did not match.
    4. Packages verified bytes with MIME type and ref for direct handoff to VisionAgent.

    Returns:
        (examined_inputs, verified_images, failure_reason)
        where verified_images is a list of (image_bytes, mime_type, ref) tuples.
        If any return image is missing, unreadable, or fails hash validation,
        returns failure_reason with empty examined_inputs and verified_images so
        that unanalyzed or unverified images are never claimed as analyzed.
    """
    input_dir_env = os.environ.get("INPUT_DIR")
    if not input_dir_env:
        repo_root = Path(__file__).resolve().parents[2]
        input_dir = (repo_root / "data" / "input").resolve()
    else:
        input_dir = Path(input_dir_env).resolve()

    image_inputs = [inp for inp in inputs if isinstance(inp, dict) and _is_image_input(inp)]
    if not image_inputs:
        return [], [], "No return images supplied in request inputs; cannot verify item without visual evidence."

    if not input_dir.is_dir():
        return [], [], f"INPUT_DIR directory not found ({input_dir}); cannot access return images."

    examined_inputs: list[dict] = []
    verified_images: list[tuple[bytes, str, str]] = []

    for inp in image_inputs:
        ref = inp.get("ref")
        if not ref or not isinstance(ref, str):
            return [], [], f"Invalid image reference in inputs: {ref!r}"

        try:
            candidate = (input_dir / ref).resolve()
            # Enforce that the candidate file is strictly contained within input_dir
            candidate.relative_to(input_dir)
        except (ValueError, OSError) as exc:
            return [], [], f"Image reference '{ref}' violates path containment or security boundary ({exc})."

        if not candidate.is_file():
            return [], [], f"Return image file '{ref}' does not exist or is not a regular file in INPUT_DIR."

        # Read bytes ONCE
        try:
            file_bytes = candidate.read_bytes()
        except OSError as exc:
            return [], [], f"Return image file '{ref}' could not be read ({exc})."

        computed_sha256 = hashlib.sha256(file_bytes).hexdigest()

        # If request.inputs[].sha256 is present, compare to computed hash
        expected_sha256 = inp.get("sha256")
        if expected_sha256:
            if expected_sha256.strip().lower() != computed_sha256.lower():
                return (
                    [],
                    [],
                    f"Evidence hash mismatch for image '{ref}': expected {expected_sha256}, computed {computed_sha256}. Evidence integrity check failed.",
                )

        suffix = candidate.suffix.lower()
        if suffix == ".png":
            mime = "image/png"
        elif suffix == ".webp":
            mime = "image/webp"
        elif suffix == ".gif":
            mime = "image/gif"
        elif suffix == ".bmp":
            mime = "image/bmp"
        elif suffix == ".heic":
            mime = "image/heic"
        else:
            mime = "image/jpeg"

        # Content-addressed input compliant with evidence schema
        clean_inp = {
            "ref": ref,
            "kind": inp.get("kind") if inp.get("kind") in ("image", "video", "document", "csv_row", "record", "other") else "image",
            "sha256": computed_sha256,
        }
        examined_inputs.append(clean_inp)
        verified_images.append((file_bytes, mime, ref))

    return examined_inputs, verified_images, None


def handle(request: dict) -> dict:
    s = request["subject"]
    subject_id = s["subject_id"]
    org_id = s["org_id"]

    # Upstream evidence check: if previous evidence records are present, verify tenant consistency
    for prev_rec in request.get("previous_evidence", []):
        prev_subj = prev_rec.get("subject", {})
        if prev_subj.get("subject_id") == subject_id and prev_subj.get("org_id") != org_id:
            raise LookupError(
                f"Subject {subject_id} has upstream evidence under org {prev_subj.get('org_id')}, "
                f"conflicting with requested tenant {org_id}"
            )

    # Tenancy check: refuse if subject belongs to another tenant in sample_data
    for other_r in sample_data.rows("returns"):
        if other_r.get("unit_id") == subject_id and other_r.get("org_id") != org_id:
            raise LookupError(f"Subject {subject_id} not found under tenant {org_id}")

    context = request.get("context") or {}
    case_ctx = context.get("case", {}) if isinstance(context.get("case"), dict) else {}

    pack_ev = previous(request, "pack")
    rcv_ev = previous(request, "receiving")

    pack_refs = pack_ev.get("subject", {}).get("refs", {}) if pack_ev else {}
    rcv_refs = rcv_ev.get("subject", {}).get("refs", {}) if rcv_ev else {}

    # Extract product and order join keys from context or trusted upstream evidence only.
    # Does NOT access subject.refs (disallowed by schema) or sample_data.
    ordered_sku = (
        context.get("sku")
        or context.get("ordered_sku")
        or case_ctx.get("sku")
        or case_ctx.get("ordered_sku")
        or pack_refs.get("sku")
        or rcv_refs.get("sku")
    )
    ordered_asin = (
        context.get("asin")
        or context.get("ordered_asin")
        or case_ctx.get("asin")
        or case_ctx.get("ordered_asin")
        or pack_refs.get("asin")
        or rcv_refs.get("asin")
    )
    order_id = (
        context.get("order_id")
        or case_ctx.get("order_id")
        or pack_refs.get("order_id")
    )
    operator_id = context.get("operator_id") or request.get("operator_id")
    captured_at = context.get("captured_at") or request.get("captured_at") or utcnow()

    # Resolve product definition in catalog (with generic dynamic fallback for arbitrary merchandise)
    catalog_product = get_product_by_sku(ordered_sku) or get_product_by_asin(ordered_asin)
    if not catalog_product:
        title = (
            context.get("title")
            or context.get("product_title")
            or context.get("expected_product")
            or case_ctx.get("title")
            or case_ctx.get("product_title")
            or (ordered_sku.replace("SKU-", "").replace("-", " ").title() if ordered_sku else "General Merchandise")
        )
        expected_parts = (
            context.get("expected_parts")
            or context.get("components")
            or case_ctx.get("expected_parts")
            or []
        )
        category = (
            context.get("category")
            or case_ctx.get("category")
            or "General Merchandise"
        )
        catalog_product = ProductDefinition(
            sku=ordered_sku or "UNKNOWN-SKU",
            asin=ordered_asin or "UNKNOWN-ASIN",
            title=title,
            category=category,
            brand=context.get("brand") or "Generic",
            expected_parts=expected_parts,
            critical_parts=context.get("critical_parts") or [],
            restockable_open_box=True,
        )

    # Resolve inputs: treat inputs[].ref as opaque unless approved files exist strictly inside INPUT_DIR
    inputs = request.get("inputs") or []
    examined_inputs, verified_images, input_error = _resolve_return_images(inputs)

    # 1. Vision Agent: extract physical evidence across all resolved return images in a single call
    vision_agent = get_default_vision_agent()
    if input_error:
        # Images are missing, inaccessible, path-containment violated, or hash mismatched.
        # Report honest UNCERTAIN verdict explaining that evidence integrity check failed,
        # without sending unverified images to VisionAgent.
        vision_evidence = VisionEvidence(
            has_image=False,
            confidence=0.0,
            uncertainty_notes=input_error,
            is_fallback=True,
        )
    else:
        try:
            vision_evidence = vision_agent.extract_evidence(
                verified_images=verified_images,
                catalog_product=catalog_product,
            )
        except Exception as exc:
            return pending_output(
                request,
                code="vision_processing_error",
                message=f"Vision Agent execution failed: {exc}",
                retryable=True,
                agent_id=AGENT_ID,
            )

    vision_meta = vision_evidence.model_dump()

    # Observed labels: only from documented context hints; never from synthetic CSV operator labels
    observed_labels: Dict[str, Any] = {}
    if "observed_labels" in context and isinstance(context["observed_labels"], dict) and not input_error:
        observed_labels = context["observed_labels"]

    # 2. Core Evaluation Agents: Identity, Completeness, Condition, Disposition
    try:
        identity_agent = IdentityAgent()
        identity_result = identity_agent.evaluate(
            ordered_sku=ordered_sku or "",
            ordered_asin=ordered_asin or "",
            catalog_product=catalog_product,
            observed_labels=observed_labels,
            image_metadata=vision_meta,
        )

        completeness_agent = CompletenessAgent()
        completeness_result = completeness_agent.evaluate(
            catalog_product=catalog_product,
            observed_labels=observed_labels,
            image_metadata=vision_meta,
        )

        condition_agent = ConditionAgent()
        condition_result = condition_agent.evaluate(
            catalog_product=catalog_product,
            observed_labels=observed_labels,
            image_metadata=vision_meta,
        )

        disposition_agent = DispositionAgent(agent_name=AGENT_ID)
        disposition_outcome = disposition_agent.decide(
            identity_check=identity_result,
            completeness_check=completeness_result,
            condition_check=condition_result,
            catalog_product=catalog_product,
            vision_evidence=vision_evidence,
        )
    except Exception as exc:
        return pending_output(
            request,
            code="evaluation_error",
            message=f"Returns evaluation failed: {exc}",
            retryable=True,
            agent_id=AGENT_ID,
        )

    if input_error:
        # Return an honest UNCERTAIN result across all checks when evidence integrity fails
        id_verdict = CheckVerdict.UNCERTAIN.value
        id_detail_str = input_error
        id_uncertain_reason = "insufficient_evidence"
        id_expected = ordered_sku if ordered_sku else None
        id_observed = None
        id_confidence = 0.0

        comp_verdict = CheckVerdict.UNCERTAIN.value
        comp_detail_str = input_error
        comp_uncertain_reason = "insufficient_evidence"
        comp_expected = catalog_product.expected_parts if catalog_product else None
        comp_observed = None
        comp_confidence = 0.0

        cond_verdict = CheckVerdict.UNCERTAIN.value
        cond_detail_str = input_error
        cond_uncertain_reason = "insufficient_evidence"
        cond_expected = "New"
        cond_observed = None
        cond_confidence = 0.0

        outcome_str = DispositionDecision.PENDING_REVIEW.value
        outcome_reason = f"Evidence integrity check failed: {input_error}. Manual inspection required."
        verdict = CheckVerdict.UNCERTAIN.value
        needs_human = True
        evidence_refs = None
        record_inputs = []
        comp_missing = []
        cond_amazon = None
        cond_observed_state = None
    else:
        # Map Identity Check
        id_verdict = identity_result.verdict.value
        id_detail_dict = identity_result.detail or {}
        id_expected = ordered_sku if ordered_sku else None
        id_observed = (
            vision_evidence.detected_product
            if vision_evidence.has_image and vision_evidence.detected_product
            else (observed_labels.get("observed_sku") if observed_labels.get("observed_sku") else None)
        )
        id_detail_str = id_detail_dict.get("reason") or id_detail_dict.get("evidence") or ""
        id_uncertain_reason = (
            ("poor_image" if (vision_evidence.has_image and vision_evidence.uncertainty_notes) else "insufficient_evidence")
            if id_verdict == CheckVerdict.UNCERTAIN.value
            else None
        )
        id_confidence = identity_result.confidence

        # Map Completeness Check
        comp_verdict = completeness_result.verdict.value
        comp_detail_dict = completeness_result.detail or {}
        comp_expected = (
            catalog_product.expected_parts if catalog_product
            else None
        )
        comp_missing = comp_detail_dict.get("missing_parts", [])
        comp_observed = (
            {"visible": vision_evidence.visible_parts, "missing": comp_missing}
            if vision_evidence.has_image
            else ({"missing": comp_missing} if comp_missing else None)
        )
        comp_detail_str = comp_detail_dict.get("evidence") or ""
        comp_uncertain_reason = (
            ("conflicting_evidence" if comp_detail_dict.get("reason") == "conflicting_evidence" or "conflict" in comp_detail_str.lower()
             else ("poor_image" if (vision_evidence.has_image and vision_evidence.uncertainty_notes)
             else ("occluded" if (vision_evidence.has_image and vision_evidence.packaging_state == "uncertain")
                   else "insufficient_evidence")))
            if comp_verdict == CheckVerdict.UNCERTAIN.value
            else None
        )
        comp_confidence = completeness_result.confidence

        # Map Condition Check
        cond_verdict = condition_result.verdict.value
        cond_detail_dict = condition_result.detail or {}
        cond_amazon = cond_detail_dict.get("amazon_condition")
        cond_observed_state = cond_detail_dict.get("observed_state")
        cond_expected = "New"
        cond_observed = (
            cond_amazon
            if (cond_amazon and cond_amazon != AmazonCondition.UNCERTAIN.value)
            else (cond_observed_state if (cond_observed_state and cond_observed_state != "uncertain") else None)
        )
        cond_detail_str = cond_detail_dict.get("evidence") or ""
        cond_uncertain_reason = (
            (cond_detail_dict.get("reason")
             if cond_detail_dict.get("reason") in ["poor_image", "occluded", "insufficient_evidence", "model_error", "rule_unavailable", "conflicting_evidence", "other"]
             else ("poor_image" if (vision_evidence.has_image and vision_evidence.uncertainty_notes) else "insufficient_evidence"))
            if cond_verdict == CheckVerdict.UNCERTAIN.value
            else None
        )
        cond_confidence = condition_result.confidence

        # Keep evidence record inputs and each check's evidence_refs limited to images whose verified bytes were actually analyzed
        analyzed_refs = [
            inp["ref"]
            for inp in examined_inputs
            if "ref" in inp and (inp["ref"] in (vision_evidence.images_analyzed or []) or not vision_evidence.images_analyzed)
        ]
        evidence_refs = analyzed_refs if (analyzed_refs and vision_evidence.has_image) else None
        record_inputs = [inp for inp in examined_inputs if inp.get("ref") in (evidence_refs or [])]

        outcome_str = disposition_outcome.decision.value
        outcome_reason = disposition_outcome.reason

        if outcome_str == DispositionDecision.REJECT.value:
            verdict = "FAIL"
            needs_human = False
        else:
            verdict = (
                "UNCERTAIN"
                if outcome_str == "pending_review" or any(v == "UNCERTAIN" for v in (id_verdict, comp_verdict, cond_verdict))
                else (
                    "FAIL"
                    if any(v == "FAIL" for v in (id_verdict, comp_verdict, cond_verdict))
                    else "PASS"
                )
            )

            needs_human = (
                outcome_str == "pending_review"
                or verdict == "UNCERTAIN"
                or any(v == "UNCERTAIN" for v in (id_verdict, comp_verdict, cond_verdict))
            )

    checks = [
        check(
            "identity_match",
            id_verdict,
            id_confidence,
            expected=id_expected,
            observed=id_observed,
            detail=id_detail_str,
            evidence_refs=evidence_refs,
            uncertain_reason=id_uncertain_reason,
        ),
        check(
            "completeness",
            comp_verdict,
            comp_confidence,
            expected=comp_expected,
            observed=comp_observed,
            detail=comp_detail_str,
            evidence_refs=evidence_refs,
            uncertain_reason=comp_uncertain_reason,
        ),
        check(
            "condition",
            cond_verdict,
            cond_confidence,
            expected=cond_expected,
            observed=cond_observed,
            detail=cond_detail_str,
            evidence_refs=evidence_refs,
            uncertain_reason=cond_uncertain_reason,
        ),
    ]

    condition_graded = (
        not input_error
        and cond_verdict != CheckVerdict.UNCERTAIN.value
        and cond_amazon is not None
        and cond_amazon != AmazonCondition.UNCERTAIN.value
    )
    payload = {
        "observed_state": (
            cond_observed_state
            if (cond_observed_state and cond_observed_state != "uncertain")
            else (vision_evidence.packaging_state if vision_evidence.packaging_state != "uncertain" else None)
        ),
        "condition_graded": condition_graded,
        "amazon_condition": cond_amazon if condition_graded else None,
        "parts_missing": comp_missing if comp_missing else [],
        "sent_contents_seen": pack_ev is not None,
        "disposition_category": getattr(disposition_outcome, "category", None),
        "user_explanation": disposition_outcome.reason,
        "validation_status": "REJECT" if outcome_str == "reject" else "VALID",
        "expected_product": catalog_product.title if catalog_product else ordered_sku,
        "expected_sku": ordered_sku,
        "expected_parts": catalog_product.expected_parts if catalog_product else [],
        "observed_product": (
            vision_evidence.detected_product or vision_evidence.observed_product
            if vision_evidence.has_image
            else None
        ),
        "image_quality": vision_evidence.image_quality if vision_evidence.has_image else None,
        "detected_evidence": {
            "product": vision_evidence.detected_product or vision_evidence.observed_product if vision_evidence.has_image else None,
            "brand": vision_evidence.detected_brand if vision_evidence.has_image else None,
            "visible_parts": vision_evidence.visible_parts if vision_evidence.has_image else [],
            "missing_candidates": comp_missing if comp_missing else [],
            "visible_damage": vision_evidence.visible_damage if vision_evidence.has_image else [],
            "packaging_state": vision_evidence.packaging_state if vision_evidence.has_image else None,
            "image_quality": vision_evidence.image_quality if vision_evidence.has_image else None,
            "model_used": vision_evidence.model_used if vision_evidence.has_image else None,
            "uncertainty_notes": vision_evidence.uncertainty_notes if vision_evidence.has_image else None,
        },
    }

    model_name = (
        vision_evidence.model_used
        if (vision_evidence.has_image and vision_evidence.model_used and vision_evidence.model_used != "offline_no_image")
        else "returns-rules-engine"
    )
    model = {
        "name": model_name,
        "version": "1.0",
        "provider": vision_agent.provider if (vision_evidence.has_image and vision_agent.provider != "offline") else None,
        "prompt_version": "v3" if (vision_evidence.has_image and vision_agent.provider != "offline") else None,
        "calls": 1 if (vision_agent.provider != "offline" and vision_evidence.has_image and not vision_evidence.is_fallback) else 0,
        "cost_usd": None,
    }

    upstream_refs = [
        r["record_id"]
        for r in request.get("previous_evidence", [])
        if r.get("record_id")
    ]

    record_id = _deterministic_record_id(request["request_id"])
    record_refs = {k: v for k, v in {"order_id": order_id, "sku": ordered_sku, "asin": ordered_asin}.items() if v}

    record = build_record(
        request,
        agent_id=AGENT_ID,
        record_id=record_id,
        captured_at=captured_at,
        operator_id=operator_id,
        refs=record_refs,
        checks=checks,
        outcome=outcome_str,
        verdict=verdict,
        needs_human=needs_human,
        model=model,
        inputs=record_inputs,
        reason=outcome_reason,
        payload=payload,
        upstream_refs=upstream_refs,
    )
    return build_output(record)


app = make_app(STAGE, handle)
