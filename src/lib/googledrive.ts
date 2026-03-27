import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export async function getGoogleDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Find a folder by name inside a parent folder, or create it if it doesn't exist.
 */
export async function findOrCreateFolder(folderName: string, parentId?: string) {
  const drive = await getGoogleDriveClient();

  // Search for the folder
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' ${parentId ? `and '${parentId}' in parents` : ''} and trashed = false`;

  try {
    const listResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (listResponse.data.files && listResponse.data.files.length > 0) {
      // Folder exists
      return listResponse.data.files[0].id || undefined;
    }

    // Create folder if it doesn't exist
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId as string] : [],
      },
      fields: 'id',
    });

    return createResponse.data.id || undefined;
  } catch (error) {
    console.error(`Error in findOrCreateFolder (${folderName}):`, error);
    throw error;
  }
}

/**
 * Get a specific folder for a user, organized by Month/Year.
 * Structure: Root -> User Folder -> Month-Year Folder
 * @returns The ID of the Month-Year folder
 */
export async function getUserMonthFolder(userId: string, userName?: string) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined');

  // 1. Find or create User Folder (using Name if provided, otherwise ID)
  const userFolderName = userName ? `${userName} (${userId})` : userId;
  const userFolderId = await findOrCreateFolder(userFolderName, rootFolderId);

  // 2. Find or create Month-Year Folder inside User Folder
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthYearName = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

  const monthFolderId = await findOrCreateFolder(monthYearName, userFolderId);

  return monthFolderId;
}

export async function getFileMetadata(fileId: string) {
  const drive = await getGoogleDriveClient();
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, webContentLink, thumbnailLink, size, webViewLink',
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
 * @param parentFolderId - Optional folder ID to upload to
 * @returns Metadata of the uploaded file
 */
export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string, parentFolderId?: string) {
  const drive = await getGoogleDriveClient();
  const folderId = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

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
