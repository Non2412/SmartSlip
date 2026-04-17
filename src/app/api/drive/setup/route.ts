import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount } from '@/lib/googledrive';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drive/setup
 * Create user's Google Drive folder structure using Service Account
 * No authorization required from user - Service Account handles folder creation
 */
export async function POST(request: NextRequest) {
  try {
    // Get session with user auth
    const session = await auth();

    if (!session || !session.user?.id || !session.user?.email) {
      return NextResponse.json(
        { error: 'ผู้ใช้ไม่ได้รับการยืนยันตัวตนหรือไม่มีอีเมล' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || undefined;

    console.log('📁 กำลังตั้งค่าโฟลเดอร์ Google Drive สำหรับผู้ใช้:', userId, userEmail);

    // Check if already set up
    const client = await clientPromise;
    const db = client.db();
    
    // Try to find by userId as string, or as ObjectId if valid
    let existingUser = await db.collection('users').findOne({ _id: userId as any });
    
    if (!existingUser && ObjectId.isValid(userId)) {
      existingUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (existingUser?.googleDriveFolderId) {
      console.log('✅ Google Drive ตั้งค่าแล้วสำหรับผู้ใช้:', userId);
      return NextResponse.json({
        success: true,
        data: {
          message: 'Google Drive folder ตั้งค่าแล้วสำหรับผู้ใช้นี้',
          userFolderId: existingUser.googleDriveFolderId,
          monthFolderId: existingUser.googleDriveMonthFolderId,
        },
      }, { status: 200 });
    }

    // Get googleAccessToken from request body
    let googleAccessToken: string | undefined;
    
    try {
      const body = await request.json();
      googleAccessToken = body.googleAccessToken;
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!googleAccessToken) {
      console.error('❌ No googleAccessToken provided');
      return NextResponse.json(
        { error: 'Google access token required' },
        { status: 400 }
      );
    }

    console.log('✅ Received googleAccessToken, creating folder structure...');

    // Create folder structure using user's Google access token
    let monthFolderId: string | undefined;
    let userFolderId: string | undefined;

    try {
      const result = await createFolderStructureWithServiceAccount(
        userId,
        userEmail,
        userName,
        googleAccessToken  // Pass user's access token
      );
      monthFolderId = result.monthFolderId;
      userFolderId = result.userFolderId;
    } catch (folderError: unknown) {
      const errorMsg = folderError instanceof Error ? folderError.message : String(folderError);
      console.error('❌ Failed to create folder structure:', errorMsg);
      return NextResponse.json(
        { error: `Failed to create folder structure: ${errorMsg}` },
        { status: 500 }
      );
    }

    if (!monthFolderId || !userFolderId) {
      console.error('❌ Folder IDs are undefined');
      return NextResponse.json(
        { error: 'ล้มเหลวในการสร้างโครงสร้างโฟลเดอร์ Google Drive' },
        { status: 500 }
      );
    }

    console.log('✅ ตั้งค่า Google Drive สำเร็จ:', { monthFolderId, userFolderId });

    // Store folder IDs in database for this user
    const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
    
    await db.collection('users').updateOne(
      updateQuery as any,
      {
        $set: {
          googleDriveFolderId: userFolderId,
          googleDriveMonthFolderId: monthFolderId,
          googleDriveSetupCompleted: true,
          googleDriveSetupDate: new Date(),
        },
      },
      { upsert: true }
    );

    console.log('💾 บันทึก ID โฟลเดอร์ลงฐานข้อมูล:', { userFolderId, monthFolderId });

    return NextResponse.json({
      success: true,
      data: {
        message: 'สร้างและแชร์โครงสร้างโฟลเดอร์ Google Drive สำเร็จ',
        userFolderId,
        monthFolderId,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ ข้อผิดพลาดในการตั้งค่า:', error);
    const errorMessage = error instanceof Error ? error.message : 'ล้มเหลวในการตั้งค่า Google Drive';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
