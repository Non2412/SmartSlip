'use client';

import { SessionProvider, useSession } from "next-auth/react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ToastProvider } from "@/components/Toast"
import { useEffect } from "react"

function ActiveStatusTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session || !session.user) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user/active', { method: 'POST' });
      } catch (e) {
        console.error('Failed to send active status:', e);
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Send every 45 seconds (90s expiration)
    const interval = setInterval(sendHeartbeat, 45000);

    // Send heartbeat when tab visibility changes to visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ToastProvider>
                <ActiveStatusTracker />
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </ToastProvider>
        </SessionProvider>
    )
}

