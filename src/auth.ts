import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Line from "next-auth/providers/line"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

import bcrypt from "bcryptjs"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.AUTH_SECRET,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "dummy",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
        Line({
            clientId: process.env.LINE_CLIENT_ID || process.env.LINE_CHANNEL_ID || "dummy",
            clientSecret: process.env.LINE_CLIENT_SECRET || process.env.LINE_CHANNEL_SECRET || "dummy",
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const client = await clientPromise
                const db = client.db()
                
                // Find user in MongoDB
                const user = await db.collection("users").findOne({ 
                    email: (credentials.email as string).toLowerCase() 
                })

                if (!user || !user.password) {
                    // Check if it's the guest user for testing
                    if (credentials.email === "guest@example.com") {
                        return {
                            id: "guest-user-123",
                            name: "นักเข้าชมทั่วไป (Guest)",
                            email: "guest@example.com",
                            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest",
                        }
                    }
                    return null
                }

                // Verify password
                const isValid = await bcrypt.compare(
                    credentials.password as string, 
                    user.password
                )

                if (!isValid) return null

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    image: user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
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
