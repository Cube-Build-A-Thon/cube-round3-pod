import React, { useState } from 'react'
import { X, SlidersHorizontal, CheckCircle2, AlertTriangle, ShieldAlert, UserCheck, ArrowRight } from 'lucide-react'

interface HumanOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  recordId: string
  currentVerdict: string
  onSubmitOverride: (newVerdict: 'PASS' | 'FAIL' | 'UNCERTAIN', actor: string, reason: string, outcome?: string) => Promise<void>
}

export const HumanOverrideModal: React.FC<HumanOverrideModalProps> = ({
  isOpen,
  onClose,
  recordId,
  currentVerdict,
  onSubmitOverride,
}) => {
  const [newVerdict, setNewVerdict] = useState<'PASS' | 'FAIL' | 'UNCERTAIN'>('PASS')
  const [actor, setActor] = useState('Kasaraneni Upesh Chowdary (Pod 05 Lead)')
  const [reason, setReason] = useState(
    'Manual high-resolution optical inspection verifies authentic barcode and intact factory seal.'
  )
  const [newOutcome, setNewOutcome] = useState('accept')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || !actor.trim()) {
      setErrorMessage('Actor identity and justification reason are strictly required.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await onSubmitOverride(newVerdict, actor.trim(), reason.trim(), newOutcome.trim() || undefined)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit override')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card override-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <SlidersHorizontal size={22} className="modal-icon-amber" />
            <div>
              <h2 className="modal-title">Human-in-the-Loop Override Intervention</h2>
              <p className="modal-subtitle">
                Resolve UNCERTAIN/ambiguous stage results with an immutable signed audit record
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="override-form">
          <div className="override-info-banner">
            <div className="banner-item">
              <span className="banner-k">Target Record ID:</span>
              <span className="banner-v mono">{recordId}</span>
            </div>
            <div className="banner-item">
              <span className="banner-k">Current Verdict:</span>
              <span className={`banner-verdict-pill verdict-${currentVerdict.toLowerCase()}`}>
                {currentVerdict}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="error-alert">
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">New Assessed Verdict</label>
            <div className="verdict-select-group">
              <button
                type="button"
                className={`verdict-choice-btn pass ${newVerdict === 'PASS' ? 'chosen' : ''}`}
                onClick={() => {
                  setNewVerdict('PASS')
                  setNewOutcome('accept')
                }}
              >
                <CheckCircle2 size={16} />
                <span>PASS</span>
              </button>
              <button
                type="button"
                className={`verdict-choice-btn fail ${newVerdict === 'FAIL' ? 'chosen' : ''}`}
                onClick={() => {
                  setNewVerdict('FAIL')
                  setNewOutcome('reject')
                }}
              >
                <ShieldAlert size={16} />
                <span>FAIL</span>
              </button>
              <button
                type="button"
                className={`verdict-choice-btn uncertain ${newVerdict === 'UNCERTAIN' ? 'chosen' : ''}`}
                onClick={() => {
                  setNewVerdict('UNCERTAIN')
                  setNewOutcome('escalate')
                }}
              >
                <AlertTriangle size={16} />
                <span>UNCERTAIN</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Outcome Disposition</label>
            <input
              type="text"
              className="input-field"
              value={newOutcome}
              onChange={(e) => setNewOutcome(e.target.value)}
              placeholder="e.g. accept, refurbish, liquidate, reject"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operator Signature / Identifier</label>
            <div className="input-with-icon">
              <UserCheck size={16} className="input-icon" />
              <input
                type="text"
                className="input-field with-icon"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Full Name and Role"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Forensic Justification Rationale</label>
            <textarea
              className="input-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Document physical inspection findings, sensor cross-checks, or manager approval..."
              required
            ></textarea>
            <span className="helper-text">
              This reason is permanently appended to the tamper-evident evidence ledger and cannot be deleted.
            </span>
          </div>

          <div className="override-modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-override-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="spinner spinning"></div>
                  <span>Signing Override...</span>
                </>
              ) : (
                <>
                  <span>Commit Override & Resume</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
