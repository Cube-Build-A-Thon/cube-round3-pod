# CUBE Buildathon • Round 3 — Pod Integration Build

> **"Your goal is not to build five separate demos. Your goal is one connected, testable commerce system."**  
> *— Round 3 Participant Handbook*

[![Tests](https://img.shields.io/badge/pytest-contract%20%26%20workflow%20passing-brightgreen.svg)]()
[![Schema](https://img.shields.io/badge/evidence--contract-v1.0%20strict-blue.svg)]()
[![Pod Type](https://img.shields.io/badge/pod--type-Standard%20(5%20Agents)-purple.svg)]()
[![Tenancy](https://img.shields.io/badge/tenancy-strict%20multi--tenant%20isolation-success.svg)]()
[![Architecture](https://img.shields.io/badge/architecture-orchestrator--owned%20state-orange.svg)]()

---

## 1. Executive Summary

In Round 2, each specialist participant built an independent inspection or decision engine.  
In **Round 3**, **Pod 03** integrates these five agents into a **single, unified, and traceable commerce system** following units through the physical fulfillment lifecycle:

$$\text{Receiving} \longrightarrow \left[ \begin{array}{c} \text{FBA: Prep} \\ \text{MFN: Pack} \end{array} \right] \longrightarrow \text{If Returned: Returns} \longrightarrow \text{Recovery} \longrightarrow \textbf{Final Commerce Outcome}$$

### What Makes This System Stand Out
1. **One Authoritative Owner of State**: Agents never mutate global workflow state or hand off directly to each other. The Pod Orchestrator owns the state machine, validates outputs against strict JSON Schemas, manages idempotency, and derives the Final Commerce Outcome.
2. **Cryptographic Evidence & End-to-End Traceability**: Every decision walks backwards through an unbroken audit trail:  
   $$\textbf{Final Decision} \longrightarrow \textbf{Contributing Evidence Records} \longrightarrow \textbf{Individual Checks} \longrightarrow \textbf{Content-Hashed Input Captures (SHA-256)}$$
3. **Calibrated Honesty & First-Class Uncertainty**: `UNCERTAIN` is treated as a valid, honest verdict with documented reasons—never silently coerced into a low-confidence `PASS` or `FAIL`. Missing or ambiguous evidence triggers auditable human-review workflows.
4. **Resilient Failure Handling & Tenant Isolation**: Network timeouts, degraded agents, and invalid responses trigger explicit `pending` / `error` records. Requests across tenant boundaries (`org_id`) are rejected at the edge and in storage (`AgentRejected` / HTTP 404).

---

## 2. Pod Architecture & State Ownership

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      CUBE POD 03 ORCHESTRATOR (Authoritative State Owner)              │
 └───────┬───────────────────┬───────────────────┬───────────────────┬────────────────────┘
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ Receiving │       │   Prep    │       │   Pack    │       │  Returns  │
   │  Manager  │       │  Manager  │       │  Manager  │       │  Manager  │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │ (FBA Route)       │                   │ (MFN Route)       │ (If Returned)
         └─────────┬─────────┴───────────────────┴─────────┬─────────┘
                   │                                       │
                   └───────────────────┬───────────────────┘
                                       ▼
                             ┌───────────────────┐
                             │ Recovery Manager  │  (Audits Channel Fee Reports)
                             └─────────┬─────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │     Final Commerce Outcome    │
                       │  (Evidence Chain + Overrides) │
                       └───────────────────────────────┘
```

### The State Ownership Invariant
- **Agents do not talk to agents**: All communication is brokered by the orchestrator.
- **Agents do not mutate state**: An agent outputs judgments (`verdict`), confidence, and an **Evidence Record**. The orchestrator decides transitions (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` / `BLOCKED` / `RECOVERY_REQUIRED`).
- **Append-only override trail**: Human operator overrides never overwrite existing records; they create an explicit override object referencing `supersedes: {record_id, override_id}` with actor, timestamp, and rationale.

---

## 3. Pod Roster & Agent Registry (`pod.json`)

Pod 03 operates as a **Standard Pod** with five integrated agents:

| Stage | Agent ID | Owner | Role & Primary Responsibility | Implementation & Model |
|---|---|---|---|---|
| **Receiving** | `receiving-manager` | `@RECEIVING_DEV_HANDLE` | Supplier PO verification, count reconciliation, carton integrity | Remote FastAPI service (`/run`) with image base64 pipeline |
| **Prep** | `prep-manager` | `@dhanvind360` | Amazon FBA packaging inspection (polybag, suffocation, FNSKU, barcode coverage, expiry, handling marks, measurements) | **Gemini 3.6 Flash** multimodal AI agent with calibrated rules & fallback (~55MB base footprint) |
| **Pack** | `pack-manager` | `@PACK_DEV_HANDLE` | Merchant-fulfilled (MFN) carton validation & packing list verification | Multi-item carton inspection adapter |
| **Returns** | `returns-manager` | `@RETURNS_DEV_HANDLE` | Customer return condition grading & disposition recommendation (restock, refurbish, liquidate, dispose) | Vision-based grading adapter |
| **Recovery** | `recovery-manager` | `@saif8671` *(Coordinator)* | Channel fee dispute engine auditing charges against upstream evidence | Fee line matcher evaluating `CONTRADICTS`, `SUPPORTS`, or `SILENT` |

---

## 4. Evaluation Rubric Alignment (100 Points)

This repository is built from the ground up to satisfy all nine fixed criteria in the **Round 3 Evaluation Rubric**:

### Criterion 1: End-to-End Integration (15 Pts)
- **Real Multi-Stage Execution**: Units traverse the entire pipeline from inbound receiving to fee recovery.
- **Dynamic Fulfillment Routing**:
  - **FBA Path**: Units follow `Receiving -> Prep -> Recovery`. Pack is cleanly skipped with an explicit skip record.
  - **MFN Path**: Units follow `Receiving -> Pack -> Recovery`. Prep is cleanly skipped.
  - **Return Path**: Returns stage executes conditionally only if `subject.returned == true`.
- **Reproducible**: Verified by `tests/e2e/test_examples.py` and live orchestrator runs under `out/workflows/`.

### Criterion 2: Agent Interoperability (10 Pts)
- **Strict Envelope Compliance**: Every output validates against `shared/schemas/agent-output.schema.json` and `evidence-record.schema.json`.
- **Evidence Consumption**: Downstream stages genuinely consume prior evidence. For instance, **Recovery Manager** inspects Prep's packaging verdict and measurements to refute Amazon Inbound Defect fees.
- **Upstream References**: Every produced record lists its consumed predecessors in `upstream_refs: [...]`.

### Criterion 3: Orchestration & State Machine (10 Pts)
- **Authoritative Transitions**: The orchestrator (`orchestration/engine.py`) enforces deterministic transitions between `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, and `FAILED`.
- **Policy Enforcement**: `on_uncertain` and `on_error` policies are declared in `orchestration/flow.json` and documented in [`docs/decisions.md`](docs/decisions.md).
- **Idempotency & Resume**: Re-running a `request_id` produces identical `record_id`s; interrupted workflows can resume from prior evidence stored in `MemoryStore` or disk.

### Criterion 4: Decision Quality & Fee Dispute Logic (15 Pts)
- **No Claims on Silent Evidence**: Recovery strictly refrains from disputing fees when upstream evidence is silent or absent, preventing costly seller penalties.
- **Prep Measurements (Finding F-07)**: Inbound packaging records capture physical weight and dimensions in `payload.measurements`, giving Recovery proof to challenge dimensional-weight surcharges.
- **Quantified Honesty**: Per-check confusion matrices and false-positive/negative rates are documented in [`docs/evaluation.md`](docs/evaluation.md).

### Criterion 5: Evidence & Cryptographic Traceability (15 Pts)
- **Content Hashing**: Every evidence record calculates a SHA-256 `content_hash` over its normalized fields using `shared.utils.hashing.seal()`.
- **Unbroken Audit Chain**: A reviewer can click from the final dispute recommendation back to individual checks and source photo URLs.
- **Immutable History**: Overrides never rewrite history; original records remain intact and verifiable.

### Criterion 6: Reliability & Error Handling (10 Pts)
- **Graceful Degradation**: Network or agent timeouts return structured `pending_output` envelopes instead of crashing the orchestrator.
- **Failure Visibility**: Failures never masquerade as clean successes. Injected failures result in `FAILED` or `BLOCKED` status.
- **Multi-Tenant Security**: Calling an agent with mismatched tenant credentials (`org_id`) triggers `LookupError` $\rightarrow$ `AgentRejected` (HTTP 404).

### Criterion 7: UX & Demo (10 Pts)
- **Live Streamlit Dashboard (`ui.py`)**: A human-friendly operator dashboard showing live workflow states, step-by-step evidence trails, and human-in-the-loop review queues.
- **Interactive Agent Portal**: Prep Manager provides a live browser-based visual inspection portal at `agent/portal.html`.

### Criterion 8: Engineering Quality (10 Pts)
- **Clean Clone Guarantee**: Runs out of the box with `make setup && make test && make run`.
- **Zero Committed Secrets**: `.env` is strictly git-ignored; only clean `.env.example` templates are tracked.
- **Cost Efficiency**: Multimodal vision calls use `gemini-3.6-flash` costing under **$0.0005 per unit**, well within Amazon prep margins ($0.40–$1.10).

### Criterion 9: Team Collaboration (5 Pts)
- **Role Ownership**: Clear division of responsibilities in `pod.json` and `.github/CODEOWNERS`.
- **Collaborative Architecture**: Key architectural decisions documented in [`docs/decisions.md`](docs/decisions.md) and [`docs/build-log.md`](docs/build-log.md).

---

## 5. Quick Start (Judge Verification Guide)

Follow these steps to reproduce the system on a clean machine:

### Prerequisites
- Python 3.11+
- Git

### 1. Setup Environment
```bash
git clone https://github.com/Yaser-123/cube-round3-pod.git
cd cube-round3-pod
make setup
```

### 2. Run Test Suite
Execute the full contract, workflow, and failure-injection test suite:
```bash
make test
```
*To test individual agent contracts:*
```bash
pytest tests/integration/test_agent_contracts.py -k prep -v
```

### 3. Run Sample Workflows
Execute end-to-end commerce flows across sample units:
```bash
make run
```
*Outputs are saved to `out/workflows/` and `out/evidence/`.*

### 4. Run a Single Workflow
Execute a specific unit end-to-end and display the resulting evidence chain:
```bash
make case UNIT=UNIT-0014 ORG=org_demo_alpha
```

### 5. Launch the Live Orchestrator UI
Inspect workflows and evidence in the interactive operator UI:
```bash
streamlit run ui.py
```

---

## 6. Demonstrated Commerce Scenarios

The system handles five core commerce situations:

```text
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│ Scenario                        │ Workflow Path                   │ Key Invariant Demonstrated      │
├─────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│ 1. Compliant Inbound FBA Unit   │ Receiving ➔ Prep ➔ Recovery     │ All checks PASS; no fee dispute │
│ 2. Prep Exception & Defect Fee  │ Receiving ➔ Prep ➔ Recovery     │ Prep FAIL; Recovery CONTRADICTS │
│ 3. Merchant-Fulfilled Order     │ Receiving ➔ Pack ➔ Recovery     │ Prep skipped; Pack executes     │
│ 4. Customer Return Inspection   │ Receiving ➔ Returns ➔ Recovery  │ Returns grades disposition      │
│ 5. Ambiguous / Obscured Label   │ Receiving ➔ Prep (UNCERTAIN)    │ Workflow BLOCKED for human review│
└─────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

## 7. Security, Cost & Engineering Standards

- **Tenant Isolation**: Every request, record, and database lookup requires an `org_id`. Cross-tenant queries are refused with `AgentRejected`.
- **Model Call Batching**: Agents batch multi-check inspections into a single LLM/vision inference call per unit.
- **Deterministic Record IDs**: Uses deterministic IDs (e.g. `PRP-UNIT-0014`) to guarantee idempotency.
- **Fail-Open Policy**: Model inference failures generate a `pending` Evidence Record with `retryable=true` rather than unhandled Python exceptions.

---

## 8. Repository Documentation Map

| Document | Description |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Comprehensive system architecture, state diagrams, and invariants |
| [`EVIDENCE-CONTRACT.md`](EVIDENCE-CONTRACT.md) | Formal specification of Evidence Records, hashes, and checks |
| [`INTEGRATION-GUIDE.md`](INTEGRATION-GUIDE.md) | Agent hand-off model, payload schemas, and adapter instructions |
| [`ORCHESTRATION-GUIDE.md`](ORCHESTRATION-GUIDE.md) | State machine transitions, error handling, and flow configuration |
| [`docs/decisions.md`](docs/decisions.md) | Architectural decision records (ADRs) and trade-off rationales |
| [`docs/build-log.md`](docs/build-log.md) | Day-by-day integration chronicle of Pod 03 |
| [`docs/evaluation.md`](docs/evaluation.md) | Detailed metrics, per-check confusion matrices, and cost analysis |

---

<div align="center">
  <sub>Built with precision by <strong>Pod 03</strong> for the <strong>CUBE Buildathon Round 3</strong>.</sub>
</div>
