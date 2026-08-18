import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { notifyUserByLine } from '@/lib/lineNotifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ตรวจสอบ Admin ผ่าน Auth.js Session
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const { id } = await params;
    const { role, status } = await request.json();

    let userObjId: ObjectId | null = null;
    if (ObjectId.isValid(id)) {
      userObjId = new ObjectId(id);
    } else {
      const lineAccount = await db.collection('accounts').findOne({
        provider: 'line',
        providerAccountId: id
      });
      if (lineAccount) {
        userObjId = lineAccount.userId;
      }
    }

    if (!userObjId) {
      const userDoc = await db.collection('users').findOne({ id: id });
      if (userDoc) {
        userObjId = userDoc._id;
      }
    }

    if (!userObjId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await db.collection('users').findOne({ _id: userObjId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // อัปเดต User
    const updateFields: Record<string, any> = {};
    if (role) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
      }
      updateFields.role = role;
    }
    if (status) {
      if (status !== 'active' && status !== 'restricted' && status !== 'pending' && status !== 'rejected') {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateFields.status = status;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.collection('users').updateOne(
        { _id: userObjId },
        { $set: { ...updateFields, updatedAt: new Date() } }
      );
    }

    // ดึงข้อมูลผู้ใช้หลังอัปเดต
    const updatedUser = await db.collection('users').findOne({ _id: userObjId });

    // ดึง LINE UserId
    const lineAccount = await db.collection('accounts').findOne({
      userId: userObjId,
      provider: 'line'
    });
    const lineUserId = lineAccount ? lineAccount.providerAccountId : null;

    // ส่ง LINE Notification
    if (lineUserId) {
      const message =
        status === 'active' || status === 'approved'
          ? '✅ บัญชีของคุณได้รับการอนุมัติแล้ว!'
          : status === 'rejected' || status === 'restricted'
            ? '❌ บัญชีของคุณถูกปฏิเสธ'
            : `📋 สถานะบัญชีของคุณเปลี่ยนเป็น: ${status}`;

      await notifyUserByLine(userObjId.toString(), message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?._id.toString(),
        displayName: updatedUser?.name || updatedUser?.displayName,
        role: updatedUser?.role,
        status: updatedUser?.status,
        email: updatedUser?.email || 'ไม่มีอีเมล (LINE login)',
      },
    });
  } catch (error) {
    console.error('[PATCH /api/admin/users/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
