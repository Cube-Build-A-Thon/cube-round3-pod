# agents/receiving/ · Receiving Manager

**Owner:** Nithesh (@nithesh33758) — Member 1 (Receiving Manager)

> **Receiving Manager** is an automated, multimodal visual receiving inspection and deterministic reconciliation engine. It verifies incoming supplier shipments against purchase-order lines using structured visual evidence, deterministic rules, and multi-tenant isolation.

---

## Capabilities & Architecture

| Feature | Detail |
|---|---|
| **Inputs** | Photos at point of receipt, PO line expectation |
| **Multimodal Vision** | Google Gemini (`gemini-1.5-flash`) extracts label text, barcodes, carton counts, and damages |
| **Deterministic Engine** | Reconciles visual observations against PO lines without LLM arithmetic hallucination |
| **Check Keys** | `identity_match`, `carton_count`, `quantity`, `carton_damage`, `unit_damage`, `quality_flags` |
| **Outcomes** | `accept`, `accept_with_exceptions`, `reject`, `pending_review` |
| **Tenancy** | Strictly scopes all requests by `org_id`, returning 404 / `LookupError` on tenant mismatch |
| **Traceability** | Generates sealed Evidence Records with SHA-256 canonical JSON content hashing |

---

## Output Contract & Payload

Outputs adhere strictly to `shared/schemas/agent-output.schema.json` and `shared/schemas/evidence.schema.json`:

- **Record ID**: `RCV-<subject_id>`
- **Payload**:
  ```json
  {
    "supplier": "Supplier East (DUMMY)",
    "qty_ordered": 24,
    "qty_received": 24,
    "shortfall_units": 0,
    "quality_flags": [],
    "spec_colour": "blue",
    "spec_variant": "bath",
    "spec_components": ["towel"]
  }
  ```

---

## How to Run

### In-Process (Default Pod Mode)
Invoked dynamically by the orchestrator in-process via `handle(request: dict)`.

### Standalone HTTP Service
```sh
python -m uvicorn agents.receiving.app:app --port 8101
curl localhost:8101/health
```
Then set `"mode": "http"` in `agents/receiving/agent.json`.

---

## Testing

```sh
# Run Receiving contract tests
pytest tests/integration/test_agent_contracts.py -k receiving

# Run full Pod integration test suite
pytest
```
