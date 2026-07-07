import test from "node:test";
import assert from "node:assert";
import { calculatePaye, computeProgressive } from "./paye.ts";

test("Resident progressive calculation is cumulative", () => {
  // Nil band (0 to 235,000)
  assert.strictEqual(computeProgressive(200000, true), 0);

  // 10% band (235,000 to 335,000)
  // Tax should be (300,000 - 235,000) * 10% = 6,500
  assert.strictEqual(computeProgressive(300000, true), 6500);

  // 20% band (335,000 to 410,000)
  // Tax should be 10,000 + (400,000 - 335,000) * 20% = 10,000 + 13,000 = 23,000
  assert.strictEqual(computeProgressive(400000, true), 23000);

  // 30% band (410,000 to 10,000,000)
  // Tax should be 25,000 + (500,000 - 410,000) * 30% = 25,000 + 27,000 = 52,000
  assert.strictEqual(computeProgressive(500000, true), 52000);

  // 40% surtax band (above 10,000,000)
  // Tax should be 2,902,000 + (12,000,000 - 10,000,000) * 40% = 2,902,000 + 800,000 = 3,702,000
  assert.strictEqual(computeProgressive(12000000, true), 3702000);
});

test("Non-resident primary employment has first slice taxed at 20%", () => {
  // First slice taxed at 20%
  // Tax should be 200,000 * 20% = 40,000
  assert.strictEqual(computeProgressive(200000, false), 40000);
  assert.strictEqual(computeProgressive(300000, false), 60000);

  // Higher bands: 335,000 to 410,000 (25% band)
  // Tax should be 67,000 + (400,000 - 335,000) * 25% = 67,000 + 16,250 = 83,250
  assert.strictEqual(computeProgressive(400000, false), 83250);

  // 410,000 to 10,000,000 (30% band)
  // Tax should be 85,750 + (500,000 - 410,000) * 30% = 85,750 + 27,000 = 112,750
  assert.strictEqual(computeProgressive(500000, false), 112750);

  // Above 10,000,000 (40% band)
  // Tax should be 2,962,750 + (12,000,000 - 10,000,000) * 40% = 2,962,750 + 800,000 = 3,762,750
  assert.strictEqual(computeProgressive(12000000, false), 3762750);
});

test("Secondary employment uses flat 40% regardless of income", () => {
  const result = calculatePaye({
    mode: "simple",
    isResident: true,
    employmentType: "secondary",
    grossSalary: 1000000,
    nssfEnabled: false,
    basicSalary: 0,
    allowances: 0,
    benefitsInKind: 0,
    allowableDeductions: 0,
  });

  assert.strictEqual(result.taxAmount, 400000); // 1,000,000 * 40%
});

test("Simple mode NSSF toggles correctly affect chargeable income", () => {
  const withNssf = calculatePaye({
    mode: "simple",
    isResident: true,
    employmentType: "primary",
    grossSalary: 1000000,
    nssfEnabled: true,
    basicSalary: 0,
    allowances: 0,
    benefitsInKind: 0,
    allowableDeductions: 0,
  });

  assert.strictEqual(withNssf.nssfContribution, 50000); // 5% of 1M
  assert.strictEqual(withNssf.chargeableIncome, 950000); // 1M - 50k

  const withoutNssf = calculatePaye({
    mode: "simple",
    isResident: true,
    employmentType: "primary",
    grossSalary: 1000000,
    nssfEnabled: false,
    basicSalary: 0,
    allowances: 0,
    benefitsInKind: 0,
    allowableDeductions: 0,
  });

  assert.strictEqual(withoutNssf.nssfContribution, 0);
  assert.strictEqual(withoutNssf.chargeableIncome, 1000000);
});

test("Advanced mode NSSF is calculated on basic salary only", () => {
  const result = calculatePaye({
    mode: "advanced",
    isResident: true,
    employmentType: "primary",
    grossSalary: 0,
    nssfEnabled: false,
    basicSalary: 1000000, // Basic
    allowances: 500000,   // Allowance
    benefitsInKind: 200000, // Benefit-in-kind
    allowableDeductions: 100000,
  });

  // Gross total = 1M + 500k + 200k = 1.7M
  assert.strictEqual(result.grossTotal, 1700000);
  // NSSF = 5% of 1M basic = 50k (not 5% of 1.7M)
  assert.strictEqual(result.nssfContribution, 50000);
  // Chargeable income = Gross (1.7M) - NSSF (50k) - Deductions (100k) = 1.55M
  assert.strictEqual(result.chargeableIncome, 1550000);
});

test("Advanced mode chargeable income floors at 0", () => {
  const result = calculatePaye({
    mode: "advanced",
    isResident: true,
    employmentType: "primary",
    grossSalary: 0,
    nssfEnabled: false,
    basicSalary: 100000,
    allowances: 50000,
    benefitsInKind: 0,
    allowableDeductions: 200000, // Deductions exceed gross
  });

  assert.strictEqual(result.chargeableIncome, 0);
  assert.strictEqual(result.taxAmount, 0);
});

test("Net pay is calculated correctly in simple and advanced modes", () => {
  // Simple Mode
  const simple = calculatePaye({
    mode: "simple",
    isResident: true,
    employmentType: "primary",
    grossSalary: 1000000,
    nssfEnabled: true,
    basicSalary: 0,
    allowances: 0,
    benefitsInKind: 0,
    allowableDeductions: 0,
  });

  // gross total = 1,000,000
  // NSSF = 50,000
  // chargeableIncome = 950,000
  // Tax on 950,000 = 25,000 + (950,000 - 410,000) * 0.3 = 25,000 + 162,000 = 187,000
  assert.strictEqual(simple.taxAmount, 187000);
  // netPay = 1M - 50k - 187k = 763,000
  assert.strictEqual(simple.netPay, 763000);

  // Advanced Mode
  const advanced = calculatePaye({
    mode: "advanced",
    isResident: true,
    employmentType: "primary",
    grossSalary: 0,
    nssfEnabled: false,
    basicSalary: 1000000,
    allowances: 500000,
    benefitsInKind: 0,
    allowableDeductions: 100000,
  });

  // gross total = 1.5M
  // NSSF = 5% of 1M basic = 50k
  // allowable deductions = 100k
  // chargeableIncome = 1.5M - 50k - 100k = 1.35M
  // Tax on 1.35M = 25,000 + (1,350,000 - 410,000) * 0.3 = 25,000 + 282,000 = 307,000
  assert.strictEqual(advanced.taxAmount, 307000);
  // netPay = grossTotal (1.5M) - NSSF (50k) - Deductions (100k) - tax (307k) = 1,043,000
  assert.strictEqual(advanced.netPay, 1043000);
});
