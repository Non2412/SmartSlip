"use client";

import { useSession } from "next-auth/react";

export interface GoogleDriveSession {
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleExpiresAt?: number;
}

/**
 * Hook for managing Google Drive access
 * Returns user's Google access token from NextAuth session
 */
export const useGoogleDrive = () => {
  const { data: session, status } = useSession();

  const getGoogleAccessToken = (): string | null => {
    if (!session) return null;
    return (session as any).googleAccessToken || null;
  };

  const isGoogleAuthorized = (): boolean => {
    const token = getGoogleAccessToken();
    return !!token;
  };

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  return {
    getGoogleAccessToken,
    isGoogleAuthorized,
    isLoading,
    isAuthenticated,
    session: session as GoogleDriveSession | null,
  };
};
