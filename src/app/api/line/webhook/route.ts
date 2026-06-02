import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';
import { appendReceiptToUserSheet } from '@/lib/googlesheets';

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

    if (!await verifySignature(bodyText, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const events = payload.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'image') {
        const { id: messageId } = event.message;
        const replyToken = event.replyToken;
        const userId = event.source.userId;

        try {
          // 1. Map LINE User to Internal User
          const client = await clientPromise;
          const db = client.db();
          
          const userAccount = await db.collection('accounts').findOne({
            provider: 'line',
            providerAccountId: userId // This is the LINE User ID
          });

          const internalUserId = userAccount ? userAccount.userId.toString() : userId;

          // 2. Download Image
          const imageBuffer = await getLineContent(messageId);

          // 3. Process with Gemini via Backend API
          const backendUrl = `${process.env.BACKEND_API_URL || 'https://smart-slip-api.vercel.app'}/api/receipts/extract`;
          const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'super-secret-api-key-12345';

          console.log('LINE Webhook: Requesting OCR from backend API:', backendUrl);
          
          const ocrFormData = new FormData();
          const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
          ocrFormData.append('image', imageBlob, 'line-receipt.jpg');
          ocrFormData.append('userId', internalUserId);

          const ocrResponse = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
            },
            body: ocrFormData,
          });

          if (!ocrResponse.ok) {
            const errText = await ocrResponse.text();
            throw new Error(`Backend OCR failed: ${ocrResponse.statusText} - ${errText}`);
          }

          const ocrResult = await ocrResponse.json();
          if (!ocrResult.success || !ocrResult.data) {
            throw new Error(ocrResult.error || 'Failed to extract data using backend OCR');
          }

          const data = ocrResult.data;

          // 4. Upload to Google Cloud Storage
          let driveFileId = null;
          let gcsUrl = null;
          const { ObjectId } = await import('mongodb');
          let userDoc = await db.collection('users').findOne({ _id: internalUserId as any });
          if (!userDoc && ObjectId.isValid(internalUserId)) {
            userDoc = await db.collection('users').findOne({ _id: new ObjectId(internalUserId) });
          }

          let driveErrorMsg = '';
          let userAccessToken: string | undefined;
          try {
            const fileName = `line-receipt-${data.store || 'unknown'}-${Date.now()}.jpg`.replace(/[^a-zA-Z0-9.-]/g, '_');
            
            const { uploadToGCS } = await import('@/lib/gcs');
            const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'smartslip-receipts';
            
            const uploadResult = await uploadToGCS(imageBuffer, fileName, 'image/jpeg', bucketName, internalUserId);
            gcsUrl = uploadResult.publicUrl;
            driveFileId = uploadResult.name; // Use the GCS path as the ID for now
            console.log('✅ LINE receipt uploaded to GCS:', gcsUrl);
          } catch (driveErr: any) {
            console.error('❌ GCS upload failed:', driveErr);
            driveErrorMsg = `\n(⚠️ อัปโหลดรูปไม่สำเร็จ: ${driveErr.message})`;
          }

          // 5. Save to MongoDB
          const newReceipt = {
            storeName: data.store || 'Unknown Store',
            totalAmount: parseFloat(data.amount) || 0,
            userId: internalUserId,
            source: 'line',
            extractedData: data,
            imageFileId: driveFileId,
            imageUrl: gcsUrl,
            createdAt: new Date().toISOString(),
          };
          const insertResult = await db.collection('receipts').insertOne(newReceipt);

          // 6. Append to Google Sheet (if user has a sheet)
          if (userDoc?.googleSheetId) {
            try {
              const imageUrl = gcsUrl || '';
              await appendReceiptToUserSheet(userDoc.googleSheetId, {
                date: data.date || new Date().toISOString(),
                storeName: newReceipt.storeName,
                sender: data.method || '',
                amount: newReceipt.totalAmount,
                status: 'pending',
                confidence: 'high',
                receiptId: insertResult.insertedId.toString(),
                imageUrl,
              }, userAccessToken);
              console.log('✅ Receipt appended to Google Sheet:', userDoc.googleSheetId);
            } catch (sheetErr) {
              console.error('❌ Sheet append failed (non-critical):', sheetErr);
            }
          }

          // 7. Reply Success
          const itemsText = data.items && data.items.length > 0 
            ? `\n🛒 สินค้า:\n` + data.items.map((item: any, idx: number) => {
                const uPrice = parseFloat(item.unitPrice ?? item.unit_price ?? 0);
                const qty = parseFloat(item.quantity ?? 1);
                const tPrice = parseFloat(item.totalPrice ?? item.total ?? item.total_price ?? (uPrice * qty));
                return `${idx + 1}. ${item.description}\n   จำนวน: ${qty} x ฿${uPrice.toFixed(2)} = ฿${tPrice.toFixed(2)}`;
              }).join('\n')
            : '';

          const successMsg = `✅ ประมวลผลสำเร็จ!\n\n💰 จำนวนเงิน: ฿${newReceipt.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n👤 ผู้ส่ง: ${data.method || 'Unknown'}\n🏢 ผู้รับ: ${newReceipt.storeName}\n📅 วันที่: ${data.date || new Date().toISOString().split('T')[0]}\n${itemsText}\n\n🎯 ความแม่นยำ: ✅ high${gcsUrl ? '\n☁️ บันทึกลง Cloud Storage แล้ว' : driveErrorMsg}`;

          await replyMessage(replyToken, successMsg);

        } catch (procErr: any) {
          console.error('Processing error:', procErr);
          await replyMessage(replyToken, `❌ เกิดข้อความผิดพลาดขณะประมวลผลรูปภาพ:\n${procErr.message || 'Unknown Error'}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

