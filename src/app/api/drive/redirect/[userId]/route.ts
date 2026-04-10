import { NextRequest, NextResponse } from 'next/server';

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

    // Call Backend API to get Folder ID
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://smart-slip-api.vercel.app';
    const response = await fetch(`${backendUrl}/api/drive/folder/${userId}?name=${userName || ''}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    const folderId = data.folderId;

    if (!folderId) {
      return NextResponse.json({ error: 'Failed to get folder ID from backend' }, { status: 500 });
    }

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
