"""Multimodal Perception Pipeline for Receiving Inspection.

Supports:
- Deterministic Replay / Offline Mock (used in tests and CI)
- Live Google Gemini Vision (gemini-2.5-flash / gemini-2.5-flash-lite via google-genai)
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Tuple

from .prompts import RECEIVING_INSPECTION_SYSTEM_PROMPT, build_user_prompt
from .schemas import (
    ComponentsObservation,
    ConditionObservation,
    EvidenceRef,
    ProductObservation,
    PurchaseOrderInput,
    QuantityObservation,
    UncertaintyItem,
    VariantObservation,
    VisionObservation,
)


def observe_deterministic(po: PurchaseOrderInput, row: dict[str, Any], refs: list[str]) -> Tuple[VisionObservation, dict[str, Any]]:
    """Build deterministic perceptual observations from known receiving facts."""
    flags = [f.strip() for f in (row.get("quality_flags") or "").split(";") if f.strip()]
    co = int(row.get("cartons_ordered", po.expected_cartons))
    cr = int(row.get("cartons_received", po.expected_cartons))
    qo = int(row.get("qty_ordered", po.expected_quantity))
    qr = int(row.get("qty_received", po.expected_quantity))
    ident = row.get("identity_match", "yes")
    c_dam = row.get("carton_damage", "none")
    u_dam = row.get("unit_damage", "none")

    evidence_list: list[EvidenceRef] = []
    uncertainty_list: list[UncertaintyItem] = []

    primary_ref = refs[0] if refs else "fixtures/receiving/default.jpg"
    carton_ref = refs[1] if len(refs) > 1 else primary_ref
    unit_ref = refs[2] if len(refs) > 2 else primary_ref

    # Product identity observation
    if ident.lower() == "yes":
        evidence_list.append(EvidenceRef(image_id=primary_ref, observation=f"Clear SKU label verified: {po.sku}", field="product"))
        prod_obs = ProductObservation(observed_sku=po.sku, confidence=0.98)
    elif ident.lower() == "uncertain":
        uncertainty_list.append(UncertaintyItem(field="product", reason="Barcode label obscured or unreadable."))
        prod_obs = ProductObservation(observed_sku="uncertain", confidence=0.4)
    else:
        evidence_list.append(EvidenceRef(image_id=primary_ref, observation=f"Observed label mismatch: found {ident}", field="product"))
        prod_obs = ProductObservation(observed_sku=ident, confidence=0.95)

    # Quantity observation
    qty_conf = 0.95
    if qo != qr or co != cr:
        qty_conf = 0.90
    evidence_list.append(EvidenceRef(image_id=carton_ref, observation=f"Cartons counted: {cr} of {co}; Units counted: {qr} of {qo}", field="quantity"))
    qty_obs = QuantityObservation(observed_units=qr, observed_cartons=cr, confidence=qty_conf)

    # Condition observation
    c_conf = 0.4 if (c_dam.lower() == "uncertain" or u_dam.lower() == "uncertain") else 0.95
    if c_dam.lower() == "uncertain":
        uncertainty_list.append(UncertaintyItem(field="condition", reason="Poor lighting or angle hides carton exterior."))
    elif c_dam.lower() not in ("none", ""):
        evidence_list.append(EvidenceRef(image_id=carton_ref, observation=f"Visible carton damage: {c_dam}", field="condition"))

    if u_dam.lower() == "uncertain":
        uncertainty_list.append(UncertaintyItem(field="condition", reason="Unit interior obscured from camera view."))
    elif u_dam.lower() not in ("none", ""):
        evidence_list.append(EvidenceRef(image_id=unit_ref, observation=f"Visible unit damage: {u_dam}", field="condition"))

    cond_obs = ConditionObservation(
        damaged=(c_dam.lower() not in ("none", "", "uncertain") or u_dam.lower() not in ("none", "", "uncertain")),
        carton_damage=c_dam,
        unit_damage=u_dam,
        confidence=c_conf,
    )

    # Variant & Components
    var_obs = VariantObservation(observed_variant=po.expected_variant or "Standard", confidence=0.95)
    missing_comps = [f for f in flags if "missing" in f.lower() or "component" in f.lower()]
    comp_obs = ComponentsObservation(missing=missing_comps, confidence=0.92)

    obs = VisionObservation(
        product=prod_obs,
        quantity=qty_obs,
        variant=var_obs,
        condition=cond_obs,
        components=comp_obs,
        quality_flags=flags,
        evidence=evidence_list,
        uncertainty=uncertainty_list,
    )

    model_meta = {
        "name": "receiving-vision-engine",
        "version": "v2.0-deterministic",
        "provider": "Pod 05 Receiving Engine",
        "prompt_version": "v1.2",
        "calls": 0,
        "cost_usd": 0.0,
    }
    return obs, model_meta


def observe_gemini(po: PurchaseOrderInput, refs: list[str], api_key: str) -> Tuple[VisionObservation, dict[str, Any]]:
    """Live Google Gemini 2.5 Flash / Flash-Lite multimodal perception."""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        user_prompt = build_user_prompt(
            order_number=po.order_number,
            sku=po.sku,
            product_name=po.product_name,
            expected_quantity=po.expected_quantity,
            expected_cartons=po.expected_cartons,
            expected_variant=po.expected_variant,
            image_refs=refs,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                RECEIVING_INSPECTION_SYSTEM_PROMPT,
                user_prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        text = response.text or "{}"
        clean_text = re.sub(r"^```json\s*", "", text.strip())
        clean_text = re.sub(r"\s*```$", "", clean_text)
        data = json.loads(clean_text)

        p = data.get("product", {})
        q = data.get("quantity", {})
        v = data.get("variant", {})
        c = data.get("condition", {})
        comp = data.get("components", {})

        obs = VisionObservation(
            product=ProductObservation(observed_sku=p.get("observedSku"), confidence=float(p.get("confidence", 1.0))),
            quantity=QuantityObservation(
                observed_units=q.get("observedUnits"),
                observed_cartons=q.get("observedCartons"),
                confidence=float(q.get("confidence", 1.0)),
            ),
            variant=VariantObservation(observed_variant=v.get("observed"), confidence=float(v.get("confidence", 1.0))),
            condition=ConditionObservation(
                carton_damage=c.get("cartonDamage", "none"),
                unit_damage=c.get("unitDamage", "none"),
                damage_types=c.get("damageTypes", []),
                confidence=float(c.get("confidence", 1.0)),
            ),
            components=ComponentsObservation(missing=comp.get("missing", []), confidence=float(comp.get("confidence", 1.0))),
            quality_flags=data.get("qualityFlags", []),
            evidence=[EvidenceRef(image_id=e.get("imageId", ""), observation=e.get("observation", ""), field=e.get("field", "")) for e in data.get("evidence", [])],
            uncertainty=[UncertaintyItem(field=u.get("field", ""), reason=u.get("reason", "")) for u in data.get("uncertainty", [])],
        )

        model_meta = {
            "name": "gemini-2.5-flash",
            "version": "2.5-flash",
            "provider": "Google Gemini",
            "prompt_version": "v1.2",
            "calls": 1,
            "cost_usd": 0.001,
        }
        return obs, model_meta
    except Exception as exc:
        raise RuntimeError(f"Gemini perception failed: {exc}") from exc
