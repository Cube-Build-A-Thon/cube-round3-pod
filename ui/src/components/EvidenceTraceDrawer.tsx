import React, { useState } from 'react'
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
} from 'lucide-react'
import type { EvidenceRecord, WorkflowState } from '../types'

interface EvidenceTraceDrawerProps {
  workflow: WorkflowState | null
  evidenceMap: Record<string, EvidenceRecord>
}

export const EvidenceTraceDrawer: React.FC<EvidenceTraceDrawerProps> = ({ workflow, evidenceMap }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'records' | 'transitions' | 'overrides' | 'raw'>('records')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [copiedRaw, setCopiedRaw] = useState(false)

  if (!workflow) return null

  const evidenceRecords = Object.values(evidenceMap)
  const transitions = workflow.transitions || []
  const overrides = workflow.overrides || []

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const handleCopyBundle = () => {
    const bundle = { workflow, evidence: evidenceMap }
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))
    setCopiedRaw(true)
    setTimeout(() => setCopiedRaw(false), 2000)
  }

  return (
    <section className="evidence-drawer-container glass-panel">
      {/* Header bar that toggles the drawer */}
      <div className="drawer-header-bar" onClick={() => setIsOpen(!isOpen)}>
        <div className="drawer-header-left">
          <FileText size={18} className="sparkle-cyan" />
          <div className="drawer-title-group">
            <h3 className="drawer-title">Immutable A2A Evidence & Forensic Trace Ledger</h3>
            <span className="drawer-subtitle">
              {evidenceRecords.length} Evidence Records · {transitions.length} State Transitions ·{' '}
              {overrides.length} Overrides
            </span>
          </div>
        </div>

        <div className="drawer-header-right">
          <button
            className="copy-bundle-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleCopyBundle()
            }}
            title="Copy entire workflow evidence bundle as JSON"
          >
            {copiedRaw ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedRaw ? 'Bundle Copied!' : 'Copy Bundle JSON'}</span>
          </button>
          <div className="toggle-chevron">{isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="drawer-body">
          {/* Sub Navigation Tabs */}
          <div className="drawer-tabs">
            <button
              className={`drawer-tab-btn ${activeTab === 'records' ? 'active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              Evidence Records ({evidenceRecords.length})
            </button>
            <button
              className={`drawer-tab-btn ${activeTab === 'transitions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transitions')}
            >
              Workflow Timeline ({transitions.length})
            </button>
            <button
              className={`drawer-tab-btn ${activeTab === 'overrides' ? 'active' : ''}`}
              onClick={() => setActiveTab('overrides')}
            >
              Human Overrides ({overrides.length})
            </button>
            <button
              className={`drawer-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw Inspector (JSON)
            </button>
          </div>

          {/* TAB 1: Evidence Records Cards */}
          {activeTab === 'records' && (
            <div className="evidence-records-grid">
              {evidenceRecords.length > 0 ? (
                evidenceRecords.map((rec) => (
                  <div key={rec.record_id} className="evidence-card">
                    <div className="evidence-card-top">
                      <div className="record-id-title">
                        <span className="mono record-id">{rec.record_id}</span>
                        <span className="stage-tag">{rec.stage}</span>
                      </div>
                      <span className={`verdict-pill verdict-${rec.decision?.verdict?.toLowerCase() || 'none'}`}>
                        {rec.decision?.verdict || 'N/A'}
                      </span>
                    </div>

                    <div className="evidence-card-meta">
                      <div className="meta-line">
                        <span className="meta-k">Agent ID:</span>
                        <span className="meta-v mono">{rec.agent_id}</span>
                      </div>
                      <div className="meta-line">
                        <span className="meta-k">Model:</span>
                        <span className="meta-v">
                          {rec.model?.name} v{rec.model?.version}
                        </span>
                      </div>
                      <div className="meta-line">
                        <span className="meta-k">Outcome:</span>
                        <span className="meta-v outcome-tag">{rec.decision?.outcome || 'none'}</span>
                      </div>
                      <div className="meta-line">
                        <span className="meta-k">Produced At:</span>
                        <span className="meta-v mono">{rec.produced_at ? new Date(rec.produced_at).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    </div>

                    <p className="evidence-reason">{rec.decision?.reason}</p>

                    <div className="evidence-card-bottom">
                      <div className="hash-wrap-clickable" onClick={() => handleCopyHash(rec.content_hash || '')}>
                        <Hash size={12} />
                        <span className="mono hash-text">
                          {rec.content_hash ? rec.content_hash.substring(0, 16) + '...' : 'none'}
                        </span>
                        {copiedHash === rec.content_hash ? (
                          <span className="copied-text">Copied!</span>
                        ) : (
                          <Copy size={11} className="copy-icon-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-tab-state">No evidence records produced yet.</div>
              )}
            </div>
          )}

          {/* TAB 2: State Transitions Timeline */}
          {activeTab === 'transitions' && (
            <div className="transitions-timeline">
              {transitions.length > 0 ? (
                transitions.map((t, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-node">
                      <Clock size={12} />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="event-name mono">{t.event}</span>
                        {t.stage && <span className="stage-pill">{t.stage}</span>}
                        <span className="time-mono mono">{new Date(t.at).toLocaleTimeString()}</span>
                      </div>
                      {t.detail && <p className="timeline-detail">{t.detail}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-tab-state">No transitions recorded.</div>
              )}
            </div>
          )}

          {/* TAB 3: Overrides History */}
          {activeTab === 'overrides' && (
            <div className="overrides-list">
              {overrides.length > 0 ? (
                overrides.map((ov, i) => (
                  <div key={i} className="override-history-card">
                    <div className="override-card-top">
                      <span className="record-target mono">Target: {ov.record_id}</span>
                      <span className="override-change">
                        <span className="old-v">{ov.original_verdict}</span> ➔{' '}
                        <span className="new-v">{ov.new_verdict}</span>
                      </span>
                    </div>
                    <p className="override-reason-text">"{ov.reason}"</p>
                    <div className="override-footer">
                      <span className="actor-text">Operator: {ov.actor}</span>
                      <span className="time-mono mono">{new Date(ov.at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-tab-state">
                  No human overrides have been recorded on this workflow run.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Raw JSON Viewer */}
          {activeTab === 'raw' && (
            <div className="raw-json-viewer">
              <pre className="json-pre mono">
                {JSON.stringify({ workflow, evidence: evidenceMap }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
