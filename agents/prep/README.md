# agents/prep/ — Prep Manager

**Owner:** @dhanvind360 (Dhanvi)  
**Agent ID:** `prep-manager`  
**Stage:** `prep`  
**Model:** `gemini-3.6-flash` (Multimodal AI packaging inspection with automatic fallback to `gemini-3.8-flash` / `gemini-flash-latest`)  
**Origin:** [cube26-prp-0211-dhanvind360](https://github.com/DhanviND360/cube26-prp-0211-dhanvind360) (commit `ea8c3ca`)

---

## Overview

The **Prep Manager** is an AI agent engineered to inspect inbound e-commerce and Amazon FBA packaging against six rigorous prep and safety compliance checks:

1. `polybag_sealed`: Polybag is present, sealed, and undamaged.
2. `suffocation_warning`: Legible suffocation warning present on bags with opening ≥ 5 inches.
3. `fnsku_label_placement`: FNSKU barcode label is flat, unobstructed, not across folds/curves.
4. `original_barcode_covered`: Manufacturer/UPC barcode is completely covered by FNSKU label.
5. `expiry_legible`: Expiration date is present, legible through polybag, and formatted correctly.
6. `handling_marks`: Required fragile / team-lift / orientation marks are present.

### Key Capabilities
- **Multimodal AI Vision**: Analyzes high-resolution front, back, and label product packaging images.
- **Evidence-Driven Honesty**: Strict refusal to hallucinate; ambiguous or obscured features return `UNCERTAIN` with explicit reasons.
- **Contract Compliant**: Produces content-hashed, sealed Evidence Records complying with Round 3 schema.
- **Ultra-Lightweight & Resilient**: Zero heavy C++ / PyTorch runtime dependencies (~55MB base footprint, 100% stable under 512MB RAM constraints).
- **Physical Measurements**: Measures weight and dimensions in `payload.measurements` for downstream Recovery audit verification (Finding F-07).

---

## Directory Structure

```text
agents/prep/
├── app.py                # Main agent entrypoint: handle(request) and FastAPI make_app()
├── agent.json            # Pod agent metadata (agent_id, mode: inproc, module)
├── PROVENANCE.md         # Source repository and commit tracking
├── README.md             # This documentation
├── streamlit_app.py      # Standalone operator dashboard & visual inspection portal
├── requirements.txt      # Ultra-lightweight dependencies
├── Dockerfile            # Container deployment specification
├── render.yaml           # One-click Render deployment configuration
└── agent/                # Multimodal AI agent implementation package
    ├── prep_agent.py     # Gemini 3.6 Flash multimodal inspection engine
    ├── config.py         # Resilient settings & environment configuration
    ├── calibration.py    # Confidence calibration & thresholding
    ├── dataset.py        # Packaging dataset loader & manifest parser
    ├── validator.py      # Evidence contract schema validator
    ├── api.py            # Standalone FastAPI inspection service
    └── portal.html       # Built-in live browser testing portal
```

---

## Verification & Tests

Passes 100% of the orchestrator contract verification tests:
```bash
pytest tests/integration/test_agent_contracts.py -k prep -v
```
