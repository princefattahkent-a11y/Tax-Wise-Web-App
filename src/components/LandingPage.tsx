/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { LayoutDashboard, Settings, LogOut, ChevronDown, Scale, Search, Car, Calculator, GraduationCap, ShieldCheck, Mail, Check, Star, FileText, Cpu, TrendingUp, Clock, Building2, Globe, Sparkles, AlertTriangle } from "lucide-react";
import { AiFAB } from "./AiFAB";

// Animated Counting Number Component
const CountingNumber: React.FC<{ value: string; duration?: number }> = ({ value, duration = 1500 }) => {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Extract digits and suffix
  const numericString = value.replace(/[^0-9]/g, "");
  const target = parseInt(numericString, 10) || 0;
  const suffix = value.replace(/[0-9,]/g, "");
  const hasCommas = value.includes(",");

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuad
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * target);
      
      setCurrent(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  const formatNumber = (num: number) => {
    if (hasCommas) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <span ref={ref}>
      {formatNumber(current)}{suffix}
    </span>
  );
};

interface SiteSettings {
  stat_cases: string;
  stat_time_saved: string;
  stat_practitioners: string;
  stat_calculators: string;
  hero_badge_text: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_title_line3: string;
  hero_subtitle: string;
  topbar_text: string;
  topbar_email: string;
}

const DEFAULTS: SiteSettings = {
  stat_cases: "4,200+",
  stat_time_saved: "85%",
  stat_practitioners: "350+",
  stat_calculators: "6",
  hero_badge_text: "Built for Uganda Tax & Customs Professionals",
  hero_title_line1: "The tax intelligence",
  hero_title_line2: "platform your practice",
  hero_title_line3: "actually needs",
  hero_subtitle: "AI case analysis, TAT precedent research, live tax & import calculators, and compliance checking tools — purpose-built for Uganda's tax ecosystem.",
  topbar_text: "Engineered for Uganda's Tax & Customs Ecosystem",
  topbar_email: "hello@taxwise.cloud",
};

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onNavigate?: (page: string) => void;
  dbUser?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    plan: string;
  } | null;
  onSignOut?: () => void;
}

const itemToPageMap: Record<string, string> = {
  "Case Analyzer": "analyzer",
  "Compliance Checklists": "compliance",
  "TAT Library Search": "library",
  "Client Report Builder": "analyzer",
  "PAYE Estimator": "calculators",
  "VAT Calculator": "calculators",
  "Withholding Tax Rates": "calculators",
  "Customs Import Tax": "calculators",
  "Vehicle Depreciation Duty": "calculators",
  "Transfer Pricing Guide": "intelligence",
  "TAT Dispute Strategy": "intelligence",
  "WHT Treaties Map": "intelligence",
  "Monthly Tax Updates": "intelligence",
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onNavigate, dbUser, onSignOut }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroText, setHeroText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [dynamicStats, setDynamicStats] = useState({
    cases: "120",
    timeSaved: "85%",
    practitioners: "35",
    calculators: "6"
  });

  // Fetch admin-controlled site settings & dynamic counts from database
  useEffect(() => {
    const fetchSettingsAndStats = async () => {
      try {
        const { data } = await supabase.from("site_settings").select("key,value");
        let mergedSettings = { ...DEFAULTS };
        if (data && data.length > 0) {
          const map: Partial<SiteSettings> = {};
          data.forEach(({ key, value }: { key: string; value: string }) => {
            (map as Record<string, string>)[key] = value;
          });
          mergedSettings = { ...DEFAULTS, ...map };
          setSettings(mergedSettings);
        }

        // Fetch live database counts dynamically
        let userCasesCount = 0;
        let registeredUsersCount = 0;
        let tatCasesCount = 0;

        try {
          const [casesRes, usersRes, tatRes] = await Promise.all([
            supabase.from("cases").select("*", { count: "exact", head: true }),
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("tat_cases").select("*", { count: "exact", head: true })
          ]);
          userCasesCount = casesRes.count || 0;
          registeredUsersCount = usersRes.count || 0;
          tatCasesCount = tatRes.count || 0;
        } catch (e) {
          console.warn("Could not retrieve exact live row counts, using defaults.", e);
        }

        // Base values: Cases analyzed = actual count in DB, Practitioners = actual count in DB, Calculators = 6
        const calculatedCases = userCasesCount + tatCasesCount;
        const calculatedPractitioners = registeredUsersCount;

        setDynamicStats({
          cases: `${calculatedCases.toLocaleString()}`,
          timeSaved: mergedSettings.stat_time_saved || "85%",
          practitioners: `${calculatedPractitioners.toLocaleString()}`,
          calculators: mergedSettings.stat_calculators || "6"
        });

      } catch {
        // silently use defaults if table doesn't exist yet
      }
    };
    fetchSettingsAndStats();
  }, []);
  const heroFull = "COMELSA Ltd – URA assessed UGX 48M under Section 28ITA for failure to withhold tax on payments to non-resident consultants. Taxpayer filed TAT appeal 45 days after objection decision.";
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bento Interactive states
  const [simulatorGross, setSimulatorGross] = useState(3500000); // Default 3.5M UGX
  const [vehicleYear, setVehicleYear] = useState(2016); // Default 10 years old vehicle
  const [selectedPrecedent, setSelectedPrecedent] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let i = 0;
    setHeroText("");
    setShowResult(false);
    const type = () => {
      if (i < heroFull.length) {
        setHeroText(heroFull.slice(0, i + 1));
        i++;
        typingRef.current = setTimeout(type, 18);
      } else {
        typingRef.current = setTimeout(() => setShowResult(true), 400);
      }
    };
    typingRef.current = setTimeout(type, 600);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, []);

  const navStyle: React.CSSProperties = {
    background: scrolled ? "rgba(9, 13, 22, 0.95)" : "transparent",
    borderBottom: scrolled ? "1px solid rgba(22, 44, 86, 0.5)" : "1px solid rgba(255, 255, 255, 0.05)",
    position: "sticky",
    top: 0,
    zIndex: 300,
    backdropFilter: scrolled ? "blur(16px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
    transition: "all .4s cubic-bezier(0.16, 1, 0.3, 1)",
    marginBottom: "-72px",
  };



  const testimonials = [
    { quote: "TaxWise retrieved a crucial TAT precedent in 4 seconds that would have taken me hours to search for manually. It has completely transformed our tribunal preparation.", name: "Sarah Nakato", role: "Senior Tax Consultant, Kampala", initials: "SN", color: "#162C56" },
    { quote: "The vehicle import calculator is incredibly accurate and saves our team massive amounts of time. Client estimates that used to take half a day are now completed instantly.", name: "James Opolot", role: "Customs Agent & Clearing Specialist", initials: "JO", color: "#162C56" },
    { quote: "We ran our records through the compliance checker before a URA audit. It caught a legacy PAYE discrepancy we had missed. Saved us millions in penalties.", name: "Grace Atim", role: "Finance Manager, Manufacturing Sector", initials: "GA", color: "#C8922A" },
  ];

  const plans = [
    { name: "Starter", price: "Free", period: "Forever", features: ["5 case analyses / month", "Basic TAT library search", "PAYE & VAT calculator tool", "Vehicle import calculator", "Standard email support"], cta: "Get Started Free", popular: false },
    { name: "Professional", price: "UGX 120,000", period: "/ month", features: ["Unlimited case analyses", "Full TAT case library + AI commentary", "All tax & import calculators", "eFRIS, VAT & PAYE Compliance Checker", "Exportable PDF reports for clients", "Priority chat support"], cta: "Start 14-Day Trial", popular: true, comingSoon: true },
    { name: "Firm", price: "UGX 350,000", period: "/ month", features: ["Everything in Professional", "Up to 8 team seats", "Admin portal & firm usage metrics", "API access (beta program)", "Dedicated account setup", "ICPAU CPD certificates"], cta: "Contact Sales", popular: false, comingSoon: true },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#090D16", color: "#F4F4F5", lineHeight: 1.6, WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .tw-dd { position: relative; }
        .tw-dd:hover .tw-dropdown { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }
        .tw-dropdown { opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .tw-cursor { display: inline-block; width: 8px; height: 1.1em; background: #3B82F6; vertical-align: text-bottom; animation: blink 1s step-end infinite; }
        .tw-result-anim { animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Dark Mode Bento Grid styles */
        .tw-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .tw-feat-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(14, 20, 36, 0.65) !important;
          border: 1px solid rgba(22, 44, 86, 0.6) !important;
          color: #F4F4F5 !important;
          backdrop-filter: blur(10px);
        }
        .tw-feat-card:hover {
          border-color: #3B82F6 !important;
          background-color: rgba(18, 26, 48, 0.8) !important;
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.12);
        }
        .tw-testi {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(14, 20, 36, 0.6) !important;
          border: 1px solid rgba(22, 44, 86, 0.6) !important;
          color: #F4F4F5 !important;
        }
        .tw-testi:hover {
          border-color: #2DD4BF !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(45, 212, 191, 0.08);
        }
        .tw-btn-hover {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tw-btn-hover:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25);
        }
        .tw-nav-link:hover { color: #3B82F6 !important; }
        .tw-footer-link:hover { color: #2DD4BF !important; }
        .tw-mobile-link:hover { color: #3B82F6 !important; }
        
        .tw-price-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(14, 20, 36, 0.7) !important;
          border: 1px solid rgba(22, 44, 86, 0.6) !important;
          color: #F4F4F5 !important;
        }
        .tw-price-card:hover {
          transform: translateY(-4px);
          border-color: #3B82F6 !important;
          box-shadow: 0 16px 40px rgba(59, 130, 246, 0.1);
        }
        
        .glow-border {
          position: relative;
        }
        .glow-border::after {
          content: '';
          position: absolute;
          inset: -1.5px;
          background: linear-gradient(135deg, #3B82F6, #2DD4BF);
          border-radius: 8px;
          z-index: -1;
          opacity: 0.45;
          filter: blur(2px);
          transition: opacity 0.3s;
        }
        .glow-border:hover::after {
          opacity: 0.85;
          filter: blur(3px);
        }

        .tw-chevron {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tw-dd:hover .tw-chevron {
          transform: rotate(180deg);
        }
        
        .tw-dropdown-container {
          position: absolute;
          top: 100%;
          right: 0;
          background: #0E1424;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          min-width: 220px;
          z-index: 400;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px;
          margin-top: 4px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        
        .tw-dd:hover .tw-dropdown-container {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        .tw-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 6px;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .tw-dropdown-item:hover {
          background-color: rgba(255, 255, 255, 0.08);
          color: #3B82F6;
          padding-left: 16px;
        }
        
        .tw-dropdown-item svg {
          color: rgba(255, 255, 255, 0.5);
          transition: all 0.2s ease;
        }
        
        .tw-dropdown-item:hover svg {
          color: #3B82F6;
          transform: scale(1.05);
        }
        
        .tw-dropdown-item-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 6px;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          color: #EF4444;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .tw-dropdown-item-logout:hover {
          background-color: rgba(239, 68, 68, 0.12);
          color: #F87171;
          padding-left: 16px;
        }
        
        .tw-dropdown-item-logout svg {
          color: #EF4444;
          transition: all 0.2s ease;
        }
        
        .tw-dropdown-item-logout:hover svg {
          color: #F87171;
          transform: translateX(2px);
        }

        @media (max-width: 992px) {
          .tw-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .tw-hero-text-align { text-align: center; }
          .tw-hero-text-align p { margin: 0 auto 32px !important; }
          .tw-hero-ctas { justify-content: center; }
          .tw-hero-checklists { justify-content: center; }
        }
        @media (max-width: 768px) {
          .tw-feat-grid { grid-template-columns: 1fr 1fr !important; }
          .tw-testi-grid { grid-template-columns: 1fr !important; }
          .tw-price-grid { grid-template-columns: 1fr !important; }
          .tw-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .tw-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .tw-nav-desktop { display: none !important; }
          .tw-hamburger { display: flex !important; }
        }
        @media (max-width: 480px) {
          .tw-feat-grid { grid-template-columns: 1fr !important; }
          .tw-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* DYNAMIC SCROLL PROGRESS BAR */}
      <div style={{ position: "fixed", top: 0, left: 0, height: "4px", background: "#C8922A", width: `${scrollProgress}%`, zIndex: 1000, transition: "width 0.1s ease-out" }} />

      {/* TOP BAR */}
      <div style={{ background: "#162C56", padding: "10px 5%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: ".72rem", color: "rgba(250,249,246,0.9)", fontWeight: 500, letterSpacing: "0.04em", borderBottom: "1px solid rgba(250,249,246,0.08)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Globe size={13} style={{ color: "#C8922A" }} />
          {settings.topbar_text}
        </span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Mail size={13} style={{ color: "#C8922A" }} />
            {settings.topbar_email}
          </span>
          <button onClick={onGetStarted} style={{ color: "#FAF9F6", background: "none", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: ".72rem", textDecoration: "underline" }}>Start Free Trial →</button>
        </div>
      </div>

      {/* NAVIGATION */}
      <div style={navStyle}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5%", display: "flex", alignItems: "center", height: 72 }}>
          {/* Logo */}
          <a href="#" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.5rem", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: 48, flexShrink: 0, fontWeight: 800, transition: "color 0.3s" }}>
            <div style={{ width: 10, height: 10, background: "#C8922A", borderRadius: "50%", flexShrink: 0 }} />
            Tax<span style={{ color: "#C8922A" }}>Wise</span>
          </a>

          {/* Desktop Nav Links */}
          <div className="tw-nav-desktop" style={{ display: "flex", alignItems: "center", flex: 1, gap: 4 }}>
            {[
              { label: "Products", items: ["Case Analyzer", "Compliance Checklists", "TAT Library Search", "Client Report Builder"] },
              { label: "Calculators", items: ["PAYE Estimator", "VAT Calculator", "Withholding Tax Rates", "Customs Import Tax", "Vehicle Depreciation Duty"] },
              { label: "Intelligence", items: ["Transfer Pricing Guide", "TAT Dispute Strategy", "WHT Treaties Map", "Monthly Tax Updates"] },
              { label: "Pricing" },
            ].map((nav) => (
              <div key={nav.label} className="tw-dd" style={{ position: "relative" }}>
                <button
                  className="tw-nav-link"
                  onClick={nav.label === "Pricing" ? () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }) : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 16px", height: 72, color: "rgba(255,255,255,0.85)", fontSize: ".85rem", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "color .2s", whiteSpace: "nowrap" }}
                >
                  {nav.label} {nav.items && <span style={{ fontSize: ".55rem", opacity: .6, transform: "translateY(0.5px)" }}>▼</span>}
                </button>
                {nav.items && (
                  <div className="tw-dropdown" style={{ position: "absolute", top: "100%", left: 0, background: "#0E1424", borderRadius: "0 0 8px 8px", boxShadow: "0 16px 36px rgba(0,0,0,0.5)", minWidth: 260, zIndex: 400, border: "1px solid rgba(22, 44, 86, 0.8)", borderTop: "3px solid #3B82F6", padding: "8px" }}>
                    {nav.items.map((item) => (
                      <button key={item} onClick={() => {
                        const pageId = itemToPageMap[item];
                        if (pageId && onNavigate) {
                          onNavigate(pageId);
                        } else {
                          onGetStarted();
                        }
                      }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 4, width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 600, color: "#F4F4F5", transition: "all .15s" }}
                        onMouseOver={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.color = "#3B82F6"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#F4F4F5"; }}>
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
                    {/* Nav Actions */}
          <div className="tw-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 18, marginLeft: "auto" }}>
            {dbUser ? (
              <div className="tw-dd" style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate("dashboard");
                    } else {
                      onGetStarted();
                    }
                  }}
                  className="tw-btn-hover"
                  style={{
                    background: scrolled ? "#162C56" : "#C8922A",
                    color: "white",
                    padding: "10px 22px",
                    borderRadius: 4,
                    fontSize: ".85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all .3s cubic-bezier(0.16, 1, 0.3, 1)",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                    boxShadow: scrolled ? "0 4px 12px rgba(22,44,86,0.12)" : "0 4px 12px rgba(200,146,42,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>Dashboard</span>
                  <ChevronDown size={14} className="tw-chevron" />
                </button>
                <div className="tw-dropdown-container">
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px 12px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    marginBottom: "6px"
                  }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #162C56 0%, #C8922A 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      boxShadow: "0 2px 6px rgba(22,44,86,0.15)",
                      flexShrink: 0
                    }}>
                      {dbUser.full_name ? dbUser.full_name[0].toUpperCase() : "U"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                        {dbUser.full_name}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {dbUser.email || "Professional"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => {
                    if (onNavigate) onNavigate("dashboard");
                  }} className="tw-dropdown-item">
                    <LayoutDashboard size={15} />
                    <span>Go to Dashboard</span>
                  </button>
                  <button onClick={() => {
                    if (onNavigate) onNavigate("settings");
                  }} className="tw-dropdown-item">
                    <Settings size={15} />
                    <span>Settings</span>
                  </button>
                  <button onClick={onSignOut} className="tw-dropdown-item-logout">
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={onSignIn} className="tw-nav-link" style={{ color: "rgba(255,255,255,0.85)", fontSize: ".85rem", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "color .2s" }}>Sign In</button>
                <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "#3B82F6", color: "white", padding: "10px 22px", borderRadius: 4, fontSize: ".85rem", fontWeight: 700, border: "none", cursor: "pointer", transition: "all .3s cubic-bezier(0.16, 1, 0.3, 1)", whiteSpace: "nowrap", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}>Start Free Trial</button>
              </>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <button className="tw-hamburger" onClick={() => setMobileOpen(v => !v)} style={{ display: "none", flexDirection: "column", gap: 5, cursor: "pointer", padding: 8, background: "none", border: "none", marginLeft: "auto" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 22, height: 2, background: "#FFFFFF", borderRadius: 2, transition: "background 0.3s" }} />)}
          </button>
        </div>  </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div style={{ background: "#0C1B36", borderTop: "1px solid rgba(255,255,255,.08)", padding: "16px 5%", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            {dbUser && (
              <div style={{ padding: "8px 0 16px", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Signed in as</span>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>{dbUser.full_name}</div>
              </div>
            )}
            {["Case Analyzer", "Tax Calculators", "Customs & Import", "Intelligence Hub", "Compliance Checklists", "Pricing Plan"].map(link => {
              const pageId = link === "Tax Calculators" ? "calculators" : 
                             link === "Case Analyzer" ? "analyzer" :
                             link === "Compliance Checklists" ? "compliance" :
                             link === "Customs & Import" ? "calculators" :
                             link === "Intelligence Hub" ? "intelligence" :
                             link === "Pricing Plan" ? "pricing" : "dashboard";
              return (
                <button key={link} onClick={() => {
                  setMobileOpen(false);
                  if (onNavigate) {
                    onNavigate(pageId);
                  } else {
                    onGetStarted();
                  }
                }} className="tw-mobile-link" style={{ display: "block", padding: "12px 0", color: "rgba(255,255,255,.7)", background: "none", border: "none", fontSize: ".9rem", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,.06)", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", transition: "color .2s" }}>{link}</button>
              );
            })}
            {dbUser ? (
              <>
                <button onClick={() => { setMobileOpen(false); if (onNavigate) onNavigate("dashboard"); else onGetStarted(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "#4DD9C0", background: "none", border: "none", fontSize: ".92rem", fontWeight: 700, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>
                  <LayoutDashboard size={16} />
                  <span>Go to Dashboard</span>
                </button>
                <button onClick={() => { setMobileOpen(false); if (onSignOut) onSignOut(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "#FCA5A5", background: "none", border: "none", fontSize: ".92rem", fontWeight: 700, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button onClick={() => { setMobileOpen(false); onGetStarted(); }} style={{ display: "block", padding: "12px 0", color: "#4DD9C0", background: "none", border: "none", fontSize: ".92rem", fontWeight: 700, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>→ Start Free Trial</button>
            )}
          </div>
        )}
      </div>

      {/* HERO SECTION CONTAINER */}
      <div style={{ background: "#090D16", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(22, 44, 86, 0.6)", padding: "140px 5% 80px" }}>
        {/* Ambient Blurred Backdrop Glows */}
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "300px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(45, 212, 191, 0.08) 50%, transparent 100%)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "40%", left: "30%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(200, 146, 42, 0.05) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", zIndex: 1 }} />
        
        {/* Background Grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.9, zIndex: 0 }} />

        {/* Centered Hero Content */}
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 10 }}>
          {/* Top Badge */}
          <motion.div 
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", color: "#2DD4BF", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 20, marginBottom: 28 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span style={{ width: 6, height: 6, background: "#2DD4BF", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #2DD4BF" }} />
            {settings.hero_badge_text}
          </motion.div>
          
          {/* Main Centered Title */}
          <motion.h1 
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)", color: "#FFFFFF", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-0.03em", fontWeight: 800 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            AI-Powered Legal &<br />
            <span style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2DD4BF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Tax Intelligence
            </span> for Uganda
          </motion.h1>
          
          {/* Hero Subtitle */}
          <motion.p 
            style={{ color: "rgba(255,255,255,0.78)", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: 36, maxWidth: 680, margin: "0 auto 36px", fontWeight: 500 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {settings.hero_subtitle}
          </motion.p>
          
          {/* Centered CTA Buttons */}
          <motion.div 
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {dbUser ? (
              <button onClick={() => { if (onNavigate) onNavigate("dashboard"); else onGetStarted(); }} className="tw-btn-hover" style={{ background: "#3B82F6", color: "white", padding: "14px 32px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all .25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
                Go to Dashboard →
              </button>
            ) : (
              <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "#3B82F6", color: "white", padding: "14px 32px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all .25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
                Start 14-Day Free Trial →
              </button>
            )}
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "rgba(255,255,255,0.03)", color: "#FFFFFF", padding: "14px 32px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "1px solid rgba(59, 130, 246, 0.35)", cursor: "pointer", transition: "all .25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit" }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(59,130,246,0.15)"; e.currentTarget.style.borderColor = "#2DD4BF"; }}
              onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.35)"; }}>
              Explore Bento Features
            </button>
          </motion.div>

          {/* LIVE ANALYSIS ENGINE DEMO */}
          <motion.div
            style={{ maxWidth: 880, margin: "0 auto", background: "rgba(10, 15, 28, 0.8)", border: "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)", textAlign: "left" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Header / Title bar */}
            <div style={{ background: "rgba(22, 44, 86, 0.4)", borderBottom: "1px solid rgba(22, 44, 86, 0.6)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={16} style={{ color: "#3B82F6" }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: ".825rem", color: "#FFFFFF" }}>Live Demo: AI Tax Analysis Engine</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: ".65rem", color: "#2DD4BF", background: "rgba(45, 212, 191, 0.1)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(45, 212, 191, 0.2)" }}>
                COMELSA_Tax_Appeal_Draft.pdf
              </span>
            </div>

            {/* Split Screen Layout */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", borderBottom: "1px solid rgba(22, 44, 86, 0.4)" }}>
              {/* Left Panel: Document Extraction (Typewriter) */}
              <div style={{ padding: "24px", background: "rgba(10, 15, 28, 0.4)", borderRight: "1px solid rgba(22, 44, 86, 0.4)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".72rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  <Cpu size={12} style={{ color: "#3B82F6" }} />
                  <span>Document Text Input Stream</span>
                </div>
                <div style={{ flex: 1, minHeight: "180px", background: "rgba(5, 8, 16, 0.8)", border: "1px solid rgba(22, 44, 86, 0.5)", borderRadius: 8, padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: ".8rem", color: "#94A3B8", lineHeight: 1.6, position: "relative" }}>
                  <span style={{ color: "#F4F4F5" }}>{heroText}</span>
                  {!showResult && <span className="tw-cursor" style={{ marginLeft: 3 }} />}
                  {showResult && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ marginTop: 14, fontSize: ".72rem", color: "#2DD4BF", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                    >
                      <Check size={14} /> Character stream parsed completely.
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Panel: AI TaxWise Structured Analysis Output */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
                {!showResult ? (
                  // Loading / Processing State
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="shimmer-loading" style={{ width: 24, height: 24, borderRadius: "50%" }} />
                      <div className="shimmer-loading" style={{ width: 140, height: 14, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 32 }}>
                      <div className="shimmer-loading" style={{ width: "90%", height: 10, borderRadius: 3 }} />
                      <div className="shimmer-loading" style={{ width: "85%", height: 10, borderRadius: 3 }} />
                      <div className="shimmer-loading" style={{ width: "70%", height: 10, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: ".78rem", color: "rgba(255,255,255,0.45)", fontStyle: "italic", paddingLeft: 32, marginTop: 8 }}>
                      <span>Analyzing timelines and precedents...</span>
                    </div>
                  </div>
                ) : (
                  // Active Result State
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{ display: "flex", flexDirection: "column", gap: 14 }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Sparkles size={14} style={{ color: "#2DD4BF" }} />
                        <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#2DD4BF", letterSpacing: "0.03em" }}>AI STRUCTURAL AUDIT</span>
                      </div>
                      <span style={{ background: "rgba(220, 38, 38, 0.12)", border: "1px solid rgba(220, 38, 38, 0.3)", color: "#F87171", padding: "3px 8px", borderRadius: 4, fontSize: ".65rem", fontWeight: 700, letterSpacing: "0.03em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={10} /> HIGH RISK EXPOSURE
                      </span>
                    </div>

                    {/* Verdict / Key violation */}
                    <div style={{ background: "rgba(220, 38, 38, 0.05)", border: "1px solid rgba(220, 38, 38, 0.15)", borderRadius: 8, padding: "12px" }}>
                      <div style={{ fontSize: ".825rem", fontWeight: 700, color: "#FCA5A5", marginBottom: 4 }}>Procedural Timeline Violation</div>
                      <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.45 }}>
                        Appeal filed **45 days** after objection decision, exceeding the mandatory **30-day filing window** under Section 14 of the TAT Act.
                      </p>
                    </div>

                    {/* Applicable Law & Precedents */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Binding Precedent Match:</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, padding: "10px" }}>
                        <Scale size={14} style={{ color: "#3B82F6", marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#FFFFFF" }}>Edward Mwanje v. URA (TAT No. 145/2025)</div>
                          <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.6)", marginTop: 2, lineHeight: 1.4 }}>
                            Tribunal ruled it holds **zero jurisdiction** to extend filing periods if appeal is filed late without a separate extension application.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Strategic steps */}
                    <div style={{ borderTop: "1px solid rgba(22, 44, 86, 0.4)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>System output completed</span>
                      <button onClick={onGetStarted} style={{ background: "rgba(45, 212, 191, 0.08)", border: "1px solid rgba(45, 212, 191, 0.3)", borderRadius: 6, padding: "5px 12px", color: "#2DD4BF", fontSize: ".7rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                        onMouseOver={e => { e.currentTarget.style.background = "rgba(45, 212, 191, 0.16)"; e.currentTarget.style.borderColor = "#2DD4BF"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "rgba(45, 212, 191, 0.08)"; e.currentTarget.style.borderColor = "rgba(45, 212, 191, 0.3)"; }}
                      >
                        Try with Your Files →
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Quick Demo Replay Trigger */}
            <div style={{ padding: "10px 20px", background: "rgba(22, 44, 86, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".72rem" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Drafted according to Uganda Tax Procedures Code Act</span>
              <button 
                onClick={() => {
                  let i = 0;
                  setHeroText("");
                  setShowResult(false);
                  if (typingRef.current) clearTimeout(typingRef.current);
                  const type = () => {
                    if (i < heroFull.length) {
                      setHeroText(heroFull.slice(0, i + 1));
                      i++;
                      typingRef.current = setTimeout(type, 18);
                    } else {
                      typingRef.current = setTimeout(() => setShowResult(true), 400);
                    }
                  };
                  type();
                }} 
                style={{ background: "none", border: "none", color: "#3B82F6", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Replay Simulation
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* STATS SECTION — values controlled via Admin > Site Settings */}
      <div style={{ background: "#090D16", borderBottom: "1px solid rgba(22, 44, 86, 0.6)", position: "relative" }}>
        <motion.div 
          className="tw-stats-grid" 
          style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 5%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {[
            [dynamicStats.cases, "Cases Analyzed"],
            [dynamicStats.timeSaved, "Time Saved vs Manual"],
            [dynamicStats.practitioners, "Active Practitioners"],
            [dynamicStats.calculators, "Live Tax Calculators"],
          ].map(([num, desc], i, arr) => (
            <div key={desc} style={{ padding: "0 10px", textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid rgba(22, 44, 86, 0.4)" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.5rem", color: "#C8922A", fontWeight: 800 }}>
                <CountingNumber value={num} />
              </div>
              <div style={{ fontSize: ".8rem", color: "rgba(255, 255, 255, 0.45)", marginTop: 8, fontWeight: 600, letterSpacing: "0.02em" }}>{desc}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* FEATURES SECTION */}
      <section id="features" style={{ padding: "96px 5%", background: "#090D16", borderBottom: "1px solid rgba(22, 44, 86, 0.6)", position: "relative" }}>
        {/* Background ambient glow behind Bento */}
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <motion.div 
            style={{ textAlign: "center", marginBottom: 64 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2DD4BF", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12, display: "inline-flex", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "4px 12px", borderRadius: 20 }}>Platform Capabilities</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", color: "#FFFFFF", marginBottom: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>Every tool a Uganda tax expert needs</h2>
            <p style={{ color: "rgba(255,255,255,0.72)", maxWidth: 580, margin: "0 auto", lineHeight: 1.7, fontSize: ".95rem", fontWeight: 500 }}>Tailored specifically for Uganda&apos;s statutory codes. Streamline advisory, calculations, and compliance instantly.</p>
          </motion.div>
          
          {/* Bento Grid Layout */}
          <div className="tw-feat-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, marginBottom: 24 }}>
            
            {/* CARD 1: Interactive PAYE Simulator (Double Width / Left Side) */}
            <motion.div 
              style={{ background: "rgba(10, 15, 28, 0.75)", border: "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                    <Cpu size={14} /> Interactive PAYE Simulator
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF" }}>Instant Uganda Payroll Tax Breakdowns</h3>
                </div>
                <span style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)", fontSize: ".65rem", fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>FY 2025/2026</span>
              </div>
              
              <p style={{ fontSize: ".84rem", color: "rgba(255,255,255,0.65)", marginBottom: 24, lineHeight: 1.5 }}>
                Slide to adjust gross monthly salary. View statutory calculations under Uganda&apos;s Income Tax Act Cap 340 (including the graduated brackets and the 10% super-tax for high earners).
              </p>

              {/* Slider Input */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", fontWeight: 600, color: "#FFFFFF", marginBottom: 10 }}>
                  <span>Gross Monthly Salary:</span>
                  <span style={{ color: "#3B82F6", fontSize: "1rem", fontWeight: 700 }}>UGX {simulatorGross.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={100000} 
                  max={15000000} 
                  step={50000}
                  value={simulatorGross} 
                  onChange={e => setSimulatorGross(Number(e.target.value))}
                  style={{ width: "100%", height: 6, background: "rgba(22, 44, 86, 0.8)", borderRadius: 3, outline: "none", cursor: "pointer", accentColor: "#3B82F6" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem", color: "rgba(255,255,255,0.4)", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>100K UGX</span>
                  <span>5M UGX</span>
                  <span>10M UGX</span>
                  <span>15M UGX</span>
                </div>
              </div>

              {/* Real-time Tax Output Grid */}
              {(() => {
                const g = simulatorGross;
                const nssf = g * 0.05; // 5% Employee Contribution
                
                // Calculate Ugandan PAYE Brackets
                let paye = 0;
                if (g <= 235000) {
                  paye = 0;
                } else if (g <= 335000) {
                  paye = (g - 235000) * 0.10;
                } else if (g <= 410000) {
                  paye = 10000 + (g - 335000) * 0.20;
                } else {
                  paye = 25000 + (g - 410000) * 0.30;
                }
                
                // Extra 10% super tax for gross exceeding 10,000,000
                if (g > 10000000) {
                  paye += (g - 10000000) * 0.10;
                }
                
                const net = g - paye - nssf;
                const totalDeductions = paye + nssf;
                const effectiveRate = g > 0 ? (totalDeductions / g) * 100 : 0;

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ background: "rgba(22, 44, 86, 0.2)", border: "1px solid rgba(22, 44, 86, 0.5)", borderRadius: 8, padding: "16px" }}>
                      <div style={{ fontSize: ".68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 4 }}>NSSF Employee (5%)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#E4E4E7" }}>UGX {Math.round(nssf).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(22, 44, 86, 0.2)", border: "1px solid rgba(22, 44, 86, 0.5)", borderRadius: 8, padding: "16px" }}>
                      <div style={{ fontSize: ".68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 4 }}>URA PAYE Deduction</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FCA5A5" }}>UGX {Math.round(paye).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 8, padding: "16px", gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: ".68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 4 }}>Net Take-Home Pay</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2DD4BF" }}>UGX {Math.round(net).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: ".68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 4 }}>Effective Tax Rate</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#FFFFFF" }}>{effectiveRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* CARD 2: Active Ugandan Court Precedents (Compact Card / Right Side) */}
            <motion.div 
              style={{ background: "rgba(10, 15, 28, 0.75)", border: "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#C8922A", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                  <FileText size={14} /> Court Precedents & Rulings
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 12 }}>TAT Uganda Case Index</h3>
                <p style={{ fontSize: ".82rem", color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.5 }}>
                  Click a high-profile case below to extract critical holding summaries and statutory impacts instantly.
                </p>

                {/* Case items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { id: "comelsa", title: "COMELSA vs URA (2024)", excerpt: "Section 28 non-resident consultant withholding tax assessed at 15% upheld." },
                    { id: "stanchart", title: "Stanchart vs URA (2023)", excerpt: "Transfer pricing adjustments on cross-border interest rates." },
                    { id: "mtn", title: "MTN vs Commissioner (2022)", excerpt: "Telecom promotional excise tax rebate thresholds." }
                  ].map(caseItem => (
                    <button 
                      key={caseItem.id} 
                      onClick={() => setSelectedPrecedent(selectedPrecedent === caseItem.id ? null : caseItem.id)}
                      style={{ background: selectedPrecedent === caseItem.id ? "rgba(200, 146, 42, 0.12)" : "rgba(255, 255, 255, 0.02)", border: selectedPrecedent === caseItem.id ? "1px solid #C8922A" : "1px solid rgba(255, 255, 255, 0.06)", borderRadius: 6, padding: "10px 12px", width: "100%", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#FFFFFF" }}>{caseItem.title}</span>
                        <span style={{ fontSize: ".6rem", color: "#C8922A" }}>{selectedPrecedent === caseItem.id ? "Close ▲" : "View ▼"}</span>
                      </div>
                      {selectedPrecedent === caseItem.id && (
                        <p style={{ fontSize: ".76rem", color: "rgba(255,255,255,0.8)", marginTop: 8, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8, lineHeight: 1.4 }}>
                          {caseItem.excerpt}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18, fontSize: ".72rem", color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>
                *Database synchronized with standard High Court & TAT gazettes.
              </div>
            </motion.div>
          </div>

          <div className="tw-feat-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 24 }}>
            
            {/* CARD 3: Vehicle Depreciation Import Calculator */}
            <motion.div 
              style={{ background: "rgba(10, 15, 28, 0.75)", border: "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2DD4BF", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                  <TrendingUp size={14} /> Customs & Vehicle Duty
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 12 }}>Vehicle Customs Duty & Environmental Levy</h3>
                <p style={{ fontSize: ".82rem", color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.5 }}>
                  Select manufacture year for an imported vehicle to calculate environmental surcharge tax and customs duties under the East African Customs Management Act.
                </p>

                {/* Input selector */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: ".74rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Vehicle Manufacture Year:</label>
                  <select 
                    value={vehicleYear} 
                    onChange={e => setVehicleYear(Number(e.target.value))}
                    style={{ background: "rgba(10, 15, 28, 0.8)", border: "1px solid rgba(22, 44, 86, 0.8)", borderRadius: 6, padding: "10px", width: "100%", color: "#FFFFFF", fontSize: ".8rem", outline: "none", fontFamily: "inherit" }}
                  >
                    {[2026, 2024, 2022, 2020, 2018, 2016, 2014, 2012, 2010, 2008].map(y => (
                      <option key={y} value={y}>{y} ({2026 - y} Years Old)</option>
                    ))}
                  </select>
                </div>

                {/* Calculation Outputs */}
                {(() => {
                  const age = 2026 - vehicleYear;
                  let envLevyRate = 0;
                  if (age < 5) envLevyRate = 0;
                  else if (age <= 10) envLevyRate = 35; // 35% environmental levy
                  else envLevyRate = 50; // 50% environmental levy

                  return (
                    <div style={{ background: "rgba(22, 44, 86, 0.2)", border: "1px solid rgba(22, 44, 86, 0.5)", borderRadius: 8, padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: ".68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>URA Environmental Levy</span>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: age >= 15 ? "#EF4444" : "#FFFFFF", marginTop: 2 }}>
                          {envLevyRate}% CIF Value
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ background: envLevyRate > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)", color: envLevyRate > 0 ? "#FCA5A5" : "#10B981", fontSize: ".68rem", fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>
                          {age >= 15 ? "PROHIBITED?" : age >= 10 ? "HIGH LEVY" : "STANDARD"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginTop: 18, fontSize: ".72rem", color: "rgba(255,255,255,0.4)" }}>
                *Assumes default cost, insurance, and freight (CIF) values as verified by URA guidelines.
              </div>
            </motion.div>

            {/* CARD 4: Unified Platform Features Grid (Right Side) */}
            <motion.div 
              style={{ background: "rgba(10, 15, 28, 0.75)", border: "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>
                <Star size={14} /> Full Legal Portal Assets
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 20 }}>Comprehensive Professional Features</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {[
                  { title: "Case Analyzer", desc: "Scan litigation briefs & objection templates against Cap 340/349 statutory provisions.", icon: "🔍" },
                  { title: "Compliance Checklists", desc: "Validate transaction workflows to bypass the standard UGX 6M URA penalty fine.", icon: "✓" },
                  { title: "WHT Treaty Maps", desc: "Track non-resident double taxation avoidance treaties active across East Africa.", icon: "🌍" },
                  { title: "Client Report Builder", desc: "Compile structured risk briefings and citations for foreign and domestic clients.", icon: "📄" }
                ].map(item => (
                  <div key={item.title} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "16px", cursor: "pointer" }} onClick={onGetStarted}>
                    <div style={{ fontSize: "1.2rem", marginBottom: 8 }}>{item.icon}</div>
                    <h4 style={{ fontSize: ".85rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>{item.title}</h4>
                    <p style={{ fontSize: ".74rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "96px 5%", background: "#090D16", borderTop: "1px solid rgba(22, 44, 86, 0.4)", borderBottom: "1px solid rgba(22, 44, 86, 0.4)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div 
            style={{ textAlign: "center", marginBottom: 64 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2DD4BF", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12, display: "inline-flex", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "4px 12px", borderRadius: 20 }}>User Workflow</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#FFFFFF", fontWeight: 800, letterSpacing: "-0.02em" }}>Legal intelligence in three simple steps</h2>
          </motion.div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, overflow: "hidden" }}>
            {[
              { step: "01", icon: <FileText size={24} style={{ color: "#3B82F6" }} />, title: "Upload or paste your case", desc: "Upload a TAT ruling PDF, paste a URA assessment, or describe your scenario. We accept all text structures.", x: -50, y: 0 },
              { step: "02", icon: <Cpu size={24} style={{ color: "#3B82F6" }} />, title: "AI analyzes in 30 seconds", desc: "The engine references Uganda tax acts, TAT precedents, and URA practice notes to deliver an interactive report.", x: 0, y: 50 },
              { step: "03", icon: <TrendingUp size={24} style={{ color: "#3B82F6" }} />, title: "Act on structured findings", desc: "Download a clean report detailing risk level, precedents, applicable rules, and next steps. Ready for clients.", x: 50, y: 0 },
            ].map(s => (
              <motion.div 
                key={s.step} 
                style={{ position: "relative", background: "rgba(10, 15, 28, 0.45)", border: "1px solid rgba(22, 44, 86, 0.5)", padding: "28px", borderRadius: 12 }}
                initial={{ opacity: 0, x: s.x, y: s.y }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <div style={{ fontSize: "3.2rem", fontFamily: "'Playfair Display', Georgia, serif", color: "#C8922A", fontWeight: 800, lineHeight: 1, marginBottom: 14 }}>{s.step}</div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14, width: 44, height: 44, background: "rgba(59, 130, 246, 0.08)", borderRadius: "50%", justifyContent: "center" }}>{s.icon}</div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, fontWeight: 500 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section style={{ padding: "96px 5%", background: "#0E1424" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div 
            style={{ textAlign: "center", marginBottom: 64 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2DD4BF", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12, display: "inline-flex", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "4px 12px", borderRadius: 20 }}>Practitioner Trust</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#FFFFFF", fontWeight: 800, letterSpacing: "-0.02em" }}>Used by Uganda&apos;s tax community</h2>
          </motion.div>
          
          <div className="tw-testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {testimonials.map((t, idx) => (
              <motion.div 
                key={t.name} 
                className="tw-testi" 
                style={{ background: "rgba(10, 15, 28, 0.6)", border: "1px solid rgba(22, 44, 86, 0.6)", borderRadius: 12, padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}
                initial={{ opacity: 0, y: 45 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
              >
                <div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} size={14} style={{ fill: "#C8922A", color: "#C8922A" }} />
                    ))}
                  </div>
                  <blockquote style={{ fontSize: ".875rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 24, fontStyle: "italic", fontWeight: 500 }}>&ldquo;{t.quote}&rdquo;</blockquote>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 700, color: "white", flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: ".875rem", fontWeight: 700, color: "#FFFFFF" }}>{t.name}</div>
                    <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: "96px 5%", background: "#090D16", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <motion.div 
            style={{ textAlign: "center", marginBottom: 64 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#2DD4BF", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12, display: "inline-flex", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "4px 12px", borderRadius: 20 }}>Transparent Subscriptions</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#FFFFFF", marginBottom: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Choose the right plan for your firm</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6, fontSize: ".95rem", maxWidth: 500, margin: "0 auto", fontWeight: 500 }}>Start free, upgrade as your client base scales. Billing in Uganda Shillings (UGX).</p>
          </motion.div>
          
          <div className="tw-price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch" }}>
            {plans.map((plan, idx) => {
              if (plan.comingSoon) {
                return (
                  <motion.div
                    key={plan.name}
                    style={{
                      background: "rgba(10, 15, 28, 0.4)",
                      border: "1px dashed rgba(22, 44, 86, 0.8)",
                      borderRadius: 12,
                      padding: "48px 28px",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      minHeight: "420px",
                    }}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: idx * 0.12 }}
                  >
                    <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: "#C8922A", color: "white", fontSize: ".68rem", fontWeight: 800, padding: "4px 14px", borderRadius: 4, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>COMING SOON</div>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>{plan.name}</div>
                    
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          background: "rgba(200, 146, 42, 0.05)",
                          color: "#C8922A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 16,
                        }}
                      >
                        <Clock size={24} style={{ color: "#C8922A" }} />
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>
                        Coming Soon
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", maxWidth: "220px", lineHeight: "1.5", fontWeight: 500 }}>
                        We are currently finalizing this tier to bring you advanced tax analysis tools.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div 
                  key={plan.name} 
                  className={`tw-price-card ${plan.popular ? 'glow-border' : ''}`} 
                  style={{ background: plan.popular ? "rgba(22, 44, 86, 0.6)" : "rgba(10, 15, 28, 0.75)", border: plan.popular ? "1px solid #3B82F6" : "1px solid rgba(22, 44, 86, 0.9)", borderRadius: 12, padding: "32px 28px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: idx * 0.12 }}
                >
                  <div>
                    {plan.popular && (
                      <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#3B82F6", color: "white", fontSize: ".68rem", fontWeight: 800, padding: "4px 14px", borderRadius: 4, whiteSpace: "nowrap", letterSpacing: "0.04em", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}>MOST POPULAR</div>
                    )}
                    <div style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: plan.popular ? "#3B82F6" : "rgba(255,255,255,0.45)", marginBottom: 10 }}>{plan.name}</div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.4rem", color: "#FFFFFF", fontWeight: 800 }}>{plan.price}</div>
                    <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,0.5)", marginBottom: 24, fontWeight: 500 }}>{plan.period}</div>
                    <hr style={{ border: "none", borderTop: "1px solid rgba(22, 44, 86, 0.8)", margin: "20px 0" }} />
                    
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ fontSize: ".85rem", color: "rgba(255,255,255,0.8)", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.4, fontWeight: 500 }}>
                          <span style={{ color: "#3B82F6", flexShrink: 0, marginTop: 3 }}>
                            <Check size={14} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button onClick={onGetStarted} style={{ display: "block", width: "100%", textAlign: "center", padding: "12px", borderRadius: 6, fontWeight: 700, fontSize: ".88rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", border: plan.popular ? "none" : "1.5px solid rgba(59, 130, 246, 0.4)", color: "#FFFFFF", background: plan.popular ? "#3B82F6" : "transparent" }}
                    onMouseOver={e => { 
                      if (!plan.popular) {
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                        e.currentTarget.style.borderColor = "#3B82F6";
                      } else {
                        e.currentTarget.style.background = "#2563EB";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseOut={e => { 
                      if (!plan.popular) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                      } else {
                        e.currentTarget.style.background = "#3B82F6";
                        e.currentTarget.style.transform = "none";
                      }
                    }}>
                    {plan.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>
          
          <motion.div 
            style={{ background: "rgba(10, 15, 28, 0.6)", border: "1px solid rgba(22, 44, 86, 0.8)", borderRadius: 12, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, flexWrap: "wrap", gap: 14 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span style={{ fontSize: ".82rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Flexible Local Payments Integrated</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["MTN Mobile Money", "Airtel Money", "Visa / Mastercard", "Electronic Bank Transfer"].map(m => (
                <span key={m} style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, padding: "6px 12px", fontSize: ".72rem", fontWeight: 700, color: "#FFFFFF" }}>{m}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: "80px 5%", background: "#0E1424", borderTop: "1px solid rgba(22, 44, 86, 0.5)", borderBottom: "1px solid rgba(22, 44, 86, 0.5)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(59, 130, 246, 0.04) 1.5px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.8 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
        
        <motion.div 
          style={{ maxWidth: 750, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 10 }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "white", marginBottom: 18, fontWeight: 800 }}>Ready to upgrade your practice?</h2>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "1rem", lineHeight: 1.7, marginBottom: 36, fontWeight: 500 }}>Join leading tax firms and corporate finance departments saving hours every week. Try our full suite free.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            {dbUser ? (
              <button onClick={() => { if (onNavigate) onNavigate("dashboard"); else onGetStarted(); }} className="tw-btn-hover" style={{ background: "white", color: "#090D16", padding: "14px 30px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit" }}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "#3B82F6", color: "white", padding: "14px 30px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit" }}>Create Free Account →</button>
                <button onClick={onSignIn} style={{ background: "transparent", color: "white", padding: "14px 30px", borderRadius: 6, fontWeight: 700, fontSize: ".925rem", border: "1px solid rgba(255,255,255,.2)", cursor: "pointer", fontFamily: "inherit" }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                  onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#090D16", padding: "64px 5% 32px", borderTop: "1px solid rgba(22, 44, 86, 0.5)", position: "relative" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div className="tw-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.45rem", color: "white", marginBottom: 12, fontWeight: 800 }}>Tax<span style={{ color: "#3B82F6" }}>Wise</span></div>
              <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", lineHeight: 1.6, maxWidth: 220, marginBottom: 16 }}>Uganda&apos;s professional tax intelligence engine. Designed for tax consultants, accountants, and customs brokers.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "5px 12px", borderRadius: 4, fontSize: ".68rem", color: "#FFFFFF", fontWeight: 600 }}>
                <Building2 size={13} style={{ color: "#2DD4BF" }} />
                <span>ICPAU CPD-Eligible</span>
              </div>
            </div>
            {[
              { heading: "Products", links: ["Case Analyzer", "Compliance Check", "TAT Precedents", "Client Reports"] },
              { heading: "Calculators", links: ["PAYE Calculator", "VAT Calculator", "WHT Rates Tool", "Import Duty"] },
              { heading: "Company", links: ["About Us", "Pricing Plans", "Legal Blog", "Contact Us"] },
              { heading: "Support", links: ["Knowledge Base", "hello@taxwise.cloud", "Privacy Policy", "Terms of Use"] },
            ].map(col => (
              <div key={col.heading}>
                <h5 style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 16 }}>{col.heading}</h5>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(link => (
                    <li key={link}>
                      <button onClick={onGetStarted} className="tw-footer-link" style={{ color: "rgba(255,255,255,.6)", fontSize: ".82rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color .2s", textAlign: "left", fontWeight: 500 }}>{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: "1px solid rgba(22, 44, 86, 0.5)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".74rem", color: "rgba(255,255,255,.4)", flexWrap: "wrap", gap: 12, fontWeight: 500 }}>
            <span>© 2026 TaxWise Uganda. All rights reserved.</span>
            <span>Complying with URA, eFRIS, and VAT statutory regulations.</span>
          </div>
        </div>
      </footer>
      <AiFAB currentPage="landing" dbUser={dbUser} />
    </div>
  );
};
