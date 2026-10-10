# Architecture

This document describes the **starter**. At the bottom is a section for **your Pod's architecture**, which you must fill in and which is part of the submission. A submission whose `ARCHITECTURE.md` still only describes the starter has not documented its system.

## 1. The system

```text
                POD
                 │
       ┌─────────▼─────────┐      owns workflow state; derives status and final outcome from the evidence chain
       │    Orchestrator   │      routes · validates · records evidence · retries · handles failures and UNCERTAIN
       └─────────┬─────────┘
                 │  Agent Input ▼          ▲ Agent Output (evidence)
       ┌─────────▼─────────┐
       │     Receiving     │
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │       Prep        │   (FBA units)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │       Pack        │   (merchant-fulfilled / 3PL units)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │      Returns      │   (if a return happened)
       └─────────┬─────────┘
                 ↓
       ┌───────────────────┐
       │     Recovery      │   reads ALL accumulated evidence
       └─────────┬─────────┘
                 ↓
          Final Outcome        derived by the orchestrator, not copied from any agent

  shared/schemas · shared/contracts · shared/utils      data/input · data/sample · data/expected      examples/
```

The arrows show the *expected commerce journey*. Physically, every hand-off goes through the orchestrator ([`INTEGRATION-GUIDE.md`](INTEGRATION-GUIDE.md) section 1).

## 2. Responsibilities

| Component | Responsible for | Not responsible for |
|---|---|---|
| **Agent** (`agents/<stage>/`) | One stage's judgment, returned as an Agent Output with an Evidence Record. Failing open. Refusing other tenants. | Calling other agents. Setting workflow state. Rewriting earlier evidence. |
| **Orchestrator** (`orchestration/`) | Starting workflows; identifying the current stage; invoking agents with context; validating and recording evidence; updating state; routing; retries; failures; UNCERTAIN; the final outcome. | Making stage judgments. Fabricating or deleting evidence. Turning UNCERTAIN into PASS/FAIL without an explicit rule. |
| **Contract** (`shared/schemas/`) | One strict set of data shapes. | Agent-specific logic (that goes in `payload`). |
| **Stubs** (`agents/*/app.py` as shipped) | Replaying Round 2 CSV rows as valid evidence, so the plumbing can be tested. | Pretending to be agents. |

## 3. Shared data

| Object | Owner | Lives in |
|---|---|---|
| Evidence Record | the agent that produced it (immutable) | the evidence store |
| Workflow State | **the orchestrator** | the workflow store |
| Overrides | the orchestrator records them; a person makes them | Workflow State (`overrides[]`), referencing evidence |
| Final Outcome | **the orchestrator**, derived | Workflow State (`final_outcome`) |
| Captures | the Pod | `data/input/<subject>/<stage>/`, referenced by `sha256` |

## 4. Evidence flow and workflow state

```text
Agent Result → Evidence Record → Orchestrator state transition → Next stage → New evidence → Updated workflow state → Final Outcome
```

- Each stage's evidence is stored and passed to **every later stage** as `previous_evidence`.
- State is `PENDING → IN_PROGRESS → COMPLETED`, or `FAILED` / `BLOCKED` / `RECOVERY_REQUIRED` ([`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 5), always derived from the evidence and overrides.
- `transitions[]` is the audit trail.
- A reviewer can walk from the Final Outcome to `contributing_records`, to checks, to `evidence_refs`, to the `sha256` of the exact bytes examined.

## 5. Error handling

Every failure is **recorded and never becomes success**: a degraded evidence record stands in (no checks, UNCERTAIN, the error), the stage is `error`, the workflow `FAILED` with outcome `INCOMPLETE`. Transient failures retry; refusals and invalid output do not; UNCERTAIN is preserved; `resume` retries. Full table: [`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 8. Tenancy: `org_id` on every request, record and workflow; a record about another org is rejected as a security event; **your storage must enforce it too**.

## 6. Final outcome

`CLEAN`, `CLAIM_RECOMMENDED`, `EXCEPTION`, `NEEDS_REVIEW` or `INCOMPLETE`, with the reason, the contributing evidence, `needs_human`, and `provisional` (true unless the workflow is `COMPLETED`). Default rules: [`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) section 6.

## 7. What is fixed and what is yours

**Fixed (the contract, strict):**

- The five required agents and their stages (Specialist Pods: four agents plus integration work, see [`FAQ.md`](FAQ.md))
- Common evidence requirements: the Agent Input/Output and Evidence Record shapes; PASS / FAIL / UNCERTAIN; the status vocabularies
- Required traceability: workflow id, agent id, hashes, `upstream_refs`, overrides that reference what they supersede
- An orchestrator that owns workflow state and produces a **Final Outcome**
- Minimum testing, and the submission and evaluation requirements ([`SUBMISSION-GUIDE.md`](SUBMISSION-GUIDE.md), [`ROUND3-RUBRIC.md`](ROUND3-RUBRIC.md))

**Participant-designed (the implementation, flexible):**

- Internal architecture, programming language, frameworks, how each agent is built
- How the orchestrator is implemented (the starter is one option; LangGraph, a queue, a state machine, your own)
- The communication mechanism (in-process, HTTP, queue) as long as the contract holds
- Database, persistence, deployment platform
- UI, review queue, dashboards
- Additional services, additional features
- The final-outcome policy, routing and `on_uncertain` / `on_error` policies (documented in `docs/decisions.md`)

## 8. Extension points

| You want to… | Change |
|---|---|
| Add or reroute a stage | `orchestration/flow.json` (and write a decision) |
| Change the final decision or status rules | `orchestration/rollup.py` (and its tests, and a decision) |
| Plug in a real agent | `agents/<stage>/app.py` + `agent.json` |
| Run an agent as a service in any language | `agent.json` `mode: "http"` + [`agent-api.md`](shared/contracts/agent-api.md) |
| Run your own subjects | `data/input/<subject>/<stage>/` + a cases file |
| Add agent-specific data to evidence | `payload` (never the envelope) |
| Persist to a database | implement the four store methods in `orchestration/store.py` |

## 9. Deployment options (yours)

- **Single process:** `uvicorn orchestration.api:app` with all agents `inproc`. Simplest.
- **Orchestrator + agent services:** each agent its own process, `mode: "http"`, `<STAGE>_URL` set; `GET /health` for readiness.
- Whatever you pick, the demo runs from the submitted commit and any URL works without your accounts. The API ships with **no authentication**: add it before exposing it.

---

---

## Your Pod's Architecture

### 1. System Overview and Topology

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Frontend Dashboard (:5173)                                  │
│                 Interactive React/Vite UI · Trace Visualizer · Human Override Queue           │
└───────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                │ REST API / Vite Proxy
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FastAPI Orchestrator (:8100)                                  │
│             owns workflow state · advances stages · enforces tenancy · stores evidence        │
│          derives status & final outcome via D-007 precedence · manages append-only overrides │
└───────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────┘
        │                      │                      │                      │
        ▼                      ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Receiving   │      │ Prep: NOT IN  │      │  Pack (MFN)   │      │   Recovery    │
│    Manager    │      │  FLOW (Spec.  │      │    Manager    │      │    Manager    │
│ (Real Agent)  │      │  Pod, stub)   │      │ (Real Agent)  │      │ (Real Agent)  │
└───────────────┘      └───────────────┘      └───────────────┘      └───────────────┘
                               ▲                      ▲
                               │                      │
                               └──────────┬───────────┘
                                          │
                               ┌──────────┴────────────────────────────────┐
                               │       Returns Manager (Real Agent)        │
                               │   multi-image conflict · damage negations │
                               │         Google GenAI Multimodal           │
                               └──────────────────┬────────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
       ┌───────────────────┐            ┌───────────────────┐            ┌───────────────────┐
       │   Vision Agent    │            │  Identity Agent   │            │Completeness Agent │
       │ multimodal vision │            │  catalog matching │            │conflict resolution│
       └───────────────────┘            └───────────────────┘            └───────────────────┘
                 │                                                                 │
                 ▼                                                                 ▼
       ┌───────────────────┐                                             ┌───────────────────┐
       │  Condition Agent  │                                             │ Disposition Agent │
       │ packaging vs item │                                             │final item action &│
       │ damage negations  │                                             │review escalation  │
       └───────────────────┘                                             └───────────────────┘
```

### 2. Specialist Pod Composition and Agent Status

Our Pod operates as an official **Specialist Pod** (`pod.json`, `orchestration/flow.specialist.json`), comprising four operational agents and one dedicated Specialist seat:

| Role / Agent | Owner | Status | Implementation Details |
|---|---|---|---|
| **Receiving Manager** | `@GURUTEJGANAPURAPU` | **Integrated** | Authoritative team implementation (`agents/receiving/`). Ingests ASN and physical pallet/box evidence, validates barcodes, PO alignment, and physical condition. |
| **Specialist / Integration Engineer** | `@kl2400033283` | **Active Role** | Fills the fifth seat (Prep omitted in Specialist flow `specialist-no-prep-v1`); orchestration coordinator. Responsible for cross-agent evidence contracts, orchestration consistency, end-to-end and failure tests (`tests/e2e/test_specialist_pod.py`) and evaluation (`docs/evaluation.md`). |
| **Pack Manager** | `@devikasingh098` | **Integrated** | Authoritative team implementation (`agents/pack/`). Manages merchant-fulfilled / 3PL packaging, box selection, label compliance, and shipping carrier handoff. |
| **Returns Manager** | `@VrajeshChary` | **Production Multi-Agent** | Complete multi-agent engine (`agents/returns/`):<br>• **VisionAgent:** Multimodal image inspection with real Gemini GenAI analysis (needs a key and return photos; without them every check is UNCERTAIN, see `docs/evaluation.md`) and honest uncertainty fallback without filename heuristics.<br>• **IdentityAgent:** Resolves catalog products by SKU/ASIN across 5 semantic dimensions.<br>• **CompletenessAgent:** Resolves multi-image evidence and missing component conflicts.<br>• **ConditionAgent:** Amazon published condition grading; separates box damage from item damage.<br>• **DispositionAgent:** Canonical warehouse routing (`restock`, `refurbish`, `liquidate`, `dispose`, `pending_review`). |
| **Recovery Manager** | `@Nithesh33758` | **Integrated** | Authoritative team implementation (`agents/recovery/`). Cross-references shipping, fee, and defect records against accumulated upstream evidence to calculate audit recoveries. Under Specialist flow, missing Prep evidence for inbound fees is treated as silent (no false claims). |

### 3. Orchestration and State Management

- **State Engine:** `orchestration/orchestrator.py` advances the pipeline through `advance()`, `resume()`, and `apply_override()`.
- **Workflow State & Evidence Store:** `FileStore` in `orchestration/store.py` stores workflows atomically (`out/workflows/*.json`) and immutable evidence (`out/evidence/*.json`).
- **Traceability:** Every final outcome points to `contributing_records`, which point to `evidence_refs`, checks, and content-addressed SHA-256 hashes of examined inputs.
- **Overrides:** Submitted via `apply_override()` (or `POST /workflows/{id}/overrides`). Overrides are append-only entries referencing the superseded record ID, previous verdict, and new verdict. The latest override wins when computing effective state.

### 4. Routing and Final-Outcome Logic (Decision D-007)

Routing is dynamically defined in `orchestration/flow.specialist.json` (`specialist-no-prep-v1`):
- Receiving evaluates initial parcel arrival.
- Prep is omitted: FBA units do not generate Prep evidence; Recovery silently skips inbound-defect fee disputes when Prep evidence is absent.
- MFN units route to Pack when `route == "mfn"`.
- Returns runs when `returned: true`.
- Recovery evaluates all upstream evidence to determine claim eligibility.

Under **Decision D-007** ([`docs/decisions.md`](docs/decisions.md)), the Pod refined the final outcome derivation in `orchestration/rollup.py`:
1. `INCOMPLETE`: Any required stage did not complete (error or pending).
2. `NEEDS_REVIEW`: Any stage requests human review (`needs_human: True`).
3. `CLAIM_RECOMMENDED`: Recovery effective verdict is FAIL (contradicted charge; claimable amount calculated).
4. `EXCEPTION`: Any stage's effective verdict is FAIL without a claim.
5. `CLEAN`: All applicable stages passed cleanly.

This strictly separates the warehouse operational disposition (`restock`, `refurbish`, `liquidate`, `dispose`, `pending_review`) from the higher-level Pod outcome (`CLEAN`, `CLAIM_RECOMMENDED`, `EXCEPTION`, `NEEDS_REVIEW`, `INCOMPLETE`).

### 5. Tenancy & Security

- Every request and evidence record carries `subject.org_id`.
- Orchestrator validates tenant alignment in `_validate()` and rejects mismatches with `tenant_mismatch`.
- Agents reject cross-tenant requests with HTTP 404 / `AgentRejected`. Returns Manager also validates that upstream evidence does not cross tenant boundaries.
- No secrets or credentials are hardcoded or tracked in git; local credentials use `.env` (git-ignored).

### 6. Failure & Reliability Model

- **Retries:** Transient failures (`AgentTimeout`, `AgentUnavailable`) are automatically retried up to `defaults.retries` (default: 1 retry).
- **Graceful Degradation:** Terminal failures (exceptions, schema errors, wrong tenant) produce degraded evidence records (`pending_output`) with status `error`.
- **Integrity Rule:** A workflow with an error or incomplete stage **NEVER** silently reports `COMPLETED` or `CLEAN`.
- **Resumption:** `resume()` retries only errored or pending stages while preserving completed evidence.

### 7. Deployment & Running

- **Backend API:** Run `python -m uvicorn orchestration.api:app --port 8100`.
- **Frontend UI:** Run `cd frontend && npm run dev` (available at `http://localhost:5173`, proxied to `:8100`).
- **Full Test Suite:** Run `python -m pytest -q`.

### 8. Verification and Compliance

- **Specialist Flow:** All active components validated against Handbook pp. 4, 9 (`specialist-no-prep-v1`).
- **Live Multimodal Inspection:** Interactive image upload at `POST /returns/inspect` directly invokes Gemini multimodal vision and renders authoritative checks in the frontend without business logic drift.
- **Contract Adherence:** Zero synthetic dispositions (no `reject`); canonical warehouse dispositions preserved across all layers.
