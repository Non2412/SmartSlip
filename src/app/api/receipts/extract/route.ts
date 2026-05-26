import { NextResponse } from 'next/server';
import { processGeminiImage, parseGeminiResponse } from '@/lib/gemini-ocr';

async function getRequestPayload(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const imageField = formData.get('image');
    const userId = (formData.get('userId') as string) || '';
    let image: string | null = null;

    if (typeof imageField === 'string') {
      image = imageField;
    } else if (imageField instanceof Blob) {
      const buffer = Buffer.from(await imageField.arrayBuffer());
      image = `data:${imageField.type || 'image/jpeg'};base64,` + buffer.toString('base64');
    }

    return { image, userId };
  }

  const body = await request.json();
  return {
    image: body.image as string | undefined,
    userId: body.userId as string | undefined,
  };
}

export async function POST(request: Request) {
  try {
    const { image } = await getRequestPayload(request);
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    const geminiResult = await processGeminiImage(image);
    const parsed = parseGeminiResponse(geminiResult);

    return NextResponse.json({
      success: true,
      data: {
        store: parsed.data.store || '',
        amount: parseFloat(parsed.data.amount) || 0,
        date: parsed.data.date || '',
        method: parsed.data.method || '',
        receiver: parsed.data.receiver || '',
        receipt_no: parsed.data.receipt_no || '',
      },
    });
  } catch (error: any) {
    console.error('Gemini OCR Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'OCR extraction failed' },
      { status: 500 }
    );
  }
}