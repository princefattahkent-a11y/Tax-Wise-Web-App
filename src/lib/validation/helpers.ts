// Validation helpers, constants, and shared types for TaxWise Uganda AI Compliance Review

export interface TaxPeriodBundle {
  period_name: string;
  vat_declared_output: number;
  vat_declared_input: number;
  efris_sales_total: number;
  vat_input_invalid_tin: number;
  
  payroll_register_count: number;
  payroll_register_gross: number;
  paye_schedule_count: number;
  paye_schedule_tax: number;
  
  financial_gross_margin: number; // e.g., 0.35 (35%)
  financial_sales: number;
  supplier_tins_total_count: number;
  supplier_tins_invalid_count: number;
  
  nssf_contribution_total: number;
  is_nil_return: boolean;
  supporting_documents_present: boolean;
  duplicate_invoices_count: number;
  negative_balances_present: boolean;

  // Trailing-period history for historical trend checks
  historicalPeriods?: TaxPeriodBundle[];
}

export interface Finding {
  id?: string;
  code: string;
  severity: "critical" | "warning" | "info";
  area: "VAT" | "PAYE" | "Income Tax" | "Cross-Check" | "Historical" | "Math";
  title: string;
  description: string;
  reason: string;
  impact: string; // Must be composed strictly of the constants below
  recommendation: string;
  legislation_ref?: string;
  exposure: number;
  confidence: number;
  status: "open" | "resolved" | "ignored";
}

// Strict, non-negotiable hedged language constants
export const IMPACT_PHRASES = {
  POSSIBLE_INCONSISTENCY: "possible inconsistency detected",
  FURTHER_REVIEW: "this may require further review",
  UNUSUAL_VERIFY: "this appears unusual and should be verified",
  VERIFY_BEFORE_FILING: "this should be verified before filing"
} as const;

export type ImpactPhraseKey = keyof typeof IMPACT_PHRASES;

/**
 * Shared helper to build standard, robust Finding objects.
 * Prevents hand-written variations of the impact field.
 */
export function buildFinding(params: {
  code: string;
  severity: "critical" | "warning" | "info";
  area: "VAT" | "PAYE" | "Income Tax" | "Cross-Check" | "Historical" | "Math";
  title: string;
  description: string;
  reason: string;
  impactPhrases: (keyof typeof IMPACT_PHRASES)[];
  additionalImpactDetail?: string; // Opt text to append AFTER the strict phrases if needed
  recommendation: string;
  legislation_ref?: string;
  exposure: number;
  confidence: number;
}): Finding {
  // Compose the impact field strictly using only the allowed constants
  const composedPhrases = params.impactPhrases
    .map(key => IMPACT_PHRASES[key])
    .join(" and ");
  
  const impact = params.additionalImpactDetail
    ? `${composedPhrases}: ${params.additionalImpactDetail}`
    : composedPhrases;

  return {
    code: params.code,
    severity: params.severity,
    area: params.area,
    title: params.title,
    description: params.description,
    reason: params.reason,
    impact,
    recommendation: params.recommendation,
    legislation_ref: params.legislation_ref,
    exposure: params.exposure,
    confidence: params.confidence,
    status: "open"
  };
}
