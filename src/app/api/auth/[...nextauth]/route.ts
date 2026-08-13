import { handlers, auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  
  // Intercept callback to prevent duplicate code exchange if already logged in
  if (url.pathname.includes("/api/auth/callback/")) {
    try {
      const session = await auth();
      if (session?.user) {
        console.log("🔄 [Auth Interceptor] User already logged in, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      console.error("❌ [Auth Interceptor] Error checking session:", err);
    }
  }

  return handlers.GET(request);
}

export const { POST } = handlers

