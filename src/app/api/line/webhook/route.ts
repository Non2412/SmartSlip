import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import clientPromise from '@/lib/mongodb';
import { uploadFile, getUserMonthFolder } from '@/lib/googledrive';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function verifySignature(body: string, signature: string) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

async function getLineContent(messageId: string) {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: {
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get LINE content: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function replyMessage(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-line-signature') || '';

    if (!verifySignature(bodyText, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const events = payload.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'image') {
        const { id: messageId } = event.message;
        const replyToken = event.replyToken;
        const userId = event.source.userId;

        // 1. Inform user we are processing
        // (Optional: can't reply twice easily with same token, but can use push message later)

        try {
          // 2. Download Image
          const imageBuffer = await getLineContent(messageId);
          const base64Image = imageBuffer.toString('base64');

          // 3. Process with Gemini
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

          const imageParts = [{
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          }];

          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          const text = response.text();

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('AI could not parse structured data');
          const data = JSON.parse(jsonMatch[0]);

          // 4. Upload to Google Drive
          // For now, using service account root or user folder if mapping exists
          // Since we don't have OAuth mapping yet, we'll use a specific folder or common root
          let driveFileId = null;
          try {
            const fileName = `line-receipt-${data.store || 'unknown'}-${Date.now()}.jpg`.replace(/[^a-zA-Z0-9.-]/g, '_');
            // Try to get user folder (this uses root defined in env if no specific parent)
            const targetFolderId = await getUserMonthFolder(userId);

            const uploadResult = await uploadFile(imageBuffer, fileName, 'image/jpeg', targetFolderId);
            driveFileId = uploadResult.id;
          } catch (driveErr) {
            console.error('Drive upload failed:', driveErr);
          }

          // 5. Save to MongoDB
          const client = await clientPromise;
          const db = client.db('smartslip_api');
          const newReceipt = {
            storeName: data.store || 'Unknown Store',
            totalAmount: parseFloat(data.amount) || 0,
            userId: userId, // Using LINE User ID
            source: 'line',
            extractedData: data,
            imageFileId: driveFileId,
            createdAt: new Date().toISOString(),
          };
          await db.collection('receipts').insertOne(newReceipt);

          // 6. Reply Success
          const successMsg = `✅ บันทึกใบเสร็จเรียบร้อย!
ร้าน: ${newReceipt.storeName}
ยอดเงิน: ${newReceipt.totalAmount.toLocaleString()} บาท
บันทึกลง Google Drive แล้วครับ`;
          await replyMessage(replyToken, successMsg);

        } catch (procErr: unknown) {
          console.error('Processing error:', procErr);
          await replyMessage(replyToken, '❌ เกิดข้อความผิดพลาดขณะประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้ง');
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
