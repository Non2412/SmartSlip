import { NextResponse } from 'next/server';
import { hasGeminiConfig, processGeminiImage, parseGeminiResponse } from '@/lib/gemini-ocr';
import { hasDocumentAiConfig, processDocumentAiImage, parseReceiptDocument } from '@/lib/documentai';

async function fetchLocalOcr(image: string) {
  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Local OCR service returned non-ok response: ${errorText}`);
      return { success: false, error: 'Local OCR service unavailable' };
    }

    const ocrResult = await response.json();
    if (!ocrResult.success) {
      console.warn('Local OCR failed:', ocrResult.error);
      return { success: false, error: ocrResult.error || 'Local OCR failed' };
    }

    return ocrResult;
  } catch (error) {
    console.warn('Local OCR service not available on port 5000, skipping local OCR fallback.', error);
    return { success: false, error: 'Local OCR service not available' };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, userId } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    let data: any = {};
    let fullText = '';

    try {
      if (hasGeminiConfig) {
        const geminiResult = await processGeminiImage(image);
        const parsed = parseGeminiResponse(geminiResult);
        data = parsed.data;
        fullText = parsed.fullText;
      } else if (hasDocumentAiConfig) {
        const documentAiResult = await processDocumentAiImage(image);
        const parsed = parseReceiptDocument(documentAiResult);
        data = parsed.data;
        fullText = parsed.fullText;
      } else {
        const ocrResult = await fetchLocalOcr(image);
        if (ocrResult.success) {
          data = ocrResult.data;
          fullText = Array.isArray(ocrResult.raw) ? ocrResult.raw.join(' ') : '';
        } else {
          data = {};
          fullText = '';
        }
      }
    } catch (mainError) {
      console.error('Gemini/Document AI failed:', mainError);
      if (hasDocumentAiConfig && !hasGeminiConfig) {
        const documentAiResult = await processDocumentAiImage(image);
        const parsed = parseReceiptDocument(documentAiResult);
        data = parsed.data;
        fullText = parsed.fullText;
      } else {
        const ocrResult = await fetchLocalOcr(image);
        if (ocrResult.success) {
          data = ocrResult.data;
          fullText = Array.isArray(ocrResult.raw) ? ocrResult.raw.join(' ') : '';
        } else {
          data = {};
          fullText = '';
        }
      }
    }

    let driveFileId = null;
    let webViewLink = null;

    try {
      const { uploadFile, getUserMonthFolder } = await import('@/lib/googledrive');

      let targetFolderId = undefined;
      if (userId) {
        try {
          targetFolderId = (await getUserMonthFolder(userId)) || undefined;
        } catch (folderErr) {
          console.error('Auto Folder Creation Failed, using root:', folderErr);
        }
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `receipt-${(data.store || 'unknown')}-${Date.now()}.jpg`.replace(/[^a-zA-Z0-9.-]/g, '_');

      const uploadResult = await uploadFile(
        buffer,
        fileName,
        'image/jpeg',
        targetFolderId
      );

      driveFileId = uploadResult.id;
      webViewLink = (uploadResult as any).webViewLink;
    } catch (driveError) {
      console.error('Google Drive Process Failed:', driveError);
    }

    const detectPaymentMethod = (text: string) => {
      const match = text.match(/(เงินสด|cash|โอน(?:เงิน)?|transfer|บัตรเครดิต|บัตรเดบิต|credit|debit|promptpay)/i);
      return match ? match[0] : 'ไม่ระบุ';
    };

    const receiptNumber = data.receipt_no || data.receiptNo || undefined;
    return NextResponse.json({
      success: true,
      data: {
        store: data.store || 'Unknown Store',
        amount: parseFloat(data.total_amount || data.amount || '0') || 0,
        date: data.date || new Date().toISOString(),
        method: data.method || detectPaymentMethod(fullText),
        receiver: data.receiver || 'ทั่วไป',
        receiptNo: receiptNumber,
        receipt_no: receiptNumber,
        imageFileId: driveFileId,
        driveUrl: webViewLink,
      },
    });
  } catch (error: any) {
    console.error('OCR Extraction Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
