import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount, shareWithAnyoneWithLink } from '@/lib/googledrive';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drive/auto-setup
 * Automatically setup Google Drive folder for LINE users using Service Account
 * Called on first login or dashboard load
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name;
    const isLineUser = (session as any)?.lineUserName ? true : false;

    console.log('🔧 Auto-setup Google Drive for user:', userId, userEmail, 'isLineUser:', isLineUser);

    // Get or create folder structure
    const client = await clientPromise;
    const db = client.db();

    // Check if already set up
    let user = await db.collection('users').findOne({ _id: userId as any });
    
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (user?.googleDriveFolderId) {
      console.log('✅ Google Drive already setup for user:', userId);
      return NextResponse.json({
        success: true,
        message: 'Google Drive already setup',
        folderId: user.googleDriveFolderId
      });
    }

    console.log('📁 Creating folder structure with Service Account for:', userId);

    // Create folder structure using Service Account (no user token needed)
    let monthFolderId: string | undefined;
    let userFolderId: string | undefined;

    try {
      const result = await createFolderStructureWithServiceAccount(
        userId,
        userEmail,
        userName
        // No access token - will use Service Account
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
        { error: 'Failed to create Google Drive folder structure' },
        { status: 500 }
      );
    }

    console.log('✅ Folder structure created:', { monthFolderId, userFolderId });

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
    const updateQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
    
    await db.collection('users').updateOne(
      updateQuery as any,
      {
        $set: {
          googleDriveFolderId: userFolderId,
          googleDriveMonthFolderId: monthFolderId,
          googleDriveSetupCompleted: true,
          googleDriveSetupDate: new Date(),
          googleDriveSetupMethod: isLineUser ? 'service-account' : 'user-auth',
        },
      },
      { upsert: true }
    );

    console.log('💾 Saved folder IDs to database');

    return NextResponse.json({
      success: true,
      message: `Google Drive auto-setup complete (${isLineUser ? 'Service Account' : 'User Auth'})`,
      folderId: userFolderId,
      monthFolderId: monthFolderId,
      method: isLineUser ? 'service-account' : 'user-auth'
    });

  } catch (error: unknown) {
    console.error('❌ Auto-setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to setup Google Drive';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
