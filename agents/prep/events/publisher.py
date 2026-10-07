"""Event publisher for prep lifecycle events."""
from typing import Any
from shared.utils.records import utcnow
from shared.utils.log import get_logger

logger = get_logger("prep.events.publisher")

def publish_prep_event(record: dict[str, Any]) -> dict[str, Any]:
    """Formats and emits an egress domain event based on the prep inspection verdict."""
    verdict = record.get("decision", {}).get("verdict")
    event_type = "inbound.prep.completed" if verdict == "PASS" else "inbound.prep.rework"
    event = {
        "event_id": f"evt-{record.get('record_id')}-{int(utcnow()[-4:-1] or 0)}",
        "event_type": event_type,
        "occurred_at": utcnow(),
        "workflow_id": record.get("workflow_id"),
        "subject_id": record.get("subject", {}).get("subject_id"),
        "verdict": verdict,
        "record_id": record.get("record_id"),
    }
    logger.info(f"Emitted {event_type}", extra={"ctx": event})
    return event
