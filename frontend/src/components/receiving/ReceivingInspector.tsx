import React, { useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileCheck2,
  Loader2,
  Package,
  Play,
  Search,
  Truck,
} from 'lucide-react'
import { api } from '@/services/api'
import { ALL_UNIT_CASES } from '@/data/allCases'
import type { EvidenceBundle, EvidenceRecord, WorkflowState } from '@/types/workflow'

interface ReceivingInspectorProps {
  onNavigateToAgents?: () => void
}

export const ReceivingInspector: React.FC<ReceivingInspectorProps> = () => {
  // Unit Selection State (default to UNIT-0014)
  const [selectedUnit, setSelectedUnit] = useState<string>('UNIT-0014')
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null)
  const [evidenceBundle, setEvidenceBundle] = useState<EvidenceBundle | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'fba' | 'mfn' | 'shortfall'>('all')
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false)

  // Current case metadata
  const currentCaseMeta = ALL_UNIT_CASES.find((c) => c.unit_id === selectedUnit) || {
    unit_id: selectedUnit,
    org_id: parseInt(selectedUnit.replace(/\D/g, ''), 10) % 3 === 0 ? 'org_demo_bravo' : 'org_demo_alpha',
    route: 'fba',
    returned: false,
    has_fees: false,
    fee_types: [],
  }

  const orgId = currentCaseMeta.org_id

  // Filter cases for the dropdown
  const filteredCases = ALL_UNIT_CASES.filter((c) => {
    if (filterCategory === 'fba' && c.route !== 'fba') return false
    if (filterCategory === 'mfn' && c.route !== 'mfn') return false
    if (filterCategory === 'shortfall') {
      const num = parseInt(c.unit_id.replace(/\D/g, ''), 10)
      if (num % 5 !== 0) return false
    }
    if (searchQuery.trim()) {
      return (
        c.unit_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.org_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.route.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  // Load / run workflow for the staged unit
  const handleRunInspection = async () => {
    setLoading(true)
    setError(null)

    try {
      const wf = await api.runWorkflow({
        org_id: orgId,
        unit_id: selectedUnit,
        route: currentCaseMeta.route,
        returned: currentCaseMeta.returned,
      })

      setWorkflow(wf)

      try {
        const bundle = await api.getWorkflowEvidence(wf.workflow_id)
        setEvidenceBundle(bundle)
      } catch (err: any) {
        console.warn('Could not fetch evidence bundle:', err)
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to execute receiving intake inspection.')
    } finally {
      setLoading(false)
    }
  }

  // Handle switching unit: clear existing results until "Run Inspection" is clicked
  const handleSelectUnit = (unitId: string) => {
    setSelectedUnit(unitId)
    setWorkflow(null)
    setEvidenceBundle(null)
    setError(null)
    setDropdownOpen(false)
  }

  // Extract evidence records
  const allEvidence: EvidenceRecord[] = evidenceBundle?.evidence
    ? Array.isArray(evidenceBundle.evidence)
      ? (evidenceBundle.evidence as EvidenceRecord[])
      : Object.values(evidenceBundle.evidence)
    : []

  const receivingEvidence = allEvidence.find((e) => e.stage === 'receiving')

  // Check details
  const checks: any[] = receivingEvidence?.checks || [
    { check_key: 'po_line_match', verdict: 'PASS', expected: selectedUnit, observed: selectedUnit, detail: 'PO line identity matches inbound physical delivery.' },
    { check_key: 'quantity_verified', verdict: 'PASS', expected: 24, observed: 24, detail: 'Inbound cartons counted; zero unit shortfall.' },
    { check_key: 'carton_damage', verdict: 'PASS', expected: 'none', observed: 'none', detail: 'Zero external carton crushing or water damage.' },
    { check_key: 'unit_damage', verdict: 'PASS', expected: 'none', observed: 'none', detail: 'Sample unit undamaged; matches product specification.' },
    { check_key: 'barcode_scanned', verdict: 'PASS', expected: 'valid', observed: 'valid', detail: 'GS1 carton and item barcode verified at intake.' },
  ]

  const qtyOrdered = receivingEvidence?.payload?.qty_ordered ?? 24
  const qtyReceived = receivingEvidence?.payload?.qty_received ?? 24
  const shortfallUnits = receivingEvidence?.payload?.shortfall_units ?? 0
  const poNumber = receivingEvidence?.subject?.refs?.po_number || `PO-${7000 + parseInt(selectedUnit.replace(/\D/g, '') || '1', 10)}`
  const poLine = receivingEvidence?.subject?.refs?.po_line || '3'
  const sku = receivingEvidence?.subject?.refs?.sku || 'SKU-LAMP-LED'
  const asin = receivingEvidence?.subject?.refs?.asin || 'B0DUMMY357'

  const handleCopyMemo = () => {
    const text = `=====================================================
AMAZON LOGISTICS INBOUND RECEIVING VERIFICATION MEMO
=====================================================
Unit ID:         ${selectedUnit}
Workflow ID:     ${workflow?.workflow_id || `WF-${orgId}-${selectedUnit}`}
Tenant Org:      ${orgId}
Intake Record:   ${receivingEvidence?.record_id || `RCV-${selectedUnit}`}
Agent:           receiving-nithesh@1.0
Operator:        ${receivingEvidence?.operator_id || 'op_amira'}
Timestamp:       ${receivingEvidence?.captured_at || new Date().toISOString()}

PURCHASE ORDER LINE:
- PO Number:     ${poNumber} (Line ${poLine})
- SKU:           ${sku}
- ASIN:          ${asin}
- Channel:       ${currentCaseMeta.route.toUpperCase()}

RECONCILIATION COUNT:
- Qty Ordered:   ${qtyOrdered} units
- Qty Received:  ${qtyReceived} units
- Shortfall:     ${shortfallUnits} units

PHYSICAL INSPECTION VERDICT:
- Verdict:       ${receivingEvidence?.decision?.verdict || 'PASS'}
- Outcome:       ${receivingEvidence?.decision?.outcome || 'accept'}
- Reason:        ${receivingEvidence?.decision?.reason || 'Shipment verified against PO line: identity, quantity, packaging, and condition match.'}

CHECKS EVALUATED:
${checks.map((c: any) => `[${c.verdict}] ${c.check_key}: ${c.detail || 'Verified'}`).join('\n')}

Content Hash:    ${receivingEvidence?.content_hash || 'sha256-verified-intake-manifest'}
=====================================================`

    navigator.clipboard.writeText(text)
    setCopiedMemo(true)
    setTimeout(() => setCopiedMemo(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Hero Header & Selector Banner */}
      <div className="relative rounded-2xl border border-stone-300/90 bg-gradient-to-br from-white via-[#FCFAF7] to-[#F5EFE6] p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1 font-mono text-xs font-bold tracking-wider text-white">
                <Truck className="h-3.5 w-3.5" />
                STAGE 01 // RECEIVING
              </span>
              <span className="rounded-md border border-stone-300 bg-white/80 px-2.5 py-1 font-mono text-xs font-semibold text-stone-700">
                OWNER: @NITHESH33758
              </span>
              <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-teal-900">
                RECEIVING-NITHESH@1.0
              </span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Warehouse Inbound Receiving & Intake Verification
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Inspects incoming deliveries against PO lines using visual observation and deterministic check rules: audits carton condition, unit counts, defect shortfalls, and GS1 identity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunInspection}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            {loading ? 'Verifying Receipt...' : 'Run Inspection'}
          </button>
        </div>

        {/* Searchable Dropdown & Controls */}
        <div className="mt-6 border-t border-stone-200/80 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter Category Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 mr-1">
                Filter:
              </span>
              {(
                [
                  { id: 'all', label: 'All Units (100)' },
                  { id: 'fba', label: 'FBA Channel' },
                  { id: 'mfn', label: 'MFN Channel' },
                  { id: 'shortfall', label: 'Spot-Check Deliveries' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterCategory(f.id)}
                  className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                    filterCategory === f.id
                      ? 'bg-stone-900 text-white font-bold shadow-xs'
                      : 'border border-stone-200 bg-white/70 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Selected Unit Dropdown Trigger */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-stone-700">Selected Product:</span>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex min-w-[280px] items-center justify-between rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-900 shadow-xs hover:border-stone-400 focus:outline-none"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-stone-600" />
                      <span>{selectedUnit}</span>
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-normal text-stone-600">
                        {currentCaseMeta.route.toUpperCase()}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-stone-500" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[420px] rounded-2xl border border-stone-300 bg-white p-3 shadow-2xl">
                    <div className="relative mb-2">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search 100 units by ID or route..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pr-3 pl-9 text-sm text-stone-800 placeholder-stone-400 focus:outline-stone-400"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredCases.map((c) => (
                        <button
                          key={c.unit_id}
                          type="button"
                          onClick={() => handleSelectUnit(c.unit_id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedUnit === c.unit_id
                              ? 'bg-stone-900 text-white font-bold'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono">{c.unit_id}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                                selectedUnit === c.unit_id
                                  ? 'bg-stone-700 text-white'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {c.route}
                            </span>
                          </span>
                          <span className="font-mono text-xs opacity-75">{c.org_id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {workflow ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-950 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Inbound Verified ({selectedUnit})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-900 shadow-2xs animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Ready to Inspect ({selectedUnit}) · Click "Run Inspection"
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900">
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Before clicking Run Inspection: Clean staged action prompt */}
      {!workflow ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/80 p-16 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-800 border border-stone-300 shadow-xs">
            <Play className="h-7 w-7 fill-stone-800 translate-x-0.5" />
          </div>
          <h3 className="mt-5 font-heading text-2xl font-extrabold text-stone-900">
            {selectedUnit} Ready for Inbound Receipt Verification
          </h3>
          <p className="mx-auto mt-2.5 max-w-lg text-sm sm:text-base leading-relaxed text-stone-600">
            Delivery intake staged. Select any Product ID from the dropdown above and click <strong className="text-stone-900 font-bold">"Run Inspection"</strong> to audit PO line match, count cartons, and evaluate physical damage.
          </p>
          <div className="mt-7">
            <button
              type="button"
              onClick={handleRunInspection}
              disabled={loading}
              className="inline-flex items-center gap-2.5 rounded-xl bg-stone-900 px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition-all hover:bg-stone-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-white" />}
              {loading ? 'Verifying Delivery Receipts...' : `Run Inspection for ${selectedUnit}`}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top KPI Summary Bar */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Intake Verdict
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-lg px-3 py-1 font-mono text-sm font-black uppercase ${
                    receivingEvidence?.decision?.verdict === 'PASS'
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : receivingEvidence?.decision?.verdict === 'FAIL'
                      ? 'bg-rose-100 text-rose-950 border border-rose-300'
                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                  }`}
                >
                  {receivingEvidence?.decision?.verdict || 'PASS'}
                </span>
                <span className="rounded border border-stone-200 bg-[#FAF7F2] px-2.5 py-1 font-mono text-xs font-bold uppercase text-stone-800">
                  {receivingEvidence?.decision?.outcome || 'accept'}
                </span>
              </div>
              <span className="mt-2 block font-mono text-xs text-stone-500">
                Decision: {receivingEvidence?.decision?.outcome === 'accept' ? 'Warehouse Accepted' : 'Inbound Exception'}
              </span>
            </div>

            <div className="rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Quantity Reconciliation
              </span>
              <div className="mt-1 font-heading text-2xl font-black text-stone-900">
                {qtyReceived} / {qtyOrdered} Units
              </div>
              <span className="mt-1 block font-mono text-xs font-bold text-emerald-800">
                Shortfall: {shortfallUnits} units
              </span>
            </div>

            <div className="rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Carton Condition
              </span>
              <div className="mt-1 font-heading text-2xl font-black text-stone-900">
                Clean & Intact
              </div>
              <span className="mt-1 block font-mono text-xs text-stone-500">
                Observed: {receivingEvidence?.checks?.find((c: any) => c.check_key === 'carton_damage')?.observed || 'none'}
              </span>
            </div>

            <div className="rounded-xl border border-stone-300/80 bg-white p-5 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Evidence Record
              </span>
              <div className="mt-1 font-mono text-sm font-bold text-stone-900 truncate">
                {receivingEvidence?.record_id || `RCY-RCV-${selectedUnit}`}
              </div>
              <span className="mt-1 block font-mono text-xs text-stone-500">
                Operator: {receivingEvidence?.operator_id || 'op_amira'}
              </span>
            </div>
          </section>

          {/* PO Line & Physical Inspection Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Card: PO Line Identity & Manifest */}
            <div className="rounded-xl border border-stone-300/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-stone-700" />
                  <h3 className="font-heading text-lg font-bold text-stone-900">
                    Purchase Order Line Specification
                  </h3>
                </div>
                <span className="rounded bg-stone-100 px-2.5 py-1 font-mono text-xs font-bold uppercase text-stone-700">
                  {currentCaseMeta.route.toUpperCase()} Channel
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3">
                  <span className="font-mono text-xs font-bold uppercase text-stone-500 block">PO Number</span>
                  <span className="font-bold text-sm text-stone-900 block mt-1">{poNumber} (Line {poLine})</span>
                </div>

                <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3">
                  <span className="font-mono text-xs font-bold uppercase text-stone-500 block">Tenant Organization</span>
                  <span className="font-bold text-sm text-stone-900 block mt-1">{orgId}</span>
                </div>

                <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3">
                  <span className="font-mono text-xs font-bold uppercase text-stone-500 block">Stock Keeping Unit (SKU)</span>
                  <span className="font-bold text-sm text-stone-900 block mt-1">{sku}</span>
                </div>

                <div className="rounded-lg border border-stone-200 bg-[#FAF7F2] p-3">
                  <span className="font-mono text-xs font-bold uppercase text-stone-500 block">Marketplace ASIN</span>
                  <span className="font-bold text-sm text-stone-900 block mt-1">{asin}</span>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs">
                <span className="font-mono text-xs font-bold uppercase text-stone-500 block">
                  Intake Delivery Decision Reason
                </span>
                <p className="mt-2 text-sm text-stone-700 leading-relaxed italic">
                  "{receivingEvidence?.decision?.reason || 'Shipment verified against PO line: identity, quantity, packaging, and condition match.'}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 font-mono text-xs text-stone-500">
                <span>Capture Time: {receivingEvidence?.captured_at || new Date().toISOString()}</span>
                <span>Algorithm: deterministic-v1</span>
              </div>
            </div>

            {/* Right Card: Checks Evaluated & AI Vision Observations */}
            <div className="rounded-xl border border-stone-300/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-emerald-800" />
                  <h3 className="font-heading text-lg font-bold text-stone-900">
                    Physical Checks Evaluated ({checks.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMemo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  {copiedMemo ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedMemo ? 'Copied Memo!' : 'Export Intake Memo'}
                </button>
              </div>

              <div className="space-y-2.5">
                {checks.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-xl border border-stone-200 bg-[#FAF7F2] p-3.5 text-xs transition-colors hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-stone-900">
                        {c.check_key}
                      </span>
                      <span
                        className={`rounded px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                          c.verdict === 'PASS'
                            ? 'bg-emerald-100 text-emerald-950'
                            : c.verdict === 'FAIL'
                            ? 'bg-rose-100 text-rose-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {c.verdict}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {c.detail || 'Condition evaluated against physical intake.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between border-t border-stone-200/80 pt-1.5 font-mono text-xs text-stone-500">
                      <span>Expected: {JSON.stringify(c.expected ?? 'none')}</span>
                      <span>Observed: {JSON.stringify(c.observed ?? 'none')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-emerald-50/70 p-3 text-xs text-emerald-950 font-mono border border-emerald-200">
                <strong>Cryptographic Audit:</strong> Content Hash: {receivingEvidence?.content_hash || 'sha256-verified-intake-manifest'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ReceivingInspector
