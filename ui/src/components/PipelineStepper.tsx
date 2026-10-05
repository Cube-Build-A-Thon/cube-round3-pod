import React from 'react'
import {
  PackageCheck,
  Sparkles,
  Box,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import type { StageResult, WorkflowState } from '../types'

interface PipelineStepperProps {
  workflow: WorkflowState | null
  activeStage: string
  onSelectStage: (stage: string) => void
  isRunning: boolean
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  workflow,
  activeStage,
  onSelectStage,
  isRunning,
}) => {
  const STATIONS = [
    {
      id: 'receiving',
      num: 1,
      name: 'Receiving',
      icon: PackageCheck,
      owner: 'Kiran Teja (@KiranTejz20005)',
      description: 'Inbound PO & ASN check',
    },
    {
      id: 'prep',
      num: 2,
      name: 'Prep',
      icon: Sparkles,
      owner: 'M. Suhana (@mdsuhana231-gif)',
      description: 'Polybag & FNSKU label',
    },
    {
      id: 'pack',
      num: 3,
      name: 'Pack',
      icon: Box,
      owner: 'N. Agarwal (@nikhilagarwal03)',
      description: 'Box sizing & pre-seal tare',
    },
    {
      id: 'returns',
      num: 4,
      name: 'Returns',
      icon: RotateCcw,
      owner: 'Upesh Chowdary (@upeshchowdary)',
      description: '4-Point Inspection & R11 Safety',
      isLead: true,
    },
    {
      id: 'recovery',
      num: 5,
      name: 'Recovery',
      icon: RefreshCw,
      owner: 'V. Jeelakapally (@vishruth-16)',
      description: 'Disposition & Claims',
    },
  ]

  const getStageResult = (stageId: string): StageResult | undefined => {
    return workflow?.stage_results.find((s) => s.stage === stageId)
  }

  return (
    <section className="pipeline-stepper-container glass-panel">
      <div className="stepper-header">
        <div className="section-label">
          <ShieldCheck size={16} className="sparkle-cyan" />
          <span>A2A MULTI-AGENT PIPELINE STAGES</span>
        </div>
        {workflow && (
          <div className="workflow-meta">
            <span className="wf-id mono">{workflow.workflow_id}</span>
            <span className={`wf-status-badge status-${workflow.status.toLowerCase()}`}>
              {workflow.status}
            </span>
          </div>
        )}
      </div>

      <div className="stepper-flow">
        {STATIONS.map((station, idx) => {
          const result = getStageResult(station.id)
          const isSelected = activeStage === station.id
          const isCurrent = workflow?.current_stage === station.id && isRunning

          // Compute state badge
          const state = result?.state || (isCurrent ? 'in_progress' : workflow ? 'pending' : 'idle')
          const verdict = result?.verdict
          const isSkipped = state === 'skipped'
          const needsHuman = result?.needs_human

          const IconComponent = station.icon

          return (
            <React.Fragment key={station.id}>
              <div
                className={`step-card ${isSelected ? 'active-selection' : ''} ${
                  station.isLead ? 'returns-lead-step' : ''
                } ${isCurrent ? 'step-running' : ''}`}
                onClick={() => onSelectStage(station.id)}
              >
                <div className="step-card-header">
                  <div className="step-num-badge">
                    <span>{station.num}</span>
                  </div>
                  {station.isLead && <span className="lead-star" title="Pod Lead Verified Station">★ Upesh</span>}
                  <div className="step-state-badge">
                    {state === 'completed' && verdict === 'PASS' && (
                      <span className="verdict-tag pass">
                        <CheckCircle2 size={12} /> PASS
                      </span>
                    )}
                    {state === 'completed' && verdict === 'FAIL' && (
                      <span className="verdict-tag fail">
                        <XCircle size={12} /> FAIL
                      </span>
                    )}
                    {state === 'completed' && verdict === 'UNCERTAIN' && (
                      <span className="verdict-tag uncertain">
                        <AlertTriangle size={12} /> UNCERTAIN
                      </span>
                    )}
                    {isSkipped && (
                      <span className="verdict-tag skipped">
                        <MinusCircle size={12} /> SKIPPED
                      </span>
                    )}
                    {state === 'in_progress' && (
                      <span className="verdict-tag in-progress">
                        <Clock size={12} className="spinning" /> RUNNING
                      </span>
                    )}
                    {state === 'pending' && <span className="verdict-tag pending">PENDING</span>}
                    {state === 'idle' && <span className="verdict-tag idle">IDLE</span>}
                  </div>
                </div>

                <div className="step-card-body">
                  <div className="step-icon-wrap">
                    <IconComponent size={20} className="step-icon" />
                  </div>
                  <div className="step-info">
                    <h3 className="station-name">{station.name}</h3>
                    <p className="station-owner">{station.owner}</p>
                    <p className="station-desc">{station.description}</p>
                  </div>
                </div>

                {needsHuman && (
                  <div className="step-needs-human-alert">
                    <AlertTriangle size={12} />
                    <span>Human Action Required</span>
                  </div>
                )}

                {result?.record_id && (
                  <div className="step-card-footer">
                    <span className="step-record-id mono">{result.record_id}</span>
                  </div>
                )}
              </div>

              {idx < STATIONS.length - 1 && (
                <div className="step-arrow-connector">
                  <ChevronRight size={18} className="arrow-icon" />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </section>
  )
}
