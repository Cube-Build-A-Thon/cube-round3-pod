"""Disposition Agent for Returns Management.

Policy-governed engine returning strictly one of:
- restock
- refurbish
- liquidate
- dispose
- pending_review

Applies strict commercial and safety guardrails across identity, completeness, and condition.
"""

from typing import Any, Optional
from ..catalog import ProductDefinition
from ..models import AmazonCondition, CheckResult, CheckVerdict, DispositionDecision, Outcome
from ..utils import is_non_product_media


class DispositionAgent:
    def __init__(self, agent_name: str = "agent:cube-04-returns-manager"):
        self.agent_name = agent_name

    def decide(
        self,
        identity_check: CheckResult,
        completeness_check: CheckResult,
        condition_check: CheckResult,
        catalog_product: Optional[ProductDefinition],
        vision_check: Optional[CheckResult] = None,
        vision_evidence: Optional[Any] = None,
    ) -> Outcome:
        id_detail = identity_check.detail or {}
        comp_detail = completeness_check.detail or {}
        cond_detail = condition_check.detail or {}
        v_detail = vision_check.detail if vision_check else {}

        # -------------------------------------------------------------
        # RULE 8: GEMINI / API FAILURE
        # Safe failure -> pending_review, category=api_failure, needs_human=True
        # -------------------------------------------------------------
        is_api_fail = (
            id_detail.get("category") == "api_failure"
            or cond_detail.get("category") == "api_failure"
            or comp_detail.get("category") == "api_failure"
            or v_detail.get("category") == "api_failure"
            or (vision_evidence and getattr(vision_evidence, "recommended_reason_category", None) == "api_failure")
            or (vision_evidence and str(getattr(vision_evidence, "inference_source", "")).startswith("offline_failure_state"))
        )
        if is_api_fail:
            return Outcome(
                decision=DispositionDecision.PENDING_REVIEW,
                reason="Vision model unavailable or API inference failure; safe failure triggered without guessing. Manual bench inspection required.",
                decided_by=self.agent_name,
                category="api_failure",
            )

        # -------------------------------------------------------------
        # RULE 5: BLURRY / UNUSABLE IMAGE
        # Image unusable -> pending_review, explicit request for clear photo
        # -------------------------------------------------------------
        is_blurry_cat = (
            id_detail.get("category") in ("blurry_image", "unusable_image")
            or cond_detail.get("category") in ("blurry_image", "unusable_image")
            or (vision_evidence and getattr(vision_evidence, "recommended_reason_category", None) in ("blurry_image", "unusable_image"))
            or (vision_evidence and getattr(vision_evidence, "image_quality", None) in ("blurry", "unusable"))
        )
        if is_blurry_cat:
            is_blur = (
                id_detail.get("category") == "blurry_image"
                or cond_detail.get("category") == "blurry_image"
                or (vision_evidence and getattr(vision_evidence, "image_quality", None) == "blurry")
                or (vision_evidence and "blur" in str(getattr(vision_evidence, "uncertainty_notes", "")).lower())
            )
            cat_name = "blurry_image" if is_blur else "unusable_image"
            reason_msg = (
                "Image is too blurry to reliably inspect the returned item. Please send a clear photo showing the full product and its components."
                if is_blur
                else "Image is unusable, dark, or obstructed. Please send a clear photo showing the full product and its components."
            )
            return Outcome(
                decision=DispositionDecision.PENDING_REVIEW,
                reason=reason_msg,
                decided_by=self.agent_name,
                category=cat_name,
            )

        # -------------------------------------------------------------
        # RULE 6: NON-PRODUCT IMAGE
        # Confirmed non-product media -> REJECT, category=non_product_image
        # User-facing explanation explicitly requests product photo
        # Check text ONLY from visual descriptions, NEVER from filenames
        # -------------------------------------------------------------
        is_non_prod = False
        if id_detail.get("physical_product_detected") is False or v_detail.get("physical_product_detected") is False:
            is_non_prod = True
        elif id_detail.get("is_non_product") is True or id_detail.get("category") == "non_product_image":
            is_non_prod = True
        elif vision_evidence and (getattr(vision_evidence, "is_product", True) is False or getattr(vision_evidence, "recommended_reason_category", None) == "non_product_image"):
            is_non_prod = True
        else:
            combined_observed_text = " ".join([
                str(id_detail.get("detected_product") or ""),
                str(id_detail.get("observed_product") or ""),
                str(id_detail.get("reason") or ""),
                str(id_detail.get("evidence") or ""),
                str(v_detail.get("detected_product") or ""),
                str(v_detail.get("observed_product") or ""),
            ])
            is_non_prod = is_non_product_media(combined_observed_text)

        if is_non_prod:
            return Outcome(
                decision=DispositionDecision.REJECT,
                reason="No recognizable returned product was detected. Please upload a clear image of the actual item.",
                decided_by=self.agent_name,
                category="non_product_image",
            )

        # -------------------------------------------------------------
        # RULE 2: WRONG PRODUCT
        # Identity FAIL -> pending_review, category=wrong_product, needs_human=True
        # -------------------------------------------------------------
        if identity_check.verdict == CheckVerdict.FAIL:
            id_evidence = (
                id_detail.get("reason")
                or id_detail.get("evidence")
                or f"Returned item does not match ordered SKU/ASIN ({catalog_product.title if catalog_product else ''})."
            )
            clean_evidence = id_evidence
            if clean_evidence.lower().startswith("product mismatch / wrong item returned:"):
                clean_evidence = clean_evidence[len("product mismatch / wrong item returned:"):].strip()
            elif clean_evidence.lower().startswith("product mismatch:"):
                clean_evidence = clean_evidence[len("product mismatch:"):].strip()
            elif clean_evidence.lower().startswith("product mismatch"):
                clean_evidence = clean_evidence[len("product mismatch"):].strip().lstrip(":- ")

            return Outcome(
                decision=DispositionDecision.PENDING_REVIEW,
                reason=f"Product mismatch / wrong item returned: {clean_evidence}",
                decided_by=self.agent_name,
                category="wrong_product",
            )

        # -------------------------------------------------------------
        # RULE 7: AMBIGUOUS / MULTI
        # Conflicting images, ambiguous identity/completeness/condition
        # -> pending_review, category=ambiguous_multi, needs_human=True
        # -------------------------------------------------------------
        is_ambiguous = (
            identity_check.verdict == CheckVerdict.UNCERTAIN
            or completeness_check.verdict == CheckVerdict.UNCERTAIN
            or condition_check.verdict == CheckVerdict.UNCERTAIN
            or id_detail.get("category") == "ambiguous_multi"
            or comp_detail.get("reason") == "conflicting_evidence"
            or (vision_evidence and getattr(vision_evidence, "recommended_reason_category", None) == "ambiguous_multi")
            or (vision_evidence and bool(getattr(vision_evidence, "ambiguity", None)))
        )
        if is_ambiguous:
            uncertain_checks = []
            if identity_check.verdict == CheckVerdict.UNCERTAIN:
                uncertain_checks.append("identity")
            if completeness_check.verdict == CheckVerdict.UNCERTAIN:
                uncertain_checks.append("completeness")
            if condition_check.verdict == CheckVerdict.UNCERTAIN:
                uncertain_checks.append("condition")

            comp_reason = comp_detail.get("reason")
            extra_msg = ""
            if comp_reason == "conflicting_evidence":
                extra_msg = f" Conflicting multi-image evidence: {comp_detail.get('evidence', '')}."

            amb_reason = (
                f"Ambiguous evidence on check(s): [{', '.join(uncertain_checks)}]. Requires human supervisor bench inspection.{extra_msg}"
                if uncertain_checks
                else "Ambiguous visual evidence across images or checks. Target item, completeness, or condition cannot be reliably established."
            )
            return Outcome(
                decision=DispositionDecision.PENDING_REVIEW,
                reason=amb_reason,
                decided_by=self.agent_name,
                category="ambiguous_multi",
            )

        # -------------------------------------------------------------
        # RULE 3: DAMAGED PRODUCT
        # Correct product is visibly broken/damaged -> dispose
        # Evidence must describe the visible damage.
        # -------------------------------------------------------------
        amazon_cond = condition_check.detail.get("amazon_condition", "")
        cond_evidence = (
            condition_check.detail.get("evidence")
            or condition_check.detail.get("reason")
            or condition_check.detail.get("observed_state")
            or "structural damage or functional failure"
        )

        if condition_check.verdict == CheckVerdict.FAIL:
            return Outcome(
                decision=DispositionDecision.DISPOSE,
                reason=f"Physical damage detected: {cond_evidence}. Product is visibly broken or damaged beyond acceptable resale condition; designated for disposal/scrap.",
                decided_by=self.agent_name,
                category="damaged_product",
            )

        # -------------------------------------------------------------
        # RULE 4: MISSING COMPONENT
        # Product identity correct + authoritative missing component -> refurbish
        # Evidence must identify the missing component.
        # -------------------------------------------------------------
        missing_parts = completeness_check.detail.get("missing_parts", [])
        critical_missing = completeness_check.detail.get("critical_missing", [])

        if critical_missing:
            return Outcome(
                decision=DispositionDecision.DISPOSE,
                reason=f"Non-replaceable critical component(s) missing: {', '.join(critical_missing)}. Cannot be restored to operational inventory.",
                decided_by=self.agent_name,
                category="damaged_product",
            )

        if missing_parts:
            return Outcome(
                decision=DispositionDecision.REFURBISH,
                reason=f"Missing required component(s): {', '.join(missing_parts)}. Eligible for re-kitting and refurbishment in prep center.",
                decided_by=self.agent_name,
                category="missing_component",
            )

        # -------------------------------------------------------------
        # RULE 1: CORRECT PRODUCT
        # Identity correct, image usable, condition good/acceptable, complete
        # -> restock, category=correct_product
        # -------------------------------------------------------------
        if amazon_cond in [AmazonCondition.USED_GOOD.value, AmazonCondition.USED_ACCEPTABLE.value]:
            return Outcome(
                decision=DispositionDecision.RESTOCK,
                reason=f"Correct product verified ({catalog_product.title if catalog_product else ''}), complete with all expected components, in acceptable condition ({amazon_cond}). Cleared for restock.",
                decided_by=self.agent_name,
                category="correct_product",
            )

        if amazon_cond == AmazonCondition.NEW.value:
            return Outcome(
                decision=DispositionDecision.RESTOCK,
                reason=f"Correct product verified ({catalog_product.title if catalog_product else ''}), factory sealed, complete, in new condition. Cleared for restock.",
                decided_by=self.agent_name,
                category="correct_product",
            )

        if amazon_cond in [AmazonCondition.USED_LIKE_NEW.value, AmazonCondition.USED_VERY_GOOD.value]:
            return Outcome(
                decision=DispositionDecision.RESTOCK,
                reason=f"Correct product verified ({catalog_product.title if catalog_product else ''}), complete with all expected components, in like-new/good condition. Cleared for restock.",
                decided_by=self.agent_name,
                category="correct_product",
            )

        return Outcome(
            decision=DispositionDecision.RESTOCK,
            reason=f"Correct product verified ({catalog_product.title if catalog_product else ''}), complete and in acceptable condition. Cleared for restock.",
            decided_by=self.agent_name,
            category="correct_product",
        )
