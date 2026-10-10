import streamlit as st
import json
import os
import subprocess
from pathlib import Path

# Must be the first Streamlit command
st.set_page_config(page_title="CUBE AI - Live Orchestrator", layout="wide", initial_sidebar_state="expanded")

# Inject Custom CSS for premium hackathon look
st.markdown("""
<style>
    .main-header {
        font-size: 2.8rem;
        font-weight: 800;
        background: -webkit-linear-gradient(45deg, #4F8BFF, #00D4FF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0px;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #A0AEC0;
        margin-bottom: 2rem;
        font-weight: 500;
    }
    .stApp {
        background-color: #0E1117;
    }
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-header">⚡ CUBE AI Orchestrator Live</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Live Agent Orchestration & Intelligent Traceability Platform</div>', unsafe_allow_html=True)

# Sidebar for inputs
with st.sidebar:
    st.header("🎯 Trigger Workflow")
    st.markdown("Run the Orchestrator pipeline directly from this UI. (Hint: `UNIT-0008` is an MFN unit, so it will test the Pack Agent!)")
    
    unit_id = st.text_input("Unit ID", value="UNIT-0008")
    org_id = st.text_input("Organization ID", value="org_demo_alpha")
    
    st.divider()
    run_btn = st.button("🚀 Execute Pipeline", use_container_width=True, type="primary")

OUT_DIR = Path("out")
WORKFLOWS_DIR = OUT_DIR / "workflows"
EVIDENCE_DIR = OUT_DIR / "evidence"

# If user clicks the run button, execute the pipeline live!
if run_btn:
    with st.status(f"Orchestrating Workflow for {unit_id}...", expanded=True) as status:
        st.write("Initializing AI Agent environment...")
        
        env = os.environ.copy()
        env["RECOVERY_API_KEY"] = "rcy-recovery-pod3-agent-api-key-2026-prod"
        env["RECEIVING_TENANT_ID"] = "dev_tenant" # Force the right tenant for receiving
        
        cmd = [
            ".venv\\Scripts\\python", "-m", "orchestration.run", 
            "--unit", unit_id, 
            "--org", org_id
        ]
        
        st.write(f"Executing CLI: `{' '.join(cmd)}`")
        
        # Run orchestrator synchronously so we wait for results
        process = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            status.update(label="✅ Workflow Execution Complete!", state="complete", expanded=False)
        else:
            status.update(label="⚠️ Workflow Completed (with Agent Errors/Skips)", state="error", expanded=False)

# Look for the generated workflow file for the given unit
target_wf = WORKFLOWS_DIR / f"WF-{org_id}-{unit_id}.json"

if target_wf.exists():
    with open(target_wf, "r") as f:
        wf_data = json.load(f)
        
    st.markdown(f"### 📊 Final Output Summary: `{target_wf.name}`")
    
    # Beautiful metric cards
    col1, col2, col3, col4 = st.columns(4)
    status_str = wf_data.get('status', 'N/A')
    
    col1.metric("Status", status_str)
    col2.metric("Outcome", wf_data.get('final_outcome', {}).get('outcome', 'N/A'))
    col3.metric("Verdict", wf_data.get('final_outcome', {}).get('verdict', 'N/A'))
    col4.metric("Human Review Needed", str(wf_data.get('final_outcome', {}).get('needs_human', False)))
    
    if status_str == "FAILED":
        st.error(f"**Failure Reason:** {wf_data.get('status_reason')}")
    
    st.divider()
    st.markdown("### 🤖 Agent Pipeline Execution")
    
    # Render visually stunning pipeline stages
    for stage in wf_data.get("stage_results", []):
        stage_name = stage.get("stage", "Unknown").upper()
        state = stage.get("state", "N/A")
        verdict = stage.get("verdict", "N/A")
        agent_id = stage.get("agent_id", "N/A")
        
        border_color = "#38A169" if state == "completed" else "#E53E3E" if state == "error" else "#D69E2E" if state == "skipped" else "#4F8BFF"
        icon = "✅" if state == "completed" else "❌" if state == "error" else "⏭️"
        
        st.markdown(f"""
        <div style="background-color: #1A202C; border-left: 5px solid {border_color}; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
            <h4 style="margin:0; color:#E2E8F0;">{icon} {stage_name} AGENT <span style="font-size: 0.8em; color:#718096; font-weight: normal;">({agent_id})</span></h4>
            <p style="margin:5px 0 0 0; color:#A0AEC0;">State: <strong style="color:white;">{state.upper()}</strong> &nbsp;|&nbsp; Verdict: <strong style="color:white;">{verdict}</strong></p>
        </div>
        """, unsafe_allow_html=True)
        
        record_id = stage.get("record_id")
        if record_id:
            evidence_file = EVIDENCE_DIR / f"{record_id}.json"
            if evidence_file.exists():
                with open(evidence_file, "r") as ef:
                    ev_data = json.load(ef)
                
                with st.expander(f"🔍 View Core AI Evidence & Checks for {stage_name}"):
                    
                    # Highlight errors if any
                    if stage.get("error"):
                        st.error(f"Agent Error: {stage['error'].get('code')} - {stage['error'].get('message')}")
                        
                    checks = ev_data.get("checks", [])
                    if checks:
                        st.markdown("##### 🧪 AI Verifications")
                        for check in checks:
                            c_verd = check.get("verdict")
                            c_icon = "🟢" if c_verd == "PASS" else "🔴" if c_verd == "FAIL" else "🟡"
                            st.write(f"**{c_icon} {check.get('check_key')}** (Confidence: {check.get('confidence', 1.0)*100:.1f}%)")
                            st.caption(f"Expected: `{check.get('expected')}` | Observed: `{check.get('observed')}`")
                    
                    # Parse out base64 images if they exist in the payload
                    images = ev_data.get("inputs", [])
                    img_data = [img for img in images if img.get("kind") == "image"]
                    if img_data:
                        st.markdown("##### 📸 Visual Evidence")
                        cols = st.columns(min(3, len(img_data)))
                        for i, img in enumerate(img_data):
                            b64 = img.get("data_base64")
                            if b64:
                                cols[i % 3].image(f"data:image/jpeg;base64,{b64}", use_container_width=True)
                                
                    st.divider()
                    st.caption("Raw JSON Evidence Record:")
                    st.json(ev_data, expanded=False)
else:
    st.info("👈 Use the sidebar to enter a Unit ID and click Execute to run the Orchestrator live.")
