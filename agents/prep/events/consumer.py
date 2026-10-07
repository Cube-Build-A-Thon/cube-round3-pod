"""Event consumer for inbound receiving completed events."""
from typing import Any
from shared.utils.log import get_logger

logger = get_logger("prep.events.consumer")

def handle_receiving_completed_event(event: dict[str, Any]) -> dict[str, Any]:
    """Translates incoming event into an AgentInput structure."""
    payload = event.get("data", {})
    logger.info("Consumed inbound.receiving.completed", extra={"ctx": {"subject_id": payload.get("subject_id")}})
    return {
        "schema_version": "1.0",
        "request_id": f"evt-{event.get('id', 'req')}",
        "workflow_id": event.get("workflow_id", ""),
        "stage": "prep",
        "subject": {
            "org_id": payload.get("org_id", ""),
            "subject_id": payload.get("subject_id", ""),
            "route": "fba"
        },
        "inputs": payload.get("inputs", []),
        "previous_evidence": payload.get("evidence", []),
        "context": {}
    }
