import { google } from 'googleapis';
import { getBase64AndMimeType, normalizeDate, normalizeAmount } from '@/lib/ocr-utils';

const DOCUMENT_AI_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = process.env.GOOGLE_DOCUMENT_AI_LOCATION || process.env.GOOGLE_LOCATION || 'us';
const PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

export const hasDocumentAiConfig = Boolean(PROJECT_ID && PROCESSOR_ID);

function extractEntityValue(entity: any) {
  if (!entity) return '';
  return (
    entity.normalizedValue?.text ||
    entity.mentionText ||
    entity.textAnchor?.content ||
    ''
  ).toString().trim();
}

function findEntity(entities: any[], predicate: (type: string, text: string) => boolean) {
  return entities.find((entity) => {
    const type = (entity.type || '').toString().toLowerCase();
    const text = extractEntityValue(entity).toLowerCase();
    return predicate(type, text);
  });
}

export async function processDocumentAiImage(image: string) {
  if (!PROJECT_ID || !PROCESSOR_ID) {
    throw new Error('Missing Document AI configuration. Set GOOGLE_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID.');
  }

  const { base64, mimeType } = getBase64AndMimeType(image);

  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceEmail || !serviceKey) {
    throw new Error('Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: serviceKey,
    scopes: [DOCUMENT_AI_SCOPE],
  });

  const tokenResponse = await auth.getAccessToken();
  const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!accessToken) {
    throw new Error('Could not obtain access token for Google Document AI.');
  }

  const endpoint = `https://documentai.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}:process`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      skipHumanReview: true,
      rawDocument: {
        content: base64,
        mimeType,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Document AI error: ${response.status} ${response.statusText} - ${body}`);
  }

  return await response.json();
}

export function parseReceiptDocument(documentAiResult: any) {
  const document = documentAiResult?.document || {};
  const text = document.text || '';
  const entities = Array.isArray(document.entities) ? document.entities : [];

  const rawText = text.trim();
  const lines = rawText.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
  const fullText = rawText;

  let store = lines[0] || 'Unknown Store';
  let date = '';
  let totalAmount = '';
  let receiptNo = '';
  let method = '';
  let receiver = '';

  const storeEntity = findEntity(entities, (type, value) => /vendor|merchant|seller|supplier|store|merchant_name|organization/.test(type) || /ร้าน|สาขา|ห้าง|บริษัท|ร้านค้า/.test(value));
  if (storeEntity) {
    store = extractEntityValue(storeEntity) || store;
  }

  const dateEntity = findEntity(entities, (type, value) => /date|invoice_date|transaction_date|due_date/.test(type) || /วันที่/.test(value));
  if (dateEntity) {
    date = normalizeDate(extractEntityValue(dateEntity));
  }

  const amountEntity = findEntity(entities, (type, value) => /total|amount|net_amount|grand_total|invoice_total|due_amount/.test(type) || /ยอดรวม|รวมสุทธิ|รวมทั้งหมด/.test(value));
  if (amountEntity) {
    totalAmount = normalizeAmount(extractEntityValue(amountEntity));
  }

  const receiptEntity = findEntity(entities, (type, value) => /invoice_number|receipt_number|receipt_no|transaction_number|document_number/.test(type) || /เลขที่|ใบเสร็จ|เลขที่ใบเสร็จ|inv|bill|transaction/.test(value));
  if (receiptEntity) {
    receiptNo = extractEntityValue(receiptEntity);
  }

  const methodEntity = findEntity(entities, (type, value) => /payment|payment_method|payment_type|method/.test(type) || /cash|cashier|transfer|promptpay|credit|debit|เงินสด|โอน|บัตร/.test(value));
  if (methodEntity) {
    method = extractEntityValue(methodEntity);
  }

  const receiverEntity = findEntity(entities, (type, value) => /receiver|payee|customer|recipient/.test(type) || /ผู้รับ|ผู้ซื้อ|ชื่อลูกค้า/.test(value));
  if (receiverEntity) {
    receiver = extractEntityValue(receiverEntity);
  }

  const fallbackText = rawText.toLowerCase();

  if (!date) {
    const dateMatch = fallbackText.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/) || fallbackText.match(/(\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/);
    if (dateMatch) date = normalizeDate(dateMatch[1]);
  }

  if (!totalAmount) {
    const amountMatch = fallbackText.match(/(?:ยอดรวม|รวมสุทธิ|รวมทั้งหมด|total|amount|grand total|net amount)\s*[:\-]?\s*([0-9\.,]+)/i)
      || fallbackText.match(/([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2}))/);
    if (amountMatch) totalAmount = normalizeAmount(amountMatch[1]);
  }

  if (!receiptNo) {
    const receiptMatch = fallbackText.match(/(?:เลขที่|ใบเสร็จ|inv(?:oice)?\s*#?|bill\s*#?|transaction\s*#?)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i);
    if (receiptMatch) receiptNo = receiptMatch[1];
  }

  if (!method) {
    const methodMatch = fallbackText.match(/(เงินสด|cash|โอน(?:เงิน)?|transfer|promptpay|prompt pay|credit|debit)/i);
    if (methodMatch) method = methodMatch[1];
  }

  if (!receiver) {
    const receiverMatch = fallbackText.match(/(?:ผู้รับ|receiver|payee|recipient)\s*[:\-]?\s*([\p{L}0-9\s]+)/ui);
    if (receiverMatch) receiver = receiverMatch[1].trim();
  }

  if (!store && lines.length > 0) {
    store = lines[0];
  }

  return {
    fullText,
    data: {
      store: store || 'Unknown Store',
      date: date || '',
      total_amount: totalAmount || '',
      amount: totalAmount || '',
      method: method || '',
      receiver: receiver || '',
      receipt_no: receiptNo || '',
      raw: documentAiResult,
    },
  };
}
