import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shareFolderWithUser, shareWithAnyoneWithLink } from '@/lib/googledrive';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { google } from 'googleapis';

/**
 * POST /api/drive/fix-permissions
 * Fix folder permissions by transferring ownership or sharing with "Anyone with link"
 * Call this after getting Google tokens to properly set up folder access
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

    // Get folder ID from database
    const client = await clientPromise;
    const db = client.db();

    // For LINE users, get Google email from linked account in DB
    let userEmail = session.user.email;
    if (!userEmail) {
      const googleAccount = await db.collection('accounts').findOne({
        $or: [
          { userId: userId, provider: 'google' },
          { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'google' },
        ],
      });
      if (googleAccount?.access_token) {
        try {
          // Get email from Google userinfo API using stored token
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${googleAccount.access_token}` },
          });
          if (userInfoRes.ok) {
            const userInfo = await userInfoRes.json();
            userEmail = userInfo.email;
          }
        } catch {}
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'No Google email found. Please link a Google account first.' },
        { status: 400 }
      );
    }

    console.log('🔧 Fixing folder permissions for user:', userId, userEmail);

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

    // Share folder using SA (owner of folder) with user's Google email as writer
    try {
      await shareFolderWithUser(userFolderId, userEmail!, 'writer');
      console.log('✅ Successfully shared folder with user as writer:', userEmail);
      return NextResponse.json({
        success: true,
        message: 'Folder shared with user as writer',
        folderId: userFolderId,
        sharedWith: userEmail,
      });
    } catch (shareError: any) {
      const errMsg = shareError?.message || shareError?.errors?.[0]?.message || String(shareError);
      console.warn('⚠️ Could not share with user directly:', errMsg);
      try {
        await shareWithAnyoneWithLink(userFolderId);
        return NextResponse.json({
          success: true,
          message: 'Folder shared with "Anyone with link" (direct share failed)',
          folderId: userFolderId,
          shareError: errMsg,
        });
      } catch (linkError) {
        return NextResponse.json({ error: 'Could not update folder permissions' }, { status: 500 });
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
