"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { User } from "@supabase/supabase-js";
import { 
  LayoutDashboard, 
  Scale, 
  BookOpen, 
  Calculator, 
  Brain, 
  GraduationCap, 
  CheckCircle, 
  CreditCard, 
  Shield, 
  LogOut, 
  Home, 
  Bell 
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { AuthPage } from "../components/AuthPage";
import { LandingPage } from "../components/LandingPage";
import { Dashboard } from "../components/Dashboard";
import { CaseAnalyzer } from "../components/CaseAnalyzer";
import { CaseLibrary } from "../components/CaseLibrary";
import { EducationHub } from "../components/EducationHub";
import { ComplianceChecker } from "../components/ComplianceChecker";
import { PricingPage } from "../components/PricingPage";
import { AdminPortal } from "../components/AdminPortal";
import { ProfileSettings } from "../components/ProfileSettings";
import { CalculatorsPortal } from "../components/CalculatorsPortal";
import { IntelligencePortal } from "../components/IntelligencePortal";

interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
}

export default function TaxWiseSaaS() {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbProfile | null>(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "auth">("landing");
  const [isRecovering, setIsRecovering] = useState(false);
  const intendedPageRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [page]);

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch public user profile from postgres
        const { data, error } = await supabase
          .from("users")
          .select("id, email, full_name, role, plan")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.warn("Could not load database profile, falling back to auth metadata:", error.message);
        }

        if (data) {
          setDbUser(data as DbProfile);
        } else {
          // Fallback to auth metadata if public profile record sync is delayed
          setDbUser({
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            role: session.user.user_metadata?.role || "Student",
            plan: "free",
          });
        }

        // If there's an intended page (from nav dropdown), navigate to it after login
        if (intendedPageRef.current) {
          setPage(intendedPageRef.current);
          intendedPageRef.current = null;
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
    } catch (err) {
      console.error("Auth sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
    
    // Subscribe to auth state updates (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
        setView("auth");
      } else {
        refreshUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("page") === "pricing" || params.get("status")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage("pricing");
      }
    }
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setPage("dashboard");
  };

  const handleNavigation = (pageId: string) => {
    if (user && dbUser) {
      // User is logged in, navigate directly
      setPage(pageId);
      setView("auth");
    } else {
      // User is not logged in, save intended page and show auth
      intendedPageRef.current = pageId;
      setView("auth");
    }
  };

  const handleGoHome = () => {
    setView("landing");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "analyzer", label: "Case Analyzer" },
    { id: "library", label: "Case Library" },
    { id: "calculators", label: "Calculators" },
    { id: "intelligence", label: "Intelligence" },
    { id: "education", label: "Learning Hub" },
    { id: "compliance", label: "Compliance" },
    { id: "pricing", label: "Pricing" },
  ];

  // Include Admin navigation if the user is an Admin
  if (dbUser?.role?.toLowerCase() === "admin") {
    navItems.push({ id: "admin", label: "Admin Portal" });
  }

  const renderActivePage = () => {
    if (!dbUser) return null;
    
    switch (page) {
      case "dashboard":
        return <Dashboard user={dbUser} onNavigate={setPage} />;
      case "analyzer":
        return <CaseAnalyzer user={dbUser} />;
      case "library":
        return <CaseLibrary />;
      case "calculators":
        return <CalculatorsPortal />;
      case "intelligence":
        return <IntelligencePortal />;
      case "education":
        return <EducationHub user={dbUser} />;
      case "compliance":
        return <ComplianceChecker user={dbUser} />;
      case "pricing":
        return <PricingPage user={dbUser} onRefreshUser={refreshUser} />;
      case "settings":
        return <ProfileSettings user={dbUser} onRefreshUser={refreshUser} onNavigateToPricing={() => setPage("pricing")} onAccountDeleted={handleSignOut} />;
      case "admin":
        return <AdminPortal onNavigate={setPage} currentAdminId={dbUser.id} />;
      default:
        return <Dashboard user={dbUser} onNavigate={setPage} />;
    }
  };

  // Show loading screen while auth state is being determined
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          {/* Logo Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 12, height: 12, background: "#C8922A", borderRadius: 3, transform: "rotate(45deg)", flexShrink: 0, boxShadow: "0 0 12px rgba(200, 146, 42, 0.4)" }} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: "#0F2044", fontWeight: 800, letterSpacing: "-0.01em" }}>
              Tax<span style={{ color: "#1A7B6B" }}>Wise</span>
            </span>
          </div>

          {/* Premium CSS/SVG Spinner */}
          <div style={{ position: "relative", width: 44, height: 44, marginBottom: 20 }}>
            {/* Outer glowing pulsed ring */}
            <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid rgba(26, 123, 107, 0.05)", animation: "pulseGlow 2s infinite ease-in-out" }} />
            {/* SVG Spinner */}
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ display: "block" }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(15, 32, 68, 0.04)" strokeWidth="3" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="url(#spinner-gradient)" strokeWidth="3" strokeDasharray="113" strokeDashoffset="40" strokeLinecap="round" style={{ transformOrigin: "center", animation: "spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite" }} />
              <defs>
                <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1A7B6B" />
                  <stop offset="100%" stopColor="#4DD9C0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Loading Text */}
          <div style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", animation: "pulse 1.8s infinite ease-in-out" }}>
            Syncing session
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(15, 32, 68, 0.45)", marginTop: 6, fontWeight: 500 }}>
            Securing your connection...
          </div>
        </div>
      </div>
    );
  }

  // Show update-password screen if user clicked recovery link
  if (isRecovering) {
    return (
      <AuthPage
        initialMode="update-password"
        onLoginSuccess={() => {
          setIsRecovering(false);
          refreshUser();
        }}
        onBack={() => {
          setIsRecovering(false);
          supabase.auth.signOut();
          setView("landing");
        }}
      />
    );
  }

  // Show landing page if requested, even when the user is logged in.
  if (view === "landing") {
    return (
      <LandingPage
        onGetStarted={() => setView("auth")}
        onSignIn={() => setView("auth")}
        onNavigate={handleNavigation}
        dbUser={dbUser}
        onSignOut={handleSignOut}
      />
    );
  }

  // Show landing page or auth if not logged in
  if (!user || !dbUser) {
    return <AuthPage onLoginSuccess={refreshUser} onBack={() => setView("landing")} />;
  }

  const getNavItemIcon = (id: string, size = 18) => {
    switch (id) {
      case "dashboard": return <LayoutDashboard size={size} />;
      case "analyzer": return <Scale size={size} />;
      case "library": return <BookOpen size={size} />;
      case "calculators": return <Calculator size={size} />;
      case "intelligence": return <Brain size={size} />;
      case "education": return <GraduationCap size={size} />;
      case "compliance": return <CheckCircle size={size} />;
      case "pricing": return <CreditCard size={size} />;
      case "admin": return <Shield size={size} />;
      default: return <LayoutDashboard size={size} />;
    }
  };

  // Sidebar Nav Item Helper Component for hover states
  const SidebarNavItem = ({ item, isActive, onClick }: { item: { id: string; label: string }; isActive: boolean; onClick: () => void }) => {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ x: isActive ? 0 : 6 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "11px 16px",
          borderRadius: 12,
          border: "none",
          background: isActive 
            ? `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)` 
            : "transparent",
          color: isActive ? C.white : "rgba(255,255,255,0.55)",
          fontWeight: isActive ? 700 : 500,
          fontSize: "0.875rem",
          cursor: "pointer",
          marginBottom: 4,
          textAlign: "left",
          fontFamily: "inherit",
          boxShadow: isActive ? "0 4px 12px rgba(26,123,107,0.3)" : "none",
        }}
        onMouseOver={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.85)";
          }
        }}
        onMouseOut={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          }
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {getNavItemIcon(item.id, 16)}
        </span>
        <span>{item.label}</span>
      </motion.button>
    );
  };

  // Get dynamic page title for header
  const getPageTitle = () => {
    if (page === "settings") return "Profile & Settings";
    const activeItem = navItems.find(n => n.id === page);
    return activeItem ? activeItem.label : "Dashboard";
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.offwhite }}>
      {/* SIDEBAR */}
      <div 
        className="glass-sidebar"
        style={{ 
          width: 240, 
          display: "flex", 
          flexDirection: "column", 
          position: "sticky", 
          top: 0, 
          height: "100vh", 
          flexShrink: 0,
          boxShadow: "4px 0 24px rgba(15, 32, 68, 0.08)",
          zIndex: 50
        }}
      >
        <div style={{ padding: "26px 24px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.45rem", color: C.white, fontWeight: 800, letterSpacing: "-0.01em" }}>
            Tax<span style={{ color: "#4DD9C0" }}>Wise</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.35)", marginTop: 4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Uganda Tax Platform
          </div>
        </div>

        <nav style={{ flex: 1, padding: "20px 14px", overflowY: "auto" }}>
          {navItems.map((n) => (
            <SidebarNavItem
              key={n.id}
              item={n}
              isActive={page === n.id}
              onClick={() => setPage(n.id)}
            />
          ))}
        </nav>

        {/* PROFILE SECTION */}
        <div style={{ padding: "18px 20px", borderTop: "1px solid rgba(255,255,255,.05)", background: "rgba(15, 32, 68, 0.2)" }}>
          <div 
            onClick={() => setPage("settings")}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              marginBottom: 12,
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: "10px",
              margin: "-6px -8px 6px",
              transition: "background 0.2s ease, transform 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: "50%", 
                background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: C.white, 
                fontSize: "0.85rem", 
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(26,123,107,0.3)"
              }}
            >
              {getInitials(dbUser.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dbUser.full_name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{dbUser.role}</span>
                <span>•</span>
                <span style={{ color: "#4DD9C0", fontWeight: 700 }}>{dbUser.plan?.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: C.white,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "10px 16px",
              transition: "all 0.2s ease",
              width: "100%",
              justifyContent: "center",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.18)";
              e.currentTarget.style.color = C.red;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = C.white;
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* HEADER BAR */}
        <header 
          style={{ 
            height: 70, 
            background: C.white, 
            borderBottom: "1px solid rgba(15, 32, 68, 0.05)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "0 40px",
            flexShrink: 0,
            boxShadow: "0 2px 12px rgba(15, 32, 68, 0.01)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.8rem", color: C.muted, fontWeight: 500 }}>
            <button
              onClick={handleGoHome}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: "0.82rem",
                color: C.navy,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.offwhite; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Home size={13} />
              <span>Home</span>
            </button>
            <span>TaxWise</span>
            <span style={{ fontSize: "0.6rem" }}>/</span>
            <span style={{ color: C.navy, fontWeight: 700 }}>{getPageTitle()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 500 }}>📅 {formattedDate}</span>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center" }} title="Notifications">
              <Bell size={16} style={{ cursor: "pointer", color: C.navy }} />
              <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: "50%", background: C.red }} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div ref={scrollContainerRef} style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
          <main key={page} className="page-fade-in" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
            {renderActivePage()}
          </main>
        </div>
      </div>
    </div>
  );
}
