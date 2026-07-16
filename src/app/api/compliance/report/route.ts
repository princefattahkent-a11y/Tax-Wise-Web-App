/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Finding {
  code: string;
  severity: string;
  area: string;
  title: string;
  description: string;
  reason: string;
  impact: string;
  recommendation: string;
  legislation_ref?: string;
  exposure: number;
  confidence: number;
  status: string;
}

interface ChecklistItem {
  area: string;
  status: "pass" | "review" | "missing";
}

interface ReportPayload {
  format: "pdf" | "xlsx" | "docx";
  companyName: string;
  tin: string;
  period: string;
  reviewedAt: string;
  overallStatus: string;
  critical: number;
  warning: number;
  passed: number;
  exposure: number;
  confidence: number;
  findings: Finding[];
  checklist: ChecklistItem[];
  aiSummary?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUGX = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-UG");

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString("en-UG", {
      day: "2-digit", month: "long", year: "numeric"
    });
  } catch { return s; }
};

const severityColor = (s: string) =>
  s === "critical" ? "#c0392b" : s === "warning" ? "#d97706" : "#1e7c6e";

const statusColor = (s: string) => {
  if (s === "High Risk" || s === "high_risk") return "#c0392b";
  if (s === "Review Required" || s === "review_required") return "#d97706";
  return "#1e7c6e";
};

const statusLabel = (s: string) => {
  if (s === "high_risk") return "High Risk";
  if (s === "review_required") return "Review Required";
  if (s === "ready") return "Ready to File";
  return s;
};

const checklistColor = (s: string) =>
  s === "pass" ? "#1e7c6e" : s === "missing" ? "#c0392b" : "#d97706";
const checklistLabel = (s: string) =>
  s === "pass" ? "Passed" : s === "missing" ? "Missing" : "Needs Review";

// ─── PDF HTML Template ────────────────────────────────────────────────────────

function buildPdfHtml(p: ReportPayload): string {
  const overall = statusLabel(p.overallStatus);
  const oColor = statusColor(p.overallStatus);

  const findingsRows = p.findings
    .map(
      (f) => `
      <tr class="finding-row">
        <td style="padding:10px 14px;">
          <span class="code">${f.code}</span><br/>
          <span class="area-badge" style="color:${severityColor(f.severity)};background:${severityColor(f.severity)}18;border:1px solid ${severityColor(f.severity)}30">${f.severity.toUpperCase()}</span>
        </td>
        <td style="padding:10px 14px;font-weight:600;color:#0f2044;">${f.title}</td>
        <td style="padding:10px 14px;color:#5a6a8a;font-size:11px;">${f.area}</td>
        <td style="padding:10px 14px;font-size:11px;color:#5a6a8a;">${f.description}</td>
        <td style="padding:10px 14px;font-size:11px;font-family:monospace;">${f.exposure > 0 ? fmtUGX(f.exposure) : "—"}</td>
        <td style="padding:10px 14px;">
          <span style="color:${f.status==="resolved"?"#1e7c6e":f.status==="ignored"?"#5a6a8a":"#c0392b"};font-size:11px;font-weight:600;text-transform:uppercase;">
            ${f.status}
          </span>
        </td>
      </tr>`
    )
    .join("");

  const checklistRows = p.checklist
    .map(
      (c) => `
      <tr>
        <td style="padding:9px 14px;color:#0f2044;">${c.area}</td>
        <td style="padding:9px 14px;">
          <span style="color:${checklistColor(c.status)};font-weight:600;font-size:12px;">${checklistLabel(c.status)}</span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>TaxWise Compliance Report — ${p.period}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #0f2044; font-size: 13px; line-height: 1.6; }
  
  /* Cover page */
  .cover { background: #0f2044; color: #fff; padding: 72px 64px; min-height: 260px; display: flex; flex-direction: column; gap: 16px; }
  .cover-logo { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.5; margin-bottom: 8px; }
  .cover-title { font-size: 32px; font-weight: 700; line-height: 1.15; }
  .cover-sub { font-size: 15px; opacity: 0.7; margin-top: 4px; }
  .cover-meta { margin-top: 32px; display: flex; gap: 40px; flex-wrap: wrap; }
  .cover-meta-item { }
  .cover-meta-label { font-size: 10px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5; margin-bottom: 3px; }
  .cover-meta-value { font-size: 14px; font-weight: 600; }
  .status-stamp { display: inline-block; padding: 6px 14px; border-radius: 3px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: ${oColor}22; border: 1.5px solid ${oColor}55; color: ${oColor}; margin-top: 6px; }
  
  /* Content */
  .content { padding: 48px 64px; }
  .section { margin-bottom: 40px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f2044; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #e8edf5; }
  
  /* KPI grid */
  .kpi-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
  .kpi-card { flex: 1 1 120px; border: 1px solid #e8edf5; border-radius: 8px; padding: 14px 16px; min-width: 110px; }
  .kpi-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a9ab8; margin-bottom: 6px; }
  .kpi-value { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 700; }
  
  /* AI Summary */
  .summary-box { background: #f4f7fb; border: 1px solid #d8e2f0; border-radius: 8px; padding: 20px; font-size: 13px; color: #2a3a5c; line-height: 1.7; }
  
  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f4f7fb; color: #5a6a8a; font-family: 'IBM Plex Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8edf5; }
  tbody tr { border-bottom: 1px solid #f0f4fa; }
  tbody tr:hover { background: #fafbfd; }
  .code { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #5a6a8a; }
  .area-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; margin-top: 3px; }
  
  /* Finding detail cards (for PDF's detailed section) */
  .finding-card { border: 1px solid #e8edf5; border-radius: 8px; padding: 18px; margin-bottom: 14px; page-break-inside: avoid; }
  .finding-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .finding-card-code { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #5a6a8a; }
  .finding-card-title { font-weight: 700; font-size: 14px; color: #0f2044; flex: 1; }
  .finding-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .finding-field-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a9ab8; margin-bottom: 3px; }
  .finding-field-value { font-size: 12px; color: #2a3a5c; line-height: 1.5; }
  
  /* Disclaimer */
  .disclaimer { margin-top: 40px; padding: 16px; background: #fff8e7; border: 1px solid #f5e4a8; border-radius: 6px; font-size: 11px; color: #7a6030; line-height: 1.6; }
  
  /* Page break */
  .page-break { page-break-before: always; padding-top: 40px; }
  
  /* Footer */
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e8edf5; display: flex; justify-content: space-between; font-size: 11px; color: #8a9ab8; font-family: 'IBM Plex Mono', monospace; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-logo">TaxWise Uganda · AI Compliance Report</div>
  <div class="cover-title">${p.companyName}</div>
  <div class="cover-sub">Tax Compliance Review · ${p.period}</div>
  <div>
    <div class="status-stamp">${overall}</div>
  </div>
  <div class="cover-meta">
    <div class="cover-meta-item">
      <div class="cover-meta-label">TIN</div>
      <div class="cover-meta-value">${p.tin}</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Period</div>
      <div class="cover-meta-value">${p.period}</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Reviewed</div>
      <div class="cover-meta-value">${fmtDate(p.reviewedAt)}</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Confidence</div>
      <div class="cover-meta-value">${p.confidence}%</div>
    </div>
  </div>
</div>

<!-- CONTENT -->
<div class="content">

  <!-- Executive Summary -->
  <div class="section">
    <div class="section-title">1. Executive Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Critical Issues</div>
        <div class="kpi-value" style="color:#c0392b;">${p.critical}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Warnings</div>
        <div class="kpi-value" style="color:#d97706;">${p.warning}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Checks Passed</div>
        <div class="kpi-value" style="color:#1e7c6e;">${p.passed}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Est. Risk Exposure</div>
        <div class="kpi-value" style="color:#0f2044;font-size:14px;">${fmtUGX(p.exposure)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">AI Confidence</div>
        <div class="kpi-value" style="color:#0f2044;">${p.confidence}%</div>
      </div>
    </div>
    ${p.aiSummary ? `<div class="summary-box"><strong>AI Analysis:</strong> ${p.aiSummary}</div>` : ""}
  </div>

  <!-- Findings Table -->
  <div class="section">
    <div class="section-title">2. Compliance Findings Summary</div>
    <table>
      <thead>
        <tr>
          <th>Code / Severity</th>
          <th>Finding</th>
          <th>Area</th>
          <th>Description</th>
          <th>Est. Exposure</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${findingsRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#8a9ab8;">No findings recorded for this period.</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Detailed Findings -->
  ${p.findings.length > 0 ? `
  <div class="section page-break">
    <div class="section-title">3. Detailed Findings &amp; Recommendations</div>
    ${p.findings.map((f) => `
    <div class="finding-card">
      <div class="finding-card-header">
        <span class="area-badge" style="color:${severityColor(f.severity)};background:${severityColor(f.severity)}18;border:1px solid ${severityColor(f.severity)}30">${f.severity.toUpperCase()}</span>
        <span class="finding-card-code">${f.code}</span>
        <span class="finding-card-title">${f.title}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a9ab8;">${f.area}</span>
      </div>
      <p style="font-size:12.5px;color:#2a3a5c;line-height:1.6;">${f.description}</p>
      <div class="finding-grid">
        <div>
          <div class="finding-field-label">Why Flagged</div>
          <div class="finding-field-value">${f.reason}</div>
        </div>
        <div>
          <div class="finding-field-label">Possible Implications</div>
          <div class="finding-field-value">${f.impact}</div>
        </div>
        <div>
          <div class="finding-field-label">Recommended Action</div>
          <div class="finding-field-value">${f.recommendation}</div>
        </div>
        <div>
          <div class="finding-field-label">Legal Reference</div>
          <div class="finding-field-value" style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${f.legislation_ref || "—"}</div>
        </div>
      </div>
      ${f.exposure > 0 ? `<div style="margin-top:12px;padding:8px 12px;background:#fff4f4;border-radius:5px;font-size:12px;color:#c0392b;"><strong>Estimated Exposure:</strong> <span style="font-family:'IBM Plex Mono',monospace;">${fmtUGX(f.exposure)}</span> &nbsp;·&nbsp; <strong>Confidence:</strong> ${f.confidence}%</div>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- Compliance Checklist -->
  <div class="section">
    <div class="section-title">${p.findings.length > 0 ? "4." : "3."} Compliance Checklist</div>
    <table>
      <thead>
        <tr>
          <th>Compliance Area</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Important Notice:</strong> This report has been generated by TaxWise AI based solely on the data submitted by the user.
    It identifies possible inconsistencies and risk indicators; it does not constitute legal or tax advice, nor does it guarantee
    acceptance or rejection of any return by the Uganda Revenue Authority (URA). All findings should be reviewed by a qualified
    tax professional before any filing or remediation action is taken. TaxWise Uganda and its affiliates accept no liability for
    reliance on this report without independent professional verification.
  </div>

  <div class="footer">
    <span>TaxWise Uganda · AI Compliance Review</span>
    <span>Generated ${fmtDate(new Date().toISOString())} · Confidential</span>
  </div>
</div>

</body>
</html>`;
}

// ─── Word HTML Template ───────────────────────────────────────────────────────
// Word can open HTML files with a .doc extension — this is a well-known trick
// that avoids needing the docx library (which has Node compatibility issues in
// Next.js edge runtime). The output opens directly in Word/LibreOffice.

function buildWordHtml(p: ReportPayload): string {
  const overall = statusLabel(p.overallStatus);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/><title>TaxWise Compliance Report</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #000; }
  h1 { font-size: 18pt; color: #0f2044; }
  h2 { font-size: 14pt; color: #0f2044; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; margin-top: 18pt; }
  h3 { font-size: 12pt; color: #0f2044; margin-top: 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  th { background: #e8edf5; font-size: 9pt; text-transform: uppercase; padding: 6pt 8pt; text-align: left; border: 1pt solid #ccc; }
  td { padding: 6pt 8pt; border: 1pt solid #ddd; font-size: 10pt; vertical-align: top; }
  .critical { color: #c0392b; font-weight: bold; }
  .warning { color: #d97706; font-weight: bold; }
  .pass { color: #1e7c6e; font-weight: bold; }
  .disclaimer { background: #fff8e7; border: 1pt solid #f5e4a8; padding: 10pt; font-size: 9pt; margin-top: 20pt; }
</style>
</head>
<body>
<h1>TaxWise AI Compliance Report</h1>
<p><strong>Company:</strong> ${p.companyName} &nbsp;·&nbsp; <strong>TIN:</strong> ${p.tin} &nbsp;·&nbsp; <strong>Period:</strong> ${p.period}</p>
<p><strong>Overall Status:</strong> <span class="${p.critical > 0 ? "critical" : p.warning > 0 ? "warning" : "pass"}">${overall}</span> &nbsp;·&nbsp; <strong>Reviewed:</strong> ${fmtDate(p.reviewedAt)}</p>

<h2>1. Executive Summary</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Critical Issues</td><td class="critical">${p.critical}</td></tr>
  <tr><td>Warnings</td><td class="warning">${p.warning}</td></tr>
  <tr><td>Checks Passed</td><td class="pass">${p.passed}</td></tr>
  <tr><td>Estimated Risk Exposure</td><td><strong>${fmtUGX(p.exposure)}</strong></td></tr>
  <tr><td>AI Confidence Score</td><td>${p.confidence}%</td></tr>
</table>
${p.aiSummary ? `<p><strong>AI Analysis:</strong> ${p.aiSummary}</p>` : ""}

<h2>2. Compliance Findings</h2>
<table>
  <tr><th>Code</th><th>Severity</th><th>Area</th><th>Title</th><th>Exposure</th><th>Status</th></tr>
  ${p.findings.map(f => `<tr>
    <td><code>${f.code}</code></td>
    <td class="${f.severity}">${f.severity.toUpperCase()}</td>
    <td>${f.area}</td>
    <td>${f.title}</td>
    <td>${f.exposure > 0 ? fmtUGX(f.exposure) : "—"}</td>
    <td>${f.status}</td>
  </tr>`).join("") || '<tr><td colspan="6">No findings recorded.</td></tr>'}
</table>

${p.findings.length > 0 ? `<h2>3. Detailed Findings &amp; Recommendations</h2>
${p.findings.map(f => `
<h3>${f.code} — ${f.title}</h3>
<p>${f.description}</p>
<table>
  <tr><th>Why Flagged</th><td>${f.reason}</td></tr>
  <tr><th>Possible Implications</th><td>${f.impact}</td></tr>
  <tr><th>Recommended Action</th><td>${f.recommendation}</td></tr>
  <tr><th>Legal Reference</th><td><code>${f.legislation_ref || "—"}</code></td></tr>
  ${f.exposure > 0 ? `<tr><th>Est. Exposure</th><td class="critical">${fmtUGX(f.exposure)} (${f.confidence}% confidence)</td></tr>` : ""}
</table>`).join("")}` : ""}

<h2>${p.findings.length > 0 ? "4." : "3."} Compliance Checklist</h2>
<table>
  <tr><th>Area</th><th>Status</th></tr>
  ${p.checklist.map(c => `<tr><td>${c.area}</td><td class="${c.status === "pass" ? "pass" : c.status === "missing" ? "critical" : "warning"}">${checklistLabel(c.status)}</td></tr>`).join("")}
</table>

<div class="disclaimer">
  <strong>Important Notice:</strong> This report has been generated by TaxWise AI based solely on the data submitted by the user.
  It identifies possible inconsistencies and risk indicators; it does not constitute legal or tax advice.
  All findings should be reviewed by a qualified tax professional before any filing or remediation action is taken.
</div>
</body>
</html>`;
}

// ─── Excel report ─────────────────────────────────────────────────────────────

function buildExcelWorkbook(p: ReportPayload): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Management Summary
  const summaryData = [
    ["TaxWise Uganda — Compliance Report"],
    [],
    ["Company", p.companyName],
    ["TIN", p.tin],
    ["Period", p.period],
    ["Overall Status", statusLabel(p.overallStatus)],
    ["Reviewed At", fmtDate(p.reviewedAt)],
    [],
    ["SUMMARY METRICS"],
    ["Critical Issues", p.critical],
    ["Warnings", p.warning],
    ["Checks Passed", p.passed],
    ["Estimated Risk Exposure (UGX)", p.exposure],
    ["AI Confidence (%)", p.confidence],
    [],
    ["AI Analysis"],
    [p.aiSummary || "No AI summary available."],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Management Summary");

  // Sheet 2 — Findings
  const findingsHeader = [
    "Code", "Severity", "Area", "Title", "Description", "Reason",
    "Impact", "Recommended Action", "Legal Reference", "Est. Exposure (UGX)",
    "Confidence (%)", "Status"
  ];
  const findingsData = [
    findingsHeader,
    ...p.findings.map((f) => [
      f.code, f.severity, f.area, f.title, f.description, f.reason,
      f.impact, f.recommendation, f.legislation_ref || "",
      f.exposure, f.confidence, f.status
    ])
  ];
  const wsFindings = XLSX.utils.aoa_to_sheet(findingsData);
  wsFindings["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 35 }, { wch: 40 },
    { wch: 40 }, { wch: 30 }, { wch: 40 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsFindings, "Findings");

  // Sheet 3 — Financial Impact
  const impactData = [
    ["Finding", "Area", "Severity", "Estimated Exposure (UGX)", "Confidence (%)"],
    ...p.findings
      .filter((f) => f.exposure > 0)
      .map((f) => [f.title, f.area, f.severity, f.exposure, f.confidence]),
    [],
    ["TOTAL EXPOSURE", "", "", p.exposure, ""],
  ];
  const wsImpact = XLSX.utils.aoa_to_sheet(impactData);
  wsImpact["!cols"] = [{ wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 26 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsImpact, "Financial Impact");

  // Sheet 4 — Checklist
  const checklistData = [
    ["Compliance Area", "Status"],
    ...p.checklist.map((c) => [c.area, checklistLabel(c.status)])
  ];
  const wsChecklist = XLSX.utils.aoa_to_sheet(checklistData);
  wsChecklist["!cols"] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsChecklist, "Compliance Checklist");

  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload: ReportPayload = await req.json();
    const { format } = payload;

    if (!["pdf", "xlsx", "docx"].includes(format)) {
      return NextResponse.json({ error: "Unsupported format." }, { status: 400 });
    }

    if (format === "xlsx") {
      const buffer = buildExcelWorkbook(payload);
      return new NextResponse(new Blob([buffer as any]), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="taxwise-compliance-${payload.period}.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      // We return styled HTML that the browser's native print-to-PDF or a
      // Blob-based approach will render. This works universally without
      // Puppeteer (which requires a headless Chrome binary not available in
      // all deployment environments). The client opens this HTML in a new
      // window and triggers window.print() for a native print-to-PDF flow,
      // OR we can return the HTML and let the client create a Blob download.
      const html = buildPdfHtml(payload);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="taxwise-compliance-${payload.period}.pdf"`,
        },
      });
    }

    if (format === "docx") {
      const html = buildWordHtml(payload);
      const bytes = Buffer.from(html, "utf-8");
      return new NextResponse(new Blob([bytes]), {
        status: 200,
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="taxwise-compliance-${payload.period}.doc"`,
        },
      });
    }

    return NextResponse.json({ error: "Unhandled format." }, { status: 500 });
  } catch (err: any) {
    console.error("[compliance/report] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate report." },
      { status: 500 }
    );
  }
}
