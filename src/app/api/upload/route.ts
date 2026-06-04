import { NextResponse } from 'next/server';
import { uploadToGCS } from '@/lib/gcs';

/**
 * POST /api/upload
 * Accepts a base64 encoded image string and saves it to Google Cloud Storage
 * Returns the GCS public URL path
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, fileName, userId } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Missing imageBase64 in request body' },
        { status: 400 }
      );
    }

    let mimeType = 'image/jpeg';
    let extension = 'jpg';

    // Handle data URI format (e.g., data:image/jpeg;base64,...)
    let base64Data = imageBase64;
    if (imageBase64.includes('data:')) {
      const matches = imageBase64.match(/data:image\/(\w+);base64,(.*)/);
      if (matches) {
        extension = matches[1] === 'jpg' ? 'jpg' : matches[1];
        mimeType = `image/${extension}`;
        base64Data = matches[2];
      }
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const finalFileName = fileName || `receipt-${timestamp}-${randomStr}.${extension}`;

    // Upload to Google Cloud Storage
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'smartslip-receipts';
    const uploadResult = await uploadToGCS(
      imageBuffer,
      finalFileName,
      mimeType,
      bucketName,
      userId
    );

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: uploadResult.publicUrl,
        fileName: finalFileName,
        mimeType
      }
    });
  } catch (error: any) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

