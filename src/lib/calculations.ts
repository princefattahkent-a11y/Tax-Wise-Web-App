import { CURRENT_TAX_RULES } from "./taxRules";

export interface CalculationStep {
  label: string;
  value: string;
  isFormula?: boolean;
}

export interface RentalTaxResult {
  grossAnnualIncome: number;
  grossMonthlyIncome: number;
  taxpayerType: "resident_individual" | "non_resident_individual" | "company";
  deemedDeduction: number;
  chargeableIncome: number;
  taxPayable: number;
  effectiveRate: number;
  steps: CalculationStep[];
}

export interface PartnerInput {
  name: string;
  ownershipPercentage: number;
  isResident: boolean;
}

export interface PartnerCalculationResult {
  name: string;
  ownershipPercentage: number;
  isResident: boolean;
  grossShare: number;
  taxPayable: number;
  effectiveRate: number;
  steps: CalculationStep[];
}

export interface PartnershipCalculationResult {
  grossAnnualIncome: number;
  partners: PartnerCalculationResult[];
  totalTaxPayable: number;
  overallEffectiveRate: number;
  steps: CalculationStep[];
}

// Format UGX cleanly for steps
const formatUGX = (n: number) => {
  return "UGX " + Math.round(n).toLocaleString("en-US");
};

function clampInput(value: number): number {
  return !isFinite(value) || value < 0 ? 0 : value;
}

export function annualiseIncome(monthlyIncome: number): number {
  return clampInput(monthlyIncome) * 12;
}

export function calculateRentalTax(
  grossAnnualIncome: number,
  taxpayerType: "resident_individual" | "non_resident_individual" | "company"
): RentalTaxResult {
  const annualGross = clampInput(grossAnnualIncome);
  const monthlyGross = annualGross / 12;

  let deemedDeduction = 0;
  let chargeableIncome = 0;
  let taxPayable = 0;
  const steps: CalculationStep[] = [];

  steps.push({
    label: "Gross Annual Rental Income",
    value: formatUGX(annualGross)
  });

  const rules = CURRENT_TAX_RULES;

  if (taxpayerType === "resident_individual") {
    const threshold = rules.individualResident.threshold;
    const rate = rules.individualResident.rate;

    chargeableIncome = Math.max(0, annualGross - threshold);
    taxPayable = chargeableIncome * rate;

    steps.push({
      label: `Less: Annual Exemption Threshold (Sixth Schedule)`,
      value: formatUGX(threshold)
    });
    steps.push({
      label: "Chargeable Rental Income",
      value: formatUGX(chargeableIncome),
      isFormula: true
    });
    steps.push({
      label: `Tax Rate`,
      value: `${(rate * 100).toFixed(0)}%`
    });
    steps.push({
      label: "Rental Tax Payable",
      value: formatUGX(taxPayable),
      isFormula: true
    });

  } else if (taxpayerType === "non_resident_individual") {
    const rate = rules.individualNonResident.rate;

    chargeableIncome = annualGross;
    taxPayable = chargeableIncome * rate;

    steps.push({
      label: "Exemption Threshold (Non-residents)",
      value: "None applicable (No threshold)"
    });
    steps.push({
      label: "Chargeable Rental Income",
      value: formatUGX(chargeableIncome),
      isFormula: true
    });
    steps.push({
      label: "Tax Rate",
      value: `${(rate * 100).toFixed(0)}%`
    });
    steps.push({
      label: "Rental Tax Payable",
      value: formatUGX(taxPayable),
      isFormula: true
    });

  } else {
    // company
    const deemedRate = rules.corporate.deemedDeductionRate;
    const corpRate = rules.corporate.corporateRate;

    deemedDeduction = annualGross * deemedRate;
    chargeableIncome = annualGross - deemedDeduction;
    taxPayable = chargeableIncome * corpRate;

    const effectiveRateOnGross = (1 - deemedRate) * corpRate;

    steps.push({
      label: `Less: Deemed Expense Deduction (${(deemedRate * 100).toFixed(0)}% of gross)`,
      value: formatUGX(deemedDeduction)
    });
    steps.push({
      label: "Chargeable Rental Income",
      value: formatUGX(chargeableIncome),
      isFormula: true
    });
    steps.push({
      label: `Corporate Tax Rate on Net Chargeable`,
      value: `${(corpRate * 100).toFixed(0)}%`
    });
    steps.push({
      label: `Computed Effective Rate on Gross Income`,
      value: `${(effectiveRateOnGross * 100).toFixed(1)}%`
    });
    steps.push({
      label: "Rental Tax Payable",
      value: formatUGX(taxPayable),
      isFormula: true
    });
  }

  const effectiveRate = annualGross === 0 ? 0 : taxPayable / annualGross;

  return {
    grossAnnualIncome: annualGross,
    grossMonthlyIncome: monthlyGross,
    taxpayerType,
    deemedDeduction,
    chargeableIncome,
    taxPayable,
    effectiveRate,
    steps
  };
}

export function calculatePartnership(
  grossAnnualIncome: number,
  partners: PartnerInput[]
): PartnershipCalculationResult {
  const annualGross = clampInput(grossAnnualIncome);
  const partnerResults: PartnerCalculationResult[] = [];
  let totalTaxPayable = 0;

  const steps: CalculationStep[] = [];
  steps.push({
    label: "Partnership Total Gross Annual Income",
    value: formatUGX(annualGross)
  });

  if (partners.length === 0) {
    return {
      grossAnnualIncome: annualGross,
      partners: [],
      totalTaxPayable: 0,
      overallEffectiveRate: 0,
      steps: [
        ...steps,
        {
          label: "Status",
          value: "No partners added"
        }
      ]
    };
  }

  partners.forEach((p) => {
    const ownershipFraction = Math.max(0, Math.min(100, p.ownershipPercentage)) / 100;
    const grossShare = annualGross * ownershipFraction;

    const partnerType = p.isResident ? "resident_individual" : "non_resident_individual";
    const calc = calculateRentalTax(grossShare, partnerType);

    partnerResults.push({
      name: p.name.trim(),
      ownershipPercentage: p.ownershipPercentage,
      isResident: p.isResident,
      grossShare,
      taxPayable: calc.taxPayable,
      effectiveRate: calc.effectiveRate,
      steps: [
        {
          label: `${p.name} - Ownership Share`,
          value: `${p.ownershipPercentage}%`
        },
        {
          label: `${p.name} - Share of Gross Income`,
          value: formatUGX(grossShare),
          isFormula: true
        },
        ...calc.steps.slice(1) // Include all calculation steps for this partner except the gross title
      ]
    });

    totalTaxPayable += calc.taxPayable;
  });

  const overallEffectiveRate = annualGross === 0 ? 0 : totalTaxPayable / annualGross;

  steps.push({
    label: "Total Partnership Tax Payable (Sum of Partners)",
    value: formatUGX(totalTaxPayable),
    isFormula: true
  });
  steps.push({
    label: "Partnership Overall Effective Tax Rate",
    value: `${(overallEffectiveRate * 100).toFixed(2)}%`,
    isFormula: true
  });

  return {
    grossAnnualIncome: annualGross,
    partners: partnerResults,
    totalTaxPayable,
    overallEffectiveRate,
    steps
  };
}

export function isOwnershipValid(partners: PartnerInput[]): boolean {
  if (partners.length < 2 || partners.length > 20) return false;
  const total = partners.reduce((sum, p) => sum + p.ownershipPercentage, 0);
  return Math.abs(total - 100) <= 0.01;
}
