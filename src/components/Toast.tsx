"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; accent: string; bg: string; border: string }> = {
  success: {
    icon: <SuccessIcon />,
    accent: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.25)",
  },
  error: {
    icon: <ErrorIcon />,
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.25)",
  },
  warning: {
    icon: <WarningIcon />,
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.25)",
  },
  info: {
    icon: <InfoIcon />,
    accent: "#6366f1",
    bg: "rgba(99,102,241,0.07)",
    border: "rgba(99,102,241,0.25)",
  },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const cfg = TOAST_CONFIG[toast.type];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 350);
    }, duration);
    return () => clearTimeout(t);
  }, [toast.id, duration, onRemove]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "14px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
        minWidth: "280px",
        maxWidth: "380px",
        transform: visible ? "translateX(0) scale(1)" : "translateX(60px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          background: cfg.accent,
          borderRadius: "0 0 14px 14px",
          animation: `toastProgress ${duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <div
        style={{
          color: cfg.accent,
          flexShrink: 0,
          marginTop: "1px",
        }}
      >
        {cfg.icon}
      </div>

      {/* Message */}
      <div
        style={{
          flex: 1,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--text-main, #1e293b)",
          lineHeight: 1.5,
          paddingRight: "4px",
        }}
      >
        {toast.message}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted, #94a3b8)",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          transition: "color 0.2s, background 0.2s",
          marginTop: "2px",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = cfg.accent;
          e.currentTarget.style.background = "rgba(0,0,0,0.06)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = "var(--text-muted, #94a3b8)";
          e.currentTarget.style.background = "none";
        }}
        aria-label="ปิดการแจ้งเตือน"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Inject keyframes for progress bar */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "all" }}>
            <ToastCard toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
