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

const storage = getGCSClient();

export async function uploadToGCS(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: string,
  userId?: string
): Promise<{ url: string; publicUrl: string; name: string }> {
  try {
    const bucket = storage.bucket(bucketName);
    const destination = userId ? `receipts/${userId}/${fileName}` : `receipts/unknown/${fileName}`;
    const file = bucket.file(destination);

    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file publicly accessible (if bucket permissions allow)
    try {
      await file.makePublic();
    } catch (permErr) {
      console.warn('Could not make file public (bucket might have uniform bucket-level access enabled). Using default public URL.');
    }

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;

    return {
      url: publicUrl,
      publicUrl,
      name: destination,
    };
  } catch (error) {
    console.error('❌ GCS Upload error:', error);
    throw new Error('Failed to upload file to Google Cloud Storage');
  }
}
