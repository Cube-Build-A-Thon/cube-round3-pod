"""Test Pack Manager over real HTTP (port 8103)."""
import time
import httpx
import uvicorn
import threading
from pathlib import Path
import sys
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from agents.pack.app import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8103, log_level="warning")

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(1.0)  # wait for server to bind

client = httpx.Client(base_url="http://127.0.0.1:8103", timeout=10.0)

# 1. Health check
res = client.get("/health")
print("GET /health -> HTTP", res.status_code, res.json())
assert res.status_code == 200
assert res.json()["status"] == "ok"
assert res.json()["stage"] == "pack"

# 2. POST /run - Valid order
req = {
    "schema_version": "1.0",
    "request_id": "HTTP-TEST:pack",
    "workflow_id": "WF-org_demo_bravo-UNIT-0006",
    "stage": "pack",
    "subject": {"org_id": "org_demo_bravo", "subject_id": "UNIT-0006", "route": "mfn"},
    "inputs": [],
    "previous_evidence": [],
    "context": {"overrides": []},
}
res = client.post("/run", json=req)
print("\nPOST /run (UNIT-0006) -> HTTP", res.status_code)
body = res.json()
print("Verdict:", body["verdict"])
print("Outcome:", body["evidence"]["decision"]["outcome"])
print("Agent ID:", body["agent_id"])
print("Record ID:", body["evidence"]["record_id"])

# 3. POST /run - Wrong tenant (Rule 5.1 must return 404)
wrong_req = dict(req, subject={"org_id": "org_demo_alpha", "subject_id": "UNIT-0006", "route": "mfn"})
res = client.post("/run", json=wrong_req)
print("\nPOST /run (Wrong Tenant) -> HTTP", res.status_code, res.text)
assert res.status_code == 404

print("\nHTTP SERVER TESTS PASSED 100%!")
