import test from "node:test";
import assert from "node:assert";
import { calculatePaye, computeProgressive } from "./paye.ts";

test("Resident progressive calculation is cumulative", () => {
  // Nil band (0 to 335,000)
  assert.strictEqual(computeProgressive(300000, true), 0);

  // 20% band (335,000 to 410,000)
  // Tax should be (400,000 - 335,000) * 20% = 13,000
  assert.strictEqual(computeProgressive(400000, true), 13000);

  // 25% band (410,000 to 485,000)
  // Tax should be 15,000 + (450,000 - 410,000) * 25% = 15,000 + 10,000 = 25,000
  assert.strictEqual(computeProgressive(450000, true), 25000);

  // 30% band (485,000 to 10,000,000)
  // Tax should be 33,750 + (500,000 - 485,000) * 30% = 33,750 + 4,500 = 38,250
  assert.strictEqual(computeProgressive(500000, true), 38250);

  // 40% surtax band (above 10,000,000)
  // Tax should be 2,888,250 + (12,000,000 - 10,000,000) * 40% = 2,888,250 + 800,000 = 3,688,250
  assert.strictEqual(computeProgressive(12000000, true), 3688250);
});

test("Non-resident primary employment has first slice taxed at 20%", () => {
  // First slice taxed at 20%
  // Tax should be 200,000 * 20% = 40,000
  assert.strictEqual(computeProgressive(200000, false), 40000);
  assert.strictEqual(computeProgressive(300000, false), 60000);

  // Higher bands: 335,000 to 410,000 (20% band)
  // Tax should be 67,000 + (400,000 - 335,000) * 20% = 67,000 + 13,000 = 80,000
  assert.strictEqual(computeProgressive(400000, false), 80000);

  // 410,000 to 485,000 (25% band)
  // Tax should be 82,000 + (450,000 - 410,000) * 25% = 82,000 + 10,000 = 92,000
  assert.strictEqual(computeProgressive(450000, false), 92000);

  // Above 10,000,000 (40% band)
  // Tax should be 2,955,250 + (12,000,000 - 10,000,000) * 40% = 2,955,250 + 800,000 = 3,755,250
  assert.strictEqual(computeProgressive(12000000, false), 3755250);
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
  // Tax on 950,000 = 33,750 + (950,000 - 485,000) * 0.3 = 33,750 + 139,500 = 173,250
  assert.strictEqual(simple.taxAmount, 173250);
  assert.strictEqual(simple.surtaxAmount, 0); // below 10M
  // netPay = 1M - 50k - 173,250 = 776,750
  assert.strictEqual(simple.netPay, 776750);

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
  // Tax on 1.35M = 33,750 + (1,350,000 - 485,000) * 0.3 = 33,750 + 259,500 = 293,250
  assert.strictEqual(advanced.taxAmount, 293250);
  assert.strictEqual(advanced.surtaxAmount, 0); // below 10M
  // netPay = grossTotal (1.5M) - NSSF (50k) - Deductions (100k) - tax (293,250) = 1,056,750
  assert.strictEqual(advanced.netPay, 1056750);

  // High income with Surtax
  const highIncome = calculatePaye({
    mode: "simple",
    isResident: true,
    employmentType: "primary",
    grossSalary: 12000000,
    nssfEnabled: false,
    basicSalary: 0,
    allowances: 0,
    benefitsInKind: 0,
    allowableDeductions: 0,
  });

  // gross total = 12M
  // NSSF = 0
  // chargeableIncome = 12M
  // Tax = 2,888,250 + (12,000,000 - 10,000,000) * 0.4 = 3,688,250
  // Surtax = (12,000,000 - 10,000,000) * 0.1 = 200,000
  assert.strictEqual(highIncome.taxAmount, 3688250);
  assert.strictEqual(highIncome.surtaxAmount, 200000);
});
