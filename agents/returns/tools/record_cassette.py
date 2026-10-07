"""Records a cassette for one demo unit using the live Gemini model (§5).

Sets RETURNS_MODEL_MODE=record, builds the orchestrator Agent Input, calls handle() once,
and prints the request count used.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Ensure repo root is in sys.path
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Load .env into os.environ if present
env_file = REPO_ROOT / ".env"
if env_file.is_file():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description="Record a Returns Manager cassette for a unit")
    parser.add_argument("--unit", "-u", required=True, help="Unit ID, e.g. UNIT-0016")
    parser.add_argument("--org", "-o", required=True, help="Org ID, e.g. org_demo_alpha")
    parser.add_argument("--route", "-r", default=None, help="Route, e.g. mfn or fba (defaults from cases.json)")

    args = parser.parse_args()

    # Find route from cases.json if not specified
    route = args.route
    if not route:
        cases_file = REPO_ROOT / "data" / "sample" / "cases.json"
        if cases_file.is_file():
            try:
                cases = json.loads(cases_file.read_text(encoding="utf-8"))
                for c in cases:
                    if c.get("unit_id") == args.unit and c.get("org_id") == args.org:
                        route = c.get("route", "mfn")
                        break
            except Exception:
                pass
    if not route:
        route = "mfn"

    # Set mode to record
    os.environ["RETURNS_MODEL_MODE"] = "record"

    from orchestration.orchestrator import discover_inputs
    from agents.returns.app import handle

    case = {"org_id": args.org, "unit_id": args.unit, "route": route, "returned": True}
    workflow_id = f"WF-{args.org}-{args.unit}"
    request_id = f"{workflow_id}:returns"

    inputs = discover_inputs(args.unit, "returns")

    request = {
        "schema_version": "1.0",
        "request_id": request_id,
        "workflow_id": workflow_id,
        "stage": "returns",
        "subject": {
            "org_id": args.org,
            "subject_id": args.unit,
            "route": route,
        },
        "inputs": inputs,
        "previous_evidence": [],
        "context": {
            "overrides": [],
            "case": case,
        },
    }

    print(f"Recording cassette for {args.unit} in {args.org} (found {len(inputs)} inputs)...")
    out = handle(request)

    status = out.get("status")
    verdict = out.get("verdict")
    evidence = out.get("evidence", {})
    payload = evidence.get("payload", {})
    recorded_calls = payload.get("recorded_calls") or evidence.get("model", {}).get("calls", 0)

    print(f"Result: status={status}, verdict={verdict}, requests used={recorded_calls}")
    cassette_path = REPO_ROOT / "agents" / "returns" / "cassettes" / args.org / f"{args.unit}.jsonl"
    if cassette_path.is_file():
        content = cassette_path.read_text(encoding="utf-8")
        if "base64" in content or "AIzaSy" in content:
            print("WARNING: cassette contains forbidden key or base64 data!", file=sys.stderr)
            return 1
        print(f"Cassette saved successfully at {cassette_path} ({cassette_path.stat().st_size} bytes)")
    else:
        if status in ("error", "pending"):
            err = out.get("error", {})
            print(f"Recording failed open: {err.get('code')}: {err.get('message')}", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
