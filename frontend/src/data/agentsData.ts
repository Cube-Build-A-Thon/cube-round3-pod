export type AgentStage = 'receiving' | 'pack' | 'returns' | 'recovery' | 'prep'

export interface PodAgentMeta {
  stage: AgentStage
  name: string
  role: string
  agent_id: string
  owner: string
  mode: 'inproc' | 'http'
  url: string
  module: string
  implementation: string
  summary: string
  readsInputs: string
  readsPreviousEvidence: string
  produces: string
  recommendedChecks: string[]
  outcomes: string[]
  podNotes: string
  routingCondition: string
}

export interface SpecialistRoleMeta {
  role: string
  title: string
  lead: string
  github: string
  description: string
  responsibilities: string[]
}

export const SPECIALIST_ROLE: SpecialistRoleMeta = {
  role: 'Specialist / Integration Engineer',
  title: 'Pod Architecture & Integration Lead',
  lead: 'Vrajesh Chary',
  github: '@VrajeshChary',
  description:
    'In a Specialist Pod, the Prep seat is replaced by the Specialist / Integration Engineer. The Specialist coordinates cross-agent architecture, evidence contract verification, deterministic rollup rules, and end-to-end integration.',
  responsibilities: [
    'Cross-agent schema validation and immutable evidence contract enforcement',
    'Specialist Pod flow configuration (Receiving -> Pack -> Returns -> Recovery)',
    'Missing Prep semantics handling (FBA units have no Prep evidence; Recovery treats inbound defects as SILENT)',
    'Deterministic decision rollup logic (Decision D-007) and human supervisor override engine',
  ],
}

export const POD_AGENTS: PodAgentMeta[] = [
  {
    stage: 'receiving',
    name: 'Receiving Manager',
    role: 'Stage 1 (Receiving)',
    agent_id: 'receiving-manager@1.0.0',
    owner: 'Nithesh (@nithesh33758)',
    mode: 'inproc',
    url: 'http://localhost:8101',
    module: 'agents.receiving.app',
    implementation: 'Multimodal Visual Receiving Inspection & Reconciliation',
    summary:
      'Evaluates incoming supplier deliveries against purchase orders: multimodal vision for packaging/labels and deterministic checks for identity, count, carton/unit damage, and quality flags.',
    readsInputs: 'Photos at the point of receipt (pallet, carton, unit) and purchase order lines.',
    readsPreviousEvidence: 'None — first agent in the commerce chain.',
    produces: 'Identity verification, quantity check, carton count, damage assessment, and quality flags.',
    recommendedChecks: [
      'identity_match',
      'carton_count',
      'quantity',
      'carton_damage',
      'unit_damage',
      'quality_flags',
    ],
    outcomes: ['accept', 'accept_with_exceptions', 'reject', 'pending_review'],
    podNotes:
      'Always runs for every workflow case. Multimodal inspection observes incoming freight; deterministic rules decide accept/reject.',
    routingCondition: 'Always runs for every workflow case.',
  },
  {
    stage: 'pack',
    name: 'Pack Manager',
    role: 'Stage 2 (Pack)',
    agent_id: 'pack-manager@1',
    owner: 'Devika Singh (@devikasingh197)',
    mode: 'inproc',
    url: 'http://localhost:8103',
    module: 'agents.pack.app',
    implementation: 'Gemini Pack Manager',
    summary:
      'Inspects open boxes before sealing for merchant-fulfilled (MFN) shipments: verifies item presence, quantities, and flags extra or missing items.',
    readsInputs: 'Photo of the open box before sealing and customer order lines.',
    readsPreviousEvidence: 'Receiving Evidence Record.',
    produces: 'Box contents verification: seal or stop-and-fix recommendation.',
    recommendedChecks: ['items_present', 'quantities_correct', 'no_extra_items'],
    outcomes: ['seal', 'stop_and_fix', 'pending_review'],
    podNotes:
      'Merchant-fulfilled (MFN) units only (Amazon packs FBA boxes). Runs in-process.',
    routingCondition: 'when: route == "mfn"',
  },
  {
    stage: 'returns',
    name: 'Returns Manager',
    role: 'Stage 3 (Returns)',
    agent_id: 'returns-manager@1.0.0',
    owner: 'Vrajesh Chary (@VrajeshChary)',
    mode: 'inproc',
    url: 'http://localhost:8104',
    module: 'agents.returns.app',
    implementation: 'Multimodal Vision Returns Inspection',
    summary:
      'Inspects returned customer parcels using Google Gemini multimodal vision: verifies identity against catalog, confirms completeness, evaluates physical condition, and decides warehouse disposition.',
    readsInputs: 'Photos of the returned parcel/unit and expected catalog item details.',
    readsPreviousEvidence: 'Pack (what was sent) or Receiving (arrival baseline).',
    produces: 'Identity match, completeness check, condition grade, and warehouse disposition.',
    recommendedChecks: ['identity_match', 'completeness', 'condition'],
    outcomes: ['restock', 'refurbish', 'liquidate', 'dispose', 'pending_review'],
    podNotes:
      'Source of truth for operational warehouse disposition (restock, refurbish, liquidate, dispose, pending_review). Uses Google GenAI multimodal inspection.',
    routingCondition: 'when: returned == true',
  },
  {
    stage: 'recovery',
    name: 'Recovery Manager',
    role: 'Stage 4 (Recovery)',
    agent_id: 'recovery-manager@1.0.0',
    owner: 'Nithesh (@nithesh33758)',
    mode: 'inproc',
    url: 'http://localhost:8105',
    module: 'agents.recovery.app',
    implementation: 'Sydon Claims Engine',
    summary:
      'Cross-references channel fee reports against upstream evidence. In this Specialist Pod (no Prep Manager), FBA units get no Prep evidence, so Recovery treats inbound-defect charges as SILENT without filing false claims.',
    readsInputs: 'Channel fee and reimbursement report lines (e.g., inbound defect fees, weight-tier fees).',
    readsPreviousEvidence: 'Accumulated upstream evidence (Receiving, Pack, Returns). Missing Prep evidence is treated as SILENT.',
    produces: 'Per-charge verdict (contradicts/supports/silent), claimable dollar amounts, and attached evidence.',
    recommendedChecks: ['charge_<fee_line_id> (per fee line)'],
    outcomes: ['claim_recommended', 'no_claim', 'insufficient_evidence', 'pending_review'],
    podNotes:
      'FAIL verdict in Recovery means the charge is contradicted by upstream evidence, leading to CLAIM_RECOMMENDED. Missing Prep evidence is SILENT (no claim filed).',
    routingCondition: 'Always runs as the final stage of the workflow.',
  },
]
