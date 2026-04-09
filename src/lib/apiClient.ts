/**
 * SmartSlip API Client
 * ช่วยจัดการการรับส่งข้อมูลระหว่าง Frontend และ Backend
 */

export interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  userId: string;
  imageFileId?: string;
  createdAt: string;
  updatedAt: string;
  extractedData?: {
    date?: string;
    method?: string;
    receiver?: string;
  };
}

export interface CreateReceiptData {
  storeName: string;
  totalAmount: number;
  userId: string;
  extractedData?: unknown;
  imageFileId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'super-secret-api-key-12345';

/**
 * ฟังก์ชันหลักสำหรับการเรียกใข้ API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    if (API_KEY) {
      headers.set('x-api-key', API_KEY);
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
      };
    }

    return {
      success: true,
      data: result.data || result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

/**
 * ฟังก์ชันการทำงานพื้นฐานของใบเสร็จ (Helper functions)
 */
export const receiptApi = {
  // ดึงรายการใบเสร็จ
  getAll: (userId: string) => apiRequest<Receipt[]>(`/receipts?userId=${userId}`),

  // เพิ่มใบเสร็จใหม่
  create: (data: CreateReceiptData) => apiRequest<Receipt>('/receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // ประมวลผล OCR และอัปโหลดขึ้น Drive
  extract: (imageBase64: string, userId?: string) => apiRequest<unknown>('/receipts/extract', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, userId }),
  }),
};
