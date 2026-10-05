import React from 'react'
import { Users, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { HealthResponse } from '../types'

interface HeaderProps {
  health: HealthResponse | null
  healthLoading: boolean
  onOpenRoster: () => void
}

export const Header: React.FC<HeaderProps> = ({ health, healthLoading, onOpenRoster }) => {
  const isHealthy = health?.status === 'ok'
  const isDegraded = health?.status === 'degraded'

  return (
    <header className="header-container glass-panel">
      <div className="header-left">
        <div className="brand-badge">
          <span className="pod-tag">POD 05</span>
          <span className="brand-dot"></span>
          <span className="round-tag">CUBE Round 3</span>
        </div>
        <div className="title-group">
          <h1 className="header-title">Unified Autonomous Fulfillment & Returns Pipeline</h1>
          <p className="header-subtitle">
            Station 1: Receiving · Station 2: Prep · Station 3: Pack · Station 4: Returns · Station 5: Recovery
          </p>
        </div>
      </div>

      <div className="header-right">
        {/* Roster Modal Trigger */}
        <button
          onClick={onOpenRoster}
          className="header-btn roster-btn"
          title="View Pod 05 Team Roster & Station Ownership"
        >
          <Users size={16} />
          <span>Pod Roster</span>
          <span className="role-pill">5 Stations</span>
        </button>

        {/* GitHub Pod Repo Link */}
        <a
          href="https://github.com/upeshchowdary/cube-round3-pod"
          target="_blank"
          rel="noopener noreferrer"
          className="header-btn github-btn"
          title="GitHub Repository (Pod 05)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>cube-round3-pod</span>
        </a>

        {/* Orchestrator Health Status */}
        <div className={`health-status-badge ${isHealthy ? 'status-ok' : isDegraded ? 'status-degraded' : 'status-down'}`}>
          <div className="status-indicator">
            {healthLoading ? (
              <span className="ping-dot pulse-anim"></span>
            ) : isHealthy ? (
              <CheckCircle2 size={15} className="status-icon" />
            ) : isDegraded ? (
              <AlertTriangle size={15} className="status-icon" />
            ) : (
              <XCircle size={15} className="status-icon" />
            )}
          </div>
          <div className="health-text">
            <span className="health-label">Orchestrator :8100</span>
            <span className="health-val">
              {healthLoading ? 'Polling...' : isHealthy ? 'OPERATIONAL' : isDegraded ? 'DEGRADED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
