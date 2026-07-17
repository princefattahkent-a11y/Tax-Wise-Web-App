import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import { C } from "../lib/constants";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface AiFABProps {
  currentPage: string;
  dbUser?: {
    full_name: string;
    role: string;
  } | null;
}

// Map of page-specific context-aware suggested questions
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    "What are the main features of TaxWise Uganda?",
    "How do I start analyzing a URA tax decision?",
    "Where can I find the tax training courses?"
  ],
  analyzer: [
    "What files or formats can I upload to the Case Analyzer?",
    "How does the AI determine tax risk levels?",
    "Can I export my generated report in PDF format?"
  ],
  library: [
    "What court rulings are in the TAT Precedents library?",
    "How do I search for historic VAT cases?",
    "Can the AI explain a ruling's expert commentary?"
  ],
  calculators: [
    "How is personal income tax (PAYE) computed in Uganda?",
    "What is the standard VAT rate and threshold?",
    "Are there calculators for Withholding Tax (WHT)?"
  ],
  intelligence: [
    "What are the top tax dispute trends in Uganda?",
    "Tell me about the legal precedents on transfer pricing.",
    "Explain standard dispute zones between URA and taxpayers."
  ],
  education: [
    "What courses are offered in the Learning Hub?",
    "What is covered in the URA eFRIS Mastery course?",
    "Are there interactive AI quizzes or tutors?"
  ],
  compliance: [
    "What is eFRIS and what is the penalty for non-compliance?",
    "What are the key VAT compliance rules in Uganda?",
    "How do I run a PAYE self-audit checklist?"
  ],
  pricing: [
    "What subscription plans do you offer in UGX?",
    "Does Flutterwave support MTN MoMo and Airtel Money?",
    "What are the benefits of the Enterprise Plan?"
  ],
  settings: [
    "How do I modify my registered tax professional role?",
    "How is my private data secured on TaxWise?",
    "How do I manage my active subscription?"
  ],
  admin: [
    "What admin statistics can I track on TaxWise?",
    "How does the precedent database deduplication work?",
    "Where are the system audit logs recorded?"
  ]
};

let messageIdCounter = 0;
const generateMessageId = () => {
  messageIdCounter += 1;
  return `msg-id-${Date.now()}-${messageIdCounter}`;
};

export const AiFAB: React.FC<AiFABProps> = ({ currentPage, dbUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize suggested questions based on page
  useEffect(() => {
    const list = PAGE_SUGGESTIONS[currentPage] || PAGE_SUGGESTIONS.dashboard;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestedQuestions(list);
    setShowSuggestions(true);
  }, [currentPage]);

  // Welcome message when opened for the first time
  useEffect(() => {
    if (isOpen && !hasOpenedBefore) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasOpenedBefore(true);
      const nameStr = dbUser?.full_name ? `, ${dbUser.full_name}` : "";
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello${nameStr}! 👋 I am your TaxWise AI Assistant, equipped with deep knowledge of Uganda's tax laws (URA, eFRIS, VAT) and everything on this site.\n\nI see you are currently exploring the **${currentPage.toUpperCase()}** section. How can I assist you in your tax research or compliance tasks today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, hasOpenedBefore, dbUser, currentPage]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: generateMessageId(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      // Map message history to required backend format
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg.text,
          history: historyPayload,
          currentPage,
          userName: dbUser?.full_name || "",
          userRole: dbUser?.role || ""
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errorMsg = data?.error || "Failed to receive response from AI assistant service.";
        setMessages(prev => [
          ...prev,
          {
            id: generateMessageId(),
            sender: "ai",
            text: `⚠️ **API Error:** ${errorMsg}\n\nPlease check your configuration. If you are running locally, ensure your \`GEMINI_API_KEY\` in your \`.env\` file is set to a valid key from Google AI Studio.`,
            timestamp: new Date()
          }
        ]);
        setIsLoading(false);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          id: generateMessageId(),
          sender: "ai",
          text: data.answer,
          timestamp: new Date()
        }
      ]);

      if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error("AI Assistant response failure:", err);
      setMessages(prev => [
        ...prev,
        {
          id: generateMessageId(),
          sender: "ai",
          text: "My apologies. I had trouble connecting to the Uganda tax database. Please let me try that again, or ask another question.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Do you want to reset your conversation history?")) {
      const nameStr = dbUser?.full_name ? `, ${dbUser.full_name}` : "";
      setMessages([
        {
          id: "welcome-reset",
          sender: "ai",
          text: `History cleared! ✨ I'm ready to answer any of your tax questions${nameStr}. How can I assist you?`,
          timestamp: new Date()
        }
      ]);
      const list = PAGE_SUGGESTIONS[currentPage] || PAGE_SUGGESTIONS.dashboard;
      setSuggestedQuestions(list);
    }
  };

  // Simple parser to render markdown into nice styled HTML elements
  const renderFormattedMessageText = (text: string) => {
    return text.split("\n\n").map((para, i) => {
      // Bullet points
      if (para.startsWith("- ") || para.startsWith("* ")) {
        return (
          <ul key={i} style={{ paddingLeft: 20, margin: "8px 0", listStyleType: "disc" }}>
            {para.split("\n").map((item, idx) => {
              const cleanItem = item.replace(/^[-*]\s+/, "");
              return <li key={idx} style={{ fontSize: "0.84rem", color: C.text, lineHeight: 1.5, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleanItem) }} />;
            })}
          </ul>
        );
      }

      // Headings (e.g. ### Title)
      if (para.startsWith("###")) {
        const cleanHeading = para.replace(/^###\s+/, "");
        return (
          <h4 key={i} style={{ fontSize: "0.92rem", fontWeight: 700, color: C.navy, margin: "14px 0 6px" }} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleanHeading) }} />
        );
      }
      if (para.startsWith("##")) {
        const cleanHeading = para.replace(/^##\s+/, "");
        return (
          <h3 key={i} style={{ fontSize: "0.98rem", fontWeight: 800, color: C.navy, margin: "16px 0 8px" }} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleanHeading) }} />
        );
      }

      // Default paragraph
      return (
        <p 
          key={i} 
          style={{ fontSize: "0.85rem", color: C.text, lineHeight: 1.5, margin: "8px 0" }} 
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(para) }}
        />
      );
    });
  };

  // Inline formatting helper (handles bold **text**)
  const formatInlineMarkdown = (str: string) => {
    let html = str;
    // Escape standard tags
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Bold matches - inherit parent text color to handle light & dark backgrounds perfectly
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong style='font-weight:700;color:inherit;'>$1</strong>");
    return html;
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: isOpen ? "#0F2044" : C.teal,
            color: isOpen ? "#FFFFFF" : C.white,
            border: `2px solid ${isOpen ? "rgba(255,255,255,0.15)" : C.white}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(15, 32, 68, 0.16)",
            position: "relative",
            outline: "none",
            transition: "background-color 0.2s ease, transform 0.2s ease"
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isOpen ? "open" : "closed"}
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
            </motion.div>
          </AnimatePresence>
          
          {/* Subtle glowing animated background ring when closed */}
          {!isOpen && (
            <span 
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: `2px solid ${C.teal}`,
                opacity: 0.25,
                animation: "pulseGlow 2s infinite ease-in-out"
              }}
            />
          )}

          {/* Sparkle Tag */}
          {!isOpen && (
            <span 
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                background: C.gold,
                color: C.navy,
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                boxShadow: "0 2px 6px rgba(200, 146, 42, 0.4)",
                fontWeight: 800
              }}
              title="AI Active"
            >
              <Sparkles size={10} style={{ color: C.white }} />
            </span>
          )}
        </motion.button>
      </div>

      {/* CHAT BUBBLE SIDEBAR */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            style={{
              position: "fixed",
              bottom: 94,
              right: 24,
              width: isMaximized ? 580 : 380,
              height: isMaximized ? "75vh" : "550px",
              maxHeight: "calc(100vh - 120px)",
              background: C.white,
              borderRadius: 24,
              boxShadow: "0 12px 48px rgba(15, 32, 68, 0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 999,
              border: `1.5px solid ${C.border}`,
              transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* HEADER */}
            <div 
              style={{ 
                padding: "16px 20px", 
                background: "#0F2044",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1.5px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div 
                  style={{ 
                    width: 34, 
                    height: 34, 
                    borderRadius: "50%", 
                    background: "rgba(255,255,255,0.1)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}
                >
                  <Bot size={18} style={{ color: "#4DD9C0" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>TaxWise Assistant</span>
                    <span 
                      style={{ 
                        width: 7, 
                        height: 7, 
                        borderRadius: "50%", 
                        background: C.green, 
                        display: "inline-block",
                        animation: "pulse 1.5s infinite"
                      }} 
                    />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                    Uganda Tax Knowledge Expert
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Clear Button */}
                <button
                  onClick={handleClear}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Clear conversation"
                  onMouseOver={(e) => e.currentTarget.style.color = C.white}
                  onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                >
                  <RotateCcw size={14} />
                </button>

                {/* Maximize Toggle */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center"
                  }}
                  title={isMaximized ? "Minimize window" : "Maximize window"}
                  onMouseOver={(e) => e.currentTarget.style.color = C.white}
                  onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = C.white}
                  onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* MESSAGES VIEW */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: "auto", 
                padding: "20px 16px", 
                background: C.offwhite,
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  style={{ 
                    display: "flex", 
                    justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                    alignItems: "flex-start",
                    gap: 8
                  }}
                >
                  {m.sender === "ai" && (
                    <div 
                      style={{ 
                        width: 26, 
                        height: 26, 
                        borderRadius: "50%", 
                        background: C.tealLight, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        marginTop: 2,
                        flexShrink: 0
                      }}
                    >
                      <Bot size={13} style={{ color: C.teal }} />
                    </div>
                  )}
                  
                  <div style={{ maxWidth: m.sender === "user" ? "80%" : "85%" }}>
                    <div 
                      style={{
                        padding: m.sender === "user" ? "10px 14px" : "12px 16px",
                        borderRadius: m.sender === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                        background: m.sender === "user" ? C.teal : C.white,
                        color: m.sender === "user" ? C.white : C.text,
                        boxShadow: "0 2px 8px rgba(15, 32, 68, 0.02)",
                        border: m.sender === "user" ? "none" : `1px solid ${C.border}`,
                      }}
                    >
                      {m.sender === "user" ? (
                        <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                          {m.text}
                        </p>
                      ) : (
                        renderFormattedMessageText(m.text)
                      )}
                    </div>
                    <span 
                      style={{ 
                        fontSize: "0.68rem", 
                        color: C.muted, 
                        marginTop: 4, 
                        display: "block",
                        textAlign: m.sender === "user" ? "right" : "left" 
                      }}
                    >
                      {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {m.sender === "user" && (
                    <div 
                      style={{ 
                        width: 26, 
                        height: 26, 
                        borderRadius: "50%", 
                        background: C.navy, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        marginTop: 2,
                        flexShrink: 0,
                        color: C.white,
                        fontSize: "0.65rem",
                        fontWeight: 700
                      }}
                    >
                      <User size={12} />
                    </div>
                  )}
                </div>
              ))}

              {/* Waiting Indicator */}
              {isLoading && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div 
                    style={{ 
                      width: 26, 
                      height: 26, 
                      borderRadius: "50%", 
                      background: C.tealLight, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Bot size={13} style={{ color: C.teal }} />
                  </div>
                  <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderRadius: "4px 16px 16px 16px", background: C.white, border: `1px solid ${C.border}` }}>
                    <span style={{ width: 6, height: 6, background: C.teal, borderRadius: "50%", animation: "bounceIndicator 1.4s infinite ease-in-out" }} />
                    <span style={{ width: 6, height: 6, background: C.teal, borderRadius: "50%", animation: "bounceIndicator 1.4s infinite ease-in-out 0.2s" }} />
                    <span style={{ width: 6, height: 6, background: C.teal, borderRadius: "50%", animation: "bounceIndicator 1.4s infinite ease-in-out 0.4s" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* SUGGESTED QUESTIONS CAROUSEL - COORDINATING THEME FOR LIGHT OVERLAY AND DEEP BLUE PILLS */}
            {suggestedQuestions.length > 0 && showSuggestions && (
              <div 
                style={{ 
                  background: C.offwhite, 
                  padding: "8px 12px", 
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                {/* Left helper icon: Lightbulb */}
                <div style={{ color: C.muted, display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <Lightbulb size={16} style={{ color: "#EAB308" }} />
                </div>
 
                {/* Scrollable Center Container */}
                <div 
                  ref={scrollContainerRef}
                  style={{ 
                    display: "flex", 
                    gap: 8, 
                    overflowX: "auto", 
                    flex: 1,
                    scrollBehavior: "smooth",
                    alignItems: "center"
                  }}
                  className="hide-scrollbar"
                >
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      disabled={isLoading}
                      style={{
                        padding: "6px 14px",
                        background: C.tealLight,
                        border: `1.5px solid ${C.border}`,
                        borderRadius: 9999,
                        fontSize: "0.78rem",
                        color: C.teal,
                        fontWeight: 600,
                        cursor: isLoading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        whiteSpace: "nowrap"
                      }}
                      onMouseOver={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = C.teal;
                          e.currentTarget.style.color = C.white;
                          e.currentTarget.style.borderColor = C.teal;
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = C.tealLight;
                          e.currentTarget.style.color = C.teal;
                          e.currentTarget.style.borderColor = C.border;
                        }
                      }}
                    >
                      {/* Show beautiful blue sparkle icon on the first pill, matching the image */}
                      {idx === 0 && (
                        <Sparkles size={11} style={{ color: "#60A5FA" }} fill="#60A5FA" />
                      )}
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
 
                {/* Circular Scroll Button > */}
                <button
                  onClick={() => {
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollLeft += 160;
                    }
                  }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: C.white,
                    color: C.text,
                    border: `1.5px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = C.offwhite;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = C.white;
                  }}
                  title="Scroll right"
                >
                  <ChevronRight size={13} />
                </button>
 
                {/* Close/Dismiss Button X */}
                <button
                  onClick={() => setShowSuggestions(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.muted,
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    transition: "color 0.15s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = C.teal}
                  onMouseOut={(e) => e.currentTarget.style.color = C.muted}
                  title="Dismiss suggestions"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* INPUT FIELD BAR */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.white }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputVal);
                }}
                style={{ display: "flex", gap: 10 }}
              >
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask any question about Ugandan taxes..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: "0.84rem",
                    outline: "none",
                    fontFamily: "inherit",
                    color: C.text,
                    background: C.offwhite,
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.teal;
                    e.target.style.boxShadow = `0 0 0 3px ${C.tealLight}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isLoading}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: !inputVal.trim() || isLoading 
                      ? "var(--color-badge-bg)" 
                      : C.teal,
                    color: !inputVal.trim() || isLoading ? "var(--color-muted)" : C.white,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: !inputVal.trim() || isLoading ? "not-allowed" : "pointer",
                    boxShadow: !inputVal.trim() || isLoading ? "none" : "0 4px 12px rgba(26, 123, 107, 0.2)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
