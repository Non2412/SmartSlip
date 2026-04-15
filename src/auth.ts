import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Line from "next-auth/providers/line"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.AUTH_SECRET,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
        Line({
            clientId: process.env.LINE_CLIENT_ID || process.env.LINE_CHANNEL_ID,
            clientSecret: process.env.LINE_CLIENT_SECRET || process.env.LINE_CHANNEL_SECRET,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, account, user }) {
            // Store user ID and provider info
            if (user) {
                token.sub = user.id
            }
            // Store Google tokens during sign in
            if (account?.provider === "google" && account?.access_token) {
                token.googleAccessToken = account.access_token
                token.googleRefreshToken = account.refresh_token
                token.googleExpiresAt = account.expires_at
            }
            return token
        },
        session({ session, token }) {
            // Pass token data to session
            if (session.user && token) {
                session.user.id = token.sub || ""
                session.googleAccessToken = token.googleAccessToken as string
                session.googleRefreshToken = token.googleRefreshToken as string
                session.googleExpiresAt = token.googleExpiresAt as number
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
