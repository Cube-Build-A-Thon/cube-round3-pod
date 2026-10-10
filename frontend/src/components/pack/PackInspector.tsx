import React, { useRef, useState } from 'react'
import {
  Camera,
  Info,
  Loader2,
  Package,
  Plus,
  List,
  BarChart,
  Shield,
  XCircle,
  CheckCircle2,
} from 'lucide-react'
import { api } from '@/services/api'
import type {
  EvidenceBundle,
  WorkflowState,
} from '@/types/workflow'
import { PackReportView } from './PackReportView'

interface PackInspectorProps {
  onWorkflowComplete?: (workflow: WorkflowState) => void
  onNavigateToAgents?: () => void
}

const SAMPLE_UNITS = [
  'UNIT-0006',
  'UNIT-0008',
  'UNIT-0021',
  'UNIT-0027',
  'UNIT-0033',
  'UNIT-0054',
  'UNIT-0057',
  'UNIT-0072',
]

export const PackInspector: React.FC<PackInspectorProps> = ({
  onWorkflowComplete,
}) => {
  const [unitId, setUnitId] = useState<string>('')
  const [operatorId, setOperatorId] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleInspect = async () => {
    if (files.length === 0 && !unitId) {
      setAnalysisError('Please provide a Pack Unit ID or upload photos.')
      return
    }

    setAnalyzing(true)
    setAnalysisError(null)
    setBundle(null)

    try {
      const resultBundle = await api.inspectPackImage({
        files: files,
        file: files[0] || null,
        unit_id: unitId || 'UNIT-0014',
      })
      setBundle(resultBundle)
      if (onWorkflowComplete) {
        onWorkflowComplete(resultBundle.workflow)
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to inspect package.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setBundle(null)
    setFiles([])
    setUnitId('')
    setOperatorId('')
    setAnalysisError(null)
  }

  const packRecord = bundle
    ? Object.values(bundle.evidence).find((r: any) => r.stage === 'pack') || null
    : null

  return (
    <div className="relative flex flex-col md:flex-row gap-6 min-h-[700px] bg-[#FDFBF7] p-6 rounded-3xl overflow-hidden shadow-inner">
      {/* Left Panel */}
      <div className="w-full md:w-[450px] shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col h-full overflow-y-auto">
        {/* Sample Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-4 scrollbar-hide snap-x">
          <div className="snap-start shrink-0 w-40 border rounded-xl p-3 bg-stone-50">
            <div className="w-full h-24 bg-stone-200 rounded-lg mb-3 object-cover overflow-hidden flex items-center justify-center">
              <Package className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-xs font-semibold text-stone-800">Correct box</p>
            <p className="text-[10px] text-stone-500">UNIT-0008 • bravo</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-stone-400">expect</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-sm font-semibold">
                Seal
              </span>
            </div>
          </div>
          <div className="snap-start shrink-0 w-40 border rounded-xl p-3 bg-stone-50">
            <div className="w-full h-24 bg-stone-200 rounded-lg mb-3 object-cover overflow-hidden flex items-center justify-center">
              <Package className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-xs font-semibold text-stone-800">Bottle, no box</p>
            <p className="text-[10px] text-stone-500">UNIT-0008 • alpha</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-stone-400">expect</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-sm font-semibold">
                Seal
              </span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">
              Pack Unit ID
            </label>
            <input
              type="text"
              placeholder="e.g. UNIT-0008"
              className="border border-stone-200 rounded-xl px-3 py-2.5 w-full text-sm focus:ring-2 focus:ring-teal-700 focus:border-teal-700 outline-none transition-all"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">
              Operator
            </label>
            <input
              type="text"
              placeholder="op_name"
              className="border border-stone-200 rounded-xl px-3 py-2.5 w-full text-sm focus:ring-2 focus:ring-teal-700 focus:border-teal-700 outline-none transition-all"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
            />
          </div>
        </div>

        <p className="text-[10px] text-stone-400 mt-3 font-medium">
          Units are listed for the selected org only.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SAMPLE_UNITS.map((id) => (
            <button
              key={id}
              onClick={() => setUnitId(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                unitId === id
                  ? 'bg-teal-700 text-white'
                  : 'bg-[#FAF7F2] text-teal-800 hover:bg-stone-200'
              }`}
            >
              {id}
            </button>
          ))}
          <span className="text-[10px] text-stone-400 py-1 ml-1">
            +1 more in the list
          </span>
        </div>

        {/* Dropzone */}
        <div className="mt-8">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">
            Open-Box Photos
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-[#FAF7F2] cursor-pointer rounded-2xl p-8 flex flex-col items-center justify-center bg-white transition-all"
          >
            {files.length > 0 ? (
              <div className="text-center">
                <div className="bg-emerald-500 p-3 rounded-full text-white mb-3 shadow-sm inline-block">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="font-semibold text-stone-800 text-sm">
                  {files.length} photo(s) selected
                </p>
                <p className="text-[10px] text-stone-500 mt-1 truncate max-w-[200px]">
                  {files[0].name}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFiles([])
                  }}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Clear photos
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-[#FAF7F2] p-3 rounded-full text-white mb-3 shadow-sm inline-block">
                  <Camera className="w-5 h-5 text-teal-700" />
                </div>
                <p className="font-semibold text-stone-800 text-sm">
                  Drop photos or click to add
                </p>
                <p className="text-[10px] text-stone-500 mt-1">
                  JPEG • PNG • WebP — up to 10 photos, 20MB each
                </p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {analysisError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-start gap-2 text-sm">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{analysisError}</p>
          </div>
        )}

        {/* Inspect button */}
        <button
          onClick={handleInspect}
          disabled={analyzing}
          className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white rounded-xl py-3.5 mt-6 font-semibold flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          {analyzing ? 'Inspecting...' : 'Inspect package'}
        </button>

        <div className="flex gap-2.5 items-start mt-4 bg-[#FAF7F2] p-3.5 rounded-xl border border-teal-100/50">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-stone-500 leading-relaxed">
            All photos go to the vision model in{' '}
            <strong className="font-semibold text-stone-700">one call</strong>. If
            the model is down or slow, the record is still saved as{' '}
            <strong className="font-semibold text-stone-700">Pending review</strong>.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 h-full overflow-y-auto rounded-3xl bg-white shadow-sm border border-stone-100 p-6 flex flex-col">
        {bundle && packRecord ? (
          <PackReportView
            bundle={bundle}
            returnsRecord={packRecord}
            onReset={handleReset}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-[#FAF7F2] rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <Package className="w-10 h-10 text-teal-300" />
                <div className="absolute top-0 right-0 bg-teal-600 text-white rounded-full p-1 border-2 border-white">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-stone-800 tracking-tight">
              No inspection yet
            </h3>
            <p className="text-stone-500 mt-2 text-sm max-w-xs">
              The decision, each check and the evidence record appear here.
            </p>
          </div>
        )}
      </div>

      {/* Floating Navbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-800/95 backdrop-blur-sm text-stone-300 rounded-full p-1.5 flex items-center gap-1 shadow-xl border border-stone-700/50">
        <button className="flex items-center gap-2 text-white bg-stone-700/80 px-4 py-2 rounded-full text-xs font-semibold transition-colors">
          <Camera className="w-3.5 h-3.5" />
          Inspect
        </button>
        <button className="flex items-center gap-2 hover:text-white px-4 py-2 rounded-full text-xs font-medium transition-colors">
          <List className="w-3.5 h-3.5" />
          Records
        </button>
        <button className="flex items-center gap-2 hover:text-white px-4 py-2 rounded-full text-xs font-medium transition-colors">
          <BarChart className="w-3.5 h-3.5" />
          Evaluation
        </button>
        <button className="flex items-center gap-2 hover:text-white px-4 py-2 rounded-full text-xs font-medium transition-colors">
          <Shield className="w-3.5 h-3.5" />
          Policy
        </button>
        <div className="w-px h-4 bg-stone-700 mx-1"></div>
        <button
          onClick={handleReset}
          className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold transition-colors ml-1 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New inspection
        </button>
      </div>
    </div>
  )
}

export default PackInspector
