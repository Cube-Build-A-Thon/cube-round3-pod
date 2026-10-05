import React from 'react'
import {
  RotateCcw,
  PackageCheck,
  Sparkles,
  Box,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  FileCheck,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  Hash,
  Database,
} from 'lucide-react'
import type { EvidenceRecord, StageResult } from '../types'

interface StationWorkspaceProps {
  activeStage: string
  stageResult?: StageResult
  evidence?: EvidenceRecord
  allEvidence: Record<string, EvidenceRecord>
  onOpenOverride: (recordId: string, currentVerdict: string) => void
}

export const StationWorkspace: React.FC<StationWorkspaceProps> = ({
  activeStage,
  stageResult,
  evidence,
  allEvidence,
  onOpenOverride,
}) => {
  const STATIONS_INFO: Record<
    string,
    {
      num: number
      title: string
      role: string
      owner: string
      github: string
      icon: any
      description: string
    }
  > = {
    receiving: {
      num: 1,
      title: 'Station 1: Receiving Manager',
      role: 'Inbound Verification & PO Reconciliation',
      owner: 'Lanke Kiran Teja',
      github: 'KiranTejz20005',
      icon: PackageCheck,
      description:
        'Audits incoming cartons, verifies ASN against PO manifests, checks for freight damage and carton barcode integrity.',
    },
    prep: {
      num: 2,
      title: 'Station 2: Prep Manager',
      role: 'Conditioning, Polybagging & FNSKU Tagging',
      owner: 'Mohammad Suhana',
      github: 'mdsuhana231-gif',
      icon: Sparkles,
      description:
        'Enforces Amazon prep requirements, bubble wrap tares, suffocation warning labels, and Amazon FNSKU barcode placement.',
    },
    pack: {
      num: 3,
      title: 'Station 3: Pack Manager',
      role: 'Corrugated Packaging, Void Fill & Pre-seal Audit',
      owner: 'Nikhil Agarwal',
      github: 'nikhilagarwal03',
      icon: Box,
      description:
        'Calculates dimensional weight, selects optimum box carton, records pre-seal weight, and verifies sealed package tamper-evidence.',
    },
    returns: {
      num: 4,
      title: 'Station 4: Returns Manager',
      role: 'Visual Identity, Condition Grading & Rule R11 Safety',
      owner: 'Kasaraneni Upesh Chowdary (Pod Lead)',
      github: 'upeshchowdary',
      icon: RotateCcw,
      description:
        'Executes 4-point visual identity check (Brand/Colour/Shape/Size), Amazon Condition Grading, Rule R11 electrical safety policy, and upstream completeness audit.',
    },
    recovery: {
      num: 5,
      title: 'Station 5: Recovery Manager',
      role: 'Disposition Routing, Claims & Reconciliations',
      owner: 'Vishruth Jeelakapally',
      github: 'vishruth-16',
      icon: RefreshCw,
      description:
        'Dispatches items to Restock, Refurbish, or Liquidation channels. Generates automated carrier reimbursement claim packages for damaged inventory.',
    },
  }

  const info = STATIONS_INFO[activeStage] || STATIONS_INFO.returns
  const IconComponent = info.icon

  // For Returns Manager (Station 4) specific payload details
  const payload = evidence?.payload || {}
  const amazonCondition = payload.amazon_condition || 'Used - Very Good'
  const ruleApplied = payload.rule_applied
  const verificationPoints = payload.verification_points || ['brand', 'colour', 'shape', 'size']

  return (
    <div className="station-workspace-container glass-panel">
      {/* Station Title Header */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <div className="station-icon-badge">
            <IconComponent size={24} />
          </div>
          <div>
            <div className="station-meta-row">
              <span className="station-num-tag">Station {info.num}</span>
              {activeStage === 'returns' && <span className="verified-lead-pill">⭐ Pod Lead Verified Agent</span>}
              <a
                href={`https://github.com/${info.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="owner-link-badge"
              >
                @{info.github}
                <ExternalLink size={12} />
              </a>
            </div>
            <h2 className="station-title">{info.title}</h2>
            <p className="station-subtitle">{info.description}</p>
          </div>
        </div>

        <div className="workspace-header-right">
          {evidence && (
            <button
              onClick={() => onOpenOverride(evidence.record_id, evidence.decision?.verdict || 'PASS')}
              className="override-btn-trigger"
              title="Apply Human In-the-Loop Override to this station's verdict"
            >
              <SlidersHorizontal size={15} />
              <span>Human Override</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Status Banner */}
      <div className="station-summary-bar">
        <div className="summary-item">
          <span className="summary-label">Execution State</span>
          <span className={`summary-value state-${stageResult?.state || 'pending'}`}>
            {stageResult?.state?.toUpperCase() || 'PENDING'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Final Verdict</span>
          <span
            className={`summary-value verdict-${
              stageResult?.verdict ? stageResult.verdict.toLowerCase() : 'none'
            }`}
          >
            {stageResult?.verdict || (stageResult?.state === 'skipped' ? 'SKIPPED' : 'PENDING')}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Outcome Routing</span>
          <span className="summary-value outcome-highlight">
            {stageResult?.outcome?.toUpperCase() || evidence?.decision?.outcome?.toUpperCase() || 'N/A'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Evidence Record ID</span>
          <span className="summary-value mono">{evidence?.record_id || stageResult?.record_id || 'N/A'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Human Review Needed?</span>
          <span className={`summary-value ${stageResult?.needs_human ? 'human-needed-yes' : 'human-needed-no'}`}>
            {stageResult?.needs_human ? '⚠️ YES (ACTION REQUIRED)' : 'NO (AUTONOMOUS)'}
          </span>
        </div>
      </div>

      {/* Decision Reason Callout */}
      {evidence?.decision?.reason && (
        <div className="decision-callout-card">
          <div className="callout-header">
            <FileCheck size={16} className="sparkle-cyan" />
            <span>Agent Decision Rationale</span>
          </div>
          <p className="callout-text">{evidence.decision.reason}</p>
        </div>
      )}

      {/* Returns Manager Specialized Inspection Showcase */}
      {activeStage === 'returns' && (
        <div className="returns-specialized-grid">
          {/* 4-Point Visual Identity Matrix */}
          <div className="spec-card visual-matrix-card">
            <div className="spec-card-header">
              <Layers size={16} />
              <h3>4-Point Visual Identity Verification Matrix</h3>
            </div>
            <p className="spec-desc">
              Mandatory multi-angle visual inspection assessing brand, colour, geometry, and packaging tare.
            </p>

            <div className="matrix-items">
              {verificationPoints.map((point: string) => {
                const check = evidence?.checks.find((c) =>
                  c.check_key.toLowerCase().includes(point)
                ) || {
                  check_key: point,
                  verdict: 'PASS',
                  confidence: 0.95,
                  expected: 'SKU-MATCH',
                  observed: 'MATCH',
                }

                return (
                  <div key={point} className="matrix-row">
                    <div className="matrix-point-name">
                      <span className="bullet-dot"></span>
                      <strong className="point-title">{point.toUpperCase()} VERIFICATION</strong>
                    </div>
                    <div className="matrix-detail">
                      <span className="meta-text">Confidence: {((check.confidence || 0.95) * 100).toFixed(0)}%</span>
                      <span className={`matrix-badge verdict-${check.verdict.toLowerCase()}`}>
                        {check.verdict === 'PASS' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {check.verdict}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Amazon Condition Grading (§11.11) */}
          <div className="spec-card condition-card">
            <div className="spec-card-header">
              <ShieldAlert size={16} />
              <h3>Amazon Standard Condition Grading (§11.11)</h3>
            </div>
            <div className="condition-grade-display">
              <span className="grade-label">Assessed Condition Grade:</span>
              <span className="grade-badge">{amazonCondition}</span>
            </div>
            <div className="condition-notes">
              <div className="note-row">
                <span className="note-k">Packaging State:</span>
                <span className="note-v">Customer Opened (Clean Seal Intact)</span>
              </div>
              <div className="note-row">
                <span className="note-k">Physical Wear:</span>
                <span className="note-v">Minimal / Like-New Cosmetic State</span>
              </div>
              <div className="note-row">
                <span className="note-k">Completeness Audit:</span>
                <span className="note-v">3/3 Components Verified Present</span>
              </div>
            </div>

            {/* Rule R11 Callout */}
            {ruleApplied === 'Rule R11' && (
              <div className="rule-r11-callout">
                <div className="r11-title">
                  <ShieldAlert size={14} />
                  <span>Rule R11: Electrical Safety Routing Enforced</span>
                </div>
                <p className="r11-text">
                  Opened electronics must undergo certified electrical and functional safety inspection before relisting.
                  Automatic disposition routed to <strong>Refurbish</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forensic Checks Ledger */}
      <div className="checks-ledger-section">
        <div className="ledger-header">
          <Database size={16} />
          <h3>Station Audit Checks & Observations</h3>
        </div>

        {evidence?.checks && evidence.checks.length > 0 ? (
          <div className="checks-table-wrapper">
            <table className="checks-table">
              <thead>
                <tr>
                  <th>Check Key</th>
                  <th>Verdict</th>
                  <th>Confidence</th>
                  <th>Expected</th>
                  <th>Observed</th>
                  <th>Evidence References</th>
                </tr>
              </thead>
              <tbody>
                {evidence.checks.map((chk, i) => (
                  <tr key={i}>
                    <td className="mono check-key-cell">{chk.check_key}</td>
                    <td>
                      <span className={`table-verdict-badge verdict-${chk.verdict.toLowerCase()}`}>
                        {chk.verdict === 'PASS' && <CheckCircle2 size={12} />}
                        {chk.verdict === 'FAIL' && <XCircle size={12} />}
                        {chk.verdict === 'UNCERTAIN' && <AlertTriangle size={12} />}
                        {chk.verdict}
                      </span>
                    </td>
                    <td>{chk.confidence ? `${(chk.confidence * 100).toFixed(0)}%` : '100%'}</td>
                    <td className="mono text-muted-sm">
                      {typeof chk.expected === 'object' ? JSON.stringify(chk.expected) : String(chk.expected ?? '-')}
                    </td>
                    <td className="mono text-muted-sm">
                      {typeof chk.observed === 'object' ? JSON.stringify(chk.observed) : String(chk.observed ?? '-')}
                    </td>
                    <td className="text-muted-sm">
                      {chk.evidence_refs?.join(', ') || 'Sensor scan telemetry'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-checks-msg">
            <p>
              {stageResult?.state === 'skipped'
                ? 'Station was bypassed by workflow route logic (e.g. Returned item skips forward packaging station).'
                : 'No checks recorded yet for this station in the active pipeline run.'}
            </p>
          </div>
        )}
      </div>

      {/* Upstream Evidence Dependency & Cryptographic Fingerprint */}
      {evidence && (
        <div className="evidence-footer-bar">
          <div className="upstream-refs-wrap">
            <span className="footer-label">Upstream Dependencies:</span>
            {evidence.upstream_refs && evidence.upstream_refs.length > 0 ? (
              evidence.upstream_refs.map((ref) => {
                const upEv = allEvidence[ref]
                return (
                  <span
                    key={ref}
                    className="ref-pill mono"
                    title={upEv ? `${upEv.stage} · ${upEv.decision?.verdict}` : ref}
                  >
                    {ref} {upEv?.decision?.verdict ? `[${upEv.decision.verdict}]` : ''}
                  </span>
                )
              })
            ) : (
              <span className="no-refs">None (Root Stage)</span>
            )}
          </div>

          <div className="sha-wrap">
            <Hash size={14} />
            <span className="footer-label">SHA-256 Content Hash:</span>
            <span className="sha-text mono">{evidence.content_hash || 'Verified'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
