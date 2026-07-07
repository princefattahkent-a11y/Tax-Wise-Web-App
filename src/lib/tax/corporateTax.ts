export const CORPORATE_TAX_RATES = {
  standard: 0.30,
  listed: 0.25,
};

export const BRANCH_REPATRIATION_RATE = 0.15;

export type CompanyRateCategory = "standard" | "listed";

export interface AddBackItems {
  depreciation: number;
  entertainmentDisallowed: number;
  expensesRelatedToExemptIncome: number;
  lossOnDisposalOfAssets: number;
  balancingCharge: number;
  donationsDisallowed: number;
  provisionForBadDebts: number;
  startupCosts: number;
  unrealizedForexLoss: number;
  otherDisallowable: number;
}

export interface DeductionItems {
  exemptIncome: number;
  grossRentalIncome: number;
  profitOnDisposalOfAssets: number;
  capitalAllowance: number;
  scientificResearchCapitalized: number;
  unrealizedForexGain: number;
  provisionForBadDebtsCredited: number;
  finalWithholdingTaxIncome: number;
  otherAllowable: number;
}

export function emptyAddBacks(): AddBackItems {
  return {
    depreciation: 0,
    entertainmentDisallowed: 0,
    expensesRelatedToExemptIncome: 0,
    lossOnDisposalOfAssets: 0,
    balancingCharge: 0,
    donationsDisallowed: 0,
    provisionForBadDebts: 0,
    startupCosts: 0,
    unrealizedForexLoss: 0,
    otherDisallowable: 0,
  };
}

export function emptyDeductions(): DeductionItems {
  return {
    exemptIncome: 0,
    grossRentalIncome: 0,
    profitOnDisposalOfAssets: 0,
    capitalAllowance: 0,
    scientificResearchCapitalized: 0,
    unrealizedForexGain: 0,
    provisionForBadDebtsCredited: 0,
    finalWithholdingTaxIncome: 0,
    otherAllowable: 0,
  };
}

export interface CorporateTaxResult {
  totalAddBacks: number;
  totalDeductions: number;
  adjustedProfit: number;
  incomeChargeableBeforeLossRelief: number;
  lossReliefUsed: number;
  chargeableBusinessIncome: number;
  lossCarriedForward: number;
  taxRate: number;
  incomeTax: number;
  branchRepatriationTax: number;
  totalTaxPayable: number;
}

export function computeSimpleCorporateTax({
  netProfitBeforeTax,
  lumpSumAddBacks,
  lumpSumDeductions,
  broughtForwardLoss,
  rateCategory,
}: {
  netProfitBeforeTax: number;
  lumpSumAddBacks: number;
  lumpSumDeductions: number;
  broughtForwardLoss: number;
  rateCategory: CompanyRateCategory;
}): CorporateTaxResult {
  return computeCorporateTax({
    netProfitBeforeTax,
    addBacks: lumpSumAddBacks,
    deductions: lumpSumDeductions,
    netCapitalGains: 0,
    broughtForwardLoss,
    rateCategory,
    repatriatedBranchProfit: 0,
  });
}

export function computeCorporateTax({
  netProfitBeforeTax,
  addBacks,
  deductions,
  netCapitalGains,
  broughtForwardLoss,
  rateCategory,
  repatriatedBranchProfit,
}: {
  netProfitBeforeTax: number;
  addBacks: AddBackItems | number;
  deductions: DeductionItems | number;
  netCapitalGains: number;
  broughtForwardLoss: number;
  rateCategory: CompanyRateCategory;
  repatriatedBranchProfit: number;
}): CorporateTaxResult {
  const totalAddBacks = typeof addBacks === "number"
    ? addBacks
    : Object.keys(addBacks).reduce((sum, key) => sum + (addBacks[key as keyof AddBackItems] || 0), 0);

  const totalDeductions = typeof deductions === "number"
    ? deductions
    : Object.keys(deductions).reduce((sum, key) => sum + (deductions[key as keyof DeductionItems] || 0), 0);

  const adjustedProfit = netProfitBeforeTax + totalAddBacks - totalDeductions;
  const incomeChargeableBeforeLossRelief = adjustedProfit + netCapitalGains;
  const availableLoss = Math.max(0, broughtForwardLoss);
  const lossReliefUsed = Math.max(0, Math.min(availableLoss, incomeChargeableBeforeLossRelief));
  const netAfterLossRelief = incomeChargeableBeforeLossRelief - lossReliefUsed;
  const chargeableBusinessIncome = Math.max(0, netAfterLossRelief);

  const unusedBroughtForwardLoss = availableLoss - lossReliefUsed;
  const freshLossThisYear = Math.max(0, -netAfterLossRelief);
  const lossCarriedForward = unusedBroughtForwardLoss + freshLossThisYear;

  const taxRate = CORPORATE_TAX_RATES[rateCategory];
  const incomeTax = chargeableBusinessIncome * taxRate;
  const branchRepatriationTax = Math.max(0, repatriatedBranchProfit) * BRANCH_REPATRIATION_RATE;
  const totalTaxPayable = incomeTax + branchRepatriationTax;

  return {
    totalAddBacks,
    totalDeductions,
    adjustedProfit,
    incomeChargeableBeforeLossRelief,
    lossReliefUsed,
    chargeableBusinessIncome,
    lossCarriedForward,
    taxRate,
    incomeTax,
    branchRepatriationTax,
    totalTaxPayable,
  };
}
