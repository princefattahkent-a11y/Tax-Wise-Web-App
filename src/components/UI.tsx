import React, { useState } from "react";
import { motion } from "motion/react";
import { C } from "../lib/constants";
import { X } from "lucide-react";

interface BadgeProps {
  color: string;
  bg: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ color, bg, children, style = {} }) => (
  <span
    style={{
      background: bg,
      color,
      fontSize: "0.72rem",
      fontWeight: 700,
      padding: "4px 12px",
      borderRadius: 50,
      display: "inline-flex",
      alignItems: "center",
      letterSpacing: "0.03em",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </span>
);

interface ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
  small?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  small,
  disabled,
  style = {},
}) => {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    outline: "none",
    transition: "background 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease",
    boxShadow: hovered && !disabled ? "0 4px 12px rgba(15, 32, 68, 0.08)" : "0 2px 4px rgba(15, 32, 68, 0.04)",
    ...style,
  };

  const variants = {
    primary: {
      background: hovered ? `linear-gradient(135deg, ${C.tealDark} 0%, ${C.teal} 100%)` : `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
      color: C.white,
      padding: small ? "8px 16px" : "11px 24px",
      fontSize: small ? "0.8rem" : "0.9rem",
    },
    outline: {
      background: hovered ? "rgba(15, 32, 68, 0.03)" : "transparent",
      color: C.navy,
      border: `2.5px solid ${C.navy}`,
      padding: small ? "6px 14px" : "9px 22px",
      fontSize: small ? "0.8rem" : "0.9rem",
    },
    ghost: {
      background: hovered ? "rgba(15, 32, 68, 0.04)" : "transparent",
      color: C.muted,
      padding: small ? "6px 12px" : "9px 16px",
      fontSize: "0.85rem",
      boxShadow: "none",
    },
    danger: {
      background: hovered ? "#c22222" : C.red,
      color: C.white,
      padding: "9px 20px",
      fontSize: "0.875rem",
    },
    gold: {
      background: hovered ? "#b08022" : C.gold,
      color: C.white,
      padding: small ? "8px 16px" : "11px 24px",
      fontSize: small ? "0.8rem" : "0.9rem",
    },
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.015, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      style={{ ...base, ...variants[variant] }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </motion.button>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, style = {}, hover, onClick, className }) => {
  const [hov, setHov] = useState(false);
  
  const cardShadow = hov 
    ? "0 14px 36px rgba(15, 32, 68, 0.09), 0 4px 14px rgba(15, 32, 68, 0.03)" 
    : "0 4px 16px rgba(15, 32, 68, 0.03), 0 1px 3px rgba(15, 32, 68, 0.01)";

  return (
    <motion.div
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className={className}
      whileHover={hover && !onClick ? { y: -4 } : hover && onClick ? { y: -4, scale: 1.005 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid rgba(15, 32, 68, 0.06)`,
        boxShadow: cardShadow,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <div style={{ padding: "20px 24px", borderBottom: `1px solid rgba(15, 32, 68, 0.05)`, ...style }}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.navy, margin: 0, fontFamily: "inherit", ...style }}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <p style={{ fontSize: "0.8rem", color: C.muted, margin: "4px 0 0 0", fontWeight: 400, ...style }}>
    {children}
  </p>
);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 32, 68, 0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px 20px",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        style={{
          background: C.white,
          borderRadius: 20,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(15, 32, 68, 0.24)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 28px",
            borderBottom: `1px solid rgba(15, 32, 68, 0.05)`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 800, color: C.navy, fontSize: "1.05rem" }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(15, 32, 68, 0.04)",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.muted,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(15, 32, 68, 0.08)";
              e.currentTarget.style.color = C.navy;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(15, 32, 68, 0.04)";
              e.currentTarget.style.color = C.muted;
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
};

interface InputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}) => (
  <div style={{ marginBottom: 18 }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: C.navy,
          marginBottom: 6,
          letterSpacing: "0.01em",
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-focus-ring"
      style={{
        width: "100%",
        border: `1.5px solid ${C.border}`,
        borderRadius: 8,
        padding: "11px 16px",
        fontSize: "0.875rem",
        fontFamily: "inherit",
        outline: "none",
        background: C.offwhite,
        color: C.text,
        boxSizing: "border-box",
        transition: "all 0.2s ease",
      }}
    />
  </div>
);

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 8, color, style = {} }) => (
  <div style={{ height, background: C.border, borderRadius: height / 2, overflow: "hidden", position: "relative", ...style }}>
    <div
      style={{
        height: "100%",
        width: `${progress}%`,
        background: color || `linear-gradient(90deg, ${C.teal} 0%, ${C.tealLight} 100%)`,
        borderRadius: height / 2,
        transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  </div>
);
