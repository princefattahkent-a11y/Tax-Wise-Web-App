/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

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
  topbar_text: "🇺🇬 Engineered for Uganda's Tax & Customs Ecosystem",
  topbar_email: "hello@taxwise.cloud",
};

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onNavigate?: (page: string) => void;
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

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroText, setHeroText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  // Fetch admin-controlled site settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from("site_settings").select("key,value");
        if (data && data.length > 0) {
          const map: Partial<SiteSettings> = {};
          data.forEach(({ key, value }: { key: string; value: string }) => {
            (map as Record<string, string>)[key] = value;
          });
          setSettings(prev => ({ ...prev, ...map }));
        }
      } catch {
        // silently use defaults if table doesn't exist yet
      }
    };
    fetchSettings();
  }, []);
  const heroFull = "COMELSA Ltd – URA assessed UGX 48M under Section 28ITA for failure to withhold tax on payments to non-resident consultants. Taxpayer filed TAT appeal 45 days after objection decision.";
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
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
        typingRef.current = setTimeout(type, 20);
      } else {
        typingRef.current = setTimeout(() => setShowResult(true), 500);
      }
    };
    typingRef.current = setTimeout(type, 700);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, []);

  const navStyle: React.CSSProperties = {
    background: scrolled ? "rgba(12, 27, 54, 0.85)" : "transparent",
    borderBottom: scrolled ? "1px solid rgba(255,255,255,.08)" : "1px solid rgba(255,255,255,.04)",
    position: "sticky",
    top: 0,
    zIndex: 300,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "all .3s cubic-bezier(0.16, 1, 0.3, 1)",
    marginBottom: "-72px",
  };

  const features = [
    { icon: "⚖️", title: "AI Case Analyzer", desc: "Upload a PDF or paste any TAT ruling. Get a structured summary, risk assessment, applicable law references, and practical steps in under 30 seconds." },
    { icon: "🔍", title: "TAT Case Library", desc: "Uganda's most comprehensive TAT ruling database. Filter by type, year, or outcome. Get instant AI commentary on precedents." },
    { icon: "🚗", title: "Vehicle Import Calculator", desc: "URA import duty breakdowns for motor vehicles. Computes import duty, VAT, WHT, infrastructure levy, and age depreciation." },
    { icon: "🧮", title: "Comprehensive Tax Calculators", desc: "PAYE, VAT, Corporate Income Tax, WHT, and General Import Duty. Live, accurate calculations based on current Uganda rates." },
    { icon: "🎓", title: "Professional Intelligence", desc: "Advanced learning hub covering transfer pricing, TAT appeal strategies, cross-border WHT, and URA audit defence (ICPAU CPD-eligible)." },
    { icon: "✅", title: "Compliance Engine", desc: "Structured checklists for eFRIS, VAT, and PAYE. Generates risk reports detailing potential exposure to URA penalties." },
  ];

  const testimonials = [
    { quote: "TaxWise retrieved a crucial TAT precedent in 4 seconds that would have taken me hours to search for manually. It has completely transformed our tribunal preparation.", name: "Sarah Nakato", role: "Senior Tax Consultant, Kampala", initials: "SN", color: "#1A7B6B" },
    { quote: "The vehicle import calculator is incredibly accurate and saves our team massive amounts of time. Client estimates that used to take half a day are now completed instantly.", name: "James Opolot", role: "Customs Agent & Clearing Specialist", initials: "JO", color: "#0F2044" },
    { quote: "We ran our records through the compliance checker before a URA audit. It caught a legacy PAYE discrepancy we had missed. Saved us millions in penalties.", name: "Grace Atim", role: "Finance Manager, Manufacturing Sector", initials: "GA", color: "#C8922A" },
  ];

  const plans = [
    { name: "Starter", price: "Free", period: "Forever", features: ["5 case analyses / month", "Basic TAT library search", "PAYE & VAT calculator tool", "Vehicle import calculator", "Standard email support"], cta: "Get Started Free", popular: false },
    { name: "Professional", price: "UGX 120,000", period: "/ month", features: ["Unlimited case analyses", "Full TAT case library + AI commentary", "All tax & import calculators", "eFRIS, VAT & PAYE Compliance Checker", "Exportable PDF reports for clients", "Priority chat support"], cta: "Start 14-Day Trial", popular: true },
    { name: "Firm", price: "UGX 350,000", period: "/ month", features: ["Everything in Professional", "Up to 8 team seats", "Admin portal & firm usage metrics", "API access (beta program)", "Dedicated account setup", "ICPAU CPD certificates"], cta: "Contact Sales", popular: false },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#FAFAF8", color: "#1C1C1E", lineHeight: 1.6, WebkitFontSmoothing: "antialiased" }}>
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
        .tw-cursor { display: inline-block; width: 8px; height: 1.1em; background: #4DD9C0; vertical-align: text-bottom; animation: blink 1s step-end infinite; }
        .tw-result-anim { animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .tw-feat-card { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .tw-feat-card:hover { border-color: rgba(26,123,107,0.3) !important; box-shadow: 0 16px 36px rgba(15,32,68,0.06); transform: translateY(-4px); }
        .tw-testi { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .tw-testi:hover { box-shadow: 0 16px 40px rgba(15,32,68,0.07); transform: translateY(-2px); }
        .tw-btn-hover:hover { transform: translateY(-1.5px); box-shadow: 0 8px 20px rgba(26,123,107,0.25); }
        .tw-nav-link:hover { color: white !important; }
        .tw-footer-link:hover { color: white !important; text-decoration: underline; }
        .tw-mobile-link:hover { color: rgba(255,255,255,.9) !important; }
        .tw-price-card { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .tw-price-card:hover { transform: translateY(-6px); box-shadow: 0 24px 56px rgba(0,0,0,0.28); }
        
        .glow-border {
          position: relative;
        }
        .glow-border::after {
          content: '';
          position: absolute;
          inset: -1.5px;
          background: linear-gradient(135deg, #4DD9C0, #C8922A);
          border-radius: 15px;
          z-index: -1;
          opacity: 0.7;
          filter: blur(2px);
          transition: opacity 0.3s;
        }
        .glow-border:hover::after {
          opacity: 1;
          filter: blur(4px);
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

      {/* TOP BAR */}
      <div style={{ background: "#0D7C68", padding: "8px 5%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: ".72rem", color: "rgba(255,255,255,.9)", fontWeight: 500, letterSpacing: "0.02em" }}>
        <span>{settings.topbar_text}</span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>📧 {settings.topbar_email}</span>
          <button onClick={onGetStarted} style={{ color: "white", background: "none", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: ".72rem", textDecoration: "underline" }}>Start Free Trial →</button>
        </div>
      </div>

      {/* NAVIGATION */}
      <div style={navStyle}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5%", display: "flex", alignItems: "center", height: 72 }}>
          {/* Logo */}
          <a href="#" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.5rem", color: "white", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: 48, flexShrink: 0, fontWeight: 800 }}>
            <div style={{ width: 10, height: 10, background: "#C8922A", borderRadius: 3, transform: "rotate(45deg)", flexShrink: 0, boxShadow: "0 0 10px rgba(200, 146, 42, 0.5)" }} />
            Tax<span style={{ color: "#4DD9C0" }}>Wise</span>
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
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 16px", height: 72, color: "rgba(255,255,255,.7)", fontSize: ".85rem", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "color .2s", whiteSpace: "nowrap" }}
                >
                  {nav.label} {nav.items && <span style={{ fontSize: ".55rem", opacity: .5, transform: "translateY(0.5px)" }}>▼</span>}
                </button>
                {nav.items && (
                  <div className="tw-dropdown" style={{ position: "absolute", top: "100%", left: 0, background: "white", borderRadius: "0 0 14px 14px", boxShadow: "0 20px 48px rgba(15,32,68,.16)", minWidth: 250, zIndex: 400, borderTop: "3px solid #1A7B6B", padding: "10px" }}>
                    {nav.items.map((item) => (
                      <button key={item} onClick={() => {
                        const pageId = itemToPageMap[item];
                        if (pageId && onNavigate) {
                          onNavigate(pageId);
                        } else {
                          onGetStarted();
                        }
                      }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 600, color: "#1C1C1E", transition: "background .15s" }}
                        onMouseOver={e => (e.currentTarget.style.background = "#F8F7F4")}
                        onMouseOut={e => (e.currentTarget.style.background = "none")}>
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Nav Actions */}
          <div className="tw-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 18, marginLeft: "auto" }}>
            <button onClick={onSignIn} className="tw-nav-link" style={{ color: "rgba(255,255,255,.7)", fontSize: ".85rem", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "color .2s" }}>Sign In</button>
            <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "linear-gradient(135deg, #1A7B6B 0%, #155f52 100%)", color: "white", padding: "9px 20px", borderRadius: 8, fontSize: ".85rem", fontWeight: 700, border: "none", cursor: "pointer", transition: "all .2s cubic-bezier(0.16, 1, 0.3, 1)", whiteSpace: "nowrap", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(26,123,107,0.2)" }}>Start Free Trial</button>
          </div>

          {/* Mobile Menu Icon */}
          <button className="tw-hamburger" onClick={() => setMobileOpen(v => !v)} style={{ display: "none", flexDirection: "column", gap: 5, cursor: "pointer", padding: 8, background: "none", border: "none", marginLeft: "auto" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 22, height: 2, background: "rgba(255,255,255,.8)", borderRadius: 2 }} />)}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div style={{ background: "#0C1B36", borderTop: "1px solid rgba(255,255,255,.08)", padding: "16px 5%", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
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
            <button onClick={() => { setMobileOpen(false); onGetStarted(); }} style={{ display: "block", padding: "12px 0", color: "#4DD9C0", background: "none", border: "none", fontSize: ".92rem", fontWeight: 700, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>→ Start Free Trial</button>
          </div>
        )}
      </div>

      {/* HERO SECTION CONTAINER */}
      <div style={{ background: "radial-gradient(circle at 75% 25%, #162C54 0%, #0C1B36 100%)", position: "relative", overflow: "hidden" }}>
        {/* Background mesh grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)", backgroundSize: "24px 24px", opacity: 0.75 }} />

        {/* HERO HERO SECTION */}
        <div className="tw-hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "168px 5% 96px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "center", position: "relative", zIndex: 10 }}>
          <div className="tw-hero-text-align">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontSize: ".72rem", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 50, marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, background: "#4DD9C0", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #4DD9C0" }} />
              {settings.hero_badge_text}
            </div>
            
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2.2rem, 4.2vw, 3.6rem)", color: "white", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-0.025em", fontWeight: 700 }}>
              {settings.hero_title_line1}<br />
              {settings.hero_title_line2}<br />
              <span style={{ fontStyle: "italic", color: "#4DD9C0" }}>{settings.hero_title_line3}</span>
            </h1>
            
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
              {settings.hero_subtitle}
            </p>
            
            <div className="tw-hero-ctas" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
              <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "linear-gradient(135deg, #1A7B6B 0%, #155f52 100%)", color: "white", padding: "14px 28px", borderRadius: 8, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all .25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(26,123,107,0.35)" }}>
                Start 14-Day Free Trial →
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "rgba(255,255,255,0.04)", color: "white", padding: "14px 28px", borderRadius: 8, fontWeight: 700, fontSize: ".925rem", border: "1px solid rgba(255,255,255,.2)", cursor: "pointer", transition: "all .25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit" }}
                onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
                onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                See All Features
              </button>
            </div>

            <div className="tw-hero-checklists" style={{ display: "flex", alignItems: "center", gap: 18, fontSize: ".76rem", color: "rgba(255,255,255,.5)", flexWrap: "wrap" }}>
              {["No credit card required", "URA, TAT & eFRIS covered", "CPD-eligible learning modules"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#4DD9C0", fontWeight: 700 }}>✓</span>{t}
                </span>
              ))}
            </div>
          </div>

          {/* Terminal Mockup Card */}
          <div style={{ background: "rgba(10, 22, 40, 0.8)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.45), 0 0 40px rgba(77, 217, 192, 0.08)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
            <div style={{ background: "rgba(20, 31, 53, 0.6)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ marginLeft: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: ".7rem", color: "rgba(255,255,255,.45)", fontWeight: 500 }}>taxwise-engine v1.2</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: ".65rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 8 }}>Input Case Excerpt</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: ".82rem", color: "rgba(255,255,255,.85)", lineHeight: 1.6, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 18, minHeight: 90 }}>
                {heroText}<span className="tw-cursor" />
              </div>
              
              {showResult && (
                <div className="tw-result-anim">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".76rem", color: "#4DD9C0", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16, fontWeight: 500 }}>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: "0.9rem" }}>⟳</span> Analysis Complete
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#4DD9C0", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Structured Summary</div>
                    <p style={{ fontSize: ".82rem", color: "rgba(255,255,255,.75)", lineHeight: 1.55 }}>TAT dismissed the appeal for lack of jurisdiction: the taxpayer filed 45 days after URA&apos;s objection decision, exceeding the mandatory 30-day window under Sec 14 of the TAT Act.</p>
                  </div>
                  <div style={{ background: "rgba(200,146,42,.12)", borderLeft: "3.5px solid #C8922A", padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: ".82rem", color: "rgba(255,255,255,.85)", marginBottom: 14, fontWeight: 500 }}>
                    Outcome: Appeal Dismissed. UGX 48M assessment stands.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ background: "rgba(220,38,38,.16)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,.2)", fontSize: ".7rem", fontWeight: 700, padding: "4px 10px", borderRadius: 50, letterSpacing: "0.02em" }}>HIGH RISK</span>
                    {["30-Day Limit", "Statutory Deadline", "Jurisdiction"].map(t => (
                      <span key={t} style={{ fontSize: ".7rem", fontWeight: 500, padding: "4px 10px", borderRadius: 50, background: "rgba(26,123,107,.16)", color: "#4DD9C0", border: "1px solid rgba(26,123,107,.2)", fontFamily: "'JetBrains Mono', monospace" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATS SECTION — values controlled via Admin > Site Settings */}
      <div style={{ background: "#0C1B36", borderTop: "1px solid rgba(255,255,255,.05)", position: "relative" }}>
        <div className="tw-stats-grid" style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 5%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[
            [settings.stat_cases, "Cases Analyzed"],
            [settings.stat_time_saved, "Time Saved vs Manual"],
            [settings.stat_practitioners, "Active Practitioners"],
            [settings.stat_calculators, "Live Tax Calculators"],
          ].map(([num, desc], i, arr) => (
            <div key={desc} style={{ padding: "0 10px", textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.4rem", color: "white", fontWeight: 700 }}>
                {num}
              </div>
              <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", marginTop: 6, fontWeight: 500 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES SECTION */}
      <section id="features" style={{ padding: "96px 5%", background: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1A7B6B", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12 }}>Platform Capabilities</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#0F2044", marginBottom: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>Every tool a Uganda tax expert needs</h2>
            <p style={{ color: "#6B7280", maxWidth: 580, margin: "0 auto", lineHeight: 1.7, fontSize: ".95rem", fontWeight: 500 }}>Tailored specifically for Uganda&apos;s tax and customs regulations. Streamline operations and secure advisory compliance.</p>
          </div>
          
          <div className="tw-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {features.map(f => (
              <div key={f.title} className="tw-feat-card" style={{ border: "1px solid rgba(15, 32, 68, 0.08)", borderRadius: 16, padding: 28, background: "white", cursor: "pointer", boxShadow: "0 4px 20px rgba(15, 32, 68, 0.02)" }} onClick={onGetStarted}>
                <div style={{ width: 44, height: 44, background: "#E6F5F2", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: 18, boxShadow: "0 2px 8px rgba(26,123,107,0.06)" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0F2044", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: ".84rem", color: "#6B7280", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "96px 5%", background: "#FAFAF8", borderTop: "1px solid rgba(15, 32, 68, 0.04)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1A7B6B", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12 }}>User Workflow</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#0F2044", fontWeight: 700, letterSpacing: "-0.02em" }}>Legal intelligence in three simple steps</h2>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
            {[
              { step: "01", icon: "📄", title: "Upload or paste your case", desc: "Upload a TAT ruling PDF, paste a URA assessment, or describe your scenario. We accept all text structures." },
              { step: "02", icon: "🤖", title: "AI analyzes in 30 seconds", desc: "The engine references Uganda tax acts, TAT precedents, and URA practice notes to deliver an interactive report." },
              { step: "03", icon: "📈", title: "Act on structured findings", desc: "Download a clean report detailing risk level, precedents, applicable rules, and next steps. Ready for clients." },
            ].map(s => (
              <div key={s.step} style={{ position: "relative" }}>
                <div style={{ fontSize: "3.2rem", fontFamily: "'Playfair Display', Georgia, serif", color: "#B6E5DC", fontWeight: 800, lineHeight: 1, marginBottom: 14 }}>{s.step}</div>
                <div style={{ fontSize: "1.6rem", marginBottom: 14 }}>{s.icon}</div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2044", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: ".875rem", color: "#6B7280", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section style={{ padding: "96px 5%", background: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1A7B6B", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12 }}>Practitioner Trust</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "#0F2044", fontWeight: 700, letterSpacing: "-0.02em" }}>Used by Uganda&apos;s tax community</h2>
          </div>
          
          <div className="tw-testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {testimonials.map(t => (
              <div key={t.name} className="tw-testi" style={{ background: "white", border: "1px solid rgba(15, 32, 68, 0.08)", borderRadius: 16, padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 4px 16px rgba(15, 32, 68, 0.01)" }}>
                <div>
                  <div style={{ color: "#C8922A", fontSize: ".8rem", marginBottom: 16, letterSpacing: 2 }}>★★★★★</div>
                  <blockquote style={{ fontSize: ".875rem", color: "#1C1C1E", lineHeight: 1.7, marginBottom: 24, fontStyle: "italic", fontWeight: 400 }}>&ldquo;{t.quote}&rdquo;</blockquote>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 700, color: "white", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: ".875rem", fontWeight: 700, color: "#0F2044" }}>{t.name}</div>
                    <div style={{ fontSize: ".75rem", color: "#6B7280", fontWeight: 500 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: "96px 5%", background: "#0C1B36", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#C8922A", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 12 }}>Transparent Subscriptions</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "white", marginBottom: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Choose the right plan for your firm</h2>
            <p style={{ color: "rgba(255,255,255,.45)", lineHeight: 1.6, fontSize: ".95rem", maxWidth: 500, margin: "0 auto", fontWeight: 500 }}>Start free, upgrade as your client base scales. Billing in Uganda Shillings (UGX).</p>
          </div>
          
          <div className="tw-price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch" }}>
            {plans.map(plan => (
              <div key={plan.name} className={`tw-price-card ${plan.popular ? 'glow-border' : ''}`} style={{ background: plan.popular ? "#1A7B6B" : "rgba(255,255,255,0.04)", border: plan.popular ? "none" : "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "32px 28px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {plan.popular && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#C8922A", color: "white", fontSize: ".68rem", fontWeight: 800, padding: "4px 14px", borderRadius: 50, whiteSpace: "nowrap", letterSpacing: "0.04em", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>MOST POPULAR</div>}
                  <div style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: plan.popular ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,.4)", marginBottom: 10 }}>{plan.name}</div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.4rem", color: "white", fontWeight: 700 }}>{plan.price}</div>
                  <div style={{ fontSize: ".8rem", color: plan.popular ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,.35)", marginBottom: 24, fontWeight: 500 }}>{plan.period}</div>
                  <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,.12)", margin: "20px 0" }} />
                  
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ fontSize: ".85rem", color: "rgba(255,255,255,.85)", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.4, fontWeight: 500 }}>
                        <span style={{ color: plan.popular ? "#FFE08A" : "#C8922A", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button onClick={onGetStarted} style={{ display: "block", width: "100%", textAlign: "center", padding: "12px", borderRadius: 8, fontWeight: 700, fontSize: ".88rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", border: plan.popular ? "none" : "1.5px solid rgba(255,255,255,.25)", color: plan.popular ? "#1A7B6B" : "white", background: plan.popular ? "white" : "transparent" }}
                  onMouseOver={e => { 
                    if (!plan.popular) e.currentTarget.style.background = "rgba(255,255,255,.08)";
                    else e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseOut={e => { 
                    if (!plan.popular) e.currentTarget.style.background = "transparent";
                    else e.currentTarget.style.transform = "none";
                  }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, flexWrap: "wrap", gap: 14 }}>
            <span style={{ fontSize: ".82rem", color: "rgba(255,255,255,.45)", fontWeight: 500 }}>Flexible Local Payments Integrated</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["MTN Mobile Money", "Airtel Money", "Visa / Mastercard", "Electronic Bank Transfer"].map(m => (
                <span key={m} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 12px", fontSize: ".72rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: "80px 5%", background: "linear-gradient(135deg, #1A7B6B 0%, #11564A 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.5 }} />
        
        <div style={{ maxWidth: 750, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 10 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)", color: "white", marginBottom: 18, fontWeight: 700 }}>Ready to upgrade your practice?</h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem", lineHeight: 1.7, marginBottom: 36, fontWeight: 500 }}>Join leading tax firms and corporate finance departments saving hours every week. Try our full suite free.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onGetStarted} className="tw-btn-hover" style={{ background: "white", color: "#1A7B6B", padding: "14px 30px", borderRadius: 8, fontWeight: 700, fontSize: ".925rem", border: "none", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>Create Free Account →</button>
            <button onClick={onSignIn} style={{ background: "transparent", color: "white", padding: "14px 30px", borderRadius: 8, fontWeight: 700, fontSize: ".925rem", border: "1px solid rgba(255,255,255,.4)", cursor: "pointer", fontFamily: "inherit" }}
              onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0C1B36", padding: "64px 5% 32px", borderTop: "1px solid rgba(255,255,255,.05)", position: "relative" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div className="tw-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.45rem", color: "white", marginBottom: 12, fontWeight: 800 }}>Tax<span style={{ color: "#4DD9C0" }}>Wise</span></div>
              <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.6, maxWidth: 220, marginBottom: 16 }}>Uganda&apos;s professional tax intelligence engine. Designed for tax consultants, accountants, and customs brokers.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", padding: "5px 12px", borderRadius: 50, fontSize: ".68rem", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>🏛️ ICPAU CPD-Eligible</div>
            </div>
            {[
              { heading: "Products", links: ["Case Analyzer", "Compliance Check", "TAT Precedents", "Client Reports"] },
              { heading: "Calculators", links: ["PAYE Calculator", "VAT Calculator", "WHT Rates Tool", "Import Duty"] },
              { heading: "Company", links: ["About Us", "Pricing Plans", "Legal Blog", "Contact Us"] },
              { heading: "Support", links: ["Knowledge Base", "hello@taxwise.cloud", "Privacy Policy", "Terms of Use"] },
            ].map(col => (
              <div key={col.heading}>
                <h5 style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 16 }}>{col.heading}</h5>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(link => (
                    <li key={link}>
                      <button onClick={onGetStarted} className="tw-footer-link" style={{ color: "rgba(255,255,255,.55)", fontSize: ".82rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color .2s", textAlign: "left", fontWeight: 500 }}>{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".74rem", color: "rgba(255,255,255,.35)", flexWrap: "wrap", gap: 12, fontWeight: 500 }}>
            <span>© 2026 TaxWise Uganda. All rights reserved.</span>
            <span>Complying with URA, eFRIS, and VAT statutory regulations.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
