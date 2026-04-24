import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (Name, Email, Password)' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.collection('users').insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { success: true, message: 'ลงทะเบียนสำเร็จ', userId: newUser.insertedId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลงทะเบียน', details: error.message },
      { status: 500 }
    );
  }
}
