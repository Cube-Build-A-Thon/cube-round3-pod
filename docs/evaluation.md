# Evaluation

## Pack Manager

| Unit | Expected Verdict | Agent Verdict | Cost (USD) | Latency (ms) | Run Method |
|---|---|---|---|---|---|
| UNIT-0008 | PASS | PASS | $0.00010 | ~1500 | `make case UNIT=UNIT-0008 ORG=org_demo_alpha` |
| UNIT-0016 | PASS | PASS | $0.00010 | ~1500 | `make case UNIT=UNIT-0016 ORG=org_demo_alpha` |
| UNIT-0019 | PASS | PASS | $0.00010 | ~1500 | `make case UNIT=UNIT-0019 ORG=org_demo_alpha` |
| UNIT-0022 | FAIL (no_extra_items) | FAIL (no_extra_items) | $0.00010 | ~1500 | `make case UNIT=UNIT-0022 ORG=org_demo_alpha` |

*Note: These tests verify basic functionality on 4 specific units with photos. Do not claim accuracy beyond these 4 units.*
