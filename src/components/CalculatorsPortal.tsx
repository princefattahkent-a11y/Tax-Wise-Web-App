"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { C } from "../lib/constants";
import { Card } from "./UI";
import { supabase } from "../lib/supabaseClient";
import { CorporateTaxCalculator } from "./CorporateTaxCalculator";

interface CalculatorTab {
  id: string;
  title: string;
  description: string;
  accent: string;
  helper: string;
  inputLabel: string;
  inputValue: number;
  inputMin: number;
  format: (value: number) => string;
}

const calculatorTabs: CalculatorTab[] = [
  {
    id: "paye",
    title: "PAYE Estimator",
    description: "Quick estimate for monthly employee PAYE from gross salary.",
    accent: C.teal,
    helper: "Useful when preparing payroll or explaining gross-to-net impact.",
    inputLabel: "Gross monthly pay (UGX)",
    inputValue: 2500000,
    inputMin: 0,
    format: (value: number) => `UGX ${Math.round(value).toLocaleString()}`,
  },
  {
    id: "vat",
    title: "VAT Calculator",
    description: "Estimate VAT on a taxable supply or invoice value.",
    accent: C.navy,
    helper: "Ideal for invoices, cashbook entries, and VAT filing prep.",
    inputLabel: "Taxable amount (UGX)",
    inputValue: 1000000,
    inputMin: 0,
    format: (value: number) => `UGX ${Math.round(value).toLocaleString()}`,
  },
  {
    id: "wht",
    title: "Withholding Tax",
    description: "Apply a simple withholding tax rate to a payment or invoice.",
    accent: C.gold,
    helper: "Useful for service fees, professional payments, and contract work.",
    inputLabel: "Payment amount (UGX)",
    inputValue: 800000,
    inputMin: 0,
    format: (value: number) => `UGX ${Math.round(value).toLocaleString()}`,
  },
  {
    id: "import",
    title: "Vehicle Import Duty",
    description: "Estimate customs duty and VAT for vehicle imports.",
    accent: C.green,
    helper: "A practical planning tool for clearing agents and importers.",
    inputLabel: "Customs value (UGX)",
    inputValue: 30000000,
    inputMin: 0,
    format: (value: number) => `UGX ${Math.round(value).toLocaleString()}`,
  },
  {
    id: "corporate",
    title: "Corporate Tax",
    description: "Estimate corporate tax from annual taxable profit.",
    accent: C.tealDark,
    helper: "Helpful for year-end planning and provisional tax discussions.",
    inputLabel: "Taxable profit (UGX)",
    inputValue: 120000000,
    inputMin: 0,
    format: (value: number) => `UGX ${Math.round(value).toLocaleString()}`,
  },
];

export const CalculatorsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("paye");
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(calculatorTabs.map((tab) => [tab.id, tab.inputValue])));
  const [rates, setRates] = useState({
    paye: 10,
    vat: 18,
    wht: 6,
    import: 43,
    corporate: 30,
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key,value")
          .in("key", ["calc_paye_rate", "calc_vat_rate", "calc_wht_rate", "calc_import_rate", "calc_corporate_rate"]);

        if (!error && data && data.length > 0) {
          const rateMap = {
            paye: 10,
            vat: 18,
            wht: 6,
            import: 43,
            corporate: 30,
          };
          data.forEach(({ key, value }: { key: string; value: string }) => {
            const numValue = parseFloat(value) || 0;
            if (key === "calc_paye_rate") rateMap.paye = numValue;
            if (key === "calc_vat_rate") rateMap.vat = numValue;
            if (key === "calc_wht_rate") rateMap.wht = numValue;
            if (key === "calc_import_rate") rateMap.import = numValue;
            if (key === "calc_corporate_rate") rateMap.corporate = numValue;
          });
          setRates(rateMap);
        }
      } catch (e) {
        console.error("Failed to fetch calculator rates:", e);
      }
    };

    fetchRates();
  }, []);

  const formatInputValue = (value: number) => value.toLocaleString("en-US");

  const parseFormattedValue = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
  };

  const activeCalculator = useMemo(() => calculatorTabs.find((tab) => tab.id === activeTab) ?? calculatorTabs[0], [activeTab]);

  const result = useMemo(() => {
    const inputValue = values[activeCalculator.id] ?? activeCalculator.inputValue;
    switch (activeCalculator.id) {
      case "paye":
        return {
          label: "Estimated PAYE",
          value: Math.max(0, Math.round(inputValue * (rates.paye / 100))),
          rate: `${rates.paye}%`,
          note: "Standard employee tax from gross monthly salary.",
        };
      case "vat":
        return {
          label: "Estimated VAT",
          value: Math.max(0, Math.round(inputValue * (rates.vat / 100))),
          rate: `${rates.vat}%`,
          note: "Applies to standard-rated supplies and invoices.",
        };
      case "wht":
        return {
          label: "Withholding tax",
          value: Math.max(0, Math.round(inputValue * (rates.wht / 100))),
          rate: `${rates.wht}%`,
          note: "Typical WHT for services paid to non-residents.",
        };
      case "import":
        return {
          label: "Estimated duty + VAT",
          value: Math.max(0, Math.round(inputValue * (rates.import / 100))),
          rate: `${rates.import}%`,
          note: "Rough estimate for vehicle import duty plus VAT.",
        };
      case "corporate":
        return {
          label: "Estimated corporate tax",
          value: Math.max(0, Math.round(inputValue * (rates.corporate / 100))),
          rate: `${rates.corporate}%`,
          note: "Standard corporate rate on taxable profit.",
        };
      default:
        return {
          label: "Estimated amount",
          value: Math.max(0, Math.round(inputValue)),
          rate: "—",
          note: "Calculated using the selected formula.",
        };
    }
  }, [activeCalculator, values, rates]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: "flex", justifyContent: "center", padding: "0 24px" }}
    >
      <div style={{ width: "100%", maxWidth: 1120, display: "flex", flexDirection: "column", gap: 24 }}>
        <motion.div variants={itemVariants} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", color: C.navy, margin: 0, fontWeight: 800 }}>
              Tax calculators
            </h1>
            <p style={{ color: C.muted, fontSize: "1rem", margin: 0, maxWidth: 700 }}>
              Switch between practical calculators for payroll, VAT, withholding tax, import duty, and corporate planning.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {calculatorTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  style={{
                    border: `1px solid ${isActive ? tab.accent : C.border}`,
                    background: isActive ? `${tab.accent}12` : C.white,
                    color: isActive ? tab.accent : C.navy,
                    padding: "12px 18px",
                    borderRadius: 999,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    minWidth: 150,
                    textAlign: "center",
                    boxShadow: isActive ? "0 6px 18px rgba(26, 123, 107, 0.08)" : "none",
                  }}
                >
                  {tab.title}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "grid", gap: 20 }}>
          {activeTab === "corporate" ? (
            <Card style={{ padding: 28 }} hover>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: activeCalculator.accent, marginTop: 6 }} />
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: C.navy }}>{activeCalculator.title}</div>
                    <div style={{ color: C.muted, fontSize: "0.95rem", marginTop: 4 }}>{activeCalculator.description}</div>
                  </div>
                </div>
                <CorporateTaxCalculator />
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 24 }} hover>
              <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1.8fr 1fr" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: activeCalculator.accent, marginTop: 6 }} />
                    <div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: C.navy }}>{activeCalculator.title}</div>
                      <div style={{ color: C.muted, fontSize: "0.95rem", marginTop: 4 }}>{activeCalculator.description}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontWeight: 700, color: C.navy, fontSize: "0.9rem" }}>
                        {activeCalculator.inputLabel}
                        <input
                          type="text"
                          value={formatInputValue(values[activeCalculator.id] ?? activeCalculator.inputValue)}
                          inputMode="numeric"
                          onChange={(e) => {
                            const parsed = parseFormattedValue(e.target.value);
                            setValues((prev) => ({ ...prev, [activeCalculator.id]: parsed }));
                          }}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                            fontSize: "0.95rem",
                            fontFamily: "inherit",
                            background: C.offwhite,
                          }}
                        />
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ color: C.muted, fontSize: "0.88rem", lineHeight: 1.7 }}>{activeCalculator.helper}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <span style={{ fontWeight: 700, color: C.navy }}>Quick formula</span>
                          <div style={{ background: C.offwhite, borderRadius: 12, padding: 12, color: C.text, fontSize: "0.88rem", lineHeight: 1.6 }}>
                            {activeCalculator.id === "paye" && `PAYE = gross × ${rates.paye}%`}
                            {activeCalculator.id === "vat" && `VAT = amount × ${rates.vat}%`}
                            {activeCalculator.id === "wht" && `WHT = amount × ${rates.wht}%`}
                            {activeCalculator.id === "import" && `Duty + VAT = value × ${rates.import}%`}
                            {activeCalculator.id === "corporate" && `Corporate tax = profit × ${rates.corporate}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: `${activeCalculator.accent}12`, borderRadius: 20, padding: 22, minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: activeCalculator.accent, fontWeight: 800, marginBottom: 10 }}>
                        {result.label}
                      </div>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: C.navy, lineHeight: 1.05 }}>{activeCalculator.format(result.value)}</div>
                    </div>
                    <div style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>{result.note}</div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ background: C.offwhite, borderRadius: 16, padding: 18 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 10 }}>Key details</div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.navy }}>Rate</div>
                        <div style={{ fontSize: "0.95rem", color: C.muted }}>{result.rate}</div>
                      </div>
                    </div>
                    <div style={{ background: C.offwhite, borderRadius: 16, padding: 18 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 10 }}>Practical use</div>
                      <div style={{ fontSize: "0.9rem", color: C.muted, lineHeight: 1.7 }}>Use this result to size up obligations before filing returns or creating client estimates.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {calculatorTabs.filter((tab) => tab.id !== activeCalculator.id).slice(0, 3).map((tab) => (
              <Card key={tab.id} style={{ padding: 20 }} hover>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 800, color: C.navy }}>{tab.title}</div>
                  <div style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.7 }}>{tab.description}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ background: `${tab.accent}12`, color: tab.accent, borderRadius: 999, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700 }}>Tip</span>
                    <span style={{ color: C.muted, fontSize: "0.82rem" }}>{tab.helper}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
