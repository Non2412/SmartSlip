import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, userId } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const contactDoc = {
      name,
      email,
      subject,
      message,
      userId: userId || 'guest',
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('contacts').insertOne(contactDoc);

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...contactDoc
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
