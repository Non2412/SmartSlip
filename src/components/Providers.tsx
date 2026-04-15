'use client';

import { SessionProvider } from "next-auth/react"
import { FlowProvider } from "@/context/FlowContext"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <FlowProvider>
                {children}
            </FlowProvider>
        </SessionProvider>
    )
}
