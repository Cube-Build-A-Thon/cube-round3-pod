export type WorkflowStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'RECOVERY_REQUIRED'

export type FinalOutcome =
  | 'CLEAN'
  | 'CLAIM_RECOMMENDED'
  | 'EXCEPTION'
  | 'NEEDS_REVIEW'
  | 'INCOMPLETE'

export type AgentName = 'Receiving Manager' | 'Prep Manager' | 'Pack Manager' | 'Returns Manager' | 'Recovery Manager'

export type WorkflowRow = {
  id: string
  unitId: string
  product: string
  sku: string
  route: 'FBA' | 'MFN'
  returned: boolean
  stage: string
  workflowStatus: WorkflowStatus
  finalOutcome: FinalOutcome
  needsHuman: boolean
  updated: string
  confidence: number
}

export const workflowRows: WorkflowRow[] = [
  {
    id: 'WF-org_demo_alpha-UNIT-0014',
    unitId: 'UNIT-0014',
    product: 'LED Desk Lamp',
    sku: 'SKU-LAMP-LED',
    route: 'FBA',
    returned: true,
    stage: 'Recovery',
    workflowStatus: 'RECOVERY_REQUIRED',
    finalOutcome: 'CLAIM_RECOMMENDED',
    needsHuman: false,
    updated: '2 min ago',
    confidence: 96,
  },
  {
    id: 'WF-org_demo_alpha-UNIT-0021',
    unitId: 'UNIT-0021',
    product: 'Jigsaw Puzzle',
    sku: 'SKU-JIG-0021',
    route: 'FBA',
    returned: true,
    stage: 'Returns',
    workflowStatus: 'IN_PROGRESS',
    finalOutcome: 'NEEDS_REVIEW',
    needsHuman: true,
    updated: '9 min ago',
    confidence: 74,
  },
  {
    id: 'WF-org_demo_alpha-UNIT-0092',
    unitId: 'UNIT-0092',
    product: 'Vitamin C Face Serum',
    sku: 'SKU-SERUM-0092',
    route: 'MFN',
    returned: false,
    stage: 'Receiving',
    workflowStatus: 'BLOCKED',
    finalOutcome: 'NEEDS_REVIEW',
    needsHuman: true,
    updated: '14 min ago',
    confidence: 58,
  },
  {
    id: 'WF-org_demo_alpha-UNIT-0128',
    unitId: 'UNIT-0128',
    product: 'Steel Water Bottle',
    sku: 'SKU-BTL-0128',
    route: 'FBA',
    returned: true,
    stage: 'Final Outcome',
    workflowStatus: 'COMPLETED',
    finalOutcome: 'CLEAN',
    needsHuman: false,
    updated: '1 hr ago',
    confidence: 98,
  },
  {
    id: 'WF-org_demo_alpha-UNIT-0134',
    unitId: 'UNIT-0134',
    product: 'USB-C Cable',
    sku: 'SKU-CABLE-0134',
    route: 'MFN',
    returned: false,
    stage: 'Pack',
    workflowStatus: 'FAILED',
    finalOutcome: 'INCOMPLETE',
    needsHuman: false,
    updated: '32 min ago',
    confidence: 41,
  },
]

export const unitRows = [
  {
    id: 'UNIT-0014',
    product: 'LED Desk Lamp',
    sku: 'SKU-LAMP-LED',
    asin: 'B0DUMMY357',
    organization: 'org_demo_alpha',
    route: 'FBA',
    returned: 'YES',
    stage: 'Recovery',
    condition: 'Used - Very Good',
    disposition: 'REFURBISH',
    workflowStatus: 'RECOVERY_REQUIRED',
    finalOutcome: 'CLAIM_RECOMMENDED',
  },
  {
    id: 'UNIT-0021',
    product: 'Jigsaw Puzzle',
    sku: 'SKU-JIG-0021',
    asin: 'B0DUMMY202',
    organization: 'org_demo_alpha',
    route: 'FBA',
    returned: 'YES',
    stage: 'Returns',
    condition: 'Used - Good',
    disposition: 'PENDING REVIEW',
    workflowStatus: 'BLOCKED',
    finalOutcome: 'NEEDS_REVIEW',
  },
  {
    id: 'UNIT-0092',
    product: 'Vitamin C Face Serum',
    sku: 'SKU-SERUM-0092',
    asin: 'B0DUMMY902',
    organization: 'org_demo_alpha',
    route: 'MFN',
    returned: 'NO',
    stage: 'Receiving',
    condition: 'New',
    disposition: 'RESTOCK',
    workflowStatus: 'BLOCKED',
    finalOutcome: 'NEEDS_REVIEW',
  },
  {
    id: 'UNIT-0128',
    product: 'Steel Water Bottle',
    sku: 'SKU-BTL-0128',
    asin: 'B0DUMMY128',
    organization: 'org_demo_alpha',
    route: 'FBA',
    returned: 'YES',
    stage: 'Final Outcome',
    condition: 'Excellent',
    disposition: 'RESTOCK',
    workflowStatus: 'COMPLETED',
    finalOutcome: 'CLEAN',
  },
]

export const attentionRows = [
  { unit: 'UNIT-0092', stage: 'Returns', problem: 'Insufficient visual evidence', confidence: '0.58', time: '14 min ago', action: 'Review', status: 'UNCERTAIN' },
  { unit: 'UNIT-0021', stage: 'Returns', problem: 'Condition mismatch', confidence: '0.74', time: '9 min ago', action: 'Open', status: 'BLOCKED' },
  { unit: 'UNIT-0134', stage: 'Pack', problem: 'Items missing from MFN box', confidence: '0.41', time: '32 min ago', action: 'Resume', status: 'FAILED', supportResume: true },
  { unit: 'UNIT-0014', stage: 'Recovery', problem: 'Inbound defect charge contradicted', confidence: '0.96', time: '2 min ago', action: 'Open', status: 'RECOVERY_REQUIRED' },
]

export const agentHealth = [
  { name: 'Receiving Manager', status: 'HEALTHY', runs: 482, latency: '4.8s', failures: 6, uncertain: 5 },
  { name: 'Prep Manager', status: 'HEALTHY', runs: 391, latency: '2.6s', failures: 3, uncertain: 8 },
  { name: 'Pack Manager', status: 'HEALTHY', runs: 264, latency: '3.1s', failures: 9, uncertain: 7 },
  { name: 'Returns Manager', status: 'HEALTHY', runs: 149, latency: '6.4s', failures: 2, uncertain: 18 },
  { name: 'Recovery Manager', status: 'HEALTHY', runs: 108, latency: '4.1s', failures: 1, uncertain: 3 },
]

export const outcomeMix = [
  { name: 'CLEAN', value: 42 },
  { name: 'CLAIM RECOMMENDED', value: 26 },
  { name: 'EXCEPTION', value: 12 },
  { name: 'NEEDS REVIEW', value: 15 },
  { name: 'INCOMPLETE', value: 5 },
]

export const recentActivity = [
  { time: '08:42', unit: 'UNIT-0014', stage: 'Recovery', event: 'Returns inspection completed', status: 'Success' },
  { time: '08:19', unit: 'UNIT-0014', stage: 'Recovery', event: 'Recovery charge contradicted', status: 'Failed' },
  { time: '07:58', unit: 'UNIT-0092', stage: 'Returns', event: 'Workflow became blocked', status: 'Paused / Blocked' },
  { time: '07:42', unit: 'UNIT-0134', stage: 'Pack', event: 'Agent timeout recorded', status: 'Failed' },
  { time: '07:24', unit: 'UNIT-0128', stage: 'Final Outcome', event: 'Workflow resumed', status: 'Success' },
  { time: '07:06', unit: 'UNIT-0021', stage: 'Returns', event: 'Human override created', status: 'Success' },
]

export const reviews = [
  { unit: 'UNIT-0092', workflow: 'WF-org_demo_alpha-UNIT-0092', stage: 'Returns', problem: 'Insufficient visual evidence', confidence: '0.58', reason: 'Identity checks pass, but condition image is missing.', evidenceCount: 4, action: 'Review Evidence' },
  { unit: 'UNIT-0021', workflow: 'WF-org_demo_alpha-UNIT-0021', stage: 'Recovery', problem: 'Charge contradicted by upstream evidence', confidence: '0.79', reason: 'Prep evidence contradicts the inbound defect fee.', evidenceCount: 3, action: 'Apply Override' },
]

export const recoveryCharges = [
  { id: 'FEE-0014-1', type: 'Inbound Defect Fee', amount: '$2.00', position: 'CONTRADICTS', evidence: 'PRP-0014', decision: 'CLAIM RECOMMENDED' },
  { id: 'FEE-0014-2', type: 'Weight Tier Fee', amount: '$4.75', position: 'SILENT', evidence: 'No weight evidence', decision: 'NO CLAIM' },
  { id: 'FEE-0014-3', type: 'Return Handling Fee', amount: '$1.90', position: 'SUPPORTS', evidence: 'RTN-0014', decision: 'NO CLAIM' },
]

export const failures = [
  { time: '08:12', workflow: 'WF-org_demo_alpha-UNIT-0134', agent: 'Pack Manager', stage: 'Pack', errorType: 'TIMEOUT', attempts: 3, status: 'FAILED / INCOMPLETE', action: 'Resume Workflow' },
  { time: '07:49', workflow: 'WF-org_demo_alpha-UNIT-0092', agent: 'Returns Manager', stage: 'Returns', errorType: 'UNCERTAIN', attempts: 2, status: 'BLOCKED', action: 'Review' },
]

export const analyticsData = [
  { agent: 'Receiving', runs: 482, pass: 92, fail: 4, uncertain: 4, latency: 4.8 },
  { agent: 'Prep', runs: 391, pass: 90, fail: 3, uncertain: 7, latency: 2.6 },
  { agent: 'Pack', runs: 264, pass: 88, fail: 7, uncertain: 5, latency: 3.1 },
  { agent: 'Returns', runs: 149, pass: 83, fail: 3, uncertain: 14, latency: 6.4 },
  { agent: 'Recovery', runs: 108, pass: 92, fail: 2, uncertain: 6, latency: 4.1 },
]

export const evidenceGraph = [
  { id: 'WF-0014', label: 'Workflow', value: 1 },
  { id: 'RCV-0014', label: 'Receiving', value: 2 },
  { id: 'PRP-0014', label: 'Prep', value: 2 },
  { id: 'RTN-0014', label: 'Returns', value: 2 },
  { id: 'RCY-UNIT-0014', label: 'Recovery', value: 2 },
  { id: 'Outcome', label: 'Final Outcome', value: 1 },
]

export const exampleAgents = [
  { slug: 'receiving', title: 'Receiving Manager', stage: 'Receiving', id: 'AGENT-RCV-01', owner: 'Ops Team A', mode: 'AUTO', status: 'HEALTHY' },
  { slug: 'prep', title: 'Prep Manager', stage: 'Prep', id: 'AGENT-PRP-01', owner: 'Ops Team B', mode: 'AUTO', status: 'HEALTHY' },
  { slug: 'pack', title: 'Pack Manager', stage: 'Pack', id: 'AGENT-PKG-01', owner: 'Ops Team C', mode: 'AUTO', status: 'HEALTHY' },
  { slug: 'returns', title: 'Returns Manager', stage: 'Returns', id: 'AGENT-RTN-01', owner: 'Ops Team D', mode: 'AUTO', status: 'HEALTHY' },
  { slug: 'recovery', title: 'Recovery Manager', stage: 'Recovery', id: 'AGENT-RCY-01', owner: 'Ops Team E', mode: 'AUTO', status: 'HEALTHY' },
]
