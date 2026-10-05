export interface CaseItem {
  org_id: string
  unit_id: string
  route: string
  returned: boolean
  label?: string
}

export interface CheckItem {
  check_key: string
  verdict: 'PASS' | 'FAIL' | 'UNCERTAIN'
  confidence?: number | null
  expected?: any
  observed?: any
  detail?: string
  evidence_refs?: string[]
  uncertain_reason?: string | null
}

export interface EvidenceRecord {
  schema_version: string
  record_id: string
  workflow_id: string
  stage: string
  agent_id: string
  subject: {
    org_id: string
    subject_id: string
    unit_id?: string
    unit_scope?: string
    refs?: Record<string, any>
  }
  status: string
  captured_at: string
  produced_at: string
  model: {
    name: string
    version: string
    provider?: string | null
    prompt_version?: string | null
    calls?: number
    cost_usd?: number | null
  }
  inputs?: Array<{
    ref: string
    kind: string
    sha256?: string | null
  }>
  checks: CheckItem[]
  decision: {
    verdict: 'PASS' | 'FAIL' | 'UNCERTAIN'
    outcome: string
    confidence?: number | null
    reason: string
    needs_human?: boolean
  }
  payload?: Record<string, any>
  upstream_refs?: string[]
  content_hash?: string
  overrides?: Array<{
    overridden_at: string
    overridden_by: string
    target: string
    original_verdict: string
    new_verdict: string
    reason: string
  }>
}

export interface StageResult {
  stage: string
  agent_id: string
  state: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error'
  skipped_reason?: string | null
  record_id?: string | null
  evidence_status?: string
  verdict?: 'PASS' | 'FAIL' | 'UNCERTAIN' | null
  outcome?: string | null
  needs_human?: boolean
  next_step_recommendation?: {
    action: string
    reason: string
  }
  runs?: number
  attempts?: number
  duration_ms?: number
  error?: {
    code: string
    message: string
    retryable: boolean
  } | null
}

export interface WorkflowState {
  schema_version: string
  workflow_id: string
  flow_id: string
  org_id: string
  subject_id: string
  context: {
    route: string
    returned: boolean
    overrides?: any[]
  }
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'RECOVERY_REQUIRED'
  status_reason?: string
  current_stage?: string
  previous_stage?: string
  stage_results: StageResult[]
  evidence_references: string[]
  transitions?: Array<{
    at: string
    event: string
    stage?: string
    detail?: string
  }>
  final_outcome?: {
    status: string
    outcome: string
    verdict: string
    reasons?: string[]
    contributing_evidence?: string[]
    needs_human?: boolean
  } | null
  overrides?: any[]
}

export interface WorkflowBundle {
  workflow: WorkflowState
  evidence: Record<string, EvidenceRecord>
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  flow: string
  agents: Record<string, {
    status: 'ok' | 'down'
    mode?: string
    error?: string
    owner?: string
  }>
}
