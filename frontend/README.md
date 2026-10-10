# CUBE Round 3 Pod · Frontend Application

A dedicated, isolated web frontend for the **CUBE Round 3 Specialist Pod** commerce workflow system, built with **React, TypeScript, Tailwind CSS, and modern UI components**.

The application connects directly to the FastAPI orchestrator HTTP endpoints to visualize the Specialist commerce workflow pipeline, trigger unit analyses, inspect cryptographic evidence chains, and monitor agent health across the Specialist Pod.

---

## Features

- **Warm Ivory Light Aesthetic:** Accessible contrast with curated accents (teal, cobalt blue, coral, amber) and responsive pipeline topology.
- **Unified Specialist Pod Shell:** One shared application shell coordinating the 4 stage agents (Receiving, Pack, Returns, Recovery) plus the Specialist / Integration Engineer role.
- **Dynamic Routing Awareness:** Accurately reflects `orchestration/flow.specialist.json` rules: Receiving -> Pack (MFN) -> Returns (Returned) -> Recovery. In this Specialist Pod, Prep is omitted and missing inbound defect evidence is treated as silent.
- **Rigorous Verdict & Outcome Display:** Strictly preserves project casing and terms:
  - **Workflow Statuses:** `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `BLOCKED`, `RECOVERY_REQUIRED`
  - **Returns Dispositions:** `restock`, `refurbish`, `liquidate`, `dispose`, `pending_review`
  - **Final Outcomes:** `CLEAN`, `CLAIM_RECOMMENDED`, `EXCEPTION`, `NEEDS_REVIEW`, `INCOMPLETE`
- **Deep Evidence Inspection:** Inspect individual stage checks, confidence scores, expected vs. observed values, input file hashes (SHA-256), and citations.
- **Audit Trail & Human Overrides:** View full state transition logs and submit authoritative, append-only human overrides (`POST /workflows/{id}/overrides`).

---

## Project Structure

```text
frontend/
├── public/
│   └── favicon.svg             # Application favicon
├── src/
│   ├── components/
│   │   ├── workflow/
│   │   │   └── WorkflowReport.tsx # Analysis results shown in Analyze
│   │   └── layout/
│   │       └── Navbar.tsx      # Top shell with live orchestrator health badge & visibility polling
│   ├── data/
│   │   ├── agentsData.ts       # Factual Pod agent metadata from manifests & READMEs
│   │   └── sampleUnits.ts      # Curated sample cases from data/sample/cases.json
│   ├── pages/
│   │   ├── Home.tsx            # Animated hero with static fallback and single script loader
│   │   ├── AnalyzeItem.tsx     # Submission form for POST /workflows with honest notices
│   │   ├── BrowseAgents.tsx    # Six ordered cards linking to the orchestrator and agent pages
│   │   └── AgentDetail.tsx     # Separate workflow-contract page for each stage agent
│   ├── services/
│   │   └── api.ts              # API client for FastAPI orchestrator
│   ├── types/
│   │   └── workflow.ts         # TypeScript models matching shared schemas
│   ├── App.tsx                 # Root application shell, shared background & visibility observer
│   ├── index.css               # Design tokens, ivory theme, and GPU-composited keyframes
│   └── main.tsx                # Application entry point
├── index.html                  # HTML template with optimized font loading
├── package.json                # Streamlined dependencies
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite dev server with proxy to backend :8100
└── README.md
```

---

## Setup and Run Instructions

### 1. Prerequisites
- **Node.js** (v18+ or v20+) and **npm**
- **Python** (3.11+) with repository dependencies installed (`pip install -r requirements.txt`)

### 2. Start the Backend Orchestrator API
In the repository root directory, launch the FastAPI server:

```sh
# Option A: using make (if make is installed)
make serve

# Option B: using uvicorn directly
python -m uvicorn orchestration.api:app --port 8100
```

Verify that the orchestrator is running by checking `http://127.0.0.1:8100/health`.

### 3. Install Frontend Dependencies
In a new terminal, navigate into the `frontend/` directory and install packages:

```sh
cd frontend
npm install
```

### 4. Run the Frontend Development Server
Start the Vite development server:

```sh
npm run dev
```

Open `http://localhost:5173` in your browser.

By default, Vite's development proxy routes all `/api/*` requests directly to `http://127.0.0.1:8100/*`, eliminating browser CORS issues in local development.

### 5. Build for Production
To test or build the optimized production bundle:

```sh
npm run build
npm run preview
```

---

## Environment Variables & Configuration

The API base URL can be configured via `VITE_API_BASE_URL`.

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the orchestrator API. If left empty, uses `/api` (proxied by Vite dev server to `http://127.0.0.1:8100`). In a deployed environment, set this to the full URL (e.g., `https://api.cube.example.com`). | `""` (dev proxy) |

To customize, copy `.env.example` to `.env`:
```sh
cp .env.example .env
```

---

## Backend Evidence Contract & Current Scope Notice

The orchestrator API (`POST /workflows`) currently operates on registered unit identifiers (`unit_id` / `org_id`) and executes evaluation against the Pod's sample captures and synthetic datasets under `data/sample/`.

**Current Backend Scope:**
- **HTTP Image Uploads:** The backend supports multipart image uploads for ad-hoc stage capture analysis via the `POST /returns/inspect` endpoint.
- **Unit Lookup:** When a `unit_id` is submitted via `POST /workflows`, each agent inspects the unit's corresponding captures or synthetic rows.
- **Route & Return Parameters:** Fulfillment route (`fba` / `mfn`) and return status (`true` / `false`) can be explicitly passed in the request body or automatically resolved from Pod sample data.
- **Synchronous Execution:** Workflows run synchronously on submission; loading states in the frontend accurately reflect this synchronous execution.
