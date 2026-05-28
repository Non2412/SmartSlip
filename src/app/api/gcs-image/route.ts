import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const getGCSClient = () => {
  return new Storage({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcsUrl = searchParams.get('url');

  if (!gcsUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Parse: https://storage.googleapis.com/BUCKET/PATH
  const match = gcsUrl.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid GCS URL' }, { status: 400 });
  }

  const [, bucketName, objectPath] = match;

  try {
    const storage = getGCSClient();
    const file = storage.bucket(bucketName).file(objectPath);

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': (metadata.contentType as string) || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('GCS proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
