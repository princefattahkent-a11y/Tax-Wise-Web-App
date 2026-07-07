export interface TaxBand {
  min: number;
  max: number;
  rate: number;
  baseTax: number;
}

// Uganda Income Tax (Amendment) Act, 2026 Schedule 4 Part I Resident Bands
export const PAYE_BANDS_RESIDENT: TaxBand[] = [
  { min: 0, max: 235000, rate: 0.0, baseTax: 0 },
  { min: 235000, max: 335000, rate: 0.1, baseTax: 0 },
  { min: 335000, max: 410000, rate: 0.2, baseTax: 10000 },
  { min: 410000, max: 10000000, rate: 0.3, baseTax: 25000 },
  { min: 10000000, max: Infinity, rate: 0.4, baseTax: 2902000 },
];

// Uganda Income Tax (Amendment) Act, 2026 Schedule 4 Part I Non-Resident Bands
export const PAYE_BANDS_NONRESIDENT: TaxBand[] = [
  { min: 0, max: 335000, rate: 0.2, baseTax: 0 },
  { min: 335000, max: 410000, rate: 0.25, baseTax: 67000 },
  { min: 410000, max: 10000000, rate: 0.3, baseTax: 85750 },
  { min: 10000000, max: Infinity, rate: 0.4, baseTax: 2962750 },
];

export const SECONDARY_FLAT_RATE = 0.40; // Flat 40%

export interface PayeCalculationInputs {
  mode: "simple" | "advanced";
  isResident: boolean;
  employmentType: "primary" | "secondary";
  grossSalary: number; // For simple mode
  nssfEnabled: boolean; // For simple mode
  basicSalary: number; // For advanced mode
  allowances: number; // For advanced mode
  benefitsInKind: number; // For advanced mode
  allowableDeductions: number; // For advanced mode
}

export interface PayeCalculationResult {
  grossTotal: number;
  nssfContribution: number;
  allowableDeductions: number;
  chargeableIncome: number;
  taxAmount: number;
  netPay: number;
  effectiveTaxRate: number;
  bandsUsed: {
    band: string;
    rate: string;
    taxableInBand: number;
    taxInBand: number;
  }[];
}

/**
 * Computes progressive PAYE tax using Uganda statutory bands.
 */
export function computeProgressive(chargeableIncome: number, isResident: boolean): number {
  if (chargeableIncome <= 0) return 0;
  const bands = isResident ? PAYE_BANDS_RESIDENT : PAYE_BANDS_NONRESIDENT;
  for (const band of bands) {
    if (chargeableIncome > band.min && chargeableIncome <= band.max) {
      return band.baseTax + (chargeableIncome - band.min) * band.rate;
    }
  }
  const topBand = bands[bands.length - 1];
  return topBand.baseTax + (chargeableIncome - topBand.min) * topBand.rate;
}

/**
 * Full payroll calculation supporting simple & advanced modes under the 2026 tax regime.
 */
export function calculatePaye(inputs: PayeCalculationInputs): PayeCalculationResult {
  const {
    mode,
    isResident,
    employmentType,
    grossSalary,
    nssfEnabled,
    basicSalary,
    allowances,
    benefitsInKind,
    allowableDeductions: deductionsInput,
  } = inputs;

  let grossTotal = 0;
  let nssfContribution = 0;
  let allowableDeductions = 0;

  if (mode === "simple") {
    grossTotal = grossSalary;
    nssfContribution = nssfEnabled ? Math.round(grossSalary * 0.05) : 0;
    allowableDeductions = 0;
  } else {
    grossTotal = basicSalary + allowances + benefitsInKind;
    // NSSF computed as 5% of basic salary only, not total gross allowances
    nssfContribution = Math.round(basicSalary * 0.05);
    allowableDeductions = deductionsInput;
  }

  let chargeableIncome = 0;
  if (employmentType === "secondary") {
    chargeableIncome = grossTotal;
  } else {
    chargeableIncome = Math.max(0, grossTotal - nssfContribution - allowableDeductions);
  }

  let taxAmount = 0;
  if (employmentType === "secondary") {
    taxAmount = Math.round(chargeableIncome * SECONDARY_FLAT_RATE);
  } else {
    taxAmount = Math.round(computeProgressive(chargeableIncome, isResident));
  }

  // Net pay = gross total - NSSF - allowable deductions - total tax
  const netPay = Math.max(0, grossTotal - nssfContribution - allowableDeductions - taxAmount);
  const effectiveTaxRate = grossTotal > 0 ? (taxAmount / grossTotal) * 100 : 0;

  // Breakdown of bands utilized
  const bandsUsed: PayeCalculationResult["bandsUsed"] = [];
  if (employmentType === "secondary") {
    bandsUsed.push({
      band: "Secondary Employment Flat Rate",
      rate: "40%",
      taxableInBand: chargeableIncome,
      taxInBand: taxAmount,
    });
  } else {
    const bands = isResident ? PAYE_BANDS_RESIDENT : PAYE_BANDS_NONRESIDENT;
    
    // We want to slice the chargeable income across ALL applicable bands
    for (const band of bands) {
      if (chargeableIncome > band.min) {
        const taxableInThisBand = Math.min(
          chargeableIncome - band.min, 
          band.max - band.min
        );
        const taxInThisBand = Math.round(taxableInThisBand * band.rate);
        
        bandsUsed.push({
          band: `${band.min.toLocaleString()} to ${band.max === Infinity ? "Infinity" : band.max.toLocaleString()}`,
          rate: `${Math.round(band.rate * 100)}%`,
          taxableInBand: taxableInThisBand,
          taxInBand: taxInThisBand,
        });
      }
    }
  }

  return {
    grossTotal,
    nssfContribution,
    allowableDeductions,
    chargeableIncome,
    taxAmount,
    netPay,
    effectiveTaxRate,
    bandsUsed,
  };
}
