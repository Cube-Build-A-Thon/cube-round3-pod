# Provenance: Prep Manager

## Lineage & Origins
- **Origin Repository:** `jayani1502/cube26-prp-0206-jayani1502`
- **Original Author / Owner:** jayani1502 (`@jayani1502`)
- **Integration Commit:** `97654a01f2e8726cfe7c10164959fa3daebad26f`
- **Initial Round 2 Technology Stack:** Next.js (TypeScript), TailwindCSS, Cloudflare D1/R2, Gemini Vision API, Google Generative AI SDK.

## Round 3 Architecture Adaptation & Production Porting
To conform with the strict Round 3 Pod standards, official Evidence Contract v1.0, and high-performance Python orchestrator runtime:

1. **Pure Python Porting Strategy:**
   - The inspection rules and Amazon FBA rulebook clauses (§2.1–§4.2) from `src/lib/rules.ts` and `src/lib/prepRequirements.ts` were ported into pure, zero-dependency Python modules (`agents/prep/core/rules.py` and `agents/prep/core/security.py`).
   - `handle(agent_input) -> agent_output` runs natively in-process under Python 3.11+ without Node.js subprocess overhead.
   - The Next.js frontend (`src/`) is preserved as an optional visual dashboard and capture testing UI, but is decoupled from competition execution.

2. **P0 Security & Contract Hardening:**
   - **S1 Multi-Tenant Isolation:** Enforced strict `org_id` validation in `agents/prep/core/security.py: TenantGuard`. Cross-tenant requests are refused with `LookupError` (HTTP 404 / `AgentRejected`).
   - **D1 Photo Boundary Enforcement:** Enforced strict indexing bounds via `PhotoBoundaryValidator`. Out-of-bounds or missing photo citations drop strictly to `verdict: UNCERTAIN` with `uncertain_reason: "insufficient_evidence"`.
   - **S2 Trusted Policy Rules:** Caller-supplied criteria flags in the payload are stripped; rules are loaded exclusively from server-side catalog definitions and authoritative FBA guidelines.
   - **C1 Canonical Record ID:** Replaced non-compliant `PREP-...` identifiers with canonical `PRP-...` prefixes conforming to schema pattern `^(RCV|PRP|PCK|RTN|RCY)-`.
   - **C2 Strict Verdict Enums:** Eliminated illegal `NOT_APPLICABLE` and `NOT_VERIFIABLE` enums. Only `PASS`, `FAIL`, and `UNCERTAIN` are emitted; non-applicable checks are omitted.

3. **Customer-First Innovations:**
   - **Unplanned FBA Fee Defense Pack:** Generates pre-drafted seller dispute dossiers (`dispute_defense_pack`) inside `evidence.payload` citing verbatim Amazon policies and visual SHA-256 seals.
   - **High-Risk Sensitivity Safety Valve:** Automatically flags pharmaceuticals, dietary supplements, ingestibles, and baby products, pausing for supervisor human review (`verdict: UNCERTAIN`, `needs_human: True`).
   - **Weight & Dimension Measurements (Finding F-07):** Captures physical weight and millimeter dimensions in `payload.measurements` to empower the downstream Recovery Manager to claim unwarranted weight-tier fee overcharges.
   - **Durable Idempotency:** Implemented atomic SQLite request store in `agents/prep/request_store.py` preventing duplicate model inference fees.
