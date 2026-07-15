"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, BookOpen, Clock, AlertTriangle, Scale, CheckCircle2, ArrowRight } from "lucide-react";

interface LegalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "privacy" | "terms" | "blog";
}

export const LegalPortal: React.FC<LegalPortalProps> = ({
  isOpen,
  onClose,
  initialTab = "privacy",
}) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms" | "blog">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const tabs = [
    { id: "privacy", label: "Privacy Policy", icon: <Shield size={16} /> },
    { id: "terms", label: "Terms of Use", icon: <Scale size={16} /> },
    { id: "blog", label: "Legal Blog", icon: <BookOpen size={16} /> },
  ] as const;

  return (
    <AnimatePresence>
      <div
        id="legal-portal-overlay"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(9, 13, 22, 0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="legal-portal-card"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          style={{
            backgroundColor: "#0F172A",
            border: "1px solid rgba(148, 163, 184, 0.15)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "960px",
            height: "90vh",
            maxHeight: "780px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
              background: "linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.4))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: "#C8922A",
                  borderRadius: 3,
                  transform: "rotate(45deg)",
                  boxShadow: "0 0 10px rgba(200,146,42,0.4)",
                }}
              />
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "1.35rem",
                  color: "#FFFFFF",
                  fontWeight: 800,
                }}
              >
                Tax<span style={{ color: "#2DD4BF" }}>Wise</span>{" "}
                <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                  / Information Desk
                </span>
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "rgba(255, 255, 255, 0.6)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                e.currentTarget.style.color = "#F87171";
                e.currentTarget.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                e.currentTarget.style.transform = "none";
              }}
              title="Close Portal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              padding: "12px 24px",
              background: "#0A0F1D",
              borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: isActive ? "rgba(45, 212, 191, 0.08)" : "transparent",
                    color: isActive ? "#2DD4BF" : "rgba(255,255,255,0.55)",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    borderBottom: isActive ? "2px solid #2DD4BF" : "2px solid transparent",
                    outline: "none",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#FFFFFF";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px",
              background: "#0F172A",
              color: "rgba(255, 255, 255, 0.8)",
              lineHeight: 1.65,
              fontSize: "0.925rem",
            }}
          >
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: 30 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(45, 212, 191, 0.08)", border: "1px solid rgba(45, 212, 191, 0.25)", color: "#2DD4BF", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 4, marginBottom: 12 }}>
                    <Shield size={12} /> Compliance: Uganda Data Protection Act 2019
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.75rem", color: "#FFFFFF", fontWeight: 800, marginBottom: 8 }}>
                    Privacy Policy
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>
                    Effective Date: July 15, 2026 | Version 2.4
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2DD4BF" }}>1.</span> Scope and Overview
                    </h4>
                    <p>
                      TaxWise Uganda (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates as East Africa’s premier AI-powered tax intelligence suite designed specifically for tax consultants, certified public accountants, corporate legal practitioners, and clearing agents. This Privacy Policy details how we collect, store, transmit, and securely process your professional credentials and the sensitive taxation parameters you introduce onto our computing cluster. We are fully aligned with the statutory rules governed by the <strong>Uganda Data Protection and Privacy Act, 2019</strong>.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2DD4BF" }}>2.</span> Information We Collect
                    </h4>
                    <p style={{ marginBottom: 12 }}>
                      To fuel our advanced calculations and compliance auditing sequences, we process parameters classified across three distinct tiers:
                    </p>
                    <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: 10, listStyleType: "square" }}>
                      <li>
                        <strong>Account Credentials:</strong> Full name, verified professional email, mobile contact, organizational role, and payment tokens handled via our secure mobile money integrations (MTN MoMo, Airtel Money) and standard credit rails.
                      </li>
                      <li>
                        <strong>Transactional & Tax Filings:</strong> Under-appeal URA assessment documents, tax appeal drafts (TAT appeal timelines), monthly PAYE ledgers, custom VAT transaction histories, and vehicle specifications uploaded for clearing calculations.
                      </li>
                      <li>
                        <strong>AI Training Exclusions:</strong> Documents processed by our AI Case Analyzer are processed in safe, isolated memory sandboxes. <strong>We strictly do not use</strong> your proprietary tax advisory briefs, private client filings, or client transaction ledgers to train public models.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2DD4BF" }}>3.</span> Secure Data Storage & Hosting
                    </h4>
                    <p>
                      All user information is encrypted during transport using TLS 1.3 and at rest using AES-256 standards. Our primary data storage layers are partition-secured on PostgreSQL clusters and Google Cloud infrastructure, complying fully with regional sovereign data provisions. Taxwise maintains continuous monitoring to block malicious requests and prevent unauthorized information retrieval.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2DD4BF" }}>4.</span> Sharing Constraints and URA Disclosures
                    </h4>
                    <p>
                      We do not lease, trade, or distribute user records or case documents to any commercial third parties. Information will only be disclosed to the Uganda Revenue Authority (URA) or other national regulatory bodies when expressly requested and authorized by you during compliance sequences, or under strict, verified lawful court orders issued by competent tribunals within the Republic of Uganda.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2DD4BF" }}>5.</span> Right of Deletion (Right to be Forgotten)
                    </h4>
                    <p>
                      In compliance with Section 18 of the Uganda Data Protection and Privacy Act, you retain full ownership over your records. You may instantly execute an account deletion sequence directly through your Profile Settings page. Once initiated, our service permanently removes all active sessions, custom saved templates, billing registries, and extracted case documents from our databases within 24 hours.
                    </p>
                  </section>

                  <div style={{ background: "rgba(200, 146, 42, 0.05)", border: "1px solid rgba(200, 146, 42, 0.15)", borderRadius: "10px", padding: "16px", marginTop: "10px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#C8922A", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                      <AlertTriangle size={14} /> Security Assurance
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
                      If you suspect any unauthorized access or data exposure, report immediately to our Security Response Desk at <strong>hello@taxwise.cloud</strong> for rapid quarantine procedures.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "terms" && (
              <motion.div
                key="terms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: 30 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", color: "#3B82F6", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 4, marginBottom: 12 }}>
                    <Scale size={12} /> Governing Jurisdiction: Republic of Uganda
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.75rem", color: "#FFFFFF", fontWeight: 800, marginBottom: 8 }}>
                    Terms of Use
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>
                    Effective Date: July 15, 2026 | Professional Service Agreement
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#3B82F6" }}>1.</span> Agreement Acceptance & Purpose
                    </h4>
                    <p>
                      By initializing an account with TaxWise Uganda, you enter into a legally binding service agreement. Our platform provides automated analytical tools, mathematical validation routines, and a precedents library. TaxWise operates strictly as a <strong>Decision-Support Tool</strong>. The insights generated do not constitute certified legal opinions or final tax assessments. All conclusions should be validated by certified legal counsel or registered tax practitioners before filing appeals or paying assessments.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#3B82F6" }}>2.</span> Acceptable Professional Use
                    </h4>
                    <p style={{ marginBottom: 12 }}>
                      Registered members are granted a limited, non-exclusive, non-transferable license to consult the analytical engines. You explicitly agree:
                    </p>
                    <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: 8, listStyleType: "circle" }}>
                      <li>Not to deploy automated scraping routines or headless web-crawlers against our TAT Precedents Library.</li>
                      <li>Not to submit counterfeit documents or introduce malware via our PDF upload interfaces.</li>
                      <li>To keep credentials confidential; accounts are provisioned exclusively for single-user or designated enterprise firm seats.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#3B82F6" }}>3.</span> Payment, Billing and Local Currencies
                    </h4>
                    <p>
                      Subscriptions are billed in Uganda Shillings (UGX). Access to the Professional and Firm tiers requires active, recurring payments. Standard billing cycles occur monthly. For payments made through mobile money carriers (MTN Mobile Money, Airtel Money), you authorize our third-party checkout gateways to execute charges automatically until canceled. You can cancel your subscription at any time; access will remain active until the end of the current billing cycle.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#3B82F6" }}>4.</span> Limitation of Liability
                    </h4>
                    <p>
                      TaxWise, its directors, developers, and licensors shall not be held liable for any direct, indirect, or consequential financial damages, penal valuations, or legal losses arising from URA audits, objection rejections, or late filings. It is your professional responsibility to manage filing dates (such as the 30-day TAT deadline) and verify all calculations.
                    </p>
                  </section>

                  <section>
                    <h4 style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#3B82F6" }}>5.</span> Severability & Legal Jurisdiction
                    </h4>
                    <p>
                      These terms are governed strictly by the laws of the Republic of Uganda. Any disputes arising from this agreement shall be submitted exclusively to competent courts in Kampala, Uganda. If any portion of these terms is deemed unlawful or unenforceable by a court of law, all remaining sections will continue in full force and effect.
                    </p>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === "blog" && (
              <motion.div
                key="blog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: 30 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(200, 146, 42, 0.08)", border: "1px solid rgba(200, 146, 42, 0.25)", color: "#C8922A", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 4, marginBottom: 12 }}>
                    <BookOpen size={12} /> Legal Intelligence Desk
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.75rem", color: "#FFFFFF", fontWeight: 800, marginBottom: 8 }}>
                    Uganda Tax & Precedents Blog
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>
                    In-depth case breakdowns and compliance strategy written by leading East African experts.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                  {/* Article 1 */}
                  <article style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)", paddingBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "#C8922A", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>Precedents Analysis</span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={10} /> 4 min read</span>
                    </div>
                    <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", color: "#FFFFFF", fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                      Understanding the Mandatory 30-Day Appeal Timeline Under Section 14 of the TAT Act
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: 14 }}>
                      A comprehensive analysis of recent rulings by the Tax Appeals Tribunal (TAT) highlighting how strictly filing deadlines are enforced. In several high-profile cases, taxpayers lost their right to dispute massive assessments because they filed just 2 to 3 days past the statutory 30-day window following an objection decision.
                    </p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2DD4BF", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                      onClick={() => {
                        alert("To access full premium commentary and citations, please log in and search TAT ruling precedents in the Case Library.");
                      }}
                    >
                      Read precedent breakdown <ArrowRight size={14} />
                    </div>
                  </article>

                  {/* Article 2 */}
                  <article style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)", paddingBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "#3B82F6", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>Regulatory Updates</span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={10} /> 6 min read</span>
                    </div>
                    <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", color: "#FFFFFF", fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                      Navigating URA eFRIS Invoicing & VAT Compliance Audits in 2026
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: 14 }}>
                      As the Uganda Revenue Authority steps up enforcement on Electronic Fiscal Receipting and Invoicing System (eFRIS) integration, local businesses face severe penalties for missing transaction logs. This guide highlights standard failure points and explains how to run pre-audit calculations to catch discrepancies before official audits begin.
                    </p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2DD4BF", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                      onClick={() => {
                        alert("For practical checklists, please navigate to the Compliance tab in your dashboard.");
                      }}
                    >
                      Read compliance guide <ArrowRight size={14} />
                    </div>
                  </article>

                  {/* Article 3 */}
                  <article style={{ paddingBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "#10B981", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>Withholding Tax (WHT)</span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={10} /> 5 min read</span>
                    </div>
                    <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", color: "#FFFFFF", fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                      WHT Obligations on Payments to Non-Resident Service Providers in Uganda
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: 14 }}>
                      Uganda’s Income Tax Act places a strict 15% withholding tax obligation on payments made to non-resident service providers, unless a Double Taxation Agreement (DTA) reduces the rate. This article provides a clear walkthrough of the compliance steps, reporting timelines, and treaty checks necessary to avoid retroactive tax assessments.
                    </p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2DD4BF", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                      onClick={() => {
                        alert("To calculate specific rates and verify treaty countries, please consult the Intelligence Portal or Withholding Tax tool in your dashboard.");
                      }}
                    >
                      Analyze withholding obligations <ArrowRight size={14} />
                    </div>
                  </article>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer inside Card */}
          <div
            style={{
              padding: "16px 24px",
              background: "#0A0F1D",
              borderTop: "1px solid rgba(148, 163, 184, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            <span>© 2026 TaxWise Uganda. All rights reserved.</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={12} style={{ color: "#2DD4BF" }} /> Encrypted Sandboxed Processing
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
