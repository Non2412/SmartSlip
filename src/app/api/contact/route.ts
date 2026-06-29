import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import nodemailer from 'nodemailer';

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Gmail App Password
    },
  });
}

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

    // 1. Save to MongoDB
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

    // 2. Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

    if (process.env.SMTP_USER && process.env.SMTP_PASS && adminEmail) {
      try {
        const transporter = createTransporter();

        // Email to admin (notification)
        await transporter.sendMail({
          from: `"SmartSlip Contact" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          replyTo: email,
          subject: `[SmartSlip] ${subject} — จาก ${name}`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">📩 ข้อความใหม่จาก SmartSlip</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; width: 120px; font-weight: 600;">ชื่อผู้ส่ง</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; font-weight: 600;">อีเมล</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">
                      <a href="mailto:${email}" style="color: #10b981; text-decoration: none;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; font-weight: 600;">หัวข้อ</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; font-weight: 600;">User ID</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${userId || 'guest'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; font-weight: 600;">วันที่</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</td>
                  </tr>
                </table>
                <div style="margin-top: 20px;">
                  <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 8px;">ข้อความ:</p>
                  <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                </div>
                <div style="margin-top: 24px; text-align: center;">
                  <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" 
                     style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                    ตอบกลับผู้ใช้
                  </a>
                </div>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">SmartSlip — ระบบจัดการสลิปอัจฉริยะ</p>
            </div>
          `,
        });

        // Email to user (confirmation)
        await transporter.sendMail({
          from: `"SmartSlip Support" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `ได้รับข้อความของคุณแล้ว — ${subject}`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">✅ ได้รับข้อความของคุณแล้ว</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">สวัสดี <strong>${name}</strong>,</p>
                <p style="color: #374151; font-size: 14px; line-height: 1.6;">เราได้รับข้อความของคุณแล้ว และจะตรวจสอบและติดต่อกลับโดยเร็วที่สุด</p>
                <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px 0; font-weight: 600;">หัวข้อที่ส่ง:</p>
                  <p style="color: #111827; font-size: 14px; margin: 0;">${subject}</p>
                </div>
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อทีมงานได้โดยตรง</p>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">SmartSlip — ระบบจัดการสลิปอัจฉริยะ</p>
            </div>
          `,
        });
      } catch (emailError: any) {
        // Log email error but don't fail the request — data is already saved in MongoDB
        console.error('[Contact] Email sending failed:', emailError.message);
      }
    } else {
      console.warn('[Contact] SMTP credentials not configured. Email not sent.');
    }

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
