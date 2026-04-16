"use client";

import React, { useState, useEffect } from "react";
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
  const [setupInProgress, setSetupInProgress] = useState(false);

  // Check if Google is authorized but setup hasn't been completed yet
  useEffect(() => {
    const setupGoogleDrive = async () => {
      const googleAccessToken = (session as any)?.googleAccessToken;
      const userId = session?.user?.id;

      // Only setup if we have tokens and setup isn't already in progress
      if (googleAccessToken && userId && !setupInProgress) {
        setSetupInProgress(true);
        console.log("🔐 Google tokens available, calling backend setup API...", { userId });

        try {
          const setupResponse = await fetch("/api/drive/setup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              googleAccessToken,
            }),
          });

          const setupData = await setupResponse.json();

          if (!setupResponse.ok) {
            console.error("❌ Drive folder setup failed:", setupData);
            setError(setupData?.error || "Failed to setup Google Drive");
            setSetupInProgress(false);
            return;
          }

          console.log("✅ Drive folder created successfully:", setupData);
          onAuthSuccess?.();
          setSetupInProgress(false);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("❌ Setup error:", errorMsg);
          setError(errorMsg);
          setSetupInProgress(false);
        }
      }
    };

    setupGoogleDrive();
  }, [session?.user?.id, (session as any)?.googleAccessToken, setupInProgress, onAuthSuccess]);

  const handleAuthorize = async () => {
    console.log("🔐 Starting Google Drive authorization...");
    setError(null);
    
    try {
      // For OAuth flows, we MUST allow the redirect to happen
      // signIn("google") will redirect to Google login page
      // After user grants permission, Google redirects back to /api/auth/callback/google
      // NextAuth will automatically update the session with Google tokens
      const result = await signIn("google", {
        redirect: true,
        callbackUrl: "/dashboard",
      });

      console.log("🔐 OAuth flow initiated, redirecting to Google login...", result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("❌ Authorization error:", errorMsg);
      setError(errorMsg);
    }
  };

  // If already authorized, show checkmark and info
  const isAuthorized = (session as any)?.googleAccessToken ? true : false;
  
  if (session && isAuthorized) {
    return (
      <div className={styles.authenticatedContainer}>
        <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {showText && <span className={styles.authenticatedText}>Google Drive Connected</span>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button
        onClick={handleAuthorize}
        className={styles.button}
        title="Authorize Google Drive access for receipt storage"
      >
        <svg className={styles.googleIcon} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {showText && ("Authorize Google Drive")}
      </button>
      {error && (
        <div className={styles.error}>
          <small>⚠️ {error}</small>
        </div>
      )}
    </div>
  );
};
