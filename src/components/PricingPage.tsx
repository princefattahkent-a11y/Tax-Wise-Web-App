/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { C } from "../lib/constants";
import { Button, Card } from "./UI";

interface PricingPageProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    plan: string;
  };
  onRefreshUser: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ user, onRefreshUser }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "completed" || status === "success") {
      setPaymentMessage("Thank you! Your payment was processed successfully and your account is being upgraded.");
      onRefreshUser(); // Refresh user profile to load upgraded plan from DB
    } else if (status === "cancelled") {
      setPaymentMessage("The checkout process was cancelled. You have not been charged.");
    }
  }, [searchParams, onRefreshUser]);

  const initiatePayment = async (planKey: string) => {
    setLoadingPlan(planKey);
    setPaymentMessage("");
    
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          userId: user.id,
          email: user.email,
          name: user.full_name,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Payment initiation failed");

      if (data.link) {
        // Redirect to Flutterwave checkout page or simulated checkout URL
        window.location.assign(data.link);
      }
    } catch (err) {
      console.error("Payment setup error:", err);
      const message = err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Failed to initiate payment gateway. Please try again.";
      setPaymentMessage(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: "starter",
      name: "Starter",
      price: "50K",
      period: "/ month",
      features: ["10 case analyses/month", "Basic AI summaries", "Learning Hub access", "PDF report export", "Email support"],
      cta: "Start Starter Plan",
    },
    {
      key: "professional",
      name: "Professional",
      price: "150K",
      period: "/ month",
      popular: true,
      features: [
        "100 case analyses/month",
        "Full AI analysis + precedents",
        "Compliance checker",
        "Client report builder",
        "PDF upload & analysis",
        "Deadline tracker",
        "Priority support",
      ],
      cta: "Upgrade to Professional",
    },
    {
      key: "firm",
      name: "Firm",
      price: "400K",
      period: "/ month",
      features: ["Unlimited analyses", "Up to 10 team members", "Custom client branding", "API access", "Admin portal", "Dedicated account manager"],
      cta: "Upgrade to Firm",
    },
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 8, fontWeight: 800 }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>All subscriptions priced in Uganda Shillings. Upgrade or cancel your subscription at any time.</p>
      </div>

      {paymentMessage && (
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto 28px",
            background: paymentMessage.includes("successful") ? C.greenLight : C.goldLight,
            color: paymentMessage.includes("successful") ? C.green : C.gold,
            padding: "16px 24px",
            borderRadius: 14,
            fontSize: "0.875rem",
            fontWeight: 700,
            textAlign: "center",
            border: `1.5px solid ${paymentMessage.includes("successful") ? `${C.green}30` : `${C.gold}30`}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
          }}
        >
          {paymentMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 32 }}>
        {plans.map((p) => {
          const isCurrentPlan = user.plan?.toLowerCase() === p.key;
          
          return (
            <Card
              key={p.name}
              style={{
                padding: "36px 28px 28px",
                position: "relative",
                border: p.popular ? `2px solid ${C.teal}` : `1.5px solid ${C.border}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: p.popular ? "scale(1.01)" : "none",
                boxShadow: p.popular ? "0 12px 36px rgba(26,123,107,0.08)" : "none"
              }}
            >
              <div>
                {p.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.teal,
                      color: C.white,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "4px 16px",
                      borderRadius: 50,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.04em",
                      boxShadow: "0 2px 6px rgba(26,123,107,0.2)"
                    }}
                  >
                    RECOMMENDED
                  </div>
                )}
                
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 12,
                  }}
                >
                  {p.name}
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                  <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.2rem", fontWeight: 800, color: C.navy }}>
                    UGX {p.price}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: C.muted, fontWeight: 500 }}>
                    {p.period}
                  </span>
                </div>

                <div style={{ borderTop: `1px solid rgba(15,32,68,0.05)`, paddingTop: 20, marginBottom: 24 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ fontSize: "0.85rem", color: C.text, marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 500 }}>
                      <span style={{ color: C.teal, fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => !isCurrentPlan && initiatePayment(p.key)}
                variant={p.popular ? "primary" : "outline"}
                disabled={isCurrentPlan || loadingPlan !== null}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loadingPlan === p.key ? "⟳ Connecting Gateway..." : isCurrentPlan ? "✓ Active Plan" : p.cta}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card style={{ padding: 28, background: C.navy, border: "none", boxShadow: "0 10px 24px rgba(15,32,68,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontWeight: 800, color: C.white, marginBottom: 4, fontSize: "0.95rem" }}>💳 Secure Mobile Money & Card Gateway</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.65)", fontWeight: 500 }}>
              Transactions processed locally via secure channels. Instant activation.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["MTN MoMo", "Airtel Money", "Visa Card", "Mastercard"].map((m) => (
              <div
                key={m}
                style={{
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: "0.74rem",
                  color: "rgba(255,255,255,.85)",
                  fontWeight: 700,
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
