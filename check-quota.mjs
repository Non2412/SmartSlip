import { google } from 'googleapis';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const vars = {};
env.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const key = line.substring(0, idx).trim();
  const val = line.substring(idx + 1).trim().replace(/^"(.*)"$/s, '$1');
  if (key) vars[key] = val;
});

const privateKey = vars.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
console.log('Email:', vars.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('Key present:', !!privateKey, '| starts with:', privateKey?.substring(0, 30));

const auth = new google.auth.JWT({
  email: vars.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

try {
  const res = await drive.about.get({ fields: 'storageQuota,user' });
  const q = res.data.storageQuota;
  const used = (+q.usage / 1024 / 1024).toFixed(1);
  const usedInDrive = (+q.usageInDrive / 1024 / 1024).toFixed(1);
  const limit = q.limit ? (+q.limit / 1024 / 1024 / 1024).toFixed(1) + ' GB' : 'Unlimited';
  console.log('=== Service Account Storage Quota ===');
  console.log('Email    :', res.data.user?.emailAddress);
  console.log('Used     :', used, 'MB');
  console.log('In Drive :', usedInDrive, 'MB');
  console.log('Limit    :', limit);
  const pct = q.limit ? ((+q.usage / +q.limit) * 100).toFixed(1) + '%' : 'N/A';
  console.log('Usage    :', pct);
} catch (e) {
  console.error('Error:', e.message);
}
