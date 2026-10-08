# Provenance - Returns Manager (Member 4)

- **Owner**: Upesh Chowdary (@upeshchowdary)
- **Role**: Returns Manager (Station #4)
- **Round 2 Source Repository**: [cube26-rtn-0045-upeshchowdary](https://github.com/upeshchowdary/cube26-rtn-0045-upeshchowdary)
- **Target Commit SHA**: `f9b143e4e63d74ed052cf8732e38a7c1cba9a3d8`
- **Current Status**: Integrated. The Round 2 source is copied byte-identical into `r2/` (see `r2/COPIED_FROM.txt`, 214 files) and runs in-process behind `app.py` + `adapter/`.
- **Capabilities Ported**:
  - Full Round 2 Gemini Vision judgment session
  - 4-point visual identity verification (Brand, Colour, Shape, Size)
  - Perspective and occlusion uncertainty handling
  - Amazon published condition grading (Section 11.11)
  - Deterministic rules disposition engine
  - Completeness audit with cross-station upstream verification
