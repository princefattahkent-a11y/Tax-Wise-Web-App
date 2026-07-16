/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Upload,
  Download,
  Clock,
  ShieldAlert,
  TriangleAlert,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Table2,
  FileType,
  FileBarChart,
  X,
  ScanSearch,
  History,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  ExternalLink,
  Info,
  Check,
  FileSpreadsheet,
  FileArchive,
  LayoutDashboard,
} from "lucide-react";
import { Chart as ChartJS, registerables } from "chart.js";
import { Modal } from "./UI";
import { AiComplianceReview } from "./AiComplianceReview";
import { Finding } from "../lib/validation/helpers";
import {
  getComplianceHistoryAction,
  ComplianceHistoryRecord,
} from "../app/actions/complianceActions";

ChartJS.register(...registerables);

// ─── Types ──────────────────────────────────────────────────────────────────

interface DisplayFinding extends Finding {
  id: string;
  legislation?: string;
}

interface ChecklistItem {
  area: string;
  status: "pass" | "review" | "missing";
}

interface RevenuePeriod {
  period: string;
  revenue: number;
  vat: number;
}

interface ComplianceCheckerProps {
  user: {
    id: string;
    full_name?: string;
  };
}

// ─── Checklist guidance data ─────────────────────────────────────────────────

const CHECKLIST_GUIDANCE: Record<string, {
  description: string;
  actions: string[];
  legislation: string;
}> = {
  VAT: {
    description: "Monthly VAT return filed under the VAT Act Cap 349. Output VAT must reconcile with EFRIS-recorded sales. Input VAT claims require valid tax invoices with supplier TINs.",
    actions: [
      "Reconcile EFRIS receipts against your VAT working schedule line by line.",
      "Ensure all input VAT claims are supported by valid tax invoices.",
      "Verify supplier TINs are recorded for all input VAT claimants.",
      "File VAT return by the 15th of the following month.",
    ],
    legislation: "VAT Act Cap 349, ss. 16, 28, 30",
  },
  PAYE: {
    description: "Monthly Pay As You Earn deductions and remittance. All employees above the tax threshold must appear in the PAYE computation schedule. PAYE must be remitted to URA by the 15th of the following month.",
    actions: [
      "Verify all employees in the payroll register appear in the PAYE schedule.",
      "Confirm tax computed uses the current URA tax band thresholds.",
      "File monthly PAYE return (Form 5) with URA.",
      "Remit PAYE by the 15th of the following month to avoid 2% monthly interest.",
    ],
    legislation: "Income Tax Act Cap 340, ss. 114–120",
  },
  "Income Tax": {
    description: "Annual income tax return and quarterly instalment payments. Gross profit margins and cost movements should be consistent with prior periods or adequately explained in financial statements.",
    actions: [
      "Prepare a note to financial statements explaining any material cost movements.",
      "Reconcile gross margin to prior periods and document variances.",
      "Ensure provisional tax instalments have been paid (1st Mar, 1st Jun, 1st Sep, 1st Dec).",
      "File annual income tax return within 6 months of year-end.",
    ],
    legislation: "Income Tax Act Cap 340, ss. 15, 89–104",
  },
  EFRIS: {
    description: "Electronic Fiscal Receipting and Invoicing System compliance. All sales to registered and unregistered customers must be recorded via an approved EFRIS device. Failure to issue fiscal receipts attracts penalties of up to UGX 2,000,000 per day.",
    actions: [
      "Ensure your fiscal device (ERD/VSDC) is active and transmitting to URA servers.",
      "Issue QR-coded fiscal receipts for every sale.",
      "Perform monthly reconciliation of EFRIS receipts vs. your own sales records.",
      "Train staff on the correct procedure for issuing EFRIS receipts.",
    ],
    legislation: "VAT Act Cap 349, s. 73A; EFRIS Regulations 2020",
  },
  "Financial Statements": {
    description: "Annual financial statements must be prepared in accordance with IFRS or IFRS for SMEs. Gross profit margins, asset values, and liability balances are cross-checked against declared tax figures.",
    actions: [
      "Prepare financial statements within 6 months of the accounting year-end.",
      "Include notes explaining any material variances from prior periods.",
      "Ensure balance sheet figures are reconciled to trial balances.",
      "Obtain an auditor's report if required under the Companies Act 2012.",
    ],
    legislation: "Income Tax Act Cap 340, s. 27; Companies Act 2012, s. 168",
  },
  "Supporting Documents": {
    description: "URA requires all tax returns to be supported by source documents for a minimum of 5 years. Missing documents can invalidate deductions and input VAT claims.",
    actions: [
      "Assemble all sales invoices, purchase invoices, and receipts for the period.",
      "Organise EFRIS fiscal receipt records and match them to your sales ledger.",
      "Retain bank statements, payroll schedules, and NSSF contribution schedules.",
      "Store records securely for a minimum of 5 years as required by law.",
    ],
    legislation: "Tax Procedures Code Act 2014, s. 30",
  },
  "NSSF Cross-Check": {
    description: "National Social Security Fund contributions must match payroll figures. 10% employee and 10% employer contributions must be remitted monthly and reconciled against the PAYE schedule.",
    actions: [
      "Confirm NSSF contribution amount matches 20% of gross pay for all qualifying employees.",
      "Verify remittance receipts from NSSF for the period.",
      "Cross-reference NSSF member list against PAYE employee list — discrepancies flag compliance risk.",
      "File NSSF monthly return by the 15th of the following month.",
    ],
    legislation: "NSSF Act Cap 222, ss. 9–13",
  },
};

// ─── Demo / Seed Data ────────────────────────────────────────────────────────

const DEMO_FINDINGS: DisplayFinding[] = [
  {
    id: "XVAL-003",
    code: "XVAL-003",
    severity: "critical",
    area: "VAT",
    title: "Output VAT does not reconcile with EFRIS sales",
    description:
      "Declared output VAT of UGX 18,240,000 is 11.4% lower than the output VAT implied by EFRIS-recorded sales for the same period.",
    reason:
      "EFRIS receipts for June total UGX 214,600,000 in taxable supplies, implying output VAT of UGX 38,628,000 at 18%. The VAT return declares a taxable supply base of UGX 101,333,000.",
    impact: "possible inconsistency detected: this may require further review",
    exposure: 2450000,
    confidence: 96,
    recommendation: "Reconcile the EFRIS sales export against the VAT working schedule line by line.",
    legislation_ref: "VAT Act Cap 349, s.16 & s.30",
    status: "open",
  },
  {
    id: "PAYE-002",
    code: "PAYE-002",
    severity: "critical",
    area: "PAYE",
    title: "Two employees missing from PAYE schedule",
    description:
      "Payroll register lists 47 active employees; PAYE schedule submitted for the period reflects 45.",
    reason:
      "Employee IDs 0038 and 0041 appear in the payroll register with gross pay above the PAYE threshold but are absent from the PAYE computation schedule.",
    impact: "this appears unusual and should be verified before filing",
    exposure: 640000,
    confidence: 91,
    recommendation:
      "Confirm whether employees 0038 and 0041 were engaged mid-period or excluded in error.",
    legislation_ref: "Income Tax Act Cap 340, s.116",
    status: "open",
  },
  {
    id: "ITX-001",
    code: "ITX-001",
    severity: "warning",
    area: "Income Tax",
    title: "Gross profit margin diverges from prior periods",
    description:
      "Gross margin for the period is 18.2%, against a trailing three-period average of 27.6%.",
    reason:
      "Cost of sales grew 34% period-on-period while revenue grew 4%, without a corresponding note in the financial statements.",
    impact: "this may require further review",
    exposure: 0,
    confidence: 78,
    recommendation: "Add a note to the financial statements explaining the cost movement.",
    legislation_ref: "Income Tax Act Cap 340, s.15",
    status: "open",
  },
  {
    id: "VAT-001",
    code: "VAT-001",
    severity: "warning",
    area: "VAT",
    title: "Input VAT claim on a supplier with no TIN on file",
    description:
      "An input VAT claim of UGX 1,120,000 references supplier invoice INV-2291 with no TIN recorded in the supplier register.",
    reason: "Supplier record 'Kase Hardware Ltd' has a blank TIN field.",
    impact: "possible inconsistency detected",
    exposure: 1120000,
    confidence: 84,
    recommendation: "Obtain and record the supplier's TIN, or exclude the claim.",
    legislation_ref: "VAT Act Cap 349, s.28",
    status: "open",
  },
  {
    id: "HIST-002",
    code: "HIST-002",
    severity: "info",
    area: "Historical",
    title: "Third consecutive nil PAYE return",
    description:
      "PAYE remittance has been nil for three consecutive months despite an active payroll register.",
    reason: "Repeated nil returns alongside active payroll are flagged for pattern review.",
    impact: "this appears unusual and should be verified before filing",
    exposure: 0,
    confidence: 72,
    recommendation: "Confirm whether payroll is genuinely below threshold.",
    legislation_ref: "Income Tax Act Cap 340, s.116",
    status: "resolved",
  },
];

const DEMO_CHECKLIST: ChecklistItem[] = [
  { area: "VAT", status: "review" },
  { area: "PAYE", status: "review" },
  { area: "Income Tax", status: "review" },
  { area: "EFRIS", status: "review" },
  { area: "Financial Statements", status: "pass" },
  { area: "Supporting Documents", status: "missing" },
  { area: "NSSF Cross-Check", status: "pass" },
];

const REVENUE_TREND: RevenuePeriod[] = [
  { period: "Feb", revenue: 182, vat: 33 },
  { period: "Mar", revenue: 196, vat: 35 },
  { period: "Apr", revenue: 174, vat: 31 },
  { period: "May", revenue: 205, vat: 37 },
  { period: "Jun", revenue: 214, vat: 39 },
  { period: "Jul", revenue: 189, vat: 34 },
];

// Accepted CSV column name aliases → internal field keys
const CSV_FIELD_MAP: Record<string, string> = {
  vat_declared_output: "vat_declared_output",
  "output vat": "vat_declared_output",
  vatoutput: "vat_declared_output",
  vat_declared_input: "vat_declared_input",
  "input vat": "vat_declared_input",
  vatinput: "vat_declared_input",
  efris_sales_total: "efris_sales_total",
  "efris sales": "efris_sales_total",
  efrissales: "efris_sales_total",
  vat_input_invalid_tin: "vat_input_invalid_tin",
  "invalid tin vat": "vat_input_invalid_tin",
  payroll_register_count: "payroll_register_count",
  "payroll count": "payroll_register_count",
  payroll_register_gross: "payroll_register_gross",
  "payroll gross": "payroll_register_gross",
  paye_schedule_count: "paye_schedule_count",
  "paye count": "paye_schedule_count",
  paye_schedule_tax: "paye_schedule_tax",
  "paye tax": "paye_schedule_tax",
  financial_gross_margin: "financial_gross_margin",
  "gross margin": "financial_gross_margin",
  financial_sales: "financial_sales",
  "financial sales": "financial_sales",
  supplier_tins_total_count: "supplier_tins_total_count",
  supplier_tins_invalid_count: "supplier_tins_invalid_count",
  nssf_contribution_total: "nssf_contribution_total",
  "nssf contribution": "nssf_contribution_total",
  is_nil_return: "is_nil_return",
  supporting_documents_present: "supporting_documents_present",
  duplicate_invoices_count: "duplicate_invoices_count",
  negative_balances_present: "negative_balances_present",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtUGX = (n: number) => "UGX " + Math.round(n).toLocaleString("en-UG");

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return s; }
};

function statusTone(findings: DisplayFinding[]) {
  const open = findings.filter((f) => f.status === "open");
  const critical = open.filter((f) => f.severity === "critical").length;
  const warning = open.filter((f) => f.severity === "warning").length;
  const passed = 154;
  const exposure = open.reduce((s, f) => s + f.exposure, 0);
  const confidence = open.length
    ? Math.round(open.reduce((s, f) => s + f.confidence, 0) / open.length)
    : 100;
  if (critical > 0)
    return { label: "High Risk", tone: "critical" as const, critical, warning, passed, exposure, confidence };
  if (warning > 0)
    return { label: "Review Required", tone: "warning" as const, critical, warning, passed, exposure, confidence };
  return { label: "Ready to File", tone: "emerald" as const, critical, warning, passed, exposure, confidence };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Stamp = ({ label, tone }: { label: string; tone: "critical" | "warning" | "emerald" | "navy" | "neutral" }) => {
  const styles: Record<string, React.CSSProperties> = {
    critical: { color: "var(--cx-brick)", background: "var(--cx-brick-soft)", border: "1px solid color-mix(in srgb, var(--cx-brick) 20%, transparent)" },
    warning: { color: "var(--cx-amber)", background: "var(--cx-amber-soft)", border: "1px solid color-mix(in srgb, var(--cx-amber) 20%, transparent)" },
    emerald: { color: "var(--cx-emerald)", background: "var(--cx-emerald-soft)", border: "1px solid color-mix(in srgb, var(--cx-emerald) 20%, transparent)" },
    navy: { color: "var(--cx-navy)", background: "var(--cx-navy-soft)", border: "1px solid color-mix(in srgb, var(--cx-navy) 20%, transparent)" },
    neutral: { color: "var(--cx-ink-soft)", background: "var(--cx-surface-sunken)", border: "1px solid var(--cx-line)" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
      fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
      transform: "rotate(-0.4deg)", whiteSpace: "nowrap",
      ...styles[tone],
    }}>
      {label}
    </span>
  );
};

const SeverityIcon = ({ severity, size = 15 }: { severity: string; size?: number }) => {
  if (severity === "critical") return <ShieldAlert size={size} style={{ color: "var(--cx-brick)", flexShrink: 0 }} />;
  if (severity === "warning") return <TriangleAlert size={size} style={{ color: "var(--cx-amber)", flexShrink: 0 }} />;
  return <CircleCheck size={size} style={{ color: "var(--cx-emerald)", flexShrink: 0 }} />;
};

// ─── Toast notification ───────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: "var(--cx-emerald-soft)", border: "var(--cx-emerald)", color: "var(--cx-emerald)" },
    error: { bg: "var(--cx-brick-soft)", border: "var(--cx-brick)", color: "var(--cx-brick)" },
    info: { bg: "var(--cx-navy-soft)", border: "var(--cx-navy)", color: "var(--cx-navy)" },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        background: colors.bg, border: `1px solid ${colors.border}`,
        color: colors.color, borderRadius: 10, padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit",
        fontSize: 13.5, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        maxWidth: 360,
      }}
    >
      {type === "success" && <CheckCircle2 size={16} />}
      {type === "error" && <AlertCircle size={16} />}
      {type === "info" && <Info size={16} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}>
        <X size={14} />
      </button>
    </motion.div>
  );
};

// ─── Checklist Detail Modal ───────────────────────────────────────────────────
const ChecklistDetailModal = ({
  item,
  onClose,
  onStatusChange,
}: {
  item: ChecklistItem;
  onClose: () => void;
  onStatusChange: (area: string, status: "pass" | "review" | "missing") => void;
}) => {
  const guidance = CHECKLIST_GUIDANCE[item.area];
  const statusMeta = {
    pass: { icon: <CircleCheck size={15} />, label: "Passed", color: "var(--cx-emerald)" },
    review: { icon: <TriangleAlert size={15} />, label: "Needs Review", color: "var(--cx-amber)" },
    missing: { icon: <X size={15} />, label: "Missing", color: "var(--cx-brick)" },
  };
  const current = statusMeta[item.status];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--cx-navy-soft)", color: "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileBarChart size={18} />
        </div>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: "var(--cx-ink)" }}>{item.area}</div>
          <div style={{ fontSize: 12, color: "var(--cx-ink-faint)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
            {guidance?.legislation}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: current.color }}>
          {current.icon} {current.label}
        </div>
      </div>

      {/* Description */}
      {guidance && (
        <>
          <div style={{ ...card, marginBottom: 16, padding: "14px 16px" }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>Overview</div>
            <p style={{ fontSize: 13, color: "var(--cx-ink-soft)", lineHeight: 1.65 }}>{guidance.description}</p>
          </div>

          {/* Actions */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>Required Actions to Resolve</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {guidance.actions.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "var(--cx-navy-soft)",
                    color: "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--cx-ink)", lineHeight: 1.55 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px dashed var(--cx-line)", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--cx-ink-soft)" }}>Update status:</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["pass", "review", "missing"] as const).map((s) => {
            const meta = statusMeta[s];
            const isActive = item.status === s;
            return (
              <button
                key={s}
                onClick={() => { onStatusChange(item.area, s); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                  borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  background: isActive ? meta.color : "var(--cx-surface)",
                  color: isActive ? "#fff" : meta.color,
                  border: `1px solid ${meta.color}`,
                }}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── History Modal ────────────────────────────────────────────────────────────
const HistoryModal = ({
  onClose,
  onLoadReview,
}: {
  onClose: () => void;
  onLoadReview: (findings: DisplayFinding[]) => void;
}) => {
  const [history, setHistory] = useState<ComplianceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComplianceHistoryRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getComplianceHistoryAction()
      .then(setHistory)
      .catch((e) => setError(e.message || "Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const historyStatusTone = (s: string): "critical" | "warning" | "emerald" | "neutral" => {
    if (s === "high_risk") return "critical";
    if (s === "review_required") return "warning";
    if (s === "ready") return "emerald";
    return "neutral";
  };

  const historyStatusLabel = (s: string) => {
    if (s === "high_risk") return "High Risk";
    if (s === "review_required") return "Review Required";
    if (s === "ready") return "Ready to File";
    return s;
  };

  if (selected) {
    const findings: DisplayFinding[] = (selected.findings || []).map((f) => ({
      ...f,
      id: f.id,
      legislation: f.legislation_ref,
      area: f.area as any,
      severity: f.severity as any,
      status: f.status as any,
    }));

    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ ...actionBtn, background: "var(--cx-surface-sunken)", color: "var(--cx-ink-soft)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
        >
          <ChevronLeft size={14} /> Back to History
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...eyebrow, marginBottom: 4 }}>Review Detail — {selected.period}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--cx-ink)" }}>
              {selected.company_name || "Company"}
            </div>
            <div style={{ fontSize: 12, color: "var(--cx-ink-faint)", marginTop: 3 }}>
              Reviewed {fmtDate(selected.reviewed_at)} · Confidence {selected.confidence}%
            </div>
          </div>
          <Stamp label={historyStatusLabel(selected.status)} tone={historyStatusTone(selected.status)} />
        </div>

        {selected.ai_summary && (
          <div style={{ ...card, padding: "14px 16px", marginBottom: 16, background: "var(--cx-navy-soft)", border: "1px solid color-mix(in srgb, var(--cx-navy) 20%, transparent)" }}>
            <div style={{ ...eyebrow, color: "var(--cx-navy)", marginBottom: 6 }}>AI Summary</div>
            <p style={{ fontSize: 13, color: "var(--cx-ink)", lineHeight: 1.65 }}>{selected.ai_summary}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { label: "Est. Exposure", value: fmtUGX(selected.estimated_exposure), color: "var(--cx-brick)" },
            { label: "Findings", value: String(findings.length), color: "var(--cx-ink)" },
            { label: "Confidence", value: `${selected.confidence}%`, color: "var(--cx-ink)" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ flex: "1 1 100px", ...card, padding: "10px 14px" }}>
              <div style={{ ...eyebrow, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 16, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {findings.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--cx-ink-faint)", textAlign: "center", padding: "24px 0" }}>No findings recorded for this review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {findings.map((f) => (
              <div key={f.id} style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <SeverityIcon severity={f.severity} size={14} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--cx-ink-faint)" }}>{f.code}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cx-ink)" }}>{f.title}</span>
                    <Stamp label={f.area} tone="navy" />
                    {f.status !== "open" && <Stamp label={f.status} tone="neutral" />}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--cx-ink-soft)", marginTop: 4, lineHeight: 1.5 }}>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {findings.length > 0 && (
          <button
            onClick={() => { onLoadReview(findings); onClose(); }}
            style={{ width: "100%", padding: "11px", borderRadius: 7, background: "var(--cx-navy)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <ExternalLink size={15} /> Load This Review into Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cx-navy-soft)", color: "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <History size={18} />
        </div>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: "var(--cx-ink)" }}>Compliance History</div>
          <div style={{ fontSize: 12, color: "var(--cx-ink-faint)" }}>Past compliance reviews for your companies</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cx-ink-faint)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
          <div style={{ fontSize: 13 }}>Loading history…</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--cx-brick)", fontSize: 13 }}>{error}</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--cx-ink-faint)" }}>
          No compliance reviews found. Run your first review to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((h) => (
            <motion.button
              key={h.id}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.998 }}
              onClick={() => setSelected(h)}
              style={{
                width: "100%", textAlign: "left", background: "var(--cx-surface)",
                border: "1px solid var(--cx-line)", borderRadius: 10, padding: "14px 18px",
                cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cx-navy)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cx-line)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 7, background: "var(--cx-navy-soft)", color: "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Calendar size={15} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 13, color: "var(--cx-ink)" }}>{h.period}</div>
                    <div style={{ fontSize: 11.5, color: "var(--cx-ink-faint)", marginTop: 2 }}>
                      {h.company_name} · {fmtDate(h.reviewed_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {h.estimated_exposure > 0 && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--cx-brick)", fontWeight: 600 }}>
                      {fmtUGX(h.estimated_exposure)}
                    </span>
                  )}
                  <Stamp label={historyStatusLabel(h.status)} tone={historyStatusTone(h.status)} />
                  <ChevronRight size={14} style={{ color: "var(--cx-ink-faint)" }} />
                </div>
              </div>
              {h.ai_summary && (
                <p style={{ fontSize: 12, color: "var(--cx-ink-soft)", marginTop: 8, lineHeight: 1.5, textAlign: "left" }}>
                  {h.ai_summary.slice(0, 120)}{h.ai_summary.length > 120 ? "…" : ""}
                </p>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Upload types ─────────────────────────────────────────────────────────────

type UploadFileStatus = "queued" | "processing" | "done" | "error";

interface UploadedFile {
  id: string;
  file: File;
  status: UploadFileStatus;
  error?: string;
  data?: Record<string, any>;
}

const ACCEPTED_UPLOAD_EXTENSIONS = ["json", "csv", "pdf", "xlsx", "xls", "docx", "doc"];

function getFileIcon(name: string): React.ReactNode {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls"].includes(ext)) return <FileSpreadsheet size={15} style={{ color: "#22a06b" }} />;
  if (["docx", "doc"].includes(ext)) return <FileText size={15} style={{ color: "#0052cc" }} />;
  if (ext === "pdf") return <FileType size={15} style={{ color: "#de350b" }} />;
  if (ext === "csv") return <Table2 size={15} style={{ color: "#6554c0" }} />;
  if (ext === "json") return <FileArchive size={15} style={{ color: "#ff991f" }} />;
  return <FileText size={15} />;
}

// ─── Upload parser ────────────────────────────────────────────────────────────

function parseTaxReturnFile(
  file: File
): Promise<{ ok: true; data: Record<string, any> } | { ok: false; error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // For binary formats (PDF, DOCX, XLSX) — acknowledge receipt and pass metadata
  if (["pdf", "docx", "doc", "xlsx", "xls"].includes(ext)) {
    return Promise.resolve({
      ok: true,
      data: {
        _sourceFile: file.name,
        _sourceType: ext,
        _note: `File "${file.name}" uploaded. Structured data extraction from ${ext.toUpperCase()} is processed server-side. Using file metadata for this review session.`,
      },
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (ext === "json") {
          const json = JSON.parse(text);
          resolve({ ok: true, data: json });
          return;
        }
        // CSV: take the first data row
        const rows = parseCSV(text);
        if (rows.length === 0) {
          resolve({ ok: false, error: "CSV file is empty or has no data rows." });
          return;
        }
        const row = rows[0];
        const mapped: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          const normalised = key.toLowerCase().replace(/[\s_-]+/g, "_");
          const alias = key.toLowerCase().replace(/_/g, " ");
          const fieldKey =
            CSV_FIELD_MAP[normalised] ||
            CSV_FIELD_MAP[alias] ||
            CSV_FIELD_MAP[key.toLowerCase()];
          if (fieldKey) {
            // Booleans
            if (["is_nil_return", "supporting_documents_present", "negative_balances_present"].includes(fieldKey)) {
              mapped[fieldKey] = val.toLowerCase() === "true" || val === "1";
            } else {
              const num = parseFloat(val.replace(/,/g, ""));
              mapped[fieldKey] = isNaN(num) ? val : num;
            }
          }
        }
        if (Object.keys(mapped).length === 0) {
          resolve({ ok: false, error: "No recognisable field names found in the CSV. Please check the template." });
          return;
        }
        resolve({ ok: true, data: mapped });
      } catch {
        resolve({ ok: false, error: "Failed to parse the file. Ensure it is valid JSON or CSV." });
      }
    };
    reader.readAsText(file);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<"dashboard" | "reports">("dashboard");
  const [findings, setFindings] = useState<DisplayFinding[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>("XVAL-003");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [query, setQuery] = useState("");
  // Tick-flash feedback: set of IDs currently showing a tick animation
  const [tickIds, setTickIds] = useState<Set<string>>(new Set());

  // Sync findings, checklist, and UI prefs with localStorage (scoped by user.id)
  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      const cacheFindings = localStorage.getItem(`taxwise:compliance:findings:${user.id}`);
      const cacheChecklist = localStorage.getItem(`taxwise:compliance:checklist:${user.id}`);
      const cacheView = localStorage.getItem(`taxwise:compliance:view:${user.id}`);
      const cacheFilter = localStorage.getItem(`taxwise:compliance:filter:${user.id}`);

      if (cacheFindings) {
        try { setFindings(JSON.parse(cacheFindings)); } catch { setFindings(DEMO_FINDINGS); }
      } else {
        setFindings(DEMO_FINDINGS);
      }

      if (cacheChecklist) {
        try { setChecklist(JSON.parse(cacheChecklist)); } catch { setChecklist(DEMO_CHECKLIST); }
      } else {
        setChecklist(DEMO_CHECKLIST);
      }

      if (cacheView === "reports" || cacheView === "dashboard") setActiveView(cacheView);
      if (cacheFilter) setSeverityFilter(cacheFilter);
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id && findings.length > 0) {
      localStorage.setItem(`taxwise:compliance:findings:${user.id}`, JSON.stringify(findings));
    }
  }, [findings, user?.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id && checklist.length > 0) {
      localStorage.setItem(`taxwise:compliance:checklist:${user.id}`, JSON.stringify(checklist));
    }
  }, [checklist, user?.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      localStorage.setItem(`taxwise:compliance:view:${user.id}`, activeView);
    }
  }, [activeView, user?.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      localStorage.setItem(`taxwise:compliance:filter:${user.id}`, severityFilter);
    }
  }, [severityFilter, user?.id]);

  // Modals
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [checklistModalItem, setChecklistModalItem] = useState<ChecklistItem | null>(null);

  // Upload — multi-file queue
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([]);
  const [uploadedData, setUploadedData] = useState<Record<string, any> | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [showUploadQueue, setShowUploadQueue] = useState(false);

  // Reports
  const [reportGenerating, setReportGenerating] = useState<"pdf" | "xlsx" | "docx" | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") =>
    setToast({ message, type });

  const revenueCanvasRef = useRef<HTMLCanvasElement>(null);
  const severityCanvasRef = useRef<HTMLCanvasElement>(null);
  const revenueChart = useRef<ChartJS | null>(null);
  const severityChart = useRef<ChartJS | null>(null);

  // Helper: flash tick animation for an id
  const flashTick = useCallback((id: string) => {
    setTickIds((prev) => new Set(prev).add(id));
    setTimeout(() => setTickIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 900);
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────
  const { label, tone, critical, warning, passed, exposure, confidence } = statusTone(findings);

  const visibleFindings = findings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (query && !(f.title + f.area + (f.id || f.code)).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  // ── Charts ─────────────────────────────────────────────────────────────────
  const buildCharts = useCallback(() => {
    const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    if (revenueCanvasRef.current) {
      revenueChart.current?.destroy();
      revenueChart.current = new ChartJS(revenueCanvasRef.current, {
        type: "line",
        data: {
          labels: REVENUE_TREND.map((d) => d.period),
          datasets: [
            { label: "Revenue", data: REVENUE_TREND.map((d) => d.revenue), borderColor: css("--cx-navy"), backgroundColor: "transparent", tension: 0.3, pointRadius: 3 },
            { label: "Output VAT", data: REVENUE_TREND.map((d) => d.vat), borderColor: css("--cx-emerald"), backgroundColor: "transparent", tension: 0.3, pointRadius: 3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { position: "top", labels: { color: css("--cx-ink-soft"), font: { size: 11, family: "'IBM Plex Mono', monospace" } } } },
          scales: {
            x: { ticks: { color: css("--cx-ink-faint"), font: { size: 11 } }, grid: { color: css("--cx-line") } },
            y: { ticks: { color: css("--cx-ink-faint"), font: { size: 11 } }, grid: { color: css("--cx-line") } },
          },
        },
      });
    }

    if (severityCanvasRef.current) {
      severityChart.current?.destroy();
      const open = findings.filter((f) => f.status === "open");
      const breakdown = [
        { name: "Critical", value: open.filter((f) => f.severity === "critical").length, color: css("--cx-brick") },
        { name: "Warning", value: open.filter((f) => f.severity === "warning").length, color: css("--cx-amber") },
        { name: "Info", value: open.filter((f) => f.severity === "info").length, color: css("--cx-navy") },
      ].filter((d) => d.value > 0);

      if (breakdown.length > 0) {
        severityChart.current = new ChartJS(severityCanvasRef.current, {
          type: "doughnut",
          data: {
            labels: breakdown.map((d) => d.name),
            datasets: [{ data: breakdown.map((d) => d.value), backgroundColor: breakdown.map((d) => d.color), borderWidth: 0 }],
          },
          options: { responsive: true, cutout: "62%", plugins: { legend: { display: false } } },
        });
      }
    }
  }, [findings]);

  useEffect(() => {
    const t = setTimeout(buildCharts, 80);
    return () => {
      clearTimeout(t);
      revenueChart.current?.destroy();
      severityChart.current?.destroy();
      revenueChart.current = null;
      severityChart.current = null;
    };
  }, [buildCharts]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const updateStatus = (id: string, status: "resolved" | "ignored") => {
    // Update immediately, collapse the card, show toast
    setFindings((prev) => prev.map((f) => (f.id === id || f.code === id) ? { ...f, status } : f));
    setExpanded(null);
    showToast(
      status === "resolved" ? "Finding marked as Resolved ✓" : "Finding marked as Ignored",
      "success"
    );
  };

  const handleReviewComplete = (newFindings: any[]) => {
    const mapped: DisplayFinding[] = newFindings.map((f: any) => ({
      ...f,
      id: f.id || f.code,
      legislation: f.legislation_ref,
    }));
    setFindings(mapped);
    setShowDataEntry(false);
    setUploadedData(null);
    showToast("Compliance review complete. Findings updated.", "success");
  };

  const handleLoadHistoryReview = (histFindings: DisplayFinding[]) => {
    setFindings(histFindings);
    showToast("Historical review loaded into dashboard.", "info");
  };

  // ── Upload Return (multi-file) ─────────────────────────────────────────────
  const handleUploadClick = () => {
    setUploadError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Capture FileList BEFORE clearing input (clearing it would empty the FileList in some browsers)
    const fileList = e.target.files;
    const files = fileList ? Array.from(fileList) : [];
    e.target.value = "";
    if (files.length === 0) return;

    const newEntries: UploadedFile[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      status: "queued" as UploadFileStatus,
    }));

    // Validate extensions
    const invalid = newEntries.filter((entry) => {
      const ext = entry.file.name.split(".").pop()?.toLowerCase() || "";
      return !ACCEPTED_UPLOAD_EXTENSIONS.includes(ext);
    });

    if (invalid.length > 0) {
      const names = invalid.map((entry) => entry.file.name).join(", ");
      setUploadError(`Unsupported file type(s): ${names}. Accepted: PDF, DOCX, XLSX, CSV, JSON.`);
      showToast("Some files have unsupported types.", "error");
      return;
    }

    setUploadQueue((prev) => [...prev, ...newEntries]);
    setShowUploadQueue(true);
    setUploadError("");

    // Process each file sequentially
    let lastData: Record<string, any> | null = null;
    for (const entry of newEntries) {
      setUploadQueue((prev) => prev.map((qe) => qe.id === entry.id ? { ...qe, status: "processing" } : qe));
      const result = await parseTaxReturnFile(entry.file);
      if (!result.ok) {
        setUploadQueue((prev) => prev.map((qe) => qe.id === entry.id ? { ...qe, status: "error", error: result.error } : qe));
      } else {
        setUploadQueue((prev) => prev.map((qe) => qe.id === entry.id ? { ...qe, status: "done", data: result.data } : qe));
        lastData = result.data;
      }
    }

    if (lastData) {
      setUploadedData(lastData);
      showToast(`${newEntries.length} file(s) processed. Opening review form…`, "success");
      setShowDataEntry(true);
    } else {
      showToast("All files failed to parse. Please check formats and try again.", "error");
    }
  };

  const handleChecklistStatusChangeWithTick = (area: string, status: "pass" | "review" | "missing") => {
    flashTick(`checklist-${area}`);
    setTimeout(() => {
      setChecklist((prev) => prev.map((c) => c.area === area ? { ...c, status } : c));
      showToast(`${area} status updated to "${status === "pass" ? "Passed" : status === "missing" ? "Missing" : "Needs Review"}".`, "success");
    }, 400);
  };

  // ── Download Report ────────────────────────────────────────────────────────
  const handleDownloadReport = async (format: "pdf" | "xlsx" | "docx") => {
    setReportGenerating(format);
    try {
      const payload = {
        format,
        companyName: "Kase Traders Ltd",
        tin: "1004829201",
        period: "Jul 2026",
        reviewedAt: new Date().toISOString(),
        overallStatus: tone === "critical" ? "high_risk" : tone === "warning" ? "review_required" : "ready",
        critical,
        warning,
        passed,
        exposure,
        confidence,
        findings: findings.map((f) => ({
          code: f.code,
          severity: f.severity,
          area: f.area,
          title: f.title,
          description: f.description,
          reason: f.reason,
          impact: f.impact,
          recommendation: f.recommendation,
          legislation_ref: f.legislation_ref,
          exposure: f.exposure,
          confidence: f.confidence,
          status: f.status,
        })),
        checklist: checklist.map((c) => ({ area: c.area, status: c.status })),
        aiSummary: tone === "critical"
          ? "Critical compliance issues identified. Immediate action required before filing to avoid penalties under the Tax Procedures Code Act 2014."
          : tone === "warning"
          ? "Warning-level findings require review and remediation before the return is filed."
          : "All compliance checks passed. The return appears ready to file.",
      };

      const res = await fetch("/api/compliance/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Report generation failed.");
      }

      if (format === "pdf") {
        // Open the HTML in a new window and trigger the browser's print-to-PDF
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 800);
        } else {
          showToast("Pop-up blocked. Please allow pop-ups and try again.", "error");
        }
      } else {
        // Binary download for xlsx / docx
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `taxwise-compliance-Jul-2026.${format === "docx" ? "doc" : format}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      }

      showToast(
        format === "pdf"
          ? "Report opened. Use your browser's print dialog to save as PDF."
          : `${format.toUpperCase()} report downloaded successfully.`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to generate report.", "error");
    } finally {
      setReportGenerating(null);
    }
  };

  // ── Checklist ──────────────────────────────────────────────────────────────
  const handleChecklistStatusChange = handleChecklistStatusChangeWithTick;

  // ── Severity doughnut legend ───────────────────────────────────────────────
  const openFindings = findings.filter((f) => f.status === "open");
  const severityBreakdown = [
    { name: "Critical", color: "var(--cx-brick)", count: openFindings.filter((f) => f.severity === "critical").length },
    { name: "Warning", color: "var(--cx-amber)", count: openFindings.filter((f) => f.severity === "warning").length },
    { name: "Info", color: "var(--cx-navy)", count: openFindings.filter((f) => f.severity === "info").length },
  ].filter((d) => d.count > 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Hidden file input for Upload Return — multi-file */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.pdf,.xlsx,.xls,.docx,.doc"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
        aria-label="Upload tax return files"
      />

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap", marginBottom: 20,
        paddingBottom: 18, borderBottom: "1px solid var(--cx-line)",
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: "1.45rem", fontWeight: 600,
            color: "var(--cx-ink)", margin: 0, lineHeight: 1.2,
          }}>
            TaxWise AI Compliance Review
          </h1>
          <p style={{ fontSize: 13, color: "var(--cx-ink-soft)", margin: "3px 0 0", fontWeight: 400 }}>
            Identify compliance risks before filing.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <HeaderBtn icon={<ScanSearch size={13} />} label="Review Return" primary onClick={() => setShowDataEntry(true)} />
          <HeaderBtn icon={<Upload size={13} />} label="Upload Return" onClick={handleUploadClick} badge={uploadQueue.filter(f => f.status === "done").length || undefined} />
          <HeaderBtn icon={<Download size={13} />} label="Download Report" onClick={() => setActiveView("reports")} />
          <HeaderBtn icon={<Clock size={13} />} label="View History" onClick={() => setShowHistory(true)} />
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--cx-surface-sunken)", borderRadius: 10,
        padding: 4, width: "fit-content",
        border: "1px solid var(--cx-line)",
      }}>
        {([
          { id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard size={13} /> },
          { id: "reports" as const, label: "Reports", icon: <FileBarChart size={13} /> },
        ]).map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 7,
                fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                border: "none", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.18s ease",
                background: isActive ? "var(--cx-surface)" : "transparent",
                color: isActive ? "var(--cx-navy)" : "var(--cx-ink-soft)",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span style={{ color: isActive ? "var(--cx-navy)" : "var(--cx-ink-faint)", display: "flex" }}>{tab.icon}</span>
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="tab-active-dot"
                  style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cx-navy)", display: "inline-block", marginLeft: 2 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Upload Queue Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUploadQueue && uploadQueue.length > 0 && (
          <motion.div
            key="upload-queue"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 16 }}
          >
            <div style={{
              border: "1px solid var(--cx-line)", borderRadius: 10,
              background: "var(--cx-surface)", padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ ...eyebrow }}>Uploaded Files ({uploadQueue.length})</span>
                <button
                  onClick={() => { setShowUploadQueue(false); setUploadQueue([]); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cx-ink-faint)", display: "flex", padding: 2 }}
                  aria-label="Clear upload queue"
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {uploadQueue.map((uf) => {
                  const statusStyle = uf.status === "done"
                    ? { bg: "var(--cx-emerald-soft)", color: "var(--cx-emerald)", label: "Done", icon: <Check size={12} /> }
                    : uf.status === "error"
                    ? { bg: "var(--cx-brick-soft)", color: "var(--cx-brick)", label: "Error", icon: <X size={12} /> }
                    : uf.status === "processing"
                    ? { bg: "var(--cx-navy-soft)", color: "var(--cx-navy)", label: "Processing…", icon: <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> }
                    : { bg: "var(--cx-surface-sunken)", color: "var(--cx-ink-faint)", label: "Queued", icon: <Clock size={12} /> };
                  return (
                    <div key={uf.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 10px", borderRadius: 7,
                      background: "var(--cx-surface-sunken)", border: "1px solid var(--cx-line)",
                    }}>
                      {getFileIcon(uf.file.name)}
                      <span style={{ fontSize: 12.5, color: "var(--cx-ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uf.file.name}</span>
                      <span style={{ fontSize: 11, color: "var(--cx-ink-faint)", flexShrink: 0 }}>
                        {(uf.file.size / 1024).toFixed(0)} KB
                      </span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
                        borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: statusStyle.bg, color: statusStyle.color,
                      }}>
                        {statusStyle.icon} {statusStyle.label}
                      </span>
                      {uf.status === "error" && uf.error && (
                        <span style={{ fontSize: 11, color: "var(--cx-brick)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={uf.error}>{uf.error}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "var(--cx-brick-soft)", border: "1px solid color-mix(in srgb, var(--cx-brick) 25%, transparent)", fontSize: 13, color: "var(--cx-brick)", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} />
          {uploadError}
          <button onClick={() => setUploadError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--cx-brick)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeView === "dashboard" ? (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

            {/* ── Executive Summary Card ──────────────────────────────────── */}
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                <div>
                  <div style={{ ...eyebrow }}>Executive Summary — Jul 2026 · TIN 1004829201</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--cx-ink)", margin: 0 }}>Overall Status</h2>
                    <Stamp label={label} tone={tone} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--cx-ink-soft)" }}>Reviewed 13 Jul 2026 · Confidence {confidence}%</span>
              </div>

              {/* KPI Grid */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Critical Issues", value: String(critical), color: "var(--cx-brick)" },
                  { label: "Warnings", value: String(warning), color: "var(--cx-amber)" },
                  { label: "Checks Passed", value: String(passed), color: "var(--cx-emerald)" },
                  { label: "Est. Risk Exposure", value: fmtUGX(exposure), color: "var(--cx-navy)", large: true },
                  { label: "Confidence", value: `${confidence}%`, color: "var(--cx-ink)" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{
                    flex: "1 1 130px", minWidth: 120, background: "var(--cx-surface)",
                    border: "1px solid var(--cx-line)", borderRadius: 8, padding: "14px 16px",
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cx-ink-faint)", marginBottom: 8 }}>
                      {kpi.label}
                    </div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: kpi.color,
                      fontSize: kpi.large ? "1.1rem" : "1.45rem", lineHeight: 1.2,
                    }}>
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12.5, color: "var(--cx-ink-faint)", marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--cx-line)" }}>
                This review identifies possible inconsistencies based on the information provided. It does not constitute legal or tax advice, nor does it guarantee acceptance or rejection by URA.
              </p>
            </div>

            {/* ── Charts Row ─────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ ...chartTitle }}>Revenue &amp; Output VAT Trend</h3>
                  <span style={{ fontSize: 11, color: "var(--cx-ink-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>UGX millions</span>
                </div>
                <canvas ref={revenueCanvasRef} height={90} />
              </div>
              <div style={card}>
                <h3 style={{ ...chartTitle, marginBottom: 12 }}>Findings by Severity</h3>
                {severityBreakdown.length > 0 ? (
                  <>
                    <canvas ref={severityCanvasRef} height={130} />
                    <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: "var(--cx-ink-soft)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {severityBreakdown.map((d) => (
                        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 12.5, color: "var(--cx-ink-faint)", textAlign: "center", padding: "24px 0" }}>No open findings.</p>
                )}
              </div>
            </div>

            {/* ── Body Grid: Findings (left) + Checklist (right) ─────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

              {/* ── AI Findings ─────────────────────────────────────────── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: "var(--cx-ink)", margin: 0 }}>AI Findings</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--cx-line)", background: "var(--cx-surface)" }}>
                      <Search size={13} style={{ color: "var(--cx-ink-faint)" }} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search findings"
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--cx-ink)", width: 130, fontFamily: "inherit" }}
                      />
                    </div>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      style={{ fontSize: 12.5, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--cx-line)", background: "var(--cx-surface)", color: "var(--cx-ink)", fontFamily: "inherit", cursor: "pointer" }}
                    >
                      <option value="all">All severities</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                </div>

                {visibleFindings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--cx-ink-faint)" }}>
                    No findings match this filter.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {visibleFindings.map((f) => {
                      const fid = f.id || f.code;
                      const isOpen = expanded === fid;
                      const isResolved = f.status === "resolved";
                      const isIgnored = f.status === "ignored";
                      const isDone = isResolved || isIgnored;
                      return (
                        <motion.div
                          key={fid}
                          layout
                          whileHover={isDone ? {} : { y: -1.5, boxShadow: "0 6px 20px rgba(15, 32, 68, 0.06)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          style={{
                            border: isDone
                              ? `1px solid ${isResolved ? "color-mix(in srgb, var(--cx-emerald) 30%, transparent)" : "var(--cx-line)"}`
                              : "1px solid var(--cx-line)",
                            background: isDone
                              ? isResolved ? "color-mix(in srgb, var(--cx-emerald-soft) 60%, var(--cx-surface))" : "var(--cx-surface-sunken)"
                              : "var(--cx-surface)",
                            borderRadius: 8,
                            overflow: "hidden",
                            opacity: isDone ? 0.72 : 1,
                            transition: "opacity 0.25s, border-color 0.25s, background 0.25s",
                          }}
                        >
                          {/* Card header row */}
                          <button
                            onClick={() => !isDone && setExpanded(isOpen ? null : fid)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 10,
                              padding: "12px 16px", textAlign: "left", background: "none",
                              border: "none", cursor: isDone ? "default" : "pointer", outline: "none",
                            }}
                          >
                            {isDone
                              ? <CheckCircle2 size={15} style={{ color: isResolved ? "var(--cx-emerald)" : "var(--cx-ink-faint)", flexShrink: 0 }} />
                              : <SeverityIcon severity={f.severity} />}
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--cx-ink-faint)", flexShrink: 0 }}>{fid}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isDone ? "var(--cx-ink-soft)" : "var(--cx-ink)" }}>
                              {f.title}
                            </span>
                            <Stamp label={f.area} tone="navy" />
                            {isResolved && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 4, background: "var(--cx-emerald-soft)", color: "var(--cx-emerald)", fontSize: 10.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
                                <Check size={10} /> Resolved
                              </span>
                            )}
                            {isIgnored && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 4, background: "var(--cx-surface-sunken)", color: "var(--cx-ink-faint)", fontSize: 10.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--cx-line)", flexShrink: 0 }}>
                                Ignored
                              </span>
                            )}
                            {!isDone && (isOpen
                              ? <ChevronDown size={15} style={{ color: "var(--cx-ink-faint)", flexShrink: 0 }} />
                              : <ChevronRight size={15} style={{ color: "var(--cx-ink-faint)", flexShrink: 0 }} />
                            )}
                          </button>

                          {/* Expandable body */}
                          <AnimatePresence>
                            {isOpen && !isDone && (
                              <motion.div
                                key="body"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ padding: "4px 16px 16px", borderTop: "1px dashed var(--cx-line)" }}>
                                  <p style={{ fontSize: 13, margin: "12px 0", color: "var(--cx-ink)", lineHeight: 1.6 }}>{f.description}</p>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                    {[
                                      { label: "Why flagged", value: f.reason },
                                      { label: "Possible implications", value: f.impact },
                                      { label: "Suggested action", value: f.recommendation },
                                      { label: "Reference", value: f.legislation_ref || "—" },
                                    ].map(({ label: lbl, value }) => (
                                      <div key={lbl}>
                                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cx-ink-faint)", marginBottom: 4 }}>{lbl}</div>
                                        <div style={{ fontSize: 12.5, color: "var(--cx-ink-soft)", lineHeight: 1.5 }}>{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--cx-ink-soft)" }}>
                                      <span>Est. exposure: <strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--cx-ink)" }}>{f.exposure ? fmtUGX(f.exposure) : "—"}</strong></span>
                                      <span>Confidence: <strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--cx-ink)" }}>{f.confidence}%</strong></span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <motion.button
                                        whileHover={{ scale: 1.05, boxShadow: "0 0 0 3px color-mix(in srgb, var(--cx-emerald) 25%, transparent)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => updateStatus(fid, "resolved")}
                                        style={{ ...actionBtn, background: "var(--cx-emerald-soft)", color: "var(--cx-emerald)", border: "1px solid color-mix(in srgb, var(--cx-emerald) 30%, transparent)", display: "flex", alignItems: "center", gap: 5 }}
                                      >
                                        <Check size={12} /> Resolve
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.05, boxShadow: "0 0 0 3px color-mix(in srgb, var(--cx-ink-faint) 20%, transparent)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => updateStatus(fid, "ignored")}
                                        style={{ ...actionBtn, background: "var(--cx-surface-sunken)", color: "var(--cx-ink-soft)", border: "1px solid var(--cx-line)" }}
                                      >Ignore</motion.button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Compliance Checklist ─────────────────────────────────── */}
              <div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: "var(--cx-ink)", margin: "0 0 12px" }}>Compliance Checklist</h3>
                <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                  {checklist.map((c, i) => {
                    const tickId = `checklist-${c.area}`;
                    const isTicking = tickIds.has(tickId);
                    const meta =
                      c.status === "pass" ? { icon: <CircleCheck size={14} />, label: "Passed", color: "var(--cx-emerald)" } :
                      c.status === "missing" ? { icon: <X size={14} />, label: "Missing", color: "var(--cx-brick)" } :
                      { icon: <TriangleAlert size={14} />, label: "Needs review", color: "var(--cx-amber)" };
                    return (
                      <motion.button
                        key={c.area}
                        whileHover={{ backgroundColor: "var(--cx-surface-sunken)", x: 3, boxShadow: "inset 3px 0 0 var(--cx-navy)" }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => setChecklistModalItem(c)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 16px", fontSize: 13.5, color: "var(--cx-ink)", textAlign: "left",
                          borderBottom: i < checklist.length - 1 ? "1px dashed var(--cx-line)" : "none",
                          background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
                          transition: "background-color 0.15s",
                          outline: "none",
                        }}
                      >
                        <span>{c.area}</span>
                        <AnimatePresence mode="wait">
                          {isTicking ? (
                            <motion.span
                              key="tick"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 1.2, opacity: 0 }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--cx-emerald)", fontSize: 12, fontWeight: 600 }}
                            >
                              <Check size={14} /> Saved!
                            </motion.span>
                          ) : (
                            <motion.span
                              key="status"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: meta.color }}
                            >
                              {meta.icon} {meta.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button
                  onClick={() => setActiveView("reports")}
                  whileHover={{ scale: 1.015, y: -0.5 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    fontSize: 12.5, fontWeight: 500, padding: "10px", borderRadius: 6,
                    background: "var(--cx-navy)", color: "#fff", border: "none", cursor: "pointer",
                    fontFamily: "inherit", transition: "background-color 0.2s, box-shadow 0.2s",
                    outline: "none",
                  }}
                >
                  <FileBarChart size={14} /> Generate Report
                </motion.button>
                <p style={{ fontSize: 11, color: "var(--cx-ink-faint)", marginTop: 8, textAlign: "center" }}>
                  Click any area above to view guidance &amp; update status
                </p>
              </div>
            </div>
          </motion.div>

        ) : (
          /* ── Reports View ───────────────────────────────────────────────── */
          <motion.div key="reports" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <motion.button
              onClick={() => setActiveView("dashboard")}
              whileHover={{ scale: 1.015, x: -2 }}
              whileTap={{ scale: 0.985 }}
              style={{ ...actionBtn, background: "var(--cx-surface-sunken)", color: "var(--cx-ink-soft)", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, outline: "none" }}
            >
              <ChevronLeft size={14} /> Back to Dashboard
            </motion.button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cx-navy-soft)", color: "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileBarChart size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--cx-ink)", margin: 0 }}>Generate Report</h2>
                <p style={{ fontSize: 13, color: "var(--cx-ink-soft)", margin: "2px 0 0" }}>Kase Traders Ltd · Jul 2026 · {label}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                {
                  icon: <FileText size={16} />, label: "PDF Report", ext: "pdf" as const,
                  desc: "A4, branded cover page, all findings and recommendations. Opens in a new tab — use your browser's Print → Save as PDF.",
                },
                {
                  icon: <Table2 size={16} />, label: "Excel Workbook", ext: "xlsx" as const,
                  desc: "Four sheets: Management Summary, Findings, Financial Impact, and Compliance Checklist — ready to share with an accountant.",
                },
                {
                  icon: <FileType size={16} />, label: "Word Document", ext: "docx" as const,
                  desc: "Editable .doc format — annotate before sending to a client or colleague. Opens in Word or LibreOffice.",
                },
              ].map((fmt) => {
                const isGenerating = reportGenerating === fmt.ext;
                return (
                  <motion.button
                    key={fmt.ext}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleDownloadReport(fmt.ext)}
                    disabled={!!reportGenerating}
                    style={{
                      ...card, cursor: reportGenerating ? "not-allowed" : "pointer",
                      transition: "border-color 0.15s, opacity 0.15s",
                      display: "flex", flexDirection: "column", gap: 12,
                      textAlign: "left", fontFamily: "inherit",
                      opacity: reportGenerating && !isGenerating ? 0.55 : 1,
                      border: `1px solid ${isGenerating ? "var(--cx-navy)" : "var(--cx-line)"}`,
                    }}
                    onMouseOver={(e) => { if (!reportGenerating) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cx-navy)"; }}
                    onMouseOut={(e) => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cx-line)"; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isGenerating ? "var(--cx-navy)" : "var(--cx-navy-soft)", color: isGenerating ? "#fff" : "var(--cx-navy)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                      {isGenerating ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : fmt.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 600, color: "var(--cx-ink)" }}>{fmt.label}</div>
                      <div style={{ fontSize: 12.5, color: "var(--cx-ink-soft)", marginTop: 4, lineHeight: 1.5 }}>{fmt.desc}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--cx-navy)", marginTop: "auto" }}>
                      {isGenerating ? (
                        <span>Generating…</span>
                      ) : (
                        <><Download size={13} /> {fmt.ext === "pdf" ? "Open & Print as PDF" : `Download .${fmt.ext === "docx" ? "doc" : fmt.ext}`}</>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div style={{ border: "1px dashed var(--cx-line)", background: "var(--cx-surface)", borderRadius: 12, padding: 20, marginTop: 24 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 13.5, fontWeight: 600, color: "var(--cx-ink)", marginBottom: 8 }}>What&apos;s in every format</h3>
              <p style={{ fontSize: 12.5, color: "var(--cx-ink-soft)", lineHeight: 1.6, margin: 0 }}>
                Cover page with company &amp; TIN, a one-page management summary with all KPIs, detailed findings with reasoning and recommendations,
                a financial impact table, and the full compliance checklist — generated fresh from the current findings each time,
                so all three formats always match.
              </p>
            </div>

            {/* Report summary preview */}
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Report Preview — Current Data</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Critical", value: String(critical), color: "var(--cx-brick)" },
                  { label: "Warnings", value: String(warning), color: "var(--cx-amber)" },
                  { label: "Passed", value: String(passed), color: "var(--cx-emerald)" },
                  { label: "Findings Total", value: String(findings.length), color: "var(--cx-ink)" },
                  { label: "Est. Exposure", value: fmtUGX(exposure), color: "var(--cx-navy)" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ flex: "1 1 80px", borderRadius: 7, border: "1px solid var(--cx-line)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cx-ink-faint)", marginBottom: 5 }}>{kpi.label}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: kpi.color, fontSize: 15 }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Data Entry Modal (AiComplianceReview) ────────────────────────── */}
      <Modal open={showDataEntry} onClose={() => { setShowDataEntry(false); setUploadedData(null); }} title="Run Compliance Review" width={900}>
        <AiComplianceReview
          user={user}
          onReviewComplete={handleReviewComplete}
          initialData={uploadedData || undefined}
        />
      </Modal>

      {/* ── History Modal ─────────────────────────────────────────────────── */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Compliance History" width={680}>
        <HistoryModal onClose={() => setShowHistory(false)} onLoadReview={handleLoadHistoryReview} />
      </Modal>

      {/* ── Checklist Detail Modal ────────────────────────────────────────── */}
      <Modal open={!!checklistModalItem} onClose={() => setChecklistModalItem(null)} title={`Compliance Area: ${checklistModalItem?.area}`} width={540}>
        {checklistModalItem && (
          <ChecklistDetailModal
            item={checklistModalItem}
            onClose={() => setChecklistModalItem(null)}
            onStatusChange={handleChecklistStatusChange}
          />
        )}
      </Modal>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── Shared style objects ─────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--cx-surface)",
  border: "1px solid var(--cx-line)",
  borderRadius: 12,
  padding: 20,
};

const eyebrow: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--cx-ink-faint)",
};

const chartTitle: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--cx-ink)",
  margin: 0,
};

const actionBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.18s ease",
};

// ─── Header button helper ─────────────────────────────────────────────────────

const HeaderBtn = ({
  icon, label, primary, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick: () => void;
  badge?: number;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={primary
      ? { scale: 1.02, y: -1, boxShadow: "0 0 0 3px color-mix(in srgb, var(--cx-navy) 30%, transparent), 0 4px 16px rgba(15,32,68,0.20)" }
      : { scale: 1.02, y: -1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", borderColor: "var(--cx-navy)" }
    }
    whileTap={{ scale: 0.97 }}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 12.5, fontWeight: 500, padding: "9px 13px",
      borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
      transition: "background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
      outline: "none", position: "relative",
      boxShadow: primary ? "0 2px 8px rgba(15,32,68,0.18)" : "0 1px 3px rgba(0,0,0,0.06)",
      ...(primary
        ? { background: "var(--cx-navy)", color: "#fff", border: "1px solid var(--cx-navy)" }
        : { background: "var(--cx-surface)", border: "1px solid var(--cx-line)", color: "var(--cx-ink)" }),
    }}
  >
    {icon} {label}
    {badge != null && badge > 0 && (
      <span style={{
        position: "absolute", top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 99,
        background: "var(--cx-emerald)", color: "#fff", fontSize: 10, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
        boxShadow: "0 0 0 2px var(--cx-surface)",
      }}>{badge}</span>
    )}
  </motion.button>
);
