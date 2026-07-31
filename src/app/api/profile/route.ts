import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const profile = await db.collection("profiles").findOne({ userId: session.user.id });

    if (!profile) {
      return NextResponse.json({
        name: session.user.name || "",
        company: "",
        email: session.user.email || "",
        phone: "",
        citizenId: "",
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET Profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, company, email, phone, budgets, citizenId } = body;

    const client = await clientPromise;
    const db = client.db();

    const updateFields: any = {
      userId: session.user.id,
      name,
      company,
      email,
      phone,
      citizenId,
      updatedAt: new Date(),
    };

    if (budgets !== undefined) {
      updateFields.budgets = budgets;
    }

    await db.collection("profiles").updateOne(
      { userId: session.user.id },
      { $set: updateFields },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
