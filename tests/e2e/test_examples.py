
"""The examples/ folder is documentation participants will copy. It must validate and stay in sync with the code."""
import json
from pathlib import Path

import pytest

from orchestration.orchestrator import load_flow, run_workflow
from orchestration.store import MemoryStore
from shared.utils.schema import errors
from tests.helpers import Fake

EXAMPLES = Path(__file__).resolve().parents[2] / "examples"
BY_PREFIX = {
    "agent-input": "agent-input",
    "agent-output": "agent-output",
    "workflow-state": "workflow-state",
    "final-outcome": "final-outcome",
    "evidence": "evidence",
}
FILES = sorted(
    p for p in EXAMPLES.rglob("*.json")
    if p.name.split(".")[0] in BY_PREFIX
)


def test_there_are_examples_for_every_path():
    assert {
        p.name for p in EXAMPLES.iterdir() if p.is_dir()
    } >= {
        "happy-path", "uncertain-path", "failure-path", "end-to-end"
    }
    assert len(FILES) > 20


@pytest.mark.parametrize(
    "path", FILES, ids=lambda p: str(p.relative_to(EXAMPLES))
)
def test_example_validates(path):
    assert errors(
        BY_PREFIX[path.name.split(".")[0]],
        json.loads(path.read_text()),
    ) == []


@pytest.mark.parametrize(
    "folder", ["happy-path", "uncertain-path", "end-to-end"]
)
def test_example_cases_still_produce_the_documented_outcome(folder):
    """Run examples with deterministic fake agents and check documented outcomes."""
    case = json.loads(
        (EXAMPLES / folder / "case.json").read_text()
    )
    flow = load_flow(EXAMPLES.parent / "orchestration/flow.json")

    prep_verdict = "UNCERTAIN" if folder == "uncertain-path" else "PASS"
    prep_needs_human = folder == "uncertain-path"

    recovery_verdict = "FAIL" if folder == "end-to-end" else "UNCERTAIN"
    recovery_payload = (
        {"claimable_usd": 2.0}
        if folder == "end-to-end"
        else {}
    )

    clients = {
        "receiving": Fake("PASS", outcome="accept"),
        "prep": Fake(
            prep_verdict,
            needs_human=prep_needs_human,
            outcome="pending_review" if prep_needs_human else "compliant",
        ),
        "returns": Fake("PASS", outcome="liquidate"),
        "recovery": Fake(
            recovery_verdict,
            needs_human=False,
            outcome=(
                "claim_recommended"
                if recovery_verdict == "FAIL"
                else "insufficient_evidence"
            ),
            payload=recovery_payload,
        ),
    }

    wf = run_workflow(
        case,
        flow,
        MemoryStore(),
        clients=clients,
    )

    example_file = (
        "workflow-state.continue.json"
        if folder == "uncertain-path"
        else "workflow-state.json"
    )
    documented = json.loads(
        (EXAMPLES / folder / example_file).read_text()
    )

    assert (
        wf["status"],
        wf["final_outcome"]["outcome"],
    ) == (
        documented["status"],
        documented["final_outcome"]["outcome"],
    )
