import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shareFolderWithUser, shareWithAnyoneWithLink } from '@/lib/googledrive';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drive/fix-permissions
 * Fix folder permissions by transferring ownership or sharing with "Anyone with link"
 * Call this after getting Google tokens to properly set up folder access
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

    console.log('🔧 Fixing folder permissions for user:', userId, userEmail);

    // Get folder ID from database
    const client = await clientPromise;
    const db = client.db();

    let user = await db.collection('users').findOne({ _id: userId as any });
    
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (!user?.googleDriveFolderId) {
      return NextResponse.json(
        { error: 'No Google Drive folder found for this user' },
        { status: 404 }
      );
    }

    const userFolderId = user.googleDriveFolderId;
    console.log('📂 Found folder ID:', userFolderId);

    // Try to transfer ownership first
    if (!userEmail.includes('@') || userEmail.includes('@smartslip.local')) {
      console.log('⏭️ Skipping ownership transfer (not a real Google Account):', userEmail);
      console.log('📤 Using "Anyone with link" instead...');
      
      try {
        await shareWithAnyoneWithLink(userFolderId);
        console.log('✅ Shared user folder publicly with "Anyone with link"');
        return NextResponse.json({
          success: true,
          message: 'Folder shared with "Anyone with link"',
          folderId: userFolderId
        });
      } catch (linkError) {
        console.error('❌ Error sharing with anyone with link:', linkError);
        return NextResponse.json(
          { error: 'Could not share folder with "Anyone with link"' },
          { status: 500 }
        );
      }
    }

    // Share folder directly with user as writer (works with personal Google Drive)
    try {
      await shareFolderWithUser(userFolderId, userEmail, 'writer');
      console.log('✅ Successfully shared folder with user:', userEmail);
      return NextResponse.json({
        success: true,
        message: 'Folder shared with user as writer',
        folderId: userFolderId,
        sharedWith: userEmail
      });
    } catch (shareError) {
      console.warn('⚠️ Could not share with user directly, trying "Anyone with link" fallback:', shareError);
      
      try {
        await shareWithAnyoneWithLink(userFolderId);
        console.log('✅ Shared user folder with "Anyone with link" (fallback)');
        return NextResponse.json({
          success: true,
          message: 'Folder shared with "Anyone with link" (direct share failed)',
          folderId: userFolderId
        });
      } catch (linkError) {
        console.error('❌ Fallback also failed:', linkError);
        return NextResponse.json(
          { error: 'Could not update folder permissions' },
          { status: 500 }
        );
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error fixing permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fix permissions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
