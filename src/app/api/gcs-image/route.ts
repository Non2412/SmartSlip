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

const getFallbackSvg = (title: string, subtitle: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <rect width="400" height="400" fill="#f8fafc"/>
  <rect x="70" y="40" width="260" height="320" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <circle cx="200" cy="120" r="36" fill="#fee2e2"/>
  <path d="M200 105v20M200 135v3" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="110" y="180" width="180" height="10" rx="5" fill="#f1f5f9"/>
  <rect x="110" y="202" width="130" height="10" rx="5" fill="#f1f5f9"/>
  <rect x="110" y="224" width="150" height="10" rx="5" fill="#f1f5f9"/>
  <text x="200" y="280" text-anchor="middle" fill="#334155" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="700">${title}</text>
  <text x="200" y="305" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12">${subtitle}</text>
</svg>
`.trim();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let gcsUrl = searchParams.get('url');

  if (!gcsUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Handle nested or decoded proxy url
  while (gcsUrl.includes('gcs-image?url=')) {
    const parts = gcsUrl.split('gcs-image?url=');
    const lastPart = parts[parts.length - 1].split('&')[0];
    try {
      const decoded = decodeURIComponent(lastPart);
      if (decoded === gcsUrl) break;
      gcsUrl = decoded;
    } catch {
      break;
    }
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
  } catch (error: any) {
    console.error('GCS proxy error:', error?.message || error);

    const isBillingDisabled =
      error?.message?.includes('billing account') ||
      error?.errors?.[0]?.message?.includes('billing account') ||
      error?.code === 403;

    const title = isBillingDisabled ? 'Cloud Storage ปิดให้บริการชั่วคราว' : 'ไม่สามารถโหลดรูปภาพได้';
    const subtitle = isBillingDisabled ? 'รอเปิดใช้งานบัญชี Google Cloud' : 'ไฟล์รูปภาพอาจถูกลบหรือย้าย';

    return new NextResponse(getFallbackSvg(title, subtitle), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Image-Fallback': 'true',
      },
    });
  }
}
