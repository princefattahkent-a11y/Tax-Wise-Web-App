import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * Cross-Validation Checks:
 * 1. VAT vs Income Tax Sales Consistency: comparing sales figures in VAT returns / eFRIS vs general ledger financial sales.
 * 2. Payroll vs NSSF Cross-Check: NSSF contributions must be exactly 15% of gross payroll (10% employer + 5% employee).
 */
export function validateCross(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: VAT vs Income Tax Sales Mismatch ---
  if (!bundle.is_nil_return && bundle.financial_sales > 0 && bundle.efris_sales_total > 0) {
    const mismatch = Math.abs(bundle.financial_sales - bundle.efris_sales_total);
    // Flag if there's a difference greater than 1% and at least 500,000 UGX
    if (mismatch > 500000 && (mismatch / bundle.financial_sales) > 0.01) {
      findings.push(
        buildFinding({
          code: "XVAL-001",
          severity: "critical",
          area: "Cross-Check",
          title: "VAT eFRIS Sales and Financial Revenue Mismatch",
          description: `Total revenue declared in corporate financial statements (UGX ${bundle.financial_sales.toLocaleString()}) does not match the sales recorded on eFRIS / VAT returns (UGX ${bundle.efris_sales_total.toLocaleString()}).`,
          reason: `A cross-checking difference of UGX ${mismatch.toLocaleString()} exists between tax systems and financial ledgers.`,
          impactPhrases: ["POSSIBLE_INCONSISTENCY", "VERIFY_BEFORE_FILING"],
          additionalImpactDetail: "mismatches between financial statements and eFRIS are automated targets for reconciliation audits by the URA Domestic Taxes department",
          recommendation: "Ensure that all sales are run through eFRIS and that financial revenue is fully synchronized with eFRIS monthly exports.",
          legislation_ref: "Tax Procedures Code Act, 2014, Section 19B (Electronic invoicing) and Income Tax Act, Section 52 (Methods of accounting)",
          exposure: mismatch,
          confidence: 95
        })
      );
    }
  }

  // --- Check 2: Payroll vs NSSF Contribution Cross-Check ---
  if (bundle.payroll_register_gross > 0 && bundle.nssf_contribution_total > 0) {
    const expectedNssf = bundle.payroll_register_gross * 0.15; // 15% statutory total (10% employer, 5% employee)
    const discrepancy = Math.abs(bundle.nssf_contribution_total - expectedNssf);
    
    // Flag if discrepancy is greater than 1% and at least 50,000 UGX
    if (discrepancy > 50000 && (discrepancy / expectedNssf) > 0.01) {
      findings.push(
        buildFinding({
          code: "XVAL-002",
          severity: "warning",
          area: "Cross-Check",
          title: "Payroll and NSSF Contributions Mismatch",
          description: `The NSSF contribution submitted (UGX ${bundle.nssf_contribution_total.toLocaleString()}) does not align with the statutory 15% rate of the gross payroll register (Expected: UGX ${expectedNssf.toLocaleString()}; Variance: UGX ${discrepancy.toLocaleString()}).`,
          reason: "Statutory NSSF contribution is calculated incorrectly or some employee wages were excluded from the NSSF returns.",
          impactPhrases: ["FURTHER_REVIEW", "UNUSUAL_VERIFY"],
          additionalImpactDetail: "this can trigger audits by both the National Social Security Fund (NSSF) and URA, as payroll figures must reconcile across both entities",
          recommendation: "Check that the 5% employee and 10% employer portions are correctly computed for all qualifying workers and that correct gross base salaries are used.",
          legislation_ref: "National Social Security Fund Act, Cap 222, Section 11 (Standard contributions)",
          exposure: discrepancy,
          confidence: 90
        })
      );
    }
  }

  return findings;
}
