import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Bell,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  CircleDot,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Layers3,
  Search,
  ShieldCheck,
  Workflow,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  analyticsData,
  agentHealth,
  exampleAgents,
  failures,
  outcomeMix,
  recentActivity,
  recoveryCharges,
  reviews,
  unitRows,
  workflowRows,
} from './data'
import './App.css'

const queryClient = new QueryClient()

const sidebarItems = [
  { to: '/overview', label: 'Overview', icon: Layers3 },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/units', label: 'Units', icon: Database },
  { to: '/reviews', label: 'Review Queue', icon: FileText },
  { to: '/recovery', label: 'Recovery', icon: ShieldCheck },
  { to: '/evidence', label: 'Evidence', icon: GitBranch },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/failures', label: 'Failures', icon: XCircle },
  { to: '/analytics', label: 'Analytics', icon: Gauge },
  { to: '/system', label: 'Pod / System', icon: CircleDot },
]

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function CoverPage() {
  const workflowSteps = [
    { id: '01', label: 'Connect', title: 'Connect your commerce account', detail: 'Securely synchronize vendors, SKUs, inventory, and shipment state into one operating context.', tone: 'purple' },
    { id: '02', label: 'Scan', title: 'Agents scan your full catalog', detail: 'CUBE agents identify conditions, risk signals, and recovery opportunities across every unit.', tone: 'green' },
    { id: '03', label: 'Decide', title: 'Auto-prioritize the next action', detail: 'The system routes each unit through receiving, recovery, and final disposition with evidence.', tone: 'blue' },
  ]

  const signalCards = [
    'Receive',
    'Prep',
    'Review',
    'Recovery',
    'Outcome',
  ]

  return (
    <div className="cover-page">
      <header className="cover-header">
        <div className="cover-brand">CUBE</div>
        <nav className="cover-nav" aria-label="Cover navigation">
          <Link to="/overview">Overview</Link>
          <Link to="/agents">Agents</Link>
          <Link to="/workflows">Workflow</Link>
          <Link to="/evidence">Evidence</Link>
        </nav>
        <Link to="/overview" className="cover-enter-button">
          Enter Control Center <ChevronRight size={15} />
        </Link>
      </header>

      <main className="cover-main">
        <section className="cover-hero">
          <div className="hero-copy hero-copy-large">
            <span className="floating-pill">Now live on CUBE</span>
            <h1>
              Your commerce operation,<br />
              <span className="highlight-text">Running on autopilot.</span>
            </h1>
            <p>
              Intelligent agents orchestrate receiving, packing, returns, and recovery through one evidence-driven control layer.
            </p>
            <div className="hero-actions">
              <Link to="/overview" className="primary-button wide-button">
                Explore the system <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="Commerce workflow interface">
            <div className="hero-visual-card" />
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="orb orb-three" />
            <div className="controller-ring" />
          </div>
        </section>

        <section className="story-panel">
          <div className="story-badge">How it works</div>
          <h2>Connect once. Let the agents run.</h2>

          <div className="step-flow">
            <div className="flow-column left-column">
              {workflowSteps.slice(0, 2).map((step) => (
                <div key={step.id} className="step-item">
                  <span className={`step-index ${step.tone}`}>{step.id}</span>
                  <div className={`step-label label-${step.tone}`}>{step.label}</div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="flow-visual-card">
              <span className="card-badge">STEP 1 CONNECT</span>
              <div className="mini-brand">cube</div>
              <div className="flow-illustration">
                <div className="ring-core">
                  <span>SYNC</span>
                </div>
              </div>
              <div className="visual-pill">SP-API • Inventory • Recovery</div>
            </div>
          </div>
        </section>

        <section className="under-hood-section">
          <h2>under the hood</h2>
          <p>
            Dive into the agents, architecture, channels, and outcomes that power the CUBE operating system.
          </p>
          <button type="button" className="primary-button wide-button small-button">
            Know more about us <ChevronRight size={16} />
          </button>
        </section>

        <section className="workflow-hero">
          <div className="workflow-copy">
            <span className="mini-title">Orchestrated.</span>
            <h2>Every workflow.</h2>
            <h3>Every channel.</h3>
          </div>

          <div className="workflow-brand-panel">
            <div className="panel-wordmark">cube</div>
            <div className="wave-line" />
            <div className="panel-note">The operating system for modern commerce.</div>
          </div>
        </section>

        <section className="feature-showcase">
          <div className="feature-copy">
            <h2>Dynamic Pricer</h2>
            <p>
              Wins the buy box without sacrificing margin. CUBE pricing logic updates in real time, sets margin floors,
              surfaces pricing decisions, and keeps every recommendation aligned to live channel conditions.
            </p>
            <ul>
              <li>Win the buy box without sacrificing margin</li>
              <li>Set minimum profit floors that never get breached</li>
              <li>Replace cross-your-full-catalog manual work with live scoring</li>
              <li>Approve every price change before it goes live</li>
            </ul>
          </div>

          <div className="feature-preview">
            <div className="preview-window">
              <div className="preview-header">
                <span className="window-dot" />
                <span className="window-dot" />
                <span className="window-dot" />
              </div>
              <div className="preview-body">
                <div className="mini-metrics">
                  <span>SKU</span>
                  <span>Margin</span>
                  <span>Price</span>
                </div>
                {signalCards.map((item, index) => (
                  <div key={item} className={`metric-row signal-${index + 1}`}>
                    <span>{item}</span>
                    <strong>{index % 2 === 0 ? 'Healthy' : 'Live'}</strong>
                    <em>{index === 0 ? '$29.80' : index === 1 ? '$31.20' : '$34.40'}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="closing-section">
          <div className="closing-meta">07 • LIVE IN RETAIL</div>
          <div className="closing-title">Review Intelligence</div>
        </section>
      </main>

      <button type="button" className="floating-up-button" aria-label="Scroll to top">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function Shell() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  if (location.pathname === '/') {
    return <CoverPage />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand-block">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
          <div className="brand-mark">C</div>
          <div className="brand-copy">
            <div className="brand-title">CUBE</div>
            <div className="brand-subtitle">Pod 05</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {sidebarItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="micro-label">POD STATUS</div>
          <div className="system-row">
            <span>Commerce Ops</span>
          </div>
          <div className="system-row healthy">
            <span className="status-dot" />
            <span>Orchestrator</span>
            <span className="status-meta">Ready</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <div className="crumb-inline">CUBE / POD 05 / LIVE OPERATIONS</div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="search-box">
              <Search size={15} />
              <span>Search units, workflows, agents</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="org-tag">Org: demo_alpha</div>
            <div className="health-tag"><span className="status-dot healthy-dot" />Operations health</div>
            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={15} />
            </button>
            <div className="user-pill">UP</div>
          </div>
        </header>

        <main className="router-shell">
          <Routes>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/units/:id" element={<UnitDetailPage />} />
            <Route path="/reviews" element={<ReviewQueuePage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/recovery/charges/:id" element={<RecoveryChargeDetailPage />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/agents/:slug" element={<AgentDetailPage />} />
            <Route path="/failures" element={<FailuresPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="status-bar">
          <span className="status-label">Live</span>
          <span className="status-pulse" />
          <span>{location.pathname.replace('/', '') || 'overview'}</span>
          <span className="status-separator" />
          <span>Last updated 14 seconds ago</span>
        </footer>
      </div>
    </div>
  )
}

function OverviewPage() {
  const activityMetrics = [
    { key: 'runs', label: 'Runs' },
    { key: 'failures', label: 'Failures' },
    { key: 'uncertain', label: 'Needs review' },
  ] as const
  const agentLineColors = ['#438c6b', '#667acb', '#df8751', '#778d89', '#c46b64']

  const kpis = [
    { label: 'Active Workflows', value: '48', indicator: '+6%', route: '/workflows' },
    { label: 'Returns', value: '14', indicator: '+2', route: '/workflows?stage=returns' },
    { label: 'Needs Review', value: '7', indicator: '4 urgent', route: '/reviews' },
    { label: 'Failed / Incomplete', value: '3', indicator: '2 retrying', route: '/failures' },
    { label: 'Claims Recommended', value: '11', indicator: '$28.65', route: '/recovery?filter=claimable' },
    { label: 'Completed', value: '126', indicator: '+12%', route: '/workflows?status=completed' },
  ]

  const [activityFilter, setActivityFilter] = useState<'All' | 'Success' | 'Failed' | 'Paused / Blocked'>('All')

  const agentSeries = agentHealth.map((agent, index) => ({
    name: agent.name.replace(' Manager', ''),
    color: agentLineColors[index % agentLineColors.length],
  }))
  const agentActivityProfile = activityMetrics.map((metric) => {
    const maximum = Math.max(...agentHealth.map((agent) => agent[metric.key]))

    return agentHealth.reduce((point, agent) => {
      const agentName = agent.name.replace(' Manager', '')
      point[agentName] = maximum === 0 ? 0 : Math.round((agent[metric.key] / maximum) * 100)
      return point
    }, { metric: metric.label } as Record<string, string | number>)
  })

  const operationsSnapshot = [
    { stage: 'Receiving', active: 12, done: 34, tone: 'healthy' },
    { stage: 'Prep / Pack', active: 18, done: 26, tone: 'healthy' },
    { stage: 'Returns', active: 14, done: 16, tone: 'warning' },
    { stage: 'Recovery', active: 6, done: 11, tone: 'primary' },
    { stage: 'Review Queue', active: 7, done: 4, tone: 'danger' },
  ]

  const quickActions = [
    { label: 'Review queue', route: '/reviews' },
    { label: 'Recovery claims', route: '/recovery' },
    { label: 'Open evidence', route: '/evidence' },
    { label: 'Escalate failures', route: '/failures' },
  ]

  const priorityBench = [
    { title: 'WF-UNIT-0014', detail: 'Return mismatch requires reviewer override before release.', severity: 'critical', owner: 'Human review' },
    { title: 'RCY-UNIT-0082', detail: 'Claim recommendation is ready for approval and payout.', severity: 'high', owner: 'Recovery pod' },
    { title: 'RTE-ORG-ALPHA', detail: 'Route variance is inflating recovery risk this hour.', severity: 'medium', owner: 'Ops lead' },
  ]

  const filteredActivity = recentActivity.filter((entry) => {
    if (activityFilter === 'All') {
      return true
    }

    if (activityFilter === 'Success') {
      return entry.status === 'Success'
    }

    if (activityFilter === 'Failed') {
      return entry.status === 'Failed'
    }

    return entry.status === 'Paused / Blocked'
  })

  return (
    <div className="page-stack">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Commerce Control Center</span>
          <h1>Commerce Control Center</h1>
          <p>Pod 05</p>
          <p>Five-agent commerce operations</p>
          <div className="hero-flow">Receiving → Prep / Pack → Returns → Recovery</div>
        </div>

        <div className="hero-actions">
          <button type="button" className="primary-button">+ New Workflow</button>
          <button type="button" className="secondary-button">Search Units</button>
          <button type="button" className="tertiary-button">Review Queue</button>
        </div>
      </section>

      <section className="kpi-strip">
        {kpis.map((item) => (
          <Link key={item.label} to={item.route} className="kpi-card">
            <div className="kpi-topline">
              <span className="kpi-value">{item.value}</span>
              <span className="mini-trend">{item.indicator}</span>
            </div>
            <div className="kpi-label">{item.label}</div>
          </Link>
        ))}
      </section>

      <section className="priority-workbench panel">
        <div className="panel-header row-between">
          <div className="panel-title">Priority workbench</div>
          <button type="button" className="secondary-button small">Open queue</button>
        </div>

        <div className="priority-grid">
          <div className="priority-list">
            {priorityBench.map((item) => (
              <div key={item.title} className={`priority-item ${item.severity}`}>
                <div className="priority-topline">
                  <span className="priority-severity">{item.severity}</span>
                  <span className="priority-owner">{item.owner}</span>
                </div>
                <div className="priority-name">{item.title}</div>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="priority-summary">
            <div className="summary-metric">
              <span className="summary-value">87%</span>
              <span className="summary-label">operator confidence</span>
            </div>
            <div className="summary-grid">
              <div>
                <span className="summary-stat">2.3h</span>
                <span className="summary-label">avg cycle</span>
              </div>
              <div>
                <span className="summary-stat">96.4%</span>
                <span className="summary-label">evidence match</span>
              </div>
              <div>
                <span className="summary-stat">$28.65</span>
                <span className="summary-label">claim value</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ops-summary">
        {operationsSnapshot.map((item) => (
          <div key={item.stage} className={`ops-card ${item.tone}`}>
            <div className="ops-card-header">
              <span className="ops-stage">{item.stage}</span>
              <span className="ops-count">{item.active}</span>
            </div>
            <div className="ops-progress">
              <span style={{ width: `${Math.min((item.done / (item.active + item.done)) * 100, 100)}%` }} />
            </div>
            <div className="ops-meta">
              <span>{item.done} completed</span>
              <span>{item.active} active</span>
            </div>
          </div>
        ))}
      </section>

      <section className="quick-actions-panel panel">
        <div className="panel-header row-between">
          <div className="panel-title">Quick actions</div>
        </div>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.route} className="quick-action-button">
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-analytics">
        <div className="panel chart-panel">
          <div className="panel-header row-between">
            <div className="panel-title">Agent Activity</div>
            <span className="chart-context">5 agent lines</span>
          </div>

          <div className="activity-summary">
            <span>Relative index · each measure scaled to its highest agent</span>
          </div>

          <div className="activity-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={agentActivityProfile} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid stroke="rgba(82, 88, 85, 0.14)" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(67, 140, 107, 0.08)' }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
                <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11 }} />
                {agentSeries.map((agent) => (
                  <Line
                    key={agent.name}
                    type="monotone"
                    dataKey={agent.name}
                    name={agent.name}
                    stroke={agent.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: agent.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <aside className="panel pod-panel">
          <div className="panel-header row-between">
            <div className="panel-title">Pod Health</div>
          </div>

          <div className="pod-block healthy">
            <div className="pod-head">
              <div className="pod-name">Receiving Pod</div>
              <span className="live-pill">Healthy</span>
            </div>
            <div className="pod-meta">12 active · 34 processed</div>
          </div>

          <div className="resource-row compact-row">
            <div className="resource-card danger">
              <div className="resource-value">14</div>
              <div className="resource-label">Returns</div>
            </div>
            <div className="resource-card warning">
              <div className="resource-value">7</div>
              <div className="resource-label">Reviews</div>
            </div>
            <div className="resource-card info">
              <div className="resource-value">11</div>
              <div className="resource-label">Claims</div>
            </div>
          </div>

          <div className="pod-block warning">
            <div className="pod-head">
              <div className="pod-name">Recovery Pod</div>
              <span className="live-pill paused">Review</span>
            </div>
            <div className="pod-meta">6 active · 3 escalated</div>
          </div>

          <div className="pod-block healthy">
            <div className="pod-head">
              <div className="pod-name">Prep / Pack</div>
              <span className="live-pill">On-track</span>
            </div>
            <div className="pod-meta">18 active · 26 completed</div>
          </div>
        </aside>
      </section>

      <section className="operations-lower-grid">
        <article className="panel feed-panel">
          <div className="panel-header row-between">
            <div className="panel-title">Live Activity Feed</div>
            <div className="segment-control compact">
              {(['All', 'Success', 'Failed', 'Paused / Blocked'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={activityFilter === filter ? 'active' : ''}
                  onClick={() => setActivityFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="activity-feed-list">
            {filteredActivity.map((entry) => (
              <div key={`${entry.time}-${entry.unit}`} className="activity-feed-item">
                <div className="feed-avatar">{entry.unit.slice(-2)}</div>
                <div className="feed-copy">
                  <div className="feed-title-row">
                    <strong>{entry.unit}</strong>
                    <StatusBadge label={entry.status} variant={entry.status === 'Success' ? 'success' : entry.status === 'Failed' ? 'danger' : 'warning'} />
                  </div>
                  <div className="feed-meta">{entry.stage} · {entry.event}</div>
                </div>
                <span className="feed-time">{entry.time}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel tools-panel">
          <div className="panel-header row-between">
            <div className="panel-title">Connected tools and services</div>
          </div>

          <div className="tool-list">
            {[
              { name: 'Returns Evidence Vault', detail: 'Photo + condition evidence', state: 'Connected' },
              { name: 'Inventory Sync', detail: 'Stock + route reconciliation', state: 'Healthy' },
              { name: 'Recovery Policy Engine', detail: 'Claim logic and exception checks', state: 'Reviewing' },
              { name: 'Notification layer', detail: 'Internal escalation + human review', state: 'Online' },
            ].map((tool) => (
              <div key={tool.name} className="tool-item">
                <div className="tool-badge" aria-hidden="true" />
                <div className="tool-copy">
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-detail">{tool.detail}</div>
                </div>
                <span className={`tool-state ${tool.state.toLowerCase().replace(/\s+/g, '-')}`}>{tool.state}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function WorkflowsPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'RECOVERY_REQUIRED' | 'IN_PROGRESS' | 'BLOCKED' | 'FAILED' | 'COMPLETED'>('All')

  const filteredWorkflows = workflowRows.filter((workflow) => {
    const matchesQuery =
      workflow.id.toLowerCase().includes(query.toLowerCase()) ||
      workflow.unitId.toLowerCase().includes(query.toLowerCase()) ||
      workflow.product.toLowerCase().includes(query.toLowerCase()) ||
      workflow.sku.toLowerCase().includes(query.toLowerCase())

    const matchesStatus = statusFilter === 'All' || workflow.workflowStatus === statusFilter

    return matchesQuery && matchesStatus
  })

  return (
    <PageTemplate title="Workflows" subtitle="All running and completed commerce workflows">
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search workflows"
          className="search-field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {(['All', 'RECOVERY_REQUIRED', 'IN_PROGRESS', 'BLOCKED', 'FAILED', 'COMPLETED'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`secondary-button small ${statusFilter === filter ? 'active' : ''}`}
            onClick={() => setStatusFilter(filter)}
          >
            {filter === 'All' ? 'All' : filter}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Workflow ID</th>
              <th>Unit</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Route</th>
              <th>Returned</th>
              <th>Current Stage</th>
              <th>Workflow Status</th>
              <th>Final Outcome</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.map((workflow) => (
              <tr key={workflow.id} onClick={() => window.location.assign(`/workflows/${workflow.id}`)}>
                <td><Link to={`/workflows/${workflow.id}`}>{workflow.id}</Link></td>
                <td>{workflow.unitId}</td>
                <td>{workflow.product}</td>
                <td>{workflow.sku}</td>
                <td>{workflow.route}</td>
                <td>{workflow.returned ? 'YES' : 'NO'}</td>
                <td>{workflow.stage}</td>
                <td><StatusBadge label={workflow.workflowStatus} variant={workflow.workflowStatus === 'RECOVERY_REQUIRED' ? 'primary' : workflow.workflowStatus === 'FAILED' || workflow.workflowStatus === 'BLOCKED' ? 'danger' : 'success'} /></td>
                <td><StatusBadge label={workflow.finalOutcome} variant={workflow.finalOutcome === 'CLAIM_RECOMMENDED' ? 'primary' : workflow.finalOutcome === 'NEEDS_REVIEW' ? 'warning' : workflow.finalOutcome === 'INCOMPLETE' ? 'danger' : 'success'} /></td>
                <td>{workflow.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function WorkflowDetailPage() {
  const { id } = useParams()
  const workflow = workflowRows.find((item) => item.id === id) ?? workflowRows[0]

  const workflowChecks = [
    { stage: 'Receiving', state: 'complete', value: 'Carton and invoice match', note: 'Qty: 1 / 1' },
    { stage: 'Prep', state: 'complete', value: 'Condition passed', note: 'No unit damage detected' },
    { stage: 'Pack', state: 'skipped', value: 'Not required for route', note: 'Route disposition bypassed' },
    { stage: 'Returns', state: 'complete', value: 'Return acceptability confirmed', note: 'Approval confidence 96%' },
    { stage: 'Recovery', state: 'active', value: 'Charge contradicted by evidence', note: 'Matched PRP-0014 and RTN-0014' },
  ]

  return (
    <PageTemplate title={workflow.unitId} subtitle={`${workflow.product} · ${workflow.sku}`} breadcrumb={[{ label: 'Overview', to: '/overview' }, { label: 'Workflows', to: '/workflows' }, { label: workflow.id, to: `/workflows/${workflow.id}` }]}> 
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{workflow.unitId}</h2>
              <p>{workflow.product}</p>
            </div>
            <div className="pill-cluster">
              <StatusBadge label={workflow.workflowStatus} variant={workflow.workflowStatus === 'RECOVERY_REQUIRED' ? 'primary' : workflow.workflowStatus === 'FAILED' ? 'danger' : 'success'} />
              <StatusBadge label={workflow.finalOutcome} variant={workflow.finalOutcome === 'CLAIM_RECOMMENDED' ? 'primary' : workflow.finalOutcome === 'NEEDS_REVIEW' ? 'warning' : 'success'} />
            </div>
          </div>

          <div className="action-row">
            <Link to={`/units/${workflow.unitId}`} className="primary-button inline-link">View Evidence</Link>
            <button type="button" className="secondary-button">Resume</button>
            <button type="button" className="tertiary-button">Escalate</button>
          </div>

          <div className="timeline-panel">
            {workflowChecks.map((step) => (
              <div key={step.stage} className={`timeline-item ${step.state}`}>
                <span>{step.stage}</span>
                <div className="timeline-copy">
                  <strong>{step.value}</strong>
                  <small>{step.note}</small>
                </div>
                <span>{step.state === 'complete' ? '✓' : step.state === 'active' ? 'LIVE' : 'SKIPPED'}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Final outcome</div>
            <h3>CLAIM RECOMMENDED</h3>
            <div className="money-line">Claimable <strong>$2.00</strong></div>
            <p>Recovery contradicted an inbound defect charge using upstream evidence from receiving, prep, and returns.</p>
            <div className="record-list">
              <span>RCV-0014</span>
              <span>PRP-0014</span>
              <span>RTN-0014</span>
              <span>RCY-UNIT-0014</span>
            </div>
          </div>

          <div className="side-card">
            <div className="side-label">Decision note</div>
            <p>Agent confidence is 96% and the charge is contradicted by upstream evidence. The workflow is ready for human review or automated closure.</p>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function UnitsPage() {
  const [unitFilter, setUnitFilter] = useState<'All' | 'RECOVERY_REQUIRED' | 'BLOCKED' | 'COMPLETED'>('All')

  const filteredUnits = unitRows.filter((unit) => unitFilter === 'All' || unit.workflowStatus === unitFilter)

  return (
    <PageTemplate title="Units" subtitle="Operational commerce objects and unit trajectories">
      <div className="page-summary-grid">
        <div className="summary-card">
          <span>Total units</span>
          <strong>{unitRows.length}</strong>
        </div>
        <div className="summary-card">
          <span>Needs action</span>
          <strong>{unitRows.filter((unit) => unit.workflowStatus === 'BLOCKED' || unit.workflowStatus === 'RECOVERY_REQUIRED').length}</strong>
        </div>
        <div className="summary-card">
          <span>Finalized</span>
          <strong>{unitRows.filter((unit) => unit.workflowStatus === 'COMPLETED').length}</strong>
        </div>
      </div>

      <div className="toolbar filter-toolbar">
        {(['All', 'RECOVERY_REQUIRED', 'BLOCKED', 'COMPLETED'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`secondary-button small ${unitFilter === filter ? 'active' : ''}`}
            onClick={() => setUnitFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Unit ID</th>
              <th>Product</th>
              <th>SKU</th>
              <th>ASIN</th>
              <th>Organization</th>
              <th>Route</th>
              <th>Returned</th>
              <th>Stage</th>
              <th>Condition</th>
              <th>Disposition</th>
              <th>Workflow Status</th>
              <th>Final Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.map((unit) => (
              <tr key={unit.id}>
                <td><Link to={`/units/${unit.id}`}>{unit.id}</Link></td>
                <td>{unit.product}</td>
                <td>{unit.sku}</td>
                <td>{unit.asin}</td>
                <td>{unit.organization}</td>
                <td>{unit.route}</td>
                <td>{unit.returned}</td>
                <td>{unit.stage}</td>
                <td>{unit.condition}</td>
                <td>{unit.disposition}</td>
                <td><StatusBadge label={unit.workflowStatus} variant={unit.workflowStatus === 'RECOVERY_REQUIRED' ? 'primary' : unit.workflowStatus === 'BLOCKED' ? 'danger' : 'success'} /></td>
                <td><StatusBadge label={unit.finalOutcome} variant={unit.finalOutcome === 'CLAIM_RECOMMENDED' ? 'primary' : unit.finalOutcome === 'NEEDS_REVIEW' ? 'warning' : 'success'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function UnitDetailPage() {
  const { id } = useParams()
  const unit = unitRows.find((item) => item.id === id) ?? unitRows[0]
  const [tab, setTab] = useState<'INBOUND' | 'PACK / PREP' | 'RETURNED'>('RETURNED')

  const evidenceChecks = {
    INBOUND: ['Invoice matched', 'Carton count verified', 'Case seal intact'],
    'PACK / PREP': ['Bundle content verified', 'Condition check passed', 'Packaging baseline reviewed'],
    RETURNED: ['Return reason confirmed', 'Condition compared to expected', 'Recovery documentation attached'],
  }

  return (
    <PageTemplate title={`${unit.product}`} subtitle={`${unit.id} · ${unit.route} · Returned: ${unit.returned}`} breadcrumb={[{ label: 'Overview', to: '/overview' }, { label: 'Units', to: '/units' }, { label: unit.id, to: `/units/${unit.id}` }]}> 
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{unit.product}</h2>
              <p>{unit.id}</p>
            </div>
            <div className="pill-cluster">
              <StatusBadge label={unit.workflowStatus} variant="primary" />
              <StatusBadge label={unit.finalOutcome} variant="warning" />
            </div>
          </div>

          <div className="action-row">
            <Link to={`/workflows/${workflowRows[0].id}`} className="primary-button inline-link">Open Workflow</Link>
            <button type="button" className="secondary-button">View Evidence</button>
            <button type="button" className="tertiary-button">Review</button>
          </div>

          <div className="identity-grid">
            <div className="identity-card">
              <span className="side-label">Product identity</span>
              <h3>{unit.product}</h3>
              <div className="key-value"><span>SKU</span><strong>{unit.sku}</strong></div>
              <div className="key-value"><span>ASIN</span><strong>{unit.asin}</strong></div>
              <div className="key-value"><span>Route</span><strong>{unit.route}</strong></div>
              <div className="key-value"><span>Organization</span><strong>{unit.organization}</strong></div>
            </div>
            <div className="identity-card">
              <span className="side-label">Verification summary</span>
              <ul className="check-list">
                <li>✓ Condition: {unit.condition}</li>
                <li>✓ Disposition: {unit.disposition}</li>
                <li>✓ Returned: {unit.returned}</li>
                <li>✓ Workflow stage: {unit.stage}</li>
              </ul>
            </div>
          </div>

          <div className="tab-row">
            {(['INBOUND', 'PACK / PREP', 'RETURNED'] as const).map((tabKey) => (
              <button key={tabKey} type="button" className={`tab-button ${tab === tabKey ? 'selected' : ''}`} onClick={() => setTab(tabKey)}>{tabKey}</button>
            ))}
          </div>

          <div className="image-grid">
            <div className="placeholder-image">
              <span>{tab} Evidence</span>
            </div>
            <div className="placeholder-image alt">
              <span>Reference snapshot</span>
            </div>
            <div className="placeholder-image alt">
              <span>Inspection details</span>
            </div>
          </div>

          <div className="detail-two-col">
            <div className="compare-card">
              <div className="mini-head">Stage checks</div>
              <ul>
                {evidenceChecks[tab].map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="compare-card">
              <div className="mini-head">Disposition rationale</div>
              <p className="detail-note">The item is most appropriately categorized as {unit.disposition.toLowerCase()} based on condition, route history, and review confidence.</p>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Condition</div>
            <h3>{unit.condition}</h3>
            <p>Observed state: minor wear consistent with prior use.</p>
            <p>Confidence: 92%</p>
          </div>
          <div className="side-card">
            <div className="side-label">Disposition</div>
            <h3>{unit.disposition}</h3>
            <p>Rule set: R11</p>
            <p>Unit requires inspection before relisting or resale to avoid customer-impacting mismatches.</p>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function AgentsPage() {
  return (
    <PageTemplate title="Agents" subtitle="Five specialized operational agents and their live status">
      <div className="page-summary-grid compact">
        <div className="summary-card">
          <span>Healthy agents</span>
          <strong>5</strong>
        </div>
        <div className="summary-card">
          <span>Avg latency</span>
          <strong>4.1s</strong>
        </div>
        <div className="summary-card">
          <span>Uncertain rate</span>
          <strong>6%</strong>
        </div>
      </div>

      <div className="agent-grid">
        {exampleAgents.map((agent) => (
          <Link key={agent.slug} to={`/agents/${agent.slug}`} className="agent-card">
            <div className="agent-card-top">
              <div className="status-dot healthy-dot" />
              <span>{agent.status}</span>
            </div>
            <h3>{agent.title}</h3>
            <div className="meta-stack">
              <span>Stage: {agent.stage}</span>
              <span>Agent ID: {agent.id}</span>
              <span>Owner: {agent.owner}</span>
            </div>
          </Link>
        ))}
      </div>
    </PageTemplate>
  )
}

function AgentDetailPage() {
  const { slug } = useParams()
  const agent = exampleAgents.find((item) => item.slug === slug) ?? exampleAgents[0]

  return (
    <PageTemplate title={agent.title} subtitle={`${agent.stage} · ID ${agent.id}`} breadcrumb={[{ label: 'Overview', to: '/overview' }, { label: 'Agents', to: '/agents' }, { label: agent.title, to: `/agents/${agent.slug}` }]}>
      <div className="agent-detail-grid">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{agent.title}</h2>
              <p>{agent.stage}</p>
            </div>
            <StatusBadge label={agent.status} variant="success" />
          </div>

          <div className="metrics-row">
            <MetricCard label="Runs" value="482" />
            <MetricCard label="Completed" value="451" />
            <MetricCard label="Failures" value="6" />
            <MetricCard label="UNCERTAIN" value="5%" />
            <MetricCard label="Avg Latency" value="4.8s" />
          </div>

          <div className="detail-two-col">
            <div className="compare-card">
              <div className="mini-head">What it checks</div>
              <ul>
                <li>Identity</li>
                <li>Carton count</li>
                <li>Quantity</li>
                <li>Carton damage</li>
                <li>Unit damage</li>
              </ul>
            </div>
            <div className="compare-card">
              <div className="mini-head">Recent runs</div>
              <ul>
                <li>WF-org_demo_alpha-UNIT-0014</li>
                <li>WF-org_demo_alpha-UNIT-0092</li>
                <li>WF-org_demo_alpha-UNIT-0128</li>
              </ul>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Metadata</div>
            <div className="key-value"><span>Stage</span><strong>{agent.stage}</strong></div>
            <div className="key-value"><span>Agent ID</span><strong>{agent.id}</strong></div>
            <div className="key-value"><span>Owner</span><strong>{agent.owner}</strong></div>
            <div className="key-value"><span>Mode</span><strong>{agent.mode}</strong></div>
            <div className="key-value"><span>Status</span><strong>{agent.status}</strong></div>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function ReviewQueuePage() {
  const urgentQueueCount = reviews.filter((review) => Number.parseFloat(review.confidence) < 0.8).length
  const totalEvidence = reviews.reduce((sum, review) => sum + review.evidenceCount, 0)

  return (
    <PageTemplate title="Review Queue" subtitle="Items waiting on human intervention or override">
      <div className="page-summary-grid">
        <div className="summary-card">
          <span>Open reviews</span>
          <strong>{reviews.length}</strong>
        </div>
        <div className="summary-card">
          <span>Urgent</span>
          <strong>{urgentQueueCount}</strong>
        </div>
        <div className="summary-card">
          <span>Evidence assets</span>
          <strong>{totalEvidence}</strong>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Workflow</th>
              <th>Stage</th>
              <th>Problem</th>
              <th>Confidence</th>
              <th>Reason</th>
              <th>Evidence Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.unit}>
                <td>{review.unit}</td>
                <td>{review.workflow}</td>
                <td>{review.stage}</td>
                <td>{review.problem}</td>
                <td>{review.confidence}</td>
                <td>{review.reason}</td>
                <td>{review.evidenceCount}</td>
                <td><button type="button" className="secondary-button small">{review.action}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function RecoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') ?? 'all'

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'claimable', label: 'Claimable' },
    { key: 'supports', label: 'Supports' },
    { key: 'silent', label: 'Silent' },
  ] as const

  const filteredCharges = recoveryCharges.filter((row) => {
    if (activeFilter === 'claimable') return row.decision === 'CLAIM RECOMMENDED'
    if (activeFilter === 'supports') return row.position === 'SUPPORTS'
    if (activeFilter === 'silent') return row.position === 'SILENT'
    return true
  })

  const claimableValue = recoveryCharges
    .filter((row) => row.decision === 'CLAIM RECOMMENDED')
    .reduce((sum, row) => sum + Number.parseFloat(row.amount.replace(/[$,]/g, '')), 0)

  const handleFilter = (next: typeof activeFilter) => {
    if (next === 'all') {
      setSearchParams({})
      return
    }

    setSearchParams({ filter: next })
  }

  return (
    <PageTemplate title="Recovery & Claims" subtitle="Charge review and claim recommendation workflow">
      <div className="metrics-row">
        <MetricCard label="Charges Reviewed" value={String(recoveryCharges.length)} />
        <MetricCard label="Claims Recommended" value={String(recoveryCharges.filter((row) => row.decision === 'CLAIM RECOMMENDED').length)} />
        <MetricCard label="Claimable Value" value={`$${claimableValue.toFixed(2)}`} />
        <MetricCard label="Silent" value={String(recoveryCharges.filter((row) => row.position === 'SILENT').length)} />
      </div>

      <div className="toolbar filter-toolbar">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`secondary-button small ${activeFilter === filter.key ? 'active' : ''}`}
            onClick={() => handleFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Charge ID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Position</th>
              <th>Evidence</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map((row) => (
              <tr key={row.id}>
                <td><Link to={`/recovery/charges/${row.id}`}>{row.id}</Link></td>
                <td>{row.type}</td>
                <td>{row.amount}</td>
                <td><StatusBadge label={row.position} variant={row.position === 'CONTRADICTS' ? 'danger' : row.position === 'SUPPORTS' ? 'success' : 'warning'} /></td>
                <td>{row.evidence}</td>
                <td><StatusBadge label={row.decision} variant={row.decision === 'CLAIM RECOMMENDED' ? 'primary' : 'success'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function RecoveryChargeDetailPage() {
  const { id } = useParams()
  const charge = recoveryCharges.find((item) => item.id === id) ?? recoveryCharges[0]

  return (
    <PageTemplate title={charge.id} subtitle={`${charge.type} · ${charge.amount}`} breadcrumb={[{ label: 'Overview', to: '/overview' }, { label: 'Recovery', to: '/recovery' }, { label: charge.id, to: `/recovery/charges/${charge.id}` }]}>
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <h2>{charge.id}</h2>
              <p>{charge.type}</p>
            </div>
            <StatusBadge label={charge.position} variant={charge.position === 'CONTRADICTS' ? 'danger' : 'warning'} />
          </div>

          <div className="side-card">
            <div className="side-label">Why?</div>
            <p>Prep evidence PRP-0014. Verdict PASS. Therefore charge is contradicted by evidence.</p>
          </div>
        </div>

        <aside className="detail-side">
          <div className="side-card">
            <div className="side-label">Decision</div>
            <h3>{charge.decision}</h3>
            <div className="key-value"><span>Type</span><strong>{charge.type}</strong></div>
            <div className="key-value"><span>Amount</span><strong>{charge.amount}</strong></div>
            <div className="key-value"><span>Evidence</span><strong>{charge.evidence}</strong></div>
          </div>
        </aside>
      </div>
    </PageTemplate>
  )
}

function EvidencePage() {
  const graphNodes = [
    { id: 'workflow', label: 'Workflow', x: 240, y: 70 },
    { id: 'receiving', label: 'Receiving', x: 120, y: 180 },
    { id: 'prep', label: 'Prep', x: 320, y: 180 },
    { id: 'returns', label: 'Returns', x: 520, y: 180 },
    { id: 'recovery', label: 'Recovery', x: 700, y: 180 },
    { id: 'outcome', label: 'Final Outcome', x: 760, y: 70 },
  ]

  const graphEdges = [
    ['workflow', 'receiving'],
    ['workflow', 'prep'],
    ['workflow', 'returns'],
    ['workflow', 'recovery'],
    ['recovery', 'outcome'],
  ]

  return (
    <PageTemplate title="Evidence Explorer" subtitle="Operational evidence relationships and contribution chain">
      <div className="evidence-graph-panel">
        <svg className="evidence-svg" viewBox="0 0 920 420" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {graphEdges.map(([fromId, toId]) => {
            const from = graphNodes.find((node) => node.id === fromId)
            const to = graphNodes.find((node) => node.id === toId)
            if (!from || !to) {
              return null
            }

            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(47, 143, 104, 0.35)"
                strokeWidth="2"
              />
            )
          })}
        </svg>

        <div className="graph-node-grid">
          {graphNodes.map((node) => (
            <div
              key={node.id}
              className="graph-node"
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
            >
              {node.label}
            </div>
          ))}
        </div>
      </div>
    </PageTemplate>
  )
}

function FailuresPage() {
  const totalAttempts = failures.reduce((sum, row) => sum + row.attempts, 0)
  const blockedCount = failures.filter((row) => row.status.includes('BLOCKED')).length
  const escalationRisk = failures.filter((row) => row.errorType === 'TIMEOUT' || row.errorType === 'UNCERTAIN').length

  return (
    <PageTemplate title="Failures" subtitle="Operational failures, retries, and partial workflows">
      <div className="incident-overview">
        <div className="incident-grid">
          <div className="incident-card danger">
            <span className="incident-label">Open incident count</span>
            <strong>{failures.length}</strong>
            <small>Across returns, packing, and recovery.</small>
          </div>
          <div className="incident-card">
            <span className="incident-label">Retry volume</span>
            <strong>{totalAttempts}</strong>
            <small>Attempts recorded in the last cycle.</small>
          </div>
          <div className="incident-card warning">
            <span className="incident-label">Blocked workflows</span>
            <strong>{blockedCount}</strong>
            <small>Awaiting override or human review.</small>
          </div>
        </div>

        <div className="incident-alert">
          <div className="incident-alert-header">
            <span className="side-label">Escalation watch</span>
            <StatusBadge label="ATTENTION" variant="warning" />
          </div>
          <p>{escalationRisk} workflows are showing timeout or uncertainty drift. Recovery and returns remain the most exposed stages this hour.</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Workflow</th>
              <th>Agent</th>
              <th>Stage</th>
              <th>Error Type</th>
              <th>Attempts</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((row) => (
              <tr key={`${row.time}-${row.workflow}`}>
                <td>{row.time}</td>
                <td>{row.workflow}</td>
                <td>{row.agent}</td>
                <td>{row.stage}</td>
                <td>{row.errorType}</td>
                <td>{row.attempts}</td>
                <td><StatusBadge label={row.status} variant="danger" /></td>
                <td><button type="button" className="secondary-button small">{row.action}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  )
}

function AnalyticsPage() {
  return (
    <PageTemplate title="Analytics" subtitle="Agent performance, workflow health, and operational outcomes">
      <div className="metrics-row">
        <MetricCard label="Workflow Volume" value="148" />
        <MetricCard label="UNCERTAIN Rate" value="12%" />
        <MetricCard label="Review Rate" value="8%" />
        <MetricCard label="Failure Rate" value="4%" />
        <MetricCard label="Avg Latency" value="4.1s" />
      </div>

      <div className="stack-grid lower-grid">
        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Agent comparison</div>
              <h2>Operational efficiency</h2>
            </div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData}>
                <XAxis dataKey="agent" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="latency" fill="#2f8f68" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header row-between">
            <div>
              <div className="eyebrow">Outcome distribution</div>
              <h2>Workflows by final state</h2>
            </div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeMix} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} fill="#2f8f68" label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-header row-between">
          <div>
            <div className="eyebrow">Flow map</div>
            <h2>Commerce orchestration pipeline</h2>
          </div>
          <div className="meta-stamp">Live routing</div>
        </div>

        <div className="flow-visual">
          <div className="flow-line line-1" />
          <div className="flow-line line-2" />
          <div className="flow-line line-3" />
          <div className="flow-line line-4" />
          <div className="flow-line line-5" />

          <div className="flow-stage">
            <span className="stage-name">Receiving</span>
            <span className="agent-name">Receiving Manager</span>
            <span className="stage-metrics">92% pass · 4.8s</span>
          </div>
          <div className="flow-stage">
            <span className="stage-name">Prep</span>
            <span className="agent-name">Prep Manager</span>
            <span className="stage-metrics">90% pass · 2.6s</span>
          </div>
          <div className="flow-stage">
            <span className="stage-name">Pack</span>
            <span className="agent-name">Pack Manager</span>
            <span className="stage-metrics">88% pass · 3.1s</span>
          </div>
          <div className="flow-stage">
            <span className="stage-name">Returns</span>
            <span className="agent-name">Returns Manager</span>
            <span className="stage-metrics">83% pass · 6.4s</span>
          </div>
          <div className="flow-stage">
            <span className="stage-name">Recovery</span>
            <span className="agent-name">Recovery Manager</span>
            <span className="stage-metrics">92% pass · 4.1s</span>
          </div>
        </div>
      </article>
    </PageTemplate>
  )
}

function SystemPage() {
  return (
    <PageTemplate title="Pod 05" subtitle="Standard commerce flow · orchestration environment">
      <div className="system-grid">
        <div className="side-card">
          <div className="side-label">Architecture</div>
          <div className="community-stack">
            <span>Receiving</span>
            <span>Prep</span>
            <span>Pack</span>
            <span>Returns</span>
            <span>Recovery</span>
          </div>
        </div>

        <div className="side-card">
          <div className="side-label">Health</div>
          <div className="key-value"><span>5 Agents</span><strong>Healthy</strong></div>
          <div className="key-value"><span>Orchestrator</span><strong>Running</strong></div>
          <div className="key-value"><span>Flow</span><strong>Standard Commerce Flow</strong></div>
        </div>
      </div>

      <div className="system-grid">
        <div className="side-card">
          <div className="side-label">Connected services</div>
          <div className="community-stack">
            <span>Inventory sync · Healthy</span>
            <span>Evidence vault · Healthy</span>
            <span>Recovery policy engine · Reviewing</span>
            <span>Notification layer · Online</span>
          </div>
        </div>

        <div className="side-card">
          <div className="side-label">Pod status</div>
          <div className="key-value"><span>Environment</span><strong>Production-like</strong></div>
          <div className="key-value"><span>Change window</span><strong>01:00 UTC</strong></div>
          <div className="key-value"><span>Operator</span><strong>Pod 05 / demo_alpha</strong></div>
        </div>
      </div>
    </PageTemplate>
  )
}

function NotFoundPage() {
  return (
    <PageTemplate title="Page not found" subtitle="The route does not exist in this operations shell.">
      <div className="side-card">
        <p>Return to the overview and continue from there.</p>
      </div>
    </PageTemplate>
  )
}

function PageTemplate({ title, subtitle, breadcrumb, children }: { title: string; subtitle: string; breadcrumb?: { label: string; to: string }[]; children: React.ReactNode }) {
  return (
    <div className="page-shell">
      {breadcrumb ? (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumb.map((item) => (
            <div key={item.to} className="breadcrumb-item">
              <Link to={item.to}>{item.label}</Link>
              <ChevronRight size={12} />
            </div>
          ))}
        </nav>
      ) : null}
      <div className="page-header">
        <div>
          <div className="eyebrow">Operations</div>
          <h1>{title}</h1>
        </div>
        <div className="page-subtitle">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ label, variant }: { label: string; variant: 'success' | 'danger' | 'warning' | 'primary' }) {
  return <span className={`status-badge ${variant}`}>{label}</span>
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

export default App
