/**
 * SmartSlip API Client
 * ช่วยจัดการการรับส่งข้อมูลระหว่าง Frontend และ Backend
 */

export interface Receipt {
  _id?: string;
  id?: string;
  storeName: string;
  amount?: number;
  totalAmount?: number;
  userId: string;
  imageFileId?: string;
  imageURL?: string;
  imageUrl?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  transactionId?: string;
  extractedData?: {
    date?: string;
    time?: string;
    method?: string;
    paymentMethod?: string;
    receiver?: string;
    sender?: string;
    payee?: string;
    category?: string;
    notes?: string;
    receiptNo?: string;
    vendorTaxId?: string;
    vendorAddress?: string;
    currency?: string;
    imageData?: string;
    items?: unknown;
    summary?: unknown;
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
  getAll: (userId: string, lineUserId?: string) =>
    apiRequest<Receipt[]>(`/receipts?userId=${userId}${lineUserId ? `&lineUserId=${encodeURIComponent(lineUserId)}` : ''}`),

  // เพิ่มใบเสร็จใหม่
  create: (data: CreateReceiptData) => apiRequest<Receipt>('/receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: Partial<Receipt>) => {
    const isVercel = API_BASE_URL.includes('smart-slip-api.vercel.app');
    if (isVercel) {
      return apiRequest<Receipt>(`/receipts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
    return apiRequest<Receipt>(`/receipts?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ลบใบเสร็จ
  delete: (id: string) => {
    const isVercel = API_BASE_URL.includes('smart-slip-api.vercel.app');
    if (isVercel) {
      return apiRequest(`/receipts/${id}`, { method: 'DELETE' });
    }
    return apiRequest(`/receipts?id=${id}`, { method: 'DELETE' });
  },

  // ประมวลผล OCR และอัปโหลดขึ้น Drive
  extract: (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);

    return fetch(`${API_BASE_URL}/receipts/extract`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
      body: formData,
    })
      .then(async (response) => {
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
      })
      .catch((error: unknown) => {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown network error',
        };
      });
  },
};

/**
 * ทำความสะอาดลิงก์รูปภาพและตรวจสอบการส่งต่อรูปผ่าน GCS Proxy
 */
export const cleanAndProxyImageUrl = (url?: string): string => {
  if (!url) return '';
  
  let targetUrl = url;
  
  // 1. ตรวจสอบว่าในลิงก์มี query parameter ของ GCS proxy อยู่แล้วหรือไม่ ถ้ามีให้แกะ GCS URL จริงออกมา
  if (url.includes('gcs-image?url=')) {
    try {
      const parts = url.split('gcs-image?url=');
      const encodedPart = parts[1];
      if (encodedPart) {
        // หากมีเครื่องหมาย & ให้แยกออกเพื่อเอาเฉพาะ URL ของรูปภาพ
        const cleanEncodedPart = encodedPart.split('&')[0];
        const decoded = decodeURIComponent(cleanEncodedPart);
        if (decoded.startsWith('http')) {
          targetUrl = decoded;
        }
      }
    } catch (e) {
      console.error('Failed to parse gcs-image url:', e);
    }
  }
  
  // 2. หากชี้ไปยัง Google Cloud Storage ให้สวมผ่าน Endpoint Proxy
  if (targetUrl.includes('storage.googleapis.com')) {
    return '/api/gcs-image?url=' + encodeURIComponent(targetUrl);
  }
  
  // 3. ป้องกันการแสดงลิงก์ localhost บนโดเมนจริง
  if (targetUrl.startsWith('http://localhost') || targetUrl.startsWith('https://localhost')) {
    try {
      const urlObj = new URL(targetUrl);
      return urlObj.pathname + urlObj.search;
    } catch {
      // ignore
    }
  }
  
  return targetUrl;
};

