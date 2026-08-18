import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';

// GET: ดึงรายการประวัติกิจกรรม
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const lineUserId = searchParams.get('lineUserId');

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;
    const currentLineUserId = (session as any).lineUserId;

    // สร้าง Query รองรับการจำกัดสิทธิ์
    let query: Record<string, any> = {};
    if (userRole === 'admin') {
      const all = searchParams.get('all') === 'true';
      if (!all) {
        const targetUserId = userId || currentUserId;
        const targetLineUserId = lineUserId || currentLineUserId;
        if (targetUserId && targetLineUserId) {
          query = { $or: [{ userId: targetUserId }, { userId: targetLineUserId }] };
        } else if (targetUserId) {
          query = { userId: targetUserId };
        }
      }
      // If all === true, query is empty, fetching all activity logs
    } else {
      if (currentUserId && currentLineUserId) {
        query = { $or: [{ userId: currentUserId }, { userId: currentLineUserId }] };
      } else if (currentUserId) {
        query = { userId: currentUserId };
      }
      // Separate logs per role
      const roleFilter = userRole === 'clerk'
        ? { roleContext: 'clerk' }
        : { $or: [{ roleContext: 'user' }, { roleContext: { $exists: false } }] };
      query = { $and: [query, roleFilter] };
    }

    // 1. ดึงรายการใบเสร็จทั้งหมดของผู้ใช้เพื่อนำไปใช้ในการ backfill ประวัติกิจกรรมเก่า
    const receipts = await db
      .collection('receipts')
      .find(query)
      .toArray();

    const activityLogsCol = db.collection('activity_logs');
    
    // 2. ดึงรายการกิจกรรมทั้งหมดที่มีอยู่ในฐานข้อมูลปัจจุบัน
    const existingLogs = await activityLogsCol.find(query).toArray();
    const existingReceiptIds = new Set(existingLogs.map(l => l.receiptId));

    const newLogsToInsert = [];

    for (const receipt of receipts) {
      const receiptIdStr = receipt._id.toString();
      const receiptOwnerId = receipt.userId || currentUserId; // ใช้ userId ของใบเสร็จนั้นจริง ๆ

      // ตรวจสอบว่ามีประวัติการเพิ่มใบเสร็จ (add) หรือยัง หากไม่มีให้ backfill เข้าไป
      if (!existingReceiptIds.has(receiptIdStr)) {
        const storeName = receipt.storeName || 'ไม่ระบุร้านค้า';
        const amt = (receipt.amount !== undefined ? receipt.amount : receipt.totalAmount || 0);
        newLogsToInsert.push({
          userId: receiptOwnerId,
          action: 'add',
          details: `เพิ่มใบเสร็จร้าน "${storeName}" ยอดเงิน ฿${parseFloat(amt.toString()).toFixed(2)} บาท`,
          timestamp: receipt.createdAt || new Date().toISOString(),
          receiptId: receiptIdStr,
          roleContext: receipt.roleContext || 'user'
        });
      }
    }

    // หากมีรายการที่ต้อง backfill ให้บันทึกลง MongoDB
    if (newLogsToInsert.length > 0) {
      await activityLogsCol.insertMany(newLogsToInsert);
    }

    // 3. ดึงรายการประวัติกิจกรรมทั้งหมดอีกครั้ง (ซึ่งรวมรายการที่ backfill ไปแล้ว)
    const logs = await activityLogsCol
      .find(query)
      .toArray();

    const formattedLogs = logs.map(l => {
      let isoString = '';
      try {
        if (l.timestamp) {
          const d = new Date(l.timestamp);
          if (!isNaN(d.getTime())) {
            isoString = d.toISOString();
          }
        }
      } catch (e) {
        // fallback
      }
      if (!isoString) {
        isoString = new Date().toISOString();
      }

      return {
        ...l,
        id: l._id.toString(),
        _id: undefined,
        timestamp: isoString
      };
    });

    // เรียงลำดับจากล่าสุดไปเก่าสุดโดยสมบูรณ์
    formattedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ success: true, data: formattedLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: บันทึกกิจกรรมใหม่
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, details, receiptId, metadata } = body;

    if (!userId || !action || !details) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;

    // Regular user can only log activities for themselves
    let targetUserId = userId;
    if (userRole !== 'admin') {
      targetUserId = currentUserId;
    }

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const newLog = {
      userId: targetUserId,
      action,
      details,
      timestamp: new Date().toISOString(),
      roleContext: userRole === 'admin' ? undefined : userRole,
      receiptId: receiptId || undefined,
      metadata: metadata || undefined
    };

    const result = await db.collection('activity_logs').insertOne(newLog);

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...newLog
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
