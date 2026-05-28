import { NextResponse } from 'next/server';
import { processGeminiImage, parseGeminiResponse } from '@/lib/gemini-ocr';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let base64DataUrl: string;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64DataUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
    } else {
      const body = await request.json();
      const { image } = body;
      if (!image) {
        return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
      }
      base64DataUrl = image;
    }

    const geminiResult = await processGeminiImage(base64DataUrl);
    const parsed = parseGeminiResponse(geminiResult);

    return NextResponse.json({ success: true, data: parsed.data });
  } catch (error: any) {
    console.error('Gemini OCR Error:', error);
    if (error?.status === 429 || error?.message === 'quota_exceeded') {
      return NextResponse.json({ success: false, error: 'quota_exceeded' }, { status: 429 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'OCR extraction failed' },
      { status: 500 }
    );
  }
}