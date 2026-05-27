import { GoogleGenerativeAI } from "@google/generative-ai";

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
      คุณคือผู้เชี่ยวชาญการอ่านสลิปธนาคารไทยและใบเสร็จรับเงิน
      ภาระกิจ: อ่านรูปภาพที่ส่งให้แล้วดึงข้อมูลออกมาเป็น JSON เท่านั้น
      โครงสร้าง JSON ที่ต้องการ:
      {
        "date": "วันที่ทำรายการ (รูปแบบ YYYY-MM-DD เช่น 2026-04-21)",
        "time": "เวลาทำรายการ (รูปแบบ HH:MM เช่น 08:39)",
        "vendor": "ชื่อบริษัทหรือผู้รับเงินจากสลิป",
        "category": "หมวดหมู่ภาษาอังกฤษ เลือกจาก: Utilities, Food, Travel, Shopping, Healthcare, Education, Entertainment, Other",
        "totalAmount": ยอดชำระทั้งหมด (ตัวเลขเท่านั้น เช่น 533.93),
        "paymentMethod": "วิธีชำระเงิน เช่น Mobile Banking, PromptPay, Cash, Credit Card",
        "items": [
          {"description": "ชื่อสินค้า/บริการ", "quantity": 1, "unitPrice": ราคาต่อหน่วย, "total": ยอดรวมรายการ}
        ],
        "discount": ส่วนลด (0 ถ้าไม่มี),
        "vat": ภาษีมูลค่าเพิ่ม (0 ถ้าไม่มี),
        "subtotal": ยอดก่อน VAT และส่วนลด
      }
      กฎ:
      - ตอบเฉพาะ JSON เท่านั้น ห้ามมีข้อความอื่น
      - ถ้าหาไม่เจอให้ใส่ null
      - items ต้องเป็น array เสมอ ถ้าไม่มีรายการให้สร้างจาก vendor และ totalAmount
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
  const data = geminiResult;
  const amountValue = data.totalAmount != null ? data.totalAmount.toString() : '0.00';

  const items = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [{ description: data.vendor || '', quantity: 1, unitPrice: parseFloat(amountValue) || 0, total: parseFloat(amountValue) || 0 }];

  return {
    fullText: JSON.stringify(data),
    data: {
      store: data.vendor || '',
      date: data.date || '',
      time: data.time || '',
      amount: amountValue,
      total_amount: amountValue,
      category: data.category || 'Other',
      method: data.paymentMethod || '',
      items,
      discount: data.discount ?? 0,
      vat: data.vat ?? 0,
      subtotal: data.subtotal ?? parseFloat(amountValue) ?? 0,
      receiver: '',
      receipt_no: '',
      raw: geminiResult,
    },
  };
}