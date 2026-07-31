import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';

// Helper to verify admin session
async function checkAdmin() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }
  if ((session.user as any).role !== 'admin') {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }
  return { authorized: true, session };
}

// GET: ดึงรายการประวัติกิจกรรมทั้งหมดของระบบ
export async function GET() {
  try {
    const authCheck = await checkAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const client = await clientPromise;
    const db = client.db(); // Default DB for users & accounts
    const appDb = client.db('smartslip_api'); // logs DB

    const logs = await appDb.collection('activity_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(300) // Limit to latest 300 logs for performance
      .toArray();

    const userIds = Array.from(new Set(logs.map(l => l.userId).filter(Boolean)));
    const objectIds: ObjectId[] = [];
    userIds.forEach(id => {
      if (ObjectId.isValid(id)) {
        objectIds.push(new ObjectId(id));
      }
    });

    // Fetch users directly by ObjectId
    const users = await db.collection('users').find({
      _id: { $in: objectIds }
    }).toArray();

    // Fetch accounts linked to userIds (for LINE accounts)
    const accounts = await db.collection('accounts').find({
      providerAccountId: { $in: userIds }
    }).toArray();

    const linkedUserIds = accounts.map(a => a.userId);
    const linkedUsers = await db.collection('users').find({
      _id: { $in: linkedUserIds }
    }).toArray();

    // Map logs to include user details
    const logsWithUser = logs.map(l => {
      // Find user directly
      let user = users.find(u => u._id.toString() === l.userId);

      // If not found, try to find via linked account
      if (!user) {
        const link = accounts.find(a => a.providerAccountId === l.userId);
        if (link) {
          user = linkedUsers.find(u => u._id.toString() === link.userId.toString());
        }
      }

      // Format timestamp
      let isoString = '';
      try {
        if (l.timestamp) {
          const d = new Date(l.timestamp);
          if (!isNaN(d.getTime())) {
            isoString = d.toISOString();
          }
        }
      } catch {}
      if (!isoString) isoString = new Date().toISOString();

      return {
        id: l._id.toString(),
        userId: l.userId,
        userName: user ? user.name : (l.userId && l.userId.startsWith('U') ? `LINE (${l.userId.substring(0, 8)})` : 'ระบบ'),
        userImage: user ? user.image : null,
        action: l.action,
        details: l.details,
        timestamp: isoString,
        receiptId: l.receiptId
      };
    });

    return NextResponse.json({ success: true, data: logsWithUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
