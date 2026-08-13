import { handlers, auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  
  // Intercept callback to prevent duplicate code exchange if already logged in
  if (url.pathname.includes("/api/auth/callback/")) {
    try {
      // 1. Try checking if session is already active (for sequential duplicates)
      const session = await auth();
      if (session?.user) {
        console.log("🔄 [Auth Interceptor] User already logged in, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // 2. If code exists, use MongoDB as an atomic lock to handle concurrent duplicate requests
      if (code) {
        const client = await clientPromise;
        const db = client.db();
        
        // Ensure TTL index so old codes are cleaned up automatically after 2 minutes
        db.collection("code_locks").createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 120, background: true }
        ).catch(() => {});

        try {
          await db.collection("code_locks").insertOne({
            _id: code as any,
            createdAt: new Date(),
          });
          console.log("🔒 [Auth Interceptor] Lock acquired for code:", code);
        } catch (err: any) {
          if (err.code === 11000) { // Duplicate key error
            console.warn("⚠️ [Auth Interceptor] Duplicate concurrent callback detected for code:", code);
            // Wait 2.5 seconds to let the first request finish exchanging code and writing cookies
            await new Promise((resolve) => setTimeout(resolve, 2500));
            // Redirect directly to dashboard
            return NextResponse.redirect(new URL("/dashboard", request.url));
          }
          throw err;
        }
      }
    } catch (err) {
      console.error("❌ [Auth Interceptor] Error in check:", err);
    }
  }

  return handlers.GET(request);
}

export const { POST } = handlers


