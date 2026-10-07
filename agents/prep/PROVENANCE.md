# Provenance · Prep Manager (Agent 02)

- **Owner:** Manideep (@Manideep667320)
- **Role:** Member 2 (Prep Manager)
- **Round 2 Repository:** [Manideep667320/cube26-prp-0200-manideep667320](https://github.com/Manideep667320/cube26-prp-0200-manideep667320)
- **Source Commit:** `57e6bebf11a8d94ba9fecdca83df6b6604989e4f`
- **Source Directory:** `submissions/manideep667320/`

## Integrated Components from Round 2
- `service.py`: Core inspection pipeline (`inspect_prepped_unit`).
- `amazon_rules.py`: Deterministic Amazon FBA Rules 101–601 engine.
- `vlm_client.py`: Batched multimodal vision client (Gemini, OpenAI, Mock).
- `schemas.py`: Pydantic v2 data models (`WorkOrder`, `PrepRecord`, `ComplianceChecks`, `GroundingEvidence`).
- `fail_open.py`: `@fail_open_boundary` decorator (800ms P95 limit, graceful degradation).
- `repository.py`: Tenant-isolated `PrepRecordRepository`.
- `config.py`: Centralized `Settings` singleton.
- `tenancy.py`: Row-Level Security (RLS) and context-based tenant switching.
- `runner.py`: Standalone CLI benchmark runner.
- `tests/test_prep_unit.py`: Unit test suite (RLS, VLM, fail-open, Amazon rules).
- `tests/run_eval.py`: 50-unit held-out benchmark evaluation harness.
