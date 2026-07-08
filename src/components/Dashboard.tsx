import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Card } from "./UI";
import { Scale, FileText, GraduationCap, ShieldCheck, Calculator, Brain, BookOpen, Search, FolderOpen, Sparkles } from "lucide-react";

const getIconComponent = (iconName: string, size = 18, color?: string) => {
  switch (iconName) {
    case "scale": return <Scale size={size} style={{ color }} />;
    case "file-text": return <FileText size={size} style={{ color }} />;
    case "graduation-cap": return <GraduationCap size={size} style={{ color }} />;
    case "shield-check": return <ShieldCheck size={size} style={{ color }} />;
    default: return null;
  }
};

interface DashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    plan: string;
  };
  onNavigate: (page: string) => void;
}

interface ActivityItem {
  title: string;
  time: string;
  type: string;
}

const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) {
    return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Sparkline Component for premium SaaS visual feedback
const Sparkline = ({ type, color }: { type: string; color: string }) => {
  if (type === "line") {
    return (
      <svg width="70" height="28" viewBox="0 0 70 28" style={{ opacity: 0.85, overflow: "visible" }}>
        <path d="M0 24 Q 17 6, 35 18 T 70 4" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "bar") {
    return (
      <svg width="60" height="28" viewBox="0 0 60 28" style={{ opacity: 0.85 }}>
        <rect x="0" y="14" width="6" height="14" rx="2" fill={color} />
        <rect x="10" y="8" width="6" height="20" rx="2" fill={color} />
        <rect x="20" y="18" width="6" height="10" rx="2" fill={color} />
        <rect x="30" y="5" width="6" height="23" rx="2" fill={color} />
        <rect x="40" y="11" width="6" height="17" rx="2" fill={color} />
        <rect x="50" y="2" width="6" height="26" rx="2" fill={color} />
      </svg>
    );
  }
  if (type === "wave") {
    return (
      <svg width="70" height="28" viewBox="0 0 70 28" style={{ opacity: 0.85 }}>
        <path d="M0 14 C 12 4, 23 4, 35 14 C 47 24, 58 24, 70 14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  // arc/circular loading
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(15,32,68,0.05)" strokeWidth="3.5" />
      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray="100" strokeDashoffset="30" strokeLinecap="round" />
    </svg>
  );
};

// Quick Action Button Wrapper for premium interactions
const QuickActionButton = ({ action, onClick }: { action: { label: string; icon: React.ReactNode }; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 14 }}
      style={{
        background: hovered ? "rgba(15, 32, 68, 0.03)" : C.offwhite,
        border: `1.5px solid ${hovered ? C.teal : C.border}`,
        borderRadius: 12,
        padding: "14px 18px",
        textAlign: "left",
        fontSize: "0.875rem",
        color: C.navy,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: hovered ? "0 4px 12px rgba(15, 32, 68, 0.03)" : "none",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {action.icon}
        <span>{action.label}</span>
      </div>
      <motion.span 
        animate={{ x: hovered ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        style={{ 
          color: C.teal,
          fontSize: "1rem"
        }}
      >
        →
      </motion.span>
    </motion.button>
  );
};

const getSparklineType = (label: string): string => {
  if (label.includes("Cases")) return "line";
  if (label.includes("Reports")) return "bar";
  if (label.includes("Lessons")) return "wave";
  return "circle";
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState([
    { label: "Cases Analyzed", value: "0", icon: "scale", color: C.teal },
    { label: "Reports Generated", value: "0", icon: "file-text", color: C.navy },
    { label: "Lessons Completed", value: "0", icon: "graduation-cap", color: C.gold },
    { label: "Compliance Score", value: "--%", icon: "shield-check", color: C.green },
  ]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch count of cases analyzed
        const { count: casesCount, error: casesError } = await supabase
          .from("cases")
          .select("*", { count: "exact", head: true });
        
        if (casesError) console.error("Error fetching cases count:", casesError);

        // 2. Fetch count of compliance reports
        const { data: complianceData, count: reportsCount, error: reportsError } = await supabase
          .from("compliance_reports")
          .select("score, created_at", { count: "exact" });
        
        if (reportsError) console.error("Error fetching reports count:", reportsError);

        // 3. Fetch count of completed lessons
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("completed_lessons");
        
        if (enrollmentsError) console.error("Error fetching enrollments:", enrollmentsError);

        let lessonsCompletedCount = 0;
        if (enrollmentsData) {
          enrollmentsData.forEach(e => {
            lessonsCompletedCount += e.completed_lessons ? e.completed_lessons.length : 0;
          });
        }

        // 4. Calculate latest compliance score
        let complianceScoreDisplay = "Not Run";
        if (complianceData && complianceData.length > 0) {
          // Get the most recent report score
          const sortedReports = [...complianceData].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          complianceScoreDisplay = `${sortedReports[0].score}%`;
        }

        setStats([
          { label: "Cases Analyzed", value: String(casesCount || 0), icon: "scale", color: C.teal },
          { label: "Reports Generated", value: String(reportsCount || 0), icon: "file-text", color: C.navy },
          { label: "Lessons Completed", value: String(lessonsCompletedCount), icon: "graduation-cap", color: C.gold },
          { label: "Compliance Score", value: complianceScoreDisplay, icon: "shield-check", color: C.green },
        ]);

        // 5. Build Recent Activity feed
        const { data: recentCases } = await supabase
          .from("cases")
          .select("title, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const { data: recentReports } = await supabase
          .from("compliance_reports")
          .select("type, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const activityFeed: ActivityItem[] = [];

        if (recentCases) {
          recentCases.forEach(c => {
            activityFeed.push({
              title: c.title,
              type: "Case Analysis",
              time: formatRelativeTime(c.created_at),
            });
          });
        }

        if (recentReports) {
          recentReports.forEach(r => {
            activityFeed.push({
              title: `${r.type.toUpperCase()} Compliance Checklist`,
              type: "Compliance Check",
              time: formatRelativeTime(r.created_at),
            });
          });
        }

        // Sort combined feed by time
        setActivities(activityFeed.slice(0, 3));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);



  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
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
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          Welcome back, {user.full_name?.split(" ")[0] || "User"}{" "}
          <Sparkles size={22} style={{ color: C.gold, display: "inline-block" }} />
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>Here&apos;s what&apos;s happening with your TaxWise account today.</p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {stats.map(s => (
          <motion.div key={s.label} variants={itemVariants}>
            <Card style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ 
                  width: 42, 
                  height: 42, 
                  borderRadius: 10, 
                  background: `${s.color}12`, // 10% opacity hex
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center"
                }}>
                  {getIconComponent(s.icon, 20, s.color)}
                </div>
                <Sparkline type={getSparklineType(s.label)} color={s.color} />
              </div>
              
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.1rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {loading ? "..." : s.value}
                </div>
                <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 8, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  {s.label}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        <motion.div variants={itemVariants}>
          <Card style={{ padding: 28, height: "100%" }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 20, fontSize: "0.98rem", letterSpacing: "-0.01em" }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Analyze a New Case", icon: <Scale size={16} style={{ color: C.teal }} />, page: "analyzer" },
                { label: "Open Calculators", icon: <Calculator size={16} style={{ color: C.navy }} />, page: "calculators" },
                { label: "Browse Intelligence", icon: <Brain size={16} style={{ color: C.gold }} />, page: "intelligence" },
                { label: "Continue Learning", icon: <BookOpen size={16} style={{ color: C.navy }} />, page: "education" },
                { label: "Search TAT Cases", icon: <Search size={16} style={{ color: C.teal }} />, page: "library" },
                { label: "Run Compliance Check", icon: <ShieldCheck size={16} style={{ color: C.green }} />, page: "compliance" },
              ].map(a => (
                <QuickActionButton
                  key={a.label}
                  action={a}
                  onClick={() => onNavigate(a.page)}
                />
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card style={{ padding: 28, height: "100%" }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 20, fontSize: "0.98rem", letterSpacing: "-0.01em" }}>Recent Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
              
              {/* Vertical timeline timeline guide line */}
              {activities.length > 1 && (
                <div style={{ 
                  position: "absolute", 
                  left: 17, 
                  top: 8, 
                  bottom: 8, 
                  width: 2, 
                  background: `linear-gradient(180deg, ${C.border} 0%, rgba(229, 231, 235, 0.1) 100%)`, 
                  zIndex: 1 
                }} />
              )}

              {loading ? (
                <div style={{ fontSize: "0.85rem", color: C.muted, padding: "10px 0" }}>Loading activities...</div>
              ) : activities.length > 0 ? (
                activities.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "10px 0", position: "relative", zIndex: 5 }}>
                    <div style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: "50%", 
                      background: C.white,
                      border: `2.5px solid ${r.type.includes("Case") ? C.teal : C.navy}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 4px rgba(15, 32, 68, 0.05)"
                    }}>
                      {r.type.includes("Case") ? <Scale size={16} style={{ color: C.teal }} /> : <ShieldCheck size={16} style={{ color: C.navy }} />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.navy, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: "0.76rem", color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, color: r.type.includes("Case") ? C.teal : C.navy }}>{r.type}</span>
                        <span>•</span>
                        <span>{r.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "32px 0" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.5 }}>
                    <FolderOpen size={32} style={{ color: C.muted }} />
                  </div>
                  No recent activity found. Get started by exploring the tools!
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
