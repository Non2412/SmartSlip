import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body; // Base64 image data

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // System prompt for structured JSON
    const prompt = `
      คุณคือผู้ช่วยจัดการใบเสร็จระดับมืออาชีพ กรุณาอ่านรูปภาพใบเสร็จนี้และส่งข้อมูลยอดเงินสุทธิและชื่อร้านค้ากลับมาในรูปแบบ JSON ดังนี้:
      {
        "store": "ชื่อร้านค้าที่พบในใบเสร็จ",
        "amount": "ยอดเงินสุทธิในรูปแบบตัวเลข (เช่น 120.50)",
        "date": "วันที่ในใบเสร็จ (ISO 8601)",
        "method": "วิธีชำระเงิน (เงินสด, โอนเงิน, บัตรเครดิต)",
        "receiver": "ชื่อผู้รับเงิน (ถ้ามี)"
      }
      **สำคัญ**: คืนค่าเฉพาะ JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม และภาษาไทยถูกต้อง
    `;

    // Process image (binary data if needed, but here we assume base64 string)
    // format: { mimeType: "image/jpeg", data: "base64-string" }
    const imageParts = [{
      inlineData: {
        data: image.split(',')[1] || image, // Remove data:image/jpeg;base64, if exists
        mimeType: 'image/jpeg'
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI could not parse structured data: ' + text);
    }

    const data = JSON.parse(jsonMatch[0]);

    // --- UPLOAD TO GOOGLE DRIVE ---
    let driveFileId = null;
    try {
      const { uploadFile } = await import('@/lib/googledrive');
      
      // Clean up base64 string
      const base64Data = image.split(',')[1] || image;
      const buffer = Buffer.from(base64Data, 'base64');
      
      const uploadResult = await uploadFile(
        buffer, 
        `receipt-${Date.now()}.jpg`, 
        'image/jpeg'
      );
      driveFileId = uploadResult.id;
    } catch (driveError) {
      console.error('Google Drive Upload Failed:', driveError);
      // We don't want to fail the whole request just because Drive upload failed, 
      // but you can change this behavior if needed.
    }

    return NextResponse.json({
      success: true,
      data: {
        store: data.store || 'Unknown Store',
        amount: parseFloat(data.amount) || 0,
        date: data.date || new Date().toISOString(),
        method: data.method || 'ไม่ระบุ',
        receiver: data.receiver || 'ทั่วไป',
        imageFileId: driveFileId // Add fileId to the response
      }
    });
  } catch (error: any) {
    console.error('OCR Extraction Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
