import { NextResponse } from 'next/server';
import { hasDocumentAiConfig, processDocumentAiImage, parseReceiptDocument } from '@/lib/documentai';

async function fetchLocalOcr(image: string) {
  const response = await fetch('http://localhost:5000/predict', {
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

    if (hasDocumentAiConfig) {
      try {
        const documentAiResult = await processDocumentAiImage(image);
        const { data } = parseReceiptDocument(documentAiResult);
        return NextResponse.json({ success: true, source: 'documentai', data });
      } catch (e) {
        console.error('Document AI failed:', e);
      }
    }

    try {
      const ocrResult = await fetchLocalOcr(image);
      return NextResponse.json({ success: true, source: 'local', data: ocrResult.data });
    } catch (localError) {
      console.error('Local OCR fallback failed:', localError);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    return NextResponse.json({
      success: true,
      source: 'mock',
      data: {
        shop_name: '7-Eleven สาขา 05432 (Mock)',
        date: '10/03/2026',
        time: '12:45',
        total_amount: '520.00',
        receipt_no: 'INV-99281',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
