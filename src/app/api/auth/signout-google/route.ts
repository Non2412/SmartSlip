import { auth } from "@/auth";
import { getSession } from "next-auth/react";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Return success - client should refresh session
    return NextResponse.json(
      { success: true, message: "Google account disconnected" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sign out Google error:", error);
    return NextResponse.json(
      { error: "Failed to sign out Google" },
      { status: 500 }
    );
  }
}
