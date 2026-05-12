import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeDate, normalizeAmount } from '@/lib/ocr-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const hasGeminiConfig = Boolean(process.env.GEMINI_API_KEY);

export async function processGeminiImage(image: string) {
  try {
    // บังคับให้ใช้ API เวอร์ชัน v1 แทน v1beta เพื่อเลี่ยง Error 404
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      },
      { apiVersion: 'v1' }
    );

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const prompt = `
      คุณคือผู้เชี่ยวชาญการอ่านสลิปธนาคารไทยและใบเสร็จไทย
      ภารกิจ: อ่านรูปภาพที่ส่งให้แล้วดึงข้อมูลออกมาเป็น JSON เท่านั้น
      โครงสร้าง JSON ที่ต้องการ:
      {
        "date": "วันที่ทำรายการ (รูปแบบ YYYY-MM-DD เช่น 2026-04-21)",
        "vendor": "ชื่อบริษัทหรือผู้รับเงินจากสลิป เช่น 'บริษัท ทรู อินเทอร์เน็ต' หรือ 'TrueMoney'",
        "totalAmount": "ยอดชำระทั้งหมด (ตัวเลขเท่านั้น เช่น 533.93)"
      }
      เงื่อนไข:
      - ตอบเฉพาะ JSON เท่านั้น ห้ามมีข้อความอื่น
      - ถ้าหาไม่เจอให้ใส่ null
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}

export function parseGeminiResponse(geminiResult: any) {
  // geminiResult is already the parsed JSON object: {date, vendor, totalAmount}
  const data = geminiResult;
  const normalizedDate = data.date ? normalizeDate(data.date.toString()) : '';
  const amountValue = data.totalAmount != null ? normalizeAmount(data.totalAmount.toString()) : '0.00';

  return {
    fullText: JSON.stringify(data),
    data: {
      store: data.vendor || 'ไม่พบชื่อร้าน',
      date: normalizedDate,
      amount: amountValue,
      total_amount: amountValue,
      method: 'โอนเงิน',
      receiver: '',
      receipt_no: '',
      raw: geminiResult,
    },
  };
}
