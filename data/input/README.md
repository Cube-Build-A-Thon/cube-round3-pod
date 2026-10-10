# Input Data

This directory contains evidence files for testing the agents.

| File | Real or Generated | Content | Expected Verdict |
|------|-------------------|---------|------------------|
| `UNIT-0008/pack/open_box.jpg` | Generated | Open box with exactly one 750 ml bottle | PASS |
| `UNIT-0016/pack/open_box.jpg` | Generated | Open box with exactly two blue towels | PASS |
| `UNIT-0019/pack/open_box.jpg` | Generated | Open box with exactly one blue towel | PASS |
| `UNIT-0022/pack/open_box.jpg` | Generated | Open box with one serum bottle AND one random extra item | FAIL (no_extra_items) |
