import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Calendar, 
  Plus, 
  Save, 
  Sparkles, 
  AlertOctagon, 
  ShieldCheck, 
  AlertTriangle,
  FileText,
  TrendingDown,
  Percent,
  CheckCircle,
  FileSpreadsheet,
  X,
  History,
  RotateCcw
} from "lucide-react";
import { 
  getCompaniesAction, 
  createCompanyAction, 
  getTaxPeriodsAction, 
  saveTaxPeriodAction, 
  runComplianceReviewAction, 
  updateFindingStatusAction 
} from "../app/actions/complianceActions";
import { C } from "../lib/constants";
import { Card, Button, Badge } from "./UI";

interface AiComplianceReviewProps {
  user: {
    id: string;
    full_name?: string;
  };
}

export const AiComplianceReview: React.FC<AiComplianceReviewProps> = ({ user }) => {
  // Navigation / Active Scope
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-06");

  // Company creation
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  // Period creation
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("2026-07");

  // Raw Tax Figures form state
  const [vatOutput, setVatOutput] = useState(18000000);
  const [vatInput, setVatInput] = useState(8000000);
  const [efrisSales, setEfrisSales] = useState(100000000);
  const [vatInvalidTin, setVatInvalidTin] = useState(0);

  const [payrollCount, setPayrollCount] = useState(15);
  const [payrollGross, setPayrollGross] = useState(30000000);
  const [payeCount, setPayeCount] = useState(15);
  const [payeTax, setPayeTax] = useState(4500000);

  const [grossMargin, setGrossMargin] = useState(35); // as percentage
  const [financialSales, setFinancialSales] = useState(100000000);
  const [supplierTinsTotal, setSupplierTinsTotal] = useState(12);
  const [supplierTinsInvalid, setSupplierTinsInvalid] = useState(0);

  const [nssfContribution, setNssfContribution] = useState(4500000);
  const [isNilReturn, setIsNilReturn] = useState(false);
  const [docsPresent, setDocsPresent] = useState(true);
  const [duplicateInvoices, setDuplicateInvoices] = useState(0);
  const [negativeBalances, setNegativeBalances] = useState(false);

  // States
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Audit Trails / Resolution Modal
  const [resolutionTarget, setResolutionTarget] = useState<any>(null);
  const [resolutionAction, setResolutionAction] = useState<"resolve" | "ignore">("resolve");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load Companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompaniesAction();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompany(data[0]);
      }
    } catch (err) {
      console.error("Error loading companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    setMounted(true);
  }, []);

  // Load Periods for selected Company
  const loadPeriods = async (companyId: string) => {
    try {
      const data = await getTaxPeriodsAction(companyId);
      setPeriods(data);
      if (data.length > 0) {
        // Set form figures from the most recent period if available
        const latest = data[0];
        setFormFromRecord(latest);
      }
    } catch (err) {
      console.error("Error loading periods:", err);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      loadPeriods(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Map database period figures back to UI inputs
  const setFormFromRecord = (rec: any) => {
    setSelectedPeriod(rec.period_name);
    setVatOutput(Number(rec.vat_declared_output));
    setVatInput(Number(rec.vat_declared_input));
    setEfrisSales(Number(rec.efris_sales_total));
    setVatInvalidTin(Number(rec.vat_input_invalid_tin));
    setPayrollCount(rec.payroll_register_count);
    setPayrollGross(Number(rec.payroll_register_gross));
    setPayeCount(rec.paye_schedule_count);
    setPayeTax(Number(rec.paye_schedule_tax));
    setGrossMargin(rec.financial_gross_margin * 100);
    setFinancialSales(Number(rec.financial_sales));
    setSupplierTinsTotal(rec.supplier_tins_total_count);
    setSupplierTinsInvalid(rec.supplier_tins_invalid_count);
    setNssfContribution(Number(rec.nssf_contribution_total));
    setIsNilReturn(rec.is_nil_return);
    setDocsPresent(rec.supporting_documents_present);
    setDuplicateInvoices(rec.duplicate_invoices_count);
    setNegativeBalances(rec.negative_balances_present);
    setReviewResult(null);
    setFindings([]);
  };

  // Create Company Action Handler
  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      setSaving(true);
      const created = await createCompanyAction(newCompanyName.trim());
      setCompanies(prev => [...prev, created]);
      setSelectedCompany(created);
      setNewCompanyName("");
      setShowCreateCompany(false);
    } catch (err) {
      console.error("Error creating company:", err);
    } finally {
      setSaving(false);
    }
  };

  // Create Period Handler
  const handleCreatePeriod = () => {
    if (!newPeriodName.trim()) return;
    setSelectedPeriod(newPeriodName);
    // Preset mock/clean values for fast demo convenience
    setVatOutput(18000000);
    setVatInput(8000000);
    setEfrisSales(100000000);
    setVatInvalidTin(0);
    setPayrollCount(15);
    setPayrollGross(30000000);
    setPayeCount(15);
    setPayeTax(4500000);
    setGrossMargin(35);
    setFinancialSales(100000000);
    setSupplierTinsTotal(12);
    setSupplierTinsInvalid(0);
    setNssfContribution(4500000);
    setIsNilReturn(false);
    setDocsPresent(true);
    setDuplicateInvoices(0);
    setNegativeBalances(false);
    setReviewResult(null);
    setFindings([]);
    setShowCreatePeriod(false);
  };

  // Save Figures to Supabase
  const handleSavePeriod = async () => {
    if (!selectedCompany) return;
    try {
      setSaving(true);
      const payload = {
        vat_declared_output: vatOutput,
        vat_declared_input: vatInput,
        efris_sales_total: efrisSales,
        vat_input_invalid_tin: vatInvalidTin,
        payroll_register_count: payrollCount,
        payroll_register_gross: payrollGross,
        paye_schedule_count: payeCount,
        paye_schedule_tax: payeTax,
        financial_gross_margin: grossMargin / 100,
        financial_sales: financialSales,
        supplier_tins_total_count: supplierTinsTotal,
        supplier_tins_invalid_count: supplierTinsInvalid,
        nssf_contribution_total: nssfContribution,
        is_nil_return: isNilReturn,
        supporting_documents_present: docsPresent,
        duplicate_invoices_count: duplicateInvoices,
        negative_balances_present: negativeBalances
      };
      await saveTaxPeriodAction(selectedCompany.id, selectedPeriod, payload);
      alert("Tax period figures saved successfully!");
      loadPeriods(selectedCompany.id);
    } catch (err: any) {
      alert(`Error saving tax period: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Trigger Rules Engine + Gemini summary
  const handleRunReview = async () => {
    if (!selectedCompany) return;
    try {
      setReviewing(true);
      const res = await runComplianceReviewAction(selectedCompany.id, selectedPeriod, true);
      setReviewResult(res.review);
      setFindings(res.findings);
    } catch (err: any) {
      alert(`Review Failed: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  // Resolve/Ignore individual finding with live recalculation
  const handleUpdateFindingStatus = async () => {
    if (!reviewResult || !resolutionTarget) return;
    try {
      setActionLoading(true);
      const res = await updateFindingStatusAction(
        reviewResult.id,
        resolutionTarget.id,
        resolutionAction,
        resolutionNotes
      );
      if (res.success) {
        setReviewResult(res.review || null);
        setFindings(res.findings || []);
        setResolutionTarget(null);
        setResolutionNotes("");
      }
    } catch (err: any) {
      alert(`Failed to update finding status: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenFinding = async (finding: any) => {
    if (!reviewResult) return;
    try {
      const res = await updateFindingStatusAction(
        reviewResult.id,
        finding.id,
        "reopen",
        "Reopened for investigation"
      );
      if (res.success) {
        setReviewResult(res.review || null);
        setFindings(res.findings || []);
      }
    } catch (err: any) {
      alert(`Failed to reopen finding: ${err.message}`);
    }
  };

  // Print/Export dynamic PDF
  const handleExportPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.teal, animation: "spin 1s infinite linear" }}></div>
      </div>
    );
  }

  // Common styles using Design Tokens
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 28,
      maxWidth: 1200,
      margin: "0 auto",
    },
    headerBanner: {
      display: "flex",
      flexDirection: "row" as const,
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 24,
      gap: 16,
      flexWrap: "wrap" as const,
    },
    headerTitleContainer: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 6,
    },
    headerTitleRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    iconWrapper: {
      padding: 8,
      background: C.tealLight,
      color: C.teal,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "1.75rem",
      color: C.navy,
      margin: 0,
      fontWeight: 800,
    },
    subtitle: {
      color: C.muted,
      fontSize: "0.85rem",
      margin: 0,
      fontWeight: 500,
      lineHeight: 1.4,
    },
    selectorsContainer: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap" as const,
    },
    selectorBox: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: 12,
      padding: "6px 14px",
      boxShadow: "0 1px 3px rgba(15, 32, 68, 0.02)",
    },
    select: {
      fontSize: "0.825rem",
      fontWeight: 700,
      color: C.navy,
      background: "transparent",
      border: "none",
      outline: "none",
      cursor: "pointer",
      paddingRight: 4,
      minWidth: 150,
    },
    iconBtn: {
      background: "rgba(26, 123, 107, 0.08)",
      border: "none",
      color: C.teal,
      padding: 6,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      borderRadius: 6,
      transition: "all 0.15s ease",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(12, 1fr)",
      gap: 28,
    },
    formCard: {
      background: C.white,
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      padding: 24,
      display: "flex",
      flexDirection: "column" as const,
      gap: 20,
      height: "fit-content",
    },
    formHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 12,
      marginBottom: 4,
    },
    formTitle: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "1.15rem",
      color: C.navy,
      fontWeight: 800,
      margin: 0,
    },
    sectionTitle: {
      fontSize: "0.72rem",
      fontWeight: 800,
      textTransform: "uppercase" as const,
      letterSpacing: "0.06em",
      color: C.teal,
      margin: "0 0 12px 0",
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 6,
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    },
    label: {
      fontSize: "0.78rem",
      fontWeight: 700,
      color: C.navy,
      display: "block",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      fontSize: "0.85rem",
      fontWeight: 500,
      background: C.offwhite,
      color: C.text,
      border: `1.5px solid ${C.border}`,
      borderRadius: 8,
      outline: "none",
      transition: "all 0.2s ease",
    },
    checkboxRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 0",
    },
    checkboxLabel: {
      fontSize: "0.8rem",
      fontWeight: 700,
      color: C.navy,
    },
    checkbox: {
      width: 16,
      height: 16,
      cursor: "pointer",
      accentColor: C.teal,
    },
    statsCard: {
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: 16,
      padding: 18,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "space-between",
      minHeight: 115,
      boxShadow: "0 1px 3px rgba(15, 32, 68, 0.02)",
    },
    statsTitle: {
      fontSize: "0.72rem",
      fontWeight: 800,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      color: C.muted,
      marginBottom: 6,
    },
    statsValue: {
      fontSize: "1.4rem",
      fontWeight: 800,
      color: C.navy,
      lineHeight: 1.2,
    },
    statsDesc: {
      fontSize: "0.7rem",
      color: C.muted,
      marginTop: 4,
      fontWeight: 500,
    },
    aiSynthesisCard: {
      background: C.offwhite,
      border: `1.5px solid ${C.border}`,
      borderRadius: 16,
      padding: 20,
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    saveBtn: {
      background: C.teal,
      color: C.white,
      fontWeight: 700,
      padding: "10px 18px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontSize: "0.85rem",
    },
  };

  return (
    <div style={styles.container}>
      
      {/* 1. Header Banner */}
      <div style={styles.headerBanner}>
        <div style={styles.headerTitleContainer}>
          <div style={styles.headerTitleRow}>
            <div style={styles.iconWrapper}>
              <Sparkles size={20} />
            </div>
            <h1 style={styles.title}>
              AI Compliance Review Cockpit
            </h1>
          </div>
          <p style={styles.subtitle}>
            Audit and reconcile raw financial filings using deterministic tax rules, coupled with a cautious narrative assessment.
          </p>
        </div>

        {/* Company & Period Selectors */}
        <div style={styles.selectorsContainer}>
          <div style={styles.selectorBox}>
            <Building2 size={16} style={{ color: C.muted }} />
            <select 
              style={styles.select}
              value={selectedCompany?.id || ""}
              onChange={(e) => {
                const found = companies.find(c => c.id === e.target.value);
                if (found) setSelectedCompany(found);
              }}
            >
              {companies.length === 0 ? (
                <option value="" disabled>No companies registered</option>
              ) : (
                companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
            <button 
              onClick={() => setShowCreateCompany(true)}
              style={styles.iconBtn}
              title="Add Company"
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={styles.selectorBox}>
            <Calendar size={16} style={{ color: C.muted }} />
            <select 
              style={styles.select}
              value={selectedPeriod}
              onChange={(e) => {
                const found = periods.find(p => p.period_name === e.target.value);
                if (found) setFormFromRecord(found);
                else setSelectedPeriod(e.target.value);
              }}
            >
              {periods.map(p => (
                <option key={p.id} value={p.period_name}>{p.period_name}</option>
              ))}
              <option value="2026-06">2026-06</option>
              <option value="2026-07">2026-07</option>
            </select>
            <button 
              onClick={() => setShowCreatePeriod(true)}
              style={styles.iconBtn}
              title="Add Filing Period"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Popups / Modals */}
      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {showCreateCompany && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ background: C.white, borderRadius: 16, padding: 24, maxWidth: 440, width: "100%", border: `1.5px solid ${C.border}`, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}
              >
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.2rem", fontWeight: 800, color: C.navy, margin: 0 }}>Register New Company</h3>
                <input 
                  type="text" 
                  placeholder="Company Name (e.g., Pearl Retailers Ltd)"
                  style={styles.input}
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "end", gap: 12 }}>
                  <Button onClick={() => setShowCreateCompany(false)} variant="ghost" small>Cancel</Button>
                  <Button onClick={handleCreateCompany} disabled={saving} small>
                    {saving ? "Creating..." : "Save Company"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {showCreatePeriod && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ background: C.white, borderRadius: 16, padding: 24, maxWidth: 440, width: "100%", border: `1.5px solid ${C.border}`, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}
              >
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.2rem", fontWeight: 800, color: C.navy, margin: 0 }}>Create Filing Period</h3>
                <input 
                  type="text" 
                  placeholder="Filing Period (Format: YYYY-MM, e.g., 2026-07)"
                  style={styles.input}
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "end", gap: 12 }}>
                  <Button onClick={() => setShowCreatePeriod(false)} variant="ghost" small>Cancel</Button>
                  <Button onClick={handleCreatePeriod} small>Create</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div style={styles.grid}>
        
        {/* 2. Left Block: Figures Entry Form */}
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 24 }} className="col-span-12 lg:col-span-4">
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Filing Figures</h2>
              <Badge color={C.teal} bg={C.tealLight}>Draft</Badge>
            </div>

            {/* Form Inputs grouped logically */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              
              {/* VAT inputs */}
              <div>
                <h3 style={styles.sectionTitle}>Value Added Tax (VAT)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Declared Output VAT (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={vatOutput}
                      onChange={(e) => setVatOutput(Number(e.target.value))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>eFRIS Sales Revenue (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={efrisSales}
                      onChange={(e) => setEfrisSales(Number(e.target.value))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>VAT Input claimed on invalid TINs (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={vatInvalidTin}
                      onChange={(e) => setVatInvalidTin(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* PAYE inputs */}
              <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <h3 style={styles.sectionTitle}>Pay As You Earn (PAYE)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Payroll Staff</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={payrollCount}
                      onChange={(e) => setPayrollCount(Number(e.target.value))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Filing Staff</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={payeCount}
                      onChange={(e) => setPayeCount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Gross Payroll Register (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={payrollGross}
                      onChange={(e) => setPayrollGross(Number(e.target.value))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Scheduled PAYE Tax (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={payeTax}
                      onChange={(e) => setPayeTax(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Income Tax & General */}
              <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <h3 style={styles.sectionTitle}>Corporate Income Tax & General</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Gross Margin (%)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={grossMargin}
                      onChange={(e) => setGrossMargin(Number(e.target.value))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>NSSF UGX</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={nssfContribution}
                      onChange={(e) => setNssfContribution(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Financial Books Sales (UGX)</label>
                    <input 
                      type="number"
                      style={styles.input}
                      value={financialSales}
                      onChange={(e) => setFinancialSales(Number(e.target.value))}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Total Suppliers</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={supplierTinsTotal}
                        onChange={(e) => setSupplierTinsTotal(Number(e.target.value))}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Invalid TINs</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={supplierTinsInvalid}
                        onChange={(e) => setSupplierTinsInvalid(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status toggles */}
              <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={styles.checkboxRow}>
                  <span style={styles.checkboxLabel}>Submit as Nil Return</span>
                  <input 
                    type="checkbox" 
                    style={styles.checkbox}
                    checked={isNilReturn}
                    onChange={(e) => setIsNilReturn(e.target.checked)}
                  />
                </div>
                <div style={styles.checkboxRow}>
                  <span style={styles.checkboxLabel}>Supporting Docs Present</span>
                  <input 
                    type="checkbox" 
                    style={styles.checkbox}
                    checked={docsPresent}
                    onChange={(e) => setDocsPresent(e.target.checked)}
                  />
                </div>
                <div style={styles.checkboxRow}>
                  <span style={styles.checkboxLabel}>Unresolved Neg Balances</span>
                  <input 
                    type="checkbox" 
                    style={styles.checkbox}
                    checked={negativeBalances}
                    onChange={(e) => setNegativeBalances(e.target.checked)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Duplicate Invoices Count</label>
                  <input 
                    type="number"
                    style={styles.input}
                    value={duplicateInvoices}
                    onChange={(e) => setDuplicateInvoices(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 8 }}>
              <button 
                onClick={handleSavePeriod} 
                disabled={saving}
                style={styles.saveBtn}
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm text-white border-none cursor-pointer"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Figures"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Right Block: Core Compliance Assessment Screen */}
        <div style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 24 }} className="col-span-12 lg:col-span-8">
          
          {/* Review trigger CTA when no active review exists */}
          {!reviewResult && !reviewing && (
            <div style={{ background: `linear-gradient(135deg, ${C.tealLight} 0%, rgba(26,123,107,0.02) 100%)`, borderRadius: 16, padding: 40, border: `1.5px solid ${C.border}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Sparkles size={44} style={{ color: C.teal, animation: "pulse 2s infinite ease-in-out" }} />
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.4rem", fontWeight: 800, color: C.navy, margin: 0 }}>
                Ready to Run AI Compliance Review
              </h2>
              <p style={{ fontSize: "0.875rem", color: C.muted, maxWidth: 480, margin: 0, lineHeight: 1.5 }}>
                Trigger our deterministic financial auditing engine. TaxWise will execute complex rule checks, sum exposure levels, and consult Gemini for a client-safe compliance summary.
              </p>
              <Button 
                onClick={handleRunReview} 
                style={{ marginTop: 8 }}
              >
                Run AI Audit & Review
              </Button>
            </div>
          )}

          {reviewing && (
            <div style={{ background: C.white, borderRadius: 16, padding: 48, border: `1.5px solid ${C.border}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${C.border}`, opacity: 0.3 }}></div>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid transparent`, borderTopColor: C.teal, animation: "spin 0.8s infinite linear" }}></div>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.2rem", fontWeight: 800, color: C.navy, margin: 0 }}>Auditing Financial Ledgers</h3>
              <p style={{ fontSize: "0.85rem", color: C.muted, maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
                Running statutory logic, reconciliating EFRIS outputs, verifying supplier active TIN registrations, and drafting Gemini narrative summary...
              </p>
            </div>
          )}

          {/* Active Review Content */}
          {reviewResult && !reviewing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* Aggregated Risk Score Dashboard Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                
                {/* Status card */}
                <div style={styles.statsCard}>
                  <span style={styles.statsTitle}>Filing Readiness</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {reviewResult.status === "high_risk" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.red }}>
                        <AlertOctagon size={18} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase" }}>High Risk Flagged</span>
                      </div>
                    ) : reviewResult.status === "review_required" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.gold }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase" }}>Review Required</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.green }}>
                        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase" }}>Cleared</span>
                      </div>
                    )}
                    <span style={styles.statsDesc}>
                      {reviewResult.status === "high_risk" 
                        ? "Immediate correction required before submitting." 
                        : reviewResult.status === "review_required" 
                        ? "Filing contains potential discrepancies." 
                        : "Ledger figures reconcile. Low compliance risk."}
                    </span>
                  </div>
                </div>

                {/* Exposure Card */}
                <div style={styles.statsCard}>
                  <span style={styles.statsTitle}>Estimated exposure</span>
                  <div style={{ marginTop: 8 }}>
                    <div style={styles.statsValue}>
                      UGX {Number(reviewResult.estimated_exposure).toLocaleString()}
                    </div>
                    <span style={styles.statsDesc}>
                      Aggregated penalty/back-tax exposure of outstanding open issues.
                    </span>
                  </div>
                </div>

                {/* Filing Confidence Card */}
                <div style={styles.statsCard}>
                  <span style={styles.statsTitle}>Filing Confidence</span>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={styles.statsValue}>
                        {reviewResult.confidence}%
                      </div>
                      <div style={{ width: "100%", background: C.border, borderRadius: 50, height: 6, overflow: "hidden" }}>
                        <div 
                          style={{ background: C.teal, height: "100%", width: `${reviewResult.confidence}%`, borderRadius: 50, transition: "width 0.4s ease" }}
                        ></div>
                      </div>
                    </div>
                    <span style={styles.statsDesc}>
                      Filing accuracy score computed based on compliance deductions.
                    </span>
                  </div>
                </div>

              </div>

              {/* Gemini Professional Summary Block */}
              {reviewResult.ai_summary && (
                <div style={styles.aiSynthesisCard}>
                  <div style={{ position: "absolute", top: -10, right: -10, opacity: 0.05, color: C.teal }}>
                    <Sparkles size={110} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.teal, marginBottom: 8 }}>
                    <Sparkles size={16} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Executive Synthesis</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: C.navy, lineHeight: 1.6, fontWeight: 500, fontStyle: "italic", margin: "0 0 12px 0" }}>
                    &ldquo;{reviewResult.ai_summary}&rdquo;
                  </p>
                  <div style={{ fontSize: "9px", color: C.muted, fontWeight: 700, letterSpacing: "0.04em" }}>
                    ⚠️ GENERATED WITH CAUTIOUS HEDGED LANGUAGE UNDER REGULATORY COMPLIANCE PROTOCOLS
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 12, flexWrap: "wrap", gap: 12 }}>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.2rem", fontWeight: 800, color: C.navy, margin: 0 }}>
                  Auditor Findings ({findings.filter(f => f.status === "open").length} Open)
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Button 
                    onClick={handleExportPdf}
                    variant="outline"
                    small
                  >
                    <FileText size={14} />
                    Print PDF Report
                  </Button>
                  <Button 
                    onClick={handleRunReview}
                    variant="ghost"
                    small
                    style={{ background: C.tealLight, color: C.teal, border: "none" }}
                  >
                    <RotateCcw size={14} />
                    Re-Audit
                  </Button>
                </div>
              </div>

              {/* Findings Stack */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {findings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", background: C.white, borderRadius: 16, border: `1.5px dashed ${C.border}`, color: C.muted, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <ShieldCheck size={40} style={{ color: C.green }} />
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>Excellent! No compliance issues detected for this period.</p>
                  </div>
                ) : (
                  findings.map((f: any) => {
                    const isOpen = f.status === "open";
                    const isCritical = f.severity === "critical";
                    const isWarning = f.severity === "warning";
                    
                    const cardStyle: React.CSSProperties = {
                      background: isOpen ? C.white : C.offwhite,
                      opacity: isOpen ? 1 : 0.65,
                      borderRadius: 16,
                      border: `1.5px solid ${
                        !isOpen 
                          ? C.border 
                          : isCritical 
                          ? "rgba(220, 38, 38, 0.25)" 
                          : isWarning 
                          ? "rgba(200, 146, 42, 0.25)" 
                          : C.border
                      }`,
                      boxShadow: isOpen ? "0 4px 12px rgba(15, 32, 68, 0.02)" : "none",
                      transition: "all 0.2s ease",
                      overflow: "hidden",
                    };

                    return (
                      <div key={f.id} style={cardStyle}>
                        {/* Header card area */}
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 700, background: C.offwhite, border: `1px solid ${C.border}`, padding: "2px 6px", borderRadius: 4, color: C.navy }}>
                                {f.code}
                              </span>
                              <span style={{ 
                                fontSize: "0.68rem", 
                                fontWeight: 800, 
                                textTransform: "uppercase", 
                                padding: "2px 8px", 
                                borderRadius: 50,
                                background: isCritical ? C.redLight : isWarning ? C.goldLight : C.tealLight,
                                color: isCritical ? C.red : isWarning ? C.gold : C.teal
                              }}>
                                {f.severity}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 600 }}>
                                {f.area}
                              </span>
                            </div>

                            {/* Status controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {isOpen ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setResolutionTarget(f);
                                      setResolutionAction("resolve");
                                    }}
                                    style={{ background: C.greenLight, border: "none", color: C.green, padding: "4px 12px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = "0.85"}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                                  >
                                    Resolve
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setResolutionTarget(f);
                                      setResolutionAction("ignore");
                                    }}
                                    style={{ background: C.border, border: "none", color: C.navy, padding: "4px 12px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = "0.85"}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                                  >
                                    Ignore
                                  </button>
                                </>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: C.muted }}>
                                    [ {f.status.toUpperCase()} ]
                                  </span>
                                  <button 
                                    onClick={() => handleReopenFinding(f)}
                                    style={{ background: "transparent", border: "none", color: C.teal, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                                  >
                                    Reopen
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: C.navy }}>{f.title}</h4>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: C.text, lineHeight: 1.5 }}>{f.description}</p>
                          </div>

                          {/* Technical Accordion content */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: C.muted, letterSpacing: "0.04em" }}>Audit rationale / Reason</span>
                              <p style={{ margin: 0, fontSize: "0.78rem", color: C.text, lineHeight: 1.4 }}>{f.reason}</p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: C.muted, letterSpacing: "0.04em" }}>Potential regulatory Impact</span>
                              <p style={{ margin: 0, fontSize: "0.78rem", color: C.text, lineHeight: 1.4, fontStyle: "italic" }}>&ldquo;{f.impact}&rdquo;</p>
                            </div>
                          </div>

                           <div className="flex flex-col md:flex-row justify-between gap-3" style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: C.teal }}>Recommended corrective action:</span>
                              <p style={{ margin: 0, fontSize: "0.78rem", color: C.text, lineHeight: 1.4 }}>{f.recommendation}</p>
                            </div>
                            {f.legislation_ref && (
                              <div style={{ padding: 8, background: C.offwhite, borderRadius: 8, border: `1px solid ${C.border}`, alignSelf: "flex-start", maxWidth: 280 }}>
                                <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: C.muted, display: "block" }}>Statutory Reference</span>
                                <span style={{ fontSize: "0.68rem", fontWeight: 600, color: C.navy }}>{f.legislation_ref}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.offwhite, padding: "8px 12px", borderRadius: 8, fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>
                            <span>INDIVIDUAL EXPOSURE: <strong style={{ color: C.navy }}>UGX {Number(f.exposure).toLocaleString()}</strong></span>
                            <span>AUDIT CONFIDENCE: <strong style={{ color: C.navy }}>{f.confidence}%</strong></span>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Resolution/Audit Log Popover Modal */}
      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {resolutionTarget && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ background: C.white, borderRadius: 16, padding: 24, maxWidth: 460, width: "100%", border: `1.5px solid ${C.border}`, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: C.navy, margin: 0 }}>
                    Audit action: {resolutionAction === "resolve" ? "Mark as Resolved" : "Mark as Ignored"}
                  </h3>
                  <button onClick={() => setResolutionTarget(null)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", display: "flex" }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ background: C.offwhite, padding: 12, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: C.muted, display: "block" }}>Target Finding</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: C.navy }}>{resolutionTarget.code} - {resolutionTarget.title}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={styles.label}>Action Notes / Explanation</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide details about the corrective action taken (e.g. 'Supplier generated replacement eFRIS invoice') or explanation for ignoring (e.g. 'Legitimate tax holiday apply')..."
                    style={{ ...styles.input, fontFamily: "inherit", resize: "none" }}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "end", gap: 12 }}>
                  <Button 
                    onClick={() => setResolutionTarget(null)} 
                    variant="ghost"
                    small
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateFindingStatus} 
                    disabled={actionLoading} 
                    small
                  >
                    {actionLoading ? "Saving Audit Entry..." : "Log Action"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
