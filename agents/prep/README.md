# agents/prep/  ·  Prep Manager

**Owner:** jayani1502 (`@jayani1502`)  
**Status:** Integrated Production Agent (Round 3)  
**Implementation:** Pure Python 3.11+ Deterministic FBA Inspection Engine  
**Provenance:** Ported from `jayani1502/cube26-prp-0206-jayani1502` (see `PROVENANCE.md`)

---

## 1. Overview
The **Prep Manager** is the dedicated compliance verification engine for Fulfillment by Amazon (FBA) inbound shipments. Operating directly between the Receiving stage and downstream Recovery/Pack stages, it executes multi-check micro-inspections against official Amazon FBA carrier packaging standards.

```
Agent Input ──▶ [ agents.prep.app:handle ] ──▶ Agent Output (Evidence Record: PRP-xxxx)
```

## 2. Capabilities & Innovations
1. **Multi-Check Micro-Inspections:** Evaluates 8 discrete FBA packaging rules:
   - `polybag_sealed`: 360° perimeter seal verification (§2.2).
   - `suffocation_warning`: Legibility and warning text verification for polybag openings $\ge$ 5 inches (§2.3).
   - `fnsku_label_placement`: Smooth, flat placement avoiding seams, edges, or curves (§3.2).
   - `original_barcode_covered`: Manufacturer UPC/EAN masked by opaque sticker (§3.4).
   - `expiry_legible`: Expiration date format and visibility through polybag (§4.1).
   - `handling_marks`: Presence of required Fragile / This Side Up exterior stickers (§4.2).
2. **P0 Security & Contract Hardening:**
   - **S1 Multi-Tenant Isolation:** Validates `subject.org_id` against authorized tenant context; refuses cross-tenant requests with `LookupError` (HTTP 404).
   - **D1 Photo Boundary Validation:** Validates all `photo_index` references against provided inputs; clamps out-of-bounds citations to `verdict: UNCERTAIN`.
   - **S2 Trusted Criteria:** Strips caller-supplied override flags; loads product criteria strictly from server-side catalog/work orders.
   - **C1 Canonical Record ID:** Emits strictly prefixed `PRP-...` record IDs.
3. **Unplanned FBA Fee Defense Pack (`dispute_defense_pack`):**
   - Automatically compiles pre-shipment cryptographic dispute dossiers inside `evidence.payload` to help sellers contest unwarranted Amazon unplanned prep fees.
4. **Pharmaceutical & Sensitive Item Safety Valve:**
   - Automatically detects ingestibles, vitamins, pharmaceuticals, baby products, and cosmetics. Drops to `verdict: UNCERTAIN` with `needs_human: True` if confidence $< 0.85$ or visual evidence is ambiguous.
5. **Measurements Capture (Finding F-07 Resolution):**
   - Records physical weight and dimensions in `payload.measurements` (`weight_g`, `length_mm`, `width_mm`, `height_mm`), enabling Recovery Manager to contest invalid weight-tier fulfillment fees.
6. **Durable Replay Idempotency:**
   - Atomic SQLite request cache (`out/prep/idempotency.db`) ensuring `same request_id -> identical sealed output` with zero redundant inference fees.

---

## 3. Running & Testing

### Running as an In-Process Module
In-process execution is managed directly by the Orchestrator via `agents.prep.app:handle`.

### Running as an HTTP Microservice
```sh
uvicorn agents.prep.app:app --port 8102
curl http://localhost:8102/health
```

### Running Test Verification
```sh
pytest tests/integration/test_agent_contracts.py -k prep
```
