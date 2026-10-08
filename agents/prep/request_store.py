"""Durable SQLite-backed request store guaranteeing replay idempotency.
Enforces Rule 5 (Same request in -> same record_id out) and prevents duplicated model inference costs.
"""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional


class RequestStore:
    """Atomic SQLite-backed idempotency cache for Prep Manager requests."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        if db_path is None:
            base_dir = Path(os.environ.get("OUT_DIR", "out")) / "prep"
            base_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = base_dir / "idempotency.db"
        else:
            self.db_path = Path(db_path)
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prep_cache (
                    request_id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    output_payload TEXT NOT NULL,
                    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def get_cached_output(self, org_id: str, request_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT output_payload FROM prep_cache WHERE org_id = ? AND request_id = ?",
                (org_id, request_id),
            )
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
        return None

    def cache_output(self, org_id: str, request_id: str, record_id: str, output: Dict[str, Any]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO prep_cache (request_id, org_id, record_id, output_payload)
                VALUES (?, ?, ?, ?)
                """,
                (request_id, org_id, record_id, json.dumps(output)),
            )
            conn.commit()
