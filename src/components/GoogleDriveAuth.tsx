"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import styles from "./GoogleDriveAuth.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'super-secret-api-key-12345';

interface GoogleDriveAuthProps {
  onAuthSuccess?: () => void;
  showText?: boolean;
}

/**
 * Component for Google Drive authorization
 * Allows users to connect their Google Drive account for receipt storage
 */
export const GoogleDriveAuth = ({ onAuthSuccess, showText = true }: GoogleDriveAuthProps) => {
  const { data: session, update: updateSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const setupInProgressRef = useRef(false);

  const runSetup = async (userId: string, email?: string | null) => {
    if (setupInProgressRef.current) return;
    setupInProgressRef.current = true;
    setIsLoading(true);
    setError(null);
    console.log("📁 Setting up Google Drive folder with Service Account...", { userId });

    try {
      const setupResponse = await fetch("/api/drive/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ userId, email }),
      });

      const setupData = await setupResponse.json();

      if (!setupResponse.ok) {
        console.error("❌ ล้มเหลวในการตั้งค่าโฟลเดอร์ Drive:", setupData);
        setError(setupData?.error || "ล้มเหลวในการตั้งค่า Google Drive");
        setupInProgressRef.current = false;
        setIsLoading(false);
        return;
      }

      console.log("✅ Google Drive folder setup with Service Account:", setupData);
      setSetupDone(true);
      onAuthSuccess?.();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("❌ ข้อผิดพลาดในการตั้งค่า:", errorMsg);
      setError(errorMsg);
    } finally {
      setupInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกการเชื่อมต่อ Google Drive? (ระบบจะล้างการตั้งค่าโฟลเดอร์เดิม)")) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/drive/disconnect", {
        method: "POST",
      });
      
      if (response.ok) {
        alert("ยกเลิกการเชื่อมต่อสำเร็จ!");
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`เกิดข้อผิดพลาด: ${data.error || "ไม่สามารถยกเลิกการเชื่อมต่อได้"}`);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-setup Google Drive folder using Service Account (no user auth required)
  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      runSetup(userId, session?.user?.email);
    }
  }, [session?.user?.id]);

  // Show status for logged-in users
  if (session && session.user?.id) {
    return (
      <div className={styles.authenticatedContainer}>
        {isLoading ? (
          <span className={styles.authenticatedText}>⏳ กำลังซิงค์ Google Drive...</span>
        ) : (
          <>
            <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {showText && <span className={styles.authenticatedText}>เชื่อมต่อแล้ว</span>}
            <button
              onClick={() => runSetup(session.user!.id!, session.user?.email)}
              title="ซิงค์สิทธิ์โฟลเดอร์ Google Drive อีกครั้ง"
              className={styles.syncButton}
            >
              🔄
            </button>
            <button
              onClick={handleDisconnect}
              title="ยกเลิกการเชื่อมต่อ Google Drive"
              className={styles.syncButton}
              style={{ marginLeft: '4px', backgroundColor: '#fee2e2' }}
            >
              ❌
            </button>
          </>
        )}
        {error && <div className={styles.error}><small>⚠️ {error}</small></div>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <span className={styles.loginPrompt}>กรุณาเข้าสู่ระบบ</span>
    </div>
  );
};
