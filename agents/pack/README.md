# Pack Manager Agent

## Owner

@devikasingh098

## Stage

`pack`

## Agent

`pack-manager@1`

## Purpose

The Pack Manager inspects an open outbound box against the expected order before sealing.

It verifies:

- Items are present
- Quantities are correct
- No extra items are present

The agent produces one of:

- `seal`
- `stop_and_fix`
- `pending_review`

## Implementation

The agent uses Gemini to inspect the supplied Pack images together with the expected order information.

The model is instructed to use only visible evidence and must not invent missing information.

Ambiguous or insufficient evidence is preserved as `UNCERTAIN`.

## Round 3 Integration

The agent implements:

```python
handle(request: dict) -> dict