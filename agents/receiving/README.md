agents/receiving/ · Receiving Manager
Owner: Member 1 — Receiving Manager (zainbuilds-dev)Provenance: Round 2 repo cube-01-receiving-manager, commit e223d931980ad99007ddb4950a99a997e0172d5d — see PROVENANCE.mdStatus: real agent, integrated (stub fully replaced). Hardened in collaboration with Member X on fix/receiving-safety (PR #6); combined merge pending.

Reads (inputs)	Receiving captures at data/input/<subject_id>/receiving/ (pallet / open-carton / unit close-up), resolved by the orchestrator's discover_inputs; PO line from the fixture registry or the sample row (org-scoped)
Reads (previous evidence)	nothing — first stage in the chain
Produces	6 contract checks: identity_match, carton_count, quantity, carton_damage, unit_damage, quality_flags + granular detail in payload (10 internal checks, receiving_summary)
decision.outcome values	accept, accept_with_exceptions, pending_review (reject reserved — no rule triggers it yet)
subject.unit_scope	po_line — Round 2 Receiving rows are PO lines (finding F-08); joins prefer refs (po_number, po_line, sku, asin)
Supplier shortfall	kept distinct from channel-side loss (finding F-10): shortfall recorded in payload.shortfall_units as receiving-side evidence only
How it judges (the architecture in one screen)
Deterministic quality gate first (PIL: edge energy, brightness, resolution). REJECTED photos are excluded before any model call — they never consume quota and never produce claims. DEGRADED photos are used but recorded.
Blind extraction — the VLM never sees the PO, so observations cannot anchor toward the expected answer. OpenCV QR tier (pip-only, deterministic) + Gemini VLM behind a fallback model chain. Content-hash cached: reruns cost zero quota (verified: model.calls: 0 on cached runs).
10 deterministic checks (identity tiers, quantity precedence: reliable count > partial overage > printed, conflict detection on disagreeing reliable counts, sealed ≠ missing, lighting-gated colour) → rolled into the 6 contract checks. UNCERTAIN always carries a uncertain_reason; N/A checks are omitted, never PASS.
Fail open — missing captures or model failure → pending record (upstream_missing / model_error), never a crash, never fabricated, operator never blocked.
Idempotent — record_id = RCV-hash(request_id) on every path; same request → same record whether it pends or completes.
Tenancy — org-scoped lookups (LookupError → 404). Input refs validated before any filesystem access: no traversal, no absolute paths, no drive letters; reads confined to data/input.
Running it
# in-process (default):pytest tests/integration/test_agent_contracts.py     # contract tests, our fixturespytest agents/receiving/tests -q                     # adapter suite: 14/14 offline (asserts model.calls == 0)# standalone HTTP:.venv/bin/uvicorn agents.receiving.app:app --port 8101curl localhost:8101/health
Windows (no make): see the setup table in the pod README.

Fixtures & honest limits
Captures are synthetic fixtures staged for pipeline validation — not physical receiving evidence; demo should label them as such.
Decorative QRs in fixtures decode to nothing (correctly); identity runs on Tier-2 label text. A real printed QR hits Tier-1 (0.95, deterministic).
Pending fixtures: UNIT-0012 / UNIT-0039 captures don't match their CSV specs (staged towels vs. mug/serum PO lines). The agent correctly FAILED them — fixture debt, not agent debt; regeneration pending.
Generated images can carry generator text that collides with label checks — fixture prompts must forbid watermarks/captions (decisions.md D-R4).