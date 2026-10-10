# Evaluation · Pod 15 (Specialist)

What was measured, how, and what it does **not** show. Numbers come from a reproducible run; nothing here is
hand-picked.

## Method

- **System under test:** `main` after the merge repair (Receiving, Pack, Returns, Recovery: the Pod's real agents),
  Specialist flow `orchestration/flow.specialist.json` (no Prep).
- **Units:** all 100 sample cases in `data/sample/cases.json`.
  - Routes: 62 FBA (15 returned), 29 MFN (9 returned), 9 unknown.
  - Tenants: `org_demo_alpha` and `org_demo_bravo`.
- **Conditions:** offline, **no model API keys**, as in CI and a judge's fresh clone. Pack and Returns therefore cannot run their vision models and must fail open.
- **How to reproduce:**
  ```sh
  python -m orchestration.run --all          # or the MemoryStore loop used for this table (3.8 s)
  ```
- **Ground truth:** none. The sample CSVs carry dummy flags and there are no human labels for these units, so
  **no accuracy, TP/TN/FP/FN or precision is claimed here.** This page reports behaviour and rates only.

## Results (100 units, offline)

| Workflow status | Units | | Final outcome | Units |
|---|---|---|---|---|
| COMPLETED | 47 | | CLEAN | 27 |
| BLOCKED (awaiting a person) | 53 | | EXCEPTION | 19 |
| FAILED | **0** | | CLAIM_RECOMMENDED | 1 |
| | | | NEEDS_REVIEW | 53 |

| Stage | Ran on | PASS | FAIL | UNCERTAIN | UNCERTAIN rate | Main `uncertain_reason` |
|---|---|---|---|---|---|---|
| Receiving | 100 | 55 | 41 (38 accept-with-exceptions, 3 reject) | 4 | 4 % | `poor_image` |
| Pack | 29 (MFN) | 0 | 0 | 29 | **100 %** | `model_error` (no key) |
| Returns | 24 (returned) | 0 | 0 | 24 | **100 %** | `insufficient_evidence` (no photos) |
| Recovery | 100 | 56 (`no_claim`) | 1 (`claim_recommended`) | 43 (`insufficient_evidence`) | 43 % | `insufficient_evidence` |

## What this shows

1. **No hidden failures.** 0 of 100 workflows crash or end FAILED. Every agent that cannot judge returns an
   UNCERTAIN record with a reason, and the workflow waits for a person (BLOCKED / NEEDS_REVIEW). It is never
   reported as CLEAN.
2. **Missing Prep is handled honestly (Specialist Pod).** Recovery never claims an inbound-defect fee without Prep
   evidence; those charges stay SILENT (`insufficient_evidence`), as required by handbook section 9.
3. **One claim is recommended (UNIT-0071).** It cites the upstream evidence it relied on (`upstream_refs`).

## What this does not show (limits)

- **Pack and Returns judge nothing offline.**
  - All 53 BLOCKED workflows come from Pack (29: no key) or Returns (24: no return photos for 23 of 24 units).
  - Their real behaviour needs model keys (deployment only, never committed) **and** photos in `data/input/<unit>/<stage>/`.
  - The repo has photos for only 2 units.
- **No labelled ground truth.** Per-check accuracy, false positives and false negatives are not measured. The
  next step is to label at least the units with photos (two people, independently) and report TP/TN/FP/FN per check.
- **Synthetic data.** The sample CSV values are dummy data from the organisers.
- `tests/e2e/test_examples.py` checks the documented example outcomes with **fake** agents (see D-009). The
  real-agent workflows are covered by `tests/e2e/test_specialist_pod.py`.

## Tests backing these claims

`tests/e2e/test_specialist_pod.py` runs the real agents offline:
- clean (UNIT-0010);
- exception (UNIT-0004);
- claim (UNIT-0071);
- inbound fee SILENT without Prep (UNIT-0014);
- UNCERTAIN → BLOCKED → human override with the original evidence intact (UNIT-0008);
- injected agent failure → FAILED, never success;
- wrong-tenant output rejected (`tenant_mismatch`);
- each real agent refusing another tenant's subject.

## Pack Manager (Live Deployment Results)

| Unit | What's in the box | Pack verdict | Model calls | Cost | Time |
|---|---|---|---|---|---|
| UNIT-0008 | 1 wine bottle (order: 1 bottle) | PASS → seal ✅ | 3 | $0.00019 | 30 s |
| UNIT-0019 | 1 blue towel (order:1 towel) | PASS → seal ✅ | 4 | $0.00019 | 62 s |
| UNIT-0022 | serum + an extra rabbit toy | FAIL → stop and fix ✅ | 4 | $0.00019 | 87 s |
| UNIT-0016 | 2 blue towels | PASS → seal ✅ | 3 | $0.00019 | 46 s |


