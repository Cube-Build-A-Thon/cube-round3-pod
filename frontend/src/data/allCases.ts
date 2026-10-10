export interface UnitCase {
  unit_id: string
  org_id: string
  route: string
  returned: boolean
  has_fees: boolean
  fee_types: string[]
}

export const ALL_UNIT_CASES: UnitCase[] = [
  {
    "unit_id": "UNIT-0001",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0002",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0003",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "lost_inbound"
    ]
  },
  {
    "unit_id": "UNIT-0004",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0005",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0006",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0007",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0008",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0009",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0010",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0011",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0012",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0013",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0014",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier",
      "lost_inbound",
      "refund_issued_item_not_returned"
    ]
  },
  {
    "unit_id": "UNIT-0015",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0016",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0017",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0018",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0019",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0020",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0021",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0022",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0023",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0024",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0025",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0026",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee"
    ]
  },
  {
    "unit_id": "UNIT-0027",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0028",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0029",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0030",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0031",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "lost_inbound"
    ]
  },
  {
    "unit_id": "UNIT-0032",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0033",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0034",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0035",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0036",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0037",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0038",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "refund_issued_item_not_returned"
    ]
  },
  {
    "unit_id": "UNIT-0039",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0040",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0041",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "refund_issued_item_not_returned"
    ]
  },
  {
    "unit_id": "UNIT-0042",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0043",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0044",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0045",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0046",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0047",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0048",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "refund_issued_item_not_returned"
    ]
  },
  {
    "unit_id": "UNIT-0049",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0050",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0051",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0052",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0053",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0054",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0055",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0056",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0057",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0058",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0059",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0060",
    "org_id": "org_demo_bravo",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0061",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0062",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0063",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0064",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "lost_inbound"
    ]
  },
  {
    "unit_id": "UNIT-0065",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0066",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0067",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0068",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0069",
    "org_id": "org_demo_bravo",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0070",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0071",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier",
      "damaged_in_warehouse"
    ]
  },
  {
    "unit_id": "UNIT-0072",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0073",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0074",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0075",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0076",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier",
      "lost_inbound"
    ]
  },
  {
    "unit_id": "UNIT-0077",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0078",
    "org_id": "org_demo_bravo",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0079",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0080",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0081",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0082",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0083",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0084",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0085",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0086",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0087",
    "org_id": "org_demo_bravo",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0088",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0089",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0090",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0091",
    "org_id": "org_demo_alpha",
    "route": "unknown",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0092",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0093",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0094",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0095",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee",
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0096",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": false,
    "has_fees": true,
    "fee_types": [
      "inbound_defect_fee"
    ]
  },
  {
    "unit_id": "UNIT-0097",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": true,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0098",
    "org_id": "org_demo_alpha",
    "route": "fba",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  },
  {
    "unit_id": "UNIT-0099",
    "org_id": "org_demo_bravo",
    "route": "fba",
    "returned": true,
    "has_fees": true,
    "fee_types": [
      "fulfilment_fee_weight_tier"
    ]
  },
  {
    "unit_id": "UNIT-0100",
    "org_id": "org_demo_alpha",
    "route": "mfn",
    "returned": false,
    "has_fees": false,
    "fee_types": []
  }
];
