import { NextResponse } from 'next/server';

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
    const { image, userId } = await getRequestPayload(request);
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image base64/data URI to buffer and blob for forwarding
    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.includes('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    // Build FormData to forward to backend API
    const formData = new FormData();
    formData.append('image', blob, 'receipt.jpg');
    if (userId) {
      formData.append('userId', userId);
    }

    const backendUrl = `${process.env.BACKEND_API_URL || 'https://smart-slip-api.vercel.app'}/api/receipts/extract`;
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'super-secret-api-key-12345';

    console.log('Forwarding extraction request to backend API:', backendUrl);
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      console.error('Backend extraction failed:', errorText);
      return NextResponse.json(
        { success: false, error: `Backend API error: ${backendRes.statusText}` },
        { status: backendRes.status }
      );
    }

    const result = await backendRes.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('OCR Extraction Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'OCR extraction failed' },
      { status: 500 }
    );
  }
}
