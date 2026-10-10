export interface SampleUnit {
  unit_id: string
  org_id: string
  route: string
  returned: boolean
  label: string
  description: string
  expectedOutcome: string
}

export const SAMPLE_UNITS: SampleUnit[] = [
  {
    unit_id: 'UNIT-0014',
    org_id: 'org_demo_alpha',
    route: 'fba',
    returned: true,
    label: 'UNIT-0014 (FBA + Returns Inspection)',
    description: 'FBA customer return with photos. Evaluated by Gemini multimodal Returns Manager and Sydon Recovery Engine.',
    expectedOutcome: 'NEEDS_REVIEW',
  },
  {
    unit_id: 'UNIT-0004',
    org_id: 'org_demo_alpha',
    route: 'fba',
    returned: false,
    label: 'UNIT-0004 (FBA Direct Inbound)',
    description: 'FBA item routing through Receiving and Recovery. Pack and Returns are skipped; missing Prep is treated as SILENT.',
    expectedOutcome: 'EXCEPTION',
  },
  {
    unit_id: 'UNIT-0006',
    org_id: 'org_demo_bravo',
    route: 'mfn',
    returned: false,
    label: 'UNIT-0006 (MFN Merchant Fulfillment)',
    description: 'Merchant-fulfilled unit routing through Receiving, in-process Pack, and Recovery. Returns is skipped.',
    expectedOutcome: 'CLEAN',
  },
  {
    unit_id: 'UNIT-0016',
    org_id: 'org_demo_alpha',
    route: 'mfn',
    returned: true,
    label: 'UNIT-0016 (MFN Full Chain + Return)',
    description: 'Merchant-fulfilled return unit. Executes all 4 Specialist stages: Receiving, Pack, Returns, and Recovery.',
    expectedOutcome: 'INCOMPLETE / REVIEW',
  },
  {
    unit_id: 'UNIT-0001',
    org_id: 'org_demo_alpha',
    route: 'unknown',
    returned: false,
    label: 'UNIT-0001 (Baseline Inbound Receipt)',
    description: 'Unit with unknown fulfillment route. Runs Receiving and Recovery.',
    expectedOutcome: 'CLEAN',
  },
]
