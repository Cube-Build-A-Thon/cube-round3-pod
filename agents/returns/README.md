# agents/returns/  ·  Returns Manager

**Owner:** Member 4 (Returns Manager) (`@VrajeshChary`)

The Returns Manager inspects returned parcels and customer returns against the product catalog and customer order details. It adapts the Round 3 Agent Contract (`EVIDENCE-CONTRACT.md`) to five specialized inspection engines under `agents/returns/core/agents/`:

1. **VisionAgent**: Analyzes return parcel imagery using Google Gemini / OpenRouter multimodal vision (with PIL image quality guard and strict offline uncertainty fallback).
2. **IdentityAgent**: Compares physical return evidence against ordered SKU/ASIN using 5-dimensional semantic product matching (category, components, brand, SKU metadata, visual features).
3. **CompletenessAgent**: Evaluates Bill of Materials (BOM) components and detects missing critical or minor components.
4. **ConditionAgent**: Grades return condition strictly using Amazon's official published condition scale (`New`, `Used - Like New`, `Used - Very Good`, `Used - Good`, `Used - Acceptable`, `Unacceptable`, or `UNCERTAIN`).
5. **DispositionAgent**: Commercial policy decision engine mapping inspection findings to dispositions (`restock`, `refurbish`, `liquidate`, `dispose`, or `pending_review`).

| | |
|---|---|
| **Reads (inputs)** | `request["inputs"]` (photos/captures of the return), `request["subject"]`, `request["context"]` |
| **Reads (previous evidence)** | Pack (what was sent / packed), Receiving (condition on arrival) |
| **Produces** | `identity_match`, `completeness`, `condition` checks and final `disposition` |
| **`check_key`s** | `identity_match, completeness, condition` |
| **`decision.outcome` values** | `restock, refurbish, liquidate, dispose, pending_review` |

## Operational Limits & Integration Blockers

1. **Image Reference Resolution & Evidence Integrity (Unresolved Platform Blocker)**:
   Input references (`inputs[].ref`) are treated as opaque identifiers. No approved resolver, signed URL provider, or object storage service exists in the repository. The adapter only inspects paths strictly contained inside `INPUT_DIR` after verifying against directory traversal (`..`) and symlink escapes; it never searches arbitrary workspace paths.

   To guarantee evidence integrity:
   - For each return image under `INPUT_DIR`, file bytes are read once into memory.
   - Its SHA-256 hash is computed from those exact bytes.
   - If `request.inputs[].sha256` is provided, it is compared against the computed hash. If it does not match, that image is not sent to `VisionAgent`, and an honest `UNCERTAIN` result is returned explaining that the evidence hash did not match.
   - The verified bytes are handed off directly to `VisionAgent` so the vision model analyzes the exact same bytes that were hashed, preventing TOCTOU file tampering.
   - Evidence record `inputs` and each check's `evidence_refs` are strictly limited to images whose verified bytes were actually analyzed. If any image is missing, unreadable, or fails hash validation, it is not claimed as analyzed.
   - Record IDs are deterministically derived from the full `request_id` in a collision-resistant manner using an `RTN-` prefix plus a SHA-256 digest (`RTN-<sha256>`).

2. **Multimodal Provider Batching Status**:
   Multiple return photos can be combined into a single multimodal payload (`model.calls: 1`) to synthesize multi-angle evidence. However, live multimodal provider batching has not been verified against an external live provider without credentials in this pass; offline execution operates with honest uncertainty and genuine fallback protection. Provider batching is not claimed unless actually verified with live credentials.

3. **Authoritative Tenant Ownership Source (Unresolved Architecture Blocker)**:
   There is no authoritative subject-to-organization mapping or enterprise tenant registry in the repository. Cross-checking against caller-supplied `previous_evidence` or synthetic `sample_data` does not provide an authoritative guarantee of tenant ownership. The adapter performs sanity checks to satisfy contract and test refusal requirements (`LookupError` → HTTP 404), but full enterprise tenancy enforcement remains an unresolved architectural decision requiring a platform tenant service.

## Structure

```text
agents/returns/
├── app.py          ← exposes handle(agent_input: dict) -> dict (Agent Output) and FastAPI app
├── agent.json      ← manifest (stage, agent_id: "returns-manager@1.0.0", owner: "@VrajeshChary")
├── PROVENANCE.md   ← Round 2 origin repo and commit tracking
├── README.md       ← this documentation
└── core/           ← Returns inspection engines
    ├── catalog.py  ← Verified product catalog & BOM specifications
    ├── models.py   ← Core domain models & schemas
    ├── utils.py    ← Normalization & domain heuristics
    └── agents/     ← Vision, Identity, Completeness, Condition, Disposition agents
```

## Running the Agent

Run standalone over HTTP:
```sh
uvicorn agents.returns.app:app --port 8104
curl localhost:8104/health
```
