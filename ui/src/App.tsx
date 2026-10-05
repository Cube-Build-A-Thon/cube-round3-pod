import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { CaseSelector } from './components/CaseSelector'
import { PipelineStepper } from './components/PipelineStepper'
import { StationWorkspace } from './components/StationWorkspace'
import { HumanOverrideModal } from './components/HumanOverrideModal'
import { EvidenceTraceDrawer } from './components/EvidenceTraceDrawer'
import { RosterModal } from './components/RosterModal'
import {
  checkHealth,
  fetchCases,
  runWorkflow,
  fetchWorkflowEvidence,
  applyOverride,
  resumeWorkflow,
} from './services/api'
import type { CaseItem, HealthResponse, EvidenceRecord, WorkflowState } from './types'
import { AlertTriangle } from 'lucide-react'
import './App.css'

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [selectedCase, setSelectedCase] = useState<{
    orgId: string
    unitId: string
    route?: string
    returned?: boolean
  }>({
    orgId: 'org_demo_alpha',
    unitId: 'UNIT-0014',
    route: 'fba',
    returned: true,
  })

  const [workflow, setWorkflow] = useState<WorkflowState | null>(null)
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceRecord>>({})
  const [activeStage, setActiveStage] = useState<string>('returns')
  const [isRunning, setIsRunning] = useState(false)
  const [executionNotice, setExecutionNotice] = useState<string | null>(null)

  // Modals state
  const [rosterOpen, setRosterOpen] = useState(false)
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean
    recordId: string
    currentVerdict: string
  }>({
    isOpen: false,
    recordId: '',
    currentVerdict: '',
  })

  // Poll health and load cases on mount
  useEffect(() => {
    loadHealth()
    loadCasesAndInitialRun()
    const healthInterval = setInterval(loadHealth, 15000)
    return () => clearInterval(healthInterval)
  }, [])

  const loadHealth = async () => {
    try {
      setHealthLoading(true)
      const res = await checkHealth()
      setHealth(res)
    } catch (err) {
      console.warn('Health check unreachable:', err)
      setHealth({
        status: 'degraded',
        flow: 'fba_fulfillment_and_returns@1.0',
        agents: {},
      })
    } finally {
      setHealthLoading(false)
    }
  }

  const loadCasesAndInitialRun = async () => {
    const list = await fetchCases()
    setCases(list)
    // Run initial UNIT-0014 automatically so dashboard is primed with data
    handleExecute('org_demo_alpha', 'UNIT-0014', 'fba', true)
  }

  const handleExecute = async (
    orgId: string,
    unitId: string,
    route?: string,
    returned?: boolean,
    chaos: boolean = false
  ) => {
    try {
      setIsRunning(true)
      setExecutionNotice(chaos ? 'Running with simulated chaos latency...' : 'Executing multi-agent pipeline...')

      if (chaos) {
        // Add a visible demo delay for presentation
        await new Promise((r) => setTimeout(r, 600))
      }

      const wf = await runWorkflow(orgId, unitId, route, returned)
      setWorkflow(wf)

      // Fetch evidence bundle for this workflow
      const bundle = await fetchWorkflowEvidence(wf.workflow_id)
      setEvidenceMap(bundle.evidence || {})

      // Determine appropriate active stage to highlight
      const needsHumanStage = wf.stage_results.find((s) => s.needs_human || s.verdict === 'UNCERTAIN')
      if (needsHumanStage) {
        setActiveStage(needsHumanStage.stage)
      } else if (returned) {
        setActiveStage('returns')
      } else {
        setActiveStage('receiving')
      }

      setExecutionNotice(null)
    } catch (err: any) {
      console.error('Workflow execution error:', err)
      setExecutionNotice(`Execution Error: ${err.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleOpenOverride = (recordId: string, currentVerdict: string) => {
    setOverrideModal({
      isOpen: true,
      recordId,
      currentVerdict,
    })
  }

  const handleSubmitOverride = async (
    newVerdict: 'PASS' | 'FAIL' | 'UNCERTAIN',
    actor: string,
    reason: string,
    newOutcome?: string
  ) => {
    if (!workflow) return
    const updatedWf = await applyOverride(
      workflow.workflow_id,
      overrideModal.recordId,
      newVerdict,
      actor,
      reason,
      newOutcome
    )
    setWorkflow(updatedWf)

    // Trigger pipeline resume
    const resumedWf = await resumeWorkflow(workflow.workflow_id)
    setWorkflow(resumedWf)

    // Refresh evidence bundle
    const bundle = await fetchWorkflowEvidence(workflow.workflow_id)
    setEvidenceMap(bundle.evidence || {})
  }

  // Active stage data
  const currentStageResult = workflow?.stage_results.find((s) => s.stage === activeStage)
  const currentEvidence = Object.values(evidenceMap).find((e) => e.stage === activeStage)

  // Check if any stage needs human attention
  const stageNeedingHuman = workflow?.stage_results.find(
    (s) => s.needs_human || s.verdict === 'UNCERTAIN'
  )

  return (
    <div className="app-shell">
      {/* Top Header with Pod branding and health */}
      <Header
        health={health}
        healthLoading={healthLoading}
        onOpenRoster={() => setRosterOpen(true)}
      />

      {/* Human Intervention Required Alert Banner */}
      {stageNeedingHuman && (
        <div className="human-alert-banner">
          <div className="banner-content">
            <AlertTriangle size={20} className="pulse-anim banner-warning-icon" />
            <div>
              <strong>HUMAN INTERVENTION REQUIRED:</strong> Station{' '}
              <span className="mono">{stageNeedingHuman.stage.toUpperCase()}</span> recorded{' '}
              <span className="verdict-tag uncertain">{stageNeedingHuman.verdict || 'UNCERTAIN'}</span> on Record{' '}
              <span className="mono">{stageNeedingHuman.record_id}</span>.
            </div>
          </div>
          <button
            className="intervene-now-btn"
            onClick={() =>
              handleOpenOverride(
                stageNeedingHuman.record_id || '',
                stageNeedingHuman.verdict || 'UNCERTAIN'
              )
            }
          >
            Intervene & Resolve Now
          </button>
        </div>
      )}

      {/* Main Control Dashboard Layout */}
      <main className="main-content-layout">
        {/* Scenario Selector & Runner */}
        <CaseSelector
          cases={cases}
          selectedCase={selectedCase}
          onSelectCase={(c) => {
            setSelectedCase(c)
            handleExecute(c.orgId, c.unitId, c.route, c.returned, false)
          }}
          onRunWorkflow={(chaos) =>
            handleExecute(
              selectedCase.orgId,
              selectedCase.unitId,
              selectedCase.route,
              selectedCase.returned,
              chaos
            )
          }
          isRunning={isRunning}
        />

        {/* Execution notice message */}
        {executionNotice && (
          <div className="execution-notice-bar">
            <span>{executionNotice}</span>
          </div>
        )}

        {/* 5-Station Stepper Flow */}
        <PipelineStepper
          workflow={workflow}
          activeStage={activeStage}
          onSelectStage={(stage) => setActiveStage(stage)}
          isRunning={isRunning}
        />

        {/* Deep Station Workspace View */}
        <StationWorkspace
          activeStage={activeStage}
          stageResult={currentStageResult}
          evidence={currentEvidence}
          allEvidence={evidenceMap}
          onOpenOverride={handleOpenOverride}
        />

        {/* Immutable Forensic Trace & A2A Evidence Drawer */}
        <EvidenceTraceDrawer workflow={workflow} evidenceMap={evidenceMap} />
      </main>

      {/* Modals */}
      <RosterModal isOpen={rosterOpen} onClose={() => setRosterOpen(false)} />

      <HumanOverrideModal
        isOpen={overrideModal.isOpen}
        recordId={overrideModal.recordId}
        currentVerdict={overrideModal.currentVerdict}
        onClose={() => setOverrideModal({ isOpen: false, recordId: '', currentVerdict: '' })}
        onSubmitOverride={handleSubmitOverride}
      />
    </div>
  )
}
