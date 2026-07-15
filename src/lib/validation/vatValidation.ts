import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * VAT Validation Checks:
 * 1. Output VAT vs EFRIS-implied sales reconciliation (standard 18% VAT in Uganda).
 * 2. Input VAT claims against suppliers with missing or invalid TINs.
 */
export function validateVat(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: Output VAT vs EFRIS Sales Mismatch ---
  // If we are not a Nil return and EFRIS sales exist
  if (!bundle.is_nil_return && bundle.efris_sales_total > 0) {
    const expectedOutputVat = bundle.efris_sales_total * 0.18;
    const mismatch = Math.abs(bundle.vat_declared_output - expectedOutputVat);
    
    // Allow a small rounding tolerance of 1000 UGX
    if (mismatch > 1000) {
      findings.push(
        buildFinding({
          code: "VAT-001",
          severity: "critical",
          area: "VAT",
          title: "Output VAT and EFRIS Sales Mismatch",
          description: `The declared Output VAT (UGX ${bundle.vat_declared_output.toLocaleString()}) does not reconcile with the sales recorded on eFRIS (UGX ${bundle.efris_sales_total.toLocaleString()}), which implies an Output VAT of UGX ${expectedOutputVat.toLocaleString()} at the standard 18% rate.`,
          reason: `A difference of UGX ${mismatch.toLocaleString()} was detected between the general ledger output VAT and the eFRIS system records.`,
          impactPhrases: ["POSSIBLE_INCONSISTENCY", "VERIFY_BEFORE_FILING"],
          additionalImpactDetail: "this may trigger an automated URA audit or assessment on sales under-declaration",
          recommendation: "Reconcile the daily eFRIS transaction logs with the Sales Day Book and adjust the VAT return output figure to match eFRIS before submission.",
          legislation_ref: "Value Added Tax Act, Cap 349, Section 19 (Output tax calculation) and Section 31A (eFRIS compliance)",
          exposure: mismatch,
          confidence: 95
        })
      );
    }
  }

  // --- Check 2: Input VAT claims against invalid TIN suppliers ---
  if (bundle.vat_input_invalid_tin > 0 || bundle.supplier_tins_invalid_count > 0) {
    const invalidTinVatAmount = bundle.vat_input_invalid_tin;
    findings.push(
      buildFinding({
        code: "VAT-002",
        severity: "critical",
        area: "VAT",
        title: "Input VAT Claims on Invalid Supplier TINs",
        description: `Input VAT of UGX ${invalidTinVatAmount.toLocaleString()} is being claimed on purchases from suppliers who have missing, inactive, or invalid Tax Identification Numbers (TINs) across ${bundle.supplier_tins_invalid_count} suppliers.`,
        reason: `${bundle.supplier_tins_invalid_count} suppliers failed the URA database active-TIN verification check, yet input VAT credits are claimed on their invoices.`,
        impactPhrases: ["POSSIBLE_INCONSISTENCY", "FURTHER_REVIEW"],
        additionalImpactDetail: "URA rules mandate that no input VAT is claimable unless the supplier possesses a valid, active VAT-registered TIN",
        recommendation: "Hold input tax claims for these specific suppliers. Request correct and active TINs from the suppliers, and verify them against the URA e-Services portal prior to claiming.",
        legislation_ref: "Value Added Tax Act, Cap 349, Section 28 (Input tax credit requirements) and Section 43 (Tax invoices)",
        exposure: invalidTinVatAmount,
        confidence: 98
      })
    );
  }

  return findings;
}
