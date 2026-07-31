import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
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

// GET: ดึงสถิติภาพรวมทั้งหมดของระบบ
export async function GET(request: Request) {
  try {
    const authCheck = await checkAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const client = await clientPromise;
    const db = client.db(); // Default DB for users
    const appDb = client.db('smartslip_api'); // Receipts and activity logs DB

    // 1. นับจำนวนผู้ใช้ทั้งหมด
    const totalUsers = await db.collection('users').countDocuments();
    const restrictedUsers = await db.collection('users').countDocuments({ status: 'restricted' });
    const pendingUsers = await db.collection('users').countDocuments({ status: 'pending' });
    const activeUsers = totalUsers - restrictedUsers - pendingUsers;

    // 2. นับจำนวนใบเสร็จทั้งหมด
    const totalReceipts = await appDb.collection('receipts').countDocuments();
    const webReceipts = await appDb.collection('receipts').countDocuments({ transactionId: { $regex: /^web-/ } });
    const lineReceipts = totalReceipts - webReceipts;

    // 3. นับจำนวนประวัติกิจกรรมทั้งหมด
    const totalLogs = await appDb.collection('activity_logs').countDocuments();

    // 4. คำนวณยอดเงินรวมทั้งหมดในระบบ
    const amountPipeline = [
      {
        $project: {
          amt: { $ifNull: [ "$totalAmount", "$amount", 0 ] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amt" }
        }
      }
    ];
    const amountResult = await appDb.collection('receipts').aggregate(amountPipeline).toArray();
    const totalAmount = amountResult.length > 0 ? amountResult[0].total : 0;

    // 5. ดึงข้อมูลเทรนด์การอัปโหลดใบเสร็จตามเดือนและปีที่ต้องการ
    const { searchParams } = new URL(request.url);
    const paramYear = searchParams.get('year');
    const paramMonth = searchParams.get('month');

    let targetYear: number;
    let targetMonth: number; // 1-indexed (1-12)

    if (paramYear && paramMonth) {
      targetYear = parseInt(paramYear);
      targetMonth = parseInt(paramMonth);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    // สร้างวันเริ่มต้นและสิ้นเดือน (UTC)
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const numDays = endDate.getUTCDate();

    const dailyTrend = await appDb.collection('receipts').aggregate([
      {
        $project: {
          createdAtDate: { $toDate: "$createdAt" }
        }
      },
      {
        $match: {
          createdAtDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();

    const trendMap = new Map();
    dailyTrend.forEach((item: any) => {
      trendMap.set(item._id, item.count);
    });

    const uploadTrend = [];
    for (let i = 1; i <= numDays; i++) {
      const dayStr = i.toString().padStart(2, '0');
      const monthStr = targetMonth.toString().padStart(2, '0');
      const dateStr = `${targetYear}-${monthStr}-${dayStr}`;
      const count = trendMap.get(dateStr) || 0;
      uploadTrend.push({ date: dateStr, count });
    }

    // 6. ดึงข้อมูลรายชื่อผู้ใช้อัปโหลดสูงสุดในเดือนนี้
    const userUploads = await appDb.collection('receipts').aggregate([
      {
        $project: {
          createdAtDate: { $toDate: "$createdAt" },
          userId: "$userId"
        }
      },
      {
        $match: {
          createdAtDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const usersList = await db.collection('users').find({}).toArray();
    const accountsList = await db.collection('accounts').find({}).toArray();

    const lineIdToMongoId = new Map();
    accountsList.forEach(acc => {
      if (acc.providerAccountId && acc.userId) {
        lineIdToMongoId.set(acc.providerAccountId, acc.userId.toString());
      }
    });

    const userMap = new Map();
    usersList.forEach(u => {
      userMap.set(u._id.toString(), {
        name: u.name || 'Unknown',
        image: u.image || null,
        role: u.role || 'user',
        status: u.status || 'active'
      });
    });

    const groupedCounts = new Map();
    userUploads.forEach(item => {
      const resolvedId = lineIdToMongoId.get(item._id) || item._id;
      const current = groupedCounts.get(resolvedId) || 0;
      groupedCounts.set(resolvedId, current + item.count);
    });

    const activeUsersInMonth: any[] = [];
    groupedCounts.forEach((count, userId) => {
      const userDetails = userMap.get(userId);
      if (userDetails) {
        activeUsersInMonth.push({
          userId,
          name: userDetails.name,
          image: userDetails.image,
          role: userDetails.role,
          status: userDetails.status,
          count
        });
      } else {
        activeUsersInMonth.push({
          userId,
          name: 'ผู้ใช้งาน LINE (ยังไม่ได้ลงทะเบียน)',
          image: null,
          role: 'user',
          status: 'pending',
          count
        });
      }
    });

    activeUsersInMonth.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        restrictedUsers,
        pendingUsers,
        totalReceipts,
        webReceipts,
        lineReceipts,
        totalLogs,
        totalAmount,
        uploadTrend,
        activeUsersInMonth
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
