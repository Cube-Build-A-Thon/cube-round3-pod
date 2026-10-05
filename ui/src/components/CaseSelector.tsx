import React, { useState } from 'react'
import { Play, Sparkles, Sliders, AlertOctagon, Check, ArrowRight } from 'lucide-react'
import type { CaseItem } from '../types'

interface CaseSelectorProps {
  cases: CaseItem[]
  selectedCase: { orgId: string; unitId: string; route?: string; returned?: boolean }
  onSelectCase: (c: { orgId: string; unitId: string; route?: string; returned?: boolean }) => void
  onRunWorkflow: (chaos: boolean) => void
  isRunning: boolean
}

export const CaseSelector: React.FC<CaseSelectorProps> = ({
  cases,
  selectedCase,
  onSelectCase,
  onRunWorkflow,
  isRunning,
}) => {
  const [showCustom, setShowCustom] = useState(false)
  const [chaosMode, setChaosMode] = useState(false)
  const [customOrg, setCustomOrg] = useState(selectedCase.orgId || 'org_demo_alpha')
  const [customUnit, setCustomUnit] = useState(selectedCase.unitId || 'UNIT-0014')
  const [customRoute, setCustomRoute] = useState(selectedCase.route || 'fba')
  const [customReturned, setCustomReturned] = useState(selectedCase.returned ?? true)

  const curatedPresets = [
    {
      unitId: 'UNIT-0014',
      orgId: 'org_demo_alpha',
      route: 'fba',
      returned: true,
      title: 'UNIT-0014 (Primary Demo)',
      tag: 'Rule R11 Refurbish',
      desc: 'LED Lamp · FBA Return · 4-point verification & Amazon condition grading',
      isStar: true,
    },
    {
      unitId: 'UNIT-0029',
      orgId: 'org_demo_alpha',
      route: 'fba',
      returned: false,
      title: 'UNIT-0029 (Override Demo)',
      tag: 'UNCERTAIN Verdict',
      desc: 'Carton Anomaly · Station 1 halts with UNCERTAIN · Demonstrates Operator Override',
      isStar: false,
    },
    {
      unitId: 'UNIT-0003',
      orgId: 'org_demo_bravo',
      route: 'fba',
      returned: true,
      title: 'UNIT-0003 (Liquidation)',
      tag: 'Damaged / Missing',
      desc: 'Puzzle Box · FBA Return · Recovery Station Liquidate disposition',
      isStar: false,
    },
    {
      unitId: 'UNIT-0016',
      orgId: 'org_demo_alpha',
      route: 'mfn',
      returned: true,
      title: 'UNIT-0016 (Restock)',
      tag: 'Used - Like New',
      desc: 'Blue Towel · High confidence verification · Direct restock flow',
      isStar: false,
    },
    {
      unitId: 'UNIT-0002',
      orgId: 'org_demo_alpha',
      route: 'fba',
      returned: false,
      title: 'UNIT-0002 (Inbound)',
      tag: 'Clean Standard Flow',
      desc: 'Forward Fulfillment · Station 1 Receiving -> Station 2 Prep',
      isStar: false,
    },
  ]

  const handleApplyCustom = () => {
    onSelectCase({
      orgId: customOrg,
      unitId: customUnit.trim().toUpperCase(),
      route: customRoute,
      returned: customReturned,
    })
    setShowCustom(false)
  }

  return (
    <section className="case-selector-container glass-panel">
      <div className="selector-header">
        <div className="section-label">
          <Sparkles size={16} className="sparkle-cyan" />
          <span>WORKFLOW EXECUTION & SCENARIO SELECTOR</span>
          {cases.length > 0 && <span className="role-pill">{cases.length} Units Ready</span>}
        </div>
        <div className="selector-actions">
          {/* Chaos toggle */}
          <label className={`chaos-toggle ${chaosMode ? 'chaos-active' : ''}`} title="Simulate Station Delay / Fault Injection">
            <input
              type="checkbox"
              checked={chaosMode}
              onChange={(e) => setChaosMode(e.target.checked)}
            />
            <AlertOctagon size={14} />
            <span>Chaos Injection</span>
          </label>

          {/* Custom drawer toggle */}
          <button
            className={`custom-toggle-btn ${showCustom ? 'active' : ''}`}
            onClick={() => setShowCustom(!showCustom)}
          >
            <Sliders size={14} />
            <span>Custom Unit</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Cards */}
      <div className="preset-grid">
        {curatedPresets.map((preset) => {
          const isSelected = selectedCase.unitId === preset.unitId
          return (
            <div
              key={preset.unitId}
              className={`preset-card ${isSelected ? 'selected' : ''} ${preset.isStar ? 'star-demo' : ''}`}
              onClick={() => onSelectCase(preset)}
            >
              <div className="preset-card-top">
                <span className="preset-title">{preset.title}</span>
                <span className="preset-tag">{preset.tag}</span>
              </div>
              <p className="preset-desc">{preset.desc}</p>
              <div className="preset-card-bottom">
                <span className="mono-param">org: {preset.orgId.replace('org_demo_', '')}</span>
                <span className="mono-param">route: {preset.route.toUpperCase()}</span>
                {isSelected && <span className="active-dot">Selected</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom Run Inputs Drawer */}
      {showCustom && (
        <div className="custom-drawer glass-panel">
          <div className="custom-drawer-grid">
            <div className="form-group">
              <label>Organization ID</label>
              <select
                value={customOrg}
                onChange={(e) => setCustomOrg(e.target.value)}
                className="input-field"
              >
                <option value="org_demo_alpha">org_demo_alpha</option>
                <option value="org_demo_bravo">org_demo_bravo</option>
              </select>
            </div>

            <div className="form-group">
              <label>Subject Unit ID</label>
              <input
                type="text"
                placeholder="e.g. UNIT-0014"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="input-field mono"
              />
            </div>

            <div className="form-group">
              <label>Fulfillment Route</label>
              <select
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                className="input-field"
              >
                <option value="fba">FBA (Fulfillment by Amazon)</option>
                <option value="mfn">MFN (Merchant Fulfilled Network)</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customReturned}
                  onChange={(e) => setCustomReturned(e.target.checked)}
                />
                <span>Returned Item Workflow</span>
              </label>
            </div>

            <div className="form-group btn-group">
              <button className="apply-custom-btn" onClick={handleApplyCustom}>
                <Check size={14} />
                <span>Apply Selection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Bar */}
      <div className="run-bar">
        <div className="run-summary">
          <span className="run-label">Target Unit:</span>
          <span className="target-badge mono">{selectedCase.unitId}</span>
          <span className="meta-pill">{selectedCase.orgId}</span>
          <span className="meta-pill">{selectedCase.route?.toUpperCase() || 'FBA'}</span>
          <span className={`meta-pill ${selectedCase.returned ? 'returned-pill' : 'inbound-pill'}`}>
            {selectedCase.returned ? 'Customer Return' : 'Standard Inbound'}
          </span>
          {chaosMode && <span className="chaos-pill">⚠️ Chaos Mode Active</span>}
        </div>

        <button
          className={`run-button ${isRunning ? 'running' : ''}`}
          onClick={() => onRunWorkflow(chaosMode)}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="spinner spinning"></div>
              <span>Executing Pipeline...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Execute Live Pipeline</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </section>
  )
}
