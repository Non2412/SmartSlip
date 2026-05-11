import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount, createFolderStructureAsUser, shareWithAnyoneWithLink } from '@/lib/googledrive';
import { createUserSpreadsheet } from '@/lib/googlesheets';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { google } from 'googleapis';

/**
 * POST /api/drive/auto-setup
 * Automatically setup Google Drive folder for LINE users using Service Account
 * Called on first login or dashboard load
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email || null;  // LINE users may not have email
    const userName = session.user.name;
    let googleAccessToken = (session as any).googleAccessToken as string | undefined;
    let googleRefreshToken: string | undefined;
    let googleTokenExpiry: Date | undefined;
    const isLineUser = (session as any)?.lineUserName ? true : false;
    
    console.log('🔧 Auto-setup Google Drive for user:', userId);
    console.log('🔧 Auto-setup Google Drive for user:', userId, userEmail, 'isLineUser:', isLineUser);

    // Get or create folder structure
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
          googleRefreshToken = (googleAccount.refresh_token as string) || undefined;
          googleTokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
          // Update token in DB for next time
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

    // Check if already set up
    let user = await db.collection('users').findOne({ _id: userId as any });
    
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (!user && userEmail) {
      user = await db.collection('users').findOne({ email: userEmail.toLowerCase() });
      if (user) {
        console.log('💡 User found by email instead of ID:', user._id);
      }
    }
    
    console.log('🔍 User found in DB:', !!user, 'Current folderId:', user?.googleDriveFolderId);
    
    if (user?.googleDriveFolderId) {
      console.log('✅ Google Drive already setup for user:', userId);

      // If user has a Google token but folder is SA-owned (not user-owned), migrate to user-owned folder
      // This fixes "Insufficient permissions" when backend tries to upload to SA folder
      if (googleAccessToken && !user.folderOwnedByUser) {
        try {
          console.log('🔄 Migrating to user-owned Drive folder...');
          const result = await createFolderStructureAsUser(googleAccessToken, userName ?? undefined);
          const newFolderId = result.userFolderId;
          const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
          await db.collection('users').updateOne(updateQuery as any, {
            $set: { googleDriveFolderId: newFolderId, folderOwnedByUser: true }
          });
          user.googleDriveFolderId = newFolderId;
          user.folderOwnedByUser = true;
          console.log('✅ Migrated to user-owned folder:', newFolderId);

          // Sync new folder ID to backend (check DB for LINE account, not session flag)
          if (process.env.BACKEND_API_URL) {
            const lineAcc = await db.collection('accounts').findOne({
              $or: [
                { userId: userId, provider: 'line' },
                { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'line' },
              ],
            });
            if (lineAcc?.providerAccountId) {
              await fetch(`${process.env.BACKEND_API_URL}/api/user/link-line`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  lineUserId: lineAcc.providerAccountId,
                  googleDriveFolderId: newFolderId,
                  googleAccessToken,
                  googleRefreshToken,
                  googleTokenExpiry: googleTokenExpiry?.toISOString(),
                }),
              });
              console.log('✅ Synced new folder ID + tokens to backend');
            }
          }
        } catch (migrateErr: any) {
          console.warn('⚠️ Folder migration failed (will use existing):', migrateErr?.message);
        }
      }

      // If user doesn't have a Sheet yet, try to create one now
      // Only attempt if: user has a Google token (LINE users without token will always fail SA quota)
      // If googleAccessToken is present, always try regardless of googleSheetSkipped (user may have linked Google later)
      let googleSheetId: string | null = user.googleSheetId || null;
      const shouldTrySheet = !googleSheetId && (googleAccessToken ? true : !user.googleSheetSkipped);
      if (shouldTrySheet) {
        if (!googleAccessToken) {
          // No Google token available (LINE user) - skip to avoid SA quota errors
          console.log('ℹ️ No Google token for sheet creation (LINE user) - skipping');
          const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
          await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetSkipped: true } });
        } else {
          try {
            console.log('📊 Creating Sheet with user Google token...');
            const sheet = await createUserSpreadsheet(userId, userName ?? undefined, user.googleDriveFolderId, googleAccessToken);
            googleSheetId = sheet.spreadsheetId;
            console.log('✅ Google Sheet created for existing user:', googleSheetId);
            const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
            await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetId, googleSheetSkipped: false } });
            // Sync googleSheetId to backend User document via API
            try {
              const lineAccount = await db.collection('accounts').findOne({
                $or: [
                  { userId: userId, provider: 'line' },
                  { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'line' },
                ],
              });
              if (lineAccount?.providerAccountId && process.env.BACKEND_API_URL && process.env.ADMIN_SECRET_KEY) {
                await fetch(`${process.env.BACKEND_API_URL}/api/user/update-sheet`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': process.env.ADMIN_SECRET_KEY,
                  },
                  body: JSON.stringify({
                    lineUserId: lineAccount.providerAccountId,
                    googleSheetId,
                  }),
                });
                console.log('✅ Synced googleSheetId to backend via API');
                // Also sync Google tokens to backend so Drive upload works
                if (googleAccessToken) {
                  await fetch(`${process.env.BACKEND_API_URL}/api/user/link-line`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId,
                      lineUserId: lineAccount.providerAccountId,
                      googleAccessToken,
                      googleRefreshToken,
                      googleTokenExpiry: googleTokenExpiry?.toISOString(),
                    }),
                  });
                  console.log('✅ Synced Google tokens to backend LINE user');
                }
              }
            } catch (syncErr: any) {
              console.warn('⚠️ Could not sync googleSheetId to backend:', syncErr?.message);
            }
          } catch (sheetErr: any) {
            console.error('❌ SHEET CREATION ERROR:', sheetErr?.message || sheetErr);
            // Only set skipped if no Google token (SA failure) - if user token failed, retry next time
            const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
            await db.collection('users').updateOne(updateQuery as any, { $set: { googleSheetSkipped: true } });
          }
        }
      }

      // Sync Google tokens to backend for Drive upload (check DB for LINE account, not session flag)
      if (googleAccessToken && process.env.BACKEND_API_URL) {
        try {
          const lineAccount = await db.collection('accounts').findOne({
            $or: [
              { userId: userId, provider: 'line' },
              { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'line' },
            ],
          });
          if (lineAccount?.providerAccountId) {
            await fetch(`${process.env.BACKEND_API_URL}/api/user/link-line`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                lineUserId: lineAccount.providerAccountId,
                googleAccessToken,
                googleRefreshToken,
                googleTokenExpiry: googleTokenExpiry?.toISOString(),
              }),
            });
            console.log('✅ Synced Google tokens to backend LINE user');
          }
        } catch (syncErr: any) {
          console.warn('⚠️ Could not sync tokens to backend:', syncErr?.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Google Drive already setup',
        folderId: user.googleDriveFolderId,
        googleSheetId,
      });
    }

    // Create folder structure — use user's OAuth token if available (user owns folders → no permission issues)
    let monthFolderId: string | undefined;
    let userFolderId: string | undefined;

    try {
      if (googleAccessToken) {
        console.log('📁 Creating folder structure with user OAuth token...');
        const result = await createFolderStructureAsUser(googleAccessToken, userName ?? undefined);
        userFolderId = result.userFolderId;
        monthFolderId = userFolderId;
      } else {
        const result = await createFolderStructureWithServiceAccount(
          userId,
          userEmail ?? '',
          userName ?? undefined
        );
        monthFolderId = result.monthFolderId;
        userFolderId = result.userFolderId;
      }
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
        { error: 'Failed to create Google Drive folder structure' },
        { status: 500 }
      );
    }

    console.log('✅ Folder structure created:', { monthFolderId, userFolderId });

    // Create Google Sheet only if user has a Google token (avoids SA quota issues for LINE users)
    let googleSheetId: string | undefined;
    if (googleAccessToken) {
      try {
        const sheet = await createUserSpreadsheet(userId, userName ?? undefined, userFolderId, googleAccessToken);
        googleSheetId = sheet.spreadsheetId;
        console.log('✅ Google Sheet created:', googleSheetId);
      } catch (sheetErr: any) {
        console.warn('⚠️ Could not create spreadsheet (non-critical):', sheetErr?.message);
      }
    } else {
      console.log('ℹ️ No Google token - skipping sheet creation for LINE user');
    }

    // For LINE users, ensure folder is shared with "Anyone with link"
    if (isLineUser) {
      console.log('👤 Setting up LINE user folder with "Anyone with link"...');
      try {
        await shareWithAnyoneWithLink(userFolderId);
        console.log('✅ Folder shared with "Anyone with link" for LINE user');
      } catch (linkError) {
        console.warn('⚠️ Could not share with "Anyone with link", but folder was created:', linkError);
      }
    }

    // Store folder IDs in database
    // Use the actual user ID from the database if we found it via email fallback
    const targetUserId = user?._id || userId;
    const updateQuery = ObjectId.isValid(targetUserId as string) 
      ? { _id: new ObjectId(targetUserId as string) } 
      : { _id: targetUserId };
    
    const updateResult = await db.collection('users').updateOne(
      updateQuery as any,
      {
        $set: {
          googleDriveFolderId: userFolderId,
          googleDriveMonthFolderId: monthFolderId,
          googleDriveSetupCompleted: true,
          googleDriveSetupDate: new Date(),
          googleDriveSetupMethod: isLineUser ? 'service-account' : 'user-auth',
          folderOwnedByUser: !!googleAccessToken,
          ...(googleSheetId ? { googleSheetId } : {}),
        },
      },
      { upsert: false } // Disable upsert to avoid duplicate key errors
    );

    if (updateResult.matchedCount === 0) {
      console.warn(`⚠️ User ${targetUserId} not found in database, could not save folder IDs.`);
    } else {
      console.log('💾 Saved folder IDs to database');
    }

    // Sync Google tokens + folder/sheet to backend LINE user record (check DB for LINE account)
    if (process.env.BACKEND_API_URL) {
      try {
        const lineAccount = await db.collection('accounts').findOne({
          $or: [
            { userId: userId, provider: 'line' },
            { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'line' },
          ],
        });
        if (lineAccount?.providerAccountId) {
          await fetch(`${process.env.BACKEND_API_URL}/api/user/link-line`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              lineUserId: lineAccount.providerAccountId,
              googleDriveFolderId: userFolderId,
              googleSheetId: googleSheetId || undefined,
              ...(googleAccessToken && {
                googleAccessToken,
                googleRefreshToken,
                googleTokenExpiry: googleTokenExpiry?.toISOString(),
              }),
            }),
          });
          console.log('✅ Synced tokens + Drive folder to backend LINE user (new setup)');
        }
      } catch (syncErr: any) {
        console.warn('⚠️ Could not sync to backend:', syncErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Google Drive auto-setup complete (${isLineUser ? 'Service Account' : 'User Auth'})`,
      folderId: userFolderId,
      monthFolderId: monthFolderId,
      googleSheetId: googleSheetId || null,
      method: isLineUser ? 'service-account' : 'user-auth'
    });

  } catch (error: any) {
    console.error('❌ Auto-setup error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      error: error
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to setup Google Drive';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
