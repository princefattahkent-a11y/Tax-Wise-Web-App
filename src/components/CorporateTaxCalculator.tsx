"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calculator, 
  PlusCircle, 
  MinusCircle, 
  DollarSign, 
  TrendingUp, 
  Building, 
  Search, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Percent,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { C } from "../lib/constants";
import {
  computeCorporateTax,
  CompanyRateCategory,
  AddBackItems,
  DeductionItems,
  emptyAddBacks,
  emptyDeductions,
} from "../lib/tax/corporateTax";

const formatUGX = (n: number) => {
  return "UGX " + Math.round(n).toLocaleString("en-US");
};

// Static definitions moved outside component to prevent re-creation and fix react hooks warnings
const tooltipsAddBacks: Record<keyof AddBackItems, string> = {
  depreciation: "Accounting depreciation is disallowed; tax-approved capital allowance is deducted instead.",
  entertainmentDisallowed: "Only standard staff canteen is generally allowed. General client entertainment is disallowed.",
  expensesRelatedToExemptIncome: "Any business expenses incurred to produce tax-exempt income cannot be deducted.",
  lossOnDisposalOfAssets: "Accounting loss on sale of assets is disallowed; replacement is computed via Schedule 2.",
  balancingCharge: "A recapture of excess wear-and-tear allowance on asset disposal under Section 60.",
  donationsDisallowed: "Only donations to certified charitable entities under Section 34 are allowable.",
  provisionForBadDebts: "General bad debt provisions are disallowed; only specific written-off debts are allowed.",
  startupCosts: "Pre-operation startup costs must be capitalized and amortized over 4 years.",
  unrealizedForexLoss: "Unrealized foreign exchange translation losses are disallowed; only realized losses are allowable.",
  otherDisallowable: "Any other expense not incurred wholly and exclusively in the production of income.",
};

const tooltipsDeductions: Record<keyof DeductionItems, string> = {
  exemptIncome: "E.g., interest on specific treasury bonds or agricultural income explicitly exempt by law.",
  grossRentalIncome: "Rental income is assessed under separate rental tax rules, so it is deducted here.",
  profitOnDisposalOfAssets: "Accounting gain on asset sales is deducted; capital gain is computed separately.",
  capitalAllowance: "Tax depreciation/allowance (Wear and Tear, Initial, and Industrial Building allowances).",
  scientificResearchCapitalized: "Deduction for scientific research expenditures under Section 32.",
  unrealizedForexGain: "Unrealized paper gains from currency translation are excluded from chargeable income.",
  provisionForBadDebtsCredited: "General provisions reversed/credited to P&L that were previously disallowed.",
  finalWithholdingTaxIncome: "Income that suffered final withholding tax (e.g., dividends from listed companies).",
  otherAllowable: "Other tax deductions allowed under the Income Tax Act not captured above.",
};

const addBackFields = [
  { key: "depreciation" as keyof AddBackItems, label: "Accounting Depreciation" },
  { key: "entertainmentDisallowed" as keyof AddBackItems, label: "Disallowed Entertainment" },
  { key: "expensesRelatedToExemptIncome" as keyof AddBackItems, label: "Exempt Income Expenses" },
  { key: "lossOnDisposalOfAssets" as keyof AddBackItems, label: "Loss on Asset Disposal" },
  { key: "balancingCharge" as keyof AddBackItems, label: "Balancing Charge" },
  { key: "donationsDisallowed" as keyof AddBackItems, label: "Disallowed Donations" },
  { key: "provisionForBadDebts" as keyof AddBackItems, label: "General Bad Debt Provision" },
  { key: "startupCosts" as keyof AddBackItems, label: "Unamortized Start-up Costs" },
  { key: "unrealizedForexLoss" as keyof AddBackItems, label: "Unrealized Forex Loss" },
  { key: "otherDisallowable" as keyof AddBackItems, label: "Other Non-allowable Expenses" },
];

const deductionFields = [
  { key: "exemptIncome" as keyof DeductionItems, label: "Exempt Income (in P&L)" },
  { key: "grossRentalIncome" as keyof DeductionItems, label: "Gross Rental Income" },
  { key: "profitOnDisposalOfAssets" as keyof DeductionItems, label: "Profit on Asset Disposal" },
  { key: "capitalAllowance" as keyof DeductionItems, label: "Capital Allowance (Wear & Tear)" },
  { key: "scientificResearchCapitalized" as keyof DeductionItems, label: "Scientific Research" },
  { key: "unrealizedForexGain" as keyof DeductionItems, label: "Unrealized Forex Gain" },
  { key: "provisionForBadDebtsCredited" as keyof DeductionItems, label: "Bad Debt Provision Reversed" },
  { key: "finalWithholdingTaxIncome" as keyof DeductionItems, label: "Final WHT Income" },
  { key: "otherAllowable" as keyof DeductionItems, label: "Other Allowable Deductions" },
];

interface MoneyFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  tooltip?: string;
}

const MoneyField: React.FC<MoneyFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  tooltip,
}) => {
  const [prevValue, setPrevValue] = useState(value);
  const [tempValue, setTempValue] = useState<string>(
    value === 0 ? "0" : value.toLocaleString("en-US")
  );
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (value !== prevValue) {
    setPrevValue(value);
    setTempValue(value === 0 ? "0" : value.toLocaleString("en-US"));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.-]/g, "");
    if (rawValue === "" || rawValue === "-") {
      setTempValue(rawValue);
      onChange(0);
      return;
    }
    const num = parseFloat(rawValue);
    if (!isNaN(num)) {
      setTempValue(rawValue);
      onChange(num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTempValue(value === 0 ? "0" : value.toLocaleString("en-US"));
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", position: "relative" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
        <label 
          style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            color: disabled ? C.muted : C.navy, 
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1
          }}
          title={label}
        >
          {label}
        </label>
        
        {tooltip && (
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: showTooltip ? C.gold : C.muted,
                display: "flex",
                alignItems: "center"
              }}
            >
              <Info size={13} />
            </button>
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 4 }}
                  style={{
                    position: "absolute",
                    bottom: "22px",
                    right: 0,
                    width: "220px",
                    background: C.navy,
                    color: C.white,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 99,
                    pointerEvents: "none",
                    border: `1px solid ${C.border}22`
                  }}
                >
                  {tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "monospace",
            fontSize: "12px",
            color: isFocused ? C.gold : C.muted,
            fontWeight: 700,
            transition: "color 0.2s ease",
          }}
        >
          UGX
        </span>
        <input
          type="text"
          value={tempValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "10px 12px 10px 44px",
            fontFamily: "monospace",
            fontSize: "13.5px",
            fontWeight: 600,
            border: `1.5px solid ${isFocused ? C.gold : disabled ? C.border : "#D1D5DB"}`,
            borderRadius: "8px",
            background: disabled ? "#F3F4F6" : C.white,
            color: disabled ? C.muted : C.navy,
            outline: "none",
            boxSizing: "border-box",
            boxShadow: isFocused ? `0 0 0 3px ${C.gold}18` : "none",
            transition: "all 0.2s ease",
          }}
        />
      </div>
    </motion.div>
  );
};

export const CorporateTaxCalculator: React.FC = () => {
  const [mode, setMode] = useState<"simple" | "detailed">("simple");
  const [rateCat, setRateCat] = useState<CompanyRateCategory>("standard");
  const [netProfit, setNetProfit] = useState<number>(100000000);
  const [bfLoss, setBfLoss] = useState<number>(0);

  // Simple Mode lump sums
  const [lumpAdd, setLumpAdd] = useState<number>(0);
  const [lumpDed, setLumpDed] = useState<number>(0);

  // Detailed Mode fields
  const [addBacks, setAddBacks] = useState<AddBackItems>(emptyAddBacks());
  const [deductions, setDeductions] = useState<DeductionItems>(emptyDeductions());
  const [repatProfit, setRepatProfit] = useState<number>(0);

  // Collapsible detailed cards
  const [showAddBacks, setShowAddBacks] = useState(true);
  const [showDeductions, setShowDeductions] = useState(true);

  // Search filter for detailed fields to enhance usability
  const [filterTerm, setFilterTerm] = useState("");

  const result = useMemo(() => {
    if (mode === "simple") {
      return computeCorporateTax({
        netProfitBeforeTax: netProfit,
        addBacks: lumpAdd,
        deductions: lumpDed,
        netCapitalGains: 0,
        broughtForwardLoss: bfLoss,
        rateCategory: rateCat,
        repatriatedBranchProfit: 0,
      });
    } else {
      return computeCorporateTax({
        netProfitBeforeTax: netProfit,
        addBacks,
        deductions,
        netCapitalGains: 0,
        broughtForwardLoss: bfLoss,
        rateCategory: rateCat,
        repatriatedBranchProfit: repatProfit,
      });
    }
  }, [mode, rateCat, netProfit, bfLoss, lumpAdd, lumpDed, addBacks, deductions, repatProfit]);

  const updateAddBack = (key: keyof AddBackItems, val: number) => {
    setAddBacks((prev) => ({ ...prev, [key]: val }));
  };

  const updateDeduction = (key: keyof DeductionItems, val: number) => {
    setDeductions((prev) => ({ ...prev, [key]: val }));
  };

  // Filtering fields in Detailed mode
  const filteredAddBackFields = useMemo(() => {
    if (!filterTerm) return addBackFields;
    return addBackFields.filter(f => f.label.toLowerCase().includes(filterTerm.toLowerCase()));
  }, [filterTerm]);

  const filteredDeductionFields = useMemo(() => {
    if (!filterTerm) return deductionFields;
    return deductionFields.filter(f => f.label.toLowerCase().includes(filterTerm.toLowerCase()));
  }, [filterTerm]);

  const detailRows = useMemo(() => {
    const totalAdd = result.totalAddBacks;
    const totalDed = result.totalDeductions;

    const rows = [
      { label: "Total Add-backs (Schedule 1, Item 2)", value: formatUGX(totalAdd), highlight: false, danger: false },
      { label: "Total Allowable Deductions (Schedule 1, Item 3)", value: formatUGX(totalDed), highlight: false, danger: false },
      { label: "Adjusted Profit / (Loss) (Line 4)", value: formatUGX(result.adjustedProfit), highlight: true, danger: result.adjustedProfit < 0, bold: true },
      { label: "Income Chargeable Before Loss Relief (Line 7)", value: formatUGX(result.incomeChargeableBeforeLossRelief), highlight: false, danger: false },
      { label: "Brought-forward Loss Relieved (Line 8)", value: formatUGX(result.lossReliefUsed), highlight: false, danger: false },
      { label: "Loss Carried Forward to Next Year (Line 10)", value: formatUGX(result.lossCarriedForward), highlight: result.lossCarriedForward > 0, danger: false, bold: result.lossCarriedForward > 0 },
      { label: "Corporate Tax Rate", value: `${(result.taxRate * 100).toFixed(0)}%`, highlight: false, danger: false },
    ];

    if (result.branchRepatriationTax > 0) {
      rows.push({
        label: "Branch Repatriation Tax (15%)",
        value: formatUGX(result.branchRepatriationTax),
        highlight: false,
        danger: true,
        bold: true,
      });
    }

    return rows;
  }, [result]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", color: C.text }}>
      
      {/* HEADER CONTROLS CARD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          background: `linear-gradient(135deg, ${C.white} 0%, ${C.offwhite} 100%)`,
          padding: "20px 24px",
          borderRadius: 16,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Calculator View
          </span>
          <div style={{ display: "inline-flex", background: "#E5E7EB", borderRadius: 10, padding: 3, position: "relative" }}>
            <button
              onClick={() => setMode("simple")}
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                color: mode === "simple" ? C.navy : C.muted,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.25s ease",
                zIndex: 1,
              }}
            >
              {mode === "simple" && (
                <motion.div
                  layoutId="activeCalculatorMode"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: C.white,
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    zIndex: -1,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              Simple Mode
            </button>
            <button
              onClick={() => setMode("detailed")}
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: "13px",
                fontWeight: 700,
                color: mode === "detailed" ? C.navy : C.muted,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.25s ease",
                zIndex: 1,
              }}
            >
              {mode === "detailed" && (
                <motion.div
                  layoutId="activeCalculatorMode"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: C.white,
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    zIndex: -1,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              Detailed (Schedule 1)
            </button>
          </div>
        </div>

        <div style={{ minWidth: 260 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", fontWeight: 800, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <Percent size={12} /> Tax Rate Category
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={rateCat}
              onChange={(e) => setRateCat(e.target.value as CompanyRateCategory)}
              style={{
                width: "100%",
                padding: "11px 36px 11px 16px",
                fontFamily: "inherit",
                fontSize: "13.5px",
                fontWeight: 700,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                background: C.white,
                color: C.navy,
                outline: "none",
                cursor: "pointer",
                appearance: "none",
                boxShadow: "0 2px 5px rgba(0,0,0,0.01)",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            >
              <option value="standard">Standard Company (30%)</option>
              <option value="listed">Listed Corporation (25%)</option>
            </select>
            <ChevronDown 
              size={16} 
              style={{ 
                position: "absolute", 
                right: 12, 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: C.muted, 
                pointerEvents: "none" 
              }} 
            />
          </div>
        </div>
      </motion.div>

      {/* CORE FINANCIAL FIELDS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <MoneyField
          label="Profit / (Loss) before tax per accounts"
          value={netProfit}
          onChange={setNetProfit}
          tooltip="Net business income/loss derived from the audited profit and loss statement, before tax adjustments."
        />
        <MoneyField
          label="Assessed business loss brought forward"
          value={bfLoss}
          onChange={setBfLoss}
          tooltip="Tax losses sustained in previous years that were formally assessed by the URA and are eligible for carryover relief."
        />
      </div>

      {/* DYNAMIC FORM VIEWS WITH ANIMATION */}
      <AnimatePresence mode="wait">
        {mode === "simple" ? (
          <motion.div
            key="simple-inputs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <MoneyField
              label="Lump-sum disallowed add-backs"
              value={lumpAdd}
              onChange={setLumpAdd}
              tooltip="Aggregate of non-deductible expenditures (such as depreciation, donations, penalties)."
            />
            <MoneyField
              label="Lump-sum tax-allowable deductions"
              value={lumpDed}
              onChange={setLumpDed}
              tooltip="Aggregate of tax allowances and exempt income lines (such as wear-and-tear allowances)."
            />
          </motion.div>
        ) : (
          <motion.div
            key="detailed-inputs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {/* SEARCH & FILTERS FOR TAX ITEMS */}
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 10, 
                background: C.offwhite, 
                padding: "8px 16px", 
                borderRadius: "10px", 
                border: `1px solid ${C.border}` 
              }}
            >
              <Search size={16} style={{ color: C.muted }} />
              <input
                type="text"
                placeholder="Search Schedule 1 items (e.g., depreciation, bad debt, donations...)"
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  color: C.navy,
                  fontFamily: "inherit"
                }}
              />
              {filterTerm && (
                <button
                  onClick={() => setFilterTerm("")}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: C.gold,
                    cursor: "pointer"
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* ADD-BACKS ACCORDION GROUP */}
            <div 
              style={{ 
                border: `1.5px solid ${C.border}`, 
                borderRadius: 16, 
                overflow: "hidden",
                background: C.white,
                boxShadow: "0 2px 10px rgba(0,0,0,0.01)"
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddBacks(!showAddBacks)}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  background: `linear-gradient(to right, ${C.gold}08, transparent)`,
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <PlusCircle size={18} style={{ color: C.gold }} />
                  <div>
                    <span style={{ fontSize: "13.5px", fontWeight: 800, color: C.navy, letterSpacing: "0.01em" }}>
                      Add: Disallowed expenditures & taxable adjustments
                    </span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: C.muted }}>
                      Items charged to P&L but disallowed for tax (Form DT-2002, Schedule 1, Item 2)
                    </p>
                  </div>
                </div>
                {showAddBacks ? <ChevronUp size={18} style={{ color: C.navy }} /> : <ChevronDown size={18} style={{ color: C.navy }} />}
              </button>

              <AnimatePresence>
                {showAddBacks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: 20, borderTop: `1.5px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                      {filteredAddBackFields.length > 0 ? (
                        filteredAddBackFields.map((f) => (
                          <MoneyField
                            key={f.key}
                            label={f.label}
                            value={addBacks[f.key]}
                            onChange={(v) => updateAddBack(f.key, v)}
                            tooltip={tooltipsAddBacks[f.key]}
                          />
                        ))
                      ) : (
                        <div style={{ gridColumn: "1 / -1", padding: "16px 0", textAlign: "center", color: C.muted, fontSize: "12.5px" }}>
                          No matching disallowed items found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* DEDUCTIONS ACCORDION GROUP */}
            <div 
              style={{ 
                border: `1.5px solid ${C.border}`, 
                borderRadius: 16, 
                overflow: "hidden",
                background: C.white,
                boxShadow: "0 2px 10px rgba(0,0,0,0.01)"
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeductions(!showDeductions)}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  background: `linear-gradient(to right, ${C.teal}08, transparent)`,
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MinusCircle size={18} style={{ color: C.teal }} />
                  <div>
                    <span style={{ fontSize: "13.5px", fontWeight: 800, color: C.navy, letterSpacing: "0.01em" }}>
                      Less: Allowable deductions & exempt incomes
                    </span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: C.muted }}>
                      Incomes not taxable or expenses allowed under the Act (Form DT-2002, Schedule 1, Item 3)
                    </p>
                  </div>
                </div>
                {showDeductions ? <ChevronUp size={18} style={{ color: C.navy }} /> : <ChevronDown size={18} style={{ color: C.navy }} />}
              </button>

              <AnimatePresence>
                {showDeductions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: 20, borderTop: `1.5px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                      {filteredDeductionFields.length > 0 ? (
                        filteredDeductionFields.map((f) => (
                          <MoneyField
                            key={f.key}
                            label={f.label}
                            value={deductions[f.key]}
                            onChange={(v) => updateDeduction(f.key, v)}
                            tooltip={tooltipsDeductions[f.key]}
                          />
                        ))
                      ) : (
                        <div style={{ gridColumn: "1 / -1", padding: "16px 0", textAlign: "center", color: C.muted, fontSize: "12.5px" }}>
                          No matching allowable items found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BRANCH REPATRIATION */}
            <motion.div 
              layout
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: 14, 
                borderTop: `1.5px dashed ${C.border}`, 
                paddingTop: 20 
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Building size={16} style={{ color: C.navy }} />
                <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>
                  Branch Profit Repatriation (For Non-Resident Entities)
                </span>
              </div>
              <div style={{ maxWidth: 360 }}>
                <MoneyField
                  label="Repatriated profits during the year"
                  value={repatProfit}
                  onChange={setRepatProfit}
                  tooltip="Foreign branches operating in Uganda are assessed branch repatriation tax at 15% on profits transferred out of Uganda under Section 80."
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPUTATION PIPELINE MAP (MODERN VISUAL FLOW CHART) */}
      <motion.div
        layout
        style={{
          background: C.offwhite,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
          marginTop: 8,
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.01)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Sparkles size={15} style={{ color: C.gold }} />
          <span style={{ fontSize: "11.5px", fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tax Computation Pipeline Map
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", textAlign: "center", padding: "10px", background: C.white, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Book Profit</span>
            <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy, marginTop: 4, fontFamily: "monospace" }}>{formatUGX(netProfit)}</div>
          </div>

          <ArrowRight size={14} style={{ color: C.muted, opacity: 0.5 }} />

          <div style={{ flex: "1 1 180px", textAlign: "center", padding: "10px", background: `${C.gold}08`, borderRadius: 10, border: `1px solid ${C.gold}20` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: C.gold, textTransform: "uppercase" }}>Adjustments (Net)</span>
            <div style={{ fontSize: "13px", fontWeight: 800, color: C.gold, marginTop: 4, fontFamily: "monospace" }}>
              {result.totalAddBacks - result.totalDeductions >= 0 ? "+" : ""}{formatUGX(result.totalAddBacks - result.totalDeductions)}
            </div>
          </div>

          <ArrowRight size={14} style={{ color: C.muted, opacity: 0.5 }} />

          <div style={{ flex: "1 1 180px", textAlign: "center", padding: "10px", background: C.white, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Adjusted Income</span>
            <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy, marginTop: 4, fontFamily: "monospace" }}>{formatUGX(result.adjustedProfit)}</div>
          </div>

          {bfLoss > 0 && (
            <>
              <ArrowRight size={14} style={{ color: C.muted, opacity: 0.5 }} />
              <div style={{ flex: "1 1 180px", textAlign: "center", padding: "10px", background: `${C.teal}08`, borderRadius: 10, border: `1px solid ${C.teal}20` }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: C.teal, textTransform: "uppercase" }}>Loss Relief Used</span>
                <div style={{ fontSize: "13px", fontWeight: 800, color: C.teal, marginTop: 4, fontFamily: "monospace" }}>-{formatUGX(result.lossReliefUsed)}</div>
              </div>
            </>
          )}

          <ArrowRight size={14} style={{ color: C.muted, opacity: 0.5 }} />

          <div style={{ flex: "1 1 180px", textAlign: "center", padding: "10px", background: `${C.navy}08`, borderRadius: 10, border: `1px solid ${C.navy}20` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: C.navy, textTransform: "uppercase" }}>Chargeable</span>
            <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy, marginTop: 4, fontFamily: "monospace" }}>{formatUGX(result.chargeableBusinessIncome)}</div>
          </div>
        </div>
      </motion.div>

      {/* RESULTS SECTIONS */}
      <motion.div 
        layout
        style={{ marginTop: 8, borderTop: `1.5px dashed ${C.border}`, paddingTop: 28 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 28 }}>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            style={{ 
              background: C.white, 
              border: `1.5px solid ${C.border}`, 
              borderRadius: 16, 
              padding: "20px 22px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.01)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: C.muted }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: C.muted, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Chargeable Business Income
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "19px", fontWeight: 900, color: C.navy }}>
                  {formatUGX(result.chargeableBusinessIncome)}
                </div>
              </div>
              <div style={{ background: `${C.muted}10`, padding: 8, borderRadius: 10, color: C.muted }}>
                <DollarSign size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            style={{ 
              background: C.white, 
              border: `1.5px solid ${C.gold}30`, 
              borderRadius: 16, 
              padding: "20px 22px",
              boxShadow: "0 4px 15px rgba(12,12,12,0.01)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: C.gold }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: C.gold, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Income Tax Liability
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "19px", fontWeight: 900, color: C.gold }}>
                  {formatUGX(result.incomeTax)}
                </div>
              </div>
              <div style={{ background: `${C.gold}10`, padding: 8, borderRadius: 10, color: C.gold }}>
                <TrendingUp size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            style={{ 
              background: C.white, 
              border: `1.5px solid ${C.teal}30`, 
              borderRadius: 16, 
              padding: "20px 22px",
              boxShadow: "0 4px 15px rgba(12,12,12,0.01)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: C.teal }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: C.teal, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Total Obligations Due
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "19px", fontWeight: 900, color: C.teal }}>
                  {formatUGX(result.totalTaxPayable)}
                </div>
              </div>
              <div style={{ background: `${C.teal}10`, padding: 8, borderRadius: 10, color: C.teal }}>
                <Calculator size={16} />
              </div>
            </div>
          </motion.div>

        </div>

        {/* DETAILED LEDGER TABLE */}
        <div style={{ overflowX: "auto", border: `1.5px solid ${C.border}`, borderRadius: 14, background: C.white, marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: 500 }}>
            <thead>
              <tr style={{ background: C.offwhite, borderBottom: `1.5px solid ${C.border}`, textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 800, color: C.navy, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>URA Form Line & Schedule Detail</th>
                <th style={{ padding: "12px 16px", fontWeight: 800, color: C.navy, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Amount (UGX) / Values</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, idx) => (
                <motion.tr
                  key={idx}
                  whileHover={{ background: `${C.offwhite}aa` }}
                  style={{
                    borderBottom: idx === detailRows.length - 1 ? "none" : `1px solid ${C.border}`,
                    background: row.highlight ? `${C.gold}06` : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: row.bold ? C.navy : C.muted, fontWeight: row.bold ? 700 : 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {row.highlight && <Sparkles size={12} style={{ color: C.gold }} />}
                      {row.label}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: row.danger ? C.red : row.highlight ? C.gold : C.navy,
                    }}
                  >
                    {row.value}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* COMPLIANCE GUIDANCE CARD */}
        <motion.div
          layout
          style={{
            fontSize: "12.5px",
            color: C.muted,
            lineHeight: "1.65",
            padding: "20px",
            background: `linear-gradient(135deg, ${C.offwhite} 0%, ${C.white} 100%)`,
            borderLeft: `4px solid ${C.gold}`,
            borderRadius: "8px",
            border: `1px solid ${C.border}`,
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <Info size={18} style={{ color: C.gold, flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 800, color: C.navy, fontSize: "13px" }}>Corporate Tax Compliance Note</span>
            <span style={{ fontSize: "12px" }}>
              Modeled on URA Form DT-2002, Schedule 1 (Computation of income from business and profession) and Section C. Standard rate is 30%; a reduced 25% applies to companies listed on the Uganda Securities Exchange with at least 30% of shares floated. Repatriated branch profit is taxed separately at 15%, in addition to the tax on the branch&apos;s own chargeable income. Capital allowances (initial allowance, wear-and-tear, industrial building allowance) should be computed on Schedule 2 and entered here as a single total — this calculator does not itself maintain a fixed-asset register.
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
