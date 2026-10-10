import React from 'react'
import type { WorkflowState } from '@/types/workflow'
import { OrchestratorStudio } from '@/components/orchestrator/OrchestratorStudio'

interface AnalyzeItemProps {
  onWorkflowComplete?: (wf: WorkflowState) => void
}

export const AnalyzeItem: React.FC<AnalyzeItemProps> = () => {
  return <OrchestratorStudio />
}

export default AnalyzeItem
