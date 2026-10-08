"""Automated Amazon Unplanned Prep Fee dispute defense generator.
Produces structured dispute dossiers to defend sellers against unwarranted Amazon inbound fee penalties.
"""
from __future__ import annotations

from typing import Any, Dict, List
from shared.utils.records import utcnow


class DisputeDefenseGenerator:
    """Generates dispute defense packs for Amazon FBA inbound packaging penalties."""

    @staticmethod
    def generate_defense_pack(
        unit_id: str,
        sku: str,
        record_id: str,
        content_hash: str,
        checks: List[Dict[str, Any]],
        inputs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Compiles a verifiable seller dispute dossier defending pre-shipment compliance."""
        passing_checks = [c for c in checks if c["verdict"] == "PASS"]
        evidence_citations = [
            {
                "check_key": c["check_key"],
                "requirement": c["expected"],
                "evidence_refs": c["evidence_refs"],
                "observed_evidence": c.get("observed"),
            }
            for c in passing_checks
        ]

        # Template for Amazon Seller Central dispute submission
        rebuttal_template = (
            f"DISPUTE NOTICE: Inbound FBA Prep Compliance Verification for Unit {unit_id} (SKU: {sku}).\n"
            f"Pre-inbound packaging verification was completed and cryptographically sealed under Record ID: {record_id} "
            f"(Canonical SHA-256 Seal: {content_hash}).\n"
            f"Certified compliance: {len(passing_checks)} discrete FBA checks verified with physical capture proof.\n"
            f"Any Amazon Unplanned Prep Service Fee for this unit contradicts pre-inbound inspection evidence.\n"
            f"Generated: {utcnow()}."
        )

        return {
            "dossier_id": f"DISPUTE-{record_id}",
            "generated_at": utcnow(),
            "target_unit": unit_id,
            "sku": sku,
            "record_id": record_id,
            "evidence_sha256": content_hash,
            "passing_checks_count": len(passing_checks),
            "citations": evidence_citations,
            "rebuttal_statement": rebuttal_template,
        }
