import { NextRequest, NextResponse } from 'next/server';
import { getFileStream, getFileMetadata } from '@/lib/googledrive';
import { EventEmitter } from 'events';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get metadata to know the mime type
    const metadata = await getFileMetadata(fileId);
    const mimeType = metadata.mimeType || 'application/octet-stream';

    // Get the file stream from Google Drive
    const stream = await getFileStream(fileId);

    // Convert Node.js readable stream to Web Stream for Next.js response
    const webStream = new ReadableStream({
      start(controller) {
        const emitter = stream as unknown as EventEmitter;
        emitter.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        emitter.on('end', () => {
          controller.close();
        });
        emitter.on('error', (err: Error) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Content-Disposition': `inline; filename="${metadata.name}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching image from Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image', details: errorMessage },
      { status: 500 }
    );
  }
}
