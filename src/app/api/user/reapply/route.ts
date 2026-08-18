import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const queryUserId = ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : session.user.id;

    // Find user to check current status
    const user = await db.collection('users').findOne({ _id: queryUserId as any });
    if (!user) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้งาน' }, { status: 404 });
    }

    if (user.status !== 'restricted') {
      return NextResponse.json({ success: false, error: 'ผู้ใช้งานไม่ได้อยู่ในสถานะถูกระงับ/ปฏิเสธ' }, { status: 400 });
    }

    // Update status to pending
    await db.collection('users').updateOne(
      { _id: queryUserId as any },
      { $set: { status: 'pending', updatedAt: new Date() } }
    );

    // Log the re-application event
    try {
      const appDb = client.db('smartslip_api');
      await appDb.collection('activity_logs').insertOne({
        userId: session.user.id,
        action: 'reapply',
        details: `ผู้ใช้งาน "${user.name || 'ผู้ใช้'}" ยื่นขอสิทธิ์การใช้งานใหม่อีกครั้งหลังจากถูกปฏิเสธ`,
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('Failed to log reapply action:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
