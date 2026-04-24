import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount, shareFolderWithUser, shareWithAnyoneWithLink } from '@/lib/googledrive';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drive/setup
 * Create user's Google Drive folder structure using Service Account
 * No authorization required from user - Service Account handles folder creation
 */
export async function POST(request: NextRequest) {
  try {
    // Get session - only require userId, email is optional (LINE users may not have email)
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'ผู้ใช้ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userName = session.user.name || undefined;

    // Parse request body - email optional (LINE users may not have real email)
    let userEmail: string | null = session.user.email ?? null;
    try {
      const body = await request.json();
      if (body.email) {
        userEmail = body.email;  // Use email from request if provided
      }
      console.log('✅ Setup request received for userId:', body.userId || userId);
    } catch (e) {
      // Body parsing failed - that's OK, use session email (or null for LINE users)
      console.log('ℹ️ No request body, using session data');
    }

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
      console.log('✅ Google Drive ตั้งค่าแล้วสำหรับผู้ใช้:', userId, '- Re-sharing to ensure access...');
      const folderId = existingUser.googleDriveFolderId;

      // Re-share the folder to ensure user has access
      // ALWAYS share with Anyone-with-link first (guarantees URL works), then try email as bonus
      let shareSuccess = false;
      let shareError: string | null = null;

      // Step 1: Always share with Anyone-with-link (this is what makes the URL accessible)
      try {
        await shareWithAnyoneWithLink(folderId);
        console.log('✅ Shared folder with Anyone with link');
        shareSuccess = true;
      } catch (linkErr: any) {
        console.warn('⚠️ Could not share with Anyone with link:', linkErr?.message || linkErr);
        shareError = linkErr?.message || String(linkErr);
      }

      // Step 2: Additionally share by email for Google users (so it appears in their Drive)
      const isRealGoogleAccount = userEmail && userEmail.includes('@') && !userEmail.includes('@smartslip.local');
      if (isRealGoogleAccount) {
        try {
          await shareFolderWithUser(folderId, userEmail!, 'reader');
          console.log('✅ Also shared folder with Google user email:', userEmail);
        } catch (shareErr: any) {
          console.log('ℹ️ Could not share by email (non-critical, link sharing already done):', shareErr?.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Google Drive folder ตั้งค่าแล้วสำหรับผู้ใช้นี้',
          userFolderId: folderId,
          monthFolderId: existingUser.googleDriveMonthFolderId,
          shareSuccess,
          shareError,
        },
      }, { status: 200 });
    }

    console.log('✅ Creating folder structure using Service Account (no user token required)...');

    // Create folder structure using Service Account
    let monthFolderId: string | undefined;
    let userFolderId: string | undefined;

    try {
      const result = await createFolderStructureWithServiceAccount(
        userId,
        userEmail ?? `${userId}@smartslip.local`,  // LINE users get synthetic email
        userName
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
