import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { C, riskColors } from "../lib/constants";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_ACCEPT,
} from "../lib/documentTypes";
import { Badge, Button, Card } from "./UI";

interface CaseAnalyzerProps {
  user: {
    id: string;
    email: string;
  };
}

interface AnalysisResult {
  summary: string;
  keyIssues: string[];
  verdict: string;
  risk: "low" | "medium" | "high";
  riskNote: string;
  advice: string;
  applicableLaw?: string[];
  tags?: string[];
  error?: boolean;
}

interface CaseRecord {
  id: string;
  title: string;
  created_at: string;
  risk_level: "low" | "medium" | "high";
  ai_summary: AnalysisResult;
}

/** TAT case from the library */
interface TatCase {
  id: string;
  case_number: string;
  title: string;
  year: number;
  tax_type: string;
  outcome: string;
  summary: string;
  full_text?: string;
  ai_commentary?: string;
}

// ─── Risk Gauge ───────────────────────────────────────────────────────────────
const RiskGauge = ({ level }: { level: "low" | "medium" | "high" }) => {
  const isLow = level === "low";
  const isMed = level === "medium";
  const isHigh = level === "high";

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 220 }}>
      {[
        { label: "LOW", active: isLow || isMed || isHigh, color: C.teal, bg: C.tealLight },
        { label: "MED", active: isMed || isHigh, color: C.gold, bg: C.goldLight },
        { label: "HIGH", active: isHigh, color: C.red, bg: C.redLight }
      ].map((bar) => (
        <div
          key={bar.label}
          style={{
            flex: 1,
            padding: "4px 0",
            borderRadius: 4,
            fontSize: "0.65rem",
            fontWeight: 800,
            textAlign: "center",
            transition: "all 0.3s ease",
            background: bar.active ? bar.bg : "#E5E7EB",
            color: bar.active ? bar.color : C.muted,
            border: bar.active ? `1px solid ${bar.color}25` : "1px solid transparent"
          }}
        >
          {bar.label}
        </div>
      ))}
    </div>
  );
};

// ─── Accordion Header ─────────────────────────────────────────────────────────
const AccordionHeader = ({ title, isOpen, onClick }: { title: string; isOpen: boolean; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.005 }}
    whileTap={{ scale: 0.995 }}
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      padding: "12px 14px",
      background: "rgba(15, 32, 68, 0.02)",
      border: `1px solid rgba(15, 32, 68, 0.05)`,
      borderRadius: 8,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      fontSize: "0.85rem",
      fontWeight: 700,
      color: C.navy,
    }}
    onMouseOver={e => e.currentTarget.style.background = "rgba(15, 32, 68, 0.04)"}
    onMouseOut={e => e.currentTarget.style.background = "rgba(15, 32, 68, 0.02)"}
  >
    <span>{title}</span>
    <motion.span
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        fontSize: "0.65rem",
        color: C.muted
      }}
    >
      ▼
    </motion.span>
  </motion.button>
);

// ─── Outcome color map ─────────────────────────────────────────────────────────
const outcomeColors: Record<string, [string, string]> = {
  Allowed: [C.green, "#DCFCE7"],
  Dismissed: [C.red, "#FEE2E2"],
  Partial: [C.gold, "#FEF3CD"],
};

// ─── Case Library Picker Modal ─────────────────────────────────────────────────
interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (c: TatCase) => void;
}

const LibraryPicker: React.FC<LibraryPickerProps> = ({ open, onClose, onSelect }) => {
  const [cases, setCases] = useState<TatCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");

  // Fetch on first open
  const fetched = useRef(false);
  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    supabase
      .from("tat_cases")
      .select("id, case_number, title, year, tax_type, outcome, summary, full_text, ai_commentary")
      .order("year", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setCases(data as TatCase[]);
        setLoading(false);
      });
  }, [open]);

  const types = ["All", ...Array.from(new Set(cases.map(c => c.tax_type)))];
  const years = ["All", ...Array.from(new Set(cases.map(c => String(c.year))))];
  const outcomes = ["All", "Allowed", "Dismissed", "Partial"];

  const filtered = cases.filter(c => {
    const q = query.toLowerCase();
    const matchQ = !q || c.title.toLowerCase().includes(q) || c.case_number.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q) || c.tax_type.toLowerCase().includes(q);
    const matchT = typeFilter === "All" || c.tax_type === typeFilter;
    const matchY = yearFilter === "All" || String(c.year) === yearFilter;
    const matchO = outcomeFilter === "All" || c.outcome === outcomeFilter;
    return matchQ && matchT && matchY && matchO;
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 32, 68, 0.5)",
            zIndex: 1100,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "32px 20px",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{
              background: C.white,
              borderRadius: 20,
              width: "100%",
              maxWidth: 740,
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 32px 80px rgba(15, 32, 68, 0.28)",
              border: "1px solid rgba(255,255,255,0.5)",
              overflow: "hidden",
            }}
            onClick={e => e.stopPropagation()}
          >
        {/* Header */}
        <div style={{
          padding: "20px 28px",
          borderBottom: `1px solid rgba(15,32,68,0.06)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: C.navy }}>
              📚 Browse Case Library
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 2, fontWeight: 500 }}>
              Select a TAT precedent to load it into the analyzer
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(15,32,68,0.04)",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              color: C.muted,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(15,32,68,0.08)"; e.currentTarget.style.color = C.navy; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(15,32,68,0.04)"; e.currentTarget.style.color = C.muted; }}
          >
            ✕
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: "16px 28px", borderBottom: `1px solid rgba(15,32,68,0.04)`, flexShrink: 0, background: C.offwhite }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍  Search by case title, TAT reference, keywords..."
            className="input-focus-ring"
            style={{
              width: "100%",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "11px 16px",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              outline: "none",
              background: C.white,
              color: C.text,
              boxSizing: "border-box",
              marginBottom: 12,
              transition: "all 0.2s",
            }}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {([
              ["Type", types, typeFilter, setTypeFilter],
              ["Year", years, yearFilter, setYearFilter],
              ["Outcome", outcomes, outcomeFilter, setOutcomeFilter],
            ] as [string, string[], string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, opts, val, set]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}:</span>
                <select
                  value={val}
                  onChange={e => set(e.target.value)}
                  className="input-focus-ring"
                  style={{
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    background: C.white,
                    color: C.navy,
                    outline: "none",
                  }}
                >
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: C.muted, fontWeight: 600 }}>
              {filtered.length} case{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 28px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", color: C.teal, marginBottom: 10 }}>⟳</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Loading cases...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>No cases found</div>
              <p style={{ fontSize: "0.8rem", marginTop: 4 }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => { onSelect(c); onClose(); }}
                  style={{
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
                    background: C.white,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = C.teal;
                    e.currentTarget.style.background = C.tealLight;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = `0 6px 20px rgba(26,123,107,0.1)`;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.background = C.white;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.9rem", marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: "0.73rem", color: C.muted, fontWeight: 600, marginBottom: 6 }}>
                      📂 {c.case_number} · 📅 {c.year}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: C.text, lineHeight: 1.55, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.summary}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    <Badge
                      color={outcomeColors[c.outcome]?.[0] || C.muted}
                      bg={outcomeColors[c.outcome]?.[1] || C.offwhite}
                      style={{ fontWeight: 800 }}
                    >
                      {c.outcome}
                    </Badge>
                    <Badge color={C.navy} bg="#E8EDF5" style={{ fontWeight: 700 }}>
                      {c.tax_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── PDF Download Helper ───────────────────────────────────────────────────────
async function downloadResultAsPDF(result: AnalysisResult, caseType: string) {
  // Dynamically import html2pdf only on the client side
  const html2pdf = (await import("html2pdf.js")).default;
  
  const now = new Date().toLocaleString("en-UG", { timeZone: "Africa/Kampala" });

  const riskLabel = result.risk?.toUpperCase() ?? "N/A";
  const issuesList = result.keyIssues?.map((i, n) => `<li>${n + 1}. ${i}</li>`).join("") ?? "";
  const lawBadges = result.applicableLaw?.map(l => `<span class="badge badge-law">⚖️ ${l}</span>`).join("") ?? "N/A";
  const tagBadges = result.tags?.map(t => `<span class="badge badge-tag">#${t}</span>`).join("") ?? "";
  const riskClass = result.risk === "high" ? "risk-high" : result.risk === "medium" ? "risk-med" : "risk-low";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TaxWise Case Analysis Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 10.5pt;
      color: #1C1C1E;
      background: #fff;
      padding: 0;
      line-height: 1.65;
    }

    /* ── Cover header ── */
    .cover {
      background: linear-gradient(135deg, #0F2044 0%, #1A7B6B 100%);
      color: #fff;
      padding: 36px 48px 28px;
    }
    .cover-logo { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; opacity: .65; margin-bottom: 4px; }
    .cover-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22pt;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .cover-sub { font-size: 9.5pt; opacity: .75; }
    .cover-meta { margin-top: 20px; display: flex; gap: 28px; flex-wrap: wrap; }
    .cover-meta-item { font-size: 9pt; opacity: .8; }
    .cover-meta-item strong { opacity: 1; display: block; font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }

    /* ── Risk badge in header ── */
    .risk-badge {
      display: inline-block;
      padding: 5px 18px;
      border-radius: 50px;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .risk-high  { background: #FEE2E2; color: #DC2626; }
    .risk-med   { background: #FEF3CD; color: #C8922A; }
    .risk-low   { background: #E6F5F2; color: #1A7B6B; }

    /* ── Body content ── */
    .body { padding: 32px 48px 48px; }

    /* Risk summary row */
    .risk-row {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #F8F7F4;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 14px 20px;
      margin-bottom: 24px;
    }
    .risk-label { font-size: 8pt; font-weight: 800; color: #0F2044; text-transform: uppercase; letter-spacing: .06em; }

    /* Sections */
    .section { margin-bottom: 22px; }
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #1A7B6B;
      border-bottom: 2px solid #E6F5F2;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    .section-body { font-size: 10pt; color: #1C1C1E; line-height: 1.75; }

    /* Verdict box */
    .verdict-box {
      border-left: 4px solid #C8922A;
      background: #FEF3CD;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 6px;
      font-size: 10pt;
      font-weight: 500;
      line-height: 1.7;
    }
    .risk-note {
      font-size: 9pt;
      color: #6B7280;
      font-style: italic;
      padding: 4px 0 0 4px;
    }

    /* Issues list */
    .issues-list { list-style: none; padding: 0; }
    .issues-list li {
      padding: 6px 0 6px 20px;
      position: relative;
      font-size: 10pt;
      color: #1C1C1E;
      border-bottom: 1px solid #F3F4F6;
    }
    .issues-list li::before {
      content: "•";
      position: absolute;
      left: 4px;
      color: #1A7B6B;
      font-weight: 800;
    }

    /* Badges */
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .03em;
    }
    .badge-law { background: #E8EDF5; color: #0F2044; }
    .badge-tag { background: #E6F5F2; color: #1A7B6B; }

    /* Footer */
    .footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #9CA3AF;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .verdict-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Cover / Header -->
  <div class="cover">
    <div class="cover-logo">TaxWise Uganda · taxwise.cloud</div>
    <div class="cover-title">Case Analysis Report</div>
    <div class="cover-sub">AI-powered Tax Dispute Analysis</div>
    <div class="cover-meta">
      <div class="cover-meta-item"><strong>Case Type</strong>${caseType}</div>
      <div class="cover-meta-item"><strong>Generated</strong>${now}</div>
      <div class="cover-meta-item"><strong>Exposure Level</strong><span class="risk-badge ${riskClass}">${riskLabel}</span></div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Risk Row -->
    <div class="risk-row">
      <span class="risk-label">Exposure Level:</span>
      <span class="risk-badge ${riskClass}">${riskLabel}</span>
    </div>

    <!-- 1. Summary -->
    <div class="section">
      <div class="section-title">1. Summary of Dispute</div>
      <div class="section-body">${result.summary ?? ""}</div>
    </div>

    <!-- 2. Key Legal Issues -->
    <div class="section">
      <div class="section-title">2. Key Legal Issues Identified</div>
      <ul class="issues-list">${issuesList}</ul>
    </div>

    <!-- 3. Verdict -->
    <div class="section">
      <div class="section-title">3. Tribunal Verdict / Decision</div>
      <div class="verdict-box">${result.verdict ?? ""}</div>
      ${result.riskNote ? `<div class="risk-note">ℹ ${result.riskNote}</div>` : ""}
    </div>

    <!-- 4. Advice -->
    <div class="section">
      <div class="section-title">4. Professional Advice &amp; Next Steps</div>
      <div class="section-body">${result.advice ?? ""}</div>
    </div>

    <!-- 5. Law & Tags -->
    <div class="section">
      <div class="section-title">5. Applicable Law &amp; References</div>
      <div class="badges">${lawBadges}</div>
      ${tagBadges ? `<div class="badges" style="margin-top:10px">${tagBadges}</div>` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>Powered by TaxWise Uganda &nbsp;·&nbsp; taxwise.cloud</span>
      <span>This report is generated for informational purposes only and does not constitute legal advice.</span>
    </div>
  </div>
</body>
</html>`;

  // Create a container div with the HTML content
  const element = document.createElement("div");
  element.innerHTML = html;
  
  // Configure html2pdf options
  const options = {
    margin: 0,
    filename: `TaxWise_Case_Analysis_${new Date().getTime()}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true },
    jsPDF: { unit: "pt" as const, format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] }
  };
  
  // Generate and download PDF
  html2pdf().set(options).from(element).save();
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const CaseAnalyzer: React.FC<CaseAnalyzerProps> = ({ user }) => {
  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState("TAT Ruling");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reports, setReports] = useState<CaseRecord[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    issues: true,
    verdict: true,
    advice: true,
    law: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPastReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("id, title, created_at, risk_level, ai_summary")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setReports(data as unknown as CaseRecord[]);
    } catch (err) {
      console.error("Error fetching past reports:", err);
    }
  }, []);

  // Defer calling the async fetch to avoid synchronous setState in the effect body
  useEffect(() => {
    const id = setTimeout(() => {
      void fetchPastReports();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchPastReports]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFile(null);
      setFileName("");
      setText(`The selected file exceeds the 20MB limit. Please choose a smaller document or split it into multiple parts.`);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setText(
      `[File Uploaded: ${selectedFile.name}]\n\nThis file is ready for analysis. The server will parse the document text or use OCR/vision where needed for scanned PDFs and images.\n\nYou can also add custom notes or paste additional excerpts here if you'd like to combine them with the document.`
    );
  };

  /** Called when the user selects a case from the library picker */
  const handleLibrarySelect = (c: TatCase) => {
    const content = [
      `[Case Library: ${c.case_number}]`,
      `Title: ${c.title}`,
      `Year: ${c.year} | Tax Type: ${c.tax_type} | Outcome: ${c.outcome}`,
      ``,
      `Summary:`,
      c.summary,
      c.full_text ? `\nFull Text:\n${c.full_text}` : "",
    ].join("\n");

    setText(content);
    setFile(null);
    setFileName("");
    // Auto-select a matching case type
    const typeMap: Record<string, string> = {
      "VAT": "VAT Dispute",
      "Income Tax": "Income Tax",
      "PAYE": "PAYE Issue",
      "eFRIS": "eFRIS Compliance",
    };
    const matchedType = Object.keys(typeMap).find(k => c.tax_type?.includes(k));
    if (matchedType) setCaseType(typeMap[matchedType]);
    else setCaseType("TAT Ruling");
  };

  const analyze = async () => {
    if (!text.trim() && !file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("text", text);
      formData.append("caseType", caseType);
      formData.append("userId", user.id);

      const res = await fetch("/api/cases/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("API call failed");
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.analysis);

      // Reset input fields
      setFile(null);
      setFileName("");
      setText("");

      // Refresh list
      fetchPastReports();
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      setResult({
        summary: "",
        keyIssues: [],
        verdict: "",
        risk: "medium",
        riskNote: "",
        advice: "",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!result || result.error) return;
    await downloadResultAsPDF(result, caseType);
  };

  const loadPastReport = (report: CaseRecord) => {
    setResult(report.ai_summary);
    setCaseType(report.title.startsWith("File Analysis:") ? "TAT Ruling" : "General Scenario");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];

      if (selectedFile.size > MAX_DOCUMENT_SIZE_BYTES) {
        setFile(null);
        setFileName("");
        setText(`The selected file exceeds the 20MB limit. Please choose a smaller document or split it into multiple parts.`);
        return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setText(
        `[File Uploaded: ${selectedFile.name}]\n\nThis file is ready for analysis. The server will parse the document text or use OCR/vision where needed for scanned PDFs and images.\n\nYou can also add custom notes or paste additional excerpts here if you'd like to combine them with the document.`
      );
    }
  };

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
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800 }}>
          Case Analyzer
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Upload a scanned PDF, Word document, image, or text file and paste dispute details. AI extracts structured legal analysis instantly.
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 28, alignItems: "start" }}>
        {/* ── Left: Input Card ── */}
        <motion.div variants={itemVariants}>
          <Card style={{ padding: 28 }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 20, fontSize: "0.98rem" }}>📄 Document & Details Input</div>

          {/* PDF Upload Dropzone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? C.teal : C.border}`,
              borderRadius: 14,
              padding: "26px 20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 12,
              background: dragActive ? C.tealLight : fileName ? "rgba(26,123,107,0.04)" : C.offwhite,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: dragActive ? "scale(1.01)" : "scale(1)"
            }}
            onMouseOver={e => { if (!dragActive && !fileName) e.currentTarget.style.background = "rgba(15, 32, 68, 0.02)"; }}
            onMouseOut={e => { if (!dragActive && !fileName) e.currentTarget.style.background = C.offwhite; }}
          >
            <input
              ref={fileRef}
              type="file"
              accept={SUPPORTED_DOCUMENT_ACCEPT}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: "1.8rem", marginBottom: 8, animation: dragActive ? "spin 1s linear infinite" : "none" }}>
              {fileName ? "📄" : "📎"}
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: fileName ? C.teal : C.navy }}>
              {fileName || "Upload Case Doc / URA Assessment"}
            </div>
            <div style={{ fontSize: "0.74rem", color: C.muted, marginTop: 4, fontWeight: 500 }}>
              Supports scanned PDFs, Word docs, text files, and images up to 20MB
            </div>
          </div>

          {/* Browse Library Button */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <button
              onClick={() => setLibraryOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "transparent",
                border: `1.5px solid ${C.navy}22`,
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: C.navy,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = C.tealLight;
                e.currentTarget.style.borderColor = C.teal;
                e.currentTarget.style.color = C.teal;
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = `${C.navy}22`;
                e.currentTarget.style.color = C.navy;
              }}
            >
              📚 Browse Case Library
            </button>
          </div>

          <div style={{ textAlign: "center", color: C.muted, fontSize: "0.78rem", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            — or paste text excerpts —
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text contents of the ruling or write a detailed summary of your tax query here..."
            className="input-focus-ring"
            style={{
              width: "100%",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: 16,
              fontSize: "0.875rem",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 180,
              outline: "none",
              background: C.offwhite,
              boxSizing: "border-box",
              color: C.text,
              transition: "all 0.2s ease"
            }}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center" }}>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="input-focus-ring"
              style={{
                flex: 1,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: C.white,
                color: C.navy,
                fontWeight: 600,
                outline: "none",
                transition: "all 0.2s ease"
              }}
            >
              {["TAT Ruling", "URA Assessment", "Income Tax", "VAT Dispute", "PAYE Issue", "eFRIS Compliance", "General Scenario"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button onClick={analyze} disabled={loading || (!text.trim() && !file)}>
              {loading ? "⟳ Analyzing..." : "Run AI Analysis →"}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ── Right: Analysis Findings Card ── */}
      <motion.div variants={itemVariants}>
        <Card style={{ padding: 28, minHeight: 460, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid rgba(15,32,68,0.05)", paddingBottom: 16 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.98rem" }}>✦ Analysis Findings</div>
            {result && !result.error && (
              <Button onClick={downloadReport} small variant="outline">
                ⬇ Download PDF
              </Button>
            )}
          </div>

          {!result && !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                color: C.muted,
                gap: 12,
                padding: "40px 0"
              }}
            >
              <div style={{ fontSize: "3rem", opacity: 0.25 }}>📊</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Ready for case analysis</div>
              <p style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", maxWidth: 240 }}>
                Upload your document or paste the content on the left to see findings.
              </p>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 16,
                padding: "40px 0"
              }}
            >
              <div style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite", color: C.teal }}>⟳</div>
              <div style={{ fontSize: "0.9rem", color: C.navy, fontWeight: 700 }}>AI Tax Engine Active...</div>
              <p style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", maxWidth: 220 }}>
                Reading pages, matching precedents, and drafting summaries.
              </p>
            </div>
          )}

          {result && result.error && (
            <div style={{ color: C.red, fontSize: "0.875rem", padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠</div>
              <strong>Analysis failed.</strong>
              <p style={{ marginTop: 8, fontSize: "0.82rem", color: C.muted }}>
                Please check your internet connection and verify that you have added your Google Gemini API Key in `.env.local`.
              </p>
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Risk Level Badge Row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: C.offwhite,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(15,32,68,0.04)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: C.navy }}>EXPOSURE LEVEL:</span>
                  <Badge
                    color={riskColors[result.risk]?.[0] || C.muted}
                    bg={riskColors[result.risk]?.[1] || C.offwhite}
                    style={{ fontWeight: 800 }}
                  >
                    {result.risk?.toUpperCase()}
                  </Badge>
                </div>
                <RiskGauge level={result.risk} />
              </div>

              {/* Accordion Summary */}
              <div>
                <AccordionHeader title="1. Summary of Dispute" isOpen={openSections.summary} onClick={() => toggleSection("summary")} />
                {openSections.summary && (
                  <div style={{ padding: "12px 14px 4px", fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>
                    {result.summary}
                  </div>
                )}
              </div>

              {/* Accordion Key Issues */}
              <div>
                <AccordionHeader title="2. Key Legal Issues Identified" isOpen={openSections.issues} onClick={() => toggleSection("issues")} />
                {openSections.issues && (
                  <div style={{ padding: "12px 14px 4px" }}>
                    {result.keyIssues?.map((i, n) => (
                      <div key={n} style={{ fontSize: "0.875rem", color: C.text, marginBottom: 8, display: "flex", gap: 8 }}>
                        <span style={{ color: C.teal, fontWeight: 700 }}>•</span>
                        <span>{i}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion Verdict */}
              <div>
                <AccordionHeader title="3. Tribunal Verdict / Decision" isOpen={openSections.verdict} onClick={() => toggleSection("verdict")} />
                {openSections.verdict && (
                  <div style={{ padding: "12px 14px 4px" }}>
                    <div style={{ borderLeft: `3.5px solid ${C.gold}`, background: C.goldLight, padding: "12px 16px", borderRadius: "0 8px 8px 0" }}>
                      <div style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.6, fontWeight: 500 }}>
                        {result.verdict}
                      </div>
                      {result.riskNote && (
                        <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, fontStyle: "italic" }}>
                          ℹ {result.riskNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Advice */}
              <div>
                <AccordionHeader title="4. Professional Advice & Next Steps" isOpen={openSections.advice} onClick={() => toggleSection("advice")} />
                {openSections.advice && (
                  <div style={{ padding: "12px 14px 4px", fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>
                    {result.advice}
                  </div>
                )}
              </div>

              {/* Accordion Law & Tags */}
              <div>
                <AccordionHeader title="5. Applicable Law & References" isOpen={openSections.law} onClick={() => toggleSection("law")} />
                {openSections.law && (
                  <div style={{ padding: "12px 14px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {result.applicableLaw && result.applicableLaw.length > 0 && (
                      <div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {result.applicableLaw.map((l) => (
                            <Badge key={l} color={C.navy} bg="#E8EDF5">
                              ⚖️ {l}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.tags && result.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid rgba(15,32,68,0.03)", paddingTop: 8 }}>
                        {result.tags.map((t) => (
                          <Badge key={t} color={C.teal} bg={C.tealLight}>
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </Card>
      </motion.div>
    </div>

    {/* Recent Analyses */}
    {reports.length > 0 && (
      <motion.div variants={itemVariants} style={{ marginTop: 36 }}>
        <div style={{ fontWeight: 800, color: C.navy, marginBottom: 16, fontSize: "0.98rem" }}>📁 Recent Analyses Reports</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {reports.map((r) => (
            <Card
              key={r.id}
              style={{ padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", gap: 12 }}
              hover
              onClick={() => loadPastReport(r)}
            >
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.navy, lineHeight: 1.45 }}>{r.title}</div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, fontWeight: 500 }}>
                  📅 {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", borderTop: "1px solid rgba(15,32,68,0.04)", paddingTop: 10 }}>
                <span style={{ fontSize: "0.78rem", color: C.teal, fontWeight: 700 }}>View Report →</span>
                <Badge
                  color={riskColors[r.risk_level]?.[0] || C.muted}
                  bg={riskColors[r.risk_level]?.[1] || C.offwhite}
                  style={{ fontWeight: 700 }}
                >
                  {r.risk_level?.toUpperCase()}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    )}

    {/* Case Library Picker Modal */}
    <LibraryPicker
      open={libraryOpen}
      onClose={() => setLibraryOpen(false)}
      onSelect={handleLibrarySelect}
    />
  </motion.div>
);
};
