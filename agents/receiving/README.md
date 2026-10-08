# agents/receiving/  ·  Receiving Manager

**Owner:** Kiran Teja (@KiranTejz20005) &bull; Member 1 (Receiving Manager)  
**Provenance:** Ported from [cube26-rcv-0138-kirantejz20005](https://github.com/KiranTejz20005/cube26-rcv-0138-kirantejz20005) (`c3a0b8ccc2cde22f3fb0f852e890f65719ea605a`)

---

## 1. Overview & Architectural Principle

Receiving Manager is Station #1 in the Pod 05 fulfillment audit pipeline. It evaluates physical shipment captures at the point of inbound delivery against Purchase Order (PO) line specifications.

### Core Architecture: AI Observes, Application Decides
- **Perception Layer:** Multi-modal vision perception (Google Gemini 2.5 Flash / Flash-Lite, with deterministic replay fallback in CI) extracts structured observations (visible barcodes/labels, counted cartons and units, detected packaging damage, missing items).
- **Decision Engine:** Deterministic business logic evaluates observed facts against PO parameters (`expected === observed`). The LLM does not make business acceptance or rejection decisions.
- **Strict UNCERTAIN State:** If camera angle, lighting, or resolution obscures a label or carton surface, the check produces `UNCERTAIN` accompanied by an explicit `uncertain_reason` (`poor_image`, etc.) rather than guessing.
- **Supplier Shortfall Separation:** Supplier shortfall (`shortfall_units`) is tracked separately on the PO line (`unit_scope: po_line`), establishing the authoritative foundation for supplier claims before channel handoff.

---

## 2. Evidence Contract v1.0 Specifications

| Specification | Details |
|---|---|
| **Reads (inputs)** | Receiving photographs (pallet, outer carton, individual unit) and PO line specifications |
| **Reads (previous evidence)** | None (first station in the pipeline; preserves `upstream_refs: []`) |
| **Produces** | Evidence Record (`RCV-xxxx`) wrapped in Agent Output |
| **Checks Evaluated** | `identity_match`, `carton_count`, `quantity`, `carton_damage`, `unit_damage`, `quality_flags` |
| **Decisions / Outcomes** | `accept` (PASS), `accept_with_exceptions` (FAIL), `pending_review` (UNCERTAIN) |
| **Next Step Recommendations** | `continue` (PASS), `route_to_recovery` (FAIL), `review` (UNCERTAIN) |

---

## 3. Directory Layout

```text
agents/receiving/
├── app.py               # Agent entry point exposing handle(request) and FastAPI make_app()
├── agent.json           # Agent manifest (stage, agent_id, owner, mode, module)
├── PROVENANCE.md        # Provenance attribution linking to Round 2 repository
├── README.md            # Station documentation and specifications
└── r2/
    ├── __init__.py
    ├── schemas.py       # Data models for PO, observations, checks, and results
    ├── prompts.py       # Visual perception system & extraction prompts
    ├── decision_engine.py # Deterministic business rules engine
    └── perception.py    # Multimodal perception pipeline (Gemini live / Deterministic replay)
```

---

## 4. Running & Testing

### Running Tests
Run contract tests and end-to-end integration tests:
```bash
python -m pytest tests
```

### Running Over HTTP
Start the agent service standalone:
```bash
uvicorn agents.receiving.app:app --port 8101
```

Health check:
```bash
curl http://localhost:8101/health
```
