import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drive/disconnect
 * Disconnect Google Drive by clearing folder IDs in database
 * This will trigger a re-setup on the next visit
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'ผู้ใช้ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const client = await clientPromise;
    const db = client.db();

    const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };

    // Clear all Google Drive related fields
    await db.collection('users').updateOne(
      updateQuery as any,
      {
        $unset: {
          googleDriveFolderId: "",
          googleDriveMonthFolderId: "",
          googleDriveSetupCompleted: "",
          googleDriveSetupDate: "",
          googleSheetId: "",
          googleSheetSkipped: "",
          folderOwnedByUser: ""
        }
      }
    );

    console.log('💾 Disconnected Google Drive for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการเชื่อมต่อ Google Drive สำเร็จ'
    });
  } catch (error: any) {
    console.error('❌ ข้อผิดพลาดในการยกเลิกการเชื่อมต่อ:', error);
    return NextResponse.json(
      { error: error.message || 'ล้มเหลวในการยกเลิกการเชื่อมต่อ' },
      { status: 500 }
    );
  }
}
