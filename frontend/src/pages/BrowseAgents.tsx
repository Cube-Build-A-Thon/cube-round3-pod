import React, { useEffect, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Box,
  ClipboardCheck,
  RefreshCw,
  RotateCcw,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { api } from '@/services/api'
import { POD_AGENTS, type PodAgentMeta } from '@/data/agentsData'
import type { PageId } from '@/components/layout/Navbar'
import type { HealthResponse } from '@/types/workflow'

interface BrowseAgentsProps {
  onNavigate: (page: PageId) => void
}

interface AgentCardProps {
  number: string
  title: string
  type: string
  summary: string
  status: string
  action: string
  icon: LucideIcon
  onClick: () => void
}

const stageIcons: Record<PodAgentMeta['stage'], LucideIcon> = {
  receiving: Truck,
  prep: ClipboardCheck,
  pack: Box,
  returns: RotateCcw,
  recovery: BadgeCheck,
}

const AgentCard: React.FC<AgentCardProps> = ({
  number,
  title,
  type,
  summary,
  status,
  action,
  icon: Icon,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-56 flex-col rounded-xl border border-stone-300/90 bg-white/95 p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-700/50 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
  >
    <div className="flex w-full items-start justify-between gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-[#FAF7F2] text-teal-800 transition-colors group-hover:border-teal-200 group-hover:bg-teal-50">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-mono text-[10px] font-semibold tracking-widest text-stone-400">{number} / 05</span>
    </div>

    <div className="mt-5 flex-1">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800">{type}</div>
      <h2 className="mt-1 font-heading text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{summary}</p>
    </div>

    <div className="mt-5 flex w-full items-center justify-between border-t border-stone-200 pt-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">{status}</span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-800 transition-colors group-hover:text-teal-800">
        {action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </div>
  </button>
)

export const BrowseAgents: React.FC<BrowseAgentsProps> = ({ onNavigate }) => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthUnavailable, setHealthUnavailable] = useState(false)

  const fetchHealth = async () => {
    setHealthLoading(true)
    setHealthUnavailable(false)
    try {
      setHealthData(await api.getHealth())
    } catch {
      setHealthData(null)
      setHealthUnavailable(true)
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    void fetchHealth()
  }, [])

  const orchestratorStatus = healthUnavailable
    ? 'HEALTH CHECK ERROR'
    : healthData
      ? `HEALTH ${healthData.status.toUpperCase()}`
      : 'CHECKING HEALTH'

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-px w-6 bg-teal-700" />
          <span className="font-mono text-[10px] font-semibold tracking-wider text-teal-800">CUBE.POD // AGENT DIRECTORY</span>
          <span className="h-px flex-1 bg-stone-300" />
          <button
            type="button"
            onClick={() => void fetchHealth()}
            disabled={healthLoading}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-stone-600 transition-colors hover:text-teal-800 disabled:cursor-wait"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            REFRESH
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">AGENT DIRECTORY</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">Open the orchestrator to start an analysis, or choose a stage agent to see what it checks and when it runs.</p>
          </div>
          <div className="pb-1 font-mono text-[10px] uppercase tracking-wider text-stone-500">
            1 orchestrator · 4 stage agents · 1 specialist engineer
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AgentCard
          number="01"
          title="Pod Orchestrator"
          type="Workflow control"
          summary="Owns the workflow state, executes flow.specialist.json, and derives deterministic final outcomes under Decision D-007."
          status={orchestratorStatus}
          action="Analyze item"
          icon={Activity}
          onClick={() => onNavigate('analyze')}
        />

        {POD_AGENTS.map((agent, index) => {
          const stageHealth = healthData?.agents?.[agent.stage]
          const status = stageHealth
            ? `HEALTH ${stageHealth.status.toUpperCase()}`
            : healthUnavailable
              ? 'HEALTH UNKNOWN'
              : 'CHECKING HEALTH'
          const Icon = stageIcons[agent.stage]

          return (
            <AgentCard
              key={agent.stage}
              number={String(index + 2).padStart(2, '0')}
              title={agent.name}
              type={`Stage ${String(index + 1).padStart(2, '0')} · ${agent.stage}`}
              summary={agent.summary}
              status={status}
              action="View details"
              icon={Icon}
              onClick={() => onNavigate(`agent-${agent.stage}`)}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-stone-300/80 pt-4 font-mono text-[10px] uppercase tracking-wider text-stone-500">
        <ArrowDownRight className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
        Receiving and Recovery run for every workflow. Pack (MFN) and Returns (Returned) run when their routing rules match. In this Specialist Pod, Prep is omitted and inbound-defect charges are treated as silent.
      </div>
    </section>
  )
}

export default BrowseAgents
