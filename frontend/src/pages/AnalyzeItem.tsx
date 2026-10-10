import React, { useState } from 'react'
import { api, ApiError } from '@/services/api'
import type { WorkflowState } from '@/types/workflow'
import { SAMPLE_UNITS, type SampleUnit } from '@/data/sampleUnits'
import { Loader2, Play, Info, AlertCircle } from 'lucide-react'

interface AnalyzeItemProps {
  onWorkflowComplete: (wf: WorkflowState) => void
}

const DEFAULT_ORG_ID = 'org_demo_alpha'
const DEFAULT_UNIT_ID = 'UNIT-0014'

export const AnalyzeItem: React.FC<AnalyzeItemProps> = ({ onWorkflowComplete }) => {
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID)
  const [unitId, setUnitId] = useState<string>(DEFAULT_UNIT_ID)
  const [route, setRoute] = useState<string>('auto')
  const [returned, setReturned] = useState<string>('auto')

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<{ title: string; message: string; isNetwork?: boolean } | null>(null)
  const selectedSample = SAMPLE_UNITS.find((sample) =>
    sample.org_id === orgId &&
    sample.unit_id === unitId &&
    (route === 'auto' || sample.route === route) &&
    (returned === 'auto' || String(sample.returned) === returned)
  )

  const handleSelectPreset = (sample: SampleUnit) => {
    setOrgId(sample.org_id)
    setUnitId(sample.unit_id)
    setRoute(sample.route)
    setReturned(String(sample.returned))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!orgId.trim()) {
      setError({ title: 'Organization ID required', message: 'Enter an organization ID to run this workflow.' })
      return
    }

    if (!unitId.trim()) {
      setError({ title: 'Unit ID required', message: 'Enter a unit ID to run this workflow.' })
      return
    }

    setLoading(true)

    try {
      const payloadRoute = route === 'auto' ? undefined : route
      const payloadReturned =
        returned === 'auto'
          ? undefined
          : returned === 'true'
          ? true
          : false

      // POST /workflows executes synchronously on the backend
      const result = await api.runWorkflow({
        org_id: orgId.trim(),
        unit_id: unitId.trim(),
        route: payloadRoute,
        returned: payloadReturned,
      })

      // Take user directly to the result for that workflow
      onWorkflowComplete(result)
    } catch (err: any) {
      if (err instanceof ApiError) {
        const isNetwork = err.status === 0
        setError({
          title: isNetwork ? 'Workflow API unavailable' : `Workflow API error (${err.status})`,
          message: err.detail || err.message,
          isNetwork,
        })
      } else {
        setError({
          title: 'Execution Error',
          message: err.message || 'An unexpected error occurred while communicating with the backend.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 opacity-80">
          <div className="w-6 h-px bg-teal-700"></div>
          <span className="text-teal-800 text-[10px] font-mono tracking-wider font-semibold">
            CUBE.ENDPOINT // POST /workflows
          </span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            ANALYZE AN ITEM
          </h1>
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            RUNS ON SUBMIT
          </span>
        </div>
      </div>

      {/* Current backend data scope */}
      <div className="rounded-lg border border-sky-200 bg-sky-50/85 px-4 py-3 text-xs text-sky-950">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-sky-950">
              Data scope
            </div>
            <p className="leading-relaxed text-sky-900">
              The API evaluates registered unit IDs against synthetic data and pre-recorded captures; it does not accept photo uploads. Sample buttons prefill a known case. Route and Return Event can stay on Auto or be set manually.
            </p>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50/90 p-4 text-sm text-rose-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider">{error.title}</span>
              <p className="leading-relaxed text-rose-900">{error.message}</p>
              {error.isNetwork && (
                <div className="mt-1 text-[11px] text-rose-800">
                  Start the API from the repository root: <code className="font-semibold bg-rose-100 px-1 rounded">uvicorn orchestration.api:app --port 8100</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Preset Selector */}
      <div className="rounded-xl border border-stone-300/80 bg-white/90 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-stone-800">Try a sample unit</span>
          <span className="text-stone-500">Select one to fill the form</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_UNITS.map((s) => {
            const isSelected = unitId === s.unit_id && orgId === s.org_id
            return (
              <button
                key={s.unit_id}
                type="button"
                onClick={() => handleSelectPreset(s)}
                aria-pressed={isSelected}
                aria-label={`${s.unit_id}, ${s.route.toUpperCase()} route${s.returned ? ', returned' : ''}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-stone-50 font-bold shadow-xs'
                    : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                <span>{s.unit_id}</span>
                <span className="text-stone-400">·</span>
                <span className="text-[10px] uppercase opacity-80">{s.route}</span>
                {s.returned && (
                  <span className={`rounded px-1 py-0.5 text-[9px] font-bold ${isSelected ? 'bg-rose-200 text-rose-900' : 'bg-rose-100 text-rose-800'}`}>
                    RETURNED
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {selectedSample && (
          <p aria-live="polite" className="border-t border-stone-200 pt-2 text-xs leading-relaxed text-stone-600">
            {selectedSample.description}
          </p>
        )}
      </div>

      {/* Main Parameters Form */}
      <div className="rounded-xl border border-stone-300/90 bg-white/95 p-6 shadow-sm relative">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Org ID */}
            <div className="space-y-1.5">
              <label htmlFor="org_id" className="text-xs font-mono font-bold uppercase text-stone-800 block">
                Organization ID (<span className="text-teal-700 font-semibold">org_id</span>) *
              </label>
              <input
                id="org_id"
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="e.g. org_demo_alpha"
                disabled={loading}
                required
                autoComplete="off"
                spellCheck={false}
                className="w-full h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-mono text-stone-900 transition focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15 disabled:bg-stone-100"
              />
              <p className="text-[10px] text-stone-500">
                Sample cases use org_demo_alpha or org_demo_bravo.
              </p>
            </div>

            {/* Unit ID */}
            <div className="space-y-1.5">
              <label htmlFor="unit_id" className="text-xs font-mono font-bold uppercase text-stone-800 block">
                Unit / Subject ID (<span className="text-teal-700 font-semibold">unit_id</span>) *
              </label>
              <input
                id="unit_id"
                type="text"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="e.g. UNIT-0014"
                disabled={loading}
                required
                autoComplete="off"
                spellCheck={false}
                className="w-full h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-mono text-stone-900 transition focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15 disabled:bg-stone-100"
              />
              <p className="text-[10px] font-mono text-stone-500">
                Enter the registered unit you want the Pod to evaluate.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 pt-3 border-t border-stone-200">
            {/* Fulfillment Route */}
            <div className="space-y-1.5">
              <label htmlFor="route" className="text-xs font-mono font-bold uppercase text-stone-800 block">
                Fulfillment Route (<span className="text-teal-700 font-semibold">route</span>)
              </label>
              <select
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                disabled={loading}
                className="w-full h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-mono text-stone-900 transition focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15 cursor-pointer"
              >
                <option value="auto">Auto · use case data</option>
                <option value="fba">FBA · Amazon Fulfillment (omits Prep)</option>
                <option value="mfn">MFN · Merchant Fulfillment (runs Pack)</option>
                <option value="unknown">UNKNOWN — Route Unspecified</option>
              </select>
              <p className="text-[10px] font-mono text-stone-500">
                In this Specialist Pod: FBA units omit Prep; MFN units run Pack.
              </p>
            </div>

            {/* Return status */}
            <div className="space-y-1.5">
              <label htmlFor="returned" className="text-xs font-mono font-bold uppercase text-stone-800 block">
                Return Event (<span className="text-teal-700 font-semibold">returned</span>)
              </label>
              <select
                id="returned"
                value={returned}
                onChange={(e) => setReturned(e.target.value)}
                disabled={loading}
                className="w-full h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-mono text-stone-900 transition focus:outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-800/15 cursor-pointer"
              >
                <option value="auto">Auto · use case data</option>
                <option value="false">No · skip Returns</option>
                <option value="true">Yes · run Returns</option>
              </select>
              <p className="text-[10px] font-mono text-stone-500">
                A return event adds the Returns stage to the workflow.
              </p>
            </div>
          </div>

          {/* Synchronous Loading State */}
          {loading && (
            <div role="status" aria-live="polite" className="rounded-lg border border-teal-300 bg-teal-50/85 p-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-950 uppercase tracking-wider">
                <Loader2 className="h-4 w-4 animate-spin spinner-spin text-teal-700" />
                Running workflow
              </div>
              <p className="text-[11px] text-teal-900/80">
                The API is evaluating the applicable stages. The report will open when it finishes.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => {
                setOrgId(DEFAULT_ORG_ID)
                setUnitId(DEFAULT_UNIT_ID)
                setRoute('auto')
                setReturned('auto')
                setError(null)
              }}
              disabled={loading}
              className="px-4 py-2 text-xs font-mono border border-stone-300 rounded hover:bg-stone-100 text-stone-700 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset form
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-stone-900 text-stone-50 font-mono text-xs font-bold uppercase tracking-wider border border-stone-900 hover:bg-teal-800 hover:border-teal-800 transition-colors cursor-pointer flex items-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin spinner-spin" />
                  EVALUATING...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  RUN WORKFLOW
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AnalyzeItem
