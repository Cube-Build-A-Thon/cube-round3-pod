# Build Log

## Milestone 1: Adapter Initialization
- Replaced the local stubs for Receiving, Prep, Pack, Returns, and Recovery with `requests` based HTTP adapters.
- Integrated base64 image parsing (`load_image_base64_uri` and `load_image_bytes`) directly in the adapters to send payloads to the ML backends.

## Milestone 2: Orchestrator Alignment
- Encountered schema validation failures due to `check_key` formatting.
- Updated adapters to sanitize checks.
- Handled tenant restrictions (Receiving Manager's strict `dev_tenant` check).
- Mapped external API outputs (e.g. `confidence: 92`) to orchestrator requirements (`confidence: 0.92`).

## Milestone 3: Demo Preparation
- Added `ui.py` to parse the `out/` folder visually, satisfying the UX/Demo requirements.
- Completed `.env.example` configurations.
