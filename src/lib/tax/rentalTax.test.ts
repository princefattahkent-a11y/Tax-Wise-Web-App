import { calculateRentalTax, calculatePartnership, isOwnershipValid, annualiseIncome } from "../calculations";
import { rentalTaxInputSchema } from "../schemas";

function assert(testName: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (details) console.error(`   Reason: ${details}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function runTests() {
  console.log("==========================================");
  console.log("RENTAL INCOME TAX ENGINE UNIT TESTS");
  console.log("==========================================\n");

  // 1. annualiseIncome
  assert("Annualise Income - Positive", annualiseIncome(100000) === 1200000);
  assert("Annualise Income - Zero", annualiseIncome(0) === 0);
  assert("Annualise Income - Negative clamped", annualiseIncome(-50000) === 0);

  // 2. Resident Individual Calculations
  const res1 = calculateRentalTax(2000000, "resident_individual");
  assert("Resident below threshold - Tax is 0", res1.taxPayable === 0);
  assert("Resident below threshold - Chargeable is 0", res1.chargeableIncome === 0);

  const res2 = calculateRentalTax(5000000, "resident_individual");
  assert("Resident above threshold - Chargeable correct", res2.chargeableIncome === (5000000 - 2820000));
  assert("Resident above threshold - Tax correct", res2.taxPayable === (5000000 - 2820000) * 0.12);

  // 3. Non-resident Individual Calculations
  const nonRes1 = calculateRentalTax(5000000, "non_resident_individual");
  assert("Non-resident flat - Chargeable correct", nonRes1.chargeableIncome === 5000000);
  assert("Non-resident flat - Tax correct", nonRes1.taxPayable === 5000000 * 0.15);

  // 4. Company Calculations
  const comp1 = calculateRentalTax(12000000, "company");
  assert("Company deemed deduction (50%)", comp1.deemedDeduction === 6000000);
  assert("Company chargeable income (50%)", comp1.chargeableIncome === 6000000);
  assert("Company tax payable (30% on chargeable)", comp1.taxPayable === 1800000); // 6,000,000 * 0.30

  // 5. Partnership Validation
  const partnersValid = [
    { name: "Partner A", ownershipPercentage: 60, isResident: true },
    { name: "Partner B", ownershipPercentage: 40, isResident: false }
  ];
  assert("Partnership valid count & ownership", isOwnershipValid(partnersValid) === true);

  const partnersInvalidSum = [
    { name: "Partner A", ownershipPercentage: 60, isResident: true },
    { name: "Partner B", ownershipPercentage: 39, isResident: false }
  ];
  assert("Partnership invalid ownership sum (99%)", isOwnershipValid(partnersInvalidSum) === false);

  const partnersTooFew = [
    { name: "Partner A", ownershipPercentage: 100, isResident: true }
  ];
  assert("Partnership too few partners", isOwnershipValid(partnersTooFew) === false);

  // 6. Partnership Calculations
  const partCalc = calculatePartnership(10000000, partnersValid);
  // Partner A: grossShare = 6,000,000, resident_individual -> taxPayable = (6,000,000 - 2,820,000) * 0.12 = 3,180,000 * 0.12 = 381,600
  // Partner B: grossShare = 4,000,000, non_resident_individual -> taxPayable = 4,000,000 * 0.15 = 600,000
  // Total = 981,600
  assert("Partner A share calculated correctly", partCalc.partners[0].grossShare === 6000000);
  assert("Partner A tax calculated correctly", partCalc.partners[0].taxPayable === 381600);
  assert("Partner B tax calculated correctly", partCalc.partners[1].taxPayable === 600000);
  assert("Partnership total tax correct", partCalc.totalTaxPayable === 981600);

  // 7. Zod Schema validation testing
  const schemaTest1 = rentalTaxInputSchema.safeParse({
    incomePeriod: "annual",
    grossIncome: 10000000,
    taxpayerType: "partnership",
    partners: partnersValid
  });
  assert("Zod schema valid input", schemaTest1.success === true);

  const schemaTest2 = rentalTaxInputSchema.safeParse({
    incomePeriod: "annual",
    grossIncome: 10000000,
    taxpayerType: "partnership",
    partners: partnersInvalidSum
  });
  assert("Zod schema invalid ownership sum", schemaTest2.success === false);

  const schemaTestDuplicate = rentalTaxInputSchema.safeParse({
    incomePeriod: "annual",
    grossIncome: 10000000,
    taxpayerType: "partnership",
    partners: [
      { name: "Partner A", ownershipPercentage: 50, isResident: true },
      { name: "partner a", ownershipPercentage: 50, isResident: false }
    ]
  });
  assert("Zod schema duplicate partner names (case-insensitive)", schemaTestDuplicate.success === false);

  console.log("\nAll rental income tax tests completed successfully!");
}

runTests();
