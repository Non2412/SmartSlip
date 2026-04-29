/**
 * cleanup-sa-drive.mjs
 * List and delete old Spreadsheet files from Service Account's Drive
 * Usage:
 *   node cleanup-sa-drive.mjs          -- list only (safe)
 *   node cleanup-sa-drive.mjs --delete  -- actually delete
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';

const DRY_RUN = !process.argv.includes('--delete');

const env = readFileSync('.env.local', 'utf8');
const vars = {};
env.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const key = line.substring(0, idx).trim();
  const val = line.substring(idx + 1).trim().replace(/^"(.*)"$/s, '$1');
  if (key) vars[key] = val;
});

const auth = new google.auth.JWT({
  email: vars.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: vars.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

console.log('=== SA Drive Cleanup ===');
console.log('Mode:', DRY_RUN ? 'DRY RUN (list only)' : '*** DELETING ***');
console.log('');

// List all spreadsheets owned by SA
let allFiles = [];
let nextPageToken = undefined;

do {
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'nextPageToken, files(id, name, createdTime, size)',
    pageSize: 100,
    orderBy: 'createdTime',
    pageToken: nextPageToken,
  });
  allFiles = allFiles.concat(res.data.files || []);
  nextPageToken = res.data.nextPageToken;
} while (nextPageToken);

console.log(`Found ${allFiles.length} spreadsheet(s) in SA Drive:\n`);
allFiles.forEach((f, i) => {
  const date = new Date(f.createdTime).toLocaleString('th-TH');
  console.log(`  [${i + 1}] ${f.name}`);
  console.log(`       ID: ${f.id}  |  Created: ${date}`);
});

if (allFiles.length === 0) {
  console.log('Nothing to delete. SA Drive is clean!');
  process.exit(0);
}

console.log('');

if (DRY_RUN) {
  console.log(`To delete all ${allFiles.length} file(s), run:`);
  console.log('  node cleanup-sa-drive.mjs --delete');
} else {
  console.log(`Deleting ${allFiles.length} file(s)...`);
  let deleted = 0;
  for (const f of allFiles) {
    try {
      await drive.files.delete({ fileId: f.id });
      console.log(`  ✅ Deleted: ${f.name} (${f.id})`);
      deleted++;
    } catch (err) {
      console.error(`  ❌ Failed to delete ${f.name}: ${err.message}`);
    }
  }
  console.log(`\nDone. Deleted ${deleted}/${allFiles.length} files.`);

  // Show remaining quota
  const q = (await drive.about.get({ fields: 'storageQuota' })).data.storageQuota;
  const used = (+q.usage / 1024 / 1024).toFixed(2);
  const limit = q.limit ? (+q.limit / 1024 / 1024 / 1024).toFixed(1) + ' GB' : 'Unlimited';
  console.log(`\nQuota after cleanup: ${used} MB used / ${limit}`);
}
