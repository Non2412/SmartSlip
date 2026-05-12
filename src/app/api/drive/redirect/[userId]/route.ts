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

    if (!userId) {
      return NextResponse.json({ error: 'ต้องการ User ID' }, { status: 400 });
    }

    // Get session to check if user is authenticated
    const session = await auth();
    
    // Check if user is the one requesting their own folder
    if (session?.user?.id !== userId) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์: คุณสามารถเข้าถึงโฟลเดอร์ของคุณเองได้เท่านั้น' },
        { status: 403 }
      );
    }

    console.log('📂 กำลังลิดไปที่โฟลเดอร์ Google Drive ของผู้ใช้:', userId);

    // Get folder ID from database
    const client = await clientPromise;
    const db = client.db();
    
    // Try to find by userId as string, or as ObjectId if valid
    let user = await db.collection('users').findOne({ _id: userId as any });
    
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    if (!user?.googleDriveFolderId) {
      console.warn('⚠️ ไม่ได้ตั้งค่าโฟลเดอร์ Google Drive สำหรับผู้ใช้:', userId);
      return NextResponse.json(
        { 
          error: 'ไม่ได้ตั้งค่าโฟลเดอร์ Google Drive',
          message: 'กรุณาตั้งค่า Google Drive ก่อนโดยไปที่แดชบอร์ด'
        },
        { status: 404 }
      );
    }

    const folderId = user.googleDriveFolderId;
    console.log('✅ พบ ID โฟลเดอร์:', folderId);

    // Redirect to Google Drive folder
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    return NextResponse.redirect(folderUrl);
  } catch (error: unknown) {
    console.error('❌ ข้อผิดพลาดการลิด Drive:', error);
    return NextResponse.json(
      {
        error: 'ล้มเหลวในการลิดไปยัง Google Drive',
        details: error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่รู้จัก'
      },
      { status: 500 }
    );
  }
}
