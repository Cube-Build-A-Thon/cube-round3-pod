export type WorkflowStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'RECOVERY_REQUIRED'

export type AgentVerdict = 'PASS' | 'FAIL' | 'UNCERTAIN'

export type FinalOutcomeType =
  | 'CLEAN'
  | 'CLAIM_RECOMMENDED'
  | 'EXCEPTION'
  | 'NEEDS_REVIEW'
  | 'INCOMPLETE'

export type ReturnsDisposition =
  | 'restock'
  | 'refurbish'
  | 'liquidate'
  | 'dispose'
  | 'pending_review'
  | 'reject'

export interface CatalogProduct {
  sku: string
  asin: string
  title: string
  display_name: string
  category: string
  expected_parts: string[]
  critical_parts?: string[]
  description?: string
  brand?: string | null
}

export interface WarehouseReturnRecord {
  record_id: string
  unit_id: string
  org_id: string
  order_id: string
  sku: string
  asin: string
  product_name: string
  display_name: string
  category: string
  expected_components: string[]
  parts_missing: string[]
  observed_state: string
  operator_disposition: string
  photo_refs: string[]
  images_available: boolean
  available_images: Array<{ filename: string; url: string; size_bytes?: number }>
  operator_id?: string
  captured_at?: string
}

export interface StageResult {
  stage: 'receiving' | 'prep' | 'pack' | 'returns' | 'recovery' | string
  agent_id: string | null
  state: 'pending' | 'completed' | 'skipped' | 'error'
  skipped_reason: string | null
  record_id: string | null
  evidence_status: 'completed' | 'pending' | 'error' | null
  verdict: AgentVerdict | null
  outcome: string | null
  needs_human: boolean | null
  next_step_recommendation: any
  runs: number
  attempts: number
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  error: any
}

export interface FinalOutcome {
  workflow_id: string
  outcome: FinalOutcomeType
  verdict: AgentVerdict
  reason: string
  needs_human: boolean
  provisional: boolean
  claimable_usd?: number | null
  contributing_records: string[]
  effective_verdicts: Record<string, AgentVerdict>
  decided_by: string
  decided_at: string
}

export interface WorkflowOverride {
  override_id: string
  supersedes: {
    record_id: string
    override_id: string | null
  }
  target: string
  actor: string
  at: string
  reason: string
  original_verdict: AgentVerdict
  previous_verdict: AgentVerdict
  new_verdict: AgentVerdict
  new_outcome?: string | null
}

export interface TransitionLog {
  at: string
  event: string
  stage?: string | null
  detail?: string | null
  from_status?: string | null
  to_status?: string | null
}

export interface WorkflowState {
  schema_version: string
  workflow_id: string
  flow_id: string
  org_id: string
  subject_id: string
  context: {
    route?: string
    returned?: boolean
    [key: string]: any
  }
  status: WorkflowStatus
  status_reason: string
  current_stage: string | null
  previous_stage: string | null
  stage_results: StageResult[]
  evidence_references: string[]
  timestamps: {
    created_at: string
    updated_at: string
    completed_at: string | null
  }
  errors: any[]
  overrides: WorkflowOverride[]
  halted: {
    stage: string
    reason: string
    at: string
  } | null
  final_outcome: FinalOutcome | null
  transitions: TransitionLog[]
}

export interface EvidenceCheck {
  check_key: string
  verdict: AgentVerdict
  confidence: number | null
  expected?: any
  observed?: any
  detail?: string
  evidence_refs?: string[]
  uncertain_reason?: string
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
    unit_id?: string | null
    unit_scope?: string
    refs?: Record<string, any>
  }
  client_id?: string | null
  status: 'completed' | 'pending' | 'error'
  captured_at: string
  produced_at: string
  latency_ms?: number | null
  operator_id?: string | null
  model: {
    name: string
    version: string
    provider?: string | null
    prompt_version?: string | null
    calls?: number
    cost_usd?: number | null
  }
  inputs: Array<{
    ref: string
    sha256?: string | null
    kind: string
  }>
  checks: EvidenceCheck[]
  decision: {
    verdict: AgentVerdict
    outcome: string
    confidence?: number | null
    reason: string
    needs_human?: boolean
  }
  payload?: Record<string, any>
  upstream_refs: string[]
  overrides?: any[]
  error?: any
  content_hash: string
}

export interface EvidenceBundle {
  workflow: WorkflowState
  evidence: Record<string, EvidenceRecord>
}

export interface AgentHealthInfo {
  status: 'ok' | 'down' | 'degraded' | string
  mode?: 'inproc' | 'http' | string
  error?: string
  owner?: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  flow: string
  agents: Record<string, AgentHealthInfo>
}

export interface AgentManifest {
  stage: string
  agent_id: string
  owner: string
  mode: 'inproc' | 'http'
  url: string
  module: string
  implementation: string
  notes?: string
}
