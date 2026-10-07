"""Repository Pattern for Prep Compliance Records (KI Rule: Clean repository pattern)."""

import json
from pathlib import Path
from agents.prep.config import settings
from agents.prep.schemas import PrepRecord, OperatorOverride
from agents.prep.tenancy import get_current_org, TenancySecurityError


class PrepRecordRepository:
    """Manages persistence of compliance records with enforced tenant isolation."""

    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or (settings.storage_dir / "records_db.json")
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        if not self.db_path.exists():
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            self.db_path.write_text("{}", encoding="utf-8")

    def _load_data(self) -> dict[str, dict]:
        try:
            return json.loads(self.db_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _save_data(self, data: dict[str, dict]) -> None:
        self.db_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def save(self, record: PrepRecord) -> PrepRecord:
        """Persist a prep compliance record ensuring tenant context matches."""
        current_org = get_current_org()
        if record.org_id != current_org:
            raise TenancySecurityError(
                f"Cannot save record for org '{record.org_id}' under active tenant context '{current_org}'"
            )

        data = self._load_data()
        data[record.record_id] = record.model_dump()
        self._save_data(data)
        return record

    def get(self, record_id: str) -> PrepRecord | None:
        """Retrieve a record strictly within the caller's tenant boundary."""
        data = self._load_data()
        raw = data.get(record_id)
        if not raw:
            return None

        current_org = get_current_org()
        if raw["org_id"] != current_org:
            # Enforce Row-Level Security: cross-org record does not exist to caller
            return None

        return PrepRecord.model_validate(raw)

    def get_by_unit_id(self, unit_id: str) -> PrepRecord | None:
        """Find record by cross-pod unit_id within tenant boundary."""
        current_org = get_current_org()
        for raw in self._load_data().values():
            if raw.get("unit_id") == unit_id and raw.get("org_id") == current_org:
                return PrepRecord.model_validate(raw)
        return None

    def list_records(self) -> list[PrepRecord]:
        """List all records strictly scoped to the active tenant."""
        current_org = get_current_org()
        return [
            PrepRecord.model_validate(raw)
            for raw in self._load_data().values()
            if raw.get("org_id") == current_org
        ]

    def record_override(self, record_id: str, override: OperatorOverride) -> PrepRecord:
        """Apply an operator override with mandatory reason without discarding original verdict."""
        record = self.get(record_id)
        if not record:
            raise ValueError(f"Record {record_id} not found in tenant {get_current_org()}")

        record.operator_override = override
        record.overall_verdict = override.new_verdict
        return self.save(record)


prep_repo = PrepRecordRepository()
