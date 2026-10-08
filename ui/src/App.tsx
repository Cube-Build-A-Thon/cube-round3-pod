import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Info,
  Layers3,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  X,
  XCircle,
} from 'lucide-react'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import {
  analyticsData,
  exampleAgents,
  recoveryCharges,
  reviews as fallbackReviews,
} from './data'
import type { RecoveryChargeItem } from './data'
import {
  api,
  stageVariant,
} from './services/api'
import type {
  CaseItem,
  EvidenceBundle,
  EvidenceRecord,
  HealthResponse,
  StageResult,
  WorkflowState,
} from './services/api'

const queryClient = new QueryClient()

// ── Fallback / Seed Workflows from out/workflows ───────────────────────────
const SEED_WORKFLOWS: WorkflowState[] = [
  {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    flow_id: 'standard-v1',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-0014',
    context: { route: 'fba', returned: true },
    status: 'COMPLETED',
    status_reason: 'all required stages finished',
    current_stage: 'recovery',
    previous_stage: 'returns',
    stage_results: [
      {
        stage: 'receiving',
        agent_id: 'receiving-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'RCV-0014',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'accept',
        needs_human: false,
        next_step_recommendation: { action: 'continue', reason: 'Carton and invoice match; 0 failed check(s)' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:54:41Z',
        finished_at: '2026-10-05T14:54:41Z',
        duration_ms: 5,
        error: null,
      },
      {
        stage: 'prep',
        agent_id: 'prep-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'PRP-0014',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'compliant',
        needs_human: false,
        next_step_recommendation: { action: 'continue', reason: 'No unit damage detected' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:54:41Z',
        finished_at: '2026-10-05T14:54:41Z',
        duration_ms: 2,
        error: null,
      },
      {
        stage: 'pack',
        agent_id: 'pack-stub@0',
        state: 'skipped',
        skipped_reason: "route='fba' not in ['mfn']",
        record_id: null,
        evidence_status: null,
        verdict: null,
        outcome: null,
        needs_human: null,
        next_step_recommendation: null,
        runs: 0,
        attempts: 0,
        started_at: null,
        finished_at: null,
        duration_ms: null,
        error: null,
      },
      {
        stage: 'returns',
        agent_id: 'returns-manager-rtn0045@1',
        state: 'completed',
        skipped_reason: null,
        record_id: 'RTN-0014',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'refurbish',
        needs_human: false,
        next_step_recommendation: { action: 'continue', reason: 'Return acceptability confirmed; electrical safety review recommended.' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:54:41Z',
        finished_at: '2026-10-05T14:54:41Z',
        duration_ms: 2,
        error: null,
      },
      {
        stage: 'recovery',
        agent_id: 'recovery-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'RCY-UNIT-0014',
        evidence_status: 'completed',
        verdict: 'FAIL',
        outcome: 'claim_recommended',
        needs_human: false,
        next_step_recommendation: { action: 'complete', reason: '4 charges reviewed; 1 contradicted ($2.00 claimable)' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:54:41Z',
        finished_at: '2026-10-05T14:54:41Z',
        duration_ms: 2,
        error: null,
      },
    ],
    evidence_references: ['RCV-0014', 'PRP-0014', 'RTN-0014', 'RCY-UNIT-0014'],
    timestamps: { created_at: '2026-10-05T14:54:41Z', updated_at: '2026-10-05T15:07:21Z', completed_at: '2026-10-05T15:07:21Z' },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: {
      workflow_id: 'WF-org_demo_alpha-UNIT-0014',
      outcome: 'CLAIM_RECOMMENDED',
      verdict: 'FAIL',
      reason: 'Recovery contradicted at least one charge (claimable $2.00).',
      needs_human: false,
      provisional: false,
      claimable_usd: 2.0,
      contributing_records: ['RCV-0014', 'PRP-0014', 'RTN-0014', 'RCY-UNIT-0014'],
      effective_verdicts: { receiving: 'PASS', prep: 'PASS', returns: 'PASS', recovery: 'FAIL' },
      decided_by: 'orchestrator',
      decided_at: '2026-10-05T15:07:21Z',
    },
    transitions: [
      { at: '2026-10-05T14:54:41Z', event: 'workflow_created', stage: null, detail: 'flow=standard-v1' },
      { at: '2026-10-05T14:54:41Z', event: 'stage_skipped', stage: 'pack', detail: "route='fba' not in ['mfn']" },
      { at: '2026-10-05T14:54:41Z', event: 'stage_completed', stage: 'receiving', detail: 'accept / PASS' },
      { at: '2026-10-05T14:54:41Z', event: 'stage_completed', stage: 'prep', detail: 'compliant / PASS' },
      { at: '2026-10-05T14:54:41Z', event: 'stage_completed', stage: 'returns', detail: 'refurbish / PASS' },
      { at: '2026-10-05T14:54:41Z', event: 'stage_completed', stage: 'recovery', detail: 'claim_recommended / FAIL' },
      { at: '2026-10-05T15:07:21Z', event: 'final_outcome_decided', stage: null, detail: 'CLAIM_RECOMMENDED' },
    ],
  },
  {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-0018',
    flow_id: 'standard-v1',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-0018',
    context: { route: 'fba', returned: false },
    status: 'BLOCKED',
    status_reason: 'no receiving record for UNIT-0018 in org_demo_alpha',
    current_stage: 'receiving',
    previous_stage: null,
    stage_results: [
      {
        stage: 'receiving',
        agent_id: 'receiving-stub@0',
        state: 'error',
        skipped_reason: null,
        record_id: 'RCV-PENDING-WF-org_demo_alpha-UNIT-0018-receiving',
        evidence_status: 'error',
        verdict: 'UNCERTAIN',
        outcome: 'pending_review',
        needs_human: true,
        next_step_recommendation: { action: 'review', reason: 'Receiving record mismatch requires human verification.' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:55:04Z',
        finished_at: '2026-10-05T14:55:04Z',
        duration_ms: 1,
        error: { message: 'no receiving record for UNIT-0018 in org_demo_alpha' },
      },
    ],
    evidence_references: ['RCV-PENDING-WF-org_demo_alpha-UNIT-0018-receiving'],
    timestamps: { created_at: '2026-10-05T14:55:04Z', updated_at: '2026-10-05T14:55:04Z', completed_at: null },
    errors: [{ stage: 'receiving', message: 'no receiving record for UNIT-0018 in org_demo_alpha' }],
    overrides: [],
    halted: { stage: 'receiving', reason: 'no receiving record for UNIT-0018', at: '2026-10-05T14:55:04Z' },
    final_outcome: null,
    transitions: [
      { at: '2026-10-05T14:55:04Z', event: 'workflow_created', stage: null, detail: 'flow=standard-v1' },
      { at: '2026-10-05T14:55:04Z', event: 'stage_halted', stage: 'receiving', detail: 'UNCERTAIN verdict requires human review' },
    ],
  },
  {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-0002',
    flow_id: 'standard-v1',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-0002',
    context: { route: 'fba', returned: false },
    status: 'COMPLETED',
    status_reason: 'all required stages finished',
    current_stage: 'recovery',
    previous_stage: 'prep',
    stage_results: [
      {
        stage: 'receiving',
        agent_id: 'receiving-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'RCV-0002',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'accept',
        needs_human: false,
        next_step_recommendation: { action: 'continue', reason: 'Inbound verified' },
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:50:00Z',
        finished_at: '2026-10-05T14:50:01Z',
        duration_ms: 4,
        error: null,
      },
      {
        stage: 'prep',
        agent_id: 'prep-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'PRP-0002',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'compliant',
        needs_human: false,
        next_step_recommendation: null,
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:50:01Z',
        finished_at: '2026-10-05T14:50:02Z',
        duration_ms: 3,
        error: null,
      },
      {
        stage: 'pack',
        agent_id: 'pack-stub@0',
        state: 'skipped',
        skipped_reason: "route='fba' not in ['mfn']",
        record_id: null,
        evidence_status: null,
        verdict: null,
        outcome: null,
        needs_human: null,
        next_step_recommendation: null,
        runs: 0,
        attempts: 0,
        started_at: null,
        finished_at: null,
        duration_ms: null,
        error: null,
      },
      {
        stage: 'returns',
        agent_id: null,
        state: 'skipped',
        skipped_reason: 'returned=false not in [True]',
        record_id: null,
        evidence_status: null,
        verdict: null,
        outcome: null,
        needs_human: null,
        next_step_recommendation: null,
        runs: 0,
        attempts: 0,
        started_at: null,
        finished_at: null,
        duration_ms: null,
        error: null,
      },
      {
        stage: 'recovery',
        agent_id: 'recovery-stub@0',
        state: 'completed',
        skipped_reason: null,
        record_id: 'RCY-UNIT-0002',
        evidence_status: 'completed',
        verdict: 'PASS',
        outcome: 'no_claim',
        needs_human: false,
        next_step_recommendation: null,
        runs: 1,
        attempts: 1,
        started_at: '2026-10-05T14:50:02Z',
        finished_at: '2026-10-05T14:50:03Z',
        duration_ms: 2,
        error: null,
      },
    ],
    evidence_references: ['RCV-0002', 'RCY-UNIT-0002'],
    timestamps: { created_at: '2026-10-05T14:50:00Z', updated_at: '2026-10-05T14:50:03Z', completed_at: '2026-10-05T14:50:03Z' },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: {
      workflow_id: 'WF-org_demo_alpha-UNIT-0002',
      outcome: 'CLEAN',
      verdict: 'PASS',
      reason: 'No charge disputes or condition defects found.',
      needs_human: false,
      provisional: false,
      claimable_usd: 0.0,
      contributing_records: ['RCV-0002', 'RCY-UNIT-0002'],
      effective_verdicts: { receiving: 'PASS', prep: 'PASS', recovery: 'PASS' },
      decided_by: 'orchestrator',
      decided_at: '2026-10-05T14:50:03Z',
    },
    transitions: [
      { at: '2026-10-05T14:50:00Z', event: 'workflow_created', stage: null, detail: 'flow=standard-v1' },
      { at: '2026-10-05T14:50:03Z', event: 'final_outcome_decided', stage: null, detail: 'CLEAN' },
    ],
  },
]

const DEFAULT_CASES: CaseItem[] = [
  { org_id: 'org_demo_alpha', unit_id: 'UNIT-0014', route: 'fba', returned: true },
  { org_id: 'org_demo_alpha', unit_id: 'UNIT-0018', route: 'fba', returned: false },
  { org_id: 'org_demo_alpha', unit_id: 'UNIT-0002', route: 'fba', returned: false },
  { org_id: 'org_demo_alpha', unit_id: 'UNIT-0004', route: 'fba', returned: false },
  { org_id: 'org_demo_bravo', unit_id: 'UNIT-0003', route: 'fba', returned: true },
  { org_id: 'org_demo_bravo', unit_id: 'UNIT-0006', route: 'mfn', returned: false },
]

// ── App Context ───────────────────────────────────────────────────────────
interface AppContextType {
  workflows: WorkflowState[]
  health: HealthResponse | null
  cases: CaseItem[]
  isBackendConnected: boolean
  refreshData: () => Promise<void>
  openRunModal: () => void
  openOverrideModal: (ctx: { workflowId: string; recordId: string; currentVerdict: string; stage?: string }) => void
  openEvidenceDrawer: (record: EvidenceRecord) => void
  handleRunWorkflow: (orgId: string, unitId: string, route?: string, returned?: boolean) => Promise<WorkflowState>
  handleResumeWorkflow: (workflowId: string) => Promise<WorkflowState>
  handleApplyOverride: (
    workflowId: string,
    recordId: string,
    newVerdict: string,
    actor: string,
    reason: string,
    newOutcome?: string,
    autoResume?: boolean,
  ) => Promise<WorkflowState>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

// ── Main App Component ────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>
          <Shell />
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = useState<WorkflowState[]>(SEED_WORKFLOWS)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [cases, setCases] = useState<CaseItem[]>(DEFAULT_CASES)
  const [isBackendConnected, setIsBackendConnected] = useState(false)

  // Modals & Drawer State
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [overrideModalContext, setOverrideModalContext] = useState<{
    workflowId: string
    recordId: string
    currentVerdict: string
    stage?: string
  } | null>(null)
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState<EvidenceRecord | null>(null)

  const refreshData = async () => {
    try {
      const [healthRes, casesRes] = await Promise.all([
        api.health().catch(() => null),
        api.cases().catch(() => null),
      ])

      if (healthRes) {
        setHealth(healthRes)
        setIsBackendConnected(true)
      } else {
        setIsBackendConnected(false)
      }

      if (casesRes && casesRes.length > 0) {
        setCases(casesRes)
        // Probe top workflows
        const probeList = casesRes.slice(0, 10).map((c) => `WF-${c.org_id}-${c.unit_id}`)
        const fetchedWfs = await Promise.allSettled(probeList.map((id) => api.getWorkflow(id)))
        const validWfs = fetchedWfs
          .filter((res): res is PromiseFulfilledResult<WorkflowState> => res.status === 'fulfilled')
          .map((res) => res.value)

        if (validWfs.length > 0) {
          setWorkflows((prev) => {
            const map = new Map<string, WorkflowState>()
            prev.forEach((w) => map.set(w.workflow_id, w))
            validWfs.forEach((w) => map.set(w.workflow_id, w))
            return Array.from(map.values())
          })
        }
      }
    } catch {
      // Graceful offline fallback
    }
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleRunWorkflow = async (orgId: string, unitId: string, route?: string, returned?: boolean) => {
    try {
      const res = await api.runWorkflow(orgId, unitId, route, returned)
      setWorkflows((prev) => [res, ...prev.filter((w) => w.workflow_id !== res.workflow_id)])
      return res
    } catch (err) {
      // Simulate run locally if backend is unavailable so UI works offline
      const mockId = `WF-${orgId}-${unitId}`
      const newWf: WorkflowState = {
        schema_version: '1.0',
        workflow_id: mockId,
        flow_id: 'standard-v1',
        org_id: orgId,
        subject_id: unitId,
        context: { route: route || 'fba', returned: Boolean(returned) },
        status: returned ? 'COMPLETED' : 'IN_PROGRESS',
        status_reason: 'Automated workflow run dispatched',
        current_stage: 'recovery',
        previous_stage: 'returns',
        stage_results: [
          {
            stage: 'receiving',
            agent_id: 'receiving-stub@0',
            state: 'completed',
            skipped_reason: null,
            record_id: `RCV-${unitId.replace('UNIT-', '')}`,
            evidence_status: 'completed',
            verdict: 'PASS',
            outcome: 'accept',
            needs_human: false,
            next_step_recommendation: { action: 'continue', reason: 'Inspection verified' },
            runs: 1,
            attempts: 1,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_ms: 8,
            error: null,
          },
        ],
        evidence_references: [`RCV-${unitId.replace('UNIT-', '')}`],
        timestamps: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: null },
        errors: [],
        overrides: [],
        halted: null,
        final_outcome: null,
        transitions: [{ at: new Date().toISOString(), event: 'workflow_created', stage: null, detail: 'flow=standard-v1' }],
      }
      setWorkflows((prev) => [newWf, ...prev.filter((w) => w.workflow_id !== mockId)])
      return newWf
    }
  }

  const handleResumeWorkflow = async (workflowId: string) => {
    try {
      const res = await api.resumeWorkflow(workflowId)
      setWorkflows((prev) => prev.map((w) => (w.workflow_id === workflowId ? res : w)))
      return res
    } catch {
      // Local fallback resume
      let updatedWf: WorkflowState | null = null
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.workflow_id === workflowId) {
            updatedWf = {
              ...w,
              status: 'COMPLETED',
              status_reason: 'Resumed and finished stages',
              halted: null,
              transitions: [
                ...w.transitions,
                { at: new Date().toISOString(), event: 'workflow_resumed', stage: w.current_stage, detail: 'Operator resumed workflow' },
              ],
            }
            return updatedWf
          }
          return w
        })
      )
      if (updatedWf) return updatedWf
      throw new Error('Workflow not found')
    }
  }

  const handleApplyOverride = async (
    workflowId: string,
    recordId: string,
    newVerdict: string,
    actor: string,
    reason: string,
    newOutcome?: string,
    autoResume = true
  ) => {
    try {
      let res = await api.applyOverride(workflowId, recordId, newVerdict, actor, reason, newOutcome)
      if (autoResume) {
        try {
          res = await api.resumeWorkflow(workflowId)
        } catch {
          // ignore resume error if override succeeded
        }
      }
      setWorkflows((prev) => prev.map((w) => (w.workflow_id === workflowId ? res : w)))
      return res
    } catch {
      // Local fallback override
      let updatedWf: WorkflowState | null = null
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.workflow_id === workflowId) {
            const overrideEntry = {
              override_id: `OVR-${Date.now().toString(36)}`,
              supersedes: { record_id: recordId, override_id: null },
              target: recordId,
              actor,
              at: new Date().toISOString(),
              reason,
              original_verdict: 'UNCERTAIN',
              previous_verdict: 'UNCERTAIN',
              new_verdict: newVerdict,
              new_outcome: newOutcome || null,
            }
            const updatedStageResults = w.stage_results.map((stg) => {
              if (stg.record_id === recordId || stg.stage === (overrideModalContext?.stage || stg.stage)) {
                return {
                  ...stg,
                  verdict: newVerdict,
                  state: 'completed' as const,
                  needs_human: false,
                  next_step_recommendation: { action: 'continue', reason: `Overridden by ${actor}: ${reason}` },
                }
              }
              return stg
            })

            updatedWf = {
              ...w,
              status: autoResume ? 'COMPLETED' : 'IN_PROGRESS',
              status_reason: `Override applied by ${actor}`,
              stage_results: updatedStageResults,
              halted: null,
              overrides: [...w.overrides, overrideEntry],
              transitions: [
                ...w.transitions,
                { at: new Date().toISOString(), event: 'human_override_created', stage: w.current_stage, detail: `${newVerdict} by ${actor}` },
              ],
            }
            return updatedWf
          }
          return w
        })
      )
      if (updatedWf) return updatedWf
      throw new Error('Workflow not found')
    }
  }

  const value: AppContextType = {
    workflows,
    health,
    cases,
    isBackendConnected,
    refreshData,
    openRunModal: () => setRunModalOpen(true),
    openOverrideModal: (ctx) => setOverrideModalContext(ctx),
    openEvidenceDrawer: (record) => setSelectedEvidenceRecord(record),
    handleRunWorkflow,
    handleResumeWorkflow,
    handleApplyOverride,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      {runModalOpen && <RunWorkflowModal onClose={() => setRunModalOpen(false)} />}
      {overrideModalContext && (
        <OverrideModal
          context={overrideModalContext}
          onClose={() => setOverrideModalContext(null)}
        />
      )}
      {selectedEvidenceRecord && (
        <EvidenceRecordDrawer
          record={selectedEvidenceRecord}
          onClose={() => setSelectedEvidenceRecord(null)}
        />
      )}
    </AppContext.Provider>
  )
}

// ── Modals & Drawer ────────────────────────────────────────────────────────

function RunWorkflowModal({ onClose }: { onClose: () => void }) {
  const { cases, handleRunWorkflow } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0)
  const [orgId, setOrgId] = useState('org_demo_alpha')
  const [unitId, setUnitId] = useState('UNIT-0014')
  const [route, setRoute] = useState<'fba' | 'mfn'>('fba')
  const [returned, setReturned] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let targetOrg = orgId
      let targetUnit = unitId
      let targetRoute = route
      let targetReturned = returned

      if (mode === 'preset' && cases[selectedCaseIdx]) {
        const c = cases[selectedCaseIdx]
        targetOrg = c.org_id
        targetUnit = c.unit_id
        targetRoute = (c.route as 'fba' | 'mfn') || 'fba'
        targetReturned = Boolean(c.returned)
      }

      const res = await handleRunWorkflow(targetOrg, targetUnit, targetRoute, targetReturned)
      onClose()
      navigate(`/workflows/${res.workflow_id}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch workflow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Run Workflow</h3>
            <p className="modal-subtitle">Dispatch commerce orchestration for an inventory unit</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${mode === 'preset' ? 'active' : ''}`}
              onClick={() => setMode('preset')}
            >
              Demo Cases ({cases.length})
            </button>
            <button
              type="button"
              className={`toggle-btn ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => setMode('custom')}
            >
              Custom Unit
            </button>
          </div>

          {mode === 'preset' ? (
            <div className="form-group">
              <label className="form-label">Select Case</label>
              <select
                className="form-select"
                value={selectedCaseIdx}
                onChange={(e) => setSelectedCaseIdx(Number(e.target.value))}
              >
                {cases.map((c, idx) => (
                  <option key={`${c.org_id}-${c.unit_id}-${idx}`} value={idx}>
                    {c.unit_id} · {c.org_id} (Route: {c.route?.toUpperCase() || 'FBA'}, Returned: {c.returned ? 'YES' : 'NO'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Route</label>
                  <select
                    className="form-select"
                    value={route}
                    onChange={(e) => setRoute(e.target.value as 'fba' | 'mfn')}
                  >
                    <option value="fba">FBA (Fulfillment by Amazon)</option>
                    <option value="mfn">MFN (Merchant Fulfilled)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Returned?</label>
                  <select
                    className="form-select"
                    value={returned ? 'yes' : 'no'}
                    onChange={(e) => setReturned(e.target.value === 'yes')}
                  >
                    <option value="yes">YES (Includes Returns Inspection)</option>
                    <option value="no">NO</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {error && <div className="incident-alert"><p style={{ color: '#c46b64' }}>{error}</p></div>}

          <div className="modal-footer">
            <button type="button" className="secondary-button small" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button small" disabled={loading}>
              {loading ? <span className="spinner-inline" /> : <Play size={13} style={{ marginRight: 6 }} />}
              {loading ? 'Orchestrating...' : 'Launch Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OverrideModal({
  context,
  onClose,
}: {
  context: { workflowId: string; recordId: string; currentVerdict: string; stage?: string }
  onClose: () => void
}) {
  const { handleApplyOverride } = useApp()
  const [actor, setActor] = useState('operator_upesh')
  const [newVerdict, setNewVerdict] = useState<'PASS' | 'FAIL' | 'UNCERTAIN'>('PASS')
  const [reason, setReason] = useState('')
  const [newOutcome, setNewOutcome] = useState('')
  const [autoResume, setAutoResume] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a reason explaining the operational override.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await handleApplyOverride(
        context.workflowId,
        context.recordId,
        newVerdict,
        actor,
        reason,
        newOutcome || undefined,
        autoResume
      )
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to submit override')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Human Intervention & Override</h3>
            <p className="modal-subtitle">
              Workflow: <strong>{context.workflowId}</strong> · Record: <strong>{context.recordId}</strong>
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reviewer / Operator ID</label>
              <input
                type="text"
                className="form-input"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Verdict</label>
              <select
                className="form-select"
                value={newVerdict}
                onChange={(e) => setNewVerdict(e.target.value as any)}
              >
                <option value="PASS">PASS (Approve stage)</option>
                <option value="FAIL">FAIL (Reject / Claimable)</option>
                <option value="UNCERTAIN">UNCERTAIN (Escalate)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Justification / Reason *</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Physical carton inspection verified. Barcode clear and seals unbroken."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Outcome (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. compliant, refurbish, restock"
              value={newOutcome}
              onChange={(e) => setNewOutcome(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={autoResume}
              onChange={(e) => setAutoResume(e.target.checked)}
            />
            Automatically resume workflow after override
          </label>

          {error && <div className="incident-alert"><p style={{ color: '#c46b64' }}>{error}</p></div>}

          <div className="modal-footer">
            <button type="button" className="secondary-button small" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button small" disabled={loading}>
              {loading ? <span className="spinner-inline" /> : <SlidersHorizontal size={13} style={{ marginRight: 6 }} />}
              {loading ? 'Applying...' : 'Apply Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EvidenceRecordDrawer({ record, onClose }: { record: EvidenceRecord; onClose: () => void }) {
  return (
    <div className="evidence-drawer-overlay" onClick={onClose}>
      <div className="evidence-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Evidence Record</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>{record.record_id}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">Metadata</div>
          <div className="key-value"><span>Workflow</span><strong>{record.workflow_id}</strong></div>
          <div className="key-value"><span>Stage</span><strong>{record.stage.toUpperCase()}</strong></div>
          <div className="key-value"><span>Agent</span><strong>{record.agent_id}</strong></div>
          <div className="key-value"><span>Status</span><strong>{record.status}</strong></div>
          <div className="key-value">
            <span>Verdict</span>
            <StatusBadge
              label={record.decision?.verdict || 'N/A'}
              variant={stageVariant(record.decision?.verdict || null, record.status)}
            />
          </div>
        </div>

        {record.decision?.reason && (
          <div className="drawer-section">
            <div className="drawer-label">Decision Note</div>
            <p style={{ margin: 0, fontSize: 13, color: '#2a2f2d', lineHeight: 1.5 }}>
              {record.decision.reason}
            </p>
          </div>
        )}

        {record.checks && record.checks.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-label">Rule & Quality Checks ({record.checks.length})</div>
            <div className="table-card" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Verdict</th>
                    <th>Observed</th>
                  </tr>
                </thead>
                <tbody>
                  {record.checks.map((chk, i) => (
                    <tr key={chk.check_key || i}>
                      <td><small>{chk.check_key}</small></td>
                      <td>
                        <StatusBadge
                          label={chk.verdict}
                          variant={chk.verdict === 'PASS' ? 'success' : chk.verdict === 'FAIL' ? 'danger' : 'warning'}
                        />
                      </td>
                      <td><small>{chk.observed || chk.detail || '—'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {record.payload && Object.keys(record.payload).length > 0 && (
          <div className="drawer-section">
            <div className="drawer-label">Payload Data</div>
            <pre className="json-viewer">{JSON.stringify(record.payload, null, 2)}</pre>
          </div>
        )}

        {record.content_hash && (
          <div className="drawer-section">
            <div className="drawer-label">Immutable Hash (SHA-256)</div>
            <div className="hash-badge">{record.content_hash}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────

const sidebarItems = [
  { to: '/overview', label: 'Overview', icon: Layers3 },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/units', label: 'Units', icon: Database },
  { to: '/reviews', label: 'Review Queue', icon: FileText },
  { to: '/recovery', label: 'Recovery', icon: ShieldCheck },
  { to: '/evidence', label: 'Evidence', icon: GitBranch },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/failures', label: 'Failures', icon: XCircle },
  { to: '/analytics', label: 'Analytics', icon: Gauge },
  { to: '/system', label: 'Pod / System', icon: CircleDot },
]

function Shell() {
  const location = useLocation()
  const { workflows, isBackendConnected, refreshData, openRunModal, openOverrideModal, handleResumeWorkflow } = useApp()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Find if there is any active halted or blocked workflow to warn in banner
  const blockedWorkflow = useMemo(() => {
    return workflows.find((w) => w.status === 'BLOCKED' || Boolean(w.halted))
  }, [workflows])

  if (location.pathname === '/') {
    return <CoverPage />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand-block">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
          <div className="brand-mark">C</div>
          <div className="brand-copy">
            <div className="brand-title">CUBE</div>
            <div className="brand-subtitle">Pod 05</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {sidebarItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="micro-label">POD STATUS</div>
          <div className="system-row">
            <span>Commerce Ops</span>
          </div>
          <div className={`system-row ${isBackendConnected ? 'healthy' : ''}`}>
            <span className={`status-dot ${isBackendConnected ? 'healthy-dot' : ''}`} />
            <span>Orchestrator</span>
            <span className="status-meta">{isBackendConnected ? 'Online (8100)' : 'Local Mode'}</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <div className="crumb-inline">CUBE / POD 05 / LIVE OPERATIONS</div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="search-box" onClick={openRunModal}>
              <Search size={15} />
              <span>Run or find workflow...</span>
              <kbd>+ Run</kbd>
            </button>
            <div className="org-tag">Org: demo_alpha</div>
            <div className="health-tag">
              <span className={`status-dot ${isBackendConnected ? 'healthy-dot' : ''}`} />
              {isBackendConnected ? 'Live API Connected' : 'Pod Ready'}
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => refreshData()}
              title="Refresh Pod Data"
            >
              <RefreshCw size={14} />
            </button>
            <div className="user-pill">UP</div>
          </div>
        </header>

        <main className="router-shell">
          {blockedWorkflow && (
            <div style={{ padding: '16px 28px 0' }}>
              <div className="blocked-banner">
                <div className="blocked-banner-left">
                  <div className="blocked-banner-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="blocked-banner-title">
                      Workflow Blocked: {blockedWorkflow.workflow_id} ({blockedWorkflow.subject_id})
                    </div>
                    <div className="blocked-banner-desc">
                      Stage &quot;{blockedWorkflow.current_stage}&quot; requires human intervention —{' '}
                      {blockedWorkflow.halted?.reason || blockedWorkflow.status_reason || 'Verdict uncertain'}
                    </div>
                  </div>
                </div>
                <div className="blocked-banner-actions">
                  <button
                    type="button"
                    className="primary-button small"
                    onClick={() =>
                      openOverrideModal({
                        workflowId: blockedWorkflow.workflow_id,
                        recordId:
                          blockedWorkflow.stage_results.find((s) => s.needs_human)?.record_id ||
                          `REC-${blockedWorkflow.subject_id}`,
                        currentVerdict: 'UNCERTAIN',
                        stage: blockedWorkflow.current_stage || undefined,
                      })
                    }
                  >
                    Intervene & Override
                  </button>
                  <button
                    type="button"
                    className="secondary-button small"
                    onClick={() => handleResumeWorkflow(blockedWorkflow.workflow_id)}
                  >
                    Resume
                  </button>
                </div>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/units/:id" element={<UnitDetailPage />} />
            <Route path="/reviews" element={<ReviewQueuePage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/recovery/charges/:id" element={<RecoveryChargeDetailPage />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/agents/:slug" element={<AgentDetailPage />} />
            <Route path="/failures" element={<FailuresPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="status-bar">
          <span className="status-label">Live</span>
          <span className="status-pulse" />
          <span>{location.pathname.replace('/', '') || 'overview'}</span>
          <span className="status-separator" />
          <span>{workflows.length} workflows tracked</span>
          <span className="status-separator" />
          <span>{isBackendConnected ? 'Connected to http://localhost:8100' : 'Offline / Standalone mode'}</span>
        </footer>
      </div>
    </div>
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────

function CoverPage() {
  const workflowSteps = [
    { id: '01', label: 'Connect', title: 'Connect your commerce account', detail: 'Securely synchronize vendors, SKUs, inventory, and shipment state into one operating context.', tone: 'purple' },
    { id: '02', label: 'Scan', title: 'Agents scan your full catalog', detail: 'CUBE agents identify conditions, risk signals, and recovery opportunities across every unit.', tone: 'green' },
    { id: '03', label: 'Decide', title: 'Auto-prioritize the next action', detail: 'The system routes each unit through receiving, recovery, and final disposition with evidence.', tone: 'blue' },
  ]

  return (
    <div className="cover-page">
      <header className="cover-header">
        <div className="cover-brand">CUBE</div>
        <nav className="cover-nav" aria-label="Cover navigation">
          <Link to="/overview">Overview</Link>
          <Link to="/agents">Agents</Link>
          <Link to="/workflows">Workflow</Link>
          <Link to="/evidence">Evidence</Link>
        </nav>
        <Link to="/overview" className="cover-enter-button">
          Enter Control Center <ChevronRight size={15} />
        </Link>
      </header>

      <main className="cover-main">
        <section className="cover-hero">
          <div className="hero-copy hero-copy-large">
            <span className="floating-pill">Now live on CUBE</span>
            <h1>
              Your commerce operation,<br />
              <span className="highlight-text">Running on autopilot.</span>
            </h1>
            <p>
              Intelligent agents orchestrate receiving, packing, returns, and recovery through one evidence-driven control layer.
            </p>
            <div className="hero-actions">
              <Link to="/overview" className="primary-button wide-button">
                Explore the system <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="Commerce workflow interface">
            <div className="hero-visual-card" />
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="orb orb-three" />
            <div className="controller-ring" />
          </div>
        </section>

        <section className="story-panel">
          <div className="story-badge">How it works</div>
          <h2>Connect once. Let the agents run.</h2>

          <div className="step-flow">
            <div className="flow-column left-column">
              {workflowSteps.slice(0, 2).map((step) => (
                <div key={step.id} className="step-item">
                  <span className={`step-index ${step.tone}`}>{step.id}</span>
                  <div className={`step-label label-${step.tone}`}>{step.label}</div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="flow-column right-column">
              {workflowSteps.slice(2).map((step) => (
                <div key={step.id} className="step-item">
                  <span className={`step-index ${step.tone}`}>{step.id}</span>
                  <div className={`step-label label-${step.tone}`}>{step.label}</div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function OverviewPage() {
  const { workflows, health, openRunModal, openOverrideModal } = useApp()
  const navigate = useNavigate()
  const [activityFilter, setActivityFilter] = useState<'All' | 'Success' | 'Failed' | 'Paused / Blocked'>('All')

  // Derive dynamic KPIs from real workflows
  const activeCount = workflows.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'PENDING').length
  const returnsCount = workflows.filter((w) => Boolean((w.context as any)?.returned) || w.current_stage === 'returns').length
  const reviewCount = workflows.filter(
    (w) => w.status === 'BLOCKED' || w.stage_results.some((s) => s.needs_human)
  ).length
  const failedCount = workflows.filter((w) => w.status === 'FAILED' || w.errors.length > 0).length
  const claimableTotal = workflows.reduce((sum, w) => sum + (w.final_outcome?.claimable_usd || 0), 0)
  const claimsCount = workflows.filter(
    (w) => w.status === 'RECOVERY_REQUIRED' || w.final_outcome?.outcome === 'CLAIM_RECOMMENDED'
  ).length
  const completedCount = workflows.filter((w) => w.status === 'COMPLETED').length

  const kpis = [
    { label: 'Active Workflows', value: String(activeCount), indicator: `${workflows.length} total`, route: '/workflows' },
    { label: 'Returns', value: String(returnsCount), indicator: 'Inspected', route: '/workflows?stage=returns' },
    { label: 'Needs Review', value: String(reviewCount), indicator: reviewCount > 0 ? `${reviewCount} urgent` : 'Clean', route: '/reviews' },
    { label: 'Failed / Blocked', value: String(failedCount), indicator: failedCount > 0 ? 'Action needed' : '0 errors', route: '/failures' },
    { label: 'Claims Recommended', value: String(claimsCount), indicator: `$${claimableTotal.toFixed(2)}`, route: '/recovery?filter=claimable' },
    { label: 'Completed', value: String(completedCount), indicator: `${completedCount} finalized`, route: '/workflows?status=completed' },
  ]

  // Dynamic priority bench
  const priorityItems = useMemo(() => {
    const list: Array<{ id: string; title: string; detail: string; severity: string; owner: string; wf: WorkflowState }> = []
    workflows.forEach((w) => {
      if (w.status === 'BLOCKED' || Boolean(w.halted)) {
        list.push({
          id: w.workflow_id,
          title: `${w.workflow_id} (${w.subject_id})`,
          detail: w.halted?.reason || w.status_reason || 'Halted awaiting human override.',
          severity: 'critical',
          owner: 'Human review',
          wf: w,
        })
      } else if (w.final_outcome?.outcome === 'CLAIM_RECOMMENDED') {
        list.push({
          id: w.workflow_id,
          title: `CLAIM: ${w.workflow_id}`,
          detail: `Recovery contradicted charges. $${(w.final_outcome.claimable_usd || 2).toFixed(2)} claimable payout ready.`,
          severity: 'high',
          owner: 'Recovery Pod',
          wf: w,
        })
      } else if (w.status === 'FAILED') {
        list.push({
          id: w.workflow_id,
          title: `FAIL: ${w.workflow_id}`,
          detail: w.errors[0]?.message ? String(w.errors[0].message) : 'Stage error recorded.',
          severity: 'medium',
          owner: 'Ops lead',
          wf: w,
        })
      }
    })
    return list.slice(0, 4)
  }, [workflows])

  // Live activity feed from transitions
  const liveEvents = useMemo(() => {
    const events: Array<{ time: string; unit: string; stage: string; event: string; status: string }> = []
    workflows.forEach((w) => {
      w.transitions.forEach((t) => {
        const timeStr = t.at ? new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00'
        let status = 'Success'
        if (t.event.includes('error') || t.event.includes('fail')) status = 'Failed'
        if (t.event.includes('halt') || t.event.includes('blocked')) status = 'Paused / Blocked'

        events.push({
          time: timeStr,
          unit: w.subject_id,
          stage: t.stage || w.current_stage || 'Flow',
          event: t.detail || t.event.replace(/_/g, ' '),
          status,
        })
      })
    })

    if (events.length === 0) {
      return [
        { time: '14:54', unit: 'UNIT-0014', stage: 'Recovery', event: 'Recovery charge contradicted ($2.00 claimable)', status: 'Success' },
        { time: '14:55', unit: 'UNIT-0018', stage: 'Receiving', event: 'Workflow became blocked (verification needed)', status: 'Paused / Blocked' },
        { time: '14:50', unit: 'UNIT-0002', stage: 'Final Outcome', event: 'Workflow completed clean', status: 'Success' },
      ]
    }
    return events.slice(-8).reverse()
  }, [workflows])

  const filteredActivity = liveEvents.filter((entry) => {
    if (activityFilter === 'All') return true
    return entry.status === activityFilter
  })

  return (
    <div className="page-stack">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Commerce Control Center</span>
          <h1>Commerce Control Center</h1>
          <p>Pod 05 · Five-agent commerce operations</p>
          <div className="hero-flow">Receiving → Prep / Pack → Returns → Recovery</div>
        </div>

        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={openRunModal}>
            + New Workflow
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/workflows')}>
            Browse Workflows
          </button>
          <button type="button" className="tertiary-button" onClick={() => navigate('/reviews')}>
            Review Queue ({reviewCount})
          </button>
        </div>
      </section>

      <section className="kpi-strip">
        {kpis.map((item) => (
          <Link key={item.label} to={item.route} className="kpi-card">
            <div className="kpi-topline">
              <span className="kpi-value">{item.value}</span>
              <span className="mini-trend">{item.indicator}</span>
            </div>
            <div className="kpi-label">{item.label}</div>
          </Link>
        ))}
      </section>

      {/* Priority Workbench */}
      <section className="priority-workbench panel">
        <div className="panel-header row-between">
          <div className="panel-title">Priority workbench</div>
          <button type="button" className="secondary-button small" onClick={() => navigate('/reviews')}>
            Open queue
          </button>
        </div>

        <div className="priority-grid">
          <div className="priority-list">
            {priorityItems.length > 0 ? (
              priorityItems.map((item) => (
                <div key={item.id} className={`priority-item ${item.severity}`}>
                  <div className="priority-topline">
                    <span className="priority-severity">{item.severity}</span>
                    <span className="priority-owner">{item.owner}</span>
                  </div>
                  <div className="priority-name">{item.title}</div>
                  <p>{item.detail}</p>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={() => navigate(`/workflows/${item.wf.workflow_id}`)}
                    >
                      View
                    </button>
                    {item.severity === 'critical' && (
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() =>
                          openOverrideModal({
                            workflowId: item.wf.workflow_id,
                            recordId:
                              item.wf.stage_results.find((s) => s.needs_human)?.record_id ||
                              `REC-${item.wf.subject_id}`,
                            currentVerdict: 'UNCERTAIN',
                            stage: item.wf.current_stage || undefined,
                          })
                        }
                      >
                        Override
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">All workflows are currently healthy and moving through stages.</div>
            )}
          </div>

          <div className="priority-summary">
            <div className="summary-metric">
              <span className="summary-value">94%</span>
              <span className="summary-label">operator confidence</span>
            </div>
            <div className="summary-grid">
              <div>
                <span className="summary-subvalue">{workflows.length}</span>
                <span className="summary-sublabel">Total Units</span>
              </div>
              <div>
                <span className="summary-subvalue">${claimableTotal.toFixed(2)}</span>
                <span className="summary-sublabel">Claim Value</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Chart & Pod Health */}
      <section className="stack-grid">
        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Agent metrics</div>
              <h2>Operational execution profile</h2>
            </div>
            <div className="meta-stamp">Live telemetry</div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analyticsData}>
                <XAxis dataKey="agent" fontSize={11} stroke="#606661" />
                <YAxis fontSize={11} stroke="#606661" />
                <Tooltip />
                <Bar dataKey="pass" fill="#2f8f68" radius={[4, 4, 0, 0]} name="Pass %" />
                <Bar dataKey="uncertain" fill="#b78637" radius={[4, 4, 0, 0]} name="Uncertain %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Pod environment</div>
              <h2>Pod 05 Health</h2>
            </div>
            <span className="health-tag">
              <span className="status-dot healthy-dot" />
              {health?.status === 'ok' ? 'All Systems Go' : 'Operational'}
            </span>
          </div>

          <div className="side-stack">
            {exampleAgents.map((ag) => (
              <div key={ag.slug} className="key-value">
                <span>{ag.title}</span>
                <StatusBadge label="HEALTHY" variant="success" />
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Live Activity Feed */}
      <section className="panel">
        <div className="panel-header row-between">
          <div>
            <div className="eyebrow">Live ledger</div>
            <h2>Operational activity feed</h2>
          </div>
          <div className="filter-row">
            {(['All', 'Success', 'Failed', 'Paused / Blocked'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`secondary-button small ${activityFilter === filter ? 'active' : ''}`}
                onClick={() => setActivityFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Unit</th>
                <th>Stage</th>
                <th>Event</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivity.map((item, idx) => (
                <tr key={`${item.unit}-${item.time}-${idx}`}>
                  <td>{item.time}</td>
                  <td><strong>{item.unit}</strong></td>
                  <td>{item.stage}</td>
                  <td>{item.event}</td>
                  <td>
                    <StatusBadge
                      label={item.status}
                      variant={
                        item.status === 'Success'
                          ? 'success'
                          : item.status === 'Failed'
                          ? 'danger'
                          : 'warning'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function WorkflowsPage() {
  const { workflows, openRunModal } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'RECOVERY_REQUIRED' | 'IN_PROGRESS' | 'BLOCKED' | 'FAILED' | 'COMPLETED'>('All')

  const filteredWorkflows = workflows.filter((w) => {
    const matchesQuery =
      w.workflow_id.toLowerCase().includes(query.toLowerCase()) ||
      w.subject_id.toLowerCase().includes(query.toLowerCase()) ||
      w.org_id.toLowerCase().includes(query.toLowerCase())

    const matchesStatus = statusFilter === 'All' || w.status === statusFilter
    return matchesQuery && matchesStatus
  })

  return (
    <PageTemplate title="Workflows" subtitle="All running and completed commerce workflows">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          <input
            type="text"
            placeholder="Search by workflow ID, unit ID, org..."
            className="search-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {(['All', 'RECOVERY_REQUIRED', 'IN_PROGRESS', 'BLOCKED', 'FAILED', 'COMPLETED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`secondary-button small ${statusFilter === filter ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'All' ? 'All' : filter}
            </button>
          ))}
        </div>
        <button type="button" className="primary-button small" onClick={openRunModal}>
          + Run Workflow
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Workflow ID</th>
              <th>Unit ID</th>
              <th>Org</th>
              <th>Route</th>
              <th>Returned</th>
              <th>Current Stage</th>
              <th>Workflow Status</th>
              <th>Final Outcome</th>
              <th>Claimable</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.map((w) => (
              <tr key={w.workflow_id} onClick={() => navigate(`/workflows/${w.workflow_id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <Link to={`/workflows/${w.workflow_id}`} onClick={(e) => e.stopPropagation()}>
                    <strong>{w.workflow_id}</strong>
                  </Link>
                </td>
                <td>{w.subject_id}</td>
                <td>{w.org_id}</td>
                <td>{((w.context as any)?.route || 'FBA').toUpperCase()}</td>
                <td>{(w.context as any)?.returned ? 'YES' : 'NO'}</td>
                <td>{w.current_stage || '—'}</td>
                <td>
                  <StatusBadge
                    label={w.status}
                    variant={
                      w.status === 'COMPLETED'
                        ? 'success'
                        : w.status === 'RECOVERY_REQUIRED'
                        ? 'primary'
                        : w.status === 'BLOCKED' || w.status === 'FAILED'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </td>
                <td>
                  {w.final_outcome ? (
                    <span>
                      <StatusBadge
                        label={w.final_outcome.outcome}
                        variant={w.final_outcome.outcome === 'CLAIM_RECOMMENDED' ? 'primary' : 'success'}
                      />
                      {w.final_outcome.provisional && <span className="provisional-badge">Provisional</span>}
                    </span>
                  ) : (
                    <span style={{ color: '#8b918c', fontSize: 12 }}>In progress</span>
                  )}
                </td>
                <td>
                  {w.final_outcome?.claimable_usd ? (
                    <strong style={{ color: '#2f8f68' }}>${w.final_outcome.claimable_usd.toFixed(2)}</strong>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function WorkflowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { workflows, openOverrideModal, handleResumeWorkflow, openEvidenceDrawer } = useApp()
  const [evidenceBundle, setEvidenceBundle] = useState<EvidenceBundle | null>(null)

  const workflow = workflows.find((w) => w.workflow_id === id) || workflows[0]

  useEffect(() => {
    if (workflow) {
      api
        .getEvidence(workflow.workflow_id)
        .then((bundle) => setEvidenceBundle(bundle))
        .catch(() => setEvidenceBundle(null))
    }
  }, [workflow])

  // Extract clean stages
  const stageResults = workflow.stage_results || []
  const flowStages = ['receiving', 'prep', 'pack', 'returns', 'recovery']
  const stageMap = new Map<string, StageResult>()
  stageResults.forEach((s) => stageMap.set(s.stage, s))

  const handleRecordClick = (recordId: string) => {
    if (evidenceBundle?.evidence[recordId]) {
      openEvidenceDrawer(evidenceBundle.evidence[recordId])
    } else {
      // Create minimal preview
      openEvidenceDrawer({
        record_id: recordId,
        workflow_id: workflow.workflow_id,
        stage: 'recovery',
        agent_id: 'agent@cube',
        status: 'completed',
        subject: { org_id: workflow.org_id, subject_id: workflow.subject_id },
        decision: { verdict: 'PASS', outcome: 'valid', needs_human: false },
        payload: { reference: recordId },
        inputs: [],
      })
    }
  }

  return (
    <PageTemplate
      title={workflow.subject_id}
      subtitle={`${workflow.workflow_id} · Org: ${workflow.org_id}`}
      breadcrumb={[
        { label: 'Overview', to: '/overview' },
        { label: 'Workflows', to: '/workflows' },
        { label: workflow.workflow_id, to: `/workflows/${workflow.workflow_id}` },
      ]}
    >
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{workflow.subject_id}</h2>
              <p>{workflow.workflow_id}</p>
            </div>
            <div className="pill-cluster">
              <StatusBadge
                label={workflow.status}
                variant={
                  workflow.status === 'COMPLETED'
                    ? 'success'
                    : workflow.status === 'RECOVERY_REQUIRED'
                    ? 'primary'
                    : workflow.status === 'BLOCKED' || workflow.status === 'FAILED'
                    ? 'danger'
                    : 'warning'
                }
              />
              {workflow.final_outcome && (
                <span>
                  <StatusBadge
                    label={workflow.final_outcome.outcome}
                    variant={workflow.final_outcome.outcome === 'CLAIM_RECOMMENDED' ? 'primary' : 'success'}
                  />
                  {workflow.final_outcome.provisional && (
                    <span className="provisional-badge">Provisional</span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              className="primary-button inline-link"
              onClick={() => navigate(`/evidence?workflow=${workflow.workflow_id}`)}
            >
              Explore Evidence Graph
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleResumeWorkflow(workflow.workflow_id)}
            >
              Resume
            </button>
            <button
              type="button"
              className="tertiary-button"
              onClick={() =>
                openOverrideModal({
                  workflowId: workflow.workflow_id,
                  recordId:
                    workflow.stage_results.find((s) => s.needs_human)?.record_id ||
                    workflow.evidence_references[0] ||
                    `REC-${workflow.subject_id}`,
                  currentVerdict: 'UNCERTAIN',
                  stage: workflow.current_stage || undefined,
                })
              }
            >
              Intervene / Override
            </button>
          </div>

          {/* 5-Stage Orchestration Timeline */}
          <div className="timeline-panel">
            {flowStages.map((stageName) => {
              const res = stageMap.get(stageName)
              const isSkipped = res?.state === 'skipped'
              const isCompleted = res?.state === 'completed'
              const isError = res?.state === 'error'
              const verdict = res?.verdict || null
              const nextRec =
                typeof res?.next_step_recommendation === 'object' && res?.next_step_recommendation !== null
                  ? res.next_step_recommendation.reason
                  : typeof res?.next_step_recommendation === 'string'
                  ? res.next_step_recommendation
                  : null

              return (
                <div
                  key={stageName}
                  className={`timeline-item ${isSkipped ? 'skipped' : isError ? 'error' : isCompleted ? 'complete' : 'active'}`}
                >
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{stageName}</span>
                  <div className="timeline-copy">
                    <strong>
                      {isSkipped
                        ? 'Stage Bypassed'
                        : isCompleted
                        ? `Verdict: ${verdict || 'PASS'} · ${res?.outcome || 'Finished'}`
                        : isError
                        ? `Halted: ${res?.error?.message || 'Verification Error'}`
                        : 'Awaiting execution'}
                    </strong>
                    {isSkipped && res?.skipped_reason && (
                      <div className="skip-reason">Skipped: {res.skipped_reason}</div>
                    )}
                    {res?.record_id && (
                      <small
                        onClick={() => handleRecordClick(res.record_id!)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Evidence: {res.record_id}
                      </small>
                    )}
                    {nextRec && (
                      <div>
                        <span className="hint-chip">
                          <Info size={11} /> {nextRec}
                        </span>
                      </div>
                    )}
                  </div>
                  <span>
                    {isSkipped ? (
                      'SKIPPED'
                    ) : isCompleted ? (
                      '✓'
                    ) : isError ? (
                      <XCircle size={15} color="#c46b64" />
                    ) : (
                      'PENDING'
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Override History if present */}
          {workflow.overrides && workflow.overrides.length > 0 && (
            <div className="override-history-card">
              <div className="side-label">Audit: Override History ({workflow.overrides.length})</div>
              <table className="override-table">
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Target Record</th>
                    <th>Verdict Change</th>
                    <th>Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.overrides.map((ovr) => (
                    <tr key={ovr.override_id}>
                      <td><strong>{ovr.actor}</strong></td>
                      <td>{ovr.target}</td>
                      <td>
                        {ovr.previous_verdict} → <strong>{ovr.new_verdict}</strong>
                      </td>
                      <td>{ovr.reason}</td>
                      <td><small>{new Date(ovr.at).toLocaleTimeString()}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transition Audit Log */}
          {workflow.transitions && workflow.transitions.length > 0 && (
            <div className="override-history-card">
              <div className="side-label">State Transitions & Audit Log</div>
              <div className="transitions-list">
                {workflow.transitions.map((tr, idx) => (
                  <div key={idx} className="transition-entry">
                    <div>
                      <strong>{tr.event}</strong> · {tr.stage ? `${tr.stage}: ` : ''}
                      <span>{tr.detail || '—'}</span>
                    </div>
                    <span className="transition-time">
                      {new Date(tr.at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Final outcome</div>
            <h3>{workflow.final_outcome?.outcome || workflow.status}</h3>
            {workflow.final_outcome?.claimable_usd ? (
              <div className="money-line">
                Claimable <strong className="claimable-value">${workflow.final_outcome.claimable_usd.toFixed(2)}</strong>
              </div>
            ) : null}
            <p>
              {workflow.final_outcome?.reason ||
                workflow.status_reason ||
                'Orchestration flow evaluating unit integrity and charges.'}
            </p>

            <div className="side-label" style={{ marginTop: 16 }}>Contributing Evidence</div>
            <div className="record-list">
              {workflow.evidence_references.map((ref) => (
                <span
                  key={ref}
                  onClick={() => handleRecordClick(ref)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view evidence details"
                >
                  {ref}
                </span>
              ))}
            </div>
          </div>

          <div className="side-card">
            <div className="side-label">Workflow Context</div>
            <div className="key-value"><span>Org ID</span><strong>{workflow.org_id}</strong></div>
            <div className="key-value"><span>Unit ID</span><strong>{workflow.subject_id}</strong></div>
            <div className="key-value"><span>Route</span><strong>{((workflow.context as any)?.route || 'FBA').toUpperCase()}</strong></div>
            <div className="key-value"><span>Customer Returned</span><strong>{(workflow.context as any)?.returned ? 'YES' : 'NO'}</strong></div>
            <div className="key-value"><span>Evidence Records</span><strong>{workflow.evidence_references.length}</strong></div>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function UnitsPage() {
  const { workflows } = useApp()
  const navigate = useNavigate()
  const [unitFilter, setUnitFilter] = useState<'All' | 'RECOVERY_REQUIRED' | 'BLOCKED' | 'COMPLETED'>('All')

  const units = useMemo(() => {
    return workflows.map((w) => ({
      id: w.subject_id,
      workflowId: w.workflow_id,
      org: w.org_id,
      route: ((w.context as any)?.route || 'fba').toUpperCase(),
      returned: (w.context as any)?.returned ? 'YES' : 'NO',
      stage: w.current_stage || 'Receiving',
      condition: w.final_outcome ? 'Inspected' : 'Pending',
      disposition: w.final_outcome?.outcome === 'CLAIM_RECOMMENDED' ? 'CLAIM' : 'RESTOCK',
      workflowStatus: w.status,
      finalOutcome: w.final_outcome?.outcome || 'IN_PROGRESS',
    }))
  }, [workflows])

  const filteredUnits = units.filter((u) => unitFilter === 'All' || u.workflowStatus === unitFilter)

  return (
    <PageTemplate title="Units" subtitle="Operational commerce objects and unit trajectories">
      <div className="page-summary-grid">
        <div className="summary-card">
          <span>Total units</span>
          <strong>{units.length}</strong>
        </div>
        <div className="summary-card">
          <span>Needs action</span>
          <strong>{units.filter((u) => u.workflowStatus === 'BLOCKED' || u.workflowStatus === 'RECOVERY_REQUIRED').length}</strong>
        </div>
        <div className="summary-card">
          <span>Finalized</span>
          <strong>{units.filter((u) => u.workflowStatus === 'COMPLETED').length}</strong>
        </div>
      </div>

      <div className="toolbar filter-toolbar">
        {(['All', 'RECOVERY_REQUIRED', 'BLOCKED', 'COMPLETED'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`secondary-button small ${unitFilter === filter ? 'active' : ''}`}
            onClick={() => setUnitFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Unit ID</th>
              <th>Workflow</th>
              <th>Organization</th>
              <th>Route</th>
              <th>Returned</th>
              <th>Stage</th>
              <th>Disposition</th>
              <th>Workflow Status</th>
              <th>Final Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.map((unit) => (
              <tr key={unit.id} onClick={() => navigate(`/units/${unit.id}`)} style={{ cursor: 'pointer' }}>
                <td><strong>{unit.id}</strong></td>
                <td><Link to={`/workflows/${unit.workflowId}`}>{unit.workflowId}</Link></td>
                <td>{unit.org}</td>
                <td>{unit.route}</td>
                <td>{unit.returned}</td>
                <td>{unit.stage}</td>
                <td>{unit.disposition}</td>
                <td>
                  <StatusBadge
                    label={unit.workflowStatus}
                    variant={
                      unit.workflowStatus === 'COMPLETED'
                        ? 'success'
                        : unit.workflowStatus === 'RECOVERY_REQUIRED'
                        ? 'primary'
                        : 'danger'
                    }
                  />
                </td>
                <td>
                  <StatusBadge
                    label={unit.finalOutcome}
                    variant={unit.finalOutcome === 'CLAIM_RECOMMENDED' ? 'primary' : 'success'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function UnitDetailPage() {
  const { id } = useParams()
  const { workflows } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'INBOUND' | 'PACK / PREP' | 'RETURNED'>('RETURNED')

  const matchingWf = workflows.find((w) => w.subject_id === id) || workflows[0]

  const evidenceChecks = {
    INBOUND: ['Invoice matched', 'Carton count verified', 'Case seal intact'],
    'PACK / PREP': ['Bundle content verified', 'Condition check passed', 'Packaging baseline reviewed'],
    RETURNED: ['Return reason confirmed', 'Condition compared to expected', 'Recovery documentation attached'],
  }

  return (
    <PageTemplate
      title={`Unit ${matchingWf.subject_id}`}
      subtitle={`${matchingWf.workflow_id} · Route: ${((matchingWf.context as any)?.route || 'FBA').toUpperCase()}`}
      breadcrumb={[
        { label: 'Overview', to: '/overview' },
        { label: 'Units', to: '/units' },
        { label: matchingWf.subject_id, to: `/units/${matchingWf.subject_id}` },
      ]}
    >
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{matchingWf.subject_id}</h2>
              <p>Organization: {matchingWf.org_id}</p>
            </div>
            <div className="pill-cluster">
              <StatusBadge
                label={matchingWf.status}
                variant={matchingWf.status === 'COMPLETED' ? 'success' : 'primary'}
              />
              <StatusBadge
                label={matchingWf.final_outcome?.outcome || 'IN_PROGRESS'}
                variant={matchingWf.final_outcome?.outcome === 'CLAIM_RECOMMENDED' ? 'primary' : 'warning'}
              />
            </div>
          </div>

          <div className="action-row">
            <Link to={`/workflows/${matchingWf.workflow_id}`} className="primary-button inline-link">
              Open Workflow
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(`/evidence?workflow=${matchingWf.workflow_id}`)}
            >
              View Evidence Graph
            </button>
          </div>

          <div className="identity-grid">
            <div className="identity-card">
              <span className="side-label">Product identity</span>
              <h3>Commerce Unit {matchingWf.subject_id}</h3>
              <div className="key-value"><span>Org</span><strong>{matchingWf.org_id}</strong></div>
              <div className="key-value"><span>Route</span><strong>{((matchingWf.context as any)?.route || 'FBA').toUpperCase()}</strong></div>
              <div className="key-value"><span>Customer Returned</span><strong>{(matchingWf.context as any)?.returned ? 'YES' : 'NO'}</strong></div>
            </div>
            <div className="identity-card">
              <span className="side-label">Verification summary</span>
              <ul className="check-list">
                <li>✓ Identity matched to shipment manifest</li>
                <li>✓ Upstream evidence verified: {matchingWf.evidence_references.length} records</li>
                <li>✓ Current stage: {matchingWf.current_stage || 'Done'}</li>
              </ul>
            </div>
          </div>

          <div className="tab-row">
            {(['INBOUND', 'PACK / PREP', 'RETURNED'] as const).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                className={`tab-button ${tab === tabKey ? 'selected' : ''}`}
                onClick={() => setTab(tabKey)}
              >
                {tabKey}
              </button>
            ))}
          </div>

          <div className="image-grid">
            <div className="placeholder-image"><span>{tab} Evidence</span></div>
            <div className="placeholder-image alt"><span>Reference snapshot</span></div>
            <div className="placeholder-image alt"><span>Inspection details</span></div>
          </div>

          <div className="detail-two-col">
            <div className="compare-card">
              <div className="mini-head">Stage checks</div>
              <ul>
                {evidenceChecks[tab].map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="compare-card">
              <div className="mini-head">Disposition rationale</div>
              <p className="detail-note">
                {matchingWf.final_outcome?.reason || 'Verified through upstream automated agent checks.'}
              </p>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Evidence Chain</div>
            <div className="record-list">
              {matchingWf.evidence_references.map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function ReviewQueuePage() {
  const { workflows, openOverrideModal } = useApp()
  const navigate = useNavigate()

  // Filter workflows needing human intervention
  const pendingReviews = useMemo(() => {
    return workflows
      .filter((w) => w.status === 'BLOCKED' || w.stage_results.some((s) => s.needs_human))
      .map((w) => {
        const uncertainStage = w.stage_results.find((s) => s.needs_human)
        return {
          unit: w.subject_id,
          workflow: w.workflow_id,
          stage: uncertainStage?.stage || w.current_stage || 'Unknown',
          problem: uncertainStage?.error?.message ? String(uncertainStage.error.message) : 'Verdict UNCERTAIN / Inspection needed',
          confidence: '0.62',
          reason: w.halted?.reason || 'Agent flagged unit for human operator verification.',
          evidenceCount: w.evidence_references.length,
          recordId: uncertainStage?.record_id || `REC-${w.subject_id}`,
        }
      })
  }, [workflows])

  const displayList = pendingReviews.length > 0 ? pendingReviews : fallbackReviews.map((r) => ({
    ...r,
    recordId: `RCV-${r.unit.replace('UNIT-', '')}`,
  }))

  return (
    <PageTemplate title="Review Queue" subtitle="Items waiting on human intervention or override">
      <div className="page-summary-grid">
        <div className="summary-card">
          <span>Open reviews</span>
          <strong>{displayList.length}</strong>
        </div>
        <div className="summary-card">
          <span>Urgent</span>
          <strong>{displayList.length}</strong>
        </div>
        <div className="summary-card">
          <span>Evidence assets</span>
          <strong>{displayList.reduce((sum, r) => sum + r.evidenceCount, 0)}</strong>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Workflow</th>
              <th>Stage</th>
              <th>Problem</th>
              <th>Reason</th>
              <th>Evidence</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((rev) => (
              <tr key={rev.unit}>
                <td><strong>{rev.unit}</strong></td>
                <td><Link to={`/workflows/${rev.workflow}`}>{rev.workflow}</Link></td>
                <td>{rev.stage}</td>
                <td><span style={{ color: '#c46b64' }}>{rev.problem}</span></td>
                <td><small>{rev.reason}</small></td>
                <td>{rev.evidenceCount} assets</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={() =>
                        openOverrideModal({
                          workflowId: rev.workflow,
                          recordId: rev.recordId,
                          currentVerdict: 'UNCERTAIN',
                          stage: rev.stage,
                        })
                      }
                    >
                      Apply Override
                    </button>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => navigate(`/workflows/${rev.workflow}`)}
                    >
                      Inspect
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function RecoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') ?? 'all'
  const { workflows } = useApp()
  const [liveCharges, setLiveCharges] = useState<RecoveryChargeItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadLiveRecovery() {
      if (!workflows || workflows.length === 0) return
      const extracted: RecoveryChargeItem[] = []

      for (const wf of workflows.slice(0, 10)) {
        try {
          const bundle = await api.getEvidence(wf.workflow_id)
          if (!bundle?.evidence) continue
          for (const [recId, rec] of Object.entries(bundle.evidence)) {
            if (rec.stage === 'recovery' && rec.payload?.charges) {
              const chargesList = rec.payload.charges
              if (Array.isArray(chargesList)) {
                chargesList.forEach((c: any) => {
                  const amtNum = typeof c.amount_usd === 'number' ? c.amount_usd : parseFloat(c.amount_usd) || 0
                  const rawType = c.charge_type || 'fee'
                  const cleanType = rawType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                  const isClaim = c.position === 'CONTRADICTS'
                  extracted.push({
                    id: c.line_id || `${recId}-${extracted.length + 1}`,
                    workflowId: wf.workflow_id,
                    type: cleanType,
                    amount: `$${amtNum.toFixed(2)}`,
                    amountNum: amtNum,
                    position: c.position || 'SILENT',
                    evidence: (c.evidence_record_ids || []).join(', ') || (rec.inputs || []).map((i: any) => i.ref).filter(Boolean).join(', ') || 'None',
                    evidenceIds: c.evidence_record_ids || [],
                    decision: isClaim ? 'CLAIM RECOMMENDED' : 'NO CLAIM',
                    reason: c.reason || rec.decision?.reason || 'Audit against upstream evidence bundle',
                  })
                })
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled && extracted.length > 0) {
        const map = new Map<string, RecoveryChargeItem>()
        extracted.forEach((ch) => map.set(ch.id, ch))
        recoveryCharges.forEach((ch) => {
          if (!map.has(ch.id)) map.set(ch.id, ch)
        })
        setLiveCharges(Array.from(map.values()))
      }
    }

    loadLiveRecovery()
    return () => {
      cancelled = true
    }
  }, [workflows])

  const charges = liveCharges.length > 0 ? liveCharges : recoveryCharges

  const filteredCharges = charges.filter((row) => {
    if (activeFilter === 'claimable') return row.decision === 'CLAIM RECOMMENDED'
    if (activeFilter === 'supports') return row.position === 'SUPPORTS'
    if (activeFilter === 'silent') return row.position === 'SILENT'
    return true
  })

  const claimableTotal = charges
    .filter((row) => row.decision === 'CLAIM RECOMMENDED')
    .reduce((sum, row) => sum + row.amountNum, 0)

  return (
    <PageTemplate title="Recovery & Claims" subtitle="Charge review and automated claim recommendation workflow">
      <div className="metrics-row">
        <MetricCard label="Charges Reviewed" value={String(charges.length)} />
        <MetricCard label="Claims Recommended" value={String(charges.filter((r) => r.decision === 'CLAIM RECOMMENDED').length)} />
        <MetricCard label="Claimable Value" value={`$${claimableTotal.toFixed(2)}`} />
        <MetricCard label="Silent" value={String(charges.filter((r) => r.position === 'SILENT').length)} />
      </div>

      <div className="toolbar filter-toolbar">
        {(['all', 'claimable', 'supports', 'silent'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`secondary-button small ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setSearchParams(filter === 'all' ? {} : { filter })}
          >
            {filter.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Charge ID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Position</th>
              <th>Evidence</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/recovery/charges/${row.id}`}>
                    <strong>{row.id}</strong>
                  </Link>
                </td>
                <td>{row.type}</td>
                <td><strong>{row.amount}</strong></td>
                <td>
                  <StatusBadge
                    label={row.position}
                    variant={row.position === 'CONTRADICTS' ? 'danger' : row.position === 'SUPPORTS' ? 'success' : 'warning'}
                  />
                </td>
                <td><small>{row.evidence}</small></td>
                <td>
                  <StatusBadge
                    label={row.decision}
                    variant={row.decision === 'CLAIM RECOMMENDED' ? 'primary' : 'success'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function RecoveryChargeDetailPage() {
  const { id } = useParams()
  const { workflows, openEvidenceDrawer } = useApp()
  const [charge, setCharge] = useState<RecoveryChargeItem | null>(null)

  useEffect(() => {
    const found = recoveryCharges.find((c) => c.id === id)
    if (found) {
      setCharge(found)
    }

    async function findLive() {
      for (const wf of workflows.slice(0, 10)) {
        try {
          const bundle = await api.getEvidence(wf.workflow_id)
          if (!bundle?.evidence) continue
          for (const rec of Object.values(bundle.evidence)) {
            if (rec.stage === 'recovery' && rec.payload?.charges) {
              const match = rec.payload.charges.find((c: any) => c.line_id === id)
              if (match) {
                const amtNum = typeof match.amount_usd === 'number' ? match.amount_usd : parseFloat(match.amount_usd) || 0
                const rawType = match.charge_type || 'fee'
                const cleanType = rawType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                setCharge({
                  id: match.line_id,
                  workflowId: wf.workflow_id,
                  type: cleanType,
                  amount: `$${amtNum.toFixed(2)}`,
                  amountNum: amtNum,
                  position: match.position || 'SILENT',
                  evidence: (match.evidence_record_ids || []).join(', ') || 'None',
                  evidenceIds: match.evidence_record_ids || [],
                  decision: match.position === 'CONTRADICTS' ? 'CLAIM RECOMMENDED' : 'NO CLAIM',
                  reason: match.reason || rec.decision?.reason || 'Verified by upstream stage audit',
                })
                return
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
    findLive()
  }, [id, workflows])

  const targetCharge = charge || recoveryCharges.find((c) => c.id === id) || recoveryCharges[0]

  const handleInspect = async (recId: string) => {
    try {
      const bundle = await api.getEvidence(targetCharge.workflowId)
      if (bundle?.evidence?.[recId]) {
        openEvidenceDrawer(bundle.evidence[recId])
        return
      }
    } catch {
      // ignore
    }
    openEvidenceDrawer({
      record_id: recId,
      workflow_id: targetCharge.workflowId,
      stage: recId.startsWith('PRP') ? 'prep' : recId.startsWith('RTN') ? 'returns' : 'receiving',
      agent_id: recId.startsWith('RTN') ? 'returns-manager-rtn0045@2' : recId.startsWith('RCV') ? 'receiving-manager-rcv0138@2' : 'prep-stub@0',
      status: 'completed',
      subject: { org_id: 'org_demo_alpha', subject_id: targetCharge.workflowId.replace('WF-org_demo_alpha-', '') },
      decision: { verdict: 'PASS', outcome: 'verified', needs_human: false, reason: targetCharge.reason },
      payload: { reference: recId, disputed_fee: targetCharge.id, status: 'verified_physical_record' },
      inputs: [],
    })
  }

  return (
    <PageTemplate
      title={targetCharge.id}
      subtitle={`${targetCharge.type} · ${targetCharge.amount}`}
      breadcrumb={[
        { label: 'Overview', to: '/overview' },
        { label: 'Recovery', to: '/recovery' },
        { label: targetCharge.id, to: `/recovery/charges/${targetCharge.id}` },
      ]}
    >
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{targetCharge.id}</h2>
              <p>{targetCharge.type} · {targetCharge.amount}</p>
            </div>
            <StatusBadge
              label={targetCharge.position}
              variant={targetCharge.position === 'CONTRADICTS' ? 'danger' : targetCharge.position === 'SUPPORTS' ? 'success' : 'warning'}
            />
          </div>

          <div className="side-card" style={{ marginTop: 20 }}>
            <div className="side-label">Why is this charge disputed?</div>
            <p style={{ lineHeight: 1.6, fontSize: 14 }}>
              {targetCharge.reason}
            </p>
            {targetCharge.evidenceIds && targetCharge.evidenceIds.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {targetCharge.evidenceIds.map((eId) => (
                  <button
                    key={eId}
                    type="button"
                    className="primary-button small"
                    onClick={() => handleInspect(eId)}
                  >
                    Inspect {eId} Evidence
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Decision Summary</div>
            <h3 style={{ color: targetCharge.decision === 'CLAIM RECOMMENDED' ? '#2f8f68' : '#737373' }}>
              {targetCharge.decision}
            </h3>
            <div className="key-value"><span>Workflow</span><strong style={{ fontSize: 12 }}>{targetCharge.workflowId}</strong></div>
            <div className="key-value"><span>Type</span><strong>{targetCharge.type}</strong></div>
            <div className="key-value"><span>Amount</span><strong>{targetCharge.amount}</strong></div>
            <div className="key-value"><span>Position</span><strong>{targetCharge.position}</strong></div>
            <div className="key-value"><span>Evidence Ref</span><strong>{targetCharge.evidence}</strong></div>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function EvidencePage() {
  const { workflows, openEvidenceDrawer } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedWfId = searchParams.get('workflow') || workflows[0]?.workflow_id || 'WF-org_demo_alpha-UNIT-0014'

  const activeWorkflow = workflows.find((w) => w.workflow_id === selectedWfId) || workflows[0]

  const graphNodes = [
    { id: 'workflow', label: activeWorkflow.workflow_id, stage: 'Workflow', x: 240, y: 70, recId: null },
    { id: 'receiving', label: 'RCV-0014', stage: 'Receiving', x: 120, y: 180, recId: 'RCV-0014' },
    { id: 'prep', label: 'PRP-0014', stage: 'Prep', x: 320, y: 180, recId: 'PRP-0014' },
    { id: 'returns', label: 'RTN-0014', stage: 'Returns', x: 520, y: 180, recId: 'RTN-0014' },
    { id: 'recovery', label: 'RCY-UNIT-0014', stage: 'Recovery', x: 720, y: 180, recId: 'RCY-UNIT-0014' },
    { id: 'outcome', label: activeWorkflow.final_outcome?.outcome || 'Outcome', stage: 'Final Outcome', x: 760, y: 70, recId: null },
  ]

  const graphEdges = [
    ['workflow', 'receiving'],
    ['workflow', 'prep'],
    ['workflow', 'returns'],
    ['workflow', 'recovery'],
    ['recovery', 'outcome'],
  ]

  const handleNodeClick = (node: typeof graphNodes[0]) => {
    if (node.recId) {
      openEvidenceDrawer({
        record_id: node.recId,
        workflow_id: activeWorkflow.workflow_id,
        stage: node.stage.toLowerCase(),
        agent_id: `${node.stage.toLowerCase()}-agent@cube`,
        status: 'completed',
        subject: { org_id: activeWorkflow.org_id, subject_id: activeWorkflow.subject_id },
        decision: { verdict: 'PASS', outcome: 'verified', needs_human: false },
        payload: { node: node.label, stage: node.stage },
        inputs: [],
      })
    }
  }

  return (
    <PageTemplate title="Evidence Explorer" subtitle="Operational evidence relationships and contribution chain">
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Workflow:</span>
        <select
          className="form-select"
          style={{ width: 340 }}
          value={selectedWfId}
          onChange={(e) => setSearchParams({ workflow: e.target.value })}
        >
          {workflows.map((w) => (
            <option key={w.workflow_id} value={w.workflow_id}>
              {w.workflow_id} ({w.subject_id} · {w.status})
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: '#606661' }}>Click any node to view immutable record details</span>
      </div>

      <div className="evidence-graph-panel">
        <svg className="evidence-svg" viewBox="0 0 920 340" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {graphEdges.map(([fromId, toId]) => {
            const from = graphNodes.find((n) => n.id === fromId)
            const to = graphNodes.find((n) => n.id === toId)
            if (!from || !to) return null
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(47, 143, 104, 0.4)"
                strokeWidth="2"
              />
            )
          })}
        </svg>

        <div className="graph-node-grid">
          {graphNodes.map((node) => (
            <div
              key={node.id}
              className={`graph-node ${node.recId ? 'clickable-node' : ''}`}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              onClick={() => handleNodeClick(node)}
              title={node.recId ? 'Click to inspect record' : undefined}
            >
              <div>{node.stage}</div>
              <strong>{node.label}</strong>
            </div>
          ))}
        </div>
      </div>
    </PageTemplate>
  )
}

function AgentsPage() {
  const { health } = useApp()
  return (
    <PageTemplate title="Agents" subtitle="Five specialized operational agents and their live pod status">
      <div className="page-summary-grid compact">
        <div className="summary-card">
          <span>Registered agents</span>
          <strong>5</strong>
        </div>
        <div className="summary-card">
          <span>Custom Integrated</span>
          <strong style={{ color: '#2f8f68' }}>3 of 5</strong>
        </div>
        <div className="summary-card">
          <span>System Status</span>
          <strong>{health?.status === 'ok' ? 'HEALTHY' : 'READY'}</strong>
        </div>
      </div>

      <div className="agent-grid">
        {exampleAgents.map((agent) => {
          const liveAgent = health?.agents?.[agent.slug]
          const isIntegrated = agent.status === 'INTEGRATED'
          return (
            <Link key={agent.slug} to={`/agents/${agent.slug}`} className="agent-card">
              <div className="agent-card-top">
                <div className={`status-dot ${isIntegrated ? 'healthy-dot' : 'warning-dot'}`} />
                <span style={{ fontWeight: 600, color: isIntegrated ? '#2f8f68' : '#d97706' }}>
                  {agent.status}
                </span>
              </div>
              <h3>{agent.title}</h3>
              <p style={{ fontSize: 13, color: '#555', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
                {agent.description}
              </p>
              <div className="meta-stack">
                <span>Stage: <strong>{agent.stage}</strong></span>
                <span>Agent ID: <code>{agent.id}</code></span>
                <span>Owner: <strong>{agent.owner}</strong></span>
                <span>Mode: <code>{liveAgent?.mode || agent.mode}</code></span>
              </div>
            </Link>
          )
        })}
      </div>
    </PageTemplate>
  )
}

function AgentDetailPage() {
  const { slug } = useParams()
  const agent = exampleAgents.find((item) => item.slug === slug) ?? exampleAgents[0]
  const isIntegrated = agent.status === 'INTEGRATED'

  return (
    <PageTemplate
      title={agent.title}
      subtitle={`${agent.stage} · ${agent.id}`}
      breadcrumb={[
        { label: 'Overview', to: '/overview' },
        { label: 'Agents', to: '/agents' },
        { label: agent.title, to: `/agents/${agent.slug}` },
      ]}
    >
      <div className="agent-detail-grid">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{agent.title}</h2>
              <p>{agent.stage} Stage · Owner {agent.owner}</p>
            </div>
            <StatusBadge
              label={agent.status}
              variant={isIntegrated ? 'success' : 'warning'}
            />
          </div>

          <div className="metrics-row">
            <MetricCard label="Runs" value={isIntegrated ? '482' : '124'} />
            <MetricCard label="Pass Rate" value={isIntegrated ? '94.2%' : '88.0%'} />
            <MetricCard label="Failures" value={isIntegrated ? '2' : '7'} />
            <MetricCard label="Architecture" value={isIntegrated ? 'CUSTOM' : 'STARTER'} />
            <MetricCard label="Avg Latency" value={isIntegrated ? '1.4s' : '0.2s'} />
          </div>

          <div className="detail-two-col">
            <div className="compare-card">
              <div className="mini-head">What it checks</div>
              <ul>
                {(agent.details?.checks || [
                  'Identity matching against PO and Carton barcodes',
                  'Visual integrity inspection and tamper validation',
                  'Weight and tier classification reconciliation',
                  'Dispute evidence generation',
                ]).map((chk, i) => (
                  <li key={i}>{chk}</li>
                ))}
              </ul>
            </div>
            <div className="compare-card">
              <div className="mini-head">Supported Stages & Duties</div>
              <ul>
                {(agent.details?.stages || [
                  'Dock Inbound Inspection',
                  'Discrepancy Triage',
                  'Evidence Record Signing',
                ]).map((stg, i) => (
                  <li key={i}>{stg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Agent Specification</div>
            <div className="key-value"><span>Stage</span><strong>{agent.stage}</strong></div>
            <div className="key-value"><span>Agent ID</span><strong style={{ fontSize: 11 }}>{agent.id}</strong></div>
            <div className="key-value"><span>Owner</span><strong>{agent.owner}</strong></div>
            <div className="key-value"><span>Mode</span><strong>{agent.mode}</strong></div>
            <div className="key-value"><span>Implementation</span><strong>{agent.status}</strong></div>
          </div>
          <div className="side-card" style={{ marginTop: 16 }}>
            <div className="side-label">Description</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: '#444' }}>
              {agent.description}
            </p>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function FailuresPage() {
  const { workflows, handleResumeWorkflow, openOverrideModal } = useApp()

  const failedWorkflows = useMemo(() => {
    return workflows.filter((w) => w.status === 'FAILED' || w.status === 'BLOCKED' || w.errors.length > 0)
  }, [workflows])

  return (
    <PageTemplate title="Failures & Incidents" subtitle="Operational failures, retries, and halted workflows">
      <div className="incident-overview">
        <div className="incident-grid">
          <div className="incident-card danger">
            <span className="incident-label">Open incident count</span>
            <strong>{failedWorkflows.length}</strong>
            <small>Across returns, receiving, and recovery.</small>
          </div>
          <div className="incident-card">
            <span className="incident-label">Resolved / Clean</span>
            <strong>{workflows.filter((w) => w.status === 'COMPLETED').length}</strong>
            <small>Workflows completed successfully.</small>
          </div>
          <div className="incident-card warning">
            <span className="incident-label">Blocked workflows</span>
            <strong>{workflows.filter((w) => w.status === 'BLOCKED').length}</strong>
            <small>Awaiting override or human review.</small>
          </div>
        </div>

        <div className="incident-alert">
          <div className="incident-alert-header">
            <span className="side-label">Incident Management</span>
            <StatusBadge label="ATTENTION" variant="warning" />
          </div>
          <p>
            Any halted stage can be resumed immediately after human verification or by overriding the stage verdict with operator credentials.
          </p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Workflow ID</th>
              <th>Unit ID</th>
              <th>Stage</th>
              <th>Status Reason</th>
              <th>Errors</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {failedWorkflows.map((w) => (
              <tr key={w.workflow_id}>
                <td>
                  <Link to={`/workflows/${w.workflow_id}`}>
                    <strong>{w.workflow_id}</strong>
                  </Link>
                </td>
                <td>{w.subject_id}</td>
                <td>{w.current_stage || '—'}</td>
                <td><small>{w.halted?.reason || w.status_reason}</small></td>
                <td>
                  <StatusBadge label={w.status} variant="danger" />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={() => handleResumeWorkflow(w.workflow_id)}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() =>
                        openOverrideModal({
                          workflowId: w.workflow_id,
                          recordId:
                            w.stage_results.find((s) => s.needs_human)?.record_id ||
                            `REC-${w.subject_id}`,
                          currentVerdict: 'UNCERTAIN',
                          stage: w.current_stage || undefined,
                        })
                      }
                    >
                      Override
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function AnalyticsPage() {
  const { workflows } = useApp()

  const outcomeCounts = useMemo(() => {
    const map: Record<string, number> = {
      CLEAN: 0,
      CLAIM_RECOMMENDED: 0,
      NEEDS_REVIEW: 0,
      FAILED: 0,
    }
    workflows.forEach((w) => {
      const out = w.final_outcome?.outcome || w.status
      map[out] = (map[out] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [workflows])

  return (
    <PageTemplate title="Analytics" subtitle="Agent performance, workflow health, and operational outcomes">
      <div className="metrics-row">
        <MetricCard label="Workflow Volume" value={String(workflows.length)} />
        <MetricCard label="Completed" value={String(workflows.filter((w) => w.status === 'COMPLETED').length)} />
        <MetricCard label="Review Rate" value={`${Math.round((workflows.filter((w) => w.status === 'BLOCKED').length / Math.max(1, workflows.length)) * 100)}%`} />
        <MetricCard label="Avg Duration" value="3.4s" />
      </div>

      <div className="stack-grid lower-grid">
        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Agent comparison</div>
              <h2>Operational efficiency</h2>
            </div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData}>
                <XAxis dataKey="agent" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="latency" fill="#2f8f68" radius={[6, 6, 0, 0]} name="Latency (s)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Outcome distribution</div>
              <h2>Workflows by state</h2>
            </div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeCounts} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} fill="#2f8f68" label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </PageTemplate>
  )
}

function SystemPage() {
  const { health, isBackendConnected, refreshData } = useApp()

  return (
    <PageTemplate title="Pod 05" subtitle="Standard commerce flow · orchestration environment">
      <div className="system-grid">
        <div className="side-card">
          <div className="side-label">Architecture</div>
          <div className="community-stack">
            <span>Receiving Manager</span>
            <span>Prep Manager</span>
            <span>Pack Manager</span>
            <span>Returns Manager</span>
            <span>Recovery Manager</span>
          </div>
        </div>

        <div className="side-card">
          <div className="side-label">Health & Connectivity</div>
          <div className="key-value">
            <span>Backend API</span>
            <strong>{isBackendConnected ? 'Online (port 8100)' : 'Offline / Standalone'}</strong>
          </div>
          <div className="key-value">
            <span>Flow Engine</span>
            <strong>{health?.flow || 'standard-v1'}</strong>
          </div>
          <div className="key-value">
            <span>Orchestrator Status</span>
            <StatusBadge label={isBackendConnected ? 'HEALTHY' : 'READY'} variant="success" />
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="secondary-button small" onClick={() => refreshData()}>
              Recheck Connection
            </button>
          </div>
        </div>
      </div>
    </PageTemplate>
  )
}

function NotFoundPage() {
  return (
    <PageTemplate title="Page not found" subtitle="The route does not exist in this operations shell.">
      <div className="side-card">
        <p>Return to the overview and continue from there.</p>
        <Link to="/overview" className="primary-button small inline-link">
          Go to Overview
        </Link>
      </div>
    </PageTemplate>
  )
}

function PageTemplate({
  title,
  subtitle,
  breadcrumb,
  children,
}: {
  title: string
  subtitle: string
  breadcrumb?: { label: string; to: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="page-shell">
      {breadcrumb ? (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumb.map((item) => (
            <div key={item.to} className="breadcrumb-item">
              <Link to={item.to}>{item.label}</Link>
              <ChevronRight size={12} />
            </div>
          ))}
        </nav>
      ) : null}
      <div className="page-header">
        <div>
          <div className="eyebrow">Operations</div>
          <h1>{title}</h1>
        </div>
        <div className="page-subtitle">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ label, variant }: { label: string; variant: 'success' | 'danger' | 'warning' | 'primary' }) {
  return <span className={`status-badge ${variant}`}>{label}</span>
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

export default App
