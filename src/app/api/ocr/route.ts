import { NextResponse } from 'next/server';
import { hasDocumentAiConfig, processDocumentAiImage, parseReceiptDocument } from '@/lib/documentai';

const localOcrUrl = process.env.OCR_URL || 'http://127.0.0.1:5000/predict';
const disableDocumentAi = process.env.DISABLE_DOCUMENT_AI === 'true';

async function fetchLocalOcr(image: string) {
  const response = await fetch(localOcrUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Local OCR service error: ${errorText}`);
  }

  const ocrResult = await response.json();
  if (!ocrResult.success) {
    throw new Error(ocrResult.error || 'Local OCR failed');
  }

  return ocrResult;
}

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    try {
      const ocrResult = await fetchLocalOcr(image);
      return NextResponse.json({ success: true, source: 'local', data: ocrResult.data });
    } catch (localError) {
      console.warn('Local OCR service unavailable:', localError instanceof Error ? localError.message : localError);
    } catch (localError: any) {
      console.warn('Local OCR service unavailable:', localError?.message || localError);
    }

    if (!disableDocumentAi && hasDocumentAiConfig) {
      try {
        const documentAiResult = await processDocumentAiImage(image);
        const { data } = parseReceiptDocument(documentAiResult);
        return NextResponse.json({ success: true, source: 'documentai', data });
      } catch (e: any) {
        const message = e?.message || e;
        if (typeof message === 'string' && message.includes('BILLING_DISABLED')) {
          console.warn('Document AI billing disabled. Skipping Document AI fallback.');
        } else {
          console.warn('Document AI failed:', message);
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: 'OCR service unavailable. Please start the OCR backend or enable Document AI.',
    }, { status: 503 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
