import React, { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCheck2,
  Hash,
  RotateCcw,
  Shield,
  UserCheck,
} from 'lucide-react'
import { api, ApiError } from '@/services/api'
import type {
  EvidenceBundle,
  EvidenceCheck,
  EvidenceRecord,
  ReturnsDisposition,
  WorkflowState,
} from '@/types/workflow'

interface ReturnsReportViewProps {
  bundle: EvidenceBundle
  returnsRecord: EvidenceRecord
  onReset?: () => void
  onWorkflowUpdated?: (updatedWf: WorkflowState) => void
  hideResetButton?: boolean
}

const DISPOSITION_CONFIG: Record<
  ReturnsDisposition,
  { label: string; badgeClass: string; desc: string }
> = {
  restock: {
    label: 'RESTOCK',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    desc: 'Item verified authentic, complete, and like-new. Returned to active warehouse inventory.',
  },
  refurbish: {
    label: 'REFURBISH',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
    desc: 'Item authentic but missing packaging or minor parts. Sent to repack / re-kitting station.',
  },
  liquidate: {
    label: 'LIQUIDATE',
    badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
    desc: 'Item authentic with cosmetic or open-box wear. Routing to B2B liquidation auction.',
  },
  dispose: {
    label: 'DISPOSE',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-300',
    desc: 'Item severely damaged, non-functional, or hazardous. Destined for certified destruction.',
  },
  pending_review: {
    label: 'PENDING REVIEW',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    desc: 'Evidence inconclusive or conflicting. Requires physical supervisor bench inspection.',
  },
  reject: {
    label: 'REJECT',
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-400',
    desc: 'No recognizable returned product was detected. Please upload a clear image of the actual item.',
  },
}

export const ReturnsReportView: React.FC<ReturnsReportViewProps> = ({
  bundle,
  returnsRecord,
  onReset,
  onWorkflowUpdated,
  hideResetButton = false,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  // Supervisor override state
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideActor, setOverrideActor] = useState('')
  const [overrideVerdict, setOverrideVerdict] = useState<'PASS' | 'FAIL' | 'UNCERTAIN'>('PASS')
  const [overrideOutcome, setOverrideOutcome] = useState<ReturnsDisposition>('restock')
  const [overrideReason, setOverrideReason] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null)

  // Authoritative operational Returns disposition (warehouse truth)
  const rawDisposition = (returnsRecord.decision?.outcome || 'pending_review').toLowerCase() as ReturnsDisposition
  const disposition: ReturnsDisposition =
    rawDisposition in DISPOSITION_CONFIG ? rawDisposition : 'pending_review'
  const dispositionConfig = DISPOSITION_CONFIG[disposition]

  const returnsVerdict = returnsRecord.decision?.verdict || 'UNCERTAIN'
  const returnsReason = returnsRecord.decision?.reason || 'Returns inspection completed.'
  const needsHuman = Boolean(returnsRecord.decision?.needs_human)

  // Separate Pod-level workflow outcome (orchestrator rollup truth)
  const podOutcome = bundle.workflow?.final_outcome?.outcome
  const podVerdict = bundle.workflow?.final_outcome?.verdict
  const podReason = bundle.workflow?.final_outcome?.reason
  const podClaimable = bundle.workflow?.final_outcome?.claimable_usd

  // Authoritative backend checks
  const checks: EvidenceCheck[] = returnsRecord.checks || []

  // Vision detected payload
  const payload = returnsRecord.payload || {}
  const detected = payload.detected_evidence || {}
  const visibleDamage: string[] = detected.visible_damage || []
  const visibleParts: string[] = detected.visible_parts || []
  const missingParts: string[] = payload.parts_missing || detected.missing_candidates || []
  const conflictingParts: string[] = detected.conflicting_parts || []
  const packagingState: string = detected.packaging_state || 'unknown'
  const uncertaintyNotes: string = detected.uncertainty_notes || ''
  const modelName = returnsRecord.model?.name || detected.model_used || 'Gemini Vision'
  const latencyMs = returnsRecord.latency_ms || detected.latency_ms || null
  const expectedProduct =
    payload.expected_product ||
    bundle.workflow?.context?.title ||
    returnsRecord.subject?.refs?.sku ||
    'Returned Item'
  const expectedSku =
    payload.expected_sku ||
    returnsRecord.subject?.refs?.sku ||
    bundle.workflow?.context?.sku ||
    ''
  const expectedPartsList: string[] =
    payload.expected_parts ||
    bundle.workflow?.context?.expected_parts ||
    []
  const observedProduct =
    payload.observed_product ||
    detected.product ||
    (checks.find((c) => c.check_key === 'identity_match')?.observed as string) ||
    'Not detected'
  const imageQuality =
    payload.image_quality ||
    detected.image_quality ||
    'good'
  const dispositionCategory = payload.disposition_category || ''

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setOverrideError(null)
    setOverrideSuccess(null)

    if (!overrideActor.trim()) {
      setOverrideError('Supervisor ID or name is required.')
      return
    }
    if (!overrideReason.trim()) {
      setOverrideError('A valid operational rationale is required.')
      return
    }
    if (!bundle.workflow?.workflow_id) {
      setOverrideError('No active workflow associated with this record to override.')
      return
    }

    setSubmittingOverride(true)
    try {
      const updatedWf = await api.submitOverride(bundle.workflow.workflow_id, {
        record_id: returnsRecord.record_id,
        new_verdict: overrideVerdict,
        actor: overrideActor.trim(),
        reason: overrideReason.trim(),
        new_outcome: overrideOutcome,
      })
      setOverrideSuccess(`Override applied successfully by ${overrideActor.trim()}. Effective disposition updated.`)
      setShowOverrideForm(false)
      if (onWorkflowUpdated) {
        onWorkflowUpdated(updatedWf)
      }
    } catch (err: any) {
      setOverrideError(err instanceof ApiError ? err.detail : err.message || 'Failed to submit override.')
    } finally {
      setSubmittingOverride(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. MOST PROMINENT ELEMENT: RETURNS OPERATIONAL FINAL RESULT   */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Returns Inspection Result"
        className={`rounded-2xl border-2 p-6 sm:p-8 shadow-md transition-all ${
          disposition === 'restock'
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 text-stone-900'
            : disposition === 'refurbish'
            ? 'border-blue-500/40 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 text-stone-900'
            : disposition === 'liquidate'
            ? 'border-purple-500/40 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 text-stone-900'
            : disposition === 'dispose'
            ? 'border-rose-500/40 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 text-stone-900'
            : disposition === 'reject'
            ? 'border-rose-600/50 bg-gradient-to-br from-rose-50/95 via-white to-rose-100/50 text-stone-900'
            : 'border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 text-stone-900'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-teal-800">
                RETURNS MANAGER · WAREHOUSE OPERATIONAL DISPOSITION
              </span>
              <span className="rounded-full bg-stone-200/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-stone-700">
                STAGE 3
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-950">
                {dispositionConfig.label}
              </h2>
              <span
                className={`rounded-md border px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
                  returnsVerdict === 'PASS'
                    ? 'border-emerald-300 bg-emerald-100/90 text-emerald-900'
                    : returnsVerdict === 'FAIL'
                    ? 'border-rose-300 bg-rose-100/90 text-rose-900'
                    : 'border-amber-300 bg-amber-100/90 text-amber-900'
                }`}
              >
                VERDICT: {returnsVerdict}
              </span>
            </div>
            <p className="mt-2 text-sm sm:text-base font-medium text-stone-700 max-w-3xl leading-relaxed">
              {dispositionConfig.desc}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start sm:items-end gap-2">
            {!hideResetButton && onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800 shadow-2xs transition-colors hover:border-teal-700 hover:bg-teal-50 hover:text-teal-900"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Analyze another return
              </button>
            )}
            {needsHuman && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100/80 px-3 py-1 font-mono text-xs font-bold text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                Human Review Required
              </span>
            )}
          </div>
        </div>

        {/* Operational Reason Box */}
        <div className="mt-5 rounded-xl border border-stone-200/90 bg-white/95 p-4 text-xs sm:text-sm font-mono leading-relaxed text-stone-800 shadow-2xs">
          <strong className="text-stone-950">Decision Rationale:</strong> {returnsReason}
        </div>

        {/* CRITICAL SEPARATION BANNER: POD-LEVEL OUTCOME VS RETURNS DISPOSITION */}
        {podOutcome && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-lg border border-teal-200 bg-teal-50/70 p-3 font-mono text-xs text-teal-950">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span>
                <strong>Pod Rollup Outcome:</strong> {podOutcome} (Verdict: {podVerdict || '—'}){podReason ? ` · ${podReason}` : ''}
              </span>
            </div>
            {typeof podClaimable === 'number' && podClaimable > 0 && (
              <span className="font-bold text-teal-900">
                Disputed Claim Amount: ${podClaimable.toFixed(2)} USD
              </span>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. RETURN INSPECTION EVIDENCE OVERVIEW                         */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Inspection Overview" className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-teal-800" aria-hidden="true" />
            Inspection Overview & Comparison
          </h3>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-500">
            Authoritative Evidence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expected vs Observed */}
          <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 space-y-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Product Identity Comparison
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500">Expected Item:</span>
                <span className="font-bold text-stone-900 text-right">
                  {expectedProduct} {expectedSku ? `(${expectedSku})` : ''}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500">Observed Item:</span>
                <span className="font-bold text-teal-950 text-right">
                  {observedProduct}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200">
                <span className="text-stone-500">Identity Match:</span>
                <span className={`font-bold ${returnsVerdict === 'PASS' ? 'text-emerald-700' : returnsVerdict === 'FAIL' ? 'text-rose-700' : 'text-amber-700'}`}>
                  {checks.find((c) => c.check_key === 'identity_match')?.verdict || returnsVerdict}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500">Image Quality:</span>
                <span className="font-semibold text-stone-800 capitalize">
                  {imageQuality}
                </span>
              </div>
            </div>
          </div>

          {/* Completeness & Condition */}
          <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 space-y-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Completeness & Physical Condition
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              <div>
                <span className="text-stone-500">Expected Components:</span>{' '}
                <span className="text-stone-800 font-medium">
                  {expectedPartsList.length > 0 ? expectedPartsList.join(', ') : 'None specified'}
                </span>
              </div>
              <div>
                <span className="text-stone-500">Observed Components:</span>{' '}
                <span className="text-stone-800 font-medium">
                  {visibleParts.length > 0 ? visibleParts.join(', ') : 'None visible'}
                </span>
              </div>
              {missingParts.length > 0 ? (
                <div className="text-rose-700 font-bold">
                  Missing Component: {missingParts.join(', ')}
                </div>
              ) : (
                <div className="text-emerald-700 font-medium">
                  Missing Components: None established
                </div>
              )}
              <div className="pt-1 border-t border-stone-200">
                <span className="text-stone-500">Condition Grade:</span>{' '}
                <span className="font-semibold text-stone-800">
                  {payload.amazon_condition || (visibleDamage.length > 0 ? 'Damaged' : 'Inspected')}
                </span>
                {visibleDamage.length > 0 && (
                  <div className="text-rose-700 mt-0.5">
                    Visible Damage: {visibleDamage.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action / Explanation Banner */}
        <div className={`rounded-xl border p-3.5 font-mono text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
          disposition === 'reject'
            ? 'border-rose-300 bg-rose-50 text-rose-950'
            : disposition === 'restock'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
            : disposition === 'refurbish'
            ? 'border-blue-300 bg-blue-50 text-blue-950'
            : disposition === 'dispose'
            ? 'border-rose-300 bg-rose-50 text-rose-950'
            : 'border-amber-300 bg-amber-50 text-amber-950'
        }`}>
          <div>
            <strong>Next Action:</strong>{' '}
            {disposition === 'reject'
              ? 'No recognizable returned product was detected. Please upload a clear image of the actual item.'
              : disposition === 'restock'
              ? 'Item complete and verified. Return to active warehouse inventory.'
              : disposition === 'refurbish'
              ? 'Route to re-kitting station to supply missing component.'
              : disposition === 'dispose'
              ? 'Product damaged. Route to certified destruction.'
              : 'Hold for manual bench supervisor review.'}
          </div>
          {dispositionCategory && (
            <span className="rounded bg-black/5 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] shrink-0">
              {dispositionCategory.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. THREE AUTHORITATIVE BACKEND CHECKS (NO SYNTHETIC CHECKS)   */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-teal-800" aria-hidden="true" />
            Authoritative Returns Inspection Checks
          </h3>
          <span className="font-mono text-[11px] text-stone-500 uppercase tracking-wider">
            {checks.length} verified checks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check 1: identity_match */}
          {(() => {
            const chk = checks.find((c) => c.check_key === 'identity_match')
            const v = chk?.verdict || 'UNCERTAIN'
            const conf = typeof chk?.confidence === 'number' ? Math.round(chk.confidence * 100) : null
            return (
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-600 uppercase">
                      Check 1 · Identity Match
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border ${
                        v === 'PASS'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : v === 'FAIL'
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                  <h4 className="mt-2 font-heading font-semibold text-stone-900 text-base">
                    Catalog Merchandise Verification
                  </h4>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                    {chk?.detail || 'Verifies physical product matches catalog SKU and description.'}
                  </p>
                  {chk?.uncertain_reason && (
                    <div className="mt-2 rounded bg-amber-50/70 p-2 font-mono text-[11px] text-amber-900 border border-amber-200">
                      <strong>Uncertain reason:</strong> {chk.uncertain_reason}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Expected: {String(chk?.expected || 'Catalog SKU')}</span>
                  {conf !== null && <span className="font-bold text-teal-800">{conf}% conf</span>}
                </div>
              </div>
            )
          })()}

          {/* Check 2: completeness */}
          {(() => {
            const chk = checks.find((c) => c.check_key === 'completeness')
            const v = chk?.verdict || 'UNCERTAIN'
            const conf = typeof chk?.confidence === 'number' ? Math.round(chk.confidence * 100) : null
            return (
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-600 uppercase">
                      Check 2 · Completeness
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border ${
                        v === 'PASS'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : v === 'FAIL'
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                  <h4 className="mt-2 font-heading font-semibold text-stone-900 text-base">
                    Parts & Accessories Verification
                  </h4>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                    {chk?.detail || 'Confirms all expected components, cables, and manuals are present.'}
                  </p>
                  {chk?.uncertain_reason && (
                    <div className="mt-2 rounded bg-amber-50/70 p-2 font-mono text-[11px] text-amber-900 border border-amber-200">
                      <strong>Uncertain reason:</strong> {chk.uncertain_reason}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>
                    Missing: {missingParts.length > 0 ? missingParts.join(', ') : 'None'}
                  </span>
                  {conf !== null && <span className="font-bold text-teal-800">{conf}% conf</span>}
                </div>
              </div>
            )
          })()}

          {/* Check 3: condition */}
          {(() => {
            const chk = checks.find((c) => c.check_key === 'condition')
            const v = chk?.verdict || 'UNCERTAIN'
            const conf = typeof chk?.confidence === 'number' ? Math.round(chk.confidence * 100) : null
            return (
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-600 uppercase">
                      Check 3 · Condition
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border ${
                        v === 'PASS'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : v === 'FAIL'
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                  <h4 className="mt-2 font-heading font-semibold text-stone-900 text-base">
                    Physical Condition Grading
                  </h4>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                    {chk?.detail || 'Inspects unit for cosmetic wear, fractures, stains, or liquid ingress.'}
                  </p>
                  {chk?.uncertain_reason && (
                    <div className="mt-2 rounded bg-amber-50/70 p-2 font-mono text-[11px] text-amber-900 border border-amber-200">
                      <strong>Uncertain reason:</strong> {chk.uncertain_reason}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>
                    Grade: {payload.amazon_condition || (visibleDamage.length > 0 ? 'Damaged' : 'Graded')}
                  </span>
                  {conf !== null && <span className="font-bold text-teal-800">{conf}% conf</span>}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. GEMINI MULTIMODAL VISION INSPECTION EVIDENCE              */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-800" aria-hidden="true" />
            Gemini Multimodal Vision Evidence
          </h3>
          <div className="flex items-center gap-3 font-mono text-xs text-stone-600">
            <span>Model: <strong className="text-stone-900">{modelName}</strong></span>
            {latencyMs !== null && <span>· Latency: <strong>{latencyMs}ms</strong></span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3 space-y-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Observed Merchandise
            </span>
            <div className="text-stone-900 font-semibold text-sm">
              {detected.product || 'Standard Return Item'}
            </div>
            {detected.brand && (
              <div className="text-stone-600">Brand: {detected.brand}</div>
            )}
            <div className="text-stone-600">
              Packaging State: <span className="capitalize font-semibold text-stone-800">{packagingState.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3 space-y-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Visual Parts & Completeness
            </span>
            <div className="text-stone-800">
              <strong>Visible ({visibleParts.length}):</strong>{' '}
              {visibleParts.length > 0 ? visibleParts.join(', ') : 'None detected'}
            </div>
            {missingParts.length > 0 && (
              <div className="text-rose-700 font-semibold">
                Missing ({missingParts.length}): {missingParts.join(', ')}
              </div>
            )}
            {conflictingParts.length > 0 && (
              <div className="text-amber-800 font-semibold">
                Multi-image Conflict: {conflictingParts.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Visible Damage */}
        {visibleDamage.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 font-mono text-xs text-rose-950 space-y-1">
            <strong className="text-rose-900 uppercase tracking-wide text-[10px] block">
              Detected Physical Defects ({visibleDamage.length}):
            </strong>
            <ul className="list-disc list-inside space-y-0.5">
              {visibleDamage.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Uncertainty Notes */}
        {uncertaintyNotes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 font-mono text-xs text-amber-950 space-y-1">
            <strong className="text-amber-900 uppercase tracking-wide text-[10px] block">
              Vision Model Uncertainty Notes:
            </strong>
            <p>{uncertaintyNotes}</p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. SUPERVISOR REVIEW & OVERRIDE ACCORDION                     */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-stone-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-teal-800" aria-hidden="true" />
              Supervisor Review & Override
            </h3>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Certified warehouse operators may override operational disposition with audit traceability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className="rounded border border-stone-300 bg-stone-50 px-3 py-1 font-mono text-xs font-bold uppercase text-stone-800 hover:bg-stone-100"
          >
            {showOverrideForm ? 'Hide Form' : 'Apply Override'}
          </button>
        </div>

        {overrideSuccess && (
          <div className="rounded border border-emerald-300 bg-emerald-50 p-3 font-mono text-xs text-emerald-900">
            {overrideSuccess}
          </div>
        )}

        {showOverrideForm && (
          <form onSubmit={handleApplyOverride} className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            {overrideError && (
              <div className="rounded border border-rose-300 bg-rose-50 p-2 font-mono text-xs text-rose-900">
                {overrideError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-stone-600 mb-1">
                  Supervisor ID
                </label>
                <input
                  type="text"
                  value={overrideActor}
                  onChange={(e) => setOverrideActor(e.target.value)}
                  placeholder="supervisor-ops-01"
                  className="w-full rounded border border-stone-300 p-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-stone-600 mb-1">
                  New Operational Disposition
                </label>
                <select
                  value={overrideOutcome}
                  onChange={(e) => setOverrideOutcome(e.target.value as ReturnsDisposition)}
                  className="w-full rounded border border-stone-300 p-2 font-mono text-xs bg-white"
                >
                  <option value="restock">restock</option>
                  <option value="refurbish">refurbish</option>
                  <option value="liquidate">liquidate</option>
                  <option value="dispose">dispose</option>
                  <option value="pending_review">pending_review</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-stone-600 mb-1">
                  New Verdict
                </label>
                <select
                  value={overrideVerdict}
                  onChange={(e) => setOverrideVerdict(e.target.value as any)}
                  className="w-full rounded border border-stone-300 p-2 font-mono text-xs bg-white"
                >
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="UNCERTAIN">UNCERTAIN</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase font-bold text-stone-600 mb-1">
                Operational Justification / Reason
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Physical bench inspection confirms packaging opened but product 100% undamaged and complete."
                className="w-full rounded border border-stone-300 p-2 font-mono text-xs"
                rows={2}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOverrideForm(false)}
                className="rounded border border-stone-300 px-3 py-1.5 font-mono text-xs text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOverride}
                className="rounded border border-teal-800 bg-stone-950 px-4 py-1.5 font-mono text-xs font-bold uppercase text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {submittingOverride ? 'Submitting...' : 'Commit Override'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. AUDIT & TRACEABILITY ACCORDION                             */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex w-full items-center justify-between text-left font-mono text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900"
        >
          <span className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
            Audit Traceability & Content Hashing
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="mt-3 border-t border-stone-100 pt-3 space-y-2 font-mono text-xs text-stone-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-stone-500">Record ID:</span>
              <span className="font-semibold text-stone-900 select-all">{returnsRecord.record_id}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-stone-500">Content Hash (SHA-256):</span>
              <span className="font-semibold text-stone-900 select-all break-all">{returnsRecord.content_hash}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-stone-500">Captured At:</span>
              <span>{returnsRecord.captured_at || '—'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-stone-500">Produced At:</span>
              <span>{returnsRecord.produced_at || '—'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-stone-500">Agent Implementation:</span>
              <span>{returnsRecord.agent_id}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
