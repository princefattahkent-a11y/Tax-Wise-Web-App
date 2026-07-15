"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Download, 
  AlertCircle, 
  Info, 
  Percent, 
  ShieldAlert, 
  Users, 
  TrendingUp,
  UserCheck
} from "lucide-react";
import { C } from "../lib/constants";
import { Card } from "./UI";
import { 
  calculateRentalTax, 
  calculatePartnership, 
  annualiseIncome,
  PartnerInput
} from "../lib/calculations";
import { rentalTaxInputSchema } from "../lib/schemas";

const formatUGX = (n: number) => {
  return "UGX " + Math.round(n).toLocaleString("en-US");
};

export const RentalTaxCalculator: React.FC = () => {
  const [incomePeriod, setIncomePeriod] = useState<"monthly" | "annual">("annual");
  const [grossIncomeInput, setGrossIncomeInput] = useState<string>("12,000,000");
  const [taxpayerType, setTaxpayerType] = useState<
    "resident_individual" | "non_resident_individual" | "company" | "partnership"
  >("resident_individual");

  // Partnership State
  const [partners, setPartners] = useState<PartnerInput[]>([
    { name: "Partner A", ownershipPercentage: 50, isResident: true },
    { name: "Partner B", ownershipPercentage: 50, isResident: true }
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Parse raw text input for gross income
  const grossIncome = useMemo(() => {
    const digits = grossIncomeInput.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
  }, [grossIncomeInput]);

  // Annualized Income
  const annualGrossIncome = useMemo(() => {
    return incomePeriod === "monthly" ? annualiseIncome(grossIncome) : grossIncome;
  }, [incomePeriod, grossIncome]);

  // Trigger Zod validation on inputs
  useEffect(() => {
    const dataToValidate = {
      incomePeriod,
      grossIncome: annualGrossIncome,
      taxpayerType,
      partners: taxpayerType === "partnership" ? partners : []
    };

    const result = rentalTaxInputSchema.safeParse(dataToValidate);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => issue.message);
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  }, [incomePeriod, annualGrossIncome, taxpayerType, partners]);

  // Handle number input formatting
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (rawValue === "") {
      setGrossIncomeInput("");
      return;
    }
    const num = parseInt(rawValue, 10);
    if (!isNaN(num)) {
      setGrossIncomeInput(num.toLocaleString("en-US"));
    }
  };

  // Partnership partner helpers
  const handleAddPartner = () => {
    if (partners.length >= 20) return;
    const nextLetter = String.fromCharCode(65 + partners.length); // Partner C, D, etc.
    const remainingOwnership = Math.max(0, 100 - partners.reduce((sum, p) => sum + p.ownershipPercentage, 0));
    setPartners([
      ...partners,
      { name: `Partner ${nextLetter}`, ownershipPercentage: remainingOwnership || 10, isResident: true }
    ]);
  };

  const handleRemovePartner = (index: number) => {
    if (partners.length <= 2) return;
    setPartners(partners.filter((_, i) => i !== index));
  };

  const handlePartnerChange = (index: number, field: keyof PartnerInput, value: any) => {
    const updated = partners.map((p, i) => {
      if (i === index) {
        if (field === "ownershipPercentage") {
          const num = parseFloat(value);
          return { ...p, [field]: isNaN(num) ? 0 : num };
        }
        return { ...p, [field]: value };
      }
      return p;
    });
    setPartners(updated);
  };

  // Live calculation results
  const results = useMemo(() => {
    if (taxpayerType === "partnership") {
      return calculatePartnership(annualGrossIncome, partners);
    } else {
      return calculateRentalTax(annualGrossIncome, taxpayerType);
    }
  }, [annualGrossIncome, taxpayerType, partners]);

  // Client-side PDF Report download using html2pdf.js
  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById("rental-tax-pdf-report");
      if (!element) return;

      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 15,
        filename: `TaxWise_Rental_Tax_Report_${taxpayerType}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPartnershipPercentage = useMemo(() => {
    return partners.reduce((sum, p) => sum + p.ownershipPercentage, 0);
  }, [partners]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", color: C.navy, margin: 0, fontWeight: 800 }}>
            Rental Income Tax Calculator
          </h1>
          <p style={{ color: C.muted, fontSize: "0.95rem", margin: "4px 0 0 0", maxWidth: 650 }}>
            Calculate your rental income tax obligation under the Uganda Income Tax Act. Supports residents, non-residents, corporations, and joint-partnership assets.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting || validationErrors.length > 0}
          style={{
            background: isExporting ? C.border : `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
            color: C.white,
            padding: "12px 20px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: isExporting || validationErrors.length > 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(26, 123, 107, 0.25)",
            transition: "all 0.2s"
          }}
        >
          <Download size={16} />
          {isExporting ? "Generating PDF..." : "Export Official Report"}
        </button>
      </div>

      {/* DISCIPLINARY LEGISLATIVE NOTICE */}
      <div style={{ display: "flex", gap: 12, background: "rgba(200, 146, 42, 0.08)", border: `1.5px solid rgba(200, 146, 42, 0.25)`, borderRadius: 16, padding: 18, alignItems: "flex-start" }}>
        <ShieldAlert size={22} style={{ color: C.gold, flexShrink: 0, marginTop: 2 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "14px", fontWeight: 800, color: C.navy }}>URA Rent Tax Statutory Advisory</span>
          <p style={{ fontSize: "13px", color: C.muted, margin: 0, lineHeight: 1.6 }}>
            <strong>Important Legal Notice:</strong> For all individual landlords (residents and non-residents), <strong>no deductions of any kind are allowable</strong>. Explicitly, repairs, maintenance, insurance, agent commissions, security, management fees, and interest on mortgage/construction loans cannot be deducted. The tax applies flatly to gross income (minus the resident threshold). Corporate landlords are entitled to a flat 50% deemed expense deduction.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28, alignItems: "start" }} className="md:grid-cols-1">
        
        {/* LEFT COLUMN: INPUTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card style={{ padding: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 4 }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: C.navy, display: "flex", alignItems: "center", gap: 8 }}>
                  <Calculator size={18} style={{ color: C.teal }} />
                  Property Revenue Configuration
                </span>
              </div>

              {/* Income Period Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>Billing Periodicity</label>
                <div style={{ display: "flex", background: C.offwhite, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
                  <button
                    type="button"
                    onClick={() => setIncomePeriod("monthly")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "none",
                      background: incomePeriod === "monthly" ? C.white : "transparent",
                      color: incomePeriod === "monthly" ? C.teal : C.muted,
                      cursor: "pointer",
                      boxShadow: incomePeriod === "monthly" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    Monthly Rental Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomePeriod("annual")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "none",
                      background: incomePeriod === "annual" ? C.white : "transparent",
                      color: incomePeriod === "annual" ? C.teal : C.muted,
                      cursor: "pointer",
                      boxShadow: incomePeriod === "annual" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    Annual Rental Income
                  </button>
                </div>
              </div>

              {/* Gross Rental Income Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>
                    Gross Rental Income ({incomePeriod})
                  </label>
                  {incomePeriod === "monthly" && (
                    <span style={{ fontSize: "11px", color: C.teal, fontWeight: 700, background: `${C.teal}12`, padding: "2px 8px", borderRadius: 999 }}>
                      Annualized: {formatUGX(annualGrossIncome)}
                    </span>
                  )}
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: 16, fontSize: "13px", fontWeight: 800, color: C.muted }}>UGX</span>
                  <input
                    type="text"
                    value={grossIncomeInput}
                    onChange={handleIncomeChange}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: "14px 16px 14px 50px",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: C.navy,
                      fontFamily: "inherit",
                      background: C.white,
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Taxpayer Entity Classification */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>Taxpayer Entity Classification</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={taxpayerType}
                    onChange={(e: any) => setTaxpayerType(e.target.value)}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: C.navy,
                      fontFamily: "inherit",
                      background: C.white,
                      outline: "none",
                      appearance: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="resident_individual">Resident Individual landlord</option>
                    <option value="non_resident_individual">Non-Resident Individual landlord</option>
                    <option value="company">Corporate Entity / Company landlord</option>
                    <option value="partnership">Joint Venture / Partnership Asset</option>
                  </select>
                  <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted, fontWeight: 700 }}>▼</div>
                </div>
              </div>

              {/* PARTNERSHIP DYNAMIC PANEL */}
              {taxpayerType === "partnership" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, background: C.offwhite, padding: 18, borderRadius: 16, border: `1.5px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy, display: "flex", alignItems: "center", gap: 6 }}>
                      <Users size={16} style={{ color: C.teal }} />
                      Partners Allocation Ledger
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPartner}
                      disabled={partners.length >= 20}
                      style={{
                        background: "transparent",
                        border: `1.5px solid ${C.teal}`,
                        color: C.teal,
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Plus size={13} /> Add Partner
                    </button>
                  </div>

                  {/* Partnership stats indicators */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: C.white, borderRadius: 10, padding: 10, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: C.muted, fontWeight: 500 }}>Active Partners</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy }}>{partners.length} / 20</div>
                    </div>
                    <div style={{ 
                      background: C.white, 
                      borderRadius: 10, 
                      padding: 10, 
                      border: `1px solid ${Math.abs(totalPartnershipPercentage - 100) > 0.01 ? "rgba(220,53,69,0.2)" : C.border}`, 
                      textAlign: "center" 
                    }}>
                      <div style={{ fontSize: "11px", color: C.muted, fontWeight: 500 }}>Total Share allocated</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: Math.abs(totalPartnershipPercentage - 100) > 0.01 ? C.red : C.teal }}>
                        {totalPartnershipPercentage.toFixed(1)}% / 100%
                      </div>
                    </div>
                  </div>

                  {/* Partners list inputs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {partners.map((p, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: "flex", 
                          gap: 10, 
                          alignItems: "center", 
                          background: C.white, 
                          padding: 10, 
                          borderRadius: 12, 
                          border: `1px solid ${C.border}` 
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Name"
                          value={p.name}
                          onChange={(e) => handlePartnerChange(index, "name", e.target.value)}
                          style={{
                            flex: 1.5,
                            border: `1.5px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "8px 10px",
                            fontSize: "12.5px",
                            outline: "none",
                            fontWeight: 600,
                            color: C.navy,
                            background: C.offwhite
                          }}
                        />
                        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                          <input
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            placeholder="Share"
                            value={p.ownershipPercentage || ""}
                            onChange={(e) => handlePartnerChange(index, "ownershipPercentage", e.target.value)}
                            style={{
                              width: "100%",
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 8,
                              padding: "8px 24px 8px 10px",
                              fontSize: "12.5px",
                              outline: "none",
                              fontWeight: 600,
                              color: C.navy,
                              background: C.offwhite,
                              appearance: "none"
                            }}
                          />
                          <span style={{ position: "absolute", right: 10, fontSize: "11px", color: C.muted, fontWeight: 700 }}>%</span>
                        </div>
                        <select
                          value={p.isResident ? "resident" : "non_resident"}
                          onChange={(e) => handlePartnerChange(index, "isResident", e.target.value === "resident")}
                          style={{
                            flex: 1.2,
                            border: `1.5px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "8px 6px",
                            fontSize: "12.5px",
                            outline: "none",
                            fontWeight: 600,
                            color: C.navy,
                            background: C.offwhite,
                            cursor: "pointer"
                          }}
                        >
                          <option value="resident">Resident</option>
                          <option value="non_resident">Non-Res</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemovePartner(index)}
                          disabled={partners.length <= 2}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: partners.length <= 2 ? "not-allowed" : "pointer",
                            color: partners.length <= 2 ? C.border : C.red,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 4
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Error Banner Area */}
              {validationErrors.length > 0 && (
                <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}30`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <AlertCircle size={16} style={{ color: C.red, marginTop: 1, flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: C.red }}>Input Validation Issues</span>
                      {validationErrors.map((err, idx) => (
                        <span key={idx} style={{ fontSize: "11.5px", color: C.navy }}>• {err}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* DEDUCTIBILITY ADVISORY NOTES CARD */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                <Info size={18} style={{ color: C.gold }} />
                <span style={{ fontSize: "14px", fontWeight: 800, color: C.navy }}>Rent Tax Deductibility Reference Guide</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <span style={{ fontSize: "12.5px", fontWeight: 800, color: C.teal, display: "block", marginBottom: 6 }}>Corporate Landlords (Companies)</span>
                  <p style={{ fontSize: "12px", color: C.muted, margin: 0, lineHeight: 1.6 }}>
                    Eligible for a flat <strong>50% deemed expense deduction</strong> on gross rental earnings. No itemization of expenses is required or analyzed by the URA. This is a statutory benefit.
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "12.5px", fontWeight: 800, color: C.red, display: "block", marginBottom: 6 }}>Individual Landlords (Residents/Non-Res)</span>
                  <p style={{ fontSize: "12px", color: C.muted, margin: 0, lineHeight: 1.6 }}>
                    <strong>Zero deductions allowed</strong>. Repairs, security, cleaning, property-management, loan/construction interest, and depreciation are <strong>non-deductible</strong>. No expenses should be declared to reduce the rental income tax base.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: CALCULATION RESULTS SUMMARY */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* MAIN OUTPUT CARD */}
          <div style={{ background: `${C.teal}10`, border: `1.5px solid ${C.teal}30`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: C.teal, letterSpacing: "0.06em", textTransform: "uppercase" }}>Estimated Rental Tax Obligation</span>
              <Percent size={18} style={{ color: C.teal }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "2.35rem", fontWeight: 900, color: C.navy, letterSpacing: "-0.02em" }}>
                {validationErrors.length > 0 ? "—" : formatUGX("totalTaxPayable" in results ? results.totalTaxPayable : results.taxPayable)}
              </span>
              <span style={{ fontSize: "12.5px", color: C.muted, marginTop: 4 }}>
                This is the net statutory rental tax due to the Uganda Revenue Authority (URA) based on the current rates.
              </span>
            </div>

            <div style={{ borderTop: `1px dashed ${C.teal}30`, paddingTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Gross Property Revenue:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(annualGrossIncome)}</span>
              </div>

              {taxpayerType === "company" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: C.muted, fontWeight: 500 }}>Deemed Expense Deduction (50%):</span>
                  <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX((results as any).deemedDeduction ?? 0)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Chargeable Base Income:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>
                  {validationErrors.length > 0 ? "—" : formatUGX((results as any).chargeableIncome ?? 0)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Effective Rent Tax Rate:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>
                  {validationErrors.length > 0 ? "—" : `${(((results as any).overallEffectiveRate ?? (results as any).effectiveRate ?? 0) * 100).toFixed(2)}%`}
                </span>
              </div>
            </div>
          </div>

          {/* STEP BY STEP FORMULA BREAKDOWN */}
          {validationErrors.length === 0 && (
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy, display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 14 }}>
                <TrendingUp size={16} style={{ color: C.teal }} />
                <span>Statutory Step-by-Step Breakdown</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results.steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      background: step.isFormula ? `${C.teal}08` : C.offwhite, 
                      padding: "10px 14px", 
                      borderRadius: 10,
                      border: step.isFormula ? `1px solid rgba(26,123,107,0.15)` : "1px solid transparent"
                    }}
                  >
                    <span style={{ fontSize: "12px", color: C.navy, fontWeight: step.isFormula ? 700 : 500 }}>
                      {step.label}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 800, color: step.isFormula ? C.teal : C.navy }}>
                      {step.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* REGULATORY DISCLAIMER Matches TaxWise Standard */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <UserCheck size={18} style={{ color: C.muted, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: "11px", color: C.muted, margin: 0, lineHeight: 1.5 }}>
                <strong>Disclaimer:</strong> This tool is provided for educational and advisory guidance only. Calculations are based on Uganda&apos;s Income Tax Act and current URA rules. It does not replace formal legal or professional tax consultation. Always file official returns via the URA e-Tax portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* HIDDEN OFF-SCREEN PDF TEMPLATE FOR CLEAN PRINTING */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div 
          id="rental-tax-pdf-report" 
          style={{ 
            width: "185mm", 
            minHeight: "265mm", 
            background: "#FFFFFF", 
            color: "#0F2044", 
            fontFamily: "'Inter', sans-serif", 
            padding: "24px",
            boxSizing: "border-box"
          }}
        >
          {/* PDF HEADER BRANDING */}
          <div style={{ borderBottom: "2px solid #1A7B6B", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em", color: "#0F2044" }}>
                TAX<span style={{ color: "#1A7B6B" }}>WISE</span> UGANDA
              </div>
              <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "4px" }}>
                Statutory Assessment & Tax Compliance Report
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#1A7B6B" }}>RENTAL INCOME TAX</div>
              <div style={{ fontSize: "9px", color: "#6B7280", marginTop: "2px" }}>Generated on: {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</div>
            </div>
          </div>

          {/* ASSESSMENT DETAILS SUMMARY */}
          <div style={{ background: "#FAFAF8", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0F2044", marginBottom: "12px", borderBottom: "1px solid #E5E7EB", paddingBottom: "6px" }}>
              Assessment Criteria & Classification
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ fontSize: "11px" }}>
                <span style={{ color: "#6B7280" }}>Taxpayer Entity:</span>{" "}
                <strong style={{ color: "#0F2044", textTransform: "capitalize" }}>{taxpayerType.replace("_", " ")}</strong>
              </div>
              <div style={{ fontSize: "11px" }}>
                <span style={{ color: "#6B7280" }}>Declaration Period:</span>{" "}
                <strong style={{ color: "#0F2044", textTransform: "capitalize" }}>{incomePeriod}</strong>
              </div>
              <div style={{ fontSize: "11px" }}>
                <span style={{ color: "#6B7280" }}>Declared Gross Income:</span>{" "}
                <strong style={{ color: "#0F2044" }}>{formatUGX(grossIncome)}</strong>
              </div>
              <div style={{ fontSize: "11px" }}>
                <span style={{ color: "#6B7280" }}>Annualized Gross Income:</span>{" "}
                <strong style={{ color: "#1A7B6B" }}>{formatUGX(annualGrossIncome)}</strong>
              </div>
            </div>
          </div>

          {/* THE BIG RESULT OBLIGATION */}
          <div style={{ background: "rgba(26, 123, 107, 0.08)", borderRadius: "12px", border: "1px solid rgba(26, 123, 107, 0.2)", padding: "18px", textAlign: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#1A7B6B", marginBottom: "6px" }}>
              Approved Rental Tax Payable (Assessment Due)
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#0F2044" }}>
              {formatUGX("totalTaxPayable" in results ? results.totalTaxPayable : results.taxPayable)}
            </div>
            <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "6px" }}>
              Effective Tax Rate: {(((results as any).overallEffectiveRate ?? (results as any).effectiveRate ?? 0) * 100).toFixed(2)}% of Gross Rent
            </div>
          </div>

          {/* DYNAMIC CALCULATION BREAKDOWN */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0F2044", marginBottom: "10px", borderBottom: "1px solid #E5E7EB", paddingBottom: "6px" }}>
              Step-By-Step Mathematical Audit
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
              <tbody>
                {results.steps.map((step, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6", background: step.isFormula ? "#F9FAFB" : "transparent" }}>
                    <td style={{ padding: "8px 10px", color: step.isFormula ? "#0F2044" : "#4B5563", fontWeight: step.isFormula ? 700 : 500 }}>
                      {step.label}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: step.isFormula ? "#1A7B6B" : "#0F2044" }}>
                      {step.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PARTNERS DETAILED LIST IF APPLICABLE */}
          {taxpayerType === "partnership" && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0F2044", marginBottom: "10px", borderBottom: "1px solid #E5E7EB", paddingBottom: "6px" }}>
                Partnership Shares & Individual Assessments
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #E5E7EB", background: "#FAFAF8", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px", color: "#4B5563" }}>Partner Name</th>
                    <th style={{ padding: "6px 8px", color: "#4B5563" }}>Ownership</th>
                    <th style={{ padding: "6px 8px", color: "#4B5563" }}>Residency</th>
                    <th style={{ padding: "6px 8px", color: "#4B5563" }}>Gross Share</th>
                    <th style={{ padding: "6px 8px", color: "#4B5563", textAlign: "right" }}>Tax Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as any).partners?.map((p: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: "6px 8px" }}>{p.ownershipPercentage}%</td>
                      <td style={{ padding: "6px 8px" }}>{p.isResident ? "Resident" : "Non-Res"}</td>
                      <td style={{ padding: "6px 8px" }}>{formatUGX(p.grossShare)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#1A7B6B" }}>{formatUGX(p.taxPayable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REGULATORY COMPLIANCE MEMO */}
          <div style={{ background: "#FAFAF8", borderRadius: "10px", border: "1px solid #E5E7EB", padding: "12px", marginTop: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#9B721A", marginBottom: "4px" }}>
              URA COMPLIANCE MEMORANDUM & EXPENSE RESTRICTION RULES:
            </div>
            <p style={{ fontSize: "9px", color: "#4B5563", margin: 0, lineHeight: 1.4 }}>
              Pursuant to the Sixth Schedule of the Income Tax Act of Uganda: Individual taxpayers (both residents and non-residents) are assessed on rental gross receipts with no legal allowances for operational expenses, repairs, insurance, property manager commissions, or loan interest. Underdeclaration of gross rentals or fraudulent claims of itemized deductions exposes landlords to severe administrative penalties, interest on outstanding balances, and penal tax under the Tax Procedures Code Act.
            </p>
          </div>

          {/* PRINT FOOTER DISCLAIMER */}
          <div style={{ marginTop: "24px", borderTop: "1.5px solid #E5E7EB", paddingTop: "10px", textAlign: "center" }}>
            <p style={{ fontSize: "8px", color: "#9CA3AF", margin: 0, lineHeight: 1.4 }}>
              This report is powered by TaxWise Uganda. It is intended for advisory and statutory guidance purposes only and does not constitute formal legal counsel. Formal tax filing must be processed directly on the URA e-Tax portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
