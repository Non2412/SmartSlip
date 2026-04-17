import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Line from "next-auth/providers/line"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
                    access_type: "offline",
                },
            },
        }),
        Line({
            clientId: process.env.LINE_CLIENT_ID,
            clientSecret: process.env.LINE_CLIENT_SECRET || process.env.LINE_CHANNEL_SECRET,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async signIn({ user, account }) {
            console.log("🔐 เข้าสู่ระบบสำเร็จ", {
                userId: user?.id,
                userEmail: user?.email,
                provider: account?.provider,
                hasAccessToken: !!account?.access_token,
                userObject: JSON.stringify(user)
            });
            // Allow sign in
            return true
        },
        async jwt({ token, account, user, trigger, session }) {
            // Only log on first load or when account changes
            if (user || account) {
                console.log("🔐 JWT ตรวจสอบ (user/account change)", {
                    hasUser: !!user,
                    provider: account?.provider,
                    hasAccessToken: !!account?.access_token,
                });
            }

            // Always ensure user ID and email are in token
            if (user) {
                token.sub = user.id
                token.email = user.email
                console.log("📝 บันทึก ID ผู้ใช้และอีเมล:", user.id, user.email);
            }
            
            // Store LINE user info as primary account (preserve it always)
            if (account?.provider === "line" && user?.name) {
                token.lineUserName = user.name
                token.lineUserImage = user.image
                console.log("📝 บันทึกข้อมูล LINE:", user.name);
            }
            
            // Store Google tokens during sign in
            if (account?.provider === "google" && account?.access_token) {
                token.googleAccessToken = account.access_token
                token.googleRefreshToken = account.refresh_token
                token.googleExpiresAt = account.expires_at
                console.log("✅ บันทึก Google tokens (new):", { hasAccessToken: !!account.access_token });
            }
            // Keep existing Google tokens if not being updated
            else if (token.googleAccessToken && !account) {
                // Silently preserve tokens, don't log
            }
            
            // Handle update trigger (called when session is updated)
            if (trigger === "update" && session) {
                // If clearing Google, remove Google tokens
                if (session.clearGoogleTokens) {
                    token.googleAccessToken = undefined
                    token.googleRefreshToken = undefined
                    token.googleExpiresAt = undefined
                    console.log("🗑️ ลบ Google tokens");
                }
            }
            
            return token
        },
        session({ session, token }) {
            // Pass token data to session
            if (session.user && token) {
                session.user.id = token.sub || ""
                // Always use email from token (JWT strategy source of truth)
                session.user.email = (token.email as string) || session.user.email
                ;(session as any).provider = token.provider
                ;(session as any).lineUserName = token.lineUserName
                ;(session as any).lineUserImage = token.lineUserImage
                ;(session as any).googleAccessToken = token.googleAccessToken
                ;(session as any).googleRefreshToken = token.googleRefreshToken
                ;(session as any).googleExpiresAt = token.googleExpiresAt
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn && nextUrl.pathname === "/login") {
                return Response.redirect(new URL("/dashboard", nextUrl))
            }
            return true
        },
    },
})
