# agents/recovery/ · Sydon Recovery Manager

**Owner:** Nithesh (@nithesh33758) — Member 5 (Recovery Manager)

> **Sydon Recovery Manager** is an automated, policy-backed Amazon FBA fee reconciliation engine. It correlates Amazon fee lines against upstream warehouse evidence across Receiving, Prep, Pack, and Returns, producing deterministic, audit-traceable dispute packages while protecting seller account standing.

---

## Capabilities & Architecture

| Feature | Detail |
|---|---|
| **Inputs** | Amazon fee / reimbursement report lines (no camera) |
| **Reads** | All upstream evidence records (`previous_evidence`), including operator overrides |
| **Policy Catalog** | Amazon FBA Dispute Rules (`amazon_rules.json`) covering inbound defect, lost inbound, warehouse damage, returns, and weight tier overcharges |
| **Semantics** | `FAIL` = Contradicts (Claim) · `PASS` = Supports (No Claim) · `UNCERTAIN` = Silent (Never Claim) |
| **Precision Philosophy** | Emphasizes claim precision over recall. Ambiguous or silent charges are never filed, protecting the seller's account standing with Amazon |
| **Traceability** | Every claim cites the upstream `record_id`, verified check keys, and policy rule IDs |

---

## Output Contract & Payload

Outputs adhere strictly to `shared/schemas/agent-output.schema.json` and `shared/schemas/evidence.schema.json`:

- **Record ID**: `RCY-<subject_id>`
- **Checks**: One `charge_<line_id>` check per fee line with verdicts (`FAIL` / `PASS` / `UNCERTAIN`)
- **Payload**:
  ```json
  {
    "charges": [
      {
        "line_id": "fee_0014_1",
        "charge_type": "inbound_defect_fee",
        "amount_usd": 2.0,
        "position": "CONTRADICTS",
        "reason": "Prep evidence confirms unit was fully compliant prior to charge (Rule #2001)",
        "evidence_record_ids": ["PRP-0014"]
      }
    ],
    "claimable_usd": 2.0,
    "unclaimable": [ ... ]
  }
  ```

---

## How to Run

### In-Process (Default Pod Mode)
Invoked dynamically by the orchestrator in-process via `handle(request: dict)`.

### Standalone HTTP Service
```sh
python -m uvicorn agents.recovery.app:app --port 8105
curl localhost:8105/health
```
Then set `"mode": "http"` in `agents/recovery/agent.json`.

---

## Testing

```sh
# Run Recovery contract tests
pytest tests/integration/test_agent_contracts.py -k recovery

# Run full Pod integration test suite
pytest
```
