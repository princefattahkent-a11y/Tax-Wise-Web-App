import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Card, Button } from "./UI";

interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
}

interface ProfileSettingsProps {
  user: DbProfile;
  onRefreshUser: () => void;
  onNavigateToPricing: () => void;
  onAccountDeleted: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onRefreshUser, onNavigateToPricing, onAccountDeleted }) => {
  // Personal Info States
  const [fullName, setFullName] = useState(user.full_name || "");
  const [role, setRole] = useState(user.role || "Student");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password Change States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError] = useState("");

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteStep, setDeleteStep] = useState<"confirm" | "deleting" | "done">("confirm");

  const roles = [
    "Tax Consultant",
    "Lawyer",
    "Student",
    "Business Owner",
    "Accountant",
    "Other"
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess("");
    setProfileError("");

    if (!fullName.trim()) {
      setProfileError("Full Name is required.");
      setProfileLoading(false);
      return;
    }

    try {
      // 1. Update public.users table in database
      const { error: dbError } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim(),
          role: role
        })
        .eq("id", user.id);

      if (dbError) throw dbError;

      // 2. Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          role: role
        }
      });

      if (authError) throw authError;

      setProfileSuccess("Profile updated successfully!");
      onRefreshUser();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassSuccess("");
    setPassError("");

    if (newPassword.length < 8) {
      setPassError("Password must be at least 8 characters long.");
      setPassLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPassError("Password must contain at least one uppercase letter.");
      setPassLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPassError("Password must contain at least one number.");
      setPassLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      setPassLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPassSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");

    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" exactly to confirm.');
      return;
    }

    if (!deletePassword) {
      setDeleteError("Please enter your current password to proceed.");
      return;
    }

    setDeleteLoading(true);
    setDeleteStep("deleting");

    try {
      // Step 1: Re-authenticate — verify the password is correct
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (reAuthError) {
        setDeleteError("Incorrect password. Please try again.");
        setDeleteStep("confirm");
        setDeleteLoading(false);
        return;
      }

      // Step 2: Get current session token to send to API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDeleteError("Session expired. Please refresh and try again.");
        setDeleteStep("confirm");
        setDeleteLoading(false);
        return;
      }

      // Step 3: Call the secure server-side delete API
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setDeleteError(result.error || "Failed to delete account. Please try again.");
        setDeleteStep("confirm");
        setDeleteLoading(false);
        return;
      }

      // Step 4: Sign out locally and notify the parent
      setDeleteStep("done");
      setTimeout(async () => {
        await supabase.auth.signOut();
        onAccountDeleted();
      }, 2000);

    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setDeleteStep("confirm");
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteStep === "deleting") return; // Don't allow closing during deletion
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
    setDeleteStep("confirm");
  };

  // Inline premium style helpers
  const inputContainerStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    marginBottom: 18,
    textAlign: "left" as const,
  };

  const labelStyle = {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: C.navy,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    fontSize: "0.9rem",
    color: C.navy,
    background: C.white,
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const disabledInputStyle = {
    ...inputStyle,
    background: "#F3F4F6",
    color: "#9CA3AF",
    cursor: "not-allowed",
    border: "1.5px solid #E5E7EB",
  };

  const isDeleteReady = deleteConfirmText === "DELETE" && deletePassword.length > 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        {/* Title Header */}
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Profile &amp; Settings
          </h1>
          <p style={{ color: C.muted, fontSize: "0.875rem", fontWeight: 500 }}>
            Manage your personal details, secure your account, and view subscription status.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          
          {/* Left Side: Personal Details */}
          <Card style={{ padding: 28, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E6F5F2", color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                👤
              </div>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.navy, margin: 0 }}>Personal details</h2>
                <span style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 500 }}>Update your name and career role</span>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div style={inputContainerStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  style={inputStyle}
                />
              </div>

              <div style={inputContainerStyle}>
                <label style={labelStyle}>Email Address (Read-only)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    style={disabledInputStyle}
                  />
                  <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "#9CA3AF" }}>
                    🔒
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", color: C.muted, marginTop: 4 }}>
                  For security reasons, changing your email is managed under account recovery.
                </span>
              </div>

              <div style={inputContainerStyle}>
                <label style={labelStyle}>Professional Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "20px",
                    backgroundRepeat: "no-repeat",
                    paddingRight: 40
                  }}
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {profileError && (
                <div style={{ background: C.redLight, border: `1px solid ${C.red}`, color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500, marginBottom: 16 }}>
                  ⚠️ {profileError}
                </div>
              )}

              {profileSuccess && (
                <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, color: C.green, padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500, marginBottom: 16 }}>
                  ✓ {profileSuccess}
                </div>
              )}

              <Button
                disabled={profileLoading}
                style={{ width: "100%", justifyContent: "center", padding: "12px 0", marginTop: 8 }}
              >
                {profileLoading ? "Saving Changes..." : "Save Details"}
              </Button>
            </form>
          </Card>

          {/* Right Side: Security & Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Card 1: Change Password */}
            <Card style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF3CD", color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                  🔑
                </div>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.navy, margin: 0 }}>Change Password</h2>
                  <span style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 500 }}>Secure your account credentials</span>
                </div>
              </div>

              <form onSubmit={handleChangePassword}>
                <div style={inputContainerStyle}>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars, 1 capital, 1 number"
                    style={inputStyle}
                  />
                </div>

                <div style={inputContainerStyle}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={inputStyle}
                  />
                </div>

                {passError && (
                  <div style={{ background: C.redLight, border: `1px solid ${C.red}`, color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500, marginBottom: 16 }}>
                    ⚠️ {passError}
                  </div>
                )}

                {passSuccess && (
                  <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, color: C.green, padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500, marginBottom: 16 }}>
                    ✓ {passSuccess}
                  </div>
                )}

                <Button
                  disabled={passLoading}
                  style={{ width: "100%", justifyContent: "center", padding: "12px 0", marginTop: 8 }}
                >
                  {passLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Card>

            {/* Card 2: Subscription Status */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>💳</span>
                  <span style={{ fontWeight: 800, color: C.navy, fontSize: "0.95rem" }}>My Subscription</span>
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: C.teal, background: C.tealLight, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.teal}33` }}>
                  {user.plan?.toUpperCase()} PLAN
                </span>
              </div>

              <div style={{ background: C.offwhite, padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 6 }}>
                  Plan Benefits:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: C.navy, lineHeight: 1.5 }}>
                  <li>Analyze legal cases with AI</li>
                  <li>Verify URA compliance checklists</li>
                  <li>Browse TAT legal library</li>
                  {user.plan?.toLowerCase() === "free" ? (
                    <li style={{ color: C.muted }}>Daily search limit (10 searches/day)</li>
                  ) : (
                    <li style={{ fontWeight: 700, color: C.teal }}>Unlimited AI lookups &amp; reports</li>
                  )}
                </ul>
              </div>

              {user.plan?.toLowerCase() === "free" && (
                <button
                  onClick={onNavigateToPricing}
                  style={{
                    background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
                    color: C.white,
                    border: "none",
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(26,123,107,0.2)",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    textAlign: "center"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
                >
                  Upgrade to Professional Plan
                </button>
              )}
            </Card>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div
          style={{
            borderRadius: 16,
            border: `1.5px solid ${C.red}33`,
            background: `linear-gradient(135deg, #fff5f5 0%, #fff 100%)`,
            padding: 28,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle red accent glow in corner */}
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `${C.red}12`,
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: C.redLight,
                border: `1.5px solid ${C.red}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                flexShrink: 0,
              }}>
                ⚠️
              </div>
              <div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#991B1B", margin: 0, marginBottom: 4 }}>
                  Danger Zone
                </h2>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#7F1D1D", lineHeight: 1.5, maxWidth: 480 }}>
                  Permanently delete your TaxWise account and all associated data. This action is
                  <strong> irreversible</strong> — all your case history, saved reports, and subscription data will be lost.
                </p>
              </div>
            </div>
            <button
              id="delete-account-btn"
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: "transparent",
                border: `1.5px solid ${C.red}`,
                color: C.red,
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.red;
                e.currentTarget.style.color = C.white;
                e.currentTarget.style.boxShadow = `0 4px 14px ${C.red}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.red;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              🗑️ Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 32, 68, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 20,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 24px 80px rgba(15, 32, 68, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.1)",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)`,
              borderBottom: `1px solid ${C.red}22`,
              padding: "24px 28px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: C.redLight,
                border: `2px solid ${C.red}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                flexShrink: 0,
              }}>
                {deleteStep === "done" ? "✓" : "🗑️"}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#991B1B" }}>
                  {deleteStep === "done" ? "Account Deleted" : "Delete Account"}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#B91C1C", fontWeight: 500 }}>
                  {deleteStep === "done" ? "Signing you out..." : "This action cannot be undone"}
                </span>
              </div>
              {deleteStep === "confirm" && (
                <button
                  onClick={closeDeleteModal}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    fontSize: "1.3rem",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    padding: 4,
                    lineHeight: 1,
                    borderRadius: 6,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = C.navy}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#9CA3AF"}
                >
                  ×
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 28px" }}>

              {deleteStep === "done" ? (
                /* Success / Done state */
                <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>👋</div>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: C.muted, lineHeight: 1.6 }}>
                    Your account has been permanently deleted. Thank you for using TaxWise.
                  </p>
                </div>
              ) : deleteStep === "deleting" ? (
                /* Deleting state */
                <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
                  <div style={{ position: "relative", width: 44, height: 44, margin: "0 auto 16px" }}>
                    <svg width="44" height="44" viewBox="0 0 44 44" style={{ display: "block" }}>
                      <circle cx="22" cy="22" r="18" fill="none" stroke={`${C.red}22`} strokeWidth="3" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={C.red} strokeWidth="3" strokeDasharray="113" strokeDashoffset="40" strokeLinecap="round" style={{ transformOrigin: "center", animation: "spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite" }} />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: C.muted, fontWeight: 500 }}>
                    Deleting your account and all associated data...
                  </p>
                </div>
              ) : (
                /* Confirm step */
                <>
                  {/* Warning banner */}
                  <div style={{
                    background: "#FEF2F2",
                    border: `1px solid ${C.red}33`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    marginBottom: 22,
                    fontSize: "0.8rem",
                    color: "#7F1D1D",
                    lineHeight: 1.5,
                  }}>
                    <strong>⚠️ Warning:</strong> All your data including case analyses, compliance reports, and subscription history will be <strong>permanently erased</strong> and cannot be recovered.
                  </div>

                  {/* Password field */}
                  <div style={{ ...inputContainerStyle, marginBottom: 16 }}>
                    <label style={{ ...labelStyle, color: "#991B1B" }}>Current Password</label>
                    <input
                      id="delete-password-input"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your current password"
                      style={{
                        ...inputStyle,
                        border: `1.5px solid ${C.red}44`,
                        color: C.navy,
                      }}
                      autoComplete="current-password"
                    />
                    <span style={{ fontSize: "0.72rem", color: C.muted }}>
                      Required to verify your identity before deletion.
                    </span>
                  </div>

                  {/* Confirm text field */}
                  <div style={inputContainerStyle}>
                    <label style={{ ...labelStyle, color: "#991B1B" }}>
                      Type <span style={{ fontFamily: "monospace", background: "#FEE2E2", padding: "1px 6px", borderRadius: 4 }}>DELETE</span> to confirm
                    </label>
                    <input
                      id="delete-confirm-input"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      style={{
                        ...inputStyle,
                        border: `1.5px solid ${deleteConfirmText === "DELETE" ? C.red : C.border}`,
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                        color: C.navy,
                      }}
                    />
                  </div>

                  {deleteError && (
                    <div style={{
                      background: C.redLight,
                      border: `1px solid ${C.red}`,
                      color: C.red,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      marginBottom: 16,
                    }}>
                      ⚠️ {deleteError}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button
                      onClick={closeDeleteModal}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: `1.5px solid ${C.border}`,
                        background: C.white,
                        color: C.navy,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = C.offwhite}
                      onMouseLeave={(e) => e.currentTarget.style.background = C.white}
                    >
                      Cancel
                    </button>
                    <button
                      id="confirm-delete-btn"
                      onClick={handleDeleteAccount}
                      disabled={!isDeleteReady || deleteLoading}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: "none",
                        background: isDeleteReady
                          ? `linear-gradient(135deg, ${C.red} 0%, #B91C1C 100%)`
                          : "#E5E7EB",
                        color: isDeleteReady ? C.white : "#9CA3AF",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: isDeleteReady ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                        boxShadow: isDeleteReady ? `0 4px 14px ${C.red}44` : "none",
                      }}
                    >
                      {deleteLoading ? "Deleting..." : "Permanently Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
