# agents/pack/ · Pack Manager

**Owner:** Member 3 — Nikhil Agarwal ([@nikhilagarwal03](https://github.com/nikhilagarwal03))  
**Stage:** `pack` · **Agent ID:** `pack-manager-nikhil@2.0.0` · **Prefix:** `PCK-` · **Port:** `8103`  
**Provenance:** Ported from Round 2 repository [`cube26-pck-0019-nikhilagarwal03`](https://github.com/nikhilagarwal03/cube26-pck-0019-nikhilagarwal03) at commit `9ceeb005d1c2b7ee1db192e0299dad9f45b88e67`.

---

## 1. Executive Summary & Operational Scope

In merchant-fulfilled e-commerce (Amazon MFN, Shopify, Walmart) and 3PL fulfillment centers, packers assemble cartons under tight cycle-time pressure. Mis-ships (wrong SKU, incorrect count, or foreign objects left in box) cost \$45–\$75 per defect in return shipping, restocking fees, and customer churn.

Pack Manager acts as an automated, vision-assisted outbound quality gate operating immediately before carton sealing:
- **Vision Extraction:** One batched VLM call per unit (`meta-llama/llama-3.2-90b-vision-instruct` / `qwen/qwen3.8-27b`).
- **Deterministic Reconciliation:** Strict mathematical aggregation comparing order lines against detected items.
- **Occlusion & Decoy Guard:** Identifies foreign objects/tools left in cartons and flags dunnage/paper occlusion as `UNCERTAIN` instead of guessing.
- **Fail-Open Architecture:** 6-second timeout guard guarantees the conveyor line never blocks.

> **Operational Boundary:** Pack Manager strictly verifies **Merchant-Fulfilled Network (`route == "mfn"`)** orders. Amazon FBA units bypass Pack and go through Prep because Amazon fulfills and packs FBA inventory.

| Contract Aspect | Value / Specification |
|---|---|
| **Reads (Inputs)** | Open-box photograph at seal (`inputs[]`), manifest order lines |
| **Reads (Previous Evidence)** | Receiving (`RCV-...`) recorded in `upstream_refs` |
| **Produces** | Content verification, tri-state decision (`seal`, `stop_and_fix`, `pending_review`) |
| **Checks** | `items_present`, `quantities_correct`, `no_extra_items` |
| **Downstream Consumers** | **Returns Manager** (verifies what was sent) & **Recovery Manager** (audits claims) |

---

## 2. Architecture & File Structure

```text
agents/pack/
├── PROVENANCE.md             # Round 2 origin, commit SHA, and author details
├── README.md                 # System overview and operational guide (this file)
├── agent.json                # Stage metadata, agent ID, and transport mode
├── app.py                    # Entry point: handle(request) -> dict and FastAPI HTTP factory
├── eval-report.md            # Benchmark report on 50 held-out evaluation units
│
├── adapter/
│   ├── engine.py             # Deterministic reconciliation engine (reconcile_pack)
│   ├── orders.py             # Multi-tenant order lookup and tenancy isolation
│   └── vision.py             # Batched VLM extractor with 6s timeout guard and replay support
│
├── fixtures/
│   ├── test_fixtures.json    # 50 held-out fixtures with paired dual-human ground truth
│   └── run_2.json            # Benchmark predictions (95.45% accuracy, κ = 0.88)
│
└── tests/
    ├── test_pack_engine.py   # Unit tests for reconciliation logic & edge cases
    └── test_pack_integration.py # Contract validation, tenancy isolation, and idempotency tests
```

---

## 3. Evaluated Performance (Held-Out Fixtures)

Evaluated against **50 held-out test fixtures** across varied categories (Bath, Kitchen, Grocery, Tools, Apparel, Electronics, Toys, Beauty, Sports):

* **Overall Accuracy:** **95.45%** (Run 2)
* **Inter-Labeller Agreement:** **Cohen's $\kappa = 0.88$** (Strong dual-human consensus)
* **Tri-State Distribution:**
  * True Positives (Seal): 7
  * True Negatives (Stop & Fix): 35
  * Uncertain (Review / Occlusion): 6
  * False Positive Rate: 2.78% (1 / 36)
  * False Negative Rate: 12.50% (1 / 8)
* **Average Latency:** **1,845 ms** (well within the 6,000 ms fail-open timeout guard)

---

## 4. Running & Verification

### Run Automated Tests
```powershell
# Run Pack unit & integration test suite
python -m pytest agents/pack/tests

# Run cross-stage contract tests for Pack
python -m pytest tests/integration/test_agent_contracts.py -k pack
```

### Run Standalone HTTP Service
```powershell
uvicorn agents.pack.app:app --port 8103
```

Check health:
```powershell
curl http://localhost:8103/health
```

### Environment Variables
Configure in `.env` (optional for live model calls; defaults to offline replay in CI):
```env
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
PACK_MODEL_NAME=meta-llama/llama-3.2-90b-vision-instruct
```
