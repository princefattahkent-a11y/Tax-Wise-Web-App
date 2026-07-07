"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { C } from "../lib/constants";
import { Card } from "./UI";

const intelligenceTabs = [
  {
    id: "notes",
    title: "Practice notes",
    accent: C.teal,
    points: [
      "Review recent URA guidance before filing or responding to an audit notice.",
      "Keep updated with changes to eFRIS, VAT, and PAYE compliance checkpoints.",
      "Use the case library to compare similar disputes and argument structure.",
    ],
  },
  {
    id: "strategy",
    title: "Appeal strategy",
    accent: C.navy,
    points: [
      "Frame the issue around statutory authority, evidence, and timelines.",
      "Separate factual issues from legal interpretation to strengthen your position.",
      "Prepare a concise chronology and supporting schedule for every tribunal matter.",
    ],
  },
  {
    id: "transfer",
    title: "Transfer pricing",
    accent: C.gold,
    points: [
      "Document functional analysis, risk allocation, and value creation clearly.",
      "Align intra-group pricing with commercial substance and support documents.",
      "Check whether the transaction is within the scope of local transfer pricing rules.",
    ],
  },
  {
    id: "updates",
    title: "Latest updates",
    accent: C.green,
    points: [
      "Track new tax rulings, notices, import duty changes, and filing deadlines.",
      "Monitor developments that may affect VAT recovery, withholding obligations, and customs valuation.",
      "Use the dashboard to jump back into case work immediately after reading the update.",
    ],
  },
];

export const IntelligencePortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("notes");
  const activeContent = intelligenceTabs.find((tab) => tab.id === activeTab) ?? intelligenceTabs[0];

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
      <div style={{ width: "100%", maxWidth: 1020, display: "flex", flexDirection: "column", gap: 24 }}>
        <motion.div variants={itemVariants} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", color: C.navy, margin: 0, fontWeight: 800 }}>
              Intelligence hub
            </h1>
            <p style={{ color: C.muted, fontSize: "1rem", margin: 0, maxWidth: 680 }}>
              Browse practical guidance, appeals thinking, and compliance updates in one place.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {intelligenceTabs.map((tab) => {
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

        <motion.div variants={itemVariants}>
          <Card style={{ padding: 28 }} hover>
            <div style={{ display: "grid", gap: 22, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: C.navy, marginBottom: 8 }}>{activeContent.title}</div>
                <p style={{ color: C.muted, fontSize: "0.95rem", lineHeight: 1.75, margin: 0 }}>Each tab combines practical rules, appeal strategy, transfer pricing signals, and recent updates relevant to Uganda tax work.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <motion.div 
                  layoutId="focusBadge"
                  style={{ background: activeContent.accent, color: C.white, borderRadius: 16, padding: "14px 18px", boxShadow: "0 12px 28px rgba(15,32,68,0.08)" }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Focus area</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 8 }}>{activeContent.title}</div>
                </motion.div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
              {activeContent.points.map((point) => (
                <div key={point} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 16, borderRadius: 16, background: C.offwhite }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeContent.accent, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ color: C.text, lineHeight: 1.75, fontSize: "0.95rem" }}>{point}</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {intelligenceTabs.filter((tab) => tab.id !== activeContent.id).map((tab) => (
            <motion.div key={tab.id} variants={itemVariants}>
              <Card style={{ padding: 20, height: "100%" }} hover>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
                  <div style={{ fontWeight: 800, color: C.navy }}>{tab.title}</div>
                  <div style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.7, flex: 1 }}>{tab.points[0]}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: tab.accent, fontWeight: 700, marginTop: "auto" }}>
                    {tab.points.slice(1).map((point) => (
                      <span key={point} style={{ background: `${tab.accent}12`, borderRadius: 999, padding: "6px 12px", fontSize: "0.78rem" }}>{point.replace(/\.$/, "")}</span>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
