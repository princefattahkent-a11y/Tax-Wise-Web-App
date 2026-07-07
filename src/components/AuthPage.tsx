import React, { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Card, Button } from "./UI";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "login" | "signup" | "forgot" | "reset-code" | "update-password" | "verify-signup";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  agreeTerms?: string;
  otp?: string;
}

interface AuthPageProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
  initialMode?: AuthMode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: C.red },
    1: { label: "Weak",      color: C.red },
    2: { label: "Fair",      color: C.gold },
    3: { label: "Good",      color: "#2563EB" },
    4: { label: "Strong",    color: C.green },
  };
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const KeyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ─── OTP Input Component ──────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  length?: number;
  alphanumeric?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, error, length = 6, alphanumeric = false }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  const cleanValue = useCallback((val: string) => {
    return alphanumeric ? val.replace(/[^a-zA-Z0-9]/g, "") : val.replace(/\D/g, "");
  }, [alphanumeric]);

  const digits = cleanValue(value).padEnd(length, "").split("").slice(0, length);

  const focusBox = (i: number) => {
    inputs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        onChange(cleanValue(next.join("")));
      } else if (i > 0) {
        next[i - 1] = "";
        onChange(cleanValue(next.join("")));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      focusBox(i + 1);
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = cleanValue(e.target.value);
    if (!raw) return;
    // Support paste — spread characters across boxes
    if (raw.length > 1) {
      const pasted = raw.slice(0, length).split("");
      const next = [...digits];
      pasted.forEach((ch, idx) => { if (i + idx < length) next[i + idx] = ch; });
      onChange(cleanValue(next.join("")));
      focusBox(Math.min(length - 1, i + pasted.length));
      return;
    }
    const next = [...digits];
    next[i] = raw[0];
    onChange(cleanValue(next.join("")));
    if (i < length - 1) focusBox(i + 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const raw = cleanValue(e.clipboardData.getData("text")).slice(0, length);
    const filled = digits.map((d, i) => (raw[i] !== undefined ? raw[i] : d));
    onChange(cleanValue(filled.join("")));
    focusBox(Math.min(length - 1, raw.length));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 4, flexWrap: "wrap" }}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode={alphanumeric ? "text" : "numeric"}
            maxLength={length}
            value={digits[i] || ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            style={{
              width: length === 8 ? 36 : 46,
              height: length === 8 ? 44 : 54,
              textAlign: "center",
              fontSize: length === 8 ? "1.2rem" : "1.4rem",
              fontWeight: 800,
              fontFamily: "'Inter', monospace",
              border: `2px solid ${error ? C.red : digits[i] ? C.teal : C.border}`,
              borderRadius: 10,
              background: digits[i] ? "#E6F5F2" : C.offwhite,
              color: C.navy,
              outline: "none",
              transition: "all 0.15s ease",
              boxSizing: "border-box",
              caretColor: C.teal,
            }}
          />
        ))}
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, fontSize: "0.75rem", color: C.red, fontWeight: 600, animation: "authFadeIn 0.2s ease" }}>
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
};

// ─── Form Field Wrapper ───────────────────────────────────────────────────────

const FormField: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: "0.01em" }}>
      {label}{required && <span style={{ color: C.red }}> *</span>}
    </label>
    {children}
    {error && (
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: "0.75rem", color: C.red, fontWeight: 600, animation: "authFadeIn 0.2s ease" }}>
        <span>⚠</span> {error}
      </div>
    )}
  </div>
);

// ─── Password Field with Eye Toggle ──────────────────────────────────────────

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
  showForgot?: boolean;
  onForgot?: () => void;
}> = ({ label, value, onChange, error, placeholder = "••••••••", required, showStrength, showForgot, onForgot }) => {
  const [show, setShow] = useState(false);
  const pwStrength = getPasswordStrength(value);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1.5px solid ${error ? C.red : C.border}`,
    borderRadius: 8,
    padding: "11px 44px 11px 16px",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    background: error ? "#FFF5F5" : C.offwhite,
    color: C.text,
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy, letterSpacing: "0.01em" }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
        {showForgot && (
          <button type="button" className="forgot-link" onClick={onForgot}>
            Forgot password?
          </button>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {showStrength && value && (
        <div style={{ marginTop: 8 }}>
          <div className="strength-bar-track">
            <div
              className="strength-bar-fill"
              style={{ width: `${(pwStrength.score / 4) * 100}%`, background: pwStrength.color }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: "0.72rem", color: pwStrength.color, fontWeight: 700 }}>{pwStrength.label}</span>
            <span style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>
              {pwStrength.score < 3 ? "Add uppercase, numbers & symbols" : "Great password!"}
            </span>
          </div>
        </div>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: "0.75rem", color: C.red, fontWeight: 600, animation: "authFadeIn 0.2s ease" }}>
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
};

// ─── Confirm Password Match Indicator ────────────────────────────────────────

const ConfirmPasswordField: React.FC<{
  label: string;
  value: string;
  matchValue: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}> = ({ label, value, matchValue, onChange, error, required }) => {
  const [show, setShow] = useState(false);
  const matches = value && value === matchValue;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1.5px solid ${error ? C.red : matches ? C.green : C.border}`,
    borderRadius: 8,
    padding: "11px 44px 11px 16px",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    background: error ? "#FFF5F5" : matches ? "#F0FDF4" : C.offwhite,
    color: C.text,
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: "0.01em" }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {matches && (
        <div style={{ fontSize: "0.72rem", color: C.green, fontWeight: 700, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          ✓ Passwords match
        </div>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: "0.75rem", color: C.red, fontWeight: 600, animation: "authFadeIn 0.2s ease" }}>
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onBack, initialMode }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || "login");

  // Sign-in / Sign-up
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Tax Consultant");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Reset-code mode
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // OTP (shared between verify + reset-code)
  const [otpCode, setOtpCode] = useState("");
  const [expectedSignupOtp, setExpectedSignupOtp] = useState("");

  // Status
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Clean mode switch ──
  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFieldErrors({});
    setGlobalError("");
    setSuccessMsg("");
    setOtpCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setExpectedSignupOtp("");
  };

  useEffect(() => {
    if (initialMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      switchMode(initialMode);
    }
  }, [initialMode]);

  // ── Validate login / signup fields ──
  const validate = useCallback((): boolean => {
    const errors: FieldErrors = {};

    if (mode === "forgot") {
      if (!email) errors.email = "Email is required.";
      else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (mode === "verify-signup") {
      if (otpCode.replace(/[^0-9]/g, "").length < 5) errors.otp = "Enter the full 5-digit verification code.";
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (mode === "reset-code") {
      if (otpCode.replace(/[^0-9]/g, "").length < 5) errors.otp = "Enter the full 5-digit code.";
      if (!newPassword) errors.newPassword = "New password is required.";
      else if (newPassword.length < 8) errors.newPassword = "Must be at least 8 characters.";
      else if (!/[A-Z]/.test(newPassword)) errors.newPassword = "Must include an uppercase letter.";
      else if (!/[0-9]/.test(newPassword)) errors.newPassword = "Must include a number.";
      if (!confirmNewPassword) errors.confirmNewPassword = "Please confirm your new password.";
      else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = "Passwords do not match.";
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (mode === "update-password") {
      if (!newPassword) errors.newPassword = "New password is required.";
      else if (newPassword.length < 8) errors.newPassword = "Must be at least 8 characters.";
      else if (!/[A-Z]/.test(newPassword)) errors.newPassword = "Must include an uppercase letter.";
      else if (!/[0-9]/.test(newPassword)) errors.newPassword = "Must include a number.";
      if (!confirmNewPassword) errors.confirmNewPassword = "Please confirm your new password.";
      else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = "Passwords do not match.";
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (mode === "signup" && !name.trim()) errors.name = "Full name is required.";
    else if (mode === "signup" && name.trim().length < 2) errors.name = "Name must be at least 2 characters.";

    if (!email) errors.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";

    if (!password) errors.password = "Password is required.";
    else if (mode === "signup" && password.length < 8) errors.password = "Must be at least 8 characters.";
    else if (mode === "signup" && !/[A-Z]/.test(password)) errors.password = "Must include an uppercase letter.";
    else if (mode === "signup" && !/[0-9]/.test(password)) errors.password = "Must include a number.";

    if (mode === "signup" && !confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (mode === "signup" && password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (mode === "signup" && !agreeTerms) errors.agreeTerms = "You must accept the terms to continue.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [mode, name, email, password, confirmPassword, agreeTerms, otpCode, newPassword, confirmNewPassword]);

  // ── Send forgot-password email ──
  const handleForgotPassword = async () => {
    if (!validate()) return;
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "reset" }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to send verification email.");
      }

      // Save code locally so verifyOtp or local check can match it
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_otp_code", result.code);
        localStorage.setItem("mock_otp_email", email);
      }

      // Transition to code entry screen
      switchMode("reset-code");
      if (result.warning) {
        setSuccessMsg(`⚠️ Email delivery failed (${result.warning}). For testing, please enter code: ${result.code}`);
      } else {
        setSuccessMsg("✅ Reset code sent! Please check your email inbox.");
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP + set new password ──
  const handleResetWithCode = async () => {
    if (!validate()) return;
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: "recovery",
      });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      // Sign out recovery session, go to login
      await supabase.auth.signOut();
      switchMode("login");
      setSuccessMsg("✅ Password reset! You can now sign in with your new password.");
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Update password directly (recovery link bypass) ──
  const handleUpdatePasswordOnly = async () => {
    if (!validate()) return;
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Sign out recovery session, go to login
      await supabase.auth.signOut();
      switchMode("login");
      setSuccessMsg("✅ Password updated successfully! You can now sign in.");
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };


  // ── Resend reset code ──
  const handleResendResetCode = async () => {
    setResendLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "reset" }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to resend verification email.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("mock_otp_code", result.code);
        localStorage.setItem("mock_otp_email", email);
      }

      setOtpCode("");
      if (result.warning) {
        setSuccessMsg(`⚠️ Email delivery failed (${result.warning}). For testing, please enter code: ${result.code}`);
      } else {
        setSuccessMsg("✅ New reset code sent! Check your inbox.");
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to resend reset email.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Send signup verification OTP code ──
  const handleSignupRequest = async () => {
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "signup",
          fullName: name.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to send verification email.");
      }

      setExpectedSignupOtp(result.code);
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_signup_otp", result.code);
        localStorage.setItem("mock_signup_email", email);
      }

      // Switch to verify signup screen!
      switchMode("verify-signup");
      if (result.warning) {
        setSuccessMsg(`⚠️ Email delivery failed (${result.warning}). For testing, please enter code: ${result.code}`);
      } else {
        setSuccessMsg("✅ Verification code sent! Please check your email inbox.");
      }
    } catch (err: unknown) {
      setGlobalError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Verify signup code and complete registration ──
  const handleVerifySignup = async () => {
    if (!validate()) return;
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const savedCode = expectedSignupOtp || (typeof window !== "undefined" ? localStorage.getItem("mock_signup_otp") : "") || "";
      const savedEmail = email || (typeof window !== "undefined" ? localStorage.getItem("mock_signup_email") : "") || "";

      if (!savedCode || savedCode.trim().toUpperCase() !== otpCode.trim().toUpperCase()) {
        throw new Error("Invalid verification code. Please check and try again.");
      }

      // OTP matches! Proceed to create the actual user account!
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedEmail,
          password,
          full_name: name.trim(),
          role,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to create account.");
      }

      // Auto login
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: savedEmail, password });
      if (signInError) throw signInError;

      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_signup_otp");
        localStorage.removeItem("mock_signup_email");
      }

      onLoginSuccess();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend signup code ──
  const handleResendSignupCode = async () => {
    setResendLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "signup",
          fullName: name.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to resend verification email.");
      }

      setExpectedSignupOtp(result.code);
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_signup_otp", result.code);
        localStorage.setItem("mock_signup_email", email);
      }

      setOtpCode("");
      if (result.warning) {
        setSuccessMsg(`⚠️ New code delivery failed (${result.warning}). For testing, please enter code: ${result.code}`);
      } else {
        setSuccessMsg("✅ New verification code sent! Check your inbox.");
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to resend verification code.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Main sign-in / sign-up ──
  const formatAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "");
    const lower = message.toLowerCase();

    if ((lower.includes("already") && lower.includes("registered")) || lower.includes("auth.user_already_exists")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (lower.includes("duplicate") || lower.includes("unique constraint") || lower.includes("user already exists")) {
      return "This email is already registered. Please sign in instead.";
    }
    return message || "An authentication error occurred.";
  };

  const handleAuth = async () => {
    if (!validate()) return;
    setLoading(true); setGlobalError(""); setSuccessMsg("");
    try {
      if (mode === "signup") {
        await handleSignupRequest();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLoginSuccess();
      }
    } catch (err: unknown) {
      setGlobalError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    border: `1.5px solid ${hasError ? C.red : C.border}`,
    borderRadius: 8,
    padding: "11px 16px",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    background: hasError ? "#FFF5F5" : C.offwhite,
    color: C.text,
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  });

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="auth-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');

        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mailBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes strengthGrow { from { width: 0; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }

        .auth-container {
          display: flex; width: 100vw; min-height: 100vh;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #FAFAF8;
        }

        /* ── Left showcase ── */
        .auth-showcase {
          flex: 1.1;
          background: radial-gradient(circle at 30% 30%, #162C54 0%, #0F2044 100%);
          color: white; padding: 64px 8%;
          display: flex; flex-direction: column; justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .auth-showcase::after {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 0);
          background-size: 24px 24px; opacity: 0.85; pointer-events: none;
        }

        /* ── Right form panel ── */
        .auth-form-panel {
          flex: 0.9; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 48px 8%; background: #FAFAF8; position: relative;
        }
        .auth-form-card { width: 100%; max-width: 460px; }
        .auth-form-content { animation: authFadeIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }

        /* ── Back button ── */
        .auth-back-btn {
          position: absolute; top: 32px; left: 32px;
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid rgba(15,32,68,0.08);
          border-radius: 10px; color: #0F2044;
          font-size: 0.8rem; font-weight: 600; font-family: inherit;
          padding: 8px 14px; cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(15,32,68,0.02); z-index: 100;
        }
        .auth-back-btn:hover { background: #F8F7F4; transform: translateX(-2px); }

        /* ── Tab switcher ── */
        .auth-tab-btn {
          flex: 1; padding: 9px 0; border-radius: 8px; border: none;
          font-weight: 700; font-size: 0.82rem; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1); font-family: inherit;
        }

        /* ── Password toggle ── */
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #9CA3AF; display: flex; align-items: center;
          padding: 4px; border-radius: 4px; transition: color 0.15s;
        }
        .pw-toggle:hover { color: #0F2044; }

        /* ── Strength bar ── */
        .strength-bar-track {
          height: 4px; border-radius: 4px; background: #E5E7EB; overflow: hidden; margin-top: 8px;
        }
        .strength-bar-fill {
          height: 100%; border-radius: 4px;
          transition: width 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s ease;
          animation: strengthGrow 0.4s ease forwards;
        }

        /* ── Forgot / link button ── */
        .forgot-link {
          background: none; border: none; cursor: pointer;
          color: #1A7B6B; font-size: 0.78rem; font-weight: 700;
          font-family: inherit; padding: 0; transition: opacity 0.15s;
        }
        .forgot-link:hover { opacity: 0.7; text-decoration: underline; }

        /* ── Alerts ── */
        .auth-alert {
          border-radius: 10px; padding: 12px 16px;
          font-size: 0.8rem; font-weight: 600;
          margin-bottom: 18px; line-height: 1.5; animation: authFadeIn 0.25s ease;
        }
        .auth-alert-error   { background: #FEE2E2; color: #DC2626; border: 1px solid rgba(220,38,38,0.15); }
        .auth-alert-success { background: #DCFCE7; color: #16A34A; border: 1px solid rgba(22,163,74,0.15); }

        /* ── Icon circle ── */
        .auth-icon-circle {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }

        /* ── OTP hint row ── */
        .otp-hint-row {
          display: flex; align-items: center; gap: 8px;
          background: #EEF9F7; border: 1px solid rgba(26,123,107,0.15);
          border-radius: 10px; padding: 12px 16px;
          font-size: 0.78rem; color: #1A7B6B; font-weight: 600; margin-bottom: 20px;
        }

        /* ── Divider ── */
        .auth-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 16px 0; color: #9CA3AF; font-size: 0.72rem; font-weight: 600;
        }
        .auth-divider::before, .auth-divider::after {
          content: ''; flex: 1; height: 1px; background: #E5E7EB;
        }

        /* ── Terms ── */
        .terms-row {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.78rem; color: #6B7280; font-weight: 500; line-height: 1.5;
        }
        .terms-row input[type="checkbox"] {
          width: 16px; height: 16px; border: 2px solid #D1D5DB;
          border-radius: 4px; cursor: pointer; flex-shrink: 0; margin-top: 2px;
          accent-color: #1A7B6B;
        }
        .terms-link { color: #1A7B6B; font-weight: 700; text-decoration: none; }
        .terms-link:hover { text-decoration: underline; }

        /* ── Step badge ── */
        .step-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(26,123,107,0.08); border: 1px solid rgba(26,123,107,0.2);
          border-radius: 50px; padding: 4px 12px;
          font-size: 0.7rem; font-weight: 700; color: #1A7B6B;
          margin-bottom: 16px;
        }

        /* ── Responsive ── */
        @media (max-width: 992px) {
          .auth-showcase { display: none !important; }
          .auth-form-panel {
            flex: 1 !important; padding: 24px 16px !important;
            background: radial-gradient(circle at 50% 50%, #162C54 0%, #0F2044 100%) !important;
          }
          .auth-back-btn {
            top: 20px; left: 20px;
            background: rgba(255,255,255,0.08) !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            color: white !important; box-shadow: none !important;
          }
          .auth-back-btn:hover { background: rgba(255,255,255,0.15) !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          LEFT — SHOWCASE PANEL
      ══════════════════════════════════════════════════════════ */}
      <div className="auth-showcase">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 10 }}>
          <a href="#" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.65rem", color: "white", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 800 }}>
            <div style={{ width: 10, height: 10, background: "#C8922A", borderRadius: 3, transform: "rotate(45deg)", flexShrink: 0, boxShadow: "0 0 10px rgba(200,146,42,0.5)" }} />
            Tax<span style={{ color: "#4DD9C0" }}>Wise</span>
          </a>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", padding: "5px 12px", borderRadius: 50, fontSize: ".68rem", color: "rgba(255,255,255,0.75)", fontWeight: 600, width: "fit-content", marginTop: 8 }}>
            🏛️ ICPAU CPD-Eligible Platform
          </div>
        </div>

        <div style={{ margin: "48px 0", position: "relative", zIndex: 10 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2rem,3.2vw,2.6rem)", lineHeight: 1.15, fontWeight: 700, marginBottom: 28, letterSpacing: "-0.01em" }}>
            Uganda&apos;s complete <br />
            <span style={{ color: "#4DD9C0", fontStyle: "italic" }}>tax intelligence</span> platform
          </h1>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 32, backdropFilter: "blur(8px)" }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 16 }}>
              &quot;TaxWise retrieved a crucial TAT precedent in 4 seconds that would have taken me hours to search for manually. It has completely transformed our tribunal preparation.&quot;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1A7B6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 700, color: "white" }}>SN</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Sarah Nakato</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>Senior Tax Consultant, Kampala</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["Instant AI TAT Precedents Risk Analyzer", "PAYE, VAT, Corporate & Vehicle Import Calculators", "Up-to-date URA Practice Notes & Statutory Checklists"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                <span style={{ color: "#4DD9C0", fontWeight: 800, lineHeight: 1 }}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, position: "relative", zIndex: 10 }}>
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", fontFamily: "'Playfair Display', Georgia, serif" }}>4,200+</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Cases Analyzed</div>
          </div>
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", fontFamily: "'Playfair Display', Georgia, serif" }}>85%</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Time Saved vs Manual</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          RIGHT — FORM PANEL
      ══════════════════════════════════════════════════════════ */}
      <div className="auth-form-panel">
        {onBack && (
          <button onClick={onBack} className="auth-back-btn">← Back to Home</button>
        )}

        <div className="auth-form-card">
          <Card style={{ padding: "36px 32px", boxShadow: "0 20px 48px rgba(15,32,68,0.07)", border: "1px solid rgba(15,32,68,0.05)", background: C.white }}>


            {/* ════════════════════════════════════════════
                FORGOT SCREEN — Step 1: enter email
            ════════════════════════════════════════════ */}
            {mode === "forgot" && (
              <div className="auth-form-content">
                <div style={{ marginBottom: 24 }}>
                  <div className="step-badge">
                    <span>Step 1 of 2</span>
                    <span>—</span>
                    <span>Enter your email</span>
                  </div>
                  <div className="auth-icon-circle" style={{ background: "#E6F5F2", color: C.teal, width: 60, height: 60 }}>
                    <KeyIcon />
                  </div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em", marginBottom: 6 }}>
                    Forgot your password?
                  </h2>
                  <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.55, fontWeight: 500 }}>
                    We&apos;ll email you a <strong>reset link</strong> and a <strong>6-digit code</strong> — use whichever is convenient.
                  </p>
                </div>

                <FormField label="Email Address" required error={fieldErrors.email}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: undefined })); }}
                    placeholder="you@example.com"
                    style={inputStyle(!!fieldErrors.email)}
                  />
                </FormField>

                {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}

                <Button onClick={handleForgotPassword} disabled={loading} style={{ width: "100%", justifyContent: "center", marginBottom: 16, marginTop: 4 }}>
                  {loading ? "⟳ Sending..." : "Send Reset Code & Link →"}
                </Button>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => switchMode("login")} className="forgot-link">← Back to Sign In</button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                RESET-CODE SCREEN — Step 2: code + new pw
            ════════════════════════════════════════════ */}
            {mode === "reset-code" && (
              <div className="auth-form-content">
                <div style={{ marginBottom: 22 }}>
                  <div className="step-badge">
                    <span>Step 2 of 2</span>
                    <span>—</span>
                    <span>Enter code & new password</span>
                  </div>
                  <div className="auth-icon-circle" style={{ background: "#E6F5F2", color: C.teal, width: 60, height: 60 }}>
                    <ShieldIcon />
                  </div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em", marginBottom: 6 }}>
                    Reset your password
                  </h2>
                  <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.55, fontWeight: 500 }}>
                    Code sent to <strong style={{ color: C.navy }}>{email}</strong>. Enter it below along with your new password.
                  </p>
                </div>

                {/* OTP hint */}
                <div className="otp-hint-row" style={{ marginBottom: 18 }}>
                  <span>💡</span>
                  <span>You can also click the reset link in your email to reset via browser.</span>
                </div>

                {/* OTP boxes */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 10, textAlign: "center" }}>
                    5-Digit Reset Code <span style={{ color: C.red }}>*</span>
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={(v) => { setOtpCode(v); setFieldErrors(f => ({ ...f, otp: undefined })); }}
                    error={fieldErrors.otp}
                    length={5}
                    alphanumeric={false}
                  />
                </div>

                {/* Resend link */}
                <div style={{ textAlign: "center", marginBottom: 20, marginTop: 10 }}>
                  <span style={{ fontSize: "0.75rem", color: C.muted }}>Didn&apos;t receive it? </span>
                  <button
                    className="forgot-link"
                    style={{ fontSize: "0.75rem" }}
                    onClick={handleResendResetCode}
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Sending..." : "Resend code"}
                  </button>
                </div>

                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); setFieldErrors(f => ({ ...f, newPassword: undefined })); }}
                  error={fieldErrors.newPassword}
                  required
                  showStrength
                />

                <ConfirmPasswordField
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  matchValue={newPassword}
                  onChange={(v) => { setConfirmNewPassword(v); setFieldErrors(f => ({ ...f, confirmNewPassword: undefined })); }}
                  error={fieldErrors.confirmNewPassword}
                  required
                />

                {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}
                {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

                <Button
                  onClick={handleResetWithCode}
                  disabled={loading || otpCode.length < 5}
                  style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
                >
                  {loading ? "⟳ Resetting..." : "Reset My Password →"}
                </Button>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => switchMode("forgot")} className="forgot-link">← Back</button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                VERIFY-SIGNUP SCREEN — Enter OTP for Signup
            ════════════════════════════════════════════ */}
            {mode === "verify-signup" && (
              <div className="auth-form-content">
                <div style={{ marginBottom: 22 }}>
                  <div className="step-badge">
                    <span>Verify Account</span>
                    <span>—</span>
                    <span>Enter 5-digit OTP</span>
                  </div>
                  <div className="auth-icon-circle" style={{ background: "#E6F5F2", color: C.teal, width: 60, height: 60 }}>
                    <ShieldIcon />
                  </div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em", marginBottom: 6 }}>
                    Confirm your email
                  </h2>
                  <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.55, fontWeight: 500 }}>
                    We sent a 5-digit verification code to <strong style={{ color: C.navy }}>{email}</strong>. Enter it below to activate your account.
                  </p>
                </div>

                {/* OTP boxes */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 10, textAlign: "center" }}>
                    5-Digit Verification Code <span style={{ color: C.red }}>*</span>
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={(v) => { setOtpCode(v); setFieldErrors(f => ({ ...f, otp: undefined })); }}
                    error={fieldErrors.otp}
                    length={5}
                    alphanumeric={false}
                  />
                </div>

                {/* Resend link */}
                <div style={{ textAlign: "center", marginBottom: 20, marginTop: 10 }}>
                  <span style={{ fontSize: "0.75rem", color: C.muted }}>Didn&apos;t receive it? </span>
                  <button
                    className="forgot-link"
                    style={{ fontSize: "0.75rem" }}
                    onClick={handleResendSignupCode}
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Sending..." : "Resend code"}
                  </button>
                </div>

                {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}
                {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

                <Button
                  onClick={handleVerifySignup}
                  disabled={loading || otpCode.length < 5}
                  style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
                >
                  {loading ? "⟳ Verifying..." : "Verify & Activate Account →"}
                </Button>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => switchMode("signup")} className="forgot-link">← Change email / Cancel</button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                UPDATE-PASSWORD SCREEN — From recovery link
            ════════════════════════════════════════════ */}
            {mode === "update-password" && (
              <div className="auth-form-content">
                <div style={{ marginBottom: 22 }}>
                  <div className="auth-icon-circle" style={{ background: "#E6F5F2", color: C.teal, width: 60, height: 60 }}>
                    <KeyIcon />
                  </div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em", marginBottom: 6 }}>
                    Choose new password
                  </h2>
                  <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.55, fontWeight: 500 }}>
                    Please enter and confirm your new password below.
                  </p>
                </div>

                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); setFieldErrors(f => ({ ...f, newPassword: undefined })); }}
                  error={fieldErrors.newPassword}
                  required
                  showStrength
                />

                <ConfirmPasswordField
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  matchValue={newPassword}
                  onChange={(v) => { setConfirmNewPassword(v); setFieldErrors(f => ({ ...f, confirmNewPassword: undefined })); }}
                  error={fieldErrors.confirmNewPassword}
                  required
                />

                {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}
                {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

                <Button
                  onClick={handleUpdatePasswordOnly}
                  disabled={loading}
                  style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
                >
                  {loading ? "⟳ Saving..." : "Save New Password →"}
                </Button>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => {
                    if (onBack) onBack();
                    else switchMode("login");
                  }} className="forgot-link">← Cancel</button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                LOGIN / SIGNUP
            ════════════════════════════════════════════ */}
            {(mode === "login" || mode === "signup") && (
              <div className="auth-form-content">
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em", marginBottom: 4 }}>
                    {mode === "login" ? "Welcome back" : "Create Account"}
                  </h2>
                  <p style={{ color: C.muted, fontSize: "0.83rem", fontWeight: 500, lineHeight: 1.4 }}>
                    {mode === "login" ? "Access your dashboard and start analyzing cases." : "Start your 14-day free trial of TaxWise today."}
                  </p>
                </div>

                {/* Tab Switcher */}
                <div style={{ display: "flex", marginBottom: 22, background: "#EAE9E5", borderRadius: 10, padding: 4 }}>
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className="auth-tab-btn"
                      style={{
                        background: mode === m ? C.white : "transparent",
                        color: mode === m ? C.navy : C.muted,
                        boxShadow: mode === m ? "0 2px 8px rgba(15,32,68,.06)" : "none",
                      }}
                    >
                      {m === "login" ? "Sign In" : "Register"}
                    </button>
                  ))}
                </div>

                {/* Full Name */}
                {mode === "signup" && (
                  <FormField label="Full Name" required error={fieldErrors.name}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: undefined })); }}
                      placeholder="e.g. Ronald Kakembo"
                      style={inputStyle(!!fieldErrors.name)}
                    />
                  </FormField>
                )}

                {/* Email */}
                <FormField label="Email Address" required error={fieldErrors.email}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: undefined })); }}
                    placeholder="you@example.com"
                    style={inputStyle(!!fieldErrors.email)}
                  />
                </FormField>

                {/* Password */}
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={(v) => { setPassword(v); setFieldErrors(f => ({ ...f, password: undefined })); }}
                  error={fieldErrors.password}
                  required
                  showStrength={mode === "signup"}
                  showForgot={mode === "login"}
                  onForgot={() => switchMode("forgot")}
                />

                {/* Confirm Password */}
                {mode === "signup" && (
                  <ConfirmPasswordField
                    label="Confirm Password"
                    value={confirmPassword}
                    matchValue={password}
                    onChange={(v) => { setConfirmPassword(v); setFieldErrors(f => ({ ...f, confirmPassword: undefined })); }}
                    error={fieldErrors.confirmPassword}
                    required
                  />
                )}

                {/* Role */}
                {mode === "signup" && (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                      Professional Role <span style={{ color: C.red }}>*</span>
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: "0.875rem", fontFamily: "inherit", background: C.offwhite, color: C.text, fontWeight: 600, outline: "none", transition: "all 0.2s ease", boxSizing: "border-box", cursor: "pointer" }}
                    >
                      {["Tax Consultant", "Accountant", "Tax Lawyer", "Finance Manager", "Business Owner", "Student"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Terms */}
                {mode === "signup" && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="terms-row">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => { setAgreeTerms(e.target.checked); setFieldErrors(f => ({ ...f, agreeTerms: undefined })); }}
                      />
                      <label htmlFor="agreeTerms" style={{ cursor: "pointer", fontSize: "0.78rem", color: C.muted, fontWeight: 500, lineHeight: 1.5, userSelect: "none" }}>
                        I agree to the <a href="#" className="terms-link">Terms of Service</a> and <a href="#" className="terms-link">Privacy Policy</a>
                      </label>
                    </div>
                    {fieldErrors.agreeTerms && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: "0.75rem", color: C.red, fontWeight: 600, animation: "authFadeIn 0.2s ease" }}>
                        <span>⚠</span> {fieldErrors.agreeTerms}
                      </div>
                    )}
                  </div>
                )}

                {/* Alerts */}
                {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}
                {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

                {/* Submit */}
                <Button onClick={handleAuth} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {loading ? "⟳ Authenticating..." : mode === "login" ? "Sign In →" : "Create My Account →"}
                </Button>

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.75rem", color: C.muted, fontWeight: 500, lineHeight: 1.5 }}>
                  {mode === "login" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button className="forgot-link" onClick={() => switchMode("signup")} style={{ fontSize: "0.75rem" }}>
                        Register free →
                      </button>
                    </>
                  ) : (
                    "Free 14-day trial · No credit card required · Cancel anytime"
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
