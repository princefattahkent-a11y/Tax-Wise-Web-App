import { z } from "zod";

export const partnerInputSchema = z.object({
  name: z.string()
    .min(1, "Partner name cannot be empty")
    .transform((val) => val.trim()),
  ownershipPercentage: z.number()
    .gt(0, "Ownership must be greater than 0%")
    .lte(100, "Ownership cannot exceed 100%"),
  isResident: z.boolean().default(true),
});

export const rentalTaxInputSchema = z.object({
  incomePeriod: z.enum(["monthly", "annual"]),
  grossIncome: z.number()
    .min(0, "Gross income cannot be negative"),
  taxpayerType: z.enum(["resident_individual", "non_resident_individual", "company", "partnership"]),
  partners: z.array(partnerInputSchema).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.taxpayerType === "partnership") {
    const partners = data.partners || [];

    // 1. Check partner count bounds
    if (partners.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partners"],
        message: "A partnership must have at least 2 partners",
      });
    } else if (partners.length > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partners"],
        message: "A partnership cannot exceed 20 partners",
      });
    }

    // 2. Check unique names (case-insensitive, trimmed)
    const names = partners.map((p) => p.name.trim().toLowerCase()).filter((n) => n !== "");
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partners"],
        message: "Partner names must be unique (case-insensitive)",
      });
    }

    // 3. Check ownership sum totals 100% (±0.01 tolerance)
    if (partners.length >= 2) {
      const totalOwnership = partners.reduce((sum, p) => sum + (Number(p.ownershipPercentage) || 0), 0);
      if (Math.abs(totalOwnership - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["partners"],
          message: `Total ownership across all partners must sum to exactly 100% (currently at ${totalOwnership.toFixed(2)}%)`,
        });
      }
    }
  }
});

export type RentalTaxFormInput = z.infer<typeof rentalTaxInputSchema>;
