/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { COMPLIANCE_ITEMS, C, riskColors } from "../lib/constants";
import { Badge, Button, Card, ProgressBar } from "./UI";

interface ComplianceCheckerProps {
  user: {
    id: string;
  };
}

interface PastReport {
  id: string;
  type: string;
  score: number;
  risk_report: string;
  created_at: string;
}

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({ user }) => {
  const [tab, setTab] = useState<"efris" | "vat" | "paye">("efris");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pastReports, setPastReports] = useState<PastReport[]>([]);

  const items = COMPLIANCE_ITEMS[tab];
  const totalItemsCount = items.length;
  const checkedItemsCount = items.filter((i) => checked[`${tab}-${i.id}`]).length;
  const score = totalItemsCount ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;
  
  const highRisks = items.filter((i) => i.risk === "high" && !checked[`${tab}-${i.id}`]);
  const tabs = [
    { key: "efris", label: "eFRIS" },
    { key: "vat", label: "VAT" },
    { key: "paye", label: "PAYE" },
  ] as const;

  const toggle = (id: string) => {
    setChecked((c) => ({ ...c, [`${tab}-${id}`]: !c[`${tab}-${id}`] }));
  };

  const fetchPastReports = async () => {
    try {
      const { data, error } = await supabase
        .from("compliance_reports")
        .select("id, type, score, risk_report, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPastReports(data as PastReport[]);
    } catch (err) {
      console.error("Error fetching compliance reports:", err);
    }
  };

  useEffect(() => {
    fetchPastReports();
  }, []);

  const generateReport = async () => {
    setAiLoading(true);
    setAiReport("");
    
    // Gaps represent the unchecked items
    const gaps = items.filter((i) => !checked[`${tab}-${i.id}`]).map((i) => i.text);

    try {
      const res = await fetch("/api/compliance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complianceType: tab,
          score,
          gaps,
          userId: user.id,
          responses: checked, // Save response map
        }),
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setAiReport(data.report);
      fetchPastReports(); // Refresh history
    } catch (err: unknown) {
      console.error("Compliance report generation error:", err);
      setAiReport(
        "Failed to generate audit report. Please verify your internet connection and verify that you have added your Anthropic API Key in `.env.local`."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const loadPastReport = (report: PastReport) => {
    setAiReport(report.risk_report);
    setTab(report.type as "efris" | "vat" | "paye");
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
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800 }}>
          Compliance Checker
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Work through eFRIS, VAT, and PAYE statutory checklists to generate an AI risk audit report.
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28, alignItems: "start" }}>
        <motion.div variants={itemVariants}>
          {/* Tab Selectors */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, background: "rgba(15, 32, 68, 0.03)", padding: 6, borderRadius: 12, width: "fit-content" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setAiReport("");
                }}
                style={{
                  padding: "8px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === t.key ? C.teal : "transparent",
                  color: tab === t.key ? C.white : C.muted,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  fontFamily: "inherit",
                  boxShadow: tab === t.key ? "0 4px 10px rgba(26,123,107,0.2)" : "none"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Card style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.98rem" }}>
                {tabs.find((t) => t.key === tab)?.label} Auditing Checklist
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: score >= 80 ? C.green : score >= 50 ? C.gold : C.red,
                  }}
                >
                  {score}%
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 600 }}>COMPLETED</div>
              </div>
            </div>

            {/* Custom Gradient Progress Bar */}
            <ProgressBar 
              progress={score} 
              color={score >= 80 ? C.green : score >= 50 ? C.gold : C.red} 
              style={{ marginBottom: 24 }} 
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => {
                const isChecked = checked[`${tab}-${item.id}`];
                const [rc, rb] = riskColors[item.risk];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      borderRadius: 12,
                      border: `1.5px solid ${isChecked ? `${C.teal}30` : C.border}`,
                      background: isChecked ? C.tealLight : C.white,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      animation: isChecked ? "checkPop 0.25s ease" : "none",
                      boxShadow: isChecked ? "none" : "0 2px 4px rgba(15,32,68,0.01)"
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${isChecked ? C.teal : C.border}`,
                        background: isChecked ? C.teal : C.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: C.white,
                        fontSize: "0.8rem",
                        fontWeight: 900,
                        transition: "all 0.15s ease"
                      }}
                    >
                      {isChecked ? "✓" : ""}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.875rem",
                        color: isChecked ? C.teal : C.text,
                        textDecoration: isChecked ? "line-through" : "none",
                        opacity: isChecked ? 0.75 : 1,
                        lineHeight: 1.5,
                        fontWeight: isChecked ? 500 : 600
                      }}
                    >
                      {item.text}
                    </span>
                    <Badge color={rc} bg={rb}>
                      {item.risk}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>Score Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["high", "medium", "low"].map((r) => {
                const total = items.filter((i) => i.risk === r);
                const done = total.filter((i) => checked[`${tab}-${i.id}`]);
                const [rc, rb] = riskColors[r];
                return (
                  <div
                    key={r}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(15,32,68,0.03)`, paddingBottom: 8 }}
                  >
                    <Badge color={rc} bg={rb}>
                      {r} risk
                    </Badge>
                    <span style={{ fontSize: "0.85rem", color: C.navy, fontWeight: 700 }}>
                      {done.length} / {total.length} cleared
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pulsing Outstanding High-Risk Items Banner */}
            {highRisks.length > 0 && (
              <div 
                style={{ 
                  background: C.redLight, 
                  borderRadius: 10, 
                  padding: 14, 
                  marginTop: 16,
                  border: "1.5px solid transparent",
                  animation: "pulseBorder 2.5s infinite"
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 800, color: C.red, marginBottom: 8, letterSpacing: "0.02em" }}>
                  ⚠ {highRisks.length} HIGH-RISK VULNERABILITIES OUTSTANDING
                </div>
                {highRisks.slice(0, 2).map((h) => (
                  <div key={h.id} style={{ fontSize: "0.76rem", color: C.red, marginBottom: 4, display: "flex", gap: 5 }}>
                    <span>•</span>
                    <span style={{ fontWeight: 500 }}>{h.text.slice(0, 70)}...</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 8, fontSize: "0.95rem" }}>✦ AI Compliance Audit</div>
            <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
              Generates a detailed regulatory report outlining specific legal exposure and applicable penalties under the Tax Procedures Code Act.
            </p>
            <Button onClick={generateReport} disabled={aiLoading} style={{ width: "100%", justifyContent: "center" }}>
              {aiLoading ? "⟳ Auditing Checklists..." : "Generate Risk Report"}
            </Button>
            
            {aiReport && (
              <div
                style={{
                  marginTop: 18,
                  background: C.offwhite,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 16,
                  fontSize: "0.82rem",
                  color: C.text,
                  lineHeight: 1.7,
                  maxHeight: 280,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit"
                }}
              >
                {aiReport}
              </div>
            )}
          </Card>

          {pastReports.length > 0 && (
            <Card style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, color: C.navy, marginBottom: 14, fontSize: "0.95rem" }}>📁 Historic Audits</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 180, overflowY: "auto" }}>
                {pastReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => loadPastReport(report)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: C.white,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: `1.5px solid ${C.border}`,
                      transition: "all 0.2s"
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = C.teal;
                      e.currentTarget.style.background = C.offwhite;
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.white;
                    }}
                  >
                    <div>
                      <strong style={{ color: C.navy, textTransform: "uppercase" }}>{report.type}</strong>
                      <span style={{ color: C.muted, marginLeft: 6 }}>({report.score}%)</span>
                    </div>
                    <div style={{ color: C.muted, fontSize: "0.72rem", fontWeight: 600 }}>
                      {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
