import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserMonthFolder } from '@/lib/googledrive';

/**
 * POST /api/drive/setup
 * Create user's Google Drive folder structure for storing receipts
 * Called after user authorizes Google Drive
 */
export async function POST(request: NextRequest) {
  try {
    // Get session with user auth
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get access token from request body
    const body = await request.json();
    const { googleAccessToken } = body;

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: 'Google access token is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userName = session.user.name || undefined;

    console.log('🔐 Setting up Google Drive for user:', userId);

    // Create user's folder structure in Google Drive
    // Structure: Root -> User Folder -> Month-Year Folder
    // Pass the access token to authenticate the API calls
    const folderID = await getUserMonthFolder(userId, userName, googleAccessToken);

    if (!folderID) {
      return NextResponse.json(
        { error: 'Failed to create Google Drive folder' },
        { status: 500 }
      );
    }

    console.log('✅ Google Drive folder created:', folderID);

    // TODO: Store folderID in database for this user
    // db.collection('users').updateOne(
    //   { _id: userId },
    //   { $set: { googleDriveFolderId: folderID } }
    // )

    return NextResponse.json({
      success: true,
      data: {
        folderId: folderID,
        folderUrl: `https://drive.google.com/drive/folders/${folderID}`,
      },
      message: 'Google Drive folder created successfully'
    });
  } catch (error: unknown) {
    console.error('Drive Setup Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to setup Google Drive folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
