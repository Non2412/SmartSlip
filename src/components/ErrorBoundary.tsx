"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main, #0f172a)",
          padding: "24px",
          fontFamily: "var(--font-anuphan, sans-serif)",
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            background: "var(--card-bg, #1e293b)",
            border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            borderRadius: "20px",
            padding: "40px 36px",
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          }}>
            {/* Icon */}
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "var(--text-main, #f1f5f9)",
              margin: "0 0 10px",
            }}>
              เกิดข้อผิดพลาดบางอย่าง
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: "0.9rem",
              color: "var(--text-muted, #94a3b8)",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}>
              แอปพลิเคชันพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
              หรือติดต่อทีมงานหากปัญหายังคงเกิดขึ้น
            </p>

            {/* Error detail (collapsible) */}
            {this.state.error && (
              <details style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "24px",
                textAlign: "left",
                cursor: "pointer",
              }}>
                <summary style={{
                  fontSize: "0.8rem",
                  color: "#ef4444",
                  fontWeight: 600,
                  userSelect: "none",
                }}>
                  รายละเอียดข้อผิดพลาด
                </summary>
                <pre style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted, #94a3b8)",
                  marginTop: "10px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.5,
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                  background: "var(--surface-color, rgba(255,255,255,0.04))",
                  color: "var(--text-muted, #94a3b8)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color, rgba(255,255,255,0.1))")}
              >
                ลองใหม่
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(16,185,129,0.45)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(16,185,129,0.3)")}
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
