import { google } from 'googleapis';
import { Readable } from 'stream';
import clientPromise from './mongodb';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export async function getGoogleDriveClient(userId?: string, accessToken?: string) {
  // If access token is provided directly, use it
  if (accessToken) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken as string,
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  if (userId) {
    const client = await clientPromise;
    const db = client.db();
    
    // Find the google account for this user
    const account = await db.collection('accounts').findOne({
      userId: userId,
      provider: 'google'
    });

    if (account && account.access_token) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: account.access_token as string,
        refresh_token: account.refresh_token as string,
      });

      // Handle automatic token refresh
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          const client = await clientPromise;
          const db = client.db();
          await db.collection('accounts').updateOne(
            { _id: account._id },
            { $set: { 
              access_token: tokens.access_token,
              expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined
            }}
          );
        }
      });

      return google.drive({ version: 'v3', auth: oauth2Client });
    }
  }

  // Fallback to service account
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Find a folder by name inside a parent folder, or create it if it doesn't exist.
 */
export async function findOrCreateFolder(folderName: string, parentId?: string, userId?: string, accessToken?: string) {
  const drive = await getGoogleDriveClient(userId, accessToken);

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
export async function getUserMonthFolder(userId: string, userName?: string, accessToken?: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. Find or create User Folder (using Name if provided, otherwise ID)
  const userFolderName = userName ? `${userName} (${userId})` : userId;
  let userFolderId: string | undefined;

  try {
    // Note: We try to find/create in the user's drive. 
    // If rootFolderId is provided, we use it as parent (if user has access)
    // For personal drives, often we just want to create it in the root.
    userFolderId = await findOrCreateFolder(userFolderName, rootFolderId || undefined, userId, accessToken);
  } catch (err: unknown) {
    const error = err as { code?: number; status?: number; message?: string };
    // If error, try creating in user's root
    userFolderId = await findOrCreateFolder(userFolderName, undefined, userId, accessToken);
  }

  if (!userFolderId) throw new Error(`Could not find or create folder for user: ${userFolderName}`);

  // 2. Find or create Month-Year Folder inside User Folder
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthYearName = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

  const monthFolderId = await findOrCreateFolder(monthYearName, userFolderId, userId, accessToken);
  if (!monthFolderId) throw new Error(`Could not find or create month folder: ${monthYearName}`);

  return monthFolderId;
}

export async function getFileMetadata(fileId: string, userId?: string) {
  const drive = await getGoogleDriveClient(userId);
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

export async function getFileStream(fileId: string, userId?: string) {
  const drive = await getGoogleDriveClient(userId);
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
export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string, parentFolderId?: string, userId?: string) {
  const drive = await getGoogleDriveClient(userId);
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
  } catch (err: unknown) {
    const error = err as { code?: number; status?: number; message?: string };
    if (folderId && (error.code === 404 || error.status === 404 || error.message?.includes('File not found'))) {
      console.warn('Configured folder inaccessible during upload. Falling back to root directory.');
      fileMetadata.parents = [];
      const retryResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webContentLink, webViewLink',
      });
      return retryResponse.data;
    }
    console.error('Upload Error Details:', error);
    throw new Error(`Failed to upload to Google Drive: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
