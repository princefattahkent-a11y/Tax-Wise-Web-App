import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Badge, Card, Modal } from "./UI";
import { Search, FolderOpen, Calendar, Sparkles } from "lucide-react";

interface TatCase {
  id: string;
  case_number: string;
  title: string;
  year: number;
  tax_type: string;
  outcome: string; // Allowed, Dismissed, Partial
  summary: string;
  full_text?: string;
  ai_commentary?: string;
}

export const CaseLibrary: React.FC = () => {
  const [cases, setCases] = useState<TatCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selected, setSelected] = useState<TatCase | null>(null);

  // Fetch precedents from database
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tat_cases")
          .select("*")
          .order("year", { ascending: false });

        if (error) throw error;
        if (data) setCases(data as TatCase[]);
      } catch (err) {
        console.error("Error fetching TAT cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const types = ["All", ...new Set(cases.map((c) => c.tax_type))];
  const years = ["All", ...new Set(cases.map((c) => String(c.year)))];
  const outcomes = ["All", "Allowed", "Dismissed", "Partial"];

  const filtered = cases.filter((c) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.case_number.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.tax_type.toLowerCase().includes(q);

    const matchesType = typeFilter === "All" || c.tax_type === typeFilter;
    const matchesYear = yearFilter === "All" || String(c.year) === yearFilter;
    const matchesOutcome = outcomeFilter === "All" || c.outcome === outcomeFilter;

    return matchesQuery && matchesType && matchesYear && matchesOutcome;
  });

  const outcomeColors: Record<string, [string, string]> = {
    Allowed: [C.green, C.greenLight],
    Dismissed: [C.red, C.redLight],
    Partial: [C.gold, C.goldLight],
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
          TAT Case Precedents
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Search and explore historic Tax Appeals Tribunal (TAT) rulings. Click on any ruling to access AI expert commentary.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card style={{ padding: 24, marginBottom: 24 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by case title, TAT reference code, keywords, or tax rules..."
          className="input-focus-ring"
          style={{
            width: "100%",
            border: `1.5px solid ${C.border}`,
            borderRadius: 10,
            padding: "13px 18px",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            outline: "none",
            background: C.offwhite,
            boxSizing: "border-box",
            color: C.text,
            marginBottom: 16,
            transition: "all 0.2s ease"
          }}
        />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          {[
            ["Tax Type", types, typeFilter, setTypeFilter],
            ["Year", years, yearFilter, setYearFilter],
            ["Outcome", outcomes, outcomeFilter, setOutcomeFilter],
          ].map(([label, opts, val, set]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, marginRight: 8, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                {label as string}:
              </span>
              <select
                value={val as string}
                onChange={(e) => (set as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                className="input-focus-ring"
                style={{
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  background: C.white,
                  color: C.navy,
                  outline: "none",
                  transition: "all 0.2s"
                }}
              >
                {(opts as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: C.muted, fontWeight: 600 }}>
            {filtered.length} Case{filtered.length !== 1 ? "s" : ""} Found
          </div>
        </div>
      </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", marginBottom: 12, color: C.teal }}>⟳</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Loading TAT precedents...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((c) => (
            <Card key={c.id} hover style={{ padding: "22px 26px", cursor: "pointer" }} onClick={() => setSelected(c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: C.navy, fontSize: "1rem", marginBottom: 4 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 12, fontWeight: 600, letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: 6 }}>
                    <FolderOpen size={12} />
                    <span>{c.case_number}</span>
                    <span>·</span>
                    <Calendar size={12} />
                    <span>{c.year}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.65, fontWeight: 500 }}>
                    {c.summary}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                  <Badge
                    color={outcomeColors[c.outcome]?.[0] || C.muted}
                    bg={outcomeColors[c.outcome]?.[1] || C.offwhite}
                    style={{ fontWeight: 800 }}
                  >
                    {c.outcome}
                  </Badge>
                  <Badge color={C.navy} bg="#E8EDF5" style={{ fontWeight: 800 }}>
                    {c.tax_type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
          
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Search size={32} style={{ color: C.muted, opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>No precedents found</div>
              <p style={{ fontSize: "0.82rem", color: C.muted, marginTop: 4 }}>Try altering search keywords or checking filter properties.</p>
            </div>
          )}
        </div>
      )}
      </motion.div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.case_number} width={680}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ color: C.navy, marginBottom: 8, fontSize: "1.15rem", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 }}>
                {selected.title}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge
                  color={outcomeColors[selected.outcome]?.[0] || C.muted}
                  bg={outcomeColors[selected.outcome]?.[1] || C.offwhite}
                  style={{ fontWeight: 800 }}
                >
                  {selected.outcome}
                </Badge>
                <Badge color={C.navy} bg="#E8EDF5" style={{ fontWeight: 800 }}>
                  {selected.tax_type}
                </Badge>
                <Badge color={C.muted} bg={C.offwhite} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={11} />
                  <span>{selected.year}</span>
                </Badge>
              </div>
            </div>
            
            <div style={{ fontSize: "0.9rem", color: C.text, lineHeight: 1.75, borderTop: "1px solid rgba(15,32,68,0.05)", paddingTop: 16, fontWeight: 500 }}>
              {selected.summary}
            </div>
            
            {selected.ai_commentary && (
              <div style={{ background: C.tealLight, borderRadius: 14, padding: 24, border: `1px solid ${C.teal}15` }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: C.teal,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Sparkles size={13} style={{ color: C.gold }} />
                  <span>AI Summary & Legal Commentary</span>
                </div>
                <div style={{ fontSize: "0.9rem", color: C.text, lineHeight: 1.85, fontWeight: 500, textAlign: "justify" }}>
                  {selected.ai_commentary.split("\n").map((line, index) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={index} />;
                    const isBullet = trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*");
                    if (isBullet) {
                      return (
                        <div key={index} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                          <span style={{ minWidth: 16, color: C.teal, fontWeight: 700 }}>•</span>
                          <span style={{ flex: 1, textAlign: "left" }}>{trimmed.replace(/^[-•*]+\s*/, "")}</span>
                        </div>
                      );
                    }
                    return <p key={index} style={{ margin: "0 0 12px", textAlign: "justify" }}>{trimmed}</p>;
                  })}
                  {selected.ai_commentary.trim().length < 180 && selected.summary ? <p style={{ marginTop: 12, textAlign: "justify" }}>Case Summary: {selected.summary}</p> : null}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};;
