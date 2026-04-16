import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createFolderStructureWithServiceAccount } from '@/lib/googledrive';

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
        { error: 'User not authenticated or email missing' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || undefined;

    console.log('📁 Setting up Google Drive folder for user:', userId, userEmail);

    // Create folder structure using Service Account
    const { monthFolderId, userFolderId } = await createFolderStructureWithServiceAccount(
      userId,
      userEmail,
      userName
    );

    if (!monthFolderId || !userFolderId) {
      return NextResponse.json(
        { error: 'Failed to create Google Drive folder structure' },
        { status: 500 }
      );
    }

    console.log('✅ Google Drive setup complete:', { monthFolderId, userFolderId });

    // TODO: Store folder IDs in database for this user
    // db.collection('users').updateOne(
    //   { _id: userId },
    //   { $set: { 
    //     googleDriveFolderId: userFolderId,
    //     googleDriveMonthFolderId: monthFolderId,
    //     googleDriveSetupCompleted: true
    //   }}
    // )

    return NextResponse.json({
      success: true,
      data: {
        message: 'Google Drive folder structure created and shared successfully',
        userFolderId,
        monthFolderId,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ Setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to setup Google Drive';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
