import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * Historical Analysis Checks:
 * 1. Nil Tax Returns with Active Payroll: checking if a period is submitted as Nil but has active payroll or operations.
 * 2. Missing Supporting Documents: flagging when mandatory backup files (eFRIS exports, payroll sheets, custom declarations) are absent.
 */
export function validateHistorical(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: Nil Return submitted despite active payroll or sales ---
  if (bundle.is_nil_return && (bundle.payroll_register_gross > 0 || bundle.efris_sales_total > 0 || bundle.vat_declared_output > 0)) {
    findings.push(
      buildFinding({
        code: "HIST-001",
        severity: "critical",
        area: "Historical",
        title: "Nil Tax Return Lodged with Active Operations",
        description: `The return is flagged as a 'Nil Return' but internal systems record active payroll of UGX ${bundle.payroll_register_gross.toLocaleString()} and/or eFRIS sales of UGX ${bundle.efris_sales_total.toLocaleString()}.`,
        reason: "Tax filing indicates no taxable activity, but internal records clearly show business operations and employee compensation occurring in this period.",
        impactPhrases: ["POSSIBLE_INCONSISTENCY", "VERIFY_BEFORE_FILING"],
        additionalImpactDetail: "lodging a false Nil return is considered tax evasion and carries heavy criminal penalties and immediate cancellation of Nil status by URA",
        recommendation: "Re-declare the period's return to correctly reflect actual gross salaries, PAYE liability, and sales revenue. Do not submit as a Nil return.",
        legislation_ref: "Tax Procedures Code Act, 2014, Section 56 (False or misleading statements) and Section 22 (Requirement to file returns)",
        exposure: Math.max(bundle.payroll_register_gross * 0.15, bundle.efris_sales_total * 0.18),
        confidence: 99
      })
    );
  }

  // --- Check 2: Missing Supporting Documents ---
  if (!bundle.supporting_documents_present) {
    findings.push(
      buildFinding({
        code: "HIST-002",
        severity: "warning",
        area: "Historical",
        title: "Missing Mandatory Supporting Documentation",
        description: "One or more critical supporting documents (such as eFRIS daily transaction logs, signed payroll registers, or custom import declarations) are missing from the digital compliance locker.",
        reason: "Compliance review completed without verifying structural backup files which must legally be archived.",
        impactPhrases: ["FURTHER_REVIEW", "UNUSUAL_VERIFY"],
        additionalImpactDetail: "under URA regulations, taxpayers must retain all source records for at least 5 years; failure to produce documents on request disallows related tax deductions",
        recommendation: "Ensure all source documents, including XML invoices from eFRIS and tax receipt receipts, are uploaded and securely attached to the filing period records.",
        legislation_ref: "Tax Procedures Code Act, 2014, Section 15 (Maintenance of records)",
        exposure: 2000000, // Fixed statutory administrative penalty of 2,000,000 UGX for record-keeping non-compliance
        confidence: 90
      })
    );
  }

  return findings;
}
