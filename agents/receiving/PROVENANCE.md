# Provenance - Receiving Manager (Member 1)

- **Owner**: Kiran Teja (@KiranTejz20005)
- **Role**: Receiving Manager (Station #1)
- **Round 2 Source Repository**: [cube26-rcv-0138-kirantejz20005](https://github.com/KiranTejz20005/cube26-rcv-0138-kirantejz20005)
- **Target Commit SHA**: `c3a0b8ccc2cde22f3fb0f852e890f65719ea605a`
- **Current Status**: Ported and verified in `agents/receiving/` for Round 3 Evidence Contract v1.0.
- **Capabilities Ported**:
  - Deterministic Business Rules Decision Engine ("AI Observes, Application Decides")
  - Multi-parameter visual receiving audit (SKU Identity Match, Carton Count, Quantity, Carton Damage, Unit Damage, Quality Flags)
  - Strict UNCERTAIN state and evidence referencing
  - Multi-provider perception pipeline with Google Gemini (Gemini 2.5 Flash / Flash-Lite), Groq, and Deterministic Mock / Replay Engine
  - Supplier shortfall separation (Finding F-10) and PO line scope tracking (Finding F-08)
  - Round 3 Evidence Contract v1.0 compliance
