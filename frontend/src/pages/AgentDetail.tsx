import React from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  GitBranch,
  ListChecks,
  PackageCheck,
  UserRound,
} from 'lucide-react'
import { POD_AGENTS, type AgentStage } from '@/data/agentsData'
import type { PageId } from '@/components/layout/Navbar'
import type { WorkflowState } from '@/types/workflow'
import { ReturnsInspector } from '@/components/returns/ReturnsInspector'
import { RecoveryInspector } from '@/components/recovery/RecoveryInspector'
import { ReceivingInspector } from '@/components/receiving/ReceivingInspector'
import { PackInspector } from '@/components/pack/PackInspector'

interface AgentDetailProps {
  stage: AgentStage
  onNavigate: (page: PageId) => void
  onWorkflowComplete: (workflow: WorkflowState) => void
}

const DetailSection: React.FC<{
  icon: React.ElementType
  title: string
  children: React.ReactNode
}> = ({ icon: Icon, title, children }) => (
  <section className="rounded-xl border border-stone-300/90 bg-white/95 p-5 shadow-sm">
    <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
      <Icon className="h-4 w-4 text-teal-800" aria-hidden="true" />
      {title}
    </h2>
    <div className="mt-4 text-sm leading-relaxed text-stone-600">{children}</div>
  </section>
)

export const AgentDetail: React.FC<AgentDetailProps> = ({ stage, onNavigate, onWorkflowComplete: _onWorkflowComplete }) => {
  const index = POD_AGENTS.findIndex((item) => item.stage === stage)
  const agent = POD_AGENTS[index]

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl py-10 text-center">
        <h1 className="font-heading text-2xl font-semibold text-stone-900">Agent not found</h1>
          <button type="button" onClick={() => onNavigate('agents')} className="mt-4 rounded-sm text-sm font-semibold text-teal-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
          Return to agents
        </button>
      </div>
    )
  }

  const previousAgent = index > 0 ? POD_AGENTS[index - 1] : null
  const nextAgent = index < POD_AGENTS.length - 1 ? POD_AGENTS[index + 1] : null
  const ownerIsSet = agent.owner.startsWith('@') && !agent.owner.includes('github-handle')

  if (stage === 'receiving') {
    return (
      <article className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-2 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All agents
          </button>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            STAGE {String(index + 1).padStart(2, '0')} / {String(POD_AGENTS.length).padStart(2, '0')}
          </span>
        </div>

        <ReceivingInspector
          onNavigateToAgents={() => onNavigate('agents')}
        />

        <nav aria-label="Agent stage navigation" className="flex items-center justify-between border-t border-stone-300/80 pt-4">
          {previousAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${previousAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-left text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Previous stage</span><span className="font-semibold">{previousAgent.name}</span></span>
            </button>
          ) : <span />}
          {nextAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${nextAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-right text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Next stage</span><span className="font-semibold">{nextAgent.name}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ) : <span />}
        </nav>
      </article>
    )
  }

  if (stage === 'pack') {
    return (
      <article className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-2 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All agents
          </button>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            STAGE {String(index + 1).padStart(2, '0')} / {String(POD_AGENTS.length).padStart(2, '0')}
          </span>
        </div>

        <PackInspector
          onNavigateToAgents={() => onNavigate('agents')}
        />

        <nav aria-label="Agent stage navigation" className="flex items-center justify-between border-t border-stone-300/80 pt-4">
          {previousAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${previousAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-left text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Previous stage</span><span className="font-semibold">{previousAgent.name}</span></span>
            </button>
          ) : <span />}
          {nextAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${nextAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-right text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Next stage</span><span className="font-semibold">{nextAgent.name}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ) : <span />}
        </nav>
      </article>
    )
  }

  if (stage === 'recovery') {
    return (
      <article className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-2 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All agents
          </button>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            STAGE {String(index + 1).padStart(2, '0')} / {String(POD_AGENTS.length).padStart(2, '0')}
          </span>
        </div>

        <RecoveryInspector
          onNavigateToAgents={() => onNavigate('agents')}
        />

        <nav aria-label="Agent stage navigation" className="flex items-center justify-between border-t border-stone-300/80 pt-4">
          {previousAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${previousAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-left text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Previous stage</span><span className="font-semibold">{previousAgent.name}</span></span>
            </button>
          ) : <span />}
          {nextAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${nextAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-right text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Next stage</span><span className="font-semibold">{nextAgent.name}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ) : <span />}
        </nav>
      </article>
    )
  }

  if (stage === 'returns') {
    return (
      <article className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-2 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All agents
          </button>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            STAGE {String(index + 1).padStart(2, '0')} / {String(POD_AGENTS.length).padStart(2, '0')}
          </span>
        </div>

        <ReturnsInspector onNavigateToAgents={() => onNavigate('agents')} />

        <nav aria-label="Agent stage navigation" className="flex items-center justify-between border-t border-stone-300/80 pt-4">
          {previousAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${previousAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-left text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Previous stage</span><span className="font-semibold">{previousAgent.name}</span></span>
            </button>
          ) : <span />}
          {nextAgent ? (
            <button type="button" onClick={() => onNavigate(`agent-${nextAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-right text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
              <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Next stage</span><span className="font-semibold">{nextAgent.name}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ) : <span />}
        </nav>
      </article>
    )
  }

  return (
    <article className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('agents')}
          className="inline-flex items-center gap-2 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All agents
        </button>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          STAGE {String(index + 1).padStart(2, '0')} / {String(POD_AGENTS.length).padStart(2, '0')}
        </span>
      </div>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-6 bg-teal-700" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-teal-800">CUBE.AGENT // {agent.stage}</span>
          <span className="h-px flex-1 bg-stone-300" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">Agent details</span>
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">{agent.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">{agent.summary}</p>
            <p className="mt-2 font-mono text-[11px] text-stone-500">{agent.role}</p>
          </div>
          <div className="shrink-0 rounded border border-stone-300 bg-white/75 px-3 py-2">
            <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-stone-400">Implementation</span>
            <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase text-stone-800">{agent.implementation}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-stone-300/80 bg-white/75 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">Agent ID</span>
          <div className="mt-1 break-all font-mono text-xs font-semibold text-stone-900">{agent.agent_id}</div>
        </div>
        <div className="rounded-lg border border-stone-300/80 bg-white/75 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">Owner</span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-900">
            <UserRound className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />
            {ownerIsSet ? agent.owner : 'Not set'}
          </div>
        </div>
        <div className="rounded-lg border border-stone-300/80 bg-white/75 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">Execution mode</span>
          <div className="mt-1 text-xs font-semibold text-stone-900">{agent.mode === 'inproc' ? 'In-process' : 'HTTP service'}{agent.stage === 'pack' ? ' · no separate service' : ''}</div>
        </div>
        <div className="rounded-lg border border-stone-300/80 bg-white/75 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">Module</span>
          <div className="mt-1 break-all font-mono text-xs font-semibold text-stone-900">{agent.module}</div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection icon={GitBranch} title="When it runs">
          <p className="rounded-md border border-stone-200 bg-[#FAF7F2] px-3 py-2 font-mono text-xs text-stone-800">{agent.routingCondition}</p>
          <p className="mt-3"><strong className="text-stone-800">Inputs:</strong> {agent.readsInputs}</p>
          <p className="mt-2"><strong className="text-stone-800">Earlier evidence:</strong> {agent.readsPreviousEvidence}</p>
        </DetailSection>

        <DetailSection icon={Boxes} title="What it produces">
          <p>{agent.produces}</p>
          <p className="mt-3"><strong className="text-stone-800">Pod note:</strong> {agent.podNotes}</p>
        </DetailSection>

        <DetailSection icon={ListChecks} title="Checks evaluated">
          <ul className="flex flex-wrap gap-2">
            {agent.recommendedChecks.map((check) => (
              <li key={check} className="rounded border border-stone-300 bg-[#FAF7F2] px-2 py-1 font-mono text-[11px] text-stone-700">{check}</li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection icon={PackageCheck} title="Outcome labels">
          <ul className="flex flex-wrap gap-2">
            {agent.outcomes.map((outcome) => (
              <li key={outcome} className="rounded border border-teal-200 bg-teal-50 px-2 py-1 font-mono text-[11px] font-semibold text-teal-900">{outcome}</li>
            ))}
          </ul>
        </DetailSection>
      </div>

      <nav aria-label="Agent stage navigation" className="flex items-center justify-between border-t border-stone-300/80 pt-4">
        {previousAgent ? (
          <button type="button" onClick={() => onNavigate(`agent-${previousAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-left text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Previous stage</span><span className="font-semibold">{previousAgent.name}</span></span>
          </button>
        ) : <span />}
        {nextAgent ? (
          <button type="button" onClick={() => onNavigate(`agent-${nextAgent.stage}`)} className="group flex max-w-[45%] items-center gap-2 rounded-sm text-right text-sm text-stone-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
            <span><span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">Next stage</span><span className="font-semibold">{nextAgent.name}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        ) : <span />}
      </nav>
    </article>
  )
}

export default AgentDetail
