import React, { useEffect, useState } from 'react'
import { api, ApiError } from '@/services/api'
import type { HealthResponse } from '@/types/workflow'
import type { AgentStage } from '@/data/agentsData'

export type PageId = 'home' | 'analyze' | 'agents' | `agent-${AgentStage}`

interface NavbarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'degraded' | 'offline' | 'error'>('checking')
  const [flowId, setFlowId] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      const data: HealthResponse = await api.getHealth()
      setHealthStatus(data.status === 'ok' ? 'ok' : 'degraded')
      setFlowId(data.flow || null)
    } catch (err) {
      setFlowId(null)
      setHealthStatus(err instanceof ApiError && err.status === 0 ? 'offline' : 'error')
    }
  }

  useEffect(() => {
    let intervalId: any = null

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      } else {
        fetchHealth()
        if (!intervalId) {
          intervalId = setInterval(fetchHealth, 20000)
        }
      }
    }

    fetchHealth()
    intervalId = setInterval(fetchHealth, 20000)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <header className="shell-chrome sticky top-0 z-30 shrink-0 border-b border-stone-300/70">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            aria-label="CUBE home"
            onClick={() => onNavigate('home')}
            className="cursor-pointer rounded-sm font-heading text-xl font-bold tracking-[0.12em] text-stone-950 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:text-2xl"
          >
            CUBE
          </button>
          <span aria-hidden="true" className="h-8 w-px bg-stone-400/60" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="w-fit rounded-full border border-teal-800/20 bg-teal-50/70 px-2 py-0.5 font-mono text-[8px] font-bold tracking-[0.14em] text-teal-900 sm:text-[9px]">
              <span className="sm:hidden">SPECIALIST</span>
              <span className="hidden sm:inline">SPECIALIST POD</span>
            </span>
            <span className="hidden font-mono text-[9px] tracking-[0.12em] text-stone-600 xl:block">
              COMMERCE ORCHESTRATION
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4 lg:gap-6">
          <nav aria-label="Main navigation" className="flex items-center gap-0.5 rounded-full border border-stone-300/70 bg-white/35 p-1 font-sans text-[10px] font-semibold sm:gap-1 sm:text-xs">
            <button
              type="button"
              aria-current={currentPage === 'home' ? 'page' : undefined}
              onClick={() => onNavigate('home')}
              className={`cursor-pointer rounded-full px-1.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 sm:px-3 ${
                currentPage === 'home'
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-white/65 hover:text-stone-950'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              aria-current={currentPage === 'analyze' ? 'page' : undefined}
              onClick={() => onNavigate('analyze')}
              className={`cursor-pointer rounded-full px-1.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 sm:px-3 ${
                currentPage === 'analyze'
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-white/65 hover:text-stone-950'
              }`}
            >
              Orchestrator
            </button>
            <button
              type="button"
              aria-current={currentPage === 'agents' || currentPage.startsWith('agent-') ? 'page' : undefined}
              onClick={() => onNavigate('agents')}
              className={`cursor-pointer rounded-full px-1.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 sm:px-3 ${
                currentPage === 'agents' || currentPage.startsWith('agent-')
                  ? 'bg-stone-950 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-white/65 hover:text-stone-950'
              }`}
            >
              Agents
            </button>
          </nav>

          <div className="hidden items-center gap-2.5 border-l border-stone-400/50 pl-3 font-mono text-[9px] text-stone-700 lg:flex">
            {flowId && healthStatus !== 'offline' && healthStatus !== 'error' && (
              <span className="text-stone-600">{flowId}</span>
            )}
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ring-2 ring-white/50 ${
                healthStatus === 'ok'
                  ? 'bg-teal-600 animate-pulse'
                  : healthStatus === 'degraded'
                    ? 'bg-amber-500'
                    : healthStatus === 'checking'
                      ? 'bg-stone-400'
                      : 'bg-rose-500'
              }`}
            />
            <span aria-live="polite" className="whitespace-nowrap tracking-[0.08em]">
              {healthStatus === 'offline'
                ? 'API OFFLINE'
                : healthStatus === 'error'
                  ? 'API ERROR'
                  : healthStatus === 'degraded'
                    ? 'ORCHESTRATOR DEGRADED'
                    : healthStatus === 'checking'
                      ? 'CHECKING API'
                      : 'ORCHESTRATOR ONLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
