export interface AmazonRule {
  id: number
  charge_type: string
  name: string
  policy_status: string
  rule_text: string
  source_url: string
  linked_policy_urls: string[]
  claim_window_days: number | null
  claim_window_range_days?: [number, number]
  valuation: string | null
  evidence_requirements: string[]
  verification_note: string
}

export const AMAZON_RULES_CATALOG: AmazonRule[] = [
  {
    id: 2001,
    charge_type: 'inbound_defect_fee',
    name: 'FBA preparation, packing, and labeling requirements',
    policy_status: 'needs_verification',
    rule_text:
      'Working assumption: contest an inbound defect when a relevant prep check passed before the charge, the shipment and unit can be matched, and the charge is not already reimbursed.',
    source_url: 'https://sell.amazon.com/fulfillment-by-amazon',
    linked_policy_urls: [
      'https://sellercentral.amazon.com/help/hub/reference/external/G201030350',
      'https://sellercentral.amazon.com/help/hub/reference/external/G201021850',
    ],
    claim_window_days: null,
    valuation: null,
    evidence_requirements: ['prep evidence before charge event', 'shipment_id', 'applicable check key'],
    verification_note: 'Prep details cross-referenced against physical intake evidence.',
  },
  {
    id: 2002,
    charge_type: 'lost_inbound',
    name: 'FBA inventory receiving and loss policy',
    policy_status: 'conflicting',
    rule_text:
      'A lost-inbound claim requires shipment identity, carrier proof of delivery, ownership documentation, and shipped-vs-received dock reconciliation.',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/G201022330',
    linked_policy_urls: ['https://sellercentral.amazon.com/help/hub/reference/external/G201022330'],
    claim_window_days: null,
    claim_window_range_days: [15, 60],
    valuation: 'manufacturing_or_sourcing_cost_for_pre_order_loss',
    evidence_requirements: ['shipment_id', 'proof_of_ownership', 'proof_of_delivery', 'dock_reconciliation'],
    verification_note: 'Reconciles carrier delivery event with warehouse receiving shortfall.',
  },
  {
    id: 2003,
    charge_type: 'damaged_in_warehouse',
    name: 'FBA inventory damage and reimbursement policy',
    policy_status: 'verified_summary',
    rule_text:
      'Warehouse damage is reimbursable when the item was documented sellable and intact at receipt, and damage occurred while in fulfillment center custody.',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/G201443070',
    linked_policy_urls: ['https://sellercentral.amazon.com/help/hub/reference/G201443070'],
    claim_window_days: 60,
    valuation: 'manufacturing_or_sourcing_cost_for_pre_order_loss',
    evidence_requirements: ['proof_item_was_undamaged_at_receipt', 'shipping_documentation', 'custody_records'],
    verification_note: 'Excludes items damaged prior to carrier delivery or customer returns.',
  },
  {
    id: 2004,
    charge_type: 'refund_issued_item_not_returned',
    name: 'FBA customer returns and reimbursement policy',
    policy_status: 'verified_summary',
    rule_text:
      'A refund or replacement without a returned item is recoverable after the 60-day customer return window when the order and missing return are evidenced.',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/G200379860',
    linked_policy_urls: [
      'https://sellercentral.amazon.com/help/hub/reference/external/G200379860',
      'https://sellercentral.amazon.com/help/hub/reference/G201443070',
    ],
    claim_window_days: 60,
    claim_window_range_days: [60, 120],
    valuation: 'refund_or_replacement_sales_price_minus_applicable_fees',
    evidence_requirements: ['amazon_order_id', 'refund_date', 'return_not_received_in_inventory'],
    verification_note: 'Dispute validated when customer refund was processed but physical unit never arrived.',
  },
  {
    id: 2005,
    charge_type: 'fulfilment_fee_weight_tier',
    name: 'FBA fulfilment fee and packaging requirements',
    policy_status: 'verified_summary',
    rule_text:
      'Contest an automated fulfilment fee weight tier discrepancy when packaging measurements and product identity confirm tier compliance predating the charge.',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/G200141500',
    linked_policy_urls: [
      'https://sellercentral.amazon.com/help/hub/reference/external/G200141500',
      'https://sellercentral.amazon.com/help/hub/reference/external/G201030350',
    ],
    claim_window_days: 90,
    valuation: 'fee_difference_reimbursement',
    evidence_requirements: ['prep_package_measurements', 'fnsku_label_flat', 'unit_undamaged'],
    verification_note: 'Finding F-07: In absence of physical prep measurements upstream, charge remains SILENT.',
  },
]
