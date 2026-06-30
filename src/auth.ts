import NextAuth from "next-auth"
import Line from "next-auth/providers/line"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"
import { ObjectId } from "mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    trustHost: true,
    debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true" || true,
    session: {
        strategy: "jwt",
    },
    providers: [
        Line({
            clientId: process.env.LINE_CLIENT_ID || process.env.LINE_CHANNEL_ID || "dummy",
            clientSecret: process.env.LINE_CLIENT_SECRET || process.env.LINE_CHANNEL_SECRET || "dummy",
        })
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
            return true
        },
        async jwt({ token, account, user }) {
            if (user || account) {
                console.log("🔐 JWT ตรวจสอบ (user/account change)", {
                    hasUser: !!user,
                    provider: account?.provider,
                });
            }

            if (user) {
                token.sub = user.id
                token.email = user.email
                console.log("📝 บันทึก ID ผู้ใช้และอีเมล:", user.id, user.email);
            }

            // If the token has a sub (userId) but no lineUserId, query DB to see if there is a linked LINE account
            if (token.sub && !token.lineUserId) {
                try {
                    const client = await clientPromise;
                    const db = client.db();
                    const queryUserId = ObjectId.isValid(token.sub) ? new ObjectId(token.sub) : token.sub;
                    const lineAccount = await db.collection("accounts").findOne({
                        userId: queryUserId,
                        provider: "line"
                    });
                    if (lineAccount) {
                        token.lineUserId = lineAccount.providerAccountId;
                        console.log("🔍 Found linked LINE account in DB for user:", token.sub, "-> LINE:", lineAccount.providerAccountId);
                    }
                } catch (err) {
                    console.error("❌ Failed to fetch linked LINE account:", err);
                }
            }

            // Store LINE user info as primary account
            if (account?.provider === "line") {
                token.lineUserName = user?.name
                token.lineUserImage = user?.image
                token.lineUserId = account.providerAccountId
                console.log("📝 บันทึกข้อมูล LINE:", user?.name, "providerAccountId:", account.providerAccountId);
            }

            return token
        },
        session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.sub || ""
                session.user.email = (token.email as string) || session.user.email
                const s = session as unknown as Record<string, unknown>;
                s.lineUserName = token.lineUserName;
                s.lineUserImage = token.lineUserImage;
                s.lineUserId = token.lineUserId;
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false
            } else if (isLoggedIn && nextUrl.pathname === "/login") {
                return Response.redirect(new URL("/dashboard", nextUrl))
            }
            return true
        },
    },
})
