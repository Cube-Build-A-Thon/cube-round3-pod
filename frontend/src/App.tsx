import React, { useState } from 'react'
import { Navbar, type PageId } from '@/components/layout/Navbar'
import { Home } from '@/pages/Home'
import { AnalyzeItem } from '@/pages/AnalyzeItem'
import { WorkflowReport } from '@/components/workflow/WorkflowReport'
import { BrowseAgents } from '@/pages/BrowseAgents'
import { AgentDetail } from '@/pages/AgentDetail'
import type { AgentStage } from '@/data/agentsData'
import type { WorkflowState } from '@/types/workflow'

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('home')
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowState | null>(null)

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.classList.add('page-hidden')
      } else {
        document.documentElement.classList.remove('page-hidden')
      }
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page)
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  const agentStage = currentPage.startsWith('agent-')
    ? currentPage.slice('agent-'.length) as AgentStage
    : null

  const handleWorkflowComplete = (wf: WorkflowState) => {
    setActiveWorkflow(wf)
    setCurrentPage('analyze')
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  return (
    <div
      data-page={currentPage}
      className={[
        'relative',
        'bg-[#FAF7F2]',
        'text-stone-900',
        'selection:bg-teal-100',
        'selection:text-teal-900',
        'font-sans',
        'flex',
        'flex-col',
        'min-h-screen',
        currentPage === 'home' ? 'lg:h-screen lg:h-[100dvh] lg:overflow-hidden' : '',
      ].join(' ')}
    >
      {/* Shared moving-dots background across all pages */}
      <div aria-hidden="true" className="fixed inset-0 stars-bg pointer-events-none" />

      {/* Shared corner frame accents fixed across all pages */}
      <div className="fixed top-2 left-2 w-6 h-6 lg:w-10 lg:h-10 border-t-2 border-l-2 border-stone-400/70 z-40 pointer-events-none" />
      <div className="fixed top-2 right-2 w-6 h-6 lg:w-10 lg:h-10 border-t-2 border-r-2 border-stone-400/70 z-40 pointer-events-none" />
      <div className="fixed bottom-2 left-2 w-6 h-6 lg:w-10 lg:h-10 border-b-2 border-l-2 border-stone-400/70 z-40 pointer-events-none" />
      <div className="fixed bottom-2 right-2 w-6 h-6 lg:w-10 lg:h-10 border-b-2 border-r-2 border-stone-400/70 z-40 pointer-events-none" />

      {/* Shared Technical Header */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Page Content */}
      <main
        key={currentPage}
        className={[
          'view-enter',
          'relative',
          'z-10',
          'flex-1',
          'flex',
          'flex-col',
          currentPage === 'home' ? 'lg:overflow-hidden lg:min-h-0' : '',
        ].join(' ')}
      >
        {currentPage === 'home' && (
          <Home onNavigate={handleNavigate} />
        )}

        {currentPage === 'analyze' && (
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {activeWorkflow ? (
              <WorkflowReport
                key={activeWorkflow.workflow_id}
                initialWorkflow={activeWorkflow}
                onAnalyzeAnother={() => setActiveWorkflow(null)}
              />
            ) : (
              <AnalyzeItem onWorkflowComplete={handleWorkflowComplete} />
            )}
          </div>
        )}

        {currentPage === 'agents' && (
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            <BrowseAgents onNavigate={handleNavigate} />
          </div>
        )}

        {agentStage && (
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            <AgentDetail
              stage={agentStage}
              onNavigate={handleNavigate}
              onWorkflowComplete={handleWorkflowComplete}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
