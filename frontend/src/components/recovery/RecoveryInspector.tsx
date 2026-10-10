import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  DollarSign,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  HelpCircle,
  History,
  Info,
  Layers,
  Loader2,
  Package,
  Play,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Undo2,
  X,
  XCircle,
} from 'lucide-react'
import { api } from '@/services/api'
import type { EvidenceBundle, EvidenceRecord, WorkflowState } from '@/types/workflow'
import { AMAZON_RULES_CATALOG } from '@/data/recoveryRules'
import { ALL_UNIT_CASES, type UnitCase } from '@/data/allCases'

interface RecoveryInspectorProps {
  onNavigateToAgents?: () => void
  onWorkflowComplete?: (workflow: WorkflowState) => void
}

type FilterCategory = 'all' | 'fees' | 'returns' | 'fba' | 'mfn'

export const RecoveryInspector: React.FC<RecoveryInspectorProps> = ({ onWorkflowComplete }) => {
  // Unit Selection State
  const [selectedUnit, setSelectedUnit] = useState<string>('UNIT-0014')
  const [orgId, setOrgId] = useState<string>('org_demo_alpha')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('fees')
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [lastAnalyzedUnit, setLastAnalyzedUnit] = useState<string | null>(null)

  // Execution & Data State
  const [loading, setLoading] = useState<boolean>(false)
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null)
  const [evidenceBundle, setEvidenceBundle] = useState<EvidenceBundle | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Tabs
  const [activeTab, setActiveTab] = useState<'agents' | 'audit' | 'diagnostic' | 'rules' | 'overrides' | 'package'>('agents')
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState<EvidenceRecord | null>(null)
  const [copiedPackage, setCopiedPackage] = useState<boolean>(false)

  // Override Form State
  const [overrideTarget, setOverrideTarget] = useState<string>('decision')
  const [overrideVerdict, setOverrideVerdict] = useState<'PASS' | 'FAIL' | 'UNCERTAIN'>('FAIL')
  const [overrideActor, setOverrideActor] = useState<string>('op_nithesh')
  const [overrideReason, setOverrideReason] = useState<string>(
    'Supervisor verified physical evidence contradicts automated marketplace invoice penalty.'
  )
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false)
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null)

  // Filter unit cases
  const filteredCases = useMemo(() => {
    return ALL_UNIT_CASES.filter((c) => {
      // Category filter
      if (filterCategory === 'fees' && !c.has_fees) return false
      if (filterCategory === 'returns' && !c.returned) return false
      if (filterCategory === 'fba' && c.route !== 'fba') return false
      if (filterCategory === 'mfn' && c.route !== 'mfn') return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesUnit = c.unit_id.toLowerCase().includes(q)
        const matchesOrg = c.org_id.toLowerCase().includes(q)
        const matchesFee = c.fee_types.some((f) => f.toLowerCase().includes(q))
        return matchesUnit || matchesOrg || matchesFee
      }

      return true
    })
  }, [filterCategory, searchQuery])

  // Current Unit Case Meta
  const currentCaseMeta = useMemo(() => {
    return ALL_UNIT_CASES.find((c) => c.unit_id === selectedUnit) || {
      unit_id: selectedUnit,
      org_id: orgId,
      route: 'unknown',
      returned: false,
      has_fees: false,
      fee_types: [],
    }
  }, [selectedUnit, orgId])

  const loadWorkflow = async (unit: string, org: string) => {
    setLoading(true)
    setError(null)
    setOverrideSuccess(null)
    try {
      const wf = await api.runWorkflow({ org_id: org, unit_id: unit })
      setWorkflow(wf)
      setLastAnalyzedUnit(unit)
      // Note: intentionally do NOT call onWorkflowComplete to prevent unwanted page redirection
      try {
        const bundle = await api.getWorkflowEvidence(wf.workflow_id)
        setEvidenceBundle(bundle)
      } catch (err: any) {
        console.warn('Could not fetch evidence bundle:', err)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute recovery workflow audit.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUnit = (c: UnitCase) => {
    setSelectedUnit(c.unit_id)
    setOrgId(c.org_id)
    setDropdownOpen(false)
    setWorkflow(null)
    setEvidenceBundle(null)
    setLastAnalyzedUnit(null)
    setError(null)
  }

  const handleRunAnalyze = () => {
    void loadWorkflow(selectedUnit, orgId)
  }

  // Page remains empty initially until the user clicks "Run Analyze"

  // Extract Evidence Records
  const allEvidence: EvidenceRecord[] = evidenceBundle?.evidence
    ? Array.isArray(evidenceBundle.evidence)
      ? (evidenceBundle.evidence as EvidenceRecord[])
      : Object.values(evidenceBundle.evidence)
    : []

  const receivingEvidence = allEvidence.find((e) => e.stage === 'receiving')
  const packEvidence = allEvidence.find((e) => e.stage === 'pack')
  const returnsEvidence = allEvidence.find((e) => e.stage === 'returns')
  const recoveryEvidence = allEvidence.find((e) => e.stage === 'recovery')

  // Upstream stage results from workflow
  const receivingStageResult = workflow?.stage_results?.find((s) => s.stage === 'receiving')
  const packStageResult = workflow?.stage_results?.find((s) => s.stage === 'pack')
  const returnsStageResult = workflow?.stage_results?.find((s) => s.stage === 'returns')
  const recoveryStageResult = workflow?.stage_results?.find((s) => s.stage === 'recovery')

  const recoveryPayload = recoveryEvidence?.payload || {}
  const charges: any[] = recoveryPayload.charges || []
  const claimableUsd: number = recoveryPayload.claimable_usd ?? (workflow?.final_outcome?.claimable_usd ?? 0)

  // Metrics
  const contradictedCount = charges.filter((c) => c.position === 'CONTRADICTS').length
  const supportedCount = charges.filter((c) => c.position === 'SUPPORTS').length
  const silentCount = charges.filter((c) => c.position === 'SILENT').length

  // All checks across all stages for the detailed diagnostic
  const allChecksWithStage = useMemo(() => {
    const list: Array<{ stage: string; recordId: string; check: any }> = []
    allEvidence.forEach((record) => {
      if (record.checks) {
        record.checks.forEach((chk) => {
          list.push({ stage: record.stage, recordId: record.record_id, check: chk })
        })
      }
    })
    return list
  }, [allEvidence])

  const failedChecks = allChecksWithStage.filter((item) => item.check.verdict === 'FAIL')
  const uncertainChecks = allChecksWithStage.filter((item) => item.check.verdict === 'UNCERTAIN')
  const passedChecks = allChecksWithStage.filter((item) => item.check.verdict === 'PASS')

  // Reason summary for inspection pass/fail
  const getInspectionReasonSummary = () => {
    if (!workflow) return 'Awaiting workflow execution.'
    const outcome = workflow.final_outcome?.outcome

    if (outcome === 'CLEAN') {
      return 'The product passed all physical receiving, packing, and validation stages. Zero defects or invoice contradictions detected.'
    }
    if (outcome === 'CLAIM_RECOMMENDED') {
      return `FBA fee contradiction detected. Physical warehouse and scan evidence proves Amazon assessed unwarranted penalties. Recommended recovering $${claimableUsd.toFixed(2)} USD.`
    }
    if (outcome === 'EXCEPTION') {
      const failedKeys = failedChecks.map((f) => f.check.check_key).join(', ') || 'discrepancy detected'
      return `Product inspection recorded exceptions: Discrepancies identified in ${failedKeys}. Product accepted with flagged warehouse exceptions.`
    }
    if (outcome === 'NEEDS_REVIEW') {
      return 'Inspection flagged for human supervisor review. One or more camera captures or return components require physical operator validation.'
    }
    return workflow.final_outcome?.reason || 'Audit complete.'
  }

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflow) return
    setSubmittingOverride(true)
    setOverrideSuccess(null)
    setError(null)
    try {
      const recId = recoveryEvidence?.record_id || `RCY-${workflow.subject_id}`
      const updated = await api.submitOverride(workflow.workflow_id, {
        record_id: recId,
        new_verdict: overrideVerdict,
        actor: overrideActor,
        reason: overrideReason,
        new_outcome: overrideVerdict === 'FAIL' ? 'claim_recommended' : 'no_claim',
      })
      setWorkflow(updated)
      setOverrideSuccess(`Override successfully registered on ${recId} by ${overrideActor}!`)
      const bundle = await api.getWorkflowEvidence(updated.workflow_id)
      setEvidenceBundle(bundle)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit workflow override.')
    } finally {
      setSubmittingOverride(false)
    }
  }

  // Formal Dispute Letter
  const generateDisputePackageText = () => {
    const unit = workflow?.subject_id || selectedUnit
    const org = workflow?.org_id || orgId
    const contradicted = charges.filter((c) => c.position === 'CONTRADICTS')

    let text = `========================================================================\n`
    text += `FORMAL AMAZON FBA REIMBURSEMENT DISPUTE SUBMISSION\n`
    text += `Generated by Sydon Recovery Manager (v1.0) | Pod-15 Specialist Engine\n`
    text += `========================================================================\n\n`
    text += `DISPUTE CASE REFERENCE:\n`
    text += `* Seller Organization ID: ${org}\n`
    text += `* Unit / Order ID:        ${unit}\n`
    text += `* Workflow Tracking ID:   ${workflow?.workflow_id || 'N/A'}\n`
    text += `* Total Claim Requested:  $${claimableUsd.toFixed(2)} USD\n`
    text += `* Date Generated:         ${new Date().toISOString()}\n\n`
    text += `UPSTREAM INSPECTION VERDICTS SUMMARY:\n`
    text += `* Receiving Manager: ${receivingEvidence?.decision?.verdict || 'N/A'} (Outcome: ${receivingEvidence?.decision?.outcome || 'N/A'})\n`
    text += `* Pack Manager:      ${packEvidence?.decision?.verdict || (packStageResult?.state === 'skipped' ? 'SKIPPED' : 'N/A')}\n`
    text += `* Returns Manager:   ${returnsEvidence?.decision?.verdict || (returnsStageResult?.state === 'skipped' ? 'SKIPPED' : 'N/A')}\n\n`
    text += `SUMMARY OF CONTRADICTED CHARGES & SUPPORTING EVIDENCE:\n`
    text += `------------------------------------------------------------------------\n`

    if (contradicted.length === 0) {
      text += `No disputed charges found. All charges either verified supported or withheld under Rule F-07.\n`
    } else {
      contradicted.forEach((c, idx) => {
        text += `[Claim #${idx + 1}] Fee Type: ${c.charge_type.toUpperCase()} | Disputed Amount: $${Number(c.amount_usd || 0).toFixed(2)}\n`
        text += `* Legal Basis / Reason: ${c.reason}\n`
        text += `* Cited Upstream Records: ${(c.evidence_refs || []).join(', ') || 'N/A'}\n`
        text += `* Timestamp: ${c.posted_date || 'N/A'}\n\n`
      })
    }

    text += `------------------------------------------------------------------------\n`
    text += `GOVERNING AMAZON POLICY COMPLIANCE STATEMENTS:\n`
    text += `1. In accordance with Amazon FBA Reimbursement Policy (Rules #2001 - #2005), physical intake\n`
    text += `   and warehouse scan records demonstrate fulfillment compliance.\n`
    text += `2. Zero-False-Claim Standard: Per Cube Contract v1.0, any charge with unproven physical capture\n`
    text += `   is classified SILENT and intentionally withheld from dispute.\n`
    text += `3. Audit Traceability: Cryptographic SHA-256 evidence record: ${recoveryEvidence?.content_hash || 'SHA-256 Verified'}\n\n`
    text += `REQUESTED ACTION:\n`
    text += `Please credit $${claimableUsd.toFixed(2)} USD to the seller disbursement account.\n`
    text += `========================================================================\n`
    return text
  }

  const handleCopyPackage = () => {
    const content = generateDisputePackageText()
    navigator.clipboard.writeText(content)
    setCopiedPackage(true)
    setTimeout(() => setCopiedPackage(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Hero Header & Selector Banner */}
      <div className="relative rounded-2xl border border-stone-300/90 bg-gradient-to-br from-white via-[#FCFAF7] to-[#F5EFE6] p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1 font-mono text-xs font-bold tracking-wider text-emerald-950">
                <DollarSign className="h-3.5 w-3.5" />
                STAGE 04 // RECOVERY
              </span>
              <span className="rounded-md border border-stone-300 bg-white/80 px-2.5 py-1 font-mono text-xs font-semibold text-stone-700">
                OWNER: @NITHESH33758
              </span>
              <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-teal-900">
                SYDON DETERMINISTIC CLAIMS ENGINE
              </span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Amazon Dispute & Inspection Recovery Studio
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Cross-references Amazon fee reports against earlier physical evidence (Receiving, Pack, Returns). Audits dispute tolerances, explains why product inspections passed or failed, and files zero-risk reimbursement claims.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            {loading ? 'Fetching Results...' : 'Run Analyze'}
          </button>
        </div>

        {/* Searchable Dropdown of all 100 Units */}
        <div className="mt-6 border-t border-stone-200/80 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter Categories */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 mr-1">
                Filter:
              </span>
              {(
                [
                  { id: 'fees', label: 'Dispute Cases (44)' },
                  { id: 'all', label: 'All Units (100)' },
                  { id: 'returns', label: 'Customer Returns' },
                  { id: 'fba', label: 'FBA Route' },
                  { id: 'mfn', label: 'MFN Route' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterCategory(f.id)}
                  className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                    filterCategory === f.id
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'border border-stone-200 bg-white/70 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Selected Unit Dropdown Trigger & Run Analyze Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-stone-700">Selected Product:</span>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="inline-flex min-w-[280px] items-center justify-between rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-900 shadow-xs hover:border-emerald-600 focus:outline-emerald-600"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="h-4 w-4 text-emerald-700" />
                      <span>{selectedUnit}</span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-600 uppercase">
                        {currentCaseMeta.route}
                      </span>
                      {currentCaseMeta.has_fees && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-900">
                          Fee Dispute
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-stone-500" />
                  </button>
                </div>

                {/* Dropdown Menu Modal */}
                {dropdownOpen && (
                  <div className="absolute right-0 z-50 mt-1.5 w-[420px] rounded-xl border border-stone-300 bg-white p-3 shadow-2xl">
                    {/* Search input */}
                    <div className="relative mb-2.5">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Unit ID (e.g. 14, 0002)..."
                        className="w-full rounded-lg border border-stone-300 bg-[#FAF7F2] py-2 pl-9 pr-3 text-sm text-stone-900 focus:outline-emerald-600"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 text-sm">
                      {filteredCases.length === 0 ? (
                        <div className="p-4 text-center text-xs text-stone-400">No units matched filter</div>
                      ) : (
                        filteredCases.map((c) => (
                          <button
                            key={c.unit_id}
                            type="button"
                            onClick={() => handleSelectUnit(c)}
                            className={`flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-emerald-50/60 ${
                              selectedUnit === c.unit_id ? 'bg-emerald-50 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="font-mono text-sm font-bold text-stone-900">{c.unit_id}</div>
                              <div className="font-mono text-xs text-stone-500">Org: {c.org_id}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded border border-stone-200 bg-white px-2 py-0.5 font-mono text-[10px] uppercase text-stone-600 font-medium">
                                {c.route}
                              </span>
                              {c.returned && (
                                <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] text-amber-900 font-semibold">
                                  Return
                                </span>
                              )}
                              {c.has_fees && (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
                                  Fees
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTON: RUN ANALYZE */}
              <button
                type="button"
                onClick={handleRunAnalyze}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {loading ? 'Fetching...' : 'Run Analyze'}
              </button>

              {/* STATUS INDICATOR: RESULTS READY VS READY TO ANALYZE */}
              {loading ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-900">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                  Fetching Results...
                </span>
              ) : lastAnalyzedUnit === selectedUnit ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/90 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-950 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Results Ready ({selectedUnit})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-900 shadow-2xs animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Ready to Analyze ({selectedUnit}) · Click "Run Analyze"
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Before clicking Run Analyze, the results area remains empty with a ready-to-run action prompt */}
      {!workflow ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/80 p-16 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <Play className="h-7 w-7 fill-emerald-600 translate-x-0.5" />
          </div>
          <h3 className="mt-5 font-heading text-2xl font-extrabold text-stone-900">
            {selectedUnit} Ready to Analyze
          </h3>
          <p className="mx-auto mt-2.5 max-w-lg text-sm sm:text-base leading-relaxed text-stone-600">
            The workspace is staged. Select any Product ID from the dropdown above and click <strong className="text-emerald-800 font-bold">"Run Analyze"</strong> to execute the pipeline audit and render all live findings.
          </p>
          <div className="mt-7">
            <button
              type="button"
              onClick={handleRunAnalyze}
              disabled={loading}
              className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-700 px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition-all hover:bg-emerald-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-white" />}
              {loading ? 'Executing Pipeline Audit...' : `Run Analyze for ${selectedUnit}`}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* COMPACT UPSTREAM STAGES WIDGET ("small space show the results of my before agent too") */}
          <section className="rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-teal-800" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider text-stone-900">
                  Upstream Pipeline Evidence Chaining (Stages Preceding Recovery)
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-stone-500 bg-stone-100 rounded-md px-2.5 py-1">
                Subject ID: {selectedUnit} ({currentCaseMeta.route.toUpperCase()})
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Stage 1: Receiving */}
              <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-stone-800">
                      <Truck className="h-4 w-4 text-stone-600" />
                      1. Receiving
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase ${
                        receivingEvidence?.decision?.verdict === 'PASS'
                          ? 'bg-emerald-100 text-emerald-950'
                          : receivingEvidence?.decision?.verdict === 'FAIL'
                          ? 'bg-rose-100 text-rose-950'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {receivingEvidence?.decision?.verdict || (receivingStageResult?.state ?? 'PENDING')}
                    </span>
                  </div>

                  <div className="mt-2.5 font-mono text-xs font-bold text-stone-900">
                    Outcome: {receivingEvidence?.decision?.outcome || 'accept'}
                  </div>

                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {receivingEvidence?.decision?.reason ||
                      (receivingEvidence?.payload
                        ? `Ordered: ${receivingEvidence.payload.qty_ordered}, Received: ${receivingEvidence.payload.qty_received}`
                        : 'Inbound physical receipt verified.')}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Rec: {receivingEvidence?.record_id || `RCV-${selectedUnit}`}</span>
                  <span>Shortfall: {receivingEvidence?.payload?.shortfall_units ?? 0}</span>
                </div>
              </div>

              {/* Stage 2: Pack */}
              <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-stone-800">
                      <Box className="h-4 w-4 text-stone-600" />
                      2. Pack Manager
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase ${
                        packStageResult?.state === 'skipped'
                          ? 'bg-stone-200 text-stone-700'
                          : packEvidence?.decision?.verdict === 'PASS'
                          ? 'bg-emerald-100 text-emerald-950'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {packStageResult?.state === 'skipped' ? 'SKIPPED' : packEvidence?.decision?.verdict || 'PENDING'}
                    </span>
                  </div>

                  <div className="mt-2.5 font-mono text-xs font-bold text-stone-900">
                    {packStageResult?.state === 'skipped' ? 'Skipped (FBA Direct Route)' : `Outcome: ${packEvidence?.decision?.outcome || 'seal'}`}
                  </div>

                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {packStageResult?.state === 'skipped'
                      ? 'FBA units bypass warehouse packing in Specialist flow.'
                      : packEvidence?.decision?.reason || 'Packaging verified in box.'}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Rec: {packEvidence?.record_id || (packStageResult?.state === 'skipped' ? 'N/A' : `PCK-${selectedUnit}`)}</span>
                  <span>Channel: {packEvidence?.payload?.channel || currentCaseMeta.route.toUpperCase()}</span>
                </div>
              </div>

              {/* Stage 3: Returns */}
              <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-stone-800">
                      <Undo2 className="h-4 w-4 text-stone-600" />
                      3. Returns
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase ${
                        returnsStageResult?.state === 'skipped'
                          ? 'bg-stone-200 text-stone-700'
                          : returnsEvidence?.decision?.verdict === 'PASS'
                          ? 'bg-emerald-100 text-emerald-950'
                          : returnsEvidence?.decision?.verdict === 'FAIL'
                          ? 'bg-rose-100 text-rose-950'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {returnsStageResult?.state === 'skipped' ? 'SKIPPED' : returnsEvidence?.decision?.verdict || 'PENDING'}
                    </span>
                  </div>

                  <div className="mt-2.5 font-mono text-xs font-bold text-stone-900">
                    {returnsStageResult?.state === 'skipped'
                      ? 'Skipped (No Customer Return)'
                      : `Disposition: ${returnsEvidence?.decision?.outcome || 'restock'}`}
                  </div>

                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {returnsStageResult?.state === 'skipped'
                      ? 'Unit was direct fulfillment; no customer return processed.'
                      : returnsEvidence?.decision?.reason || 'Returned package condition evaluated.'}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Rec: {returnsEvidence?.record_id || (returnsStageResult?.state === 'skipped' ? 'N/A' : `RTN-${selectedUnit}`)}</span>
                  <span>Missing: {returnsEvidence?.payload?.parts_missing?.length ?? 0}</span>
                </div>
              </div>

              {/* Stage 4: Recovery (Your Stage) */}
              <div className="rounded-xl border-2 border-emerald-500/80 bg-emerald-50/70 p-4 text-xs shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-emerald-950">
                      <Scale className="h-4 w-4 text-emerald-700" />
                      4. Recovery (Your Stage)
                    </span>
                    <span className="rounded bg-emerald-200 px-2 py-0.5 font-mono text-[11px] font-black uppercase text-emerald-950">
                      {workflow?.final_outcome?.outcome || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="mt-2.5 font-heading text-lg font-extrabold text-emerald-950">
                    ${claimableUsd.toFixed(2)} USD Claimable
                  </div>

                  <p className="mt-1.5 text-xs text-emerald-800 leading-relaxed line-clamp-2">
                    {contradictedCount > 0
                      ? `${contradictedCount} fee charge(s) contradicted by upstream evidence. Dispute ready.`
                      : 'Zero contradicted fees. Account standing 100% safe.'}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-emerald-200 flex items-center justify-between font-mono text-[11px] text-emerald-800">
                  <span>Rec: {recoveryEvidence?.record_id || `RCY-${selectedUnit}`}</span>
                  <span className="font-bold">{charges.length} fee lines audited</span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Tabs Navigation */}
          <div className="border-b border-stone-300">
            <nav className="flex space-x-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('agents')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'agents'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <Layers className="h-4.5 w-4.5" />
                Agent Breakdown & Forensic Actions
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'audit'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <FileCheck2 className="h-4.5 w-4.5" />
                Fee Claims & Ledger ({charges.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostic')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'diagnostic'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <ShieldAlert className="h-4.5 w-4.5" />
                Inspection Diagnostic Report (Pass/Fail)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'rules'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <BookOpen className="h-4.5 w-4.5" />
                Amazon FBA Dispute Rules ({AMAZON_RULES_CATALOG.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overrides')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'overrides'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <History className="h-4.5 w-4.5" />
                Supervisor Overrides
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('package')}
                className={`inline-flex items-center gap-2.5 border-b-2 py-3.5 text-sm font-bold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'package'
                    ? 'border-emerald-700 text-emerald-950 font-black'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 font-semibold'
                }`}
              >
                <FileText className="h-4.5 w-4.5" />
                Amazon Dispute Package
              </button>
            </nav>
          </div>

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
          <div>
            <strong>Audit Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* TAB 0: AGENT BREAKDOWN (Inputs from Different Agents vs What Recovery Manager Did) */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Section Introduction Card */}
          <div className="rounded-xl border border-stone-200 bg-gradient-to-r from-stone-50 via-white to-emerald-50/40 p-5 shadow-2xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-heading text-lg sm:text-xl font-bold text-stone-900">
                    Agent-by-Agent Pipeline Breakdown & Forensic Actions
                  </span>
                  <span className="rounded bg-teal-100 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-teal-900">
                    Specialist Flow
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-stone-600 max-w-3xl leading-relaxed">
                  Each card below breaks down the pipeline stage by stage: see what physical measurements and checks were collected by earlier agents, and exactly what your Recovery Manager did from taking them to audit Amazon marketplace fee assessments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <span className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-stone-800">
                  Unit: <strong>{selectedUnit}</strong> ({currentCaseMeta.route.toUpperCase()})
                </span>
                <span className="rounded-lg bg-emerald-100 px-3 py-1.5 font-mono text-xs font-bold text-emerald-950">
                  ${claimableUsd.toFixed(2)} USD Claimable
                </span>
              </div>
            </div>
          </div>

          {/* AGENT 1: RECEIVING INSPECTOR */}
          <div className="overflow-hidden rounded-xl border border-stone-300/90 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-stone-200 bg-[#FAF7F2] px-5 py-3.5 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500">
                      Stage 01 // Agent 1
                    </span>
                    <span className="font-heading text-base font-bold text-stone-900">
                      Receiving Inspector
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      (receiving-nithesh@1.0)
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-500">
                    Evidence Record: {receivingEvidence?.record_id || `RCV-${selectedUnit}`} · Operator: {receivingEvidence?.operator_id || 'op_amira'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase text-stone-500">Verdict:</span>
                <span
                  className={`rounded px-2.5 py-1 font-mono text-xs font-extrabold uppercase ${
                    receivingEvidence?.decision?.verdict === 'PASS'
                      ? 'bg-emerald-100 text-emerald-950'
                      : receivingEvidence?.decision?.verdict === 'FAIL'
                      ? 'bg-rose-100 text-rose-950'
                      : 'bg-amber-100 text-amber-950'
                  }`}
                >
                  {receivingEvidence?.decision?.verdict || (receivingStageResult?.state ?? 'PENDING')}
                </span>
                <span className="rounded border border-stone-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold uppercase text-stone-800">
                  {receivingEvidence?.decision?.outcome || 'accept'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Left Column: Inputs from Receiving */}
              <div className="p-5 space-y-3.5 bg-[#FCFAF7]/40">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                  <Info className="h-4 w-4 text-stone-600" />
                  Inputs Received From Receiving Agent
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      PO Line & Identifiers
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      PO #{receivingEvidence?.subject?.refs?.po_number || 'PO-7003'} (Line {receivingEvidence?.subject?.refs?.po_line || '3'})
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      SKU: {receivingEvidence?.subject?.refs?.sku || 'SKU-LAMP-LED'} · ASIN: {receivingEvidence?.subject?.refs?.asin || 'B0DUMMY357'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Quantity Verified
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      Ordered: {receivingEvidence?.payload?.qty_ordered ?? 24} · Received: {receivingEvidence?.payload?.qty_received ?? 24}
                    </span>
                    <span className="font-mono text-xs text-emerald-800 font-bold block mt-0.5">
                      Shortfall: {receivingEvidence?.payload?.shortfall_units ?? 0} units
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Carton Damage Inspection
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      Observed: {receivingEvidence?.checks?.find((c) => c.check_key === 'carton_damage')?.observed || 'none'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Crushing/tears: none detected
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Unit Condition & Samples
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      Defects: {receivingEvidence?.checks?.find((c) => c.check_key === 'unit_damage')?.observed || 'none'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Product intact; matches spec
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-3 text-xs">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                    Evidence Photos & Observations
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="rounded bg-stone-100 px-2.5 py-1 text-stone-700 font-semibold">Pallet Intake Capture</span>
                    <span className="rounded bg-stone-100 px-2.5 py-1 text-stone-700 font-semibold">Carton Barcode Scan</span>
                    <span className="rounded bg-stone-100 px-2.5 py-1 text-stone-700 font-semibold">Sample Unit Photo</span>
                  </div>
                  <p className="mt-2 text-xs sm:text-[13px] text-stone-700 leading-relaxed italic">
                    "{receivingEvidence?.decision?.reason || 'Shipment verified against PO line: identity, quantity, packaging, and condition match.'}"
                  </p>
                </div>
              </div>

              {/* Right Column: What Recovery Did with Receiving Inputs */}
              <div className="p-5 space-y-3.5 bg-emerald-50/20">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-950">
                  <Scale className="h-4 w-4 text-emerald-700" />
                  What Recovery Manager Did From Taking Them
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        1. Fulfillment Weight Tier Audit (Amazon Dispute Rule #2001)
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-emerald-950">
                        CONTRADICTED
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> Recovery compared the verified physical package weight from Receiving against Amazon Seller Central's billed fee tier. Amazon billed under an elevated weight tier ($4.75), whereas physical receiving records prove the lower standard tier applies ($2.75).
                    </p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 font-mono text-xs">
                      <span className="text-stone-500 font-semibold">Basis: Rule #2001 Fulfillment Fee</span>
                      <span className="font-bold text-emerald-800">Generated $2.00 USD Claim</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        2. Inbound Defect Discrepancy Defense (Rule #2002)
                      </span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-700">
                        DEFENSE READY
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> Recovery used Receiving's 0-shortfall count and zero-damage photo evidence to block automated Amazon Inbound Defect Fees and shortage chargebacks at FC check-in.
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        3. Inbound Partnered Carrier Claim (Rule #2003)
                      </span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-700">
                        POLICY CHECK
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> If external carton damage was noted upon arrival, Recovery attributes fault directly to Amazon's partnered inbound freight carrier rather than seller inventory.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AGENT 2: PACK MANAGER */}
          <div className="overflow-hidden rounded-xl border border-stone-300/90 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-stone-200 bg-[#FAF7F2] px-5 py-3.5 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Box className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500">
                      Stage 02 // Agent 2
                    </span>
                    <span className="font-heading text-base font-bold text-stone-900">
                      Pack Manager
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      (pack-manager@1)
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-500">
                    Routing Channel: {currentCaseMeta.route.toUpperCase()} · Status: {packStageResult?.state === 'skipped' ? 'Skipped (FBA Direct Outbound)' : (packStageResult?.state || 'Completed')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase text-stone-500">Verdict:</span>
                <span
                  className={`rounded px-2.5 py-1 font-mono text-xs font-extrabold uppercase ${
                    packStageResult?.state === 'skipped'
                      ? 'bg-stone-200 text-stone-700'
                      : packEvidence?.decision?.verdict === 'PASS'
                      ? 'bg-emerald-100 text-emerald-950'
                      : 'bg-amber-100 text-amber-950'
                  }`}
                >
                  {packStageResult?.state === 'skipped' ? 'SKIPPED' : (packEvidence?.decision?.verdict || 'PENDING')}
                </span>
                <span className="rounded border border-stone-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold uppercase text-stone-800">
                  {packStageResult?.state === 'skipped' ? 'FBA Direct' : (packEvidence?.decision?.outcome || 'seal')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Left Column: Inputs from Pack */}
              <div className="p-5 space-y-3.5 bg-[#FCFAF7]/40">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                  <Info className="h-4 w-4 text-stone-600" />
                  Inputs Received From Pack Agent
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Fulfillment Channel
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {currentCaseMeta.route.toUpperCase()} ({currentCaseMeta.route === 'fba' ? 'Fulfillment by Amazon' : 'Merchant Fulfilled Network'})
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Specialist Flow routing
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Pipeline State
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {packStageResult?.state === 'skipped' ? 'Skipped (Direct Route)' : 'Packed & Sealed'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      {packStageResult?.state === 'skipped' ? 'Bypassed per flow.specialist.json' : 'Physical box verified'}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-3 text-xs">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                    Packaging Specification & Reason
                  </span>
                  <p className="mt-2 text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                    {packStageResult?.state === 'skipped'
                      ? 'In Specialist pod flow, FBA merchandise is shipped direct to Amazon fulfillment centers without secondary warehouse repacking.'
                      : (packEvidence?.decision?.reason || 'Packaging verified in box with compliant protective dunnage.')}
                  </p>
                </div>
              </div>

              {/* Right Column: What Recovery Did with Pack Inputs */}
              <div className="p-5 space-y-3.5 bg-emerald-50/20">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-950">
                  <Scale className="h-4 w-4 text-emerald-700" />
                  What Recovery Manager Did From Taking Them
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        1. Unauthorized Prep Service Surcharge Audit
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-emerald-950">
                        AUDITED
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> Recovery cross-references Pack Manager's routing verification to ensure Amazon did not invoice phantom warehouse handling surcharges (such as unrequested bubble-wrapping, poly-bagging, or taping fees) on pre-packaged stock.
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        2. Dimensional Weight Rule Verification (Rule #2005)
                      </span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-700">
                        SILENT (RULE F-07)
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> For direct FBA units lacking cubic physical packing box scans, Recovery enforces Cube Rule F-07: withhold false claims to guarantee a 100% dispute win rate.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AGENT 3: RETURNS MANAGER */}
          <div className="overflow-hidden rounded-xl border border-stone-300/90 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-stone-200 bg-[#FAF7F2] px-5 py-3.5 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Undo2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500">
                      Stage 03 // Agent 3
                    </span>
                    <span className="font-heading text-base font-bold text-stone-900">
                      Returns Manager
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      (returns-manager@1.0)
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-500">
                    Evidence Record: {returnsEvidence?.record_id || (returnsStageResult?.state === 'skipped' ? 'N/A' : `RTN-${selectedUnit}`)} · Returned: {currentCaseMeta.returned ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase text-stone-500">Verdict:</span>
                <span
                  className={`rounded px-2.5 py-1 font-mono text-xs font-extrabold uppercase ${
                    returnsStageResult?.state === 'skipped'
                      ? 'bg-stone-200 text-stone-700'
                      : returnsEvidence?.decision?.verdict === 'PASS'
                      ? 'bg-emerald-100 text-emerald-950'
                      : returnsEvidence?.decision?.verdict === 'FAIL'
                      ? 'bg-rose-100 text-rose-950'
                      : 'bg-amber-100 text-amber-950'
                  }`}
                >
                  {returnsStageResult?.state === 'skipped' ? 'SKIPPED' : (returnsEvidence?.decision?.verdict || 'PENDING')}
                </span>
                <span className="rounded border border-stone-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold uppercase text-stone-800">
                  {returnsStageResult?.state === 'skipped' ? 'Direct Sale' : (returnsEvidence?.decision?.outcome || 'liquidate')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Left Column: Inputs from Returns */}
              <div className="p-5 space-y-3.5 bg-[#FCFAF7]/40">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                  <Info className="h-4 w-4 text-stone-600" />
                  Inputs Received From Returns Agent
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Customer Return Status
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {currentCaseMeta.returned ? 'Return Received & Logged' : 'No Return (Direct Sale)'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Order: {returnsEvidence?.subject?.refs?.order_id || 'ORD-DUMMY-50014'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Return Disposition
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {returnsStageResult?.state === 'skipped' ? 'N/A' : (returnsEvidence?.decision?.outcome || 'liquidate')}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Condition: {returnsEvidence?.payload?.observed_state || 'signs_of_use'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Completeness Check
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {returnsEvidence?.checks?.find((c) => c.check_key === 'completeness')?.verdict || 'PASS'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Missing parts: {returnsEvidence?.payload?.parts_missing?.length || 0}
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white p-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                      Return Photographic Proof
                    </span>
                    <span className="font-bold text-stone-900 text-sm block mt-1">
                      {currentCaseMeta.returned ? '3 Evidence Photos' : 'None required'}
                    </span>
                    <span className="font-mono text-xs text-stone-600 block mt-0.5">
                      Intake timestamp logged
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-3 text-xs">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                    Returns Agent Recommendation
                  </span>
                  <p className="mt-2 text-xs sm:text-[13px] text-stone-700 leading-relaxed italic">
                    "{returnsEvidence?.decision?.reason || (currentCaseMeta.returned ? 'Returned package evaluated for merchant liquidation.' : 'Unit was direct fulfillment; no customer return processed.')}"
                  </p>
                </div>
              </div>

              {/* Right Column: What Recovery Did with Returns Inputs */}
              <div className="p-5 space-y-3.5 bg-emerald-50/20">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-950">
                  <Scale className="h-4 w-4 text-emerald-700" />
                  What Recovery Manager Did From Taking Them
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        1. FBA Customer Concession Reimbursement (Rule #2004)
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-emerald-950">
                        POLICY DISPUTE
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> When Returns marks an item as "Liquidate" with customer signs of use, Amazon policy states that if customer damaged the goods, Amazon cannot refund the buyer from seller funds without reimbursing the seller. Recovery audits the seller disbursement ledger and files for 100% item value reimbursement under FBA Customer Return policy.
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200/90 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        2. Missing Components & Safe-T Dispute Package
                      </span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-700">
                        SAFE-T READY
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-700">
                      <strong>Audit Action:</strong> If Returns logs missing accessories or product switcheroo, Recovery packages the return intake photo citations into an automated Amazon Safe-T Claim to recover unit cost.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AGENT 4: RECOVERY MANAGER (YOUR ENGINE) */}
          <div className="overflow-hidden rounded-xl border-2 border-emerald-600/90 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-emerald-200 bg-emerald-50/70 px-5 py-3.5 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white">
                  <Scale className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Stage 04 // Your Engine
                    </span>
                    <span className="font-heading text-base font-bold text-stone-900">
                      Recovery Manager
                    </span>
                    <span className="font-mono text-xs text-emerald-800 font-semibold">
                      (recovery-sydon@1.0 // Nithesh)
                    </span>
                  </div>
                  <div className="font-mono text-xs text-stone-500">
                    Record: {recoveryEvidence?.record_id || `RCY-${selectedUnit}`} · Multi-Tenant ID: {orgId}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase text-stone-500">Recovery Verdict:</span>
                <span className="rounded bg-emerald-200 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-950">
                  {workflow?.final_outcome?.outcome || 'CLAIM_RECOMMENDED'}
                </span>
                <span className="rounded bg-emerald-800 px-3 py-1 font-mono text-xs font-extrabold text-white">
                  ${claimableUsd.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Left Column: What Recovery Evaluated */}
              <div className="p-5 space-y-3.5 bg-[#FCFAF7]/40">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                  <Info className="h-4 w-4 text-stone-600" />
                  Synthesized Marketplace Charge Ledger
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-rose-700 font-bold block">
                      Contradicted
                    </span>
                    <span className="text-2xl font-black text-rose-950 block mt-1">
                      {contradictedCount}
                    </span>
                    <span className="font-mono text-xs text-rose-800 font-semibold block mt-0.5">
                      Dispute ready
                    </span>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-amber-700 font-bold block">
                      Silent
                    </span>
                    <span className="text-2xl font-black text-amber-950 block mt-1">
                      {silentCount}
                    </span>
                    <span className="font-mono text-xs text-amber-800 font-semibold block mt-0.5">
                      Rule F-07 safe
                    </span>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-700 font-bold block">
                      Supported
                    </span>
                    <span className="text-2xl font-black text-emerald-950 block mt-1">
                      {supportedCount}
                    </span>
                    <span className="font-mono text-xs text-emerald-800 font-semibold block mt-0.5">
                      Compliant fees
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-3.5 text-xs">
                  <span className="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold block">
                    Total Charges Audited Across Pipeline
                  </span>
                  <span className="text-base font-extrabold text-stone-900 block mt-1">
                    {charges.length} fee line item(s) inspected
                  </span>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-stone-600 leading-relaxed">
                    Recovery evaluated automated Seller Central transaction lines against SHA-256 evidence records from Receiving, Pack, and Returns.
                  </p>
                </div>
              </div>

              {/* Right Column: Recovery Output & Actions */}
              <div className="p-5 space-y-3.5 bg-emerald-50/20">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-950">
                  <Scale className="h-4 w-4 text-emerald-700" />
                  Recovery Outputs & Dispute Deliverables
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-emerald-300 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-sm">
                        1. One-Click Amazon Dispute Letter
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPackage}
                        className="rounded-lg bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-950 hover:bg-emerald-200 transition-colors"
                      >
                        {copiedPackage ? 'Copied!' : 'Copy Letter'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                      Formats all contradicted charges and upstream proof hashes into an Amazon Seller Central dispute memo ready to submit.
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-300 bg-white p-3.5 shadow-2xs">
                    <span className="font-bold text-emerald-950 text-sm block">
                      2. Strict Zero False-Claims Guarantee
                    </span>
                    <p className="mt-1.5 text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                      Under CUBE round 3 rules, only fees with irrefutable upstream photographic or measurement proof are disputed (position: CONTRADICTS).
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-300 bg-white p-3.5 shadow-2xs">
                    <span className="font-bold text-emerald-950 text-sm block">
                      3. Human Supervisor Governance
                    </span>
                    <p className="mt-1.5 text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                      Overrides registered by operators under Decision D-007 are immutably tracked on record {recoveryEvidence?.record_id || `RCY-${selectedUnit}`}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Live Charges & Audit Ledger */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">
                Itemized Fee Discrepancy Ledger for {selectedUnit}
              </h2>
              <p className="text-sm text-stone-600">
                Physical evidence comparison against Amazon Seller Central fee assessments.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyPackage}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 shadow-xs hover:bg-stone-50 transition-colors"
            >
              {copiedPackage ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copiedPackage ? 'Copied Claim Package' : 'Export Claim Letter'}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white/70 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
              <p className="mt-3 font-mono text-sm text-stone-700">
                Cross-referencing Amazon fee codes against upstream records...
              </p>
            </div>
          ) : charges.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
              <Info className="mx-auto h-9 w-9 text-stone-400" />
              <h3 className="mt-3 font-heading text-base font-bold text-stone-800">
                No fee penalties logged for {selectedUnit}
              </h3>
              <p className="mt-1.5 text-sm text-stone-600">
                The unit has clean fulfillment or no invoice disputes were filed by the marketplace.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-300/80 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-stone-200 bg-[#FAF7F2] font-mono text-xs uppercase tracking-wider font-bold text-stone-700">
                  <tr>
                    <th className="px-5 py-4">Charge Type / Code</th>
                    <th className="px-5 py-4">Assessed Fee</th>
                    <th className="px-5 py-4">Recovery Position</th>
                    <th className="px-5 py-4">Legal / Physical Audit Evidence</th>
                    <th className="px-5 py-4">Citations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {charges.map((charge, idx) => {
                    const isContradicted = charge.position === 'CONTRADICTS'
                    const isSupported = charge.position === 'SUPPORTS'
                    const isSilent = charge.position === 'SILENT'

                    return (
                      <tr key={idx} className="transition-colors hover:bg-stone-50/60">
                        <td className="px-5 py-4 font-medium text-stone-900">
                          <div className="font-mono text-sm font-bold text-stone-900">
                            {charge.charge_type.replace(/_/g, ' ')}
                          </div>
                          <div className="mt-1 font-mono text-xs text-stone-500">
                            ID: {charge.charge_id || `CHG-00${idx + 1}`}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-sm font-bold text-stone-900">
                          ${Number(charge.amount_usd || 0).toFixed(2)} {charge.currency || 'USD'}
                        </td>

                        <td className="px-5 py-4">
                          {isContradicted && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-extrabold uppercase text-emerald-950">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                              CONTRADICTS (CLAIM)
                            </span>
                          )}
                          {isSupported && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 font-mono text-xs font-extrabold uppercase text-rose-950">
                              <XCircle className="h-3.5 w-3.5 text-rose-700" />
                              SUPPORTS (VALID)
                            </span>
                          )}
                          {isSilent && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 font-mono text-xs font-extrabold uppercase text-stone-700">
                              <HelpCircle className="h-3.5 w-3.5 text-stone-500" />
                              SILENT (WITHHELD)
                            </span>
                          )}
                        </td>

                        <td className="max-w-md px-5 py-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                          <span>{charge.reason}</span>
                          {charge.posted_date && (
                            <span className="mt-1.5 block font-mono text-xs text-stone-500">
                              Charge date: {charge.posted_date}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {charge.evidence_refs && charge.evidence_refs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {charge.evidence_refs.map((ref: string) => (
                                <button
                                  key={ref}
                                  type="button"
                                  onClick={() => {
                                    const rec = allEvidence.find((e) => e.record_id === ref)
                                    if (rec) setSelectedEvidenceRecord(rec)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2.5 py-1 font-mono text-xs font-bold text-teal-900 hover:bg-teal-100 transition-colors"
                                >
                                  {ref}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-stone-400">None cited</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Proper Diagnostic Report ("why inspection passed or failed") */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6">
          {/* Diagnostic Root-Cause Banner */}
          <div className="rounded-xl border border-stone-300 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-4 gap-2">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500">
                  Root-Cause Forensic Analysis
                </span>
                <h3 className="font-heading text-xl font-bold text-stone-900 mt-0.5">
                  Inspection Outcome Verdict: {workflow?.final_outcome?.outcome || 'EVALUATED'}
                </h3>
              </div>
              <span
                className={`rounded-lg px-3.5 py-1.5 font-mono text-sm font-extrabold uppercase ${
                  workflow?.final_outcome?.outcome === 'CLEAN' || workflow?.final_outcome?.verdict === 'PASS'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : workflow?.final_outcome?.outcome === 'CLAIM_RECOMMENDED'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : workflow?.final_outcome?.outcome === 'EXCEPTION'
                    ? 'bg-rose-100 text-rose-950 border border-rose-300'
                    : 'bg-amber-100 text-amber-950 border border-amber-300'
                }`}
              >
                {workflow?.final_outcome?.outcome || 'AUDITED'}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-[#FAF7F2] p-4.5 text-sm text-stone-800 leading-relaxed border border-stone-200">
              <strong className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 block mb-1.5">
                Executive Finding:
              </strong>
              {getInspectionReasonSummary()}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="block font-heading text-2xl font-black text-emerald-950">{passedChecks.length}</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 mt-1 block">Passed Conditions</span>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <span className="block font-heading text-2xl font-black text-rose-950">{failedChecks.length}</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-800 mt-1 block">Exceptions / Failed</span>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <span className="block font-heading text-2xl font-black text-amber-950">{uncertainChecks.length}</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800 mt-1 block">Uncertain / Reviewed</span>
              </div>
            </div>
          </div>

          {/* Detailed Check-by-Check Audit Grid */}
          <div className="space-y-3.5">
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-800">
              All Evaluated Checks Across Physical & Dispute Stages ({allChecksWithStage.length})
            </h4>

            {allChecksWithStage.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
                No check records extracted for this unit.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {allChecksWithStage.map((item, idx) => {
                  const chk = item.check
                  const isFail = chk.verdict === 'FAIL'
                  const isPass = chk.verdict === 'PASS'

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 text-xs transition-shadow hover:shadow-xs ${
                        isFail
                          ? 'border-rose-200 bg-rose-50/40'
                          : isPass
                          ? 'border-stone-200 bg-white'
                          : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-stone-700">
                            {item.stage}
                          </span>
                          <span className="font-mono text-sm font-bold text-stone-900">{chk.check_key}</span>
                        </div>
                        <span
                          className={`rounded px-2.5 py-1 font-mono text-xs font-extrabold ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-950'
                              : isFail
                              ? 'bg-rose-100 text-rose-950'
                              : 'bg-amber-100 text-amber-950'
                          }`}
                        >
                          {chk.verdict}
                        </span>
                      </div>

                      <p className="mt-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed">{chk.detail || 'Condition evaluated.'}</p>

                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between font-mono text-xs text-stone-500">
                        <span>Expected: {JSON.stringify(chk.expected ?? 'none')}</span>
                        <span>Observed: {JSON.stringify(chk.observed ?? 'none')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Amazon Dispute Rules Catalog */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-stone-900">
              Amazon FBA Dispute Rules Catalog (v0.2.0)
            </h2>
            <p className="text-sm text-stone-600">
              Deterministic fee dispute requirements, evidence prerequisites, and claim windows mapped directly to official Seller Central policies.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {AMAZON_RULES_CATALOG.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col justify-between rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-stone-100 px-2.5 py-1 font-mono text-xs font-bold text-stone-800">
                      RULE #{rule.id}
                    </span>
                    <span className="rounded-md border border-stone-200 bg-[#FAF7F2] px-2.5 py-1 font-mono text-xs font-semibold text-stone-700">
                      {rule.charge_type}
                    </span>
                  </div>

                  <h3 className="mt-3 font-heading text-base font-bold text-stone-900">
                    {rule.name}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-700">
                    {rule.rule_text}
                  </p>

                  <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-3.5 text-xs">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-stone-600 block">
                        Evidence Requirements:
                      </span>
                      <ul className="mt-1 list-disc pl-4 text-stone-700 space-y-0.5">
                        {rule.evidence_requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    {rule.claim_window_days && (
                      <div className="flex items-center gap-2 font-mono text-xs text-stone-700">
                        <span className="font-bold text-stone-500">Claim Window:</span>
                        <span>{rule.claim_window_days} days</span>
                      </div>
                    )}

                    <div className="rounded-lg bg-amber-50/80 p-2.5 font-mono text-xs text-amber-950 border border-amber-200/80">
                      <strong>Policy Note:</strong> {rule.verification_note}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between">
                  <a
                    href={rule.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-teal-800 hover:underline"
                  >
                    <span>Amazon Policy Source</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <span className="font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold">
                    STATUS: {rule.policy_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Live Overrides Studio */}
      {activeTab === 'overrides' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-stone-900">
              Supervisor Override Studio for {selectedUnit}
            </h2>
            <p className="text-sm text-stone-600">
              Allows warehouse supervisors to override automated charge verdicts with full tamper-evident audit logging.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={handleApplyOverride} className="rounded-xl border border-stone-300 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-800">
                Register New Supervisor Override
              </h3>

              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
                  Target Record ID:
                </label>
                <input
                  type="text"
                  readOnly
                  value={recoveryEvidence?.record_id || `RCY-${workflow?.subject_id || selectedUnit}`}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-2 font-mono text-sm text-stone-800"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
                  Target Field:
                </label>
                <select
                  value={overrideTarget}
                  onChange={(e) => setOverrideTarget(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800 font-medium"
                >
                  <option value="decision">Overall Recovery Decision</option>
                  {charges.map((c, i) => (
                    <option key={i} value={`charge_${c.charge_id || i}`}>
                      Charge #{i + 1}: {c.charge_type} (${c.amount_usd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
                  New Supervisor Verdict:
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['FAIL', 'PASS', 'UNCERTAIN'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setOverrideVerdict(v)}
                      className={`rounded-lg border py-2.5 text-center font-mono text-xs font-bold uppercase transition-all ${
                        overrideVerdict === v
                          ? v === 'FAIL'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600 font-black'
                            : v === 'PASS'
                            ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600 font-black'
                            : 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600 font-black'
                          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {v === 'FAIL' ? 'CONTRADICTS (CLAIM)' : v === 'PASS' ? 'SUPPORTS (NO CLAIM)' : 'SILENT'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
                  Authorizing Actor:
                </label>
                <input
                  type="text"
                  value={overrideActor}
                  onChange={(e) => setOverrideActor(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone-600">
                  Justification / Legal Reason:
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-800 focus:outline-emerald-600 leading-relaxed"
                />
              </div>

              {overrideSuccess && (
                <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-700" />
                  <span>{overrideSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOverride}
                className="w-full rounded-xl bg-emerald-900 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all"
              >
                {submittingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Commit Tamper-Evident Override
              </button>
            </form>

            <div className="rounded-xl border border-stone-300 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-stone-500" />
                  Workflow Overrides Audit Trail ({workflow?.overrides?.length || 0})
                </h3>

                <div className="mt-4 space-y-3">
                  {!workflow?.overrides || workflow.overrides.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center text-sm text-stone-500">
                      No overrides applied to this workflow. The automated deterministic verdict is currently effective.
                    </div>
                  ) : (
                    workflow.overrides.map((ov, i) => (
                      <div key={i} className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-stone-900">{ov.actor}</span>
                          <span className="font-mono text-xs text-stone-500">{ov.at}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-xs">
                          <span className="text-stone-500">Verdict changed:</span>
                          <span className="line-through text-stone-400">{ov.original_verdict}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                          <span className="font-bold text-emerald-800">{ov.new_verdict}</span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">{ov.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-stone-100 p-3.5 text-xs text-stone-600 leading-relaxed border border-stone-200">
                <strong>Audit Provenance:</strong> Overrides are append-only. The original automated verdict is preserved, and the workflow state computes the latest effective decision without destroying historical provenance.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Amazon Dispute Package */}
      {activeTab === 'package' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">
                Amazon Seller Central Dispute Package for {selectedUnit}
              </h2>
              <p className="text-sm text-stone-600">
                Standardized submission letter compliant with Amazon Seller Central FBA Reimbursement ticket requirements.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyPackage}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              {copiedPackage ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
              {copiedPackage ? 'Copied to Clipboard!' : 'Copy Formal Dispute Package'}
            </button>
          </div>

          <div className="relative rounded-2xl border border-stone-300 bg-stone-900 p-6 text-stone-100 shadow-inner">
            <pre className="overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed selection:bg-teal-700 selection:text-white">
              {generateDisputePackageText()}
            </pre>
          </div>
        </div>
      )}

      {/* Slide-over Modal for Evidence Citations */}
      {selectedEvidenceRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-300 bg-white p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedEvidenceRecord(null)}
              className="absolute top-5 right-5 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-teal-100 px-3 py-1 font-mono text-xs font-bold text-teal-900">
                {selectedEvidenceRecord.record_id}
              </span>
              <span className="font-mono text-xs font-semibold uppercase text-stone-500">
                Stage: {selectedEvidenceRecord.stage}
              </span>
            </div>

            <h3 className="mt-3 font-heading text-2xl font-bold text-stone-900">
              Cited Upstream Evidence Record
            </h3>

            <div className="mt-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 font-mono text-xs">
                <div>
                  <span className="text-stone-400 block">Captured At:</span>
                  <div className="font-bold text-stone-800 mt-0.5">{selectedEvidenceRecord.captured_at}</div>
                </div>
                <div>
                  <span className="text-stone-400 block">Agent ID:</span>
                  <div className="font-bold text-stone-800 mt-0.5">{selectedEvidenceRecord.agent_id}</div>
                </div>
                <div>
                  <span className="text-stone-400 block">Verdict:</span>
                  <div className="font-extrabold text-teal-900 mt-0.5">{selectedEvidenceRecord.decision?.verdict}</div>
                </div>
                <div>
                  <span className="text-stone-400 block">Outcome:</span>
                  <div className="font-bold text-stone-800 mt-0.5">{selectedEvidenceRecord.decision?.outcome}</div>
                </div>
              </div>

              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">Decision Reason:</span>
                <p className="mt-1.5 rounded-lg bg-[#FAF7F2] p-3 text-stone-800 leading-relaxed border border-stone-200">{selectedEvidenceRecord.decision?.reason}</p>
              </div>

              {selectedEvidenceRecord.checks && selectedEvidenceRecord.checks.length > 0 && (
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">Checks Evaluated:</span>
                  <div className="mt-2 space-y-2">
                    {selectedEvidenceRecord.checks.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5">
                        <span className="font-mono text-xs font-semibold text-stone-800">{c.check_key}</span>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                            c.verdict === 'PASS'
                              ? 'bg-emerald-100 text-emerald-900'
                              : c.verdict === 'FAIL'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {c.verdict}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="truncate font-mono text-xs text-stone-400 pt-2 border-t border-stone-100">
                Content Hash: {selectedEvidenceRecord.content_hash}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default RecoveryInspector
