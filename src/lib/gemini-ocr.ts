import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeDate, normalizeAmount } from '@/lib/ocr-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const hasGeminiConfig = Boolean(process.env.GEMINI_API_KEY);

export async function processGeminiImage(image: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const prompt = `
      เธเธธเธ“เธเธทเธญเธเธนเนเน€เธเธตเนเธขเธงเธเธฒเธเธเธฒเธฃเธญเนเธฒเธเธชเธฅเธดเธเธเธเธฒเธเธฒเธฃเนเธ—เธขเนเธฅเธฐเนเธเน€เธชเธฃเนเธเนเธ—เธข
      เธ เธฒเธฃเธเธดเธ: เธญเนเธฒเธเธฃเธนเธเธ เธฒเธเธ—เธตเนเธชเนเธเนเธซเนเนเธฅเนเธงเธ”เธถเธเธเนเธญเธกเธนเธฅเธญเธญเธเธกเธฒเน€เธเนเธ JSON เน€เธ—เนเธฒเธเธฑเนเธ
      เนเธเธฃเธเธชเธฃเนเธฒเธ JSON เธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ:
      {
        "date": "เธงเธฑเธเธ—เธตเนเธ—เธณเธฃเธฒเธขเธเธฒเธฃ (เธฃเธนเธเนเธเธ YYYY-MM-DD เน€เธเนเธ 2026-04-21)",
        "vendor": "เธเธทเนเธญเธเธฃเธดเธฉเธฑเธ—เธซเธฃเธทเธญเธเธนเนเธฃเธฑเธเน€เธเธดเธเธเธฒเธเธชเธฅเธดเธ เน€เธเนเธ 'เธเธฃเธดเธฉเธฑเธ— เธ—เธฃเธน เธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ•' เธซเธฃเธทเธญ 'TrueMoney'",
        "totalAmount": "เธขเธญเธ”เธเธณเธฃเธฐเธ—เธฑเนเธเธซเธกเธ” (เธ•เธฑเธงเน€เธฅเธเน€เธ—เนเธฒเธเธฑเนเธ เน€เธเนเธ 533.93)"
      }
      เน€เธเธทเนเธญเธเนเธ:
      - เธ•เธญเธเน€เธเธเธฒเธฐ JSON เน€เธ—เนเธฒเธเธฑเนเธ เธซเนเธฒเธกเธกเธตเธเนเธญเธเธงเธฒเธกเธญเธทเนเธ
      - เธ–เนเธฒเธซเธฒเนเธกเนเน€เธเธญเนเธซเนเนเธชเน null
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}

export function parseGeminiResponse(geminiResult: any) {
  // geminiResult is already the parsed JSON object: {date, vendor, totalAmount}
  const data = geminiResult;
  const amountValue = data.totalAmount != null ? data.totalAmount.toString() : '0.00';

  return {
    fullText: JSON.stringify(data),
    data: {
      // เธซเธเนเธฒเธเธญเธฃเนเธกเธเธญเธเธเธธเธ“เธฃเธญเธฃเธฑเธเธเธณเธงเนเธฒ 'store'
      store: data.vendor || 'เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเนเธฒ',
      // เธซเธเนเธฒเธเธญเธฃเนเธกเธฃเธญเธฃเธฑเธ 'date'
      date: data.date || '',
      // เธซเธเนเธฒเธเธญเธฃเนเธกเธฃเธญเธฃเธฑเธ 'amount'
      amount: amountValue,
      total_amount: amountValue,
      // เธเนเธญเธเธ—เธตเนเน€เธซเธฅเธทเธญเธเธฅเนเธญเธขเธงเนเธฒเธเนเธงเนเธ•เธฒเธกเธ—เธตเนเธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธเธฃเธญเธเน€เธญเธ
      method: '',
      receiver: '',
      receipt_no: '',
      raw: geminiResult,
    },
  };
}


