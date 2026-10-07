import json
from pathlib import Path

out_dir = Path("out_test") if Path("out_test").exists() else Path("out")
cases_path = Path("data/input/my_cases.json")
cases = json.loads(cases_path.read_text(encoding="utf-8"))

print(f"{'Unit':<10} | {'Org':<15} | {'Route':<5} | {'Status':<10} | {'Outcome':<18} | {'Claimable':<10} | {'Returns Verdict':<15} | {'Disposition':<15}")
print("-" * 105)

for c in cases:
    wf_id = f"WF-{c['org_id']}-{c['unit_id']}"
    wf_file = out_dir / "workflows" / f"{wf_id}.json"
    if not wf_file.exists():
        print(f"{c['unit_id']:<10} | {c['org_id']:<15} | MISSING WORKFLOW FILE")
        continue
    wf = json.loads(wf_file.read_text(encoding="utf-8"))
    
    rtn_sr = next((s for s in wf.get("stage_results", []) if s["stage"] == "returns"), None)
    rtn_rec = None
    if rtn_sr and rtn_sr.get("record_id"):
        ef = out_dir / "evidence" / f"{rtn_sr['record_id']}.json"
        if ef.exists():
            rtn_rec = json.loads(ef.read_text(encoding="utf-8"))
            
    final_out = wf.get("final_outcome", {}).get("outcome") if wf.get("final_outcome") else "—"
    claim_usd = f"${wf.get('final_outcome', {}).get('claimable_usd', 0):.2f}" if wf.get("final_outcome") and wf.get("final_outcome", {}).get("claimable_usd") is not None else "—"
    rtn_v = rtn_sr.get("verdict") if rtn_sr else "SKIPPED"
    disp = rtn_rec.get("decision", {}).get("outcome", "—") if rtn_rec else "—"
    
    print(f"{c['unit_id']:<10} | {c['org_id']:<15} | {c.get('route','?'):<5} | {wf.get('status'):<10} | {final_out:<18} | {claim_usd:<10} | {str(rtn_v):<15} | {str(disp):<15}")

print("\nDetailed Stage Execution Trace:")
for c in cases:
    wf_id = f"WF-{c['org_id']}-{c['unit_id']}"
    wf_file = out_dir / "workflows" / f"{wf_id}.json"
    if not wf_file.exists():
        continue
    wf = json.loads(wf_file.read_text(encoding="utf-8"))
    stages = [f"{s['stage']} ({s['state'].upper()}:{s.get('verdict') or '—'})" for s in wf.get("stage_results", [])]
    print(f"[{c['unit_id']}] -> " + " -> ".join(stages))

print("\n--- Deep Inspection of UNIT-0016 (MFN) Returns Evidence ---")
wf16 = json.loads((out_dir / "workflows/WF-org_demo_alpha-UNIT-0016.json").read_text(encoding="utf-8"))
rtn_id_16 = next(s["record_id"] for s in wf16["stage_results"] if s["stage"] == "returns")
rec16 = json.loads((out_dir / f"evidence/{rtn_id_16}.json").read_text(encoding="utf-8"))
print("Record ID:", rec16["record_id"])
print("Decision:", rec16["decision"])
print("Upstream Refs Consumed:", rec16.get("upstream_refs"))
print("Upstream Reconciliation:", json.dumps(rec16["payload"].get("upstream_reconciliation"), indent=2))
print("Checks:")
for chk in rec16["checks"]:
    print(f"  • {chk['check_key']}: {chk['verdict']} (expected: {chk.get('expected')}, observed: {chk.get('observed')})")

