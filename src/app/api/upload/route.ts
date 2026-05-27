import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/upload
 * Accepts a base64 encoded image string and saves it to public/uploads directory
 * Returns the URL path (e.g., /uploads/receipt-{timestamp}.jpg)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, fileName } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Missing imageBase64 in request body' },
        { status: 400 }
      );
    }

    // Decode base64 to buffer
    let imageBuffer: Buffer;
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

    imageBuffer = Buffer.from(base64Data, 'base64');

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const finalFileName = fileName || `receipt-${timestamp}-${randomStr}.${extension}`;
    const filePath = join(uploadsDir, finalFileName);

    // Write file to disk
    await writeFile(filePath, imageBuffer);

    // Return the URL path
    const imageUrl = `/uploads/${finalFileName}`;

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
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
