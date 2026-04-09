import { NextRequest, NextResponse } from 'next/server';
import { getUserMonthFolder } from '@/lib/googledrive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('name') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the folder ID for the user (creates if doesn't exist)
    const folderId = await getUserMonthFolder(userId, userName);

    // Redirect to the Google Drive folder URL
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    return NextResponse.redirect(folderUrl);
  } catch (error: unknown) {
    console.error('Drive Redirect Error:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to Google Drive', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
