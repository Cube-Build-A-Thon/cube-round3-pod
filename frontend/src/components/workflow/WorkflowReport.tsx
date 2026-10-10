import React, { useEffect, useState } from 'react'
import { api, ApiError } from '@/services/api'
import type {
  EvidenceBundle,
  StageResult,
  WorkflowState,
} from '@/types/workflow'
import {
  FileSearch,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronRight,
  Shield,
  History,
  UserCheck,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { ReturnsReportView } from '@/components/returns/ReturnsReportView'

interface WorkflowReportProps {
  initialWorkflow: WorkflowState
  onAnalyzeAnother: () => void
}

export const WorkflowReport: React.FC<WorkflowReportProps> = ({
  initialWorkflow,
  onAnalyzeAnother,
}) => {
  const [workflowIdInput, setWorkflowIdInput] = useState<string>(initialWorkflow.workflow_id)
  const [workflow, setWorkflow] = useState<WorkflowState | null>(initialWorkflow || null)
  const [evidenceBundle, setEvidenceBundle] = useState<EvidenceBundle | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stages' | 'transitions' | 'overrides' | 'json'>('stages')
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})

  // Human Override form state
  const [overrideRecordId, setOverrideRecordId] = useState<string>('')
  const [overrideVerdict, setOverrideVerdict] = useState<'PASS' | 'FAIL' | 'UNCERTAIN'>('PASS')
  const [overrideActor, setOverrideActor] = useState<string>('auditor-1')
  const [overrideReason, setOverrideReason] = useState<string>('')
  const [overrideLoading, setOverrideLoading] = useState<boolean>(false)
  const [overrideMsg, setOverrideMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [copied, setCopied] = useState<boolean>(false)

  const loadWorkflowAndEvidence = async (targetId: string) => {
    if (!targetId.trim()) return
    setLoading(true)
    setError(null)
    setOverrideMsg(null)

    try {
      const bundle = await api.getWorkflowEvidence(targetId.trim())
      setEvidenceBundle(bundle)
      setWorkflow(bundle.workflow)
      const initialExpanded: Record<string, boolean> = {}
      bundle.workflow.stage_results.forEach((sr) => {
        if (sr.state === 'completed' || sr.state === 'error') {
          initialExpanded[sr.stage] = true
        }
      })
      setExpandedStages(initialExpanded)
    } catch (err: any) {
      try {
        const wf = await api.getWorkflow(targetId.trim())
        setWorkflow(wf)
        setEvidenceBundle(null)
      } catch {
        setError(
          err instanceof ApiError
            ? err.detail
            : `Could not load workflow ${targetId}. Ensure orchestrator is running and workflow exists.`
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setWorkflow(initialWorkflow)
    setWorkflowIdInput(initialWorkflow.workflow_id)
    loadWorkflowAndEvidence(initialWorkflow.workflow_id)
  }, [initialWorkflow])

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (workflowIdInput.trim()) {
      loadWorkflowAndEvidence(workflowIdInput.trim())
    }
  }

  const toggleStageExpand = (stage: string) => {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
  }

  const handleResumeWorkflow = async () => {
    if (!workflow) return
    setLoading(true)
    try {
      const res = await api.resumeWorkflow(workflow.workflow_id)
      setWorkflow(res)
      await loadWorkflowAndEvidence(workflow.workflow_id)
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflow || !overrideRecordId || !overrideActor.trim() || !overrideReason.trim()) {
      setOverrideMsg({
        type: 'error',
        text: 'Record ID, Reviewer Actor, and Reason are required for an override.',
      })
      return
    }

    setOverrideLoading(true)
    setOverrideMsg(null)

    try {
      const updatedWf = await api.submitOverride(workflow.workflow_id, {
        record_id: overrideRecordId,
        new_verdict: overrideVerdict,
        actor: overrideActor.trim(),
        reason: overrideReason.trim(),
      })
      setWorkflow(updatedWf)
      setOverrideMsg({
        type: 'success',
        text: 'Override applied successfully. Final outcome and effective verdicts re-derived.',
      })
      await loadWorkflowAndEvidence(workflow.workflow_id)
      setOverrideReason('')
    } catch (err: any) {
      setOverrideMsg({
        type: 'error',
        text: err instanceof ApiError ? err.detail : err.message,
      })
    } finally {
      setOverrideLoading(false)
    }
  }

  const handleCopyJson = () => {
    const dataToCopy = evidenceBundle || workflow
    if (dataToCopy) {
      navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const returnsRecord = evidenceBundle
    ? Object.values(evidenceBundle.evidence).find((ev) => ev.stage === 'returns') || null
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 opacity-80">
          <div className="w-6 h-px bg-teal-700"></div>
          <span className="text-teal-800 text-[10px] font-mono tracking-wider font-semibold">
            CUBE.WORKFLOW // GET /workflows/&#123;id&#125;/evidence
          </span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            WORKFLOW REPORT
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
              WORKFLOW RESULT
            </span>
            <button
              type="button"
              onClick={onAnalyzeAnother}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-mono font-bold tracking-wide text-stone-700 transition-colors hover:border-stone-900 hover:bg-stone-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              Analyze another item
            </button>
          </div>
        </div>
      </div>

      {/* Look up a known workflow by its exact ID. */}
      <div className="rounded-xl border border-stone-300/80 bg-white/90 p-4 shadow-sm space-y-3">
        <form onSubmit={handleLookupSubmit} aria-busy={loading} className="flex flex-col sm:flex-row items-end gap-2.5">
          <div className="flex-1 w-full">
            <label htmlFor="wf_id" className="text-xs font-semibold text-stone-700 block mb-1.5">
              Find a workflow by ID
            </label>
            <input
              id="wf_id"
              type="text"
              value={workflowIdInput}
              onChange={(e) => setWorkflowIdInput(e.target.value)}
              placeholder="WF-org_demo_alpha-UNIT-0014"
              autoComplete="off"
              spellCheck={false}
              className="w-full h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-mono text-stone-900 transition focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-initial h-10 px-4 bg-stone-900 text-stone-50 font-mono text-xs font-bold uppercase tracking-wider rounded border border-stone-900 hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin spinner-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
              FETCH RESULT
            </button>

            {workflow && (
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true)
                  loadWorkflowAndEvidence(workflow.workflow_id)
                }}
                disabled={loading || refreshing}
                className="h-10 px-3 border border-stone-300 rounded text-stone-700 hover:bg-stone-100 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                title="Refresh report"
                aria-label="Refresh report from the workflow API"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin spinner-spin' : ''}`} />
              </button>
            )}
          </div>
        </form>

        <p className="text-xs leading-relaxed text-stone-500">
          The API does not provide a workflow list. Enter the exact workflow ID to load another report.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50/90 p-4 text-sm text-rose-950 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>Could not load this workflow</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {workflow && (
        <div className="space-y-6">
          {returnsRecord && evidenceBundle ? (
            <ReturnsReportView
              bundle={evidenceBundle}
              returnsRecord={returnsRecord}
              onReset={onAnalyzeAnother}
              onWorkflowUpdated={(updatedWf) => {
                setWorkflow(updatedWf)
                loadWorkflowAndEvidence(updatedWf.workflow_id)
              }}
            />
          ) : (
            <>
              {/* Final Outcome Banner FIRST */}
              {workflow.final_outcome && (
                <div className={`rounded-xl border p-5 space-y-2 ${
                  workflow.final_outcome.outcome === 'CLAIM_RECOMMENDED'
                    ? 'border-blue-300 bg-blue-50/80 text-blue-950'
                    : workflow.final_outcome.outcome === 'CLEAN'
                    ? 'border-teal-300 bg-teal-50/80 text-teal-950'
                    : workflow.final_outcome.outcome === 'EXCEPTION'
                    ? 'border-rose-300 bg-rose-50/80 text-rose-950'
                    : 'border-amber-300 bg-amber-50/80 text-amber-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-75 block">
                        Final outcome · derived from stage evidence
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
                          {workflow.final_outcome.outcome}
                        </span>
                        <span className="text-sm font-mono opacity-60">|</span>
                        <span className="text-xs font-mono font-bold">VERDICT: {workflow.final_outcome.verdict}</span>
                      </div>
                    </div>

                    {workflow.final_outcome.outcome === 'CLAIM_RECOMMENDED' && (
                      <div className="rounded-lg border border-blue-300 bg-white/90 p-3 font-mono text-blue-900 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase text-blue-600">Potential claim amount</div>
                        <div className="text-xl font-bold">
                          ${typeof workflow.final_outcome.claimable_usd === 'number' ? workflow.final_outcome.claimable_usd.toFixed(2) : '—'} USD
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded bg-white/80 p-3 text-xs font-mono border border-stone-200/60 leading-relaxed text-stone-800">
                    <strong>Outcome reason:</strong> {workflow.final_outcome.reason}
                  </div>

                  {workflow.final_outcome.needs_human && (
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-800 pt-1">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Human review is needed before taking action.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Main State Card (Technical details below decision) */}
              <div className="rounded-xl border border-stone-300/90 bg-white/95 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-stone-200 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm sm:text-base font-bold text-stone-900">
                        {workflow.workflow_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        workflow.status === 'COMPLETED'
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : workflow.status === 'FAILED'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : workflow.status === 'BLOCKED'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : workflow.status === 'RECOVERY_REQUIRED'
                          ? 'bg-purple-50 text-purple-900 border-purple-300'
                          : 'bg-stone-100 text-stone-800 border-stone-300'
                      }`}>
                        STATUS: {workflow.status}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono text-stone-600">
                      <span>Unit: <strong className="text-stone-900">{workflow.subject_id}</strong></span>
                      <span>·</span>
                      <span>Org: <strong className="text-stone-900">{workflow.org_id}</strong></span>
                      <span>·</span>
                      <span>Flow: <strong className="text-stone-900">{workflow.flow_id}</strong></span>
                    </div>

                    <p className="mt-2 max-w-3xl text-sm text-stone-600">
                      {workflow.status_reason}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {(workflow.status === 'BLOCKED' || workflow.status === 'FAILED') && (
                      <button
                        type="button"
                        onClick={handleResumeWorkflow}
                        disabled={loading}
                        className="px-3 py-1.5 bg-teal-800 text-white font-mono text-xs font-bold uppercase rounded border border-teal-800 hover:bg-teal-900 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry workflow
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-3 py-1.5 border border-stone-300 bg-white text-stone-700 font-mono text-xs rounded hover:bg-stone-100 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                      aria-label="Copy workflow data as JSON"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? 'COPIED' : 'Copy JSON'}
                    </button>
                  </div>
                </div>

                {/* Context details */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-600">
                  <div>
                    <span className="text-stone-400 uppercase text-[10px]">ROUTE:</span>{' '}
                    <strong className="text-stone-800 uppercase">{workflow.context?.route || 'unknown'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 uppercase text-[10px]">RETURNED:</span>{' '}
                    <strong className="text-stone-800">{String(workflow.context?.returned ?? 'unknown').toUpperCase()}</strong>
                  </div>
                  <div className="ml-auto text-[10px] text-stone-400">
                    Updated {new Date(workflow.timestamps.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>

          {/* Navigation Tabs */}
          <nav aria-label="Workflow report sections" className="border-b border-stone-300 flex flex-wrap gap-2 font-mono text-xs">
            <button
              type="button"
              aria-pressed={activeTab === 'stages'}
              onClick={() => setActiveTab('stages')}
              className={`pb-2 px-3 border-b-2 font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 ${
                activeTab === 'stages'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              STAGES ({workflow.stage_results.length})
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'transitions'}
              onClick={() => setActiveTab('transitions')}
              className={`pb-2 px-3 border-b-2 font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 ${
                activeTab === 'transitions'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              EVENT HISTORY ({workflow.transitions.length})
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'overrides'}
              onClick={() => setActiveTab('overrides')}
              className={`pb-2 px-3 border-b-2 font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 ${
                activeTab === 'overrides'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              OVERRIDES ({workflow.overrides.length})
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'json'}
              onClick={() => setActiveTab('json')}
              className={`pb-2 px-3 border-b-2 font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 ${
                activeTab === 'json'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              RAW JSON
            </button>
          </nav>

          {/* TAB 1: STAGES BREAKDOWN */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              {workflow.stage_results.length === 0 ? (
                <p className="rounded-lg border border-stone-300 bg-white/90 p-5 text-sm text-stone-600">No stage results are available for this workflow yet.</p>
              ) : workflow.stage_results.map((sr: StageResult) => {
                const isExpanded = !!expandedStages[sr.stage]
                const isSkipped = sr.state === 'skipped'
                const isFailed = sr.state === 'error'
                const record = sr.record_id && evidenceBundle?.evidence ? evidenceBundle.evidence[sr.record_id] : null
                const canExpand = !isSkipped && Boolean(record)

                return (
                  <div
                    key={sr.stage}
                    className={`rounded-xl border transition-colors overflow-hidden font-mono ${
                      isSkipped
                        ? 'border-stone-200 bg-stone-100/60'
                        : isFailed
                        ? 'border-rose-300 bg-white'
                        : sr.verdict === 'FAIL'
                        ? 'border-rose-300 bg-white'
                        : sr.verdict === 'UNCERTAIN'
                        ? 'border-amber-300 bg-white'
                        : 'border-stone-300 bg-white'
                    }`}
                  >
                    {/* Stage Header */}
                    <button
                      type="button"
                      disabled={!canExpand}
                      aria-expanded={canExpand ? isExpanded : undefined}
                      onClick={() => toggleStageExpand(sr.stage)}
                      className={`w-full p-4 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors ${
                        canExpand ? 'cursor-pointer hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700' : 'cursor-default disabled:opacity-100'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {canExpand && (
                          <span aria-hidden="true" className="text-stone-400">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                        )}

                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold uppercase tracking-wider text-stone-900">
                              {sr.stage}
                            </span>
                            <span className="text-stone-400">·</span>
                            <span className="text-xs text-stone-600">{sr.agent_id || 'stub'}</span>
                          </span>

                          <span className="mt-1 block text-xs">
                            {isSkipped ? (
                              <span className="text-stone-500">
                                <strong>SKIPPED:</strong> {sr.skipped_reason || 'Routing rule condition not satisfied'}
                              </span>
                            ) : (
                              <span className="text-stone-600">
                                Evidence record: <strong className="text-stone-900">{sr.record_id || 'not created'}</strong>
                                {sr.outcome && (
                                  <>
                                    {' · '}Outcome: <strong className="text-stone-800">{sr.outcome}</strong>
                                  </>
                                )}
                              </span>
                            )}
                          </span>
                        </span>
                      </span>

                      {/* Right Badges */}
                      <span className="flex items-center gap-2 sm:ml-4 sm:shrink-0">
                        {isSkipped ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-stone-300 bg-stone-200/80 text-stone-600">
                            SKIPPED
                          </span>
                        ) : (
                          <>
                            <span className="text-right text-[10px] text-stone-400 hidden sm:block">
                              <span className="block">{sr.duration_ms !== null ? `${sr.duration_ms} ms` : ''}</span>
                              <span className="block">Attempts: {sr.attempts}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                              sr.verdict === 'PASS'
                                ? 'bg-teal-50 text-teal-800 border-teal-300'
                                : sr.verdict === 'FAIL'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : sr.verdict === 'UNCERTAIN'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}>
                              {sr.verdict || sr.state}
                            </span>
                          </>
                        )}
                      </span>
                    </button>

                    {/* Stage Error details if failed */}
                    {sr.error && (
                      <div className="border-t border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-950 font-mono">
                        <strong>Stage error · {sr.error.code}:</strong> {sr.error.message}
                      </div>
                    )}

                    {!isSkipped && !record && !sr.error && (
                      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
                        {sr.state === 'pending' ? 'No evidence record has been created yet.' : 'Evidence details were not returned for this stage.'}
                      </p>
                    )}

                    {/* Expanded Evidence Inspection */}
                    {isExpanded && record && (
                      <div className="border-t border-stone-200 bg-[#FAF7F2]/60 p-4 space-y-4">
                        {/* Telemetry info */}
                        <div className="grid gap-2 text-xs sm:grid-cols-3 rounded bg-white p-3 border border-stone-200">
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold uppercase block">MODEL</span>
                            <span>{record.model?.name} @ {record.model?.version}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold uppercase block">CAPTURED</span>
                            <span className="text-[11px]">{new Date(record.captured_at).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold uppercase block">SHA-256 HASH</span>
                            <span className="text-[10px] truncate block" title={record.content_hash}>
                              {record.content_hash.substring(0, 16)}...
                            </span>
                          </div>
                        </div>

                        {/* Inspected Inputs */}
                        {record.inputs && record.inputs.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-stone-700 flex items-center gap-1">
                              <FileCheck className="h-3.5 w-3.5 text-teal-700" />
                              Inputs Inspected ({record.inputs.length})
                            </span>
                            <div className="space-y-1">
                              {record.inputs.map((inp, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded bg-white p-2 border border-stone-200 text-xs">
                                  <span className="font-semibold">{inp.ref}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-stone-500">
                                    <span className="rounded bg-stone-100 px-1 py-0.2 uppercase">{inp.kind}</span>
                                    {inp.sha256 && <span>{inp.sha256.substring(0, 10)}...</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Checks Table */}
                        {record.checks && record.checks.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-stone-700 flex items-center gap-1">
                              <Shield className="h-3.5 w-3.5 text-teal-700" />
                              Checks Evaluated ({record.checks.length})
                            </span>
                            <div className="overflow-x-auto rounded border border-stone-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold uppercase text-stone-500">
                                  <tr>
                                    <th className="p-2">Check Key</th>
                                    <th className="p-2">Verdict</th>
                                    <th className="p-2">Confidence</th>
                                    <th className="p-2">Detail / Observation</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {record.checks.map((chk, cidx) => (
                                    <tr key={cidx} className="hover:bg-stone-50">
                                      <td className="p-2 font-bold">{chk.check_key}</td>
                                      <td className="p-2">
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                          chk.verdict === 'PASS'
                                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                                            : chk.verdict === 'FAIL'
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}>
                                          {chk.verdict}
                                        </span>
                                        {chk.uncertain_reason && (
                                          <div className="text-[9px] text-amber-800 mt-0.5">
                                            Reason: {chk.uncertain_reason}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2 text-stone-500">
                                        {chk.confidence !== null && chk.confidence !== undefined ? `${Math.round(chk.confidence * 100)}%` : '—'}
                                      </td>
                                      <td className="p-2 text-stone-700 font-sans text-xs">
                                        {chk.detail || '—'}
                                        {chk.evidence_refs && chk.evidence_refs.length > 0 && (
                                          <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                                            Evidence refs: {chk.evidence_refs.join(', ')}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Decision summary */}
                        <div className="rounded bg-white p-3 border border-stone-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong>Decision: {record.decision?.outcome}</strong>
                            <span className="font-bold uppercase">{record.decision?.verdict}</span>
                          </div>
                          <p className="text-stone-600 font-sans text-xs">{record.decision?.reason}</p>
                          {record.decision?.needs_human && (
                            <span className="text-amber-800 text-[10px] font-bold block">
                              Human review requested by the agent
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 2: AUDIT TRAIL */}
          {activeTab === 'transitions' && (
            <div className="rounded-xl border border-stone-300/80 bg-white/95 p-5 shadow-sm space-y-3 font-mono">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <History className="h-4 w-4 text-teal-800" />
                Workflow event history
              </span>
              <div className="space-y-2">
                {workflow.transitions.length === 0 ? (
                  <p className="rounded border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">No workflow events are available.</p>
                ) : workflow.transitions.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded border border-stone-100 bg-stone-50/60 text-xs">
                    <span className="text-stone-400 text-[10px]">{idx + 1}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-900">{t.event}</strong>
                        {t.stage && (
                          <span className="rounded bg-teal-100 px-1 py-0.2 text-[9px] font-bold uppercase text-teal-800">
                            {t.stage}
                          </span>
                        )}
                        {t.from_status && t.to_status && (
                          <span className="text-[10px] text-stone-500">
                            {t.from_status} → {t.to_status}
                          </span>
                        )}
                      </div>
                      {t.detail && <p className="text-stone-600 font-sans text-xs">{t.detail}</p>}
                    </div>
                    <span className="text-[10px] text-stone-500">{new Date(t.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: OVERRIDES */}
          {activeTab === 'overrides' && (
            <div className="space-y-6 font-mono">
              {/* Existing Overrides List */}
              <div className="rounded-xl border border-stone-300/80 bg-white/95 p-5 shadow-sm space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-teal-800" />
                  Human overrides ({workflow.overrides.length})
                </span>

                {workflow.overrides.length === 0 ? (
                  <p className="rounded border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">No human overrides have been recorded for this workflow.</p>
                ) : (
                  <div className="space-y-2.5">
                    {workflow.overrides.map((ovr) => (
                      <div key={ovr.override_id} className="rounded border border-amber-200 bg-amber-50/40 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span>{ovr.override_id}</span>
                          <span className="text-[10px] text-stone-400">{new Date(ovr.at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-700">
                          <span>Evidence: {ovr.supersedes.record_id}</span>
                          <span>({ovr.previous_verdict} → {ovr.new_verdict})</span>
                        </div>
                        <div>Actor: {ovr.actor}</div>
                        <div>Reason: {ovr.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Override Form */}
              <div className="rounded-xl border border-stone-300/80 bg-white/95 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Record a human override</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">Choose the evidence record, set the revised verdict, and provide the reviewer and reason. The override is saved with this workflow.</p>
                </div>

                {overrideMsg && (
                  <div role={overrideMsg.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`p-3 rounded text-sm border ${
                    overrideMsg.type === 'success' ? 'bg-teal-50 border-teal-300 text-teal-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    {overrideMsg.text}
                  </div>
                )}

                <form onSubmit={handleApplyOverride} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="override-record-id" className="text-xs font-semibold text-stone-700 block mb-1.5">
                        Evidence record *
                      </label>
                      <select
                        id="override-record-id"
                        required
                        value={overrideRecordId}
                        onChange={(e) => setOverrideRecordId(e.target.value)}
                        className="w-full h-10 rounded border border-stone-300 bg-white px-3 text-sm focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15"
                      >
                        <option value="">Select an evidence record...</option>
                        {workflow.evidence_references.map((rid) => (
                          <option key={rid} value={rid}>{rid}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="override-verdict" className="text-xs font-semibold text-stone-700 block mb-1.5">
                        Revised verdict *
                      </label>
                      <select
                        id="override-verdict"
                        value={overrideVerdict}
                        onChange={(e) => setOverrideVerdict(e.target.value as 'PASS' | 'FAIL' | 'UNCERTAIN')}
                        className="w-full h-10 rounded border border-stone-300 bg-white px-3 text-sm focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15"
                      >
                        <option value="PASS">PASS — Verified Clean</option>
                        <option value="FAIL">FAIL — Confirm Defect</option>
                        <option value="UNCERTAIN">UNCERTAIN — Needs Escalation</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="override-actor" className="text-xs font-semibold text-stone-700 block mb-1.5">
                        Reviewer *
                      </label>
                      <input
                        id="override-actor"
                        type="text"
                        required
                        value={overrideActor}
                        onChange={(e) => setOverrideActor(e.target.value)}
                        placeholder="e.g. auditor-1"
                        className="w-full h-10 rounded border border-stone-300 bg-white px-3 text-sm focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15"
                      />
                    </div>

                    <div>
                      <label htmlFor="override-reason" className="text-xs font-semibold text-stone-700 block mb-1.5">
                        Reason for the change *
                      </label>
                      <textarea
                        id="override-reason"
                        required
                        rows={3}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Explain the evidence supporting this revised verdict."
                        className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={overrideLoading || !overrideRecordId}
                      className="px-5 py-2.5 bg-stone-900 text-stone-50 font-mono text-xs font-bold uppercase tracking-wider rounded border border-stone-900 hover:bg-teal-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {overrideLoading ? 'Saving override…' : 'Save override'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: RAW JSON */}
          {activeTab === 'json' && (
            <div className="rounded-xl border border-stone-300 bg-stone-900 p-4 text-stone-100 font-mono text-xs shadow-md">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3 text-stone-400 text-[10px]">
                <span>AUTHORITATIVE STATE & EVIDENCE BUNDLE</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  aria-label="Copy raw workflow and evidence JSON"
                  className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer"
                >
                  {copied ? 'COPIED' : 'COPY RAW JSON'}
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed max-h-120">
                {JSON.stringify(evidenceBundle || workflow, null, 2)}
              </pre>
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkflowReport
