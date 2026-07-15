import { TaxPeriodBundle, Finding, buildFinding } from "./helpers";

/**
 * Income Tax Validation Checks:
 * 1. Gross margin shift vs trailing-period average.
 * Flags material, unexplained drops or spikes in gross profit margins (such as a drop of >10% absolute margin deviation).
 */
export function validateIncomeTax(bundle: TaxPeriodBundle): Finding[] {
  const findings: Finding[] = [];

  // --- Check 1: Gross Margin Trend vs Trailing-Period Average ---
  if (bundle.historicalPeriods && bundle.historicalPeriods.length > 0) {
    // Filter out historical periods that have gross margin data
    const historicalMargins = bundle.historicalPeriods
      .map(p => p.financial_gross_margin)
      .filter(m => m !== undefined && m !== null);

    if (historicalMargins.length >= 2) {
      const avgHistoricalMargin = historicalMargins.reduce((sum, val) => sum + val, 0) / historicalMargins.length;
      const deviation = Math.abs(bundle.financial_gross_margin - avgHistoricalMargin);

      // Material shift threshold: 10% (0.10) absolute difference in gross margin
      if (deviation > 0.10) {
        const direction = bundle.financial_gross_margin < avgHistoricalMargin ? "dropped" : "increased";
        findings.push(
          buildFinding({
            code: "INC-001",
            severity: "warning",
            area: "Income Tax",
            title: "Material Gross Margin Deviation from Historical Average",
            description: `The current gross margin of ${(bundle.financial_gross_margin * 100).toFixed(1)}% has ${direction} significantly compared to the trailing-period average of ${(avgHistoricalMargin * 100).toFixed(1)}% (absolute deviation of ${(deviation * 100).toFixed(1)}%).`,
            reason: `A shift of ${(deviation * 100).toFixed(1)}% exceeds the company's historical margin variance tolerance of 10%.`,
            impactPhrases: ["POSSIBLE_INCONSISTENCY", "UNUSUAL_VERIFY"],
            additionalImpactDetail: "drastic gross margin shifts often trigger transfer pricing, transfer mispricing, or cost overstatement reviews by URA auditors",
            recommendation: "Conduct a detailed purchase-to-sales price review. Verify that opening and closing inventory valuations are consistent and that no cost-of-sales entries were duplicated.",
            legislation_ref: "Income Tax Act, Cap 340, Section 22 (Deductions allowed) and Section 48-51 (Inventory valuations and transfer pricing)",
            exposure: bundle.financial_sales * deviation, // Exposure is the estimated profit gap or overstatement
            confidence: 85
          })
        );
      }
    }
  }

  return findings;
}
