# Architecture Decisions

## 1. Multi-tenant Agent Architecture
- **Decision:** We migrated all agent stubs (Receiving, Prep, Pack, Returns, Recovery) to HTTP adapters.
- **Rationale:** The agents are deployed independently on Render. The adapters simply route the standard Orchestrator input to each deployed service and parse the output.
- **Handling Tenant IDs:** We dynamically pass `x-tenant-id` to the APIs. Receiving strictly enforces `dev_tenant`.

## 2. Evidence and JSON Normalization
- **Decision:** The adapters enforce strict sanitization on `check_key` fields.
- **Rationale:** The CUBE schema requires `check_key` to match `^[a-z][a-z0-9_]*$`. Many APIs returned spaces, hyphens, or uppercase letters (e.g. "SKU Identity"). The adapters now normalize these using Regex (`re.sub(r'[^a-z0-9_]', '_', raw_key)`).

## 3. UI for UX & Demo
- **Decision:** Built `ui.py` using Streamlit.
- **Rationale:** Criteria 7 in the Rubric penalizes reading "Raw JSON on screen". The Streamlit app parses `out/workflows` and `out/evidence` into a navigable dashboard for the demo.
