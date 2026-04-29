import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount, shareFolderWithUser, shareWithAnyoneWithLink } from '@/lib/googledrive';
import { createUserSpreadsheet } from '@/lib/googlesheets';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { google } from 'googleapis';

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
    let googleAccessToken = (session as any).googleAccessToken as string | undefined;

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

    // If no Google token in session (LINE login), check DB accounts for linked Google token
    if (!googleAccessToken) {
      const googleAccount = await db.collection('accounts').findOne({
        $or: [
          { userId: userId, provider: 'google' },
          { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'google' },
        ],
      });
      if (googleAccount?.refresh_token || googleAccount?.access_token) {
        console.log('🔑 Found stored Google account in DB for LINE user - refreshing token...');
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );
          oauth2Client.setCredentials({
            access_token: googleAccount.access_token as string,
            refresh_token: googleAccount.refresh_token as string,
          });
          const { credentials } = await oauth2Client.refreshAccessToken();
          googleAccessToken = credentials.access_token!;
          const accountFilter = googleAccount._id ? { _id: googleAccount._id } : { userId: userId, provider: 'google' };
          await db.collection('accounts').updateOne(accountFilter, { $set: { access_token: credentials.access_token, expires_at: credentials.expiry_date } });
          console.log('🔑 Google token refreshed successfully');
        } catch (refreshErr: any) {
          console.error('❌ Token refresh failed:', refreshErr?.message);
        }
      } else {
        console.log('ℹ️ No linked Google account found in DB for user:', userId);
      }
    }
    
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

      // If user doesn't have a Sheet yet, create one now
      // Only attempt if: has Google token (LINE users without token will always fail SA quota)
      // If googleAccessToken is present, always try regardless of googleSheetSkipped (user may have linked Google later)
      let googleSheetId: string | null = existingUser.googleSheetId || null;
      const shouldTrySheet = !googleSheetId && (googleAccessToken ? true : !existingUser.googleSheetSkipped);
      if (shouldTrySheet) {
        if (!googleAccessToken) {
          // No Google token (LINE user) - skip to prevent SA quota errors on every load
          console.log('ℹ️ No Google token for sheet creation - skipping for LINE user');
          const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
          await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetSkipped: true } });
        } else {
          try {
            const sheet = await createUserSpreadsheet(userId, userName, folderId, googleAccessToken);
            googleSheetId = sheet.spreadsheetId;
            console.log('✅ Google Sheet created for existing user:', googleSheetId);
            const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
            await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetId, googleSheetSkipped: false } });
          } catch (sheetErr: any) {
            console.error('❌ SHEET CREATION ERROR:', sheetErr?.message || sheetErr);
            // Mark as skipped to prevent infinite retries
            const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
            await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetSkipped: true } });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Google Drive folder ตั้งค่าแล้วสำหรับผู้ใช้นี้',
          userFolderId: folderId,
          monthFolderId: existingUser.googleDriveMonthFolderId,
          googleSheetId,
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
        userName ?? undefined
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

    // Create Google Sheet only if user has a Google token (avoids SA quota issues)
    let googleSheetId: string | undefined;
    if (googleAccessToken) {
      try {
        const sheet = await createUserSpreadsheet(userId, userName, userFolderId, googleAccessToken);
        googleSheetId = sheet.spreadsheetId;
        console.log('✅ Google Sheet created:', googleSheetId);
      } catch (sheetErr: any) {
        console.warn('⚠️ Could not create spreadsheet (non-critical):', sheetErr?.message);
      }
    } else {
      console.log('ℹ️ No Google token - skipping sheet creation for LINE user');
    }

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
          ...(googleSheetId ? { googleSheetId } : {}),
        },
      },
      { upsert: true }
    );

    console.log('💾 บันทึก ID โฟลเดอร์ลงฐานข้อมูล:', { userFolderId, monthFolderId, googleSheetId });

    return NextResponse.json({
      success: true,
      data: {
        message: 'สร้างและแชร์โครงสร้างโฟลเดอร์ Google Drive สำเร็จ',
        userFolderId,
        monthFolderId,
        googleSheetId: googleSheetId || null,
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
