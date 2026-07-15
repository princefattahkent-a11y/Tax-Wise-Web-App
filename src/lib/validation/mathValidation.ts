import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * Math Validation Checks:
 * 1. Duplicate Invoice Entries: flagging when duplicate invoices are uploaded in the accounting batch.
 * 2. Negative Balances Present: flagging when ledger accounts show negative balances, which is mathematically invalid in compliance reporting.
 */
export function validateMath(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: Duplicate Invoices Detected ---
  if (bundle.duplicate_invoices_count > 0) {
    findings.push(
      buildFinding({
        code: "MATH-001",
        severity: "warning",
        area: "Math",
        title: "Duplicate Invoice Entries Detected in Ledger",
        description: `Our mathematical auditing algorithms identified ${bundle.duplicate_invoices_count} potential duplicate invoice entries in your current period accounting data.`,
        reason: "Identical transaction numbers, dates, and amounts were recorded multiple times, suggesting entry duplication.",
        impactPhrases: ["POSSIBLE_INCONSISTENCY", "FURTHER_REVIEW"],
        additionalImpactDetail: "duplicate invoices inflate expenses and input VAT claims, which can result in severe statutory penalties if audited",
        recommendation: "Run a system-wide duplicate check on invoice transaction IDs. Remove duplicate expense records and verify output invoices.",
        legislation_ref: "Tax Procedures Code Act, 2014, Section 15 (Accuracy of records) and VAT Act, Section 43 (One invoice per transaction)",
        exposure: bundle.duplicate_invoices_count * 150000, // Estimate an average invoice value of 150k UGX exposure
        confidence: 95
      })
    );
  }

  // --- Check 2: Negative Ledger Balances ---
  if (bundle.negative_balances_present) {
    findings.push(
      buildFinding({
        code: "MATH-002",
        severity: "warning",
        area: "Math",
        title: "Negative Balances in Asset or Liability Accounts",
        description: "The period ledger lists negative balances for asset, liability, or equity accounts, which is an arithmetic irregularity in statutory reporting.",
        reason: "Negative values were found in balance sheet or ledger summary fields, which usually indicate double-booking errors or unresolved account reconciliations.",
        impactPhrases: ["POSSIBLE_INCONSISTENCY", "UNUSUAL_VERIFY"],
        additionalImpactDetail: "negative cash or ledger balances trigger manual audit reviews by both management and external auditors",
        recommendation: "Audit credit note applications, cash payments, and ledger journals to find and correct the negative-balance accounting entries.",
        legislation_ref: "Tax Procedures Code Act, 2014, Section 15 (Accurate accounting practices)",
        exposure: 0, // No immediate tax exposure, purely a ledger risk
        confidence: 90
      })
    );
  }

  return findings;
}
