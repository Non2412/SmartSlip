'use client';

import { SessionProvider } from "next-auth/react"
import { FlowProvider } from "@/context/FlowContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <FlowProvider>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </FlowProvider>
        </SessionProvider>
    )
}
