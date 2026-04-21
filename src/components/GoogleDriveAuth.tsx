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
  const setupInProgressRef = useRef(false);

  // Auto-setup Google Drive folder using Service Account (no user auth required)
  useEffect(() => {
    const setupGoogleDrive = async () => {
      const userId = session?.user?.id;

      // Setup automatically when user is logged in (ไม่ต้องให้ user authorize)
      if (userId && !setupInProgressRef.current) {
        setupInProgressRef.current = true;
        console.log("📁 Setting up Google Drive folder with Service Account...", { userId });

        try {
          const setupResponse = await fetch("/api/drive/setup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({
              userId,
              email: session?.user?.email,
              // ไม่ต้องส่ง googleAccessToken - Service Account ทำเอง!
            }),
          });

          const setupData = await setupResponse.json();

          if (!setupResponse.ok) {
            console.error("❌ ล้มเหลวในการตั้งค่าโฟลเดอร์ Drive:", setupData);
            setError(setupData?.error || "ล้มเหลวในการตั้งค่า Google Drive");
            setupInProgressRef.current = false;
            return;
          }

          console.log("✅ Google Drive folder created with Service Account:", setupData);
          onAuthSuccess?.();
          setupInProgressRef.current = false;
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("❌ ข้อผิดพลาดในการตั้งค่า:", errorMsg);
          setError(errorMsg);
          setupInProgressRef.current = false;
        }
      }
    };

    setupGoogleDrive();
  }, [session?.user?.id]);

  const handleAuthorize = async () => {
    // Service Account ทำการ setup อัตโนมัติแล้ว - ไม่ต้องแสดง button นี้
    console.log("✅ Google Drive is already set up via Service Account");
  };

  const fixFolderPermissions = async () => {
    // Service Account ทำการ setup อัตโนมัติแล้ว
    console.log("✅ Folder already set up via Service Account");
  };

  // ✅ Show "Ready" status for all logged-in users (Service Account handles setup automatically)
  const isLineUser = (session as any)?.lineUserName ? true : false;
  
  if (session && session.user?.id) {
    return (
      <div className={styles.authenticatedContainer}>
        <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {showText && <span className={styles.authenticatedText}>✅ Google Drive Ready (Service Account)</span>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button
        onClick={handleAuthorize}
        disabled={isLoading}
        className={styles.button}
        style={{ opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        title={isLoading ? "Authorizing Google Drive..." : "Authorize Google Drive access for receipt storage"}
      >
        <svg className={styles.googleIcon} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {showText && (isLoading ? "Authorizing..." : "Authorize Google Drive")}
      </button>
      {error && (
        <div className={styles.error}>
          <small>⚠️ {error}</small>
        </div>
      )}
    </div>
  );
};
