// Unit Test Suite for TaxWise Uganda Validation Engine
// Can be executed via: npx tsx src/lib/validation/runTests.ts

import { TaxPeriodBundle } from "./helpers";
import { validateVat } from "./vatValidation";
import { validatePaye } from "./payeValidation";
import { validateIncomeTax } from "./incomeTaxValidation";
import { validateCross } from "./crossValidation";
import { validateHistorical } from "./historicalAnalysis";
import { validateMath } from "./mathValidation";
import { calculateRisk } from "../engine/riskEngine";

// ==========================================
// 1. Define Test Fixtures
// ==========================================

const CLEAN_FIXTURE: TaxPeriodBundle = {
  period_name: "2026-06",
  vat_declared_output: 18000000,
  vat_declared_input: 8000000,
  efris_sales_total: 100000000, // Standard 18% VAT matches exactly 18M output
  vat_input_invalid_tin: 0,
  
  payroll_register_count: 15,
  payroll_register_gross: 30000000,
  paye_schedule_count: 15,
  paye_schedule_tax: 4500000,
  
  financial_gross_margin: 0.35, // 35% margin
  financial_sales: 100000000, // Matches eFRIS sales
  supplier_tins_total_count: 12,
  supplier_tins_invalid_count: 0,
  
  nssf_contribution_total: 4500000, // exactly 15% of 30M
  is_nil_return: false,
  supporting_documents_present: true,
  duplicate_invoices_count: 0,
  negative_balances_present: false,
  
  historicalPeriods: [
    {
      period_name: "2026-05",
      vat_declared_output: 16200000,
      vat_declared_input: 7000000,
      efris_sales_total: 90000000,
      vat_input_invalid_tin: 0,
      payroll_register_count: 15,
      payroll_register_gross: 30000000,
      paye_schedule_count: 15,
      paye_schedule_tax: 4500000,
      financial_gross_margin: 0.34,
      financial_sales: 90000000,
      supplier_tins_total_count: 10,
      supplier_tins_invalid_count: 0,
      nssf_contribution_total: 4500000,
      is_nil_return: false,
      supporting_documents_present: true,
      duplicate_invoices_count: 0,
      negative_balances_present: false
    },
    {
      period_name: "2026-04",
      vat_declared_output: 14400000,
      vat_declared_input: 6000000,
      efris_sales_total: 80000000,
      vat_input_invalid_tin: 0,
      payroll_register_count: 15,
      payroll_register_gross: 30000000,
      paye_schedule_count: 15,
      paye_schedule_tax: 4500000,
      financial_gross_margin: 0.36,
      financial_sales: 80000000,
      supplier_tins_total_count: 10,
      supplier_tins_invalid_count: 0,
      nssf_contribution_total: 4500000,
      is_nil_return: false,
      supporting_documents_present: true,
      duplicate_invoices_count: 0,
      negative_balances_present: false
    }
  ]
};

const MISMATCH_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  vat_declared_output: 15000000 // Discrepancy: eFRIS implies 18M, but declared 15M
};

const INVALID_TIN_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  vat_input_invalid_tin: 3000000,
  supplier_tins_invalid_count: 2
};

const PAYE_MISMATCH_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  payroll_register_count: 15,
  paye_schedule_count: 12 // 3 employees missing in schedule
};

const PAYE_UNREMITTED_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  payroll_register_gross: 20000000,
  paye_schedule_tax: 0 // active gross payroll with zero PAYE tax
};

const MARGIN_DRIFT_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  financial_gross_margin: 0.15 // 15% current margin (deviates significantly from 35% average)
};

const CROSS_SALES_MISMATCH_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  financial_sales: 120000000, // Mismatch: 120M ledger vs 100M eFRIS
  efris_sales_total: 100000000
};

const CROSS_NSSF_MISMATCH_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  payroll_register_gross: 30000000,
  nssf_contribution_total: 3000000 // expected 15% is 4.5M, registered only 3M
};

const FALSE_NIL_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  is_nil_return: true,
  payroll_register_gross: 15000000, // operations active during nil period
  efris_sales_total: 40000000
};

const MISSING_DOCS_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  supporting_documents_present: false
};

const MATH_ERRORS_FIXTURE: TaxPeriodBundle = {
  ...CLEAN_FIXTURE,
  duplicate_invoices_count: 5,
  negative_balances_present: true
};

// ==========================================
// 2. Run Test Assertions
// ==========================================

function runAllTests() {
  console.log("==========================================");
  console.log("TAXWISE UGANDA COMPLIANCE ENGINE UNIT TESTS");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, messageOnFailure?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (messageOnFailure) console.error(`   Reason: ${messageOnFailure}`);
      failed++;
    }
  }

  // Test 1: Clean fixture should produce zero findings
  try {
    const vat = validateVat(CLEAN_FIXTURE);
    const paye = validatePaye(CLEAN_FIXTURE);
    const inc = validateIncomeTax(CLEAN_FIXTURE);
    const cross = validateCross(CLEAN_FIXTURE);
    const hist = validateHistorical(CLEAN_FIXTURE);
    const math = validateMath(CLEAN_FIXTURE);

    const totalFindings = [...vat, ...paye, ...inc, ...cross, ...hist, ...math];
    const risk = calculateRisk(totalFindings);

    assert("Clean Period - Zero Findings", totalFindings.length === 0);
    assert("Clean Period - Status Ready to File", risk.status === "ready_to_file");
    assert("Clean Period - Zero Exposure", risk.estimated_exposure === 0);
    assert("Clean Period - 100% Confidence", risk.confidence === 100);
  } catch (e: any) {
    assert("Clean Period Suite", false, e.message);
  }

  // Test 2: VAT Output Mismatch
  try {
    const findings = validateVat(MISMATCH_FIXTURE);
    assert("VAT-001 Detected", findings.some(f => f.code === "VAT-001"));
    assert("VAT-001 is Critical", findings.some(f => f.code === "VAT-001" && f.severity === "critical"));
    assert("VAT-001 Hedged Impact", findings.every(f => f.impact.includes("possible inconsistency detected")));
  } catch (e: any) {
    assert("VAT Mismatch Suite", false, e.message);
  }

  // Test 3: Input VAT Claims on Invalid TINs
  try {
    const findings = validateVat(INVALID_TIN_FIXTURE);
    assert("VAT-002 Detected", findings.some(f => f.code === "VAT-002"));
    assert("VAT-002 Exposure Matches", findings.find(f => f.code === "VAT-002")?.exposure === 3000000);
  } catch (e: any) {
    assert("VAT Invalid TIN Suite", false, e.message);
  }

  // Test 4: PAYE Employee count mismatch
  try {
    const findings = validatePaye(PAYE_MISMATCH_FIXTURE);
    assert("PAYE-001 Detected", findings.some(f => f.code === "PAYE-001"));
    assert("PAYE-001 is Warning", findings.some(f => f.code === "PAYE-001" && f.severity === "warning"));
  } catch (e: any) {
    assert("PAYE Employee Count Mismatch Suite", false, e.message);
  }

  // Test 5: PAYE Unremitted on gross payroll
  try {
    const findings = validatePaye(PAYE_UNREMITTED_FIXTURE);
    assert("PAYE-002 Detected", findings.some(f => f.code === "PAYE-002"));
  } catch (e: any) {
    assert("PAYE Unremitted Suite", false, e.message);
  }

  // Test 6: Gross margin shift
  try {
    const findings = validateIncomeTax(MARGIN_DRIFT_FIXTURE);
    assert("INC-001 Margin Deviation Detected", findings.some(f => f.code === "INC-001"));
  } catch (e: any) {
    assert("Income Tax Margin Trend Suite", false, e.message);
  }

  // Test 7: Sales cross-check mismatch
  try {
    const findings = validateCross(CROSS_SALES_MISMATCH_FIXTURE);
    assert("XVAL-001 Cross Revenue Mismatch Detected", findings.some(f => f.code === "XVAL-001"));
  } catch (e: any) {
    assert("Cross Sales Consistency Suite", false, e.message);
  }

  // Test 8: NSSF contribution mismatch
  try {
    const findings = validateCross(CROSS_NSSF_MISMATCH_FIXTURE);
    assert("XVAL-002 NSSF Mismatch Detected", findings.some(f => f.code === "XVAL-002"));
  } catch (e: any) {
    assert("Cross NSSF Suite", false, e.message);
  }

  // Test 9: False Nil return
  try {
    const findings = validateHistorical(FALSE_NIL_FIXTURE);
    assert("HIST-001 False Nil return detected", findings.some(f => f.code === "HIST-001"));
  } catch (e: any) {
    assert("Historical False Nil Suite", false, e.message);
  }

  // Test 10: Missing supporting docs
  try {
    const findings = validateHistorical(MISSING_DOCS_FIXTURE);
    assert("HIST-002 Missing Documents detected", findings.some(f => f.code === "HIST-002"));
  } catch (e: any) {
    assert("Historical Missing Docs Suite", false, e.message);
  }

  // Test 11: Arithmetic duplicate invoices & negative balances
  try {
    const findings = validateMath(MATH_ERRORS_FIXTURE);
    assert("MATH-001 Duplicates detected", findings.some(f => f.code === "MATH-001"));
    assert("MATH-002 Negative Balance detected", findings.some(f => f.code === "MATH-002"));
  } catch (e: any) {
    assert("Math validation Suite", false, e.message);
  }

  // Test 12: Risk Aggregator Status calculations
  try {
    const criticalVat = validateVat(MISMATCH_FIXTURE); // 1 critical
    const warningPaye = validatePaye(PAYE_MISMATCH_FIXTURE); // 1 warning

    const highRiskSum = calculateRisk([...criticalVat, ...warningPaye]);
    assert("Risk Engine - High Risk Status with Critical", highRiskSum.status === "high_risk");

    const warningRiskSum = calculateRisk(warningPaye);
    assert("Risk Engine - Review Required Status with Warning Only", warningRiskSum.status === "review_required");
  } catch (e: any) {
    assert("Risk Engine Calculations Suite", false, e.message);
  }

  console.log("\n==========================================");
  console.log(`TEST EXECUTION SUMMARY:`);
  console.log(`🟢 PASSED: ${passed}`);
  console.log(`🔴 FAILED: ${failed}`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}
