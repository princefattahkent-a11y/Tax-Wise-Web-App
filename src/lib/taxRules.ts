export interface TaxRuleSet {
  effectiveFrom: string;
  individualResident: {
    threshold: number;
    rate: number;
  };
  individualNonResident: {
    rate: number;
  };
  corporate: {
    deemedDeductionRate: number;
    corporateRate: number;
  };
}

export const CURRENT_TAX_RULES: TaxRuleSet = {
  effectiveFrom: "2026-07-01",
  individualResident: {
    threshold: 2820000,
    rate: 0.12,
  },
  individualNonResident: {
    rate: 0.15,
  },
  corporate: {
    deemedDeductionRate: 0.50,
    corporateRate: 0.30,
  }
};

export const TAX_RULE_HISTORY: TaxRuleSet[] = [
  {
    effectiveFrom: "2022-07-01",
    individualResident: {
      threshold: 2820000,
      rate: 0.12,
    },
    individualNonResident: {
      rate: 0.15,
    },
    corporate: {
      deemedDeductionRate: 0.50,
      corporateRate: 0.30,
    }
  }
];
