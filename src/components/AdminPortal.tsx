"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import {
  isSupportedDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_ACCEPT,
} from "../lib/documentTypes";
import { Badge, Card, Button, Modal } from "./UI";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Precedent {
  id: string;
  case_number: string;
  title: string;
  year: number;
  tax_type: string;
  outcome: string;
  summary: string;
  full_text?: string;
  ai_commentary?: string;
  pdf_path?: string;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
}

interface Course {
  id: number;
  title: string;
  level: string;
  emoji: string;
  color: string;
  accent_color: string;
  description: string;
  lessons: Lesson[];
  created_at: string;
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
}

interface AdminCase {
  id: string;
  title: string;
  risk_level: string;
  created_at: string;
  user_id: string;
  users?: { full_name: string; email: string };
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string;
  users?: { full_name: string; email: string };
}

interface AdminLog {
  id: string;
  action: string;
  performed_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ComplianceStats {
  efris: number;
  vat: number;
  paye: number;
}

interface SiteSettings {
  stat_cases: string;
  stat_time_saved: string;
  stat_practitioners: string;
  stat_calculators: string;
  calc_paye_rate: string;
  calc_vat_rate: string;
  calc_wht_rate: string;
  calc_import_rate: string;
  calc_corporate_rate: string;
  hero_badge_text: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_title_line3: string;
  hero_subtitle: string;
  topbar_text: string;
  topbar_email: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  stat_cases: "4,200+",
  stat_time_saved: "85%",
  stat_practitioners: "350+",
  stat_calculators: "6",
  calc_paye_rate: "10",
  calc_vat_rate: "18",
  calc_wht_rate: "6",
  calc_import_rate: "43",
  calc_corporate_rate: "30",
  hero_badge_text: "Built for Uganda Tax & Customs Professionals",
  hero_title_line1: "The tax intelligence",
  hero_title_line2: "platform your practice",
  hero_title_line3: "actually needs",
  hero_subtitle: "AI case analysis, TAT precedent research, live tax & import calculators, and compliance checking tools — purpose-built for Uganda's tax ecosystem.",
  topbar_text: "🇺🇬 Engineered for Uganda's Tax & Customs Ecosystem",
  topbar_email: "hello@taxwise.cloud",
};

interface AdminPortalProps {
  onNavigate?: (page: string) => void;
  currentAdminId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_MRR: Record<string, number> = {
  starter: 50000,
  professional: 150000,
  firm: 400000,
};

const PLAN_COLORS: Record<string, [string, string]> = {
  professional: [C.teal, C.tealLight],
  firm: [C.navy, "#E8EDF5"],
  starter: ["#7C3AED", "#F3E8FF"],
  free: [C.muted, C.offwhite],
};

const RISK_COLORS: Record<string, [string, string]> = {
  high: [C.red, "#FEE2E2"],
  medium: [C.gold, "#FEF3CD"],
  low: [C.teal, C.tealLight],
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });

const fmtMRR = (n: number) =>
  n >= 1_000_000 ? `UGX ${(n / 1_000_000).toFixed(1)}M` : `UGX ${(n / 1000).toLocaleString()}K`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const TabButton: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void; badge?: number }> = ({
  label, icon, active, onClick, badge,
}) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: "0.84rem", fontWeight: active ? 700 : 600,
        background: active ? `linear-gradient(135deg,${C.teal},${C.tealDark})` : hov ? "rgba(15,32,68,0.05)" : "transparent",
        color: active ? C.white : hov ? C.navy : C.muted,
        boxShadow: active ? "0 4px 12px rgba(26,123,107,0.25)" : "none",
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "1rem" }}>{icon}</span>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: C.red, color: C.white, borderRadius: 50,
          fontSize: "0.62rem", fontWeight: 800, padding: "1px 6px",
          minWidth: 18, textAlign: "center",
        }}>{badge}</span>
      )}
    </button>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; color?: string; loading?: boolean }> = ({
  icon, label, value, sub, color = C.teal, loading,
}) => (
  <Card hover style={{ padding: "22px 24px" }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.85rem", fontWeight: 800, color: C.navy, lineHeight: 1.1 }}>
          {loading ? <span style={{ opacity: 0.3 }}>—</span> : value}
        </div>
        {sub && <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  </Card>
);

// Simple SVG bar chart (no library)
const BarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120, padding: "0 8px" }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 700 }}>
            {d.value > 1000 ? fmtMRR(d.value) : d.value}
          </div>
          <div
            style={{
              width: "100%", borderRadius: "6px 6px 0 0",
              height: `${Math.max((d.value / max) * 90, 4)}px`,
              background: `linear-gradient(180deg,${d.color} 0%,${d.color}99 100%)`,
              transition: "height 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
          <div style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 600, textAlign: "center" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};

// SVG Donut chart
const DonutChart: React.FC<{ segments: { label: string; value: number; color: string }[]; total: number }> = ({ segments, total }) => {
  const r = 52, cx = 64, cy = 64, stroke = 18;
  const circ = 2 * Math.PI * r;
  const activeSegments = segments.filter(s => s.value > 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        {activeSegments.map((s, i) => {
          const dash = (s.value / Math.max(total, 1)) * circ;
          const gap = circ - dash;
          const prevOffset = activeSegments.slice(0, i).reduce((acc, curr) => acc + (curr.value / Math.max(total, 1)) * circ, 0);
          return (
            <circle
              key={s.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-prevOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)", transform: "rotate(-90deg)", transformOrigin: "64px 64px" }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={C.navy} fontSize={18} fontWeight={800} fontFamily="'Playfair Display',Georgia,serif">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={C.muted} fontSize={9} fontWeight={600}>USERS</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 600, minWidth: 90 }}>{s.label}</span>
            <span style={{ fontSize: "0.78rem", color: C.navy, fontWeight: 800 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Log admin action ─────────────────────────────────────────────────────────
const logAdminAction = async (action: string, adminId: string | undefined, meta: Record<string, unknown>) => {
  if (!adminId) return;
  try {
    await supabase.from("admin_logs").insert({
      action,
      performed_by: adminId,
      metadata: meta,
    });
  } catch {
    // silently fail if table doesn't exist yet
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AdminPortal: React.FC<AdminPortalProps> = ({ onNavigate, currentAdminId }) => {
  const [tab, setTab] = useState<"overview" | "users" | "revenue" | "activity" | "logs" | "settings" | "tat_precedents" | "courses">("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats>({ efris: 0, vat: 0, paye: 0 });
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [casesToday, setCasesToday] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsTableMissing, setSettingsTableMissing] = useState(false);

  // Precedents management states
  const [editPrecedent, setEditPrecedent] = useState<Precedent | null>(null);
  const [isNewPrecedent, setIsNewPrecedent] = useState(false);
  const [precCaseNumber, setPrecCaseNumber] = useState("");
  const [precTitle, setPrecTitle] = useState("");
  const [precYear, setPrecYear] = useState(new Date().getFullYear());
  const [precTaxType, setPrecTaxType] = useState("VAT");
  const [precOutcome, setPrecOutcome] = useState("Allowed");
  const [precSummary, setPrecSummary] = useState("");
  const [precFullText, setPrecFullText] = useState("");
  const [precAiCommentary, setPrecAiCommentary] = useState("");
  const [precPdfPath, setPrecPdfPath] = useState<string | null>(null);
  const [deletePrecedent, setDeletePrecedent] = useState<Precedent | null>(null);

  // PDF upload states for precedents
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState("");
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  // Courses management states
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [isNewCourse, setIsNewCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseLevel, setCourseLevel] = useState("Beginner");
  const [courseEmoji, setCourseEmoji] = useState("📘");
  const [courseColor, setCourseColor] = useState("#E6F5F2");
  const [courseAccent, setCourseAccent] = useState("#1A7B6B");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  // Lessons sub-modal states
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonContent, setLessonContent] = useState("");

  // User management states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal states
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // ── Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [
        usersRes,
        casesRes,
        subsRes,
        logsRes,
        casesTodayRes,
        enrollRes,
        compRes,
        settingsRes,
        tatCasesRes,
        coursesRes,
      ] = await Promise.all([
        supabase.from("users").select("id,full_name,email,role,plan,created_at").order("created_at", { ascending: false }),
        supabase.from("cases").select("id,title,risk_level,created_at,user_id").order("created_at", { ascending: false }).limit(50),
        supabase.from("subscriptions").select("id,user_id,plan,status,starts_at,expires_at").order("starts_at", { ascending: false }).limit(100),
        supabase.from("admin_logs").select("id,action,performed_by,metadata,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("cases").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00.000Z`),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("compliance_reports").select("type"),
        supabase.from("site_settings").select("key,value"),
        supabase.from("tat_cases").select("*").order("created_at", { ascending: false }),
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
      ]);

      setUsers((usersRes.data || []) as AdminUser[]);
      setCases((casesRes.data || []) as AdminCase[]);
      setSubs((subsRes.data || []) as Subscription[]);
      setLogs((logsRes.data || []) as AdminLog[]);
      setPrecedents((tatCasesRes.data || []) as Precedent[]);
      setCourses((coursesRes.data || []) as Course[]);
      setCasesToday(casesTodayRes.count || 0);
      setEnrollmentCount(enrollRes.count || 0);

      // Compliance breakdown
      const comp = compRes.data || [];
      setComplianceStats({
        efris: comp.filter(c => c.type === "efris").length,
        vat: comp.filter(c => c.type === "vat").length,
        paye: comp.filter(c => c.type === "paye").length,
      });

      // Load site settings
      if (settingsRes.error) {
        console.error("Settings load error:", settingsRes.error);
        if (settingsRes.error.code === "PGRST116" || settingsRes.error.message?.includes("relation") || settingsRes.error.message?.includes("does not exist")) {
          setSettingsTableMissing(true);
        }
      } else {
        setSettingsTableMissing(false);
        if (settingsRes.data && settingsRes.data.length > 0) {
          const map: Partial<SiteSettings> = {};
          settingsRes.data.forEach(({ key, value }: { key: string; value: string }) => {
            (map as Record<string, string>)[key] = value;
          });
          setSiteSettings({ ...DEFAULT_SETTINGS, ...map });
        }
      }
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ── Derived stats
  const totalMrr = users.reduce((acc, u) => acc + (PLAN_MRR[u.plan?.toLowerCase()] || 0), 0);
  const trials = users.filter(u => !PLAN_MRR[u.plan?.toLowerCase()]).length;

  // ── Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role?.toLowerCase() === roleFilter.toLowerCase();
    const matchPlan = planFilter === "All" || u.plan?.toLowerCase() === planFilter.toLowerCase();
    return matchSearch && matchRole && matchPlan;
  });
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  // ── User actions
  const handleEditSave = async () => {
    if (!editUser) return;
    setActionLoading(true);
    setActionError("");
    try {
      const { error } = await supabase.from("users").update({ role: editRole, plan: editPlan }).eq("id", editUser.id);
      if (error) throw error;
      await logAdminAction("user_updated", currentAdminId, { user_id: editUser.id, new_role: editRole, new_plan: editPlan });
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, role: editRole, plan: editPlan } : u));
      setEditUser(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    setActionError("");
    try {
      const { error } = await supabase.from("users").delete().eq("id", deleteUser.id);
      if (error) throw error;
      await logAdminAction("user_deleted", currentAdminId, { user_id: deleteUser.id, email: deleteUser.email });
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Deletion failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Site settings save
  const handleSettingsSave = async () => {
    setSettingsLoading(true);
    setSettingsSaved(false);
    try {
      const rows = Object.entries(siteSettings).map(([key, value]) => ({ key, value }));
      // Upsert each setting
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await logAdminAction("site_settings_updated", currentAdminId, {});
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e: unknown) {
      console.error("Settings save error:", e);
    } finally {
      setSettingsLoading(false);
    }
  };

  // ── CSV Export
  const exportUsersCSV = () => {
    const header = "Name,Email,Role,Plan,Joined";
    const rows = users.map(u => `"${u.full_name}","${u.email}","${u.role}","${u.plan}","${fmtDate(u.created_at)}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `taxwise_users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── PDF Upload & AI Extraction for Precedents
  const handlePrecedentPdfUpload = async (file: File) => {
    if (!isSupportedDocument(file.name)) {
      setPdfUploadError("Unsupported file type. Please upload a PDF, Word doc, scanned document, or image.");
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setPdfUploadError("File exceeds the 20 MB size limit.");
      return;
    }
    setPdfUploading(true);
    setPdfUploadError("");
    setPdfFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/parse-precedent", { method: "POST", body: fd });
      let data: {
        error?: string;
        extracted?: {
          case_number?: string;
          title?: string;
          year?: number;
          tax_type?: string;
          outcome?: string;
          summary?: string;
          ai_commentary?: string;
          full_text?: string;
        };
        storage_path?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned status ${res.status} (${res.statusText || "Internal Server Error"}). Please verify your Supabase and Google Gemini environment variables on Railway.`);
      }
      if (!res.ok || data.error) throw new Error(data.error || "Upload failed");
      // Auto-populate form fields from AI extraction
      const ex = data.extracted;
      if (ex) {
        if (ex.case_number) setPrecCaseNumber(ex.case_number);
        if (ex.title) setPrecTitle(ex.title);
        if (ex.year) setPrecYear(Number(ex.year));
        if (ex.tax_type) setPrecTaxType(ex.tax_type);
        if (ex.outcome) setPrecOutcome(ex.outcome);
        if (ex.summary) setPrecSummary(ex.summary);
        if (ex.ai_commentary) setPrecAiCommentary(ex.ai_commentary);
        if (ex.full_text) setPrecFullText(ex.full_text);
      }
      if (data.storage_path) setPrecPdfPath(data.storage_path);
    } catch (err: unknown) {
      setPdfUploadError(err instanceof Error ? err.message : "Failed to process document.");
    } finally {
      setPdfUploading(false);
    }
  };

  // ── Precedent CRUD
  const handlePrecedentSave = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const payload = {
        case_number: precCaseNumber,
        title: precTitle,
        year: Number(precYear),
        tax_type: precTaxType,
        outcome: precOutcome,
        summary: precSummary,
        full_text: precFullText || null,
        ai_commentary: precAiCommentary || null,
      };

      if (isNewPrecedent) {
        const { data, error } = await supabase.from("tat_cases").insert([payload]).select();
        if (error) throw error;
        await logAdminAction("precedent_created", currentAdminId, { case_number: precCaseNumber });
        if (data) setPrecedents(prev => [data[0] as Precedent, ...prev]);
      } else if (editPrecedent) {
        const { data, error } = await supabase.from("tat_cases").update(payload).eq("id", editPrecedent.id).select();
        if (error) throw error;
        await logAdminAction("precedent_updated", currentAdminId, { precedent_id: editPrecedent.id, case_number: precCaseNumber });
        if (data) setPrecedents(prev => prev.map(p => p.id === editPrecedent.id ? (data[0] as Precedent) : p));
      }
      setEditPrecedent(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to save precedent.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrecedentDelete = async () => {
    if (!deletePrecedent) return;
    setActionLoading(true);
    setActionError("");
    try {
      const { error } = await supabase.from("tat_cases").delete().eq("id", deletePrecedent.id);
      if (error) throw error;
      await logAdminAction("precedent_deleted", currentAdminId, { precedent_id: deletePrecedent.id, case_number: deletePrecedent.case_number });
      setPrecedents(prev => prev.filter(p => p.id !== deletePrecedent.id));
      setDeletePrecedent(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to delete precedent.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Course CRUD
  const handleCourseSave = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const payload = {
        title: courseTitle,
        level: courseLevel,
        emoji: courseEmoji,
        color: courseColor,
        accent_color: courseAccent,
        description: courseDescription,
        lessons: courseLessons,
      };

      if (isNewCourse) {
        const { data, error } = await supabase.from("courses").insert([payload]).select();
        if (error) throw error;
        await logAdminAction("course_created", currentAdminId, { title: courseTitle });
        if (data) setCourses(prev => [data[0] as Course, ...prev]);
      } else if (editCourse) {
        const { data, error } = await supabase.from("courses").update(payload).eq("id", editCourse.id).select();
        if (error) throw error;
        await logAdminAction("course_updated", currentAdminId, { course_id: editCourse.id, title: courseTitle });
        if (data) setCourses(prev => prev.map(c => c.id === editCourse.id ? (data[0] as Course) : c));
      }
      setEditCourse(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to save course.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCourseDelete = async () => {
    if (!deleteCourse) return;
    setActionLoading(true);
    setActionError("");
    try {
      const { error } = await supabase.from("courses").delete().eq("id", deleteCourse.id);
      if (error) throw error;
      await logAdminAction("course_deleted", currentAdminId, { course_id: deleteCourse.id, title: deleteCourse.title });
      setCourses(prev => prev.filter(c => c.id !== deleteCourse.id));
      setDeleteCourse(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to delete course.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Lesson local CRUD inside Course Modal
  const handleLessonSave = () => {
    if (!lessonId || !lessonTitle) {
      alert("Lesson ID and Title are required.");
      return;
    }
    const newLessonObj = {
      id: lessonId,
      title: lessonTitle,
      duration: lessonDuration || "10 min",
      content: lessonContent,
    };

    if (isNewLesson) {
      if (courseLessons.some(l => l.id === lessonId)) {
        alert("A lesson with this ID already exists.");
        return;
      }
      setCourseLessons(prev => [...prev, newLessonObj]);
    } else if (editLesson) {
      setCourseLessons(prev => prev.map(l => l.id === editLesson.id ? newLessonObj : l));
    }
    setEditLesson(null);
  };

  const renderTatPrecedents = () => {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          {sectionTitle("⚖️", "TAT Case Precedents", "Manage Uganda's Tax Appeals Tribunal precedent library.")}
          <Button variant="primary" onClick={() => {
            setIsNewPrecedent(true);
            setPrecCaseNumber("");
            setPrecTitle("");
            setPrecYear(new Date().getFullYear());
            setPrecTaxType("VAT");
            setPrecOutcome("Allowed");
            setPrecSummary("");
            setPrecFullText("");
            setPrecAiCommentary("");
            setPrecPdfPath(null);
            setPdfFileName("");
            setPdfUploadError("");
            setActionError("");
            setEditPrecedent({} as Precedent);
          }}>
            ➕ Add Precedent
          </Button>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["Case Number", "Title", "Year", "Tax Type", "Outcome", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {precedents.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: C.muted }}>No precedents found.</td></tr>
                ) : precedents.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)" }}>
                    <td style={{ padding: "11px 20px", fontSize: "0.85rem", fontWeight: 700, color: C.navy }}>{p.case_number}</td>
                    <td style={{ padding: "11px 20px", fontSize: "0.82rem", color: C.text, fontWeight: 500 }}>{p.title}</td>
                    <td style={{ padding: "11px 20px", fontSize: "0.82rem", color: C.muted }}>{p.year}</td>
                    <td style={{ padding: "11px 20px" }}>
                      <Badge color={C.teal} bg={C.tealLight}>{p.tax_type}</Badge>
                    </td>
                    <td style={{ padding: "11px 20px" }}>
                      <Badge 
                        color={p.outcome === "Allowed" ? C.green : p.outcome === "Dismissed" ? C.red : C.gold} 
                        bg={p.outcome === "Allowed" ? C.greenLight : p.outcome === "Dismissed" ? "#FEE2E2" : "#FEF3CD"}
                      >
                        {p.outcome}
                      </Badge>
                    </td>
                    <td style={{ padding: "11px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title="Edit precedent" onClick={() => {
                          setIsNewPrecedent(false);
                          setEditPrecedent(p);
                          setPrecCaseNumber(p.case_number);
                          setPrecTitle(p.title);
                          setPrecYear(p.year);
                          setPrecTaxType(p.tax_type);
                          setPrecOutcome(p.outcome);
                          setPrecSummary(p.summary);
                          setPrecFullText(p.full_text || "");
                          setPrecAiCommentary(p.ai_commentary || "");
                          setActionError("");
                        }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEF3CD"; e.currentTarget.style.borderColor = C.gold; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          ✏️
                        </button>
                        <button title="Delete precedent" onClick={() => { setDeletePrecedent(p); setActionError(""); }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.borderColor = C.red; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderCourses = () => {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          {sectionTitle("🎓", "Learning Hub Courses", "Create and manage educational modules and lessons.")}
          <Button variant="primary" onClick={() => {
            setIsNewCourse(true);
            setCourseTitle("");
            setCourseLevel("Beginner");
            setCourseEmoji("📘");
            setCourseColor("#E6F5F2");
            setCourseAccent("#1A7B6B");
            setCourseDescription("");
            setCourseLessons([]);
            setActionError("");
            setEditCourse({} as Course);
          }}>
            ➕ Add Course
          </Button>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["Emoji / Accent", "Course Title", "Level", "Lessons", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: C.muted }}>No courses found.</td></tr>
                ) : courses.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)" }}>
                    <td style={{ padding: "11px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.4rem" }}>{c.emoji}</span>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: c.accent_color, border: `2px solid ${C.border}` }} />
                      </div>
                    </td>
                    <td style={{ padding: "11px 20px", fontSize: "0.85rem", fontWeight: 700, color: C.navy }}>{c.title}</td>
                    <td style={{ padding: "11px 20px" }}>
                      <Badge color={C.navy} bg="#E8EDF5">{c.level}</Badge>
                    </td>
                    <td style={{ padding: "11px 20px", fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>
                      {c.lessons ? c.lessons.length : 0} lessons
                    </td>
                    <td style={{ padding: "11px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title="Edit course" onClick={() => {
                          setIsNewCourse(false);
                          setEditCourse(c);
                          setCourseTitle(c.title);
                          setCourseLevel(c.level);
                          setCourseEmoji(c.emoji || "📘");
                          setCourseColor(c.color || "#E6F5F2");
                          setCourseAccent(c.accent_color || "#1A7B6B");
                          setCourseDescription(c.description || "");
                          setCourseLessons(c.lessons || []);
                          setActionError("");
                        }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEF3CD"; e.currentTarget.style.borderColor = C.gold; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          ✏️
                        </button>
                        <button title="Delete course" onClick={() => { setDeleteCourse(c); setActionError(""); }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.borderColor = C.red; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // ── Plan distribution data
  const planDist = [
    { label: "Firm", value: users.filter(u => u.plan?.toLowerCase() === "firm").length, color: C.navy },
    { label: "Professional", value: users.filter(u => u.plan?.toLowerCase() === "professional").length, color: C.teal },
    { label: "Starter", value: users.filter(u => u.plan?.toLowerCase() === "starter").length, color: "#7C3AED" },
    { label: "Free / Trial", value: trials, color: C.muted },
  ];

  const riskDist = [
    { label: "High", value: cases.filter(c => c.risk_level === "high").length, color: C.red },
    { label: "Medium", value: cases.filter(c => c.risk_level === "medium").length, color: C.gold },
    { label: "Low", value: cases.filter(c => c.risk_level === "low").length, color: C.teal },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const sectionTitle = (icon: string, title: string, sub?: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.2rem" }}>{icon}</span>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.35rem", color: C.navy, fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ color: C.muted, fontSize: "0.84rem", marginTop: 4, marginLeft: 30, fontWeight: 500 }}>{sub}</p>}
    </div>
  );

  // ── Tab: Overview
  const renderOverview = () => (
    <div>
      {sectionTitle("📊", "Platform Overview", "Live metrics across the entire TaxWise platform.")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 18, marginBottom: 32 }}>
        <StatCard icon="👥" label="Total Users" value={users.length} sub={`+${users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 86400000)).length} this week`} color={C.teal} loading={loading} />
        <StatCard icon="💰" label="Revenue (MRR)" value={fmtMRR(totalMrr)} sub="Based on active plan users" color={C.gold} loading={loading} />
        <StatCard icon="⚖️" label="Cases Today" value={casesToday} sub="New analyses submitted" color={C.red} loading={loading} />
        <StatCard icon="🎯" label="Active Trials" value={trials} sub="Free plan users" color={C.muted} loading={loading} />
        <StatCard icon="📋" label="Compliance Reports" value={complianceStats.efris + complianceStats.vat + complianceStats.paye} sub="eFRIS + VAT + PAYE" color="#7C3AED" loading={loading} />
        <StatCard icon="🎓" label="Enrollments" value={enrollmentCount} sub="Course enrollments total" color="#059669" loading={loading} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 20 }}>📈 Revenue by Plan (MRR)</div>
          <BarChart data={[
            { label: "Starter", value: users.filter(u => u.plan?.toLowerCase() === "starter").length * PLAN_MRR.starter, color: "#7C3AED" },
            { label: "Professional", value: users.filter(u => u.plan?.toLowerCase() === "professional").length * PLAN_MRR.professional, color: C.teal },
            { label: "Firm", value: users.filter(u => u.plan?.toLowerCase() === "firm").length * PLAN_MRR.firm, color: C.navy },
          ]} />
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 16 }}>🥧 User Plan Distribution</div>
          <DonutChart segments={planDist} total={users.length} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 16 }}>📊 Case Risk Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {riskDist.map(r => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 4 }}>
                  <span>{r.label} Risk</span><span>{r.value}</span>
                </div>
                <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${cases.length ? (r.value / cases.length) * 100 : 0}%`, background: r.color, borderRadius: 4, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 16 }}>📋 Compliance Reports</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["eFRIS", complianceStats.efris, C.teal], ["VAT", complianceStats.vat, C.gold], ["PAYE", complianceStats.paye, "#7C3AED"]].map(([l, v, col]) => (
              <div key={String(l)}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 4 }}>
                  <span>{l}</span><span>{v}</span>
                </div>
                <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(complianceStats.efris + complianceStats.vat + complianceStats.paye) ? (Number(v) / (complianceStats.efris + complianceStats.vat + complianceStats.paye)) * 100 : 0}%`, background: String(col), borderRadius: 4, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 16 }}>🧮 Platform Health</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Total Cases", value: cases.length, icon: "⚖️" },
              { label: "Active Subs", value: subs.filter(s => s.status === "active").length, icon: "✅" },
              { label: "Enrollments", value: enrollmentCount, icon: "🎓" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.offwhite, borderRadius: 8 }}>
                <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 600 }}>{item.icon} {item.label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: C.navy }}>{loading ? "—" : item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // ── Tab: User Management
  const renderUsers = () => (
    <div>
      {sectionTitle("👥", "User Management", "Search, filter, and manage all registered users.")}

      {/* Filters row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: "0.85rem" }}>🔍</span>
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="input-focus-ring"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 14px 10px 36px", fontSize: "0.855rem", fontFamily: "inherit", outline: "none", background: C.white, color: C.text, boxSizing: "border-box" }}
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.855rem", fontFamily: "inherit", color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
          {["All", "Consultant", "Accountant", "Student", "Business", "Admin"].map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.855rem", fontFamily: "inherit", color: C.text, background: C.white, cursor: "pointer", outline: "none" }}>
          {["All", "free", "starter", "professional", "firm"].map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="outline" small onClick={exportUsersCSV}>⬇ Export CSV</Button>
          <Button variant="ghost" small onClick={fetchData}>↺ Refresh</Button>
        </div>
      </div>

      <div style={{ fontSize: "0.8rem", color: C.muted, fontWeight: 600, marginBottom: 12 }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", color: C.teal, marginBottom: 12 }}>⟳</div>
            <div style={{ fontWeight: 600 }}>Loading user directory…</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["User", "Email", "Role", "Plan", "Joined", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: C.muted, fontWeight: 600 }}>No users match your filters.</td></tr>
                ) : pagedUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)", transition: "background 0.15s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(26,123,107,0.03)"}
                    onMouseOut={e => e.currentTarget.style.background = i % 2 ? C.white : "rgba(15,32,68,0.01)"}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                          {(u.full_name || "?").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: C.navy }}>{u.full_name || "Anonymous"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: "0.82rem", color: C.muted }}>{u.email}</td>
                    <td style={{ padding: "12px 20px", fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{u.role}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <Badge color={PLAN_COLORS[u.plan?.toLowerCase()]?.[0] || C.muted} bg={PLAN_COLORS[u.plan?.toLowerCase()]?.[1] || C.offwhite}>
                        {u.plan?.toUpperCase() || "FREE"}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: "0.8rem", color: C.muted }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title="View" onClick={() => setViewUser(u)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = C.tealLight; e.currentTarget.style.borderColor = C.teal; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          👁
                        </button>
                        <button title="Edit role & plan" onClick={() => { setEditUser(u); setEditRole(u.role); setEditPlan(u.plan); setActionError(""); }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEF3CD"; e.currentTarget.style.borderColor = C.gold; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          ✏️
                        </button>
                        <button title="Delete user" onClick={() => { setDeleteUser(u); setActionError(""); }}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.borderColor = C.red; }}
                          onMouseOut={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid rgba(15,32,68,0.05)` }}>
            <span style={{ fontSize: "0.8rem", color: C.muted, fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, background: C.white, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" }}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 32, height: 32, border: `1.5px solid ${p === page ? C.teal : C.border}`, borderRadius: 7, background: p === page ? C.teal : C.white, color: p === page ? C.white : C.navy, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, fontFamily: "inherit" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, background: C.white, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit User — ${editUser?.full_name}`} width={440}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Professional Role</label>
          <select value={editRole} onChange={e => setEditRole(e.target.value)}
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text, outline: "none" }}>
            {["Consultant", "Accountant", "Student", "Business", "Admin"].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Subscription Plan</label>
          <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text, outline: "none" }}>
            {["free", "starter", "professional", "firm"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="primary" small onClick={handleEditSave} disabled={actionLoading}>{actionLoading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Confirm User Deletion" width={420}>
        <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.6, marginBottom: 8 }}>
          You are about to permanently delete <strong>{deleteUser?.full_name}</strong> ({deleteUser?.email}).
        </p>
        <p style={{ fontSize: "0.82rem", color: C.red, fontWeight: 600, marginBottom: 24 }}>
          ⚠️ This action is irreversible. All user data, cases, and reports will be lost.
        </p>
        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setDeleteUser(null)}>Cancel</Button>
          <Button variant="danger" small onClick={handleDelete} disabled={actionLoading}>{actionLoading ? "Deleting…" : "Delete Permanently"}</Button>
        </div>
      </Modal>

      {/* View User Modal */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Profile" width={440}>
        {viewUser && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "1.1rem", fontWeight: 700 }}>
                {(viewUser.full_name || "?").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: C.navy, fontSize: "1.05rem" }}>{viewUser.full_name}</div>
                <div style={{ fontSize: "0.82rem", color: C.muted }}>{viewUser.email}</div>
              </div>
            </div>
            {[
              ["Role", viewUser.role],
              ["Plan", viewUser.plan?.toUpperCase()],
              ["User ID", viewUser.id],
              ["Joined", fmtDate(viewUser.created_at)],
              ["Cases (this session)", cases.filter(c => c.user_id === viewUser.id).length],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(15,32,68,0.05)` }}>
                <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: "0.82rem", color: C.navy, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );

  // ── Tab: Revenue
  const renderRevenue = () => (
    <div>
      {sectionTitle("💰", "Revenue & Subscriptions", "Monthly recurring revenue breakdown and subscription history.")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18, marginBottom: 28 }}>
        <StatCard icon="💰" label="Total MRR" value={fmtMRR(totalMrr)} sub="All paying subscribers" color={C.gold} loading={loading} />
        <StatCard icon="🏢" label="Firm Plan" value={`UGX ${(users.filter(u => u.plan?.toLowerCase() === "firm").length * 400).toLocaleString()}K`} sub={`${users.filter(u => u.plan?.toLowerCase() === "firm").length} users`} color={C.navy} loading={loading} />
        <StatCard icon="⭐" label="Professional Plan" value={`UGX ${(users.filter(u => u.plan?.toLowerCase() === "professional").length * 150).toLocaleString()}K`} sub={`${users.filter(u => u.plan?.toLowerCase() === "professional").length} users`} color={C.teal} loading={loading} />
        <StatCard icon="🔷" label="Starter Plan" value={`UGX ${(users.filter(u => u.plan?.toLowerCase() === "starter").length * 50).toLocaleString()}K`} sub={`${users.filter(u => u.plan?.toLowerCase() === "starter").length} users`} color="#7C3AED" loading={loading} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(15,32,68,0.05)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem" }}>📃 Subscription History</span>
          <span style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 600 }}>{subs.length} records</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
            <thead>
              <tr style={{ background: C.offwhite }}>
                {["User ID", "Plan", "Status", "Started", "Expires"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: C.muted, fontWeight: 600 }}>No subscription records found.</td></tr>
              ) : subs.slice(0, 30).map((s, i) => {
                const u = users.find(u => u.id === s.user_id);
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)" }}>
                    <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.navy, fontWeight: 700 }}>{u?.full_name || s.user_id.slice(0, 8) + "…"}</td>
                    <td style={{ padding: "11px 20px" }}>
                      <Badge color={PLAN_COLORS[s.plan?.toLowerCase()]?.[0] || C.muted} bg={PLAN_COLORS[s.plan?.toLowerCase()]?.[1] || C.offwhite}>{s.plan?.toUpperCase()}</Badge>
                    </td>
                    <td style={{ padding: "11px 20px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.status === "active" ? C.greenLight : "#FEE2E2", color: s.status === "active" ? C.green : C.red }}>
                        {s.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{fmtDate(s.starts_at)}</td>
                    <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{fmtDate(s.expires_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ── Tab: Activity
  const renderActivity = () => (
    <div>
      {sectionTitle("📈", "Platform Activity", "Case analyses, compliance reports, and learning activity across the platform.")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18, marginBottom: 28 }}>
        <StatCard icon="⚖️" label="Total Cases" value={cases.length} sub={`${casesToday} analyzed today`} color={C.teal} loading={loading} />
        <StatCard icon="📋" label="eFRIS Reports" value={complianceStats.efris} sub="eFRIS compliance checks" color={C.gold} loading={loading} />
        <StatCard icon="🧾" label="VAT Reports" value={complianceStats.vat} sub="VAT compliance checks" color={C.navy} loading={loading} />
        <StatCard icon="👔" label="PAYE Reports" value={complianceStats.paye} sub="PAYE compliance checks" color="#7C3AED" loading={loading} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(15,32,68,0.05)`, fontWeight: 800, color: C.navy, fontSize: "0.9rem" }}>
          ⚖️ Recent Case Analyses (last 50)
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", color: C.teal, marginBottom: 12 }}>⟳</div>
            Loading…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["Case Title", "Submitted By", "Risk Level", "Date"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: C.muted, fontWeight: 600 }}>No cases analyzed yet.</td></tr>
                ) : cases.map((c, i) => {
                  const u = users.find(u => u.id === c.user_id);
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)" }}>
                      <td style={{ padding: "11px 20px", fontSize: "0.875rem", fontWeight: 700, color: C.navy, maxWidth: 280 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      </td>
                      <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{u?.full_name || "Unknown"}</td>
                      <td style={{ padding: "11px 20px" }}>
                        {c.risk_level && (
                          <Badge color={RISK_COLORS[c.risk_level]?.[0] || C.muted} bg={RISK_COLORS[c.risk_level]?.[1] || C.offwhite}>
                            {c.risk_level?.toUpperCase()}
                          </Badge>
                        )}
                      </td>
                      <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{fmtDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  // ── Tab: Logs
  const renderLogs = () => (
    <div>
      {sectionTitle("📜", "Admin Action Logs", "Audit trail of all admin actions performed on the platform.")}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: C.offwhite }}>
                {["Action", "Performed By", "Details", "Timestamp"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", fontSize: "0.72rem", fontWeight: 800, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1.5px solid rgba(15,32,68,0.04)` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div style={{ textAlign: "center", padding: "48px 20px" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📜</div>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>No logs yet</div>
                      <div style={{ fontSize: "0.82rem", color: C.muted }}>Admin actions will appear here automatically.</div>
                    </div>
                  </td>
                </tr>
              ) : logs.map((l, i) => {
                const admin = users.find(u => u.id === l.performed_by);
                return (
                  <tr key={l.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.03)`, background: i % 2 ? C.white : "rgba(15,32,68,0.01)" }}>
                    <td style={{ padding: "11px 20px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy, background: C.offwhite, padding: "4px 10px", borderRadius: 6 }}>{l.action}</span>
                    </td>
                    <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{admin?.full_name || l.performed_by?.slice(0, 8) + "…"}</td>
                    <td style={{ padding: "11px 20px", fontSize: "0.78rem", color: C.muted, maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {Object.entries(l.metadata || {}).map(([k, v]) => `${k}: ${v}`).join(" | ") || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "11px 20px", fontSize: "0.8rem", color: C.muted }}>{fmtDate(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ── Tab: Site Settings
  const renderSettings = () => {
    const Field = ({ label, value, onChange, multi = false }: { label: string; id: keyof SiteSettings; value: string; onChange: (v: string) => void; multi?: boolean }) => (
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>{label}</label>
        {multi ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className="input-focus-ring"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text, outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="input-focus-ring"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text, outline: "none", boxSizing: "border-box" }}
          />
        )}
      </div>
    );

    const updateSetting = (key: keyof SiteSettings) => (v: string) => setSiteSettings(prev => ({ ...prev, [key]: v }));

    return (
      <div>
        {sectionTitle("⚙️", "Landing Page Settings", "Control all numbers, text, and stats displayed on the public landing page.")}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Hero Stats */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 6 }}>📊 Hero Statistics Bar</div>
            <p style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 20, fontWeight: 500 }}>The 4 numbers displayed in the dark stats section below the hero.</p>
            <Field label='Stat 1 — "Cases Analyzed"' id="stat_cases" value={siteSettings.stat_cases} onChange={updateSetting("stat_cases")} />
            <Field label='Stat 2 — "Time Saved vs Manual"' id="stat_time_saved" value={siteSettings.stat_time_saved} onChange={updateSetting("stat_time_saved")} />
            <Field label='Stat 3 — "Active Practitioners"' id="stat_practitioners" value={siteSettings.stat_practitioners} onChange={updateSetting("stat_practitioners")} />
            <Field label='Stat 4 — "Live Tax Calculators"' id="stat_calculators" value={siteSettings.stat_calculators} onChange={updateSetting("stat_calculators")} />
          </Card>

          {/* Hero Text */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 6 }}>� Calculator Rates</div>
            <p style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 20, fontWeight: 500 }}>Update the country tax rates used by the PAYE, VAT, WHT, import duty, and corporate tax calculators.</p>
            <Field label="PAYE rate (%)" id="calc_paye_rate" value={siteSettings.calc_paye_rate} onChange={updateSetting("calc_paye_rate")} />
            <Field label="VAT rate (%)" id="calc_vat_rate" value={siteSettings.calc_vat_rate} onChange={updateSetting("calc_vat_rate")} />
            <Field label="Withholding tax rate (%)" id="calc_wht_rate" value={siteSettings.calc_wht_rate} onChange={updateSetting("calc_wht_rate")} />
            <Field label="Import duty + VAT rate (%)" id="calc_import_rate" value={siteSettings.calc_import_rate} onChange={updateSetting("calc_import_rate")} />
            <Field label="Corporate tax rate (%)" id="calc_corporate_rate" value={siteSettings.calc_corporate_rate} onChange={updateSetting("calc_corporate_rate")} />
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 6 }}>🦸 Hero Section Text</div>
            <p style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 20, fontWeight: 500 }}>The green banner at the very top of the landing page.</p>
            <Field label="Announcement text" id="topbar_text" value={siteSettings.topbar_text} onChange={updateSetting("topbar_text")} />
            <Field label="Contact email" id="topbar_email" value={siteSettings.topbar_email} onChange={updateSetting("topbar_email")} />
          </Card>

          {/* Preview */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.9rem", marginBottom: 16 }}>👁 Stats Preview</div>
            <div style={{ background: "#0C1B36", borderRadius: 12, padding: "24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                [siteSettings.stat_cases, "Cases Analyzed"],
                [siteSettings.stat_time_saved, "Time Saved vs Manual"],
                [siteSettings.stat_practitioners, "Active Practitioners"],
                [siteSettings.stat_calculators, "Live Tax Calculators"],
              ].map(([num, desc]) => (
                <div key={desc} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.6rem", color: "white", fontWeight: 700 }}>{num}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 4, fontWeight: 500 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <Button variant="ghost" onClick={() => setSiteSettings(DEFAULT_SETTINGS)}>Reset to Defaults</Button>
          <Button variant="primary" onClick={handleSettingsSave} disabled={settingsLoading}>
            {settingsLoading ? "Saving…" : settingsSaved ? "✓ Saved!" : "Save Landing Page Settings"}
          </Button>
        </div>

        {settingsSaved && (
          <div style={{ marginTop: 14, background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: C.green, fontWeight: 700 }}>
            ✓ Settings saved successfully! The landing page will now reflect these values.
          </div>
        )}

        {settingsTableMissing && (
          <div style={{ marginTop: 20, background: "#FEF3CD", border: `1px solid ${C.gold}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: "0.82rem", color: "#92620A", fontWeight: 700, marginBottom: 4 }}>⚠️ Database Setup Required</div>
            <p style={{ fontSize: "0.8rem", color: "#A3730F", lineHeight: 1.6 }}>
              Settings are stored in a <code style={{ background: "rgba(0,0,0,0.07)", padding: "1px 5px", borderRadius: 4 }}>site_settings</code> table with columns <code style={{ background: "rgba(0,0,0,0.07)", padding: "1px 5px", borderRadius: 4 }}>key (text, primary key)</code> and <code style={{ background: "rgba(0,0,0,0.07)", padding: "1px 5px", borderRadius: 4 }}>value (text)</code>.
              Run this in your Supabase SQL editor: <br />
              <code style={{ background: "rgba(0,0,0,0.07)", padding: "3px 7px", borderRadius: 4, display: "inline-block", marginTop: 6 }}>
                CREATE TABLE public.site_settings (key text PRIMARY KEY, value text); ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY; CREATE POLICY &quot;Admins only&quot; ON public.site_settings USING (true);
              </code>
            </p>
          </div>
        )}
      </div>
    );
  };

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        {onNavigate && (
          <button
            onClick={() => onNavigate("dashboard")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1.5px solid rgba(15,32,68,0.1)`, borderRadius: 10, color: C.muted, fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit", padding: "7px 14px", cursor: "pointer", marginBottom: 20, transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = C.offwhite; e.currentTarget.style.color = C.navy; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
          >
            ← Back to Dashboard
          </button>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.85rem", color: C.navy, marginBottom: 4, fontWeight: 800 }}>
              Admin Control Panel
            </h1>
            <p style={{ color: C.muted, fontSize: "0.9rem", fontWeight: 500 }}>
              Full platform management — users, revenue, activity, and site configuration.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: C.greenLight, color: C.green, fontSize: "0.75rem", fontWeight: 700, padding: "5px 12px", borderRadius: 50, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }} />
              Live Data
            </div>
            <button onClick={fetchData} title="Refresh data" style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.borderColor = C.teal}
              onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="hide-scrollbar" style={{ display: "flex", gap: 4, marginBottom: 28, background: C.white, padding: "6px", borderRadius: 14, border: `1px solid rgba(15,32,68,0.06)`, boxShadow: "0 2px 8px rgba(15,32,68,0.03)", flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <TabButton label="Overview" icon="📊" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton label="Users" icon="👥" active={tab === "users"} onClick={() => setTab("users")} badge={users.length} />
        <TabButton label="Revenue" icon="💰" active={tab === "revenue"} onClick={() => setTab("revenue")} />
        <TabButton label="Activity" icon="📈" active={tab === "activity"} onClick={() => setTab("activity")} />
        <TabButton label="Logs" icon="📜" active={tab === "logs"} onClick={() => setTab("logs")} badge={logs.length} />
        <TabButton label="TAT Precedents" icon="⚖️" active={tab === "tat_precedents"} onClick={() => setTab("tat_precedents")} badge={precedents.length} />
        <TabButton label="Learning Courses" icon="🎓" active={tab === "courses"} onClick={() => setTab("courses")} badge={courses.length} />
        <TabButton label="Site Settings" icon="⚙️" active={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      {/* Tab Content */}
      <div className="page-fade-in" key={tab}>
        {tab === "overview" && renderOverview()}
        {tab === "users" && renderUsers()}
        {tab === "revenue" && renderRevenue()}
        {tab === "activity" && renderActivity()}
        {tab === "logs" && renderLogs()}
        {tab === "tat_precedents" && renderTatPrecedents()}
        {tab === "courses" && renderCourses()}
        {tab === "settings" && renderSettings()}
      </div>

      {/* Add / Edit Precedent Modal */}
      <Modal open={!!editPrecedent} onClose={() => { setEditPrecedent(null); setPdfFileName(""); setPdfUploadError(""); }} title={isNewPrecedent ? "Add New TAT Precedent" : `Edit Precedent — ${editPrecedent?.case_number}`} width={600}>

        {/* ── PDF Upload Zone ── */}
        <div
          onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setPdfDragActive(true); }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setPdfDragActive(true); }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setPdfDragActive(false); }}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation(); setPdfDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handlePrecedentPdfUpload(dropped);
          }}
          onClick={() => !pdfUploading && pdfInputRef.current?.click()}
          style={{
            border: `2px dashed ${pdfDragActive ? C.teal : pdfUploadError ? C.red : C.border}`,
            borderRadius: 12,
            padding: "20px 16px",
            marginBottom: 18,
            background: pdfDragActive ? C.tealLight : pdfUploading ? "rgba(26,123,107,0.04)" : C.offwhite,
            cursor: pdfUploading ? "default" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            textAlign: "center",
          }}
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept={SUPPORTED_DOCUMENT_ACCEPT}
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePrecedentPdfUpload(f); }}
          />
          {pdfUploading ? (
            <>
              <svg width="28" height="28" viewBox="0 0 44 44" style={{ animation: "spin 0.9s linear infinite", transformOrigin: "center" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke={C.teal} strokeWidth="3" strokeDasharray="80" strokeDashoffset="20" strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: C.teal }}>Parsing document with AI…</div>
              <div style={{ fontSize: "0.74rem", color: C.muted }}>Extracting case details — OCR may take a few extra seconds for scanned files</div>
            </>
          ) : pdfFileName ? (
            <>
              <div style={{ fontSize: "1.6rem" }}>✅</div>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: C.teal }}>Document processed: {pdfFileName}</div>
              <div style={{ fontSize: "0.74rem", color: C.muted }}>Fields auto-filled below — review and edit if needed. Click to replace.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "1.8rem" }}>📄</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.navy }}>Upload TAT Ruling Document</div>
              <div style={{ fontSize: "0.76rem", color: C.muted, lineHeight: 1.5 }}>
                Drag &amp; drop or click to select a document — AI will auto-fill all fields below
              </div>
              <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 2 }}>Max 20 MB · PDF, Word, scanned docs &amp; images</div>
            </>
          )}
        </div>

        {pdfUploadError && (
          <div style={{ background: "#FEF3CD", border: `1px solid ${C.gold}`, borderRadius: 8, padding: "9px 14px", fontSize: "0.82rem", color: "#92620A", fontWeight: 600, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
            ⚠️ {pdfUploadError}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
            {pdfFileName ? "Review & Edit Extracted Fields" : "Or fill in manually"}
          </span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Case Number</label>
            <input type="text" value={precCaseNumber} onChange={e => setPrecCaseNumber(e.target.value)} placeholder="e.g. TAT No. 120 of 2025"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Year</label>
            <input type="number" value={precYear} onChange={e => setPrecYear(Number(e.target.value))} placeholder="e.g. 2025"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Case Title</label>
          <input type="text" value={precTitle} onChange={e => setPrecTitle(e.target.value)} placeholder="e.g. John Doe v Uganda Revenue Authority"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Tax Type</label>
            <select value={precTaxType} onChange={e => setPrecTaxType(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", background: C.white, color: C.text, outline: "none" }}>
              {["VAT", "Income Tax", "WHT", "Excise Duty", "Customs", "Jurisdiction", "Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Outcome</label>
            <select value={precOutcome} onChange={e => setPrecOutcome(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", background: C.white, color: C.text, outline: "none" }}>
              {["Allowed", "Dismissed", "Partial"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Precedent Summary</label>
          <textarea rows={3} value={precSummary} onChange={e => setPrecSummary(e.target.value)} placeholder="Summary of the case facts and Tribunal decision..."
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>AI Commentary</label>
          <textarea rows={3} value={precAiCommentary} onChange={e => setPrecAiCommentary(e.target.value)} placeholder="AI analysis commentary, key takeaways for practitioners..."
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Full Case Text (Optional)</label>
          <textarea rows={4} value={precFullText} onChange={e => setPrecFullText(e.target.value)} placeholder="Paste full ruling text if available..."
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        {/* PDF indicator */}
        {precPdfPath && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.tealLight, border: `1px solid ${C.teal}`, borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: "0.8rem", color: C.teal, fontWeight: 600 }}>
            📎 Document attached: <span style={{ fontWeight: 400, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{precPdfPath.split("/").pop()}</span>
          </div>
        )}

        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => { setEditPrecedent(null); setPdfFileName(""); setPdfUploadError(""); }}>Cancel</Button>
          <Button variant="primary" small onClick={handlePrecedentSave} disabled={actionLoading || pdfUploading}>{actionLoading ? "Saving…" : "Save Precedent"}</Button>
        </div>
      </Modal>

      {/* Delete Precedent Confirmation */}
      <Modal open={!!deletePrecedent} onClose={() => setDeletePrecedent(null)} title="Delete TAT Precedent" width={420}>
        <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to permanently delete TAT Precedent <strong>{deletePrecedent?.case_number}</strong>?
        </p>
        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setDeletePrecedent(null)}>Cancel</Button>
          <Button variant="danger" small onClick={handlePrecedentDelete} disabled={actionLoading}>{actionLoading ? "Deleting…" : "Delete Permanently"}</Button>
        </div>
      </Modal>

      {/* Add / Edit Course Modal */}
      <Modal open={!!editCourse} onClose={() => setEditCourse(null)} title={isNewCourse ? "Create Educational Course" : `Edit Course — ${editCourse?.title}`} width={600}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Course Title</label>
            <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="e.g. Uganda Tax Fundamentals"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Level</label>
            <select value={courseLevel} onChange={e => setCourseLevel(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", background: C.white, color: C.text, outline: "none" }}>
              {["Beginner", "Intermediate", "Professional"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Emoji</label>
            <input type="text" value={courseEmoji} onChange={e => setCourseEmoji(e.target.value)} placeholder="e.g. 📘"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Bg Color (hex)</label>
            <input type="text" value={courseColor} onChange={e => setCourseColor(e.target.value)} placeholder="e.g. #E6F5F2"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Accent Color (hex)</label>
            <input type="text" value={courseAccent} onChange={e => setCourseAccent(e.target.value)} placeholder="e.g. #1A7B6B"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Description</label>
          <textarea rows={2} value={courseDescription} onChange={e => setCourseDescription(e.target.value)} placeholder="Short course description..."
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        {/* Lessons Sub-section */}
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 16, background: C.offwhite, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.84rem", fontWeight: 800, color: C.navy }}>📚 Course Lessons ({courseLessons.length})</span>
            <Button variant="outline" small onClick={() => {
              setIsNewLesson(true);
              setLessonId("");
              setLessonTitle("");
              setLessonDuration("15 min");
              setLessonContent("");
              setEditLesson({} as Lesson);
            }}>
              ➕ Add Lesson
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
            {courseLessons.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: C.muted, fontStyle: "italic", textAlign: "center", padding: 10 }}>No lessons added yet.</div>
            ) : courseLessons.map((l) => (
              <div key={l.id} style={{ background: C.white, borderRadius: 8, padding: "8px 12px", border: `1px solid rgba(15,32,68,0.04)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: C.teal, marginRight: 6 }}>[{l.id}]</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy }}>{l.title}</span>
                  <span style={{ fontSize: "0.72rem", color: C.muted, marginLeft: 8 }}>({l.duration})</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button title="Edit lesson" onClick={() => {
                    setIsNewLesson(false);
                    setEditLesson(l);
                    setLessonId(l.id);
                    setLessonTitle(l.title);
                    setLessonDuration(l.duration);
                    setLessonContent(l.content);
                  }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem" }}>✏️</button>
                  <button title="Delete lesson" onClick={() => setCourseLessons(prev => prev.filter(x => x.id !== l.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setEditCourse(null)}>Cancel</Button>
          <Button variant="primary" small onClick={handleCourseSave} disabled={actionLoading}>{actionLoading ? "Saving…" : "Save Course"}</Button>
        </div>
      </Modal>

      {/* Delete Course Confirmation */}
      <Modal open={!!deleteCourse} onClose={() => setDeleteCourse(null)} title="Delete Course" width={420}>
        <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to permanently delete course <strong>{deleteCourse?.title}</strong>?
        </p>
        {actionError && <div style={{ background: "#FEE2E2", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", color: C.red, marginBottom: 16, fontWeight: 600 }}>{actionError}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setDeleteCourse(null)}>Cancel</Button>
          <Button variant="danger" small onClick={handleCourseDelete} disabled={actionLoading}>{actionLoading ? "Deleting…" : "Delete Permanently"}</Button>
        </div>
      </Modal>

      {/* Add / Edit Lesson Sub-Modal */}
      <Modal open={!!editLesson} onClose={() => setEditLesson(null)} title={isNewLesson ? "Add Lesson to Course" : "Edit Lesson"} width={460}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Lesson ID (unique code)</label>
            <input type="text" value={lessonId} onChange={e => setLessonId(e.target.value)} disabled={!isNewLesson} placeholder="e.g. 1a, 2c"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Duration</label>
            <input type="text" value={lessonDuration} onChange={e => setLessonDuration(e.target.value)} placeholder="e.g. 15 min"
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Lesson Title</label>
          <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="e.g. Getting Started with eFRIS"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>Lesson Content (Markdown supported)</label>
          <textarea rows={6} value={lessonContent} onChange={e => setLessonContent(e.target.value)} placeholder="Write the educational content of this lesson..."
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" small onClick={() => setEditLesson(null)}>Cancel</Button>
          <Button variant="primary" small onClick={handleLessonSave}>Save Lesson</Button>
        </div>
      </Modal>
    </div>
  );
};
