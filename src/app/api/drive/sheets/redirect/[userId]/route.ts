import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();

    if (session?.user?.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();

    let user = await db.collection('users').findOne({ _id: userId as any });
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (!user?.googleSheetId) {
      return NextResponse.json(
        { error: 'Google Sheet ยังไม่ได้ตั้งค่า กรุณาเชื่อมต่อบัญชี Google เพื่อใช้ฟีเจอร์นี้' },
        { status: 404 }
      );
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${user.googleSheetId}`;
    return NextResponse.redirect(sheetUrl);
  } catch (error) {
    console.error('Sheets redirect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
