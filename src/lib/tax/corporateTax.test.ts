import test from "node:test";
import assert from "node:assert";
import {
  computeCorporateTax,
  computeSimpleCorporateTax,
  emptyAddBacks,
  emptyDeductions,
} from "./corporateTax.ts";

test("Basic profit, no add-backs, no deductions, no brought-forward loss", () => {
  const result = computeSimpleCorporateTax({
    netProfitBeforeTax: 100_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 0,
    rateCategory: "standard",
  });

  assert.strictEqual(result.totalAddBacks, 0);
  assert.strictEqual(result.totalDeductions, 0);
  assert.strictEqual(result.adjustedProfit, 100_000_000);
  assert.strictEqual(result.incomeChargeableBeforeLossRelief, 100_000_000);
  assert.strictEqual(result.lossReliefUsed, 0);
  assert.strictEqual(result.chargeableBusinessIncome, 100_000_000);
  assert.strictEqual(result.lossCarriedForward, 0);
  assert.strictEqual(result.taxRate, 0.30);
  assert.strictEqual(result.incomeTax, 30_000_000);
  assert.strictEqual(result.branchRepatriationTax, 0);
  assert.strictEqual(result.totalTaxPayable, 30_000_000);
});

test("Brought-forward loss fully absorbed", () => {
  const result = computeSimpleCorporateTax({
    netProfitBeforeTax: 100_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 40_000_000,
    rateCategory: "standard",
  });

  assert.strictEqual(result.adjustedProfit, 100_000_000);
  assert.strictEqual(result.lossReliefUsed, 40_000_000);
  assert.strictEqual(result.chargeableBusinessIncome, 60_000_000);
  assert.strictEqual(result.lossCarriedForward, 0);
  assert.strictEqual(result.incomeTax, 18_000_000);
});

test("Brought-forward loss partially absorbed", () => {
  const result = computeSimpleCorporateTax({
    netProfitBeforeTax: 30_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 50_000_000,
    rateCategory: "standard",
  });

  assert.strictEqual(result.adjustedProfit, 30_000_000);
  assert.strictEqual(result.lossReliefUsed, 30_000_000);
  assert.strictEqual(result.chargeableBusinessIncome, 0);
  assert.strictEqual(result.lossCarriedForward, 20_000_000);
  assert.strictEqual(result.incomeTax, 0);
});

test("Brought-forward loss exceeding current-year income (zero profit case)", () => {
  const result = computeSimpleCorporateTax({
    netProfitBeforeTax: 0,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 50_000_000,
    rateCategory: "standard",
  });

  assert.strictEqual(result.adjustedProfit, 0);
  assert.strictEqual(result.lossReliefUsed, 0);
  assert.strictEqual(result.chargeableBusinessIncome, 0);
  assert.strictEqual(result.lossCarriedForward, 50_000_000);
  assert.strictEqual(result.incomeTax, 0);
});

test("Negative adjusted profit → fresh loss this year, chargeable income floors at 0", () => {
  const result = computeSimpleCorporateTax({
    netProfitBeforeTax: -40_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 10_000_000,
    rateCategory: "standard",
  });

  assert.strictEqual(result.adjustedProfit, -40_000_000);
  assert.strictEqual(result.lossReliefUsed, 0);
  assert.strictEqual(result.chargeableBusinessIncome, 0);
  assert.strictEqual(result.lossCarriedForward, 50_000_000); // 10M old + 40M fresh
  assert.strictEqual(result.incomeTax, 0);
});

test("Listed (25%) vs standard (30%) rate selection", () => {
  const resultListed = computeSimpleCorporateTax({
    netProfitBeforeTax: 10_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 0,
    rateCategory: "listed",
  });

  const resultStandard = computeSimpleCorporateTax({
    netProfitBeforeTax: 10_000_000,
    lumpSumAddBacks: 0,
    lumpSumDeductions: 0,
    broughtForwardLoss: 0,
    rateCategory: "standard",
  });

  assert.strictEqual(resultListed.taxRate, 0.25);
  assert.strictEqual(resultListed.incomeTax, 2_500_000);

  assert.strictEqual(resultStandard.taxRate, 0.30);
  assert.strictEqual(resultStandard.incomeTax, 3_000_000);
});

test("Branch repatriation tax computed and added independently of income tax", () => {
  const result = computeCorporateTax({
    netProfitBeforeTax: 50_000_000,
    addBacks: 0,
    deductions: 0,
    netCapitalGains: 0,
    broughtForwardLoss: 0,
    rateCategory: "standard",
    repatriatedBranchProfit: 20_000_000,
  });

  assert.strictEqual(result.incomeTax, 15_000_000);
  assert.strictEqual(result.branchRepatriationTax, 3_000_000); // 20M * 15%
  assert.strictEqual(result.totalTaxPayable, 18_000_000);
});

test("Detailed-mode field aggregation sums correctly", () => {
  const addBacks = emptyAddBacks();
  addBacks.depreciation = 10_000_000;
  addBacks.entertainmentDisallowed = 5_000_000;
  addBacks.otherDisallowable = 5_000_000;

  const deductions = emptyDeductions();
  deductions.capitalAllowance = 12_000_000;
  deductions.exemptIncome = 3_000_000;

  const result = computeCorporateTax({
    netProfitBeforeTax: 100_000_000,
    addBacks,
    deductions,
    netCapitalGains: 0,
    broughtForwardLoss: 0,
    rateCategory: "standard",
    repatriatedBranchProfit: 0,
  });

  assert.strictEqual(result.totalAddBacks, 20_000_000);
  assert.strictEqual(result.totalDeductions, 15_000_000);
  assert.strictEqual(result.adjustedProfit, 105_000_000);
});

test("Simple-mode lump sums produce identical results to detailed-mode fields", () => {
  const addBacks = emptyAddBacks();
  addBacks.depreciation = 10_000_000;
  addBacks.entertainmentDisallowed = 5_000_000;
  addBacks.otherDisallowable = 5_000_000;

  const deductions = emptyDeductions();
  deductions.capitalAllowance = 12_000_000;
  deductions.exemptIncome = 3_000_000;

  const detailedResult = computeCorporateTax({
    netProfitBeforeTax: 100_000_000,
    addBacks,
    deductions,
    netCapitalGains: 0,
    broughtForwardLoss: 25_000_000,
    rateCategory: "standard",
    repatriatedBranchProfit: 0,
  });

  const simpleResult = computeSimpleCorporateTax({
    netProfitBeforeTax: 100_000_000,
    lumpSumAddBacks: 20_000_000,
    lumpSumDeductions: 15_000_000,
    broughtForwardLoss: 25_000_000,
    rateCategory: "standard",
  });

  assert.deepStrictEqual(detailedResult, simpleResult);
});
