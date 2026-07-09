// DESIGN TOKENS
export const C = {
  navy: "var(--color-navy)", 
  navyLight: "var(--color-navy-light)",
  teal: "var(--color-teal)", 
  tealLight: "var(--color-teal-light)", 
  tealDark: "var(--color-teal-dark)",
  gold: "var(--color-gold)", 
  goldLight: "var(--color-gold-light)",
  white: "var(--color-white)", 
  offwhite: "var(--color-offwhite)",
  border: "var(--color-border)", 
  muted: "var(--color-muted)", 
  text: "var(--color-text)",
  red: "var(--color-red)", 
  redLight: "var(--color-red-light)",
  green: "var(--color-green)", 
  greenLight: "var(--color-green-light)",
};

export const riskColors: Record<string, [string, string]> = {
  high: [C.red, C.redLight],
  medium: [C.gold, C.goldLight],
  low: [C.teal, C.tealLight],
};

export const levelColors: Record<string, [string, string]> = {
  Beginner: [C.teal, C.tealLight],
  Intermediate: [C.gold, C.goldLight],
  Professional: ["var(--color-prof-text)", "var(--color-prof-bg)"],
};

export interface ComplianceItem {
  id: string;
  text: string;
  risk: "high" | "medium" | "low";
}

export const COMPLIANCE_ITEMS: Record<string, ComplianceItem[]> = {
  efris: [
    { id: "e1", text: "Business registered on eFRIS portal (efris.ura.go.ug)", risk: "high" },
    { id: "e2", text: "Fiscal device (ERD/VSDC) approved and activated by URA", risk: "high" },
    { id: "e3", text: "All sales issued with QR-coded fiscal receipts", risk: "high" },
    { id: "e4", text: "eFRIS device connected to internet / transmitting to URA servers", risk: "high" },
    { id: "e5", text: "Staff trained on how to issue eFRIS receipts correctly", risk: "medium" },
    { id: "e6", text: "Backup receipting procedure in place for internet outages", risk: "medium" },
    { id: "e7", text: "Monthly reconciliation of eFRIS receipts vs sales records", risk: "medium" },
    { id: "e8", text: "Customer complaints log for receipt issues maintained", risk: "low" },
  ],
  vat: [
    { id: "v1", text: "VAT registration certificate obtained from URA", risk: "high" },
    { id: "v2", text: "Monthly VAT return filed by 15th of following month", risk: "high" },
    { id: "v3", text: "Output VAT correctly charged at 18% on all standard-rated supplies", risk: "high" },
    { id: "v4", text: "Input VAT claims supported by valid tax invoices", risk: "high" },
    { id: "v5", text: "Zero-rated and exempt supplies identified and documented", risk: "medium" },
    { id: "v6", text: "VAT on imports accounted for (import VAT declarations)", risk: "medium" },
    { id: "v7", text: "Reverse charge VAT applied on imported services", risk: "medium" },
    { id: "v8", text: "VAT refund claims filed within 6 months of over-payment", risk: "low" },
  ],
  paye: [
    { id: "p1", text: "All employees registered with URA and have valid TINs", risk: "high" },
    { id: "p2", text: "PAYE calculated correctly on gross pay using current tax bands", risk: "high" },
    { id: "p3", text: "PAYE remitted to URA by 15th of following month", risk: "high" },
    { id: "p4", text: "NSSF deducted (10% employee + 10% employer) and remitted", risk: "high" },
    { id: "p5", text: "Monthly PAYE return (Form 5) filed with URA", risk: "high" },
    { id: "p6", text: "P9 forms (annual tax summaries) issued to all employees by June 30", risk: "medium" },
    { id: "p7", text: "Casual/contract workers assessed for employed vs self-employed status", risk: "medium" },
    { id: "p8", text: "Benefits in kind (company car, housing) included in taxable pay", risk: "medium" },
  ]
};
