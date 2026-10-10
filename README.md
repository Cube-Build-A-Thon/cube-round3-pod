# Cube Buildathon · Round 3 · Pod 15 (Specialist)

**Commerce Context stream · Round 3 · Pod build**

This repository contains the final integrated commerce system for **Pod 15**. We have successfully connected four independent agents into one end-to-end workflow capable of processing commerce units from Receiving to Final Outcome.

## Live Demo

Our orchestrator and agents are deployed live! You can interact with the system here:
**[https://odysseuslabs.vercel.app](https://odysseuslabs.vercel.app)**

## What We Built

We implemented a **Specialist Flow**:
`Receiving → Pack (MFN) → Returns (if returned) → Recovery → Final Outcome`

Our Pod comprises four operational agents and one dedicated Specialist seat:

| Member / Role | Owner | Agent / Component | Folder / Manifest |
|---|---|---|---|
| 1 | `@nithesh33758` | Receiving Manager | `agents/receiving/` |
| 2 | `@VrajeshChary` | Specialist / Integration Engineer | Integration Lead & Prep Seat (`agent: null`) |
| 3 | `@devikasingh197` | Pack Manager | `agents/pack/` |
| 4 | `@VrajeshChary` | Returns Manager | `agents/returns/` |
| 5 | `@nithesh33758` | Recovery Manager | `agents/recovery/` |

In our Specialist flow (`specialist-no-prep-v1`), Prep is intentionally omitted from active routing. Recovery evaluates all accumulated upstream evidence and treats missing Prep evidence for inbound fees as silent (preventing false claims).

## How to Run Locally

You can run the full system using the real agents (with appropriate model API keys). Requires Python 3.11+.

```sh
make setup            # venv + dependencies + .env
make test             # integration, end-to-end, failure, UNCERTAIN, override and HTTP tests
make case UNIT=UNIT-0014 ORG=org_demo_alpha     # run one workflow, in full
make serve            # start orchestrator API on :8100 (POST /workflows, GET /workflows/{id}, GET /health)
```

**Note on Agents:**
This repository uses the real implementations for Receiving, Pack, Returns, and Recovery. Pack and Returns require visual model capabilities (API keys and photos in `data/input/`) to fully evaluate items, otherwise they will fail open (UNCERTAIN) gracefully.

## Results & Limits

Our system correctly processes all 100 sample workflows offline without any crashes (`0` FAILED workflows). We handle uncertainty gracefully; if an agent lacks the evidence (e.g., missing API keys or photos), it returns UNCERTAIN, and the orchestrator moves the workflow to `BLOCKED` or `NEEDS_REVIEW` to await a human override.

For live metrics on fully populated workflows (such as latency, model calls, and cost), see [`docs/evaluation.md`](docs/evaluation.md).
