import { google } from 'googleapis';

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  // Log credential info for debugging (without exposing the key)
  console.log('🔑 Sheets auth - email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, 'key present:', !!process.env.GOOGLE_PRIVATE_KEY);
  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

/**
 * Create a new Google Spreadsheet for a user.
 * Uses the user's own Google OAuth access token so the file is owned by the user
 * (counts against user's Drive quota, not the Service Account's 0-byte quota).
 * Falls back to Service Account only if no user token is provided.
 */
export async function createUserSpreadsheet(
  userId: string,
  userName?: string,
  folderId?: string,
  userAccessToken?: string
): Promise<{ spreadsheetId: string; url: string }> {
  const title = userName ? `SmartSlip - ${userName}` : `SmartSlip - ${userId}`;

  // Use user's OAuth token if available (avoids SA 0-byte quota limit)
  let drive: ReturnType<typeof google.drive>;
  let sheets: ReturnType<typeof google.sheets>;
  if (userAccessToken) {
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: userAccessToken });
    drive = google.drive({ version: 'v3', auth: oauth2 });
    sheets = google.sheets({ version: 'v4', auth: oauth2 });
    console.log('📊 Creating Spreadsheet with USER token for:', userId);
  } else {
    const client = getSheetsClient();
    drive = client.drive;
    sheets = client.sheets;
    console.log('📊 Creating Spreadsheet with SA token for:', userId, '(no user token provided)');
  }

  // Step 1: Create spreadsheet file via Drive API
  // The folder is owned by the Service Account, so:
  // - SA token: try with parent folder, fallback to no parent on permission error
  // - User token: create in user's root first (SA-owned folder rejects user writes),
  //   then try to move via SA. If move fails, sheet stays in root (still usable).
  let file;
  if (folderId && userAccessToken) {
    // User token path: create in root first (avoids SA-folder permission error)
    file = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
      fields: 'id',
    });
    const spreadsheetIdTemp = file.data.id!;
    console.log('✅ Spreadsheet created in user root:', spreadsheetIdTemp);
    // Try to move into the SA-owned folder using the Service Account
    try {
      const saAuth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      const saDrive = google.drive({ version: 'v3', auth: saAuth });
      // SA needs to move the file: add parent then remove 'root'
      const currentParents = await drive.files.get({ fileId: spreadsheetIdTemp, fields: 'parents' });
      const prevParents = (currentParents.data.parents || []).join(',');
      await saDrive.files.update({
        fileId: spreadsheetIdTemp,
        addParents: folderId,
        removeParents: prevParents || undefined,
        requestBody: {},
        fields: 'id, parents',
      });
      console.log('✅ Spreadsheet moved into SA folder:', folderId);
    } catch (moveErr: any) {
      console.warn('⚠️ Could not move spreadsheet into folder (sheet stays in root):', moveErr?.message);
    }
  } else if (folderId && !userAccessToken) {
    try {
      file = await drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId],
        },
        fields: 'id',
      });
      console.log('✅ Spreadsheet created inside folder:', folderId);
    } catch (parentErr: any) {
      console.warn('⚠️ Cannot create sheet in folder (no SA write access), creating without parent:', parentErr?.message);
      file = await drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.spreadsheet',
        },
        fields: 'id',
      });
    }
  } else {
    file = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
      fields: 'id',
    });
  }

  const spreadsheetId = file.data.id!;
  console.log('✅ Spreadsheet created:', spreadsheetId);

  // Step 2: Add headers (optional)
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['วันที่', 'ร้านค้า/ผู้รับเงิน', 'ผู้จ่าย', 'จำนวนเงิน (THB)', 'สถานะ', 'ความแม่นยำ AI', 'Receipt ID', 'ลิงก์รูปภาพ']],
      },
    });
    console.log('✅ Headers added to spreadsheet');
  } catch (headerErr: any) {
    console.warn('⚠️ Could not add headers (non-critical):', headerErr?.message);
  }

  // Step 3: Share with "Anyone with link" (reader) + share SA as writer so it can append rows
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    console.log('✅ Spreadsheet shared with Anyone with link');
  } catch (shareErr: any) {
    console.warn('⚠️ Could not share spreadsheet (non-critical):', shareErr?.message);
  }

  // Share with Service Account(s) as writer (so SA can append receipt rows from LINE webhook)
  if (userAccessToken) {
    const saEmails = [
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      process.env.BACKEND_SA_EMAIL,
    ].filter(Boolean) as string[];

    for (const email of saEmails) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: { role: 'writer', type: 'user', emailAddress: email },
        });
        console.log('✅ Spreadsheet shared with SA as writer:', email);
      } catch (saShareErr: any) {
        console.warn('⚠️ Could not share spreadsheet with SA (non-critical):', email, saShareErr?.message);
      }
    }
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Append a receipt row to a user's Google Spreadsheet
 */
export async function appendReceiptToUserSheet(
  spreadsheetId: string,
  receipt: {
    date: string;
    storeName: string;
    sender?: string;
    amount: number;
    status?: string;
    confidence?: string;
    receiptId?: string;
    imageUrl?: string;
  },
  userAccessToken?: string
): Promise<void> {
  // ใช้ user token ถ้ามี (SA อาจไม่มีสิทธิ์เขียน Sheet ของ user)
  let sheets: ReturnType<typeof google.sheets>;
  if (userAccessToken) {
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: userAccessToken });
    sheets = google.sheets({ version: 'v4', auth: oauth2 });
  } else {
    sheets = getSheetsClient().sheets;
  }

  // Auto-detect tab name (รองรับ "Sheet1", "Sheet 1", "ชีต1" ฯลฯ)
  let tabName = 'Sheet1';
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
    tabName = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';
  } catch {}

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          receipt.date,
          receipt.storeName,
          receipt.sender || '',
          receipt.amount,
          receipt.status || 'pending',
          receipt.confidence || '',
          receipt.receiptId || '',
          receipt.imageUrl || '',
        ],
      ],
    },
  });
}
