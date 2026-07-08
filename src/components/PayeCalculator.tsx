"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calculator, 
  HelpCircle,
  Coins,
  ShieldAlert,
  ListFilter
} from "lucide-react";
import { C } from "../lib/constants";
import { calculatePaye } from "../lib/tax/paye";

const formatUGX = (n: number) => {
  return "UGX " + Math.round(n).toLocaleString("en-US");
};

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div 
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={14} style={{ color: C.muted, cursor: "help", marginLeft: 4 }} />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 8,
              background: C.navy,
              color: C.white,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: "11px",
              fontWeight: 500,
              width: 220,
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 99,
              pointerEvents: "none",
              lineHeight: 1.4,
            }}
          >
            {text}
            <div 
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                borderWidth: "6px",
                borderStyle: "solid",
                borderColor: `transparent transparent ${C.navy} transparent`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  tooltip?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, tooltip }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [tempValue, setTempValue] = useState<string>(
    value === 0 ? "0" : value.toLocaleString("en-US")
  );

  if (value !== prevValue) {
    setPrevValue(value);
    setTempValue(value === 0 ? "0" : value.toLocaleString("en-US"));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (rawValue === "") {
      setTempValue("");
      onChange(0);
      return;
    }
    const num = parseInt(rawValue, 10);
    if (!isNaN(num)) {
      setTempValue(num.toLocaleString("en-US"));
      onChange(num);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy, letterSpacing: "0.01em" }}>
          {label}
        </span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 16, fontSize: "13px", fontWeight: 800, color: C.muted }}>UGX</span>
        <input
          type="text"
          value={tempValue}
          onChange={handleChange}
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
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.teal)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
      </div>
    </div>
  );
};

export const PayeCalculator: React.FC = () => {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [isResident, setIsResident] = useState<boolean>(true);
  const [employmentType, setEmploymentType] = useState<"primary" | "secondary">("primary");

  // Simple mode state
  const [grossSalary, setGrossSalary] = useState<number>(2500000);
  const [nssfEnabled, setNssfEnabled] = useState<boolean>(true);

  // Advanced mode state
  const [basicSalary, setBasicSalary] = useState<number>(2000000);
  const [allowances, setAllowances] = useState<number>(500000);
  const [benefitsInKind, setBenefitsInKind] = useState<number>(20000);
  const [allowableDeductions, setAllowableDeductions] = useState<number>(0);

  const results = useMemo(() => {
    return calculatePaye({
      mode,
      isResident,
      employmentType,
      grossSalary,
      nssfEnabled,
      basicSalary,
      allowances,
      benefitsInKind,
      allowableDeductions,
    });
  }, [mode, isResident, employmentType, grossSalary, nssfEnabled, basicSalary, allowances, benefitsInKind, allowableDeductions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {/* Configuration Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {/* Toggle Mode */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy }}>Calculation complexity</span>
          <div style={{ display: "flex", background: C.offwhite, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setMode("simple")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: mode === "simple" ? C.white : "transparent",
                color: mode === "simple" ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: mode === "simple" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Simple mode
            </button>
            <button
              onClick={() => setMode("advanced")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: mode === "advanced" ? C.white : "transparent",
                color: mode === "advanced" ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: mode === "advanced" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Advanced mode
            </button>
          </div>
        </div>

        {/* Toggle Residency */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy }}>Residency status</span>
          <div style={{ display: "flex", background: C.offwhite, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setIsResident(true)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: isResident ? C.white : "transparent",
                color: isResident ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: isResident ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Resident
            </button>
            <button
              onClick={() => setIsResident(false)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: !isResident ? C.white : "transparent",
                color: !isResident ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: !isResident ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Non-resident
            </button>
          </div>
        </div>

        {/* Toggle Employment Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy }}>Employment type</span>
          <div style={{ display: "flex", background: C.offwhite, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setEmploymentType("primary")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: employmentType === "primary" ? C.white : "transparent",
                color: employmentType === "primary" ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: employmentType === "primary" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Primary
            </button>
            <button
              onClick={() => setEmploymentType("secondary")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: employmentType === "secondary" ? C.white : "transparent",
                color: employmentType === "secondary" ? C.teal : C.muted,
                cursor: "pointer",
                boxShadow: employmentType === "secondary" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              Secondary (Flat)
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left Side: Inputs and Pipeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Inputs Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Calculator size={18} style={{ color: C.teal }} />
              <span>Earnings and Deductions Inputs</span>
            </div>

            {mode === "simple" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InputField
                  label="Gross Monthly Pay"
                  value={grossSalary}
                  onChange={setGrossSalary}
                  tooltip="The total cash payment made to an employee per month, before any taxes or contributions."
                />
                
                {/* Gross Slider */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    type="range"
                    min="100000"
                    max="20000000"
                    step="100000"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: C.teal,
                      height: 6,
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: C.muted, fontWeight: 500 }}>
                    <span>UGX 100K</span>
                    <span>UGX 10M</span>
                    <span>UGX 20M</span>
                  </div>
                </div>

                {employmentType === "primary" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, background: C.offwhite, padding: 12, borderRadius: 12 }}>
                    <input
                      id="deduct-nssf"
                      type="checkbox"
                      checked={nssfEnabled}
                      onChange={(e) => setNssfEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: C.teal, cursor: "pointer" }}
                    />
                    <label htmlFor="deduct-nssf" style={{ fontSize: "13px", fontWeight: 700, color: C.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      Deduct Employee NSSF Contribution (5%)
                      <Tooltip text="Under Ugandan statutory law, 5% is deducted from gross pay as the employee's retirement contribution, which reduces the chargeable tax base." />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <InputField
                    label="Basic Monthly Salary"
                    value={basicSalary}
                    onChange={setBasicSalary}
                    tooltip="The fixed contractual rate of pay before allowances or benefits. NSSF (5%) is calculated strictly as a percentage of this amount."
                  />
                </div>
                <InputField
                  label="Cash Allowances"
                  value={allowances}
                  onChange={setAllowances}
                  tooltip="Sum of all monthly cash allowances (transport, medical, housing, food, etc.). Subject to PAYE, but not subject to NSSF."
                />
                <InputField
                  label="Benefits-in-Kind"
                  value={benefitsInKind}
                  onChange={setBenefitsInKind}
                  tooltip="The value of non-cash benefits (e.g. company vehicle, free house) computed according to the Income Tax Act rules."
                />
                <div style={{ gridColumn: "span 2" }}>
                  <InputField
                    label="Allowable Deductions"
                    value={allowableDeductions}
                    onChange={setAllowableDeductions}
                    tooltip="Any other tax-allowable deductions, such as registered pension contributions or approved scientific research allowances."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Legislative Warning Box */}
          <div style={{ display: "flex", gap: 12, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 16, padding: 16, alignItems: "flex-start" }}>
            <ShieldAlert size={20} style={{ color: C.gold, marginTop: 2, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>Income Tax (Amendment) Act 2026 Audit Note</span>
              <p style={{ fontSize: "12px", color: C.muted, margin: 0, lineHeight: 1.6 }}>
                <strong>Effective 1 July 2026:</strong> Ensure residency status is toggled correctly. Resident and non-resident schedules diverge significantly: non-residents suffer tax starting at <strong>10% on the very first Shilling</strong> (no tax-exempt nil band), with intermediate bands of <strong>20% and 30%</strong>, whereas residents enjoy a <strong>UGX 335K Nil band</strong> and have <strong>20% and 25%</strong> intermediate bands. Both transition to <strong>30% / 40%</strong> top rates, with an additional <strong>10% Surtax</strong> on income exceeding UGX 10M (effective 40% rate). Secondary employment remains a flat <strong>40%</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Calculation Breakdown & Outputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Net Pay Result Card */}
          <div style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}30`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: C.teal, letterSpacing: "0.06em", textTransform: "uppercase" }}>Estimated Net Monthly Pay</span>
              <Coins size={18} style={{ color: C.teal }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "2.15rem", fontWeight: 900, color: C.navy, letterSpacing: "-0.02em" }}>
                {formatUGX(results.netPay)}
              </span>
              <span style={{ fontSize: "12px", color: C.muted, marginTop: 4 }}>
                This is the cash take-home amount after deducting NSSF and PAYE tax.
              </span>
            </div>

            <div style={{ borderTop: `1px dashed ${C.teal}30`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Total Gross Earnings:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(results.grossTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>NSSF Contribution:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(results.nssfContribution)}</span>
              </div>
              {results.allowableDeductions > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: C.muted, fontWeight: 500 }}>Allowable Deductions:</span>
                  <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(results.allowableDeductions)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Chargeable Income:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(results.chargeableIncome)}</span>
              </div>
              {results.surtaxAmount > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: C.muted, fontWeight: 500 }}>Base PAYE Tax (up to 10M):</span>
                    <span style={{ color: C.navy, fontWeight: 700 }}>{formatUGX(results.taxAmount - results.surtaxAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: C.muted, fontWeight: 500 }}>Additional 10% Surtax (above 10M):</span>
                    <span style={{ color: C.red, fontWeight: 700 }}>{formatUGX(results.surtaxAmount)}</span>
                  </div>
                </>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: C.muted, fontWeight: 700 }}>Total PAYE Tax:</span>
                <span style={{ color: C.red, fontWeight: 800 }}>{formatUGX(results.taxAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: C.muted, fontWeight: 500 }}>Effective Tax Rate:</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{results.effectiveTaxRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tax Band Breakdown Details */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: C.navy, display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
              <ListFilter size={15} style={{ color: C.teal }} />
              <span>Tax Band Slicing Breakdown</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.bandsUsed.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 4, 
                    background: C.offwhite, 
                    padding: "10px 12px", 
                    borderRadius: 12,
                    fontSize: "12px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: C.navy }}>
                    <span>Band: {item.band}</span>
                    <span style={{ color: C.teal }}>{item.rate}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                    <span>Taxable slice: {formatUGX(item.taxableInBand)}</span>
                    <span style={{ fontWeight: 600, color: item.taxInBand > 0 ? C.red : C.muted }}>
                      +{formatUGX(item.taxInBand)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
