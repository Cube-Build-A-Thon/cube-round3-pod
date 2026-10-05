import type { CaseItem, HealthResponse, WorkflowBundle, WorkflowState } from '../types'

const API_BASE = '/api'

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchCases(): Promise<CaseItem[]> {
  try {
    const res = await fetch(`${API_BASE}/cases`)
    if (res.ok) {
      return res.json()
    }
  } catch (err) {
    console.warn('Could not fetch cases from server, using fallback', err)
  }
  // Curated demo fallback cases
  return [
    {
      org_id: 'org_demo_alpha',
      unit_id: 'UNIT-0014',
      route: 'fba',
      returned: true,
      label: 'UNIT-0014 (LED Lamp · FBA Return · Rule R11 Refurbish)',
    },
    {
      org_id: 'org_demo_bravo',
      unit_id: 'UNIT-0003',
      route: 'fba',
      returned: true,
      label: 'UNIT-0003 (Puzzle · FBA Return · Liquidation Flow)',
    },
    {
      org_id: 'org_demo_alpha',
      unit_id: 'UNIT-0016',
      route: 'fba',
      returned: true,
      label: 'UNIT-0016 (Blue Towel · FBA Return · Restock Flow)',
    },
    {
      org_id: 'org_demo_alpha',
      unit_id: 'UNIT-0002',
      route: 'fba',
      returned: false,
      label: 'UNIT-0002 (Inbound Clean Flow · FBA Non-returned)',
    },
    {
      org_id: 'org_demo_bravo',
      unit_id: 'UNIT-0009',
      route: 'mfn',
      returned: true,
      label: 'UNIT-0009 (MFN Merchant Pack · Returned Item)',
    },
  ]
}

export async function runWorkflow(
  orgId: string,
  unitId: string,
  route?: string,
  returned?: boolean
): Promise<WorkflowState> {
  const res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      org_id: orgId,
      unit_id: unitId,
      route,
      returned,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to run workflow (${res.status}): ${errText}`)
  }
  return res.json()
}

export async function fetchWorkflowEvidence(workflowId: string): Promise<WorkflowBundle> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/evidence`)
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to load evidence (${res.status}): ${errText}`)
  }
  return res.json()
}

export async function applyOverride(
  workflowId: string,
  recordId: string,
  newVerdict: 'PASS' | 'FAIL' | 'UNCERTAIN',
  actor: string,
  reason: string,
  newOutcome?: string
): Promise<WorkflowState> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/overrides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      record_id: recordId,
      new_verdict: newVerdict,
      actor,
      reason,
      new_outcome: newOutcome,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to apply override (${res.status}): ${errText}`)
  }
  return res.json()
}

export async function resumeWorkflow(workflowId: string): Promise<WorkflowState> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/resume`, {
    method: 'POST',
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to resume workflow: ${errText}`)
  }
  return res.json()
}
