'use client';

import { SessionProvider } from "next-auth/react"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </SessionProvider>
    )
}
