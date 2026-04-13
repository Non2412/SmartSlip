import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserMonthFolder } from '@/lib/googledrive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get session to check if user is authenticated
    const session = await auth();
    
    // Try to get accessToken from query params (for testing)
    const { accessToken } = request.nextUrl.searchParams;
    const userName = session?.user?.name || undefined;

    try {
      if (accessToken) {
        // Try to get/create user's folder using provided access token
        const folderId = await getUserMonthFolder(userId, userName, accessToken);

        if (folderId) {
          // Successfully got or created folder
          const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          return NextResponse.redirect(folderUrl);
        }
      }
    } catch (folderErr) {
      console.warn('Failed to create folder dynamically:', folderErr);
      // Fall back to configured folder
    }

    // Fallback: use configured folder ID from env
    const fallbackFolderId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

    if (!fallbackFolderId) {
      return NextResponse.json(
        { error: 'Google Drive folder not configured' },
        { status: 500 }
      );
    }

    const folderUrl = `https://drive.google.com/drive/folders/${fallbackFolderId}`;
    return NextResponse.redirect(folderUrl);
  } catch (error: unknown) {
    console.error('Drive Redirect Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to redirect to Google Drive',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
