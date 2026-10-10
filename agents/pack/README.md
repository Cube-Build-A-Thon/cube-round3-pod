# agents/pack/ · Pack Manager

**Owner:** Devika (@devikasingh098) — Pack Manager

> **Pack Manager** is a multimodal outbound packing verification agent. It checks an open shipping box against the expected order using visual evidence and AI-assisted inspection to identify missing items, quantity mismatches, and unexpected extras before the box is sealed.

---

## Capabilities & Architecture

| Feature                  | Detail                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| **Inputs**               | Expected order details and outbound box image evidence                    |
| **Multimodal Vision**    | Google Gemini analyzes supplied images against expected order information |
| **Verification Checks**  | `items_present`, `quantities_correct`, `no_extra_items`                   |
| **Outcomes**             | `seal`, `stop_and_fix`, `pending_review`                                  |
| **Evidence Handling**    | Validates evidence references and hashes and preserves traceability       |
| **Uncertainty Handling** | Preserves `UNCERTAIN` when visual evidence is ambiguous or insufficient   |
| **Tenant Isolation**     | Validates organization context to prevent cross-tenant data access        |
| **Integration**          | Runs in-process through the shared Round 3 orchestrator                   |
| **Failure Handling**     | Uses a review-pending outcome when inspection cannot be completed safely  |

---

## Output Contract & Payload

The Pack Manager implements the shared agent interface:

```python
handle(request: dict) -> dict
```

The agent evaluates the observed box contents against the expected order and returns structured verification results.

The final outcome follows these rules:

* **`seal`** — Required packing checks pass.
* **`stop_and_fix`** — A verified packing discrepancy requires correction.
* **`pending_review`** — Evidence is inconclusive or inspection cannot be completed reliably.

The agent uses visible evidence to support its findings. It must not invent missing items, quantities, or observations, and uncertain findings must not be silently converted into definitive failures.

---

## Architecture

1. **Request Validation** — Validates the incoming request and relevant organization context.
2. **Evidence Validation** — Checks supplied evidence references and associated hashes.
3. **AI Inspection** — Sends the expected order and available images to Gemini for a batched inspection.
4. **Result Normalization** — Converts inspection findings into structured packing checks.
5. **Decision Generation** — Determines whether the box can be sealed, needs correction, or requires manual review.
6. **Traceable Response** — Returns the result with relevant evidence and upstream references.

---

## How to Run

### In-Process (Default Pod Mode)

Pack Manager is invoked by the shared orchestrator through its `handle(request: dict)` entry point.

The agent configuration is located at:

```text
agents/pack/agent.json
```

Its integration metadata identifies the agent as `pack-manager@1` and configures it for in-process execution.

### Environment Configuration

Configure the Gemini API key using the environment setup expected by the project. Keep API keys out of source control.

### Standalone Testing

Run commands from the Round 3 repository root.

```sh
pytest tests/integration/test_agent_contracts.py -k pack
```

To run the complete test suite:

```sh
pytest
```

---

## Project Structure

```text
agents/pack/
├── agent.json
├── app.py
├── gemini.py
├── README.md
├── PROVENANCE.md
└── __init__.py
```

* **`app.py`** — Request handling, validation, result normalization, and decision generation.
* **`gemini.py`** — Gemini-powered visual packing inspection.
* **`agent.json`** — Agent identity and integration configuration.
* **`PROVENANCE.md`** — Implementation provenance and related project context.

---

## Design Principles

* **Evidence-first decisions:** Use supplied evidence rather than assumptions.
* **No invented observations:** Do not fabricate items, quantities, or visual findings.
* **Explicit uncertainty:** Escalate ambiguous evidence for review.
* **Safe failure handling:** Avoid authorizing sealing when verification cannot be completed reliably.
* **Traceability:** Keep relevant evidence references associated with inspection results.
* **Shared orchestration:** Integrate with the Round 3 pod rather than maintaining a separate frontend or orchestrator.
