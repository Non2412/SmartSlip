import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export async function getGoogleDriveClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    SCOPES
  );

  return google.drive({ version: 'v3', auth });
}

export async function getFileMetadata(fileId: string) {
  const drive = await getGoogleDriveClient();
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, webContentLink, thumbnailLink, size',
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    throw error;
  }
}

export async function getFileStream(fileId: string) {
  const drive = await getGoogleDriveClient();
  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching file stream:', error);
    throw error;
  }
}

/**
 * Upload a file to Google Drive
 * @param buffer - File content as Buffer
 * @param fileName - Name of the file in Drive
 * @param mimeType - MIME type of the file
 * @returns Metadata of the uploaded file
 */
export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string) {
  const drive = await getGoogleDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(buffer),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webContentLink, webViewLink',
    });
    return response.data;
  } catch (error) {
    console.error('Upload Error Details:', error);
    throw new Error(`Failed to upload to Google Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
