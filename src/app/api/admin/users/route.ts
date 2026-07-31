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

// GET: ดึงรายชื่อผู้ใช้ทั้งหมดพร้อมสถานะและจำนวนใบเสร็จ (รวมคนยังไม่ลงทะเบียน)
export async function GET() {
  try {
    const authCheck = await checkAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const client = await clientPromise;
    const db = client.db(); // Default DB for users & accounts
    const appDb = client.db('smartslip_api'); // Receipts DB

    const users = await db.collection('users').find({}).toArray();
    const accounts = await db.collection('accounts').find({}).toArray();

    // แยกแยะรหัสผู้ใช้เพื่อหาผู้ใช้ที่ยังไม่ลงทะเบียน
    const registeredIds = new Set();
    const linkedLineIds = new Set();
    users.forEach(u => {
      registeredIds.add(u._id.toString());
    });
    accounts.forEach(a => {
      if (a.provider === 'line' && a.providerAccountId) {
        linkedLineIds.add(a.providerAccountId);
      }
    });

    // ดึงค่าไอดีผู้ส่งรูปทั้งหมดในใบเสร็จ
    const allReceiptUserIds = await appDb.collection('receipts').distinct('userId');

    // กรองหาไอดี LINE ที่ส่งใบเสร็จมาแต่ยังไม่ลงทะเบียนในเว็บ
    const unregisteredLineIds = allReceiptUserIds.filter(id => {
      return !registeredIds.has(id) && !linkedLineIds.has(id);
    });

    const profiles = await db.collection('profiles').find({}).toArray();
    const profileMap = new Map();
    profiles.forEach(p => {
      if (p.userId) {
        profileMap.set(p.userId.toString(), p);
      }
    });

    const lineIdToUserMap = new Map();
    accounts.forEach(a => {
      if (a.provider === 'line' && a.providerAccountId && a.userId) {
        lineIdToUserMap.set(a.providerAccountId, a.userId.toString());
      }
    });

    // คำนวณสถิติสำหรับผู้ใช้ที่ลงทะเบียนแล้ว
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const lineAccount = accounts.find(
        (a) => a.userId.toString() === u._id.toString() && a.provider === 'line'
      );
      const lineUserId = lineAccount ? lineAccount.providerAccountId : null;

      // นับจำนวนใบเสร็จ
      let receiptQuery: Record<string, any> = {};
      if (lineUserId) {
        receiptQuery = { $or: [{ userId: u._id.toString() }, { userId: lineUserId }] };
      } else {
        receiptQuery = { userId: u._id.toString() };
      }

      const receiptCount = await appDb.collection('receipts').countDocuments(receiptQuery);

      // ดึงเวลาการสมัครบัญชี
      let createdAtStr = u.createdAt;
      if (!createdAtStr && u._id) {
        try {
          createdAtStr = u._id.getTimestamp().toISOString();
        } catch {
          createdAtStr = new Date().toISOString();
        }
      }

      const userProfile = profileMap.get(u._id.toString());

      return {
        id: u._id.toString(),
        name: u.name || 'Unknown User',
        email: u.email || 'ไม่มีอีเมล (LINE login)',
        image: u.image || null,
        role: u.role || 'user',
        status: u.status || 'active',
        lineUserId,
        receiptCount,
        createdAt: createdAtStr,
        lastActiveAt: u.lastActiveAt || null,
        profile: userProfile ? {
          company: userProfile.company || 'ไม่ระบุ',
          phone: userProfile.phone || 'ไม่ระบุ',
          address: userProfile.address || userProfile.about || userProfile.from || 'ไม่ระบุ',
          budgets: userProfile.budgets !== undefined ? userProfile.budgets : 0,
          citizenId: userProfile.citizenId || 'ไม่ระบุ'
        } : {
          company: 'ไม่ระบุ',
          phone: 'ไม่ระบุ',
          address: 'ไม่ระบุ',
          budgets: 0,
          citizenId: 'ไม่ระบุ'
        }
      };
    }));

    // สร้างข้อมูลสถิติผู้ใช้ LINE ที่ยังไม่ลงทะเบียน
    const unregisteredUsersWithStats = await Promise.all(unregisteredLineIds.map(async (lineId) => {
      const receiptCount = await appDb.collection('receipts').countDocuments({ userId: lineId });
      const mongoUserId = lineIdToUserMap.get(lineId);
      const userProfile = mongoUserId ? profileMap.get(mongoUserId) : null;
      
      return {
        id: lineId, // ใช้ LINE ID เป็นรหัสอ้างอิง
        name: 'ผู้ใช้งาน LINE (ยังไม่ได้ลงทะเบียน)',
        email: 'ไม่มีอีเมล (LINE login)',
        image: null,
        role: 'user',
        status: 'pending', // ดีฟอลต์สถานะรอนุมัติ
        lineUserId: lineId,
        receiptCount,
        createdAt: new Date().toISOString(),
        lastActiveAt: null,
        profile: userProfile ? {
          company: userProfile.company || 'ไม่ระบุ',
          phone: userProfile.phone || 'ไม่ระบุ',
          address: userProfile.address || userProfile.about || userProfile.from || 'ไม่ระบุ',
          budgets: userProfile.budgets !== undefined ? userProfile.budgets : 0,
          citizenId: userProfile.citizenId || 'ไม่ระบุ'
        } : {
          company: 'ไม่ระบุ',
          phone: 'ไม่ระบุ',
          address: 'ไม่ระบุ',
          budgets: 0,
          citizenId: 'ไม่ระบุ'
        }
      };
    }));

    // รวมรายชื่อทั้งหมดส่งกลับ
    const allUsersCombined = [...usersWithStats, ...unregisteredUsersWithStats];

    return NextResponse.json({ success: true, data: allUsersCombined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: แก้ไขบทบาทหรือสถานะของผู้ใช้
export async function PATCH(request: Request) {
  try {
    const authCheck = await checkAdmin();
    if (!authCheck.authorized || !authCheck.session) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { userId, role, status, profile } = body;

    if (!userId || (!role && !status && !profile)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (userId === authCheck.session.user.id && (role || status)) {
      return NextResponse.json({ success: false, error: 'Cannot modify your own admin role or status' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const updateFields: Record<string, any> = {};
    if (role) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ success: false, error: 'Invalid role value' }, { status: 400 });
      }
      updateFields.role = role;
    }
    if (status) {
      if (status !== 'active' && status !== 'restricted') {
        return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
      }
      updateFields.status = status;
    }

    let targetObjectId: ObjectId;

    if (ObjectId.isValid(userId)) {
      targetObjectId = new ObjectId(userId);
    } else {
      // นี่เป็นไอดีผู้ใช้ LINE
      const lineAccount = await db.collection('accounts').findOne({
        provider: 'line',
        providerAccountId: userId
      });

      if (lineAccount) {
        targetObjectId = new ObjectId(lineAccount.userId);
      } else {
        // สร้างผู้ใช้ชั่วคราวและลงทะเบียนแผนที่บัญชี LINE
        const newUserId = new ObjectId();
        await db.collection('users').insertOne({
          _id: newUserId,
          name: 'ผู้ใช้งาน LINE (ยังไม่ได้ลงทะเบียน)',
          role: 'user',
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        await db.collection('accounts').insertOne({
          userId: newUserId,
          provider: 'line',
          providerAccountId: userId,
          type: 'oauth'
        });

        targetObjectId = newUserId;
      }
    }

    const targetUser = await db.collection('users').findOne({ _id: targetObjectId });

    if (Object.keys(updateFields).length > 0) {
      const result = await db.collection('users').updateOne(
        { _id: targetObjectId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
    }

    if (profile) {
      const profileFields: Record<string, any> = {};
      if (profile.company !== undefined) profileFields.company = profile.company;
      if (profile.phone !== undefined) profileFields.phone = profile.phone;
      if (profile.address !== undefined) profileFields.address = profile.address;
      if (profile.budgets !== undefined) profileFields.budgets = parseFloat(profile.budgets) || 0;
      if (profile.citizenId !== undefined) profileFields.citizenId = profile.citizenId;

      await db.collection('profiles').updateOne(
        { userId: targetObjectId.toString() },
        { 
          $set: { 
            ...profileFields, 
            name: targetUser?.name || 'ผู้ใช้งาน LINE (ยังไม่ได้ลงทะเบียน)',
            email: targetUser?.email || 'ไม่มีอีเมล (LINE login)',
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    }

    // บันทึกกิจกรรมการจัดการของแอดมิน
    try {
      const appDb = client.db('smartslip_api');
      const targetUser = await db.collection('users').findOne({ _id: targetObjectId });
      const targetName = targetUser ? targetUser.name : 'Unknown User';
      let actionDetails = `ผู้ดูแลระบบได้ทำการแก้ไขบัญชีผู้ใช้ "${targetName}": `;
      if (role) actionDetails += `เปลี่ยนสิทธิ์เป็น ${role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานปกติ'} `;
      if (status) actionDetails += `เปลี่ยนสถานะเป็น ${status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}`;

      await appDb.collection('activity_logs').insertOne({
        userId: authCheck.session.user.id,
        action: 'edit',
        details: actionDetails,
        timestamp: new Date().toISOString(),
        metadata: { targetUserId: targetObjectId.toString(), role, status }
      });
    } catch (logErr) {
      console.error('Failed to log admin action:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
