# Decisions

Every non-obvious design choice gets one entry, so a reviewer can see **what you chose, why, and what you rejected.** Newest last. This is where *Decision quality* and *Orchestration* in the [rubric](../ROUND3-RUBRIC.md) are won or lost. It is not meant to become a long report: a few lines per decision.

Write an entry whenever you: change the flow or its policies; change how the orchestrator stores state or evidence; change the final-outcome or status rules; choose a communication mechanism; decide how retries and overrides work; pick a side on a **known finding** (below); add to the contract's `payload`; or choose a deployment shape.

## Template

```text
### D-NNN · Short title
- Date / Owner:
- Context: what forced a decision?
- Options considered: A, B, C
- Decision: what we chose
- Why: the evidence or reasoning
- Consequences: what gets easier / harder; what would make us revisit
```

## Questions your Pod's decisions should answer

- Why this orchestration approach, and who owns what in it?
- Why this communication mechanism (in-process, HTTP, queue)?
- How is workflow state stored, and how does it survive a restart?
- How are retries, timeouts and resume handled?
- How is evidence persisted, and how is its immutability enforced?
- How are overrides captured, referenced, and used downstream?
- What do we do about UNCERTAIN: continue or block, and who decides?
- How does the final outcome treat weak or uncertain evidence?

## Starter decisions (made by the organisers; change them with a new entry)

### D-000 · The default flow is routed, not strictly sequential
- Context: the Round 2 sample gives each unit a Prep record *or* a Pack record, never both, and Returns only for returned units.
- Decision: `flow.json` routes FBA units through Prep, merchant-fulfilled units through Pack, and runs Returns only when a return happened. A stage that does not apply is `skipped` with the reason recorded.
- Why: forcing every unit through all five stages would invent evidence. Units with neither route (F-12) skip both.

### D-001 · The orchestrator owns state; status and outcome are derived
- Decision: workflow status and final outcome are pure functions of the stored evidence and the overrides (`orchestration/rollup.py`). Agents return evidence and a recommendation; they never write state.
- Why: "the latest agent outcome" and "Recovery's reading of it" are not the source of truth; the traceable evidence chain is.

### D-002 · UNCERTAIN continues by default; blocking is a policy
- Decision: `on_uncertain: continue` by default; `block` halts only when the UNCERTAIN result asks for a person (`needs_human`). Either way the workflow is `BLOCKED` with outcome `NEEDS_REVIEW` until an override resolves it.
- Why: a warehouse line must not wait, and the evidence of later stages is not lost. Recovery's SILENT (UNCERTAIN, `needs_human: false`) must not halt anything.

### D-003 · Failures are recorded, never hidden; never success
- Decision: a failed stage gets a degraded evidence record (no checks, UNCERTAIN, the error) and the workflow ends `FAILED` / `INCOMPLETE` (`provisional`). `resume` retries it and keeps the failed attempt's evidence.

### D-004 · Overrides are workflow entries that reference evidence
- Decision: evidence is immutable. A person's override is appended to the workflow's `overrides` with actor, reason, timestamp, the record it supersedes, the previous effective verdict and the new one. The latest wins; downstream agents receive them in `context.overrides`.

### D-005 · Zero-amount reimbursements are not claimable (F-09)
- Decision: the Recovery stub treats a 0.00 line as SILENT. Why: claiming $0 is meaningless and the meaning of 0.00 is unresolved.

### D-006 · Field names (F-15)
- Decision: `check_key`, `detail`, `content_hash`, `latency_ms`, `client_id` follow the Round 2 Returns list; `org_id`, `operator_id`, `inputs`, `model.version` follow the CSVs. Mapping in [`EVIDENCE-CONTRACT.md`](../EVIDENCE-CONTRACT.md). Open for the organisers.

## Known findings carried over from Round 2

Round 2 participants raised these contradictions and gaps in the shared data and documents. They are **open**: the organisers will rule on them. Until then **do not silently pick a side**: add an entry above with your assumption, and design so that changing it is cheap. `F-07` to `F-12` match the issue numbers on the Round 2 Recovery repo.

| ID | Finding | Why it matters for integration | Source |
|---|---|---|---|
| **F-07** | 42 of 61 sample fee lines are `fulfilment_fee_weight_tier`, and no upstream sample records measured weight or dimensions. | Recovery can only mark these SILENT. Prep is the natural source: see `payload.measurements`. | [Recovery #7](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/7) |
| **F-08** | `unit_id` means a **PO line** in Receiving (RCV-0003: 48 ordered, 44 received) but a **single unit** in the fee report. UNIT-0003 is lost inbound, then charged a fulfilment fee, then returned: that cannot be one physical unit. | Joins on a bare id can be wrong. The contract adds `subject.unit_scope` and `subject.refs`. | [Recovery #8](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/8) |
| **F-09** | A `lost_inbound` adjustment is posted with `amount_usd` 0.00. "Not reimbursed" (a claim to raise) or "amount missing"? | The answer flips the verdict. See D-005. | [Recovery #9](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/9) |
| **F-10** | Receiving shortfalls are supplier-side and happen before goods reach the channel, so they cannot support a channel `lost_inbound` claim. | Keep supplier shortfall and channel loss separate in your decision logic. | [Recovery #10](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/10) |
| **F-11** | Returns records exist for FBA-routed units (UNIT-0003 has a Prep record **and** a seller-side Returns record). Do FBA returns come back to the seller or to the channel's warehouse? | Decides whether Returns evidence can contradict `refund_issued_item_not_returned`. | [Recovery #11](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/11) |
| **F-12** | 9 of the 100 sample units have neither a Prep nor a Pack record, although each unit is meant to take one route. | The starter marks these `route: "unknown"` and skips both stages. Recovery's SILENT rate depends on it. | [Recovery #12](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/12) |
| **F-13** | The Round 2 rules said the organisers would provide an official evidence contract. None was published, and one participant's v0 proposal was withdrawn pending it. | **Resolved for Round 3:** [`EVIDENCE-CONTRACT.md`](../EVIDENCE-CONTRACT.md) v1.0. | [Receiving #4](https://github.com/Cube-Build-A-Thon/cube-01-receiving-manager/issues/4), [Recovery #13](https://github.com/Cube-Build-A-Thon/cube-05-recovery-manager/issues/13) |
| **F-14** | The Round 2 repos do not all carry the same rules: Receiving, Prep and Recovery share one short `RULES.md`; Pack's differs in wording; Returns has a much longer one (field names, evaluation method, mandatory LinkedIn post) that also ends mid-sentence. | Round 3 carries over the **union**; the organisers should confirm which is authoritative and finish the truncated section (presumably how Round 2 counts towards the final result). | [Returns `RULES.md`](https://github.com/Cube-Build-A-Thon/cube-04-returns-manager/blob/main/RULES.md) |
| **F-15** | The only organiser-authored list of "official evidence contract" fields is in the Returns repo (`organization_id`, `operator_label`, `images`, …) and is "concepts such as", not a schema. The sample CSVs use `org_id`, `operator_id`. | v1.0 uses a mix; see D-006 and the note at the top of [`EVIDENCE-CONTRACT.md`](../EVIDENCE-CONTRACT.md). | [Returns README](https://github.com/Cube-Build-A-Thon/cube-04-returns-manager/blob/main/README.md) |

### Raising a new finding

A contradiction between documents or data is a **finding**, not a failure. Open an issue on your Pod's repo with the `finding` label: what contradicts what, an example row, and what you assumed (and add the assumption above). Good findings are credited under *Decision quality*.

## Your Pod's decisions

### D-007 · Final-outcome precedence in rollup and needs_human default in records
- Date / Owner: 2026-10-08 / @VrajeshChary
- Context: In `orchestration/rollup.py`, the old rollup could leave workflow status `BLOCKED` while `final_outcome` said `CLAIM_RECOMMENDED`. Specifically, `derive_status` marked the workflow `BLOCKED` when a stage requested human review (`needs_human: True`), but `derive_final_outcome` evaluated `rec_claim` first, returning `CLAIM_RECOMMENDED`. In addition, in `shared/utils/records.py`, `build_record` defaulted `decision["needs_human"]` only to `verdict == "UNCERTAIN"` when `needs_human` was omitted, which did not account for records with `outcome == "pending_review"` or individual checks with verdict `UNCERTAIN`.
- Options considered:
  - Option A: Retain the existing precedence in `derive_final_outcome` where `rec_claim` evaluated first, leaving workflow status `BLOCKED` while `final_outcome` reported `CLAIM_RECOMMENDED`. Rejected because integration tests expect a workflow awaiting human review to report final outcome `NEEDS_REVIEW` with verdict `UNCERTAIN`.
  - Option B: Require caller code to manually pass `needs_human=True` to `build_record` without changing `build_record` defaults or rollup precedence. Rejected because `derive_final_outcome` would still evaluate `rec_claim` ahead of review requests, leaving status `BLOCKED` with outcome `CLAIM_RECOMMENDED`.
  - Option C: Update `derive_final_outcome` so that incomplete stages produce `INCOMPLETE`; otherwise, a human-review request produces `NEEDS_REVIEW`; otherwise, the rollup considers a Recovery claim (`CLAIM_RECOMMENDED`), a failed stage (`EXCEPTION`), or a clean outcome (`CLEAN`). In `shared/utils/records.py`, update `build_record` so that when `needs_human` is omitted (`needs_human is None`), it defaults to `True` for an `UNCERTAIN` verdict, a `pending_review` outcome, or an `UNCERTAIN` check.
- Decision: Chose Option C. In `orchestration/rollup.py`, `derive_final_outcome` implements this precedence: incomplete stages produce `INCOMPLETE`; otherwise, a human-review request produces `NEEDS_REVIEW`; otherwise, the rollup considers a Recovery claim (`CLAIM_RECOMMENDED`), a failed stage (`EXCEPTION`), or a clean outcome (`CLEAN`). In `shared/utils/records.py`, `build_record` defaults `needs_human` to `True` for an `UNCERTAIN` verdict, a `pending_review` outcome, or an `UNCERTAIN` check only when `needs_human` is omitted (`needs_human is None`).
- Why: Human review produces `NEEDS_REVIEW` when there are no pending or errored stages. Incomplete stages still take precedence and produce `INCOMPLETE`. Also, `build_record` infers `needs_human` only when the caller omits it; explicit `True` or `False` values are preserved.
- Consequences: Incomplete stages produce `INCOMPLETE`; otherwise, any stage requesting review (`needs_human: True`) produces `NEEDS_REVIEW` (`UNCERTAIN`, `provisional: True`). Otherwise, the rollup proceeds to evaluate a Recovery claim, a stage failure, or a clean pass. Explicit boolean values passed for `needs_human` continue to be preserved.

### D-008 · Specialist Pod: no Prep, inbound-defect fees stay SILENT
- Date / Owner: 2026-10-10 / @kl2400033283 (Specialist / Integration Engineer)
- Context: The organiser roster for Pod 15 has no Prep Manager (two members are listed as Recovery Manager), so the Pod runs the Specialist flow.
- Decision: `pod.json` uses `pod_type: specialist` and `orchestration/flow.specialist.json` (Receiving → Pack (MFN) → Returns (returned) → Recovery). `agents/prep/` stays the unused organiser stub, and no agent is duplicated to fill the Prep seat. Recovery treats inbound-defect charges without Prep evidence as SILENT (`UNCERTAIN`, `insufficient_evidence`, never a claim).
- Consequences: FBA units carry no prep-compliance evidence. That is visible in Recovery's records and in `docs/evaluation.md`, not hidden. Tested by `test_inbound_defect_charges_stay_silent_without_prep_evidence`.

### D-009 · Example-outcome tests use fake agents; real agents are tested separately
- Date / Owner: 2026-10-10 / @kl2400033283
- Context: `tests/e2e/test_examples.py` replays the organiser's documented examples, which were written for the stub agents. With the real agents those units now end BLOCKED: Returns is UNCERTAIN without photos. The test was changed (5182374) to run the examples with deterministic `Fake` agents.
- Decision: Keep that test as a check of the **orchestrator's** routing and final-outcome logic, and state openly that it no longer exercises the real agents. Real-agent behaviour is covered by `tests/e2e/test_specialist_pod.py`: clean, exception, claim, SILENT without Prep, UNCERTAIN + override, injected failure, wrong tenant. It runs offline with no keys.
- Why: The handbook forbids weakening tests just to make CI green. This keeps both the orchestration check and an honest real-agent check.

### D-010 · Merge conflicts: choose one side, never keep both
- Date / Owner: 2026-10-10 / @kl2400033283
- Context: The merge b2d2018 ("Merge branch 'main' into returns") kept both sides of several conflicts. That made `pod.json` and `agents/receiving/agent.json` invalid JSON and gave `agents/pack/app.py` a SyntaxError (with an older copy of Pack pasted in). It also re-added a bug in Recovery that 42ae20d had fixed, and turned `main` red.
- Decision: Repaired by restoring each damaged file to `main` just before the merge (77a249d); the Returns work from that merge is kept. Rule for the Pod: resolve a conflict by choosing one side (or merging the logic by hand), then run `make test` before pushing a merge. A file must never contain both versions.

### D-011 · Agents read keys from the environment; `.env` never overrides it
- Date / Owner: 2026-10-10 / @kl2400033283
- Decision: Model keys live only in the deployment's environment (never committed; names listed in `.env.example`). Returns now loads `.env` with `override=False`, so the real environment (CI, tests) wins. Tests remove all model keys, so they can never trigger a paid API call.
- Open (Returns owner): Returns still tries paid Gemini models when a key is present. Model cost per unit must be reported in `model.cost_usd`.
