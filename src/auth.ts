import NextAuth from "next-auth"
import Line from "next-auth/providers/line"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"
import { ObjectId } from "mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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
        error: "/login",
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
        async jwt({ token, account, user, trigger }) {
            const isSignIn = !!user || !!account;
            const isUpdate = trigger === "update";

            if (isSignIn) {
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

            // Store LINE user info as primary account
            if (account?.provider === "line") {
                token.lineUserName = user?.name || undefined
                token.lineUserImage = user?.image || undefined
                token.lineUserId = account.providerAccountId
                console.log("📝 บันทึกข้อมูล LINE:", user?.name, "providerAccountId:", account.providerAccountId);
            }

            // Only query database during sign in, session update, or if critical info is missing from the token
            const needsDbFetch = isSignIn || isUpdate || !token.role || !token.status || token.isProfileCompleted === undefined;

            if (token.sub && needsDbFetch) {
                try {
                    const client = await clientPromise;
                    const db = client.db();
                    const queryUserId = ObjectId.isValid(token.sub) ? new ObjectId(token.sub) : token.sub;

                    // 1. Fetch LINE user ID if not already in token
                    if (!token.lineUserId) {
                        const lineAccount = await db.collection("accounts").findOne({
                            userId: queryUserId as any,
                            provider: "line"
                        });
                        if (lineAccount) {
                            token.lineUserId = lineAccount.providerAccountId;
                            console.log("🔍 Found linked LINE account in DB for user:", token.sub, "-> LINE:", lineAccount.providerAccountId);
                        }
                    }

                    // 2. Fetch user role & status
                    const userDoc = await db.collection("users").findOne({ _id: queryUserId as any });
                    if (userDoc) {
                        let role = userDoc.role;
                        let status = userDoc.status;

                        if (!role) {
                            const adminLineIds = (process.env.ADMIN_LINE_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
                            const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
                            
                            const isLineAdmin = token.lineUserId && adminLineIds.includes(token.lineUserId as string);
                            const isEmailAdmin = token.email && adminEmails.includes((token.email as string).toLowerCase());

                            const userCount = await db.collection("users").countDocuments();

                            if (isLineAdmin || isEmailAdmin || userCount <= 1) {
                                role = "admin";
                                status = "active";
                            } else {
                                role = "user";
                                status = "pending";
                            }

                            await db.collection("users").updateOne(
                                { _id: queryUserId as any },
                                { $set: { role, status } }
                            );
                            console.log(`📝 Set default role: ${role}, status: ${status} for user: ${token.sub}`);
                        } else if (!status) {
                            // Backfill missing status
                            status = (role === "admin") ? "active" : "pending";
                            await db.collection("users").updateOne(
                                { _id: queryUserId as any },
                                { $set: { status } }
                            );
                            console.log(`📝 Backfilled status: ${status} for user: ${token.sub}`);
                        }

                        token.role = role;
                        token.status = status;
                    } else {
                        token.role = token.role || "user";
                        token.status = token.status || "pending";
                    }

                    // 3. Check if profile is completed
                    const profileDoc = await db.collection("profiles").findOne({ userId: token.sub });
                    const isProfileCompleted = !!(
                        profileDoc && 
                        profileDoc.name?.trim() && 
                        profileDoc.phone?.trim() && 
                        profileDoc.company?.trim() && 
                        profileDoc.citizenId?.trim()
                    );
                    token.isProfileCompleted = isProfileCompleted;
                } catch (err) {
                    console.error("❌ Failed to fetch user role & status in JWT callback:", err);
                    token.role = token.role || "user";
                    token.status = token.status || "pending";
                    token.isProfileCompleted = token.isProfileCompleted || false;
                }
            }

            return token
        },
        session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.sub || ""
                session.user.email = (token.email as string) || session.user.email
                session.user.role = token.role || "user"
                session.user.status = token.status || "pending"
                
                const s = session as unknown as Record<string, unknown>;
                s.lineUserName = token.lineUserName;
                s.lineUserImage = token.lineUserImage;
                s.lineUserId = token.lineUserId;
                s.isProfileCompleted = token.isProfileCompleted;
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const userStatus = (auth?.user as any)?.status
            const userRole = (auth?.user as any)?.role
            const isProfileCompleted = (auth as any)?.isProfileCompleted

            // 1. Check if user is restricted
            if (isLoggedIn && userStatus === "restricted") {
                if (nextUrl.pathname !== "/restricted") {
                    return Response.redirect(new URL("/restricted", nextUrl))
                }
                return true
            }

            // 2. Force profile completion if logged in but profile is not completed (for non-admin users)
            if (isLoggedIn && userRole !== "admin" && !isProfileCompleted) {
                if (nextUrl.pathname !== "/profile") {
                    return Response.redirect(new URL("/profile?force=true", nextUrl))
                }
                return true
            }

            // 3. Check if user is pending approval (after profile is completed)
            if (isLoggedIn && userStatus === "pending") {
                if (nextUrl.pathname !== "/pending-approval") {
                    return Response.redirect(new URL("/pending-approval", nextUrl))
                }
                return true
            }

            // Prevent redirect loop for restricted
            if (nextUrl.pathname === "/restricted") {
                if (isLoggedIn && userStatus === "restricted") {
                    return true
                }
                return Response.redirect(new URL("/dashboard", nextUrl))
            }

            // Prevent redirect loop for pending-approval
            if (nextUrl.pathname === "/pending-approval") {
                if (isLoggedIn && userStatus === "pending") {
                    return true
                }
                return Response.redirect(new URL("/dashboard", nextUrl))
            }

            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
            const isOnAdmin = nextUrl.pathname.startsWith("/admin")
            const isOnLineReceipts = nextUrl.pathname.startsWith("/line-receipts")
            const isOnExport = nextUrl.pathname.startsWith("/export")
            const isOnHistory = nextUrl.pathname.startsWith("/history")
            const isOnActivityLogs = nextUrl.pathname.startsWith("/activity-logs")
            const isOnAiAdvisor = nextUrl.pathname.startsWith("/ai-advisor")
            const isOnProfile = nextUrl.pathname.startsWith("/profile")

            const isProtectedRoute = isOnDashboard || isOnAdmin || isOnLineReceipts || isOnExport || isOnHistory || isOnActivityLogs || isOnAiAdvisor || isOnProfile

            if (isProtectedRoute) {
                if (!isLoggedIn) return false // redirects to /login

                // Check admin authorization
                if (isOnAdmin) {
                    const roleVal = (auth?.user as any)?.role
                    if (roleVal !== "admin") {
                        return Response.redirect(new URL("/dashboard", nextUrl))
                    }
                }
                return true
            } else if (isLoggedIn && nextUrl.pathname === "/login") {
                return Response.redirect(new URL("/dashboard", nextUrl))
            }
            return true
        },
    },
})
