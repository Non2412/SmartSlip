import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Endpoint to link Google account to existing user
 * Called after user authorizes Google Drive via OAuth redirect
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      );
    }

    const { googleAccessToken, googleRefreshToken, googleExpiresAt } = await request.json();

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: 'Google access token is required' },
        { status: 400 }
      );
    }

    console.log('🔗 Linking Google tokens to user:', session.user.id);

    // Store Google tokens in database for this user
    const client = await clientPromise;
    const db = client.db();
    
    // Determine the query ID (Convert to ObjectId if it's a valid hex string)
    const userId = session.user.id;
    const queryId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    
    const result = await db.collection('users').updateOne(
      { _id: queryId as any },
      {
        $set: {
          googleAccessToken,
          googleRefreshToken,
          googleExpiresAt,
          googleLinkedAt: new Date(),
          googleSheetSkipped: false,  // Allow sheet creation now that user has Google token
        }
      }
    );

    console.log('✅ Google tokens linked successfully');

    return NextResponse.json({
      success: true,
      message: 'Google account linked',
      userId: session.user.id
    });

  } catch (error) {
    console.error('❌ Failed to link Google account:', error);
    return NextResponse.json(
      { error: 'Failed to link Google account' },
      { status: 500 }
    );
  }
}
