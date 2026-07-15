import { TaxPeriodBundle } from "../validation/helpers";
import { validateVat } from "../validation/vatValidation";
import { validatePaye } from "../validation/payeValidation";
import { validateIncomeTax } from "../validation/incomeTaxValidation";
import { validateCross } from "../validation/crossValidation";
import { validateHistorical } from "../validation/historicalAnalysis";
import { validateMath } from "../validation/mathValidation";
import { calculateRisk, RiskSummary } from "./riskEngine";
import { generateReviewSummary } from "../ai/aiReviewClient";
import { Finding } from "../validation/helpers";

export interface ComplianceEngineResult {
  findings: Finding[];
  risk: RiskSummary;
  professionalSummary: string | null;
}

/**
 * Orchestrates the compliance review pipeline:
 * 1. Runs all deterministic validation checks.
 * 2. Merges findings.
 * 3. Aggregates risk levels and exposures.
 * 4. Calls the Gemini narrative layer (if enabled) to generate narrative prose.
 */
export async function runComplianceEngine(
  bundle: TaxPeriodBundle,
  enableAi: boolean = true
): Promise<ComplianceEngineResult> {
  // 1. Run all deterministic check suites
  const vatFindings = validateVat(bundle);
  const payeFindings = validatePaye(bundle);
  const incomeTaxFindings = validateIncomeTax(bundle);
  const crossFindings = validateCross(bundle);
  const historicalFindings = validateHistorical(bundle);
  const mathFindings = validateMath(bundle);

  // 2. Merge findings
  const findings: Finding[] = [
    ...vatFindings,
    ...payeFindings,
    ...incomeTaxFindings,
    ...crossFindings,
    ...historicalFindings,
    ...mathFindings
  ];

  // 3. Aggregate risk parameters
  const risk = calculateRisk(findings);

  // 4. Generate AI professional summary (if enabled)
  let professionalSummary: string | null = null;
  if (enableAi) {
    professionalSummary = await generateReviewSummary(findings);
  }

  return {
    findings,
    risk,
    professionalSummary
  };
}
