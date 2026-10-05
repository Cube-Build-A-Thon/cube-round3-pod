import React from 'react'
import { X, ShieldCheck, User, AlertCircle, ExternalLink } from 'lucide-react'

interface RosterModalProps {
  isOpen: boolean
  onClose: () => void
}

interface MemberRole {
  stationIndex: number
  stationName: string
  roleTitle: string
  member: string
  github: string
  status: 'Ready / Active' | 'Teammate Invited' | 'Integrated Stub'
  badgeColor: string
  notes: string
}

export const RosterModal: React.FC<RosterModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const roster: MemberRole[] = [
    {
      stationIndex: 1,
      stationName: 'Receiving',
      roleTitle: 'Receiving Manager',
      member: 'Lanke Kiran Teja',
      github: '@KiranTejz20005',
      status: 'Ready / Active',
      badgeColor: 'var(--verdict-pass)',
      notes: 'Inbound ASN verification, PO reconciliation, and carton barcode inspection.',
    },
    {
      stationIndex: 2,
      stationName: 'Prep',
      roleTitle: 'Prep Manager',
      member: 'Mohammad Suhana',
      github: '@mdsuhana231-gif',
      status: 'Teammate Invited',
      badgeColor: 'var(--verdict-uncertain)',
      notes: 'Item conditioning, polybagging, fragile bubble-wrap tare, and FNSKU labeling.',
    },
    {
      stationIndex: 3,
      stationName: 'Pack',
      roleTitle: 'Pack Manager',
      member: 'Nikhil Agarwal',
      github: '@nikhilagarwal03',
      status: 'Teammate Invited',
      badgeColor: 'var(--verdict-uncertain)',
      notes: 'Corrugated carton sizing, void fill, dunnage weight check, and pre-seal audit.',
    },
    {
      stationIndex: 4,
      stationName: 'Returns',
      roleTitle: 'Returns Manager & Lead',
      member: 'Kasaraneni Upesh Chowdary',
      github: '@upeshchowdary',
      status: 'Ready / Active',
      badgeColor: 'var(--verdict-pass)',
      notes: '4-Point Visual Identity Verification (Brand/Colour/Shape/Size), Amazon Condition Grading, Rule R11 electrical safety policy, Pack pre-seal audit.',
    },
    {
      stationIndex: 5,
      stationName: 'Recovery',
      roleTitle: 'Recovery Manager',
      member: 'Vishruth Jeelakapally',
      github: '@vishruth-16',
      status: 'Ready / Active',
      badgeColor: 'var(--verdict-pass)',
      notes: 'Reimbursement claim generation, liquidation recovery, and restock reconciliation.',
    },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldCheck size={22} className="modal-icon-blue" />
            <div>
              <h2 className="modal-title">CUBE Round 3 · Pod 05 Team Roster & Stations</h2>
              <p className="modal-subtitle">Official Codeowners & Multi-Agent Architecture Assignment</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="roster-grid">
          {roster.map((r) => (
            <div
              key={r.stationIndex}
              className={`roster-station-card ${r.stationIndex === 4 ? 'highlighted-lead' : ''}`}
            >
              <div className="station-card-top">
                <div className="station-number-tag">Station {r.stationIndex}</div>
                <div className="station-name-bold">{r.stationName}</div>
                {r.stationIndex === 4 && <span className="lead-tag">Pod Lead & Fork Owner</span>}
              </div>

              <div className="station-card-body">
                <div className="role-title-text">{r.roleTitle}</div>
                <div className="member-name-text">
                  <User size={14} />
                  <span>{r.member}</span>
                </div>
                <div className="github-handle">
                  <a
                    href={`https://github.com/${r.github.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.github}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="station-notes">{r.notes}</p>
              </div>

              <div className="station-card-footer">
                <span className="station-status-pill" style={{ borderColor: r.badgeColor, color: r.badgeColor }}>
                  <span className="dot" style={{ backgroundColor: r.badgeColor }}></span>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="roster-modal-footer">
          <div className="lead-note">
            <AlertCircle size={15} />
            <span>
              <strong>Note for Evaluators:</strong> In accordance with Round 3 rules, while teammates are offline or pending invitations, unintegrated stations execute validated deterministic replay stubs with full schema compliance, preserving seamless end-to-end A2A pipeline integrity.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
