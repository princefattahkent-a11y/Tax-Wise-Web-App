import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * PAYE Validation Checks:
 * 1. Mismatch in employee counts between the payroll register and submitted PAYE schedule.
 * 2. Unremitted PAYE check: gross payroll exists but scheduled PAYE tax is zero or extremely low.
 */
export function validatePaye(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: Employee Count Mismatch ---
  if (bundle.payroll_register_count !== bundle.paye_schedule_count) {
    const diff = Math.abs(bundle.payroll_register_count - bundle.paye_schedule_count);
    findings.push(
      buildFinding({
        code: "PAYE-001",
        severity: "warning",
        area: "PAYE",
        title: "PAYE Schedule and Payroll Register Employee Mismatch",
        description: `The internal payroll register lists ${bundle.payroll_register_count} employees, but the submitted PAYE schedule to the URA lists only ${bundle.paye_schedule_count} employees.`,
        reason: `A difference of ${diff} employee records exists between the submitted statutory filing and internal payroll listings.`,
        impactPhrases: ["POSSIBLE_INCONSISTENCY", "UNUSUAL_VERIFY"],
        additionalImpactDetail: "this can result in severe payroll audit flags and back-dated PAYE interest assessments",
        recommendation: "Review the payroll register against the e-return template to identify omitted employees (such as casual, temporary, or newly onboarded staff) and update the PAYE schedule.",
        legislation_ref: "Income Tax Act, Cap 340, Section 116 (Employer to withhold tax) and Section 123 (PAYE return)",
        exposure: diff * 235000, // Indicative exposure (minimum taxable salary threshold * diff)
        confidence: 90
      })
    );
  }

  // --- Check 2: Missing PAYE Remittance on Active Payroll ---
  if (bundle.payroll_register_gross > 0 && bundle.paye_schedule_tax <= 0 && !bundle.is_nil_return) {
    findings.push(
      buildFinding({
        code: "PAYE-002",
        severity: "critical",
        area: "PAYE",
        title: "Gross Payroll Recorded with Nil PAYE Scheduled",
        description: `Internal gross payroll of UGX ${bundle.payroll_register_gross.toLocaleString()} was processed, but zero PAYE tax is scheduled for remittance.`,
        reason: "Active employees are receiving salaries, yet no PAYE deductions are being declared to URA.",
        impactPhrases: ["UNUSUAL_VERIFY", "VERIFY_BEFORE_FILING"],
        additionalImpactDetail: "under-withholding or non-remittance of employee tax makes the employer personally liable for the full amount plus 2% monthly interest",
        recommendation: "Recalculate tax using the monthly graduated PAYE tax bands. Verify if any employee gross pay exceeds UGX 235,000 per month (the standard taxable threshold).",
        legislation_ref: "Income Tax Act, Cap 340, Section 116 (Employer's obligation to deduct) and Section 120 (Liability of withholding agent)",
        exposure: bundle.payroll_register_gross * 0.15, // Assume a conservative average 15% PAYE rate across the payroll
        confidence: 95
      })
    );
  }

  return findings;
}
