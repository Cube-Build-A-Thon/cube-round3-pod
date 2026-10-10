# Evaluation & Testing Evidence

## Method
- **Sample Size:** [Fill in - e.g., 50 UNSEEN units]
- **Selection Criteria:** [Fill in - e.g., Random selection from historical warehouse data]
- **Labeling:** [Fill in - e.g., Two independent humans evaluated images, resolving conflicts via a third QA]
- **Agreement Rate:** [Fill in human agreement percentage]

## Per Check Metrics
| Check Key | True Positives | True Negatives | False Positives | False Negatives | Uncertain |
|-----------|----------------|----------------|-----------------|-----------------|-----------|
| identity_match | 0 | 0 | 0 | 0 | 0 |
| carton_damage  | 0 | 0 | 0 | 0 | 0 |
| [Add checks]   | 0 | 0 | 0 | 0 | 0 |

## System End-to-End Metrics
- **Total Workflows:** [0]
- **Final Outcome PASSED:** [0]
- **Final Outcome FAILED/EXCEPTION:** [0]
- **Needs Human Review (UNCERTAIN):** [0%]
- **Failure Injection Rate:** Orchestrator correctly degrades when agents are offline or return 500s.

## Claims (Recovery Manager)
- **Claim Precision:** [0%] (Number of correct claims / Total recommended claims)
- **Missed Claims (Recall):** [0%]

## Cost & Latency
| Stage | Avg Latency (ms) | Avg USD per Unit | Model(s) Used |
|-------|------------------|------------------|---------------|
| Receiving | 0ms | $0.00 | [Model Name] |
| Prep | 0ms | $0.00 | [Model Name] |
| Pack | 0ms | $0.00 | [Model Name] |
| Returns | 0ms | $0.00 | [Model Name] |
| Recovery | 0ms | $0.00 | [Model Name] |

## Failure Modes
1. [Describe known failure mode, e.g., Low lighting causes blurry text reading]
2. [Describe known failure mode, e.g., API timeout on cold starts]

## Limits
- What we did not test: [Fill in]
- What the sample data cannot tell us: [Fill in]
