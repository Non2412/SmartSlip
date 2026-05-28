import { GoogleGenAI } from "@google/genai";

// ─── SDK Setup ────────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const hasGeminiConfig = Boolean(process.env.GEMINI_API_KEY);

// ─── Category mapping: English → Thai ─────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  Food:          "อาหาร",
  Travel:        "เดินทาง",
  Shopping:      "ช้อปปิ้ง",
  Utilities:     "สาธารณูปโภค",
  Entertainment: "บันเทิง",
  Healthcare:    "อื่นๆ",
  Education:     "อื่นๆ",
  Other:         "อื่นๆ",
};

function mapCategory(raw?: string | null): string {
  if (!raw) return "อื่นๆ";
  // ถ้าเป็นภาษาไทยอยู่แล้ว คืนค่าเดิม
  if (/[ก-๙]/.test(raw)) return raw;
  return CATEGORY_MAP[raw] ?? "อื่นๆ";
}

// ─── MIME type detection from data-URL ────────────────────────────────────────
function detectMimeType(image: string): string {
  const match = image.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
}

// ─── Main OCR function ────────────────────────────────────────────────────────
export async function processGeminiImage(image: string) {
  try {
    const mimeType = detectMimeType(image);
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const prompt = `
คุณคือผู้เชี่ยวชาญการอ่านสลิปธนาคารไทยและใบเสร็จรับเงิน
ภารกิจ: อ่านรูปภาพที่ส่งให้แล้วดึงข้อมูลออกมาเป็น JSON เท่านั้น

โครงสร้าง JSON ที่ต้องการ:
{
  "storeName":     "ชื่อบริษัท ร้านค้า หรือผู้รับเงินที่ปรากฏในใบเสร็จ / สลิป",
  "date":          "วันที่ทำรายการ รูปแบบ YYYY-MM-DD เช่น 2026-04-21",
  "time":          "เวลาทำรายการ รูปแบบ HH:MM เช่น 08:39 (null ถ้าไม่มี)",
  "category":      "หมวดหมู่ภาษาอังกฤษ เลือกจาก: Utilities, Food, Travel, Shopping, Healthcare, Education, Entertainment, Other",
  "paymentMethod": "วิธีชำระเงิน เช่น Mobile Banking, PromptPay, Cash, Credit Card, Debit Card",
  "totalAmount":   ยอดชำระสุทธิทั้งหมด (ตัวเลขเท่านั้น เช่น 533.93),
  "subtotal":      ยอดก่อนหักส่วนลดและ VAT (ตัวเลข หรือ null),
  "discount":      ส่วนลดรวม (ตัวเลข หรือ 0),
  "vat":           ภาษีมูลค่าเพิ่มรวม (ตัวเลข หรือ 0),
  "taxId":         "เลขประจำตัวผู้เสียภาษีของผู้รับเงิน (null ถ้าไม่มี)",
  "receiptNo":     "เลขที่ใบเสร็จหรือเลขอ้างอิงธุรกรรม (null ถ้าไม่มี)",
  "items": [
    {
      "description": "ชื่อสินค้า / บริการ",
      "quantity":    จำนวน (ตัวเลข),
      "unitPrice":   ราคาต่อหน่วย (ตัวเลข),
      "total":       ยอดรวมรายการนั้น (ตัวเลข)
    }
  ]
}

กฎสำคัญ:
1. ตอบเฉพาะ JSON เท่านั้น ห้ามมีข้อความ Markdown หรืออธิบายใดๆ นำหน้าหรือตามหลัง
2. ถ้าหาค่าไม่ได้ให้ใส่ null (ยกเว้น discount/vat ให้ใส่ 0)
3. items ต้องเป็น array เสมอ — ถ้าไม่มีรายการย่อย ให้สร้าง 1 รายการจาก storeName และ totalAmount
4. totalAmount คือยอดที่ลูกค้าจ่ายจริง (หลังหักส่วนลด รวม VAT แล้ว)
5. สำหรับสลิปธนาคาร: storeName คือชื่อผู้รับโอน, paymentMethod คือ PromptPay หรือ Mobile Banking
6. อ่านตัวเลขภาษาไทย (๐-๙) ได้โดยตรง อย่าแปลงเป็น 0
`.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    // Strip possible markdown fences just in case
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    const isQuota =
      error?.status === 429 ||
      String(error?.message ?? "").includes("RESOURCE_EXHAUSTED") ||
      String(error?.message ?? "").includes("429");
    if (isQuota) {
      const e = new Error("quota_exceeded");
      (e as any).status = 429;
      throw e;
    }
    throw error;
  }
}

// ─── Response parser ──────────────────────────────────────────────────────────
export function parseGeminiResponse(geminiResult: any) {
  const d = geminiResult;
  const totalAmount = d.totalAmount ?? d.total_amount ?? 0;
  const amountValue = totalAmount != null ? totalAmount.toString() : "0.00";

  const items =
    Array.isArray(d.items) && d.items.length > 0
      ? d.items
      : [
          {
            description: d.storeName || d.vendor || "",
            quantity: 1,
            unitPrice: parseFloat(amountValue) || 0,
            total: parseFloat(amountValue) || 0,
          },
        ];

  return {
    fullText: JSON.stringify(d),
    data: {
      store:         d.storeName || d.vendor || "",
      date:          d.date || "",
      time:          d.time || "",
      amount:        amountValue,
      total_amount:  amountValue,
      category:      mapCategory(d.category),   // ← English → Thai
      method:        d.paymentMethod || "",
      items,
      discount:      d.discount   ?? 0,
      vat:           d.vat        ?? 0,
      subtotal:      d.subtotal   ?? parseFloat(amountValue) ?? 0,
      taxId:         d.taxId      || "",
      receiptNo:     d.receiptNo  || "",
      raw:           geminiResult,
    },
  };
}