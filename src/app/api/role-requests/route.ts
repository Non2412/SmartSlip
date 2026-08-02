import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const userRole = (session.user as any).role;

    if (userRole === "admin") {
      // Admin sees all role requests
      const requests = await db
        .collection("role_requests")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(requests);
    } else {
      // Regular users see their own requests
      const userRequests = await db
        .collection("role_requests")
        .find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(userRequests);
    }
  } catch (error) {
    console.error("GET Role Requests error:", error);
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
    const { targetRole, reason, requestType, issueCategory } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "กรุณาระบุข้อความรายละเอียด" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user already has a pending role request
    const existingPending = await db.collection("role_requests").findOne({
      userId: session.user.id,
      status: "pending",
      requestType: requestType || "role_change",
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "คุณมีรายการที่อยู่ระหว่างรอผู้ดูแลระบบตรวจสอบแล้วครับ" },
        { status: 400 }
      );
    }

    const newRequest = {
      userId: session.user.id,
      userName: session.user.name || "ผู้ใช้งาน",
      userEmail: session.user.email || "ไม่มีอีเมล",
      userImage: session.user.image || null,
      currentRole: (session.user as any).role || "user",
      targetRole: targetRole || "clerk",
      requestType: requestType || "role_change", // role_change | issue_report
      issueCategory: issueCategory || null,
      reason: reason.trim(),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("role_requests").insertOne(newRequest);

    return NextResponse.json({ success: true, requestId: result.insertedId });
  } catch (error) {
    console.error("POST Role Request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, adminNote } = body;

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    let objId;
    try {
      objId = new ObjectId(requestId);
    } catch {
      objId = requestId;
    }

    const roleReq = await db.collection("role_requests").findOne({
      $or: [{ _id: objId }, { id: requestId }],
    });

    if (!roleReq) {
      return NextResponse.json({ error: "Role request not found" }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update role_requests collection status
    await db.collection("role_requests").updateOne(
      { $or: [{ _id: objId }, { id: requestId }] },
      {
        $set: {
          status: newStatus,
          adminNote: adminNote || "",
          resolvedAt: new Date(),
          resolvedBy: session.user.email || session.user.id,
        },
      }
    );

    // If approved, update user's role in users & profiles collections
    if (action === 'approve' && roleReq.targetRole) {
      const targetUserId = roleReq.userId;
      let userObjId;
      try {
        userObjId = new ObjectId(targetUserId);
      } catch { /* ignore */ }

      const userFilter: any[] = [{ id: targetUserId }];
      if (userObjId) userFilter.push({ _id: userObjId });

      await db.collection("users").updateOne(
        { $or: userFilter } as any,
        { $set: { role: roleReq.targetRole, updatedAt: new Date() } }
      );

      await db.collection("profiles").updateOne(
        { userId: targetUserId },
        { $set: { requestedRole: roleReq.targetRole, updatedAt: new Date() } }
      );
    }

    // 1. Insert activity log for notification center (TopBar)
    const targetRoleLabel = roleReq.targetRole === 'clerk' ? '💼 เสมียน (Clerk)' : '👤 ผู้ใช้งานทั่วไป (User)';
    const logDetails = action === 'approve'
      ? `🎉 คำร้องขอสิทธิ์บทบาทเป็น '${targetRoleLabel}' ของคุณได้รับการอนุมัติจากผู้ดูแลระบบเรียบร้อยแล้ว!`
      : `❌ คำร้องขอสิทธิ์บทบาทเป็น '${targetRoleLabel}' ของคุณถูกปฏิเสธโดยผู้ดูแลระบบ${adminNote ? ` (เหตุผล: ${adminNote})` : ''}`;

    await db.collection("activity_logs").insertOne({
      userId: roleReq.userId,
      userName: roleReq.userName || "ระบบ",
      userImage: roleReq.userImage || null,
      action: action === 'approve' ? 'role_approved' : 'role_rejected',
      details: logDetails,
      timestamp: new Date(),
    });

    // 2. Send LINE Push notification if user has a LINE ID connected
    const targetLineUserId = roleReq.lineUserId || (await db.collection("users").findOne({ $or: [{ id: roleReq.userId }, { _id: roleReq.userId }] }))?.lineUserId;
    if (targetLineUserId && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      try {
        const lineText = action === 'approve'
          ? `✅ อนุมัติสิทธิ์การใช้งานแล้ว!\nคำร้องขอเปลี่ยนสิทธิ์บทบาทเป็น '${targetRoleLabel}' ของคุณได้รับการอนุมัติเรียบร้อยแล้ว สามารถเข้าใช้งานฟีเจอร์ตามสิทธิ์ใหม่ได้ทันทีครับ 🎉`
          : `❌ คำร้องขอสิทธิ์การใช้งานถูกปฏิเสธ\nคำร้องขอเปลี่ยนสิทธิ์บทบาทเป็น '${targetRoleLabel}' ของคุณถูกปฏิเสธโดยผู้ดูแลระบบ${adminNote ? `\nเหตุผล: ${adminNote}` : ''}`;

        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: targetLineUserId,
            messages: [{ type: "text", text: lineText }],
          }),
        });
      } catch (lineErr) {
        console.error("Failed to send LINE push notification:", lineErr);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("PATCH Role Request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
