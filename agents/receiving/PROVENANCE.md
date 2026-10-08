Provenance — Receiving Manager
Round 2 repository: https://github.com/zainbuilds-dev/cube-01-receiving-manager
Source commit: e223d931980ad99007ddb4950a99a997e0172d5d
Ported (judgment core): deterministic PIL quality gate; blind VLM extraction(OpenCV QR tier + Gemini fallback chain, content-hash cached); 10 deterministicchecks; receiving summary.
Left in Round 2 (orchestrator territory here): UI, SQLite store, org-tokenauth, override endpoint.
Contract adaptations (docs/decisions.md D-1..D-7): 6 recommended check keyswith granular detail in payload; service call-accounting for model.calls;damage vocabulary map (tear_or_open -> tears); record_id = hash(request_id)on every path (pending and completed).
Review fixes (PR feedback): input-ref security validation (no absolutepaths / traversal / drive letters; reads confined to data/input); providerinput shape = explicit image/jpeg Part from bytes; unified record-id scheme.