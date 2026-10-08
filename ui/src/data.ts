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

export interface RecoveryChargeItem {
  id: string
  workflowId: string
  type: string
  amount: string
  amountNum: number
  position: 'CONTRADICTS' | 'SUPPORTS' | 'SILENT' | string
  evidence: string
  evidenceIds: string[]
  decision: 'CLAIM RECOMMENDED' | 'NO CLAIM' | string
  reason: string
}

export const recoveryCharges: RecoveryChargeItem[] = [
  {
    id: 'FEE-0014-1',
    workflowId: 'WF-org_demo_alpha-UNIT-0014',
    type: 'Inbound Defect Fee',
    amount: '$2.00',
    amountNum: 2.0,
    position: 'CONTRADICTS',
    evidence: 'PRP-0014',
    evidenceIds: ['PRP-0014'],
    decision: 'CLAIM RECOMMENDED',
    reason: 'Upstream prep evidence PRP-0014 registered a verdict of PASS (compliant packaging, zero unit damage). Defect fee is contradicted by physical inspection records.',
  },
  {
    id: 'FEE-0014-2',
    workflowId: 'WF-org_demo_alpha-UNIT-0014',
    type: 'Lost Inbound Fee',
    amount: '$0.00',
    amountNum: 0.0,
    position: 'SILENT',
    evidence: 'RCV-0014',
    evidenceIds: ['RCV-0014'],
    decision: 'NO CLAIM',
    reason: 'Receiving shortfall is supplier-side (vendor short shipment), not channel-side loss (Finding F-10).',
  },
  {
    id: 'FEE-0014-3',
    workflowId: 'WF-org_demo_alpha-UNIT-0014',
    type: 'Weight Tier Fee',
    amount: '$4.75',
    amountNum: 4.75,
    position: 'SILENT',
    evidence: 'No weight record',
    evidenceIds: [],
    decision: 'NO CLAIM',
    reason: 'No measured scale weight or carton dimensions registered upstream (Finding F-07).',
  },
  {
    id: 'FEE-0014-4',
    workflowId: 'WF-org_demo_alpha-UNIT-0014',
    type: 'Refund Item Not Returned',
    amount: '$15.50',
    amountNum: 15.5,
    position: 'CONTRADICTS',
    evidence: 'RTN-0014',
    evidenceIds: ['RTN-0014'],
    decision: 'CLAIM RECOMMENDED',
    reason: 'Returns Manager RTN-0014 confirmed unit was returned and processed with disposition restock. Dispute claim recommended under Finding F-11.',
  },
  {
    id: 'FEE-0018-1',
    workflowId: 'WF-org_demo_alpha-UNIT-0018',
    type: 'Refund Item Not Returned',
    amount: '$24.99',
    amountNum: 24.99,
    position: 'CONTRADICTS',
    evidence: 'RTN-0018',
    evidenceIds: ['RTN-0018'],
    decision: 'CLAIM RECOMMENDED',
    reason: 'Returns Manager RTN-0018 verified physical item receipt and completed restock inspection. Channel refund is invalid under Finding F-11.',
  },
  {
    id: 'FEE-0021-1',
    workflowId: 'WF-org_demo_alpha-UNIT-0021',
    type: 'Inbound Defect Fee',
    amount: '$3.50',
    amountNum: 3.5,
    position: 'CONTRADICTS',
    evidence: 'PRP-0021',
    evidenceIds: ['PRP-0021'],
    decision: 'CLAIM RECOMMENDED',
    reason: 'Prep inspection record verified item arrived sealed with intact secondary polybagging.',
  },
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

export interface ExampleAgentItem {
  slug: string
  title: string
  stage: string
  id: string
  owner: string
  mode: string
  status: 'INTEGRATED' | 'STARTER STUB'
  description: string
  details?: {
    checks: string[]
    stages: string[]
    responsibilities: string[]
  }
}

export const exampleAgents: ExampleAgentItem[] = [
  {
    slug: 'receiving',
    title: 'Receiving Manager',
    stage: 'Receiving',
    id: 'receiving-manager-rcv0138@2',
    owner: '@KiranTejz20005',
    mode: 'INPROC',
    status: 'INTEGRATED',
    description: 'Inbound PO matching, carton inspection, serial registration & discrepancy flagging.',
    details: {
      checks: [
        'Identity matching against PO and Carton barcodes',
        'Visual integrity inspection and carton damage scoring',
        'Supplier shortfall detection vs channel-side loss (Finding F-10)',
        'Carrier bill of lading tracking code reconciliation',
      ],
      stages: ['Inbound Dock Intake', 'Physical Carton Inspection', 'Discrepancy Triage'],
      responsibilities: ['PO Verification', 'Damage Flagging', 'Shortfall Attribution'],
    },
  },
  {
    slug: 'prep',
    title: 'Prep Manager',
    stage: 'Prep',
    id: 'prep-stub@0',
    owner: '@mdsuhana231-gif',
    mode: 'INPROC',
    status: 'STARTER STUB',
    description: 'Packaging compliance, barcode labeling, polybagging, and prep checks.',
    details: {
      checks: [
        'Polybag suffocation warning label validation',
        'FNSKU and UPC item scannability audit',
        'Fragile bubble-wrap cushioning check',
        'Multipack grouping integrity verification',
      ],
      stages: ['Prep Staging', 'Secondary Packaging', 'Labeling'],
      responsibilities: ['Polybag Compliance', 'Label Inspection', 'Item Sealing'],
    },
  },
  {
    slug: 'pack',
    title: 'Pack Manager',
    stage: 'Pack',
    id: 'pack-stub@0',
    owner: '@nikhilagarwal03',
    mode: 'INPROC',
    status: 'STARTER STUB',
    description: 'Outbound dunnage, box size selection, weight validation, and carrier manifests.',
    details: {
      checks: [
        'Outbound box size optimization and cube utilization',
        'Dunnage packing material sufficiency',
        'Package scale tare weight capture',
        'Carrier shipping label verification',
      ],
      stages: ['Box Selection', 'Dunnage Insertion', 'Final Manifesting'],
      responsibilities: ['Box Selection', 'Weight Capture', 'Carrier Hand-off'],
    },
  },
  {
    slug: 'returns',
    title: 'Returns Manager',
    stage: 'Returns',
    id: 'returns-manager-rtn0045@2',
    owner: '@upeshchowdary',
    mode: 'INPROC',
    status: 'INTEGRATED',
    description: 'RMA validation, 30-day window check, tamper/damage triage, and restock/liquidate disposition.',
    details: {
      checks: [
        'Return window eligibility validation (30-day policy rule check)',
        'Physical package and item condition inspection with defect attribution',
        'Tamper seal and security band integrity evaluation',
        'Automatic disposition determination (restock, liquidate, refurbish, destroy)',
        'Cross-agent linkage: Supplies verified proof to Recovery Manager to dispute refund charges (Finding F-11)',
      ],
      stages: ['RMA Intake & Receipt', 'Condition & Tamper Triage', 'Disposition & Recovery Linking'],
      responsibilities: ['RMA Authorization', 'Triage Scoring', 'F-11 Recovery Proof'],
    },
  },
  {
    slug: 'recovery',
    title: 'Recovery Manager',
    stage: 'Recovery',
    id: 'recovery-vishruth@1',
    owner: '@vishruth-16',
    mode: 'INPROC',
    status: 'INTEGRATED',
    description: 'Channel charge audit, upstream contradiction discovery (F-07, F-09, F-10, F-11), and recovery dispute filing.',
    details: {
      checks: [
        'Automated audit of distributor fee deductions against prior stage evidence',
        'Cross-referencing Prep inspection to contradict Inbound Defect Fees',
        'Cross-referencing Returns restock evidence to contradict unreturned item refund charges (Finding F-11)',
        'Zero-amount fee filtering (Finding F-09) and missing tare weight detection (Finding F-07)',
        'Supplier-side inbound shortfall exclusion from distributor claims (Finding F-10)',
      ],
      stages: ['Charge Ingestion', 'Evidence Cross-Audit', 'Dispute Claim Generation'],
      responsibilities: ['Fee Audit', 'Contradiction Detection', 'Recovery Claim Submission'],
    },
  },
]
