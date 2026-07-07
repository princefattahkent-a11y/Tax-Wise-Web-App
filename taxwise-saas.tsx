import { useState, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  navy: "#0F2044", navyLight: "#1a3260",
  teal: "#1A7B6B", tealLight: "#E6F5F2", tealDark: "#155f52",
  gold: "#C8922A", goldLight: "#FEF3CD",
  white: "#FFFFFF", offwhite: "#F8F7F4",
  border: "#E5E7EB", muted: "#6B7280", text: "#1C1C1E",
  red: "#DC2626", redLight: "#FEE2E2",
  green: "#16A34A", greenLight: "#DCFCE7",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TAT_CASES = [
  { id: 1, title: "Edward Mwanje v Uganda Revenue Authority", ref: "TAT No. 145 of 2025", type: "Jurisdiction", outcome: "Dismissed", year: 2025, summary: "Appeal dismissed for lack of jurisdiction. Taxpayer filed 45 days after URA assessment notice, exceeding the mandatory 30-day filing window under Section 14 of the TAT Act.", tags: ["30-Day Rule", "Jurisdiction", "Late Filing"] },
  { id: 2, title: "Kampala Hardware Ltd v URA", ref: "TAT No. 112 of 2024", type: "VAT", outcome: "Allowed", year: 2024, summary: "Tribunal ruled in favour of taxpayer on input VAT claims for capital equipment imported for manufacturing. URA's denial of credits was found to be inconsistent with the VAT Act provisions.", tags: ["Input VAT", "Capital Equipment", "Manufacturing"] },
  { id: 3, title: "Grace Tumwine v Commissioner General", ref: "TAT No. 089 of 2024", type: "Income Tax", outcome: "Partial", year: 2024, summary: "Partial relief granted. Tribunal upheld URA's assessment on business income but struck down penalties imposed without proper notice under Section 52 of the Income Tax Act.", tags: ["Income Tax", "Penalties", "Section 52"] },
  { id: 4, title: "Nile Breweries Ltd v URA", ref: "TAT No. 067 of 2023", type: "Excise Duty", outcome: "Dismissed", year: 2023, summary: "Appeal dismissed. Tribunal found that excise duty on locally manufactured beverages was correctly applied. Taxpayer's argument on discriminatory treatment was not supported by evidence.", tags: ["Excise Duty", "Manufacturing", "Beverages"] },
  { id: 5, title: "MTN Uganda v Commissioner Domestic Taxes", ref: "TAT No. 201 of 2024", type: "WHT", outcome: "Allowed", year: 2024, summary: "Withholding tax on cross-border digital services set aside. Tribunal found URA failed to issue proper notice and the assessment was statute-barred under the 5-year limitation rule.", tags: ["Withholding Tax", "Digital Services", "Statute Barred"] },
  { id: 6, title: "Kiboga Farmers Cooperative v URA", ref: "TAT No. 033 of 2023", type: "PAYE", outcome: "Partial", year: 2023, summary: "PAYE assessment partially upheld. Seasonal workers found to be employees for tax purposes, but penalties reduced due to taxpayer's good faith reliance on professional advice.", tags: ["PAYE", "Casual Workers", "Penalties Reduced"] },
];

const COURSES = [
  {
    id: 1, level: "Beginner", emoji: "📘", color: C.tealLight, accentColor: C.teal,
    title: "Uganda Tax Fundamentals", duration: "3 hrs", modules: 8,
    desc: "Master Income Tax, VAT, PAYE, and withholding tax from scratch. Built for new business owners and accounting students.",
    lessons: [
      { id: "1a", title: "Introduction to Uganda's Tax System", duration: "15 min", content: "Uganda's tax system is administered by the Uganda Revenue Authority (URA), established under the Uganda Revenue Authority Act, Cap 196. The main taxes include: **Income Tax** (governed by the Income Tax Act, Cap 340), **Value Added Tax** (VAT Act, Cap 349), **Pay As You Earn** (PAYE — a form of Income Tax), **Withholding Tax**, and **Excise Duty**.\n\nThe URA is divided into the Domestic Taxes Department (handling income tax, VAT, PAYE) and the Customs Department (handling import/export duties).\n\n**Key Principle:** Tax is a legal obligation. Every person earning income above the threshold, every registered business, and every employer must comply with Uganda's tax laws or face penalties and interest." },
      { id: "1b", title: "Income Tax — Who Pays & How Much", duration: "20 min", content: "**Individual Income Tax** applies to all income earned by residents and non-residents from Ugandan sources. Rates for individuals (2024/25):\n\n- Income up to UGX 2,820,000/year: **0% (exempt)**\n- UGX 2,820,001 – 4,920,000: **10%**\n- UGX 4,920,001 – 120,000,000: **20%**\n- Above UGX 120,000,000: **30%**\n\n**Corporate Tax** is charged at **30%** of chargeable income for resident companies. Agribusiness companies enjoy a reduced rate of **25%**.\n\n**Filing:** Individual tax returns are due by **30 June** each year. Corporate returns are due **6 months** after the end of the accounting period." },
      { id: "1c", title: "VAT — Registration, Rates & Filing", duration: "25 min", content: "**VAT Registration** is mandatory when taxable turnover exceeds **UGX 150 million** in any 12-month period. Voluntary registration is allowed below this threshold.\n\n**VAT Rates:**\n- Standard rate: **18%** on most goods and services\n- Zero-rated (0%): Exports, some foodstuffs, educational materials\n- Exempt: Medical services, financial services, residential accommodation\n\n**Input VAT:** Registered taxpayers can claim back VAT paid on business purchases (input tax) against VAT collected on sales (output tax). The difference is either paid to URA or refunded.\n\n**Filing:** VAT returns are due on the **15th of the following month**. Late filing attracts a penalty of **2% per month** on the outstanding tax." },
      { id: "1d", title: "PAYE — Employer Obligations", duration: "20 min", content: "**PAYE (Pay As You Earn)** requires every employer to deduct income tax from employees' salaries and remit to URA by the **15th of the following month**.\n\n**Employer Duties:**\n1. Register with URA as an employer\n2. Obtain Tax Identification Numbers (TINs) for all employees\n3. Calculate tax on gross pay minus allowable deductions\n4. Deduct NSSF (10% employee, 10% employer)\n5. File PAYE return and pay by the 15th\n\n**Key Risk:** Failure to deduct and remit PAYE makes the **employer personally liable** for the tax plus 2% monthly interest plus penalties up to 20% of the tax due." },
    ]
  },
  {
    id: 2, level: "Intermediate", emoji: "⚖️", color: C.goldLight, accentColor: C.gold,
    title: "TAT Appeals: Process & Strategy", duration: "4 hrs", modules: 6,
    desc: "Master the Tax Appeals Tribunal process — from objections to appeals, jurisdiction rules, and building a winning case.",
    lessons: [
      { id: "2a", title: "The TAT — Structure & Jurisdiction", duration: "20 min", content: "The **Tax Appeals Tribunal (TAT)** was established under the Tax Appeals Tribunal Act, Cap 345. It provides an independent forum for taxpayers to challenge URA decisions without going to the High Court first.\n\n**Jurisdiction:** The TAT hears appeals against:\n- URA assessments and amended assessments\n- Refusal to grant refunds\n- Penalties and interest charges\n- Decisions on objections\n\n**Composition:** The TAT consists of a Chairperson (must be an advocate of 10+ years), Deputy Chairperson, and members appointed by the Minister of Finance.\n\n**Critical Limitation:** The TAT **cannot** hear matters where no objection was first filed with URA, or where the 30-day filing window has lapsed." },
      { id: "2b", title: "The 30-Day Rule — Uganda's Most Critical Tax Deadline", duration: "25 min", content: "**Section 14 of the TAT Act** requires that any appeal must be filed **within 30 days** of receiving URA's objection decision.\n\n**This is the most litigated issue in Uganda tax law.** Missing this deadline means:\n1. The TAT has **no jurisdiction** to hear your appeal\n2. The case will be **dismissed** regardless of its merits\n3. You lose the right to challenge the assessment at TAT level\n\n**Case Study — Edward Mwanje v URA (TAT No. 145/2025):** The taxpayer filed 45 days after receiving URA's objection decision. The TAT dismissed the appeal for lack of jurisdiction. The merits of the case were never considered.\n\n**Practical Tips:**\n- Diarise the deadline the day you receive URA's decision\n- File even a basic notice of appeal to preserve jurisdiction\n- Always request an acknowledgement of receipt from TAT" },
      { id: "2c", title: "Filing an Objection with URA", duration: "20 min", content: "Before going to TAT, you must first file an **objection with URA**. This is a mandatory pre-condition.\n\n**Objection Requirements (Section 101, Income Tax Act):**\n- Filed within **45 days** of receiving the assessment\n- Must state the **grounds of objection** in detail\n- Must be in **writing** addressed to the Commissioner\n- Must include all supporting documents\n\n**URA's Response:** URA must issue an objection decision within **90 days**. If they fail to respond within 90 days, the taxpayer may proceed directly to TAT treating the silence as a deemed refusal.\n\n**Deposit Requirement:** Where the assessment is above UGX 50 million, URA may require a deposit of **30% of the disputed tax** before the objection is heard." },
    ]
  },
  {
    id: 3, level: "Professional", emoji: "🖥️", color: "#E8EDF5", accentColor: C.navy,
    title: "URA eFRIS Mastery", duration: "2.5 hrs", modules: 5,
    desc: "Complete compliance guide for Uganda's Electronic Fiscal Receipting & Invoicing System. For tax agents and business owners.",
    lessons: [
      { id: "3a", title: "What is eFRIS and Who Must Use It", duration: "15 min", content: "**eFRIS (Electronic Fiscal Receipting and Invoicing Solution)** is URA's system requiring businesses to issue electronic receipts for all taxable sales. It was rolled out in phases starting 2021.\n\n**Who Must Comply:**\n- All VAT-registered taxpayers\n- Businesses with turnover above UGX 50 million\n- Hotels, supermarkets, fuel stations, pharmacies (regardless of turnover)\n- Any business directed by URA to adopt eFRIS\n\n**How It Works:** A fiscal device (Electronic Receipting Device — ERD) is connected to your point of sale. Every sale is transmitted in real-time to URA's central server and a QR-coded fiscal receipt is issued to the customer.\n\n**Non-Compliance Penalties:** Failure to issue fiscal receipts attracts a penalty of **UGX 2 million per day** of non-compliance." },
      { id: "3b", title: "eFRIS Registration & Setup", duration: "20 min", content: "**Step-by-Step eFRIS Registration:**\n\n1. Log in to URA's TaxPro system (efris.ura.go.ug)\n2. Navigate to eFRIS → Business Registration\n3. Enter your TIN, business name, and branch details\n4. Select your ERD type (integrated VSDC or web-based)\n5. Submit and await URA approval (typically 2-5 business days)\n6. Collect or configure your fiscal device\n7. Test with URA before going live\n\n**Device Types:**\n- **VSDC (Virtual Sales Data Controller):** Software installed on your POS system\n- **Physical ERD:** Hardware device for businesses without POS software\n- **Web-based eFRIS:** Direct web interface for low-volume businesses\n\n**Important:** All devices must be activated by URA before first use. Do not issue receipts on unactivated devices." },
    ]
  }
];

const COMPLIANCE_ITEMS = {
  efris: [
    { id: "e1", text: "Business registered on eFRIS portal (efris.ura.go.ug)", risk: "high" },
    { id: "e2", text: "Fiscal device (ERD/VSDC) approved and activated by URA", risk: "high" },
    { id: "e3", text: "All sales issued with QR-coded fiscal receipts", risk: "high" },
    { id: "e4", text: "eFRIS device connected to internet / transmitting to URA servers", risk: "high" },
    { id: "e5", text: "Staff trained on how to issue eFRIS receipts correctly", risk: "medium" },
    { id: "e6", text: "Backup receipting procedure in place for internet outages", risk: "medium" },
    { id: "e7", text: "Monthly reconciliation of eFRIS receipts vs sales records", risk: "medium" },
    { id: "e8", text: "Customer complaints log for receipt issues maintained", risk: "low" },
  ],
  vat: [
    { id: "v1", text: "VAT registration certificate obtained from URA", risk: "high" },
    { id: "v2", text: "Monthly VAT return filed by 15th of following month", risk: "high" },
    { id: "v3", text: "Output VAT correctly charged at 18% on all standard-rated supplies", risk: "high" },
    { id: "v4", text: "Input VAT claims supported by valid tax invoices", risk: "high" },
    { id: "v5", text: "Zero-rated and exempt supplies identified and documented", risk: "medium" },
    { id: "v6", text: "VAT on imports accounted for (import VAT declarations)", risk: "medium" },
    { id: "v7", text: "Reverse charge VAT applied on imported services", risk: "medium" },
    { id: "v8", text: "VAT refund claims filed within 6 months of over-payment", risk: "low" },
  ],
  paye: [
    { id: "p1", text: "All employees registered with URA and have valid TINs", risk: "high" },
    { id: "p2", text: "PAYE calculated correctly on gross pay using current tax bands", risk: "high" },
    { id: "p3", text: "PAYE remitted to URA by 15th of following month", risk: "high" },
    { id: "p4", text: "NSSF deducted (10% employee + 10% employer) and remitted", risk: "high" },
    { id: "p5", text: "Monthly PAYE return (Form 5) filed with URA", risk: "high" },
    { id: "p6", text: "P9 forms (annual tax summaries) issued to all employees by June 30", risk: "medium" },
    { id: "p7", text: "Casual/contract workers assessed for employed vs self-employed status", risk: "medium" },
    { id: "p8", text: "Benefits in kind (company car, housing) included in taxable pay", risk: "medium" },
  ]
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const callClaude = async (systemPrompt, userMessage) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  const data = await res.json();
  return data.content?.map(i => i.text || "").join("") || "";
};

const riskColors = { high: [C.red, C.redLight], medium: [C.gold, C.goldLight], low: [C.teal, C.tealLight] };

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
const Badge = ({ color, bg, children }) => (
  <span style={{ background: bg, color, fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-block" }}>{children}</span>
);

const Button = ({ onClick, children, variant = "primary", small, disabled, style = {} }) => {
  const base = { border: "none", borderRadius: 8, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transition: "all .15s", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, ...style };
  const variants = {
    primary: { background: C.teal, color: C.white, padding: small ? "7px 16px" : "10px 22px", fontSize: small ? "0.8rem" : "0.9rem" },
    outline: { background: "transparent", color: C.navy, border: `2px solid ${C.navy}`, padding: small ? "5px 14px" : "8px 20px", fontSize: small ? "0.8rem" : "0.9rem" },
    ghost: { background: "transparent", color: C.muted, padding: small ? "5px 10px" : "8px 14px", fontSize: "0.85rem" },
    danger: { background: C.red, color: C.white, padding: "8px 18px", fontSize: "0.875rem" },
    gold: { background: C.gold, color: C.white, padding: small ? "7px 16px" : "10px 22px", fontSize: small ? "0.8rem" : "0.9rem" },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Card = ({ children, style = {}, hover }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => hover && setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: hov ? "0 8px 28px rgba(15,32,68,.1)" : "0 2px 8px rgba(15,32,68,.04)", transform: hov ? "translateY(-2px)" : "none", transition: "all .2s", ...style }}>
      {children}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,32,68,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: C.navy, fontSize: "1rem" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: C.navy, marginBottom: 6 }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", background: C.offwhite, color: C.text, boxSizing: "border-box" }} />
  </div>
);

// ─── PAGES ────────────────────────────────────────────────────────────────────

// LOGIN / SIGNUP
const AuthPage = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Tax Consultant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!email || !password) return setError("Please fill in all fields.");
    if (mode === "signup" && !name) return setError("Please enter your name.");
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    onLogin({ name: name || email.split("@")[0], email, role });
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, #1a3260 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "2rem", color: C.white, fontWeight: 800 }}>Tax<span style={{ color: C.teal }}>Wise</span></div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: "0.85rem", marginTop: 6 }}>Uganda&apos;s AI Tax Platform</div>
        </div>
        <Card style={{ padding: 32 }}>
          <div style={{ display: "flex", marginBottom: 24, background: C.offwhite, borderRadius: 8, padding: 4 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", background: mode === m ? C.white : "transparent", color: mode === m ? C.navy : C.muted, transition: "all .15s", fontFamily: "inherit", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
          {mode === "signup" && <Input label="Full Name" value={name} onChange={setName} placeholder="e.g. Ronald Kakembo" required />}
          <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
          <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: C.navy, marginBottom: 6 }}>Your Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text }}>
                {["Tax Consultant", "Accountant", "Tax Lawyer", "Finance Manager", "Business Owner", "Student"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}
          {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", marginBottom: 16 }}>{error}</div>}
          <Button onClick={handle} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "⟳ Please wait..." : mode === "login" ? "Sign In →" : "Create My Account →"}
          </Button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: "0.78rem", color: C.muted }}>
            {mode === "login" ? "Demo: use any email + password" : "Free 14-day trial. No credit card needed."}
          </div>
        </Card>
      </div>
    </div>
  );
};

// DASHBOARD
const Dashboard = ({ user, onNavigate }) => {
  const stats = [
    { label: "Cases Analyzed", value: "12", icon: "⚖️", color: C.teal },
    { label: "Reports Generated", value: "5", icon: "📄", color: C.navy },
    { label: "Lessons Completed", value: "8", icon: "🎓", color: C.gold },
    { label: "Compliance Score", value: "94%", icon: "✅", color: C.green },
  ];
  const recent = [
    { title: "MTN Uganda v Commissioner Domestic Taxes", time: "2 hours ago", type: "Case Analysis" },
    { title: "VAT Compliance Checklist — Q2 2025", time: "Yesterday", type: "Compliance" },
    { title: "TAT Appeals: The 30-Day Rule", time: "2 days ago", type: "Education" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 4 }}>Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p style={{ color: C.muted, fontSize: "0.9rem" }}>Here&apos;s what&apos;s happening with your TaxWise account.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>Quick Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "📄 Analyze a New Case", page: "analyzer" },
              { label: "📚 Continue Learning", page: "education" },
              { label: "🔍 Search TAT Cases", page: "library" },
              { label: "✅ Run Compliance Check", page: "compliance" },
            ].map(a => (
              <button key={a.label} onClick={() => onNavigate(a.page)} style={{ background: C.offwhite, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", textAlign: "left", fontSize: "0.875rem", color: C.navy, fontWeight: 600, cursor: "pointer", transition: "background .15s", fontFamily: "inherit" }}>
                {a.label}
              </button>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recent.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.navy }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{r.type} · {r.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// CASE ANALYZER (with PDF upload)
const CaseAnalyzer = () => {
  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState("TAT Ruling");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [reports, setReports] = useState([]);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(`[PDF Content Extracted from: ${file.name}]\n\nThis document has been uploaded for analysis. In the full production version, PDF text is extracted server-side using pdf-parse. For this demo, please also paste key excerpts below to enable AI analysis.`);
    reader.readAsArrayBuffer(file);
  };

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const raw = await callClaude(
        `You are TaxWise, an AI specializing in Uganda tax law (URA, TAT, Income Tax Act, VAT Act, PAYE, eFRIS). Analyze the case/scenario. Respond ONLY in valid JSON, no backticks:\n{"summary":"2-3 sentence plain summary","keyIssues":["issue1","issue2","issue3"],"verdict":"outcome or likely outcome","risk":"low|medium|high","riskNote":"one sentence on key risk","tags":["tag1","tag2","tag3"],"advice":"2-3 sentences of practical advice for the taxpayer or professional","applicableLaw":["Act Section 1","Act Section 2"]}`,
        `Case Type: ${caseType}\n\n${text}`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setReports(r => [{ id: Date.now(), title: text.slice(0, 60) + "...", type: caseType, result: parsed, date: new Date().toLocaleDateString() }, ...r]);
    } catch {
      setResult({ error: true });
    }
    setLoading(false);
  };

  const downloadReport = () => {
    if (!result || result.error) return;
    const content = `TAXWISE CASE ANALYSIS REPORT\n${"=".repeat(50)}\nGenerated: ${new Date().toLocaleString()}\nCase Type: ${caseType}\n\nSUMMARY\n${result.summary}\n\nKEY LEGAL ISSUES\n${result.keyIssues.map((i, n) => `${n + 1}. ${i}`).join("\n")}\n\nVERDICT / OUTCOME\n${result.verdict}\n\nRISK LEVEL: ${result.risk?.toUpperCase()}\n${result.riskNote}\n\nPRACTICAL ADVICE\n${result.advice}\n\nAPPLICABLE LAW\n${result.applicableLaw?.join("\n")}\n\nTAGS: ${result.tags?.join(", ")}\n\n${"=".repeat(50)}\nPowered by TaxWise Uganda | taxwise.cloud`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "taxwise-case-report.txt"; a.click();
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>Case Analyzer</h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>Paste case text or upload a PDF. AI delivers a structured legal summary in seconds.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>📄 Input</div>

          {/* PDF Upload */}
          <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", marginBottom: 14, background: fileName ? C.tealLight : C.offwhite, transition: "background .15s" }}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
            <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📎</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: fileName ? C.teal : C.muted }}>{fileName || "Click to upload PDF, DOC, or TXT"}</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3 }}>or drag & drop your case document</div>
          </div>

          <div style={{ textAlign: "center", color: C.muted, fontSize: "0.8rem", marginBottom: 12 }}>— or paste text directly —</div>

          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the full text of a TAT ruling, URA assessment letter, or describe a tax scenario in detail..." style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, fontSize: "0.85rem", fontFamily: "inherit", resize: "vertical", minHeight: 180, outline: "none", background: C.offwhite, boxSizing: "border-box", color: C.text }} />

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <select value={caseType} onChange={e => setCaseType(e.target.value)} style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: "0.85rem", fontFamily: "inherit", background: C.white }}>
              {["TAT Ruling", "URA Assessment", "Income Tax", "VAT Dispute", "PAYE Issue", "eFRIS Compliance", "General Scenario"].map(t => <option key={t}>{t}</option>)}
            </select>
            <Button onClick={analyze} disabled={loading || !text.trim()}>
              {loading ? "⟳ Analyzing..." : "Analyze →"}
            </Button>
          </div>
        </Card>

        <Card style={{ padding: 24, minHeight: 380 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.navy }}>✦ AI Analysis</div>
            {result && !result.error && <Button onClick={downloadReport} small variant="outline">⬇ Download Report</Button>}
          </div>

          {!result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, color: C.muted, gap: 8 }}>
              <div style={{ fontSize: "2.5rem", opacity: .3 }}>📋</div>
              <div style={{ fontSize: "0.875rem" }}>Analysis appears here</div>
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, gap: 12 }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⟳</div>
              <div style={{ fontSize: "0.875rem", color: C.muted }}>Reading and analyzing case...</div>
            </div>
          )}
          {result && result.error && <div style={{ color: C.red, fontSize: "0.875rem" }}>Analysis failed. Please check your input and try again.</div>}
          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Summary</div><p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>{result.summary}</p></div>
              <div><div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Key Issues</div>{result.keyIssues?.map((i, n) => <div key={n} style={{ fontSize: "0.85rem", color: C.text, marginBottom: 4 }}>• {i}</div>)}</div>
              <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 12, background: C.goldLight, borderRadius: "0 8px 8px 0", padding: "10px 14px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>Verdict</div>
                <div style={{ fontSize: "0.875rem", color: C.text }}>{result.verdict}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.muted }}>RISK:</span>
                <Badge color={riskColors[result.risk]?.[0] || C.muted} bg={riskColors[result.risk]?.[1] || C.offwhite}>{result.risk?.toUpperCase()}</Badge>
                <span style={{ fontSize: "0.78rem", color: C.muted }}>{result.riskNote}</span>
              </div>
              <div><div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Advice</div><p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>{result.advice}</p></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.tags?.map(t => <Badge key={t} color={C.teal} bg={C.tealLight}>{t}</Badge>)}</div>
            </div>
          )}
        </Card>
      </div>

      {reports.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>📁 Recent Reports</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map(r => (
              <Card key={r.id} style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.navy }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{r.type} · {r.date}</div>
                </div>
                <Badge color={riskColors[r.result?.risk]?.[0] || C.muted} bg={riskColors[r.result?.risk]?.[1] || C.offwhite}>{r.result?.risk}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// TAT CASE LIBRARY
const CaseLibrary = () => {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const types = ["All", ...new Set(TAT_CASES.map(c => c.type))];
  const years = ["All", ...new Set(TAT_CASES.map(c => String(c.year)))];
  const outcomes = ["All", "Allowed", "Dismissed", "Partial"];

  const filtered = TAT_CASES.filter(c => {
    const q = query.toLowerCase();
    return (!q || c.title.toLowerCase().includes(q) || c.tags.join(" ").toLowerCase().includes(q) || c.ref.toLowerCase().includes(q)) &&
      (typeFilter === "All" || c.type === typeFilter) &&
      (yearFilter === "All" || String(c.year) === yearFilter) &&
      (outcomeFilter === "All" || c.outcome === outcomeFilter);
  });

  const openCase = async (c) => {
    setSelected(c);
    setAiSummary("");
    setLoadingAi(true);
    try {
      const res = await callClaude("You are a Uganda tax law expert. In 3-4 sentences, provide a deeper expert commentary on this TAT case — what it means for practitioners, what precedent it sets, and what taxpayers should learn from it. Be direct and practical.", `Case: ${c.title} (${c.ref})\nOutcome: ${c.outcome}\nSummary: ${c.summary}`);
      setAiSummary(res);
    } catch { setAiSummary("Expert commentary unavailable."); }
    setLoadingAi(false);
  };

  const outcomeColor = { Allowed: [C.green, C.greenLight], Dismissed: [C.red, C.redLight], Partial: [C.gold, C.goldLight] };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>TAT Case Library</h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 20 }}>Search and explore Tax Appeals Tribunal rulings. Click any case for an AI-powered expert analysis.</p>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍  Search by case name, reference, tags, or keyword..." style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 16px", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", background: C.offwhite, boxSizing: "border-box", color: C.text, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[["Type", types, typeFilter, setTypeFilter], ["Year", years, yearFilter, setYearFilter], ["Outcome", outcomes, outcomeFilter, setOutcomeFilter]].map(([label, opts, val, set]) => (
            <div key={label}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, marginRight: 6 }}>{label}:</span>
              <select value={val} onChange={e => set(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem", fontFamily: "inherit", background: C.white }}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: C.muted, alignSelf: "center" }}>{filtered.length} case{filtered.length !== 1 ? "s" : ""} found</div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(c => (
          <Card key={c.id} hover style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => openCase(c)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.95rem", marginBottom: 3 }}>{c.title}</div>
                <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 8 }}>{c.ref} · {c.year}</div>
                <p style={{ fontSize: "0.85rem", color: C.text, lineHeight: 1.65, marginBottom: 10 }}>{c.summary}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.tags.map(t => <Badge key={t} color={C.teal} bg={C.tealLight}>{t}</Badge>)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <Badge color={outcomeColor[c.outcome]?.[0]} bg={outcomeColor[c.outcome]?.[1]}>{c.outcome}</Badge>
                <Badge color={C.navy} bg="#E8EDF5">{c.type}</Badge>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.muted }}>No cases match your search. Try different keywords or clear the filters.</div>}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.ref} width={640}>
        {selected && (
          <div>
            <h3 style={{ color: C.navy, marginBottom: 4, fontSize: "1rem" }}>{selected.title}</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Badge color={outcomeColor[selected.outcome]?.[0]} bg={outcomeColor[selected.outcome]?.[1]}>{selected.outcome}</Badge>
              <Badge color={C.navy} bg="#E8EDF5">{selected.type}</Badge>
              <Badge color={C.muted} bg={C.offwhite}>{selected.year}</Badge>
            </div>
            <div style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.75, marginBottom: 20 }}>{selected.summary}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>{selected.tags.map(t => <Badge key={t} color={C.teal} bg={C.tealLight}>{t}</Badge>)}</div>
            <div style={{ background: C.tealLight, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>✦ AI Expert Commentary</div>
              {loadingAi ? <div style={{ color: C.muted, fontSize: "0.875rem" }}>⟳ Generating expert commentary...</div> : <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.75 }}>{aiSummary}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// EDUCATION HUB
const EducationHub = () => {
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [completed, setCompleted] = useState(new Set());
  const [aiQ, setAiQ] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const askAI = async () => {
    if (!aiQ.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await callClaude("You are a Uganda tax law educator. Answer questions clearly and practically, referencing specific Uganda tax laws, URA regulations, and TAT rulings where relevant. Keep answers concise but complete.", `Student question (in context of ${activeCourse?.title}): ${aiQ}`);
      setAiAnswer(res);
    } catch { setAiAnswer("Sorry, could not get an answer. Please try again."); }
    setAiLoading(false);
  };

  const levelColors = { Beginner: [C.teal, C.tealLight], Intermediate: [C.gold, C.goldLight], Professional: [C.navy, "#E8EDF5"] };

  if (activeLesson && activeCourse) {
    const [lColor] = levelColors[activeCourse.level];
    return (
      <div>
        <button onClick={() => setActiveLesson(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.teal, fontWeight: 700, fontSize: "0.875rem", marginBottom: 20, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>← Back to {activeCourse.title}</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
          <Card style={{ padding: 32 }}>
            <Badge color={lColor} bg={levelColors[activeCourse.level][1]}>{activeCourse.level}</Badge>
            <h2 style={{ fontFamily: "Georgia, serif", color: C.navy, fontSize: "1.4rem", margin: "12px 0 6px" }}>{activeLesson.title}</h2>
            <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 24 }}>⏱ {activeLesson.duration} · {activeCourse.title}</div>
            <div style={{ fontSize: "0.9rem", color: C.text, lineHeight: 1.85, whiteSpace: "pre-line" }}>
              {activeLesson.content.split("**").map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
            </div>
            <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
              <Button onClick={() => { setCompleted(s => new Set([...s, activeLesson.id])); setActiveLesson(null); }}>
                {completed.has(activeLesson.id) ? "✓ Already Completed" : "Mark as Complete ✓"}
              </Button>
              <Button variant="outline" onClick={() => setActiveLesson(null)}>Back to Course</Button>
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12, fontSize: "0.9rem" }}>Course Progress</div>
              {activeCourse.lessons.map((l, i) => (
                <div key={l.id} onClick={() => setActiveLesson(l)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < activeCourse.lessons.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: completed.has(l.id) ? C.teal : l.id === activeLesson.id ? C.navy : C.offwhite, border: `2px solid ${completed.has(l.id) ? C.teal : l.id === activeLesson.id ? C.navy : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: (completed.has(l.id) || l.id === activeLesson.id) ? C.white : C.muted, flexShrink: 0 }}>
                    {completed.has(l.id) ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: l.id === activeLesson.id ? C.navy : C.text, fontWeight: l.id === activeLesson.id ? 700 : 400, flex: 1, lineHeight: 1.4 }}>{l.title}</div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10, fontSize: "0.9rem" }}>✦ Ask the AI Tutor</div>
              <textarea value={aiQ} onChange={e => setAiQ(e.target.value)} placeholder="Ask a question about this topic..." style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, fontSize: "0.82rem", fontFamily: "inherit", resize: "none", minHeight: 80, outline: "none", boxSizing: "border-box", background: C.offwhite }} />
              <Button onClick={askAI} disabled={aiLoading || !aiQ.trim()} small style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>{aiLoading ? "⟳ Thinking..." : "Get Answer →"}</Button>
              {aiAnswer && <div style={{ marginTop: 12, background: C.tealLight, borderRadius: 8, padding: 12, fontSize: "0.82rem", color: C.text, lineHeight: 1.7 }}>{aiAnswer}</div>}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeCourse) {
    const [lColor, lBg] = levelColors[activeCourse.level];
    return (
      <div>
        <button onClick={() => setActiveCourse(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.teal, fontWeight: 700, fontSize: "0.875rem", marginBottom: 20, padding: 0, fontFamily: "inherit" }}>← All Courses</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
          <div>
            <div style={{ background: lBg, borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{activeCourse.emoji}</div>
              <Badge color={lColor} bg={C.white}>{activeCourse.level}</Badge>
              <h1 style={{ fontFamily: "Georgia, serif", color: C.navy, fontSize: "1.5rem", margin: "10px 0 8px" }}>{activeCourse.title}</h1>
              <p style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.7 }}>{activeCourse.desc}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCourse.lessons.map((l, i) => (
                <Card key={l.id} hover style={{ padding: "16px 20px", cursor: "pointer" }} onClick={() => setActiveLesson(l)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: completed.has(l.id) ? C.teal : C.offwhite, border: `2px solid ${completed.has(l.id) ? C.teal : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: completed.has(l.id) ? C.white : C.muted, fontWeight: 700, flexShrink: 0 }}>
                      {completed.has(l.id) ? "✓" : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.9rem" }}>{l.title}</div>
                      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>⏱ {l.duration}</div>
                    </div>
                    <span style={{ color: C.teal, fontSize: "1rem" }}>→</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>Your Progress</div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(activeCourse.lessons.filter(l => completed.has(l.id)).length / activeCourse.lessons.length) * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.gold})`, borderRadius: 4, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: "0.8rem", color: C.muted }}>{activeCourse.lessons.filter(l => completed.has(l.id)).length} of {activeCourse.lessons.length} lessons done</div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>Learning Hub</h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>Structured Uganda tax education — from fundamentals to TAT appeals mastery.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {COURSES.map(c => {
          const done = c.lessons.filter(l => completed.has(l.id)).length;
          const [lColor, lBg] = levelColors[c.level];
          return (
            <Card key={c.id} hover style={{ cursor: "pointer", overflow: "hidden" }} onClick={() => setActiveCourse(c)}>
              <div style={{ height: 110, background: lBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem" }}>{c.emoji}</div>
              <div style={{ padding: 20 }}>
                <Badge color={lColor} bg={lBg}>{c.level}</Badge>
                <h3 style={{ fontFamily: "Georgia, serif", color: C.navy, margin: "10px 0 6px", fontSize: "1rem" }}>{c.title}</h3>
                <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>{c.desc}</p>
                <div style={{ height: 6, background: C.border, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(done / c.lessons.length) * 100}%`, background: C.teal, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: C.muted }}>{c.modules} modules · {c.duration}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.teal }}>Start →</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// COMPLIANCE CHECKLIST
const ComplianceChecker = () => {
  const [tab, setTab] = useState("efris");
  const [checked, setChecked] = useState({});
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const items = COMPLIANCE_ITEMS[tab];
  const score = items.length ? Math.round((items.filter(i => checked[`${tab}-${i.id}`]).length / items.length) * 100) : 0;
  const highRisks = items.filter(i => i.risk === "high" && !checked[`${tab}-${i.id}`]);
  const tabs = [{ key: "efris", label: "eFRIS" }, { key: "vat", label: "VAT" }, { key: "paye", label: "PAYE" }];

  const toggle = (id) => setChecked(c => ({ ...c, [`${tab}-${id}`]: !c[`${tab}-${id}`] }));

  const generateReport = async () => {
    setAiLoading(true);
    setAiReport("");
    const gaps = items.filter(i => !checked[`${tab}-${i.id}`]).map(i => i.text);
    try {
      const res = await callClaude("You are a Uganda tax compliance expert. Based on compliance gaps, provide a concise professional report with: (1) Overall risk assessment, (2) Top 3 priority actions, (3) Estimated penalties if gaps are not addressed. Be specific to Uganda tax law.", `Compliance Area: ${tab.toUpperCase()}\nScore: ${score}%\nUnchecked items (gaps):\n${gaps.join("\n")}`);
      setAiReport(res);
    } catch { setAiReport("Report generation failed."); }
    setAiLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>Compliance Checker</h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>Work through each checklist and get an AI-generated risk report for your business.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "9px 20px", borderRadius: 8, border: `2px solid ${tab === t.key ? C.teal : C.border}`, background: tab === t.key ? C.teal : C.white, color: tab === t.key ? C.white : C.muted, fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit" }}>
                {t.label}
              </button>
            ))}
          </div>

          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy }}>{tabs.find(t => t.key === tab)?.label} Compliance Checklist</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 800, color: score >= 80 ? C.green : score >= 50 ? C.gold : C.red }}>{score}%</div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>complete</div>
              </div>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${score}%`, background: score >= 80 ? C.green : score >= 50 ? C.gold : C.red, borderRadius: 4, transition: "width .3s" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map(item => {
                const isChecked = checked[`${tab}-${item.id}`];
                const [rc, rb] = riskColors[item.risk];
                return (
                  <div key={item.id} onClick={() => toggle(item.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 10, border: `1px solid ${isChecked ? C.teal : C.border}`, background: isChecked ? C.tealLight : C.white, cursor: "pointer", transition: "all .15s" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? C.teal : C.border}`, background: isChecked ? C.teal : C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.white, fontSize: "0.8rem", fontWeight: 700 }}>
                      {isChecked ? "✓" : ""}
                    </div>
                    <span style={{ flex: 1, fontSize: "0.875rem", color: isChecked ? C.teal : C.text, textDecoration: isChecked ? "line-through" : "none", lineHeight: 1.5 }}>{item.text}</span>
                    <Badge color={rc} bg={rb}>{item.risk}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>Score Summary</div>
            {["high", "medium", "low"].map(r => {
              const total = items.filter(i => i.risk === r);
              const done = total.filter(i => checked[`${tab}-${i.id}`]);
              const [rc, rb] = riskColors[r];
              return (
                <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Badge color={rc} bg={rb}>{r} risk</Badge>
                  <span style={{ fontSize: "0.85rem", color: C.muted }}>{done.length}/{total.length} done</span>
                </div>
              );
            })}
            {highRisks.length > 0 && (
              <div style={{ background: C.redLight, borderRadius: 8, padding: 12, marginTop: 12 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.red, marginBottom: 6 }}>⚠ {highRisks.length} HIGH-RISK ITEMS OUTSTANDING</div>
                {highRisks.slice(0, 2).map(h => <div key={h.id} style={{ fontSize: "0.75rem", color: C.red, marginBottom: 3 }}>• {h.text.slice(0, 60)}...</div>)}
              </div>
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>✦ AI Risk Report</div>
            <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>Get a professional risk report based on your current checklist — including potential penalties under Uganda tax law.</p>
            <Button onClick={generateReport} disabled={aiLoading} style={{ width: "100%", justifyContent: "center" }}>{aiLoading ? "⟳ Generating..." : "Generate Report"}</Button>
            {aiReport && <div style={{ marginTop: 14, background: C.offwhite, borderRadius: 8, padding: 14, fontSize: "0.82rem", color: C.text, lineHeight: 1.75, maxHeight: 300, overflowY: "auto" }}>{aiReport}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
};

// PRICING
const PricingPage = () => {
  const plans = [
    { name: "Starter", price: "50K", period: "/ month", features: ["10 case analyses/month", "Basic AI summaries", "Learning Hub access", "PDF report export", "Email support"], cta: "Start Free Trial" },
    { name: "Professional", price: "150K", period: "/ month", popular: true, features: ["100 case analyses/month", "Full AI analysis + precedents", "Compliance checker", "Client report builder", "PDF upload & analysis", "Deadline tracker", "Priority support"], cta: "Start 14-Day Free Trial" },
    { name: "Firm", price: "400K", period: "/ month", features: ["Unlimited analyses", "Up to 10 team members", "Custom client branding", "API access", "Admin portal", "Dedicated account manager"], cta: "Contact Sales" },
  ];
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color: C.navy, marginBottom: 8 }}>Simple, Honest Pricing</h1>
        <p style={{ color: C.muted, fontSize: "0.9rem" }}>Priced in Uganda Shillings. No hidden fees. Cancel anytime.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {plans.map(p => (
          <Card key={p.name} style={{ padding: 28, position: "relative", border: p.popular ? `2px solid ${C.teal}` : `1px solid ${C.border}` }}>
            {p.popular && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.teal, color: C.white, fontSize: "0.72rem", fontWeight: 700, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>Most Popular</div>}
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>{p.name}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem", fontWeight: 800, color: C.navy }}>UGX {p.price}</div>
            <div style={{ fontSize: "0.8rem", color: C.muted, marginBottom: 20 }}>{p.period}</div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
              {p.features.map(f => <div key={f} style={{ fontSize: "0.875rem", color: C.text, marginBottom: 10, display: "flex", gap: 8 }}><span style={{ color: C.teal, fontWeight: 700 }}>✓</span>{f}</div>)}
            </div>
            <Button onClick={() => {}} variant={p.popular ? "primary" : "outline"} style={{ width: "100%", justifyContent: "center" }}>{p.cta}</Button>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 24, marginTop: 24, background: C.navy }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 700, color: C.white, marginBottom: 4 }}>💳 Payment Methods</div><div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.6)" }}>MTN MoMo · Airtel Money · Visa/Mastercard · Bank Transfer</div></div>
          <div style={{ display: "flex", gap: 10 }}>
            {["MTN MoMo", "Airtel", "Visa", "Bank"].map(m => <div key={m} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 6, padding: "6px 12px", fontSize: "0.75rem", color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{m}</div>)}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ADMIN PORTAL
const AdminPortal = () => {
  const users = [
    { name: "Ronald Kakembo", email: "ronald@taxconsult.ug", role: "Tax Consultant", plan: "Professional", cases: 34, joined: "Jan 2025" },
    { name: "Patricia Mutebi", email: "patricia@taxfirm.ug", role: "Partner", plan: "Firm", cases: 89, joined: "Feb 2025" },
    { name: "James Nsubuga", email: "james@company.ug", role: "Finance Manager", plan: "Starter", cases: 7, joined: "Mar 2025" },
    { name: "Sarah Nalwanga", email: "sarah@legalug.com", role: "Tax Lawyer", plan: "Professional", cases: 52, joined: "Mar 2025" },
  ];
  const planColors = { Professional: [C.teal, C.tealLight], Firm: [C.navy, "#E8EDF5"], Starter: [C.muted, C.offwhite] };
  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>Admin Portal</h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>Platform overview and user management.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[["Total Users", "320", "👥"], ["Revenue (MRR)", "UGX 28M", "💰"], ["Cases Today", "47", "⚖️"], ["Active Trials", "34", "🎯"]].map(([l, v, i]) => (
          <Card key={l} style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{i}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", fontWeight: 800, color: C.navy }}>{v}</div>
            <div style={{ fontSize: "0.78rem", color: C.muted }}>{l}</div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.navy }}>Recent Users</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: C.offwhite }}>
            {["Name", "Email", "Role", "Plan", "Cases", "Joined"].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: C.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.email} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.white : C.offwhite }}>
                <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 600, color: C.navy }}>{u.name}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.muted }}>{u.email}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.text }}>{u.role}</td>
                <td style={{ padding: "12px 16px" }}><Badge color={planColors[u.plan]?.[0]} bg={planColors[u.plan]?.[1]}>{u.plan}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 700, color: C.navy }}>{u.cases}</td>
                <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.muted }}>{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function TaxWiseSaaS() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "analyzer", label: "Case Analyzer", icon: "⚖️" },
    { id: "library", label: "Case Library", icon: "📚" },
    { id: "education", label: "Learning Hub", icon: "🎓" },
    { id: "compliance", label: "Compliance", icon: "✅" },
    { id: "pricing", label: "Pricing", icon: "💳" },
    { id: "admin", label: "Admin", icon: "🛡️" },
  ];

  const pages = { dashboard: <Dashboard user={user || { name: "User" }} onNavigate={setPage} />, analyzer: <CaseAnalyzer />, library: <CaseLibrary />, education: <EducationHub />, compliance: <ComplianceChecker />, pricing: <PricingPage />, admin: <AdminPortal /> };

  if (!user) return <AuthPage onLogin={setUser} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.offwhite }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } body { margin: 0; }`}</style>

      {/* SIDEBAR */}
      <div style={{ width: 220, background: C.navy, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: C.white, fontWeight: 800 }}>Tax<span style={{ color: C.teal }}>Wise</span></div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", marginTop: 2 }}>Uganda Tax Platform</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: page === n.id ? "rgba(26,123,107,.3)" : "transparent", color: page === n.id ? C.white : "rgba(255,255,255,.55)", fontWeight: page === n.id ? 700 : 500, fontSize: "0.875rem", cursor: "pointer", transition: "all .15s", marginBottom: 2, textAlign: "left", fontFamily: "inherit", borderLeft: page === n.id ? `3px solid ${C.teal}` : "3px solid transparent" }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.white, marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", marginBottom: 10 }}>{user.role || user.email}</div>
          <button onClick={() => setUser(null)} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Sign Out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto", maxHeight: "100vh" }}>
        {pages[page]}
      </div>
    </div>
  );
}

