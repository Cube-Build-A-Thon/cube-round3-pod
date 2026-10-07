"""Recovery Adapter: Exports photographic bounding-box proof for Agent 05 (Recovery Manager)."""
from typing import Any
from agents.prep.schemas import PrepRecord


def export_dispute_evidence_pack(record: PrepRecord | dict[str, Any]) -> dict[str, Any]:
    """Generates verifiable visual grounding proof for disputing Amazon inbound defect fees."""
    if isinstance(record, PrepRecord):
        grounding_data = [
            {
                "check_id": g.check_id,
                "photo_ref": g.photo_ref,
                "bbox": g.bbox,
                "confidence": g.confidence,
                "observation_text": g.observation_text
            }
            for g in record.evidence_grounding
        ]
        return {
            "record_id": record.record_id,
            "unit_id": record.unit_id,
            "org_id": record.org_id,
            "overall_verdict": record.overall_verdict,
            "dispute_ready": record.overall_verdict == "PASS",
            "grounding_evidence": grounding_data,
            "captured_at": record.captured_at,
            "photo_refs": record.photo_refs
        }

    return {
        "record_id": record.get("record_id"),
        "unit_id": record.get("subject", {}).get("subject_id"),
        "org_id": record.get("subject", {}).get("org_id"),
        "overall_verdict": record.get("decision", {}).get("verdict"),
        "dispute_ready": record.get("decision", {}).get("verdict") == "PASS",
        "grounding_evidence": record.get("payload", {}).get("grounding_evidence", []),
        "captured_at": record.get("captured_at"),
        "photo_refs": [p.get("ref") for p in record.get("inputs", [])]
    }

export_dispute_pack = export_dispute_evidence_pack
