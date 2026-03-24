/**
 * API Client for SmartSlip_API
 * Handles all communication with the backend receipt API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

interface ReceiptData {
  amount: number;
  sender?: string;
  receiver: string;
  date: string;
  confidence?: 'high' | 'medium' | 'low';
  method?: string;
}

interface Receipt {
  id: string;
  userId: string;
  storeName: string;
  totalAmount: number;
  imageUrl?: string;
  extractedData?: ReceiptData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Make an API request with authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error ||`API Error: ${response.status}`,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data || data,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Request Error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create a new receipt
 */
export async function createReceipt(
  storeName: string,
  totalAmount: number,
  userId: string
): Promise<ApiResponse<Receipt>> {
  return apiRequest<Receipt>('/api/receipts', {
    method: 'POST',
    body: JSON.stringify({
      storeName,
      totalAmount,
      userId,
    }),
  });
}

/**
 * Extract receipt data from an image
 */
export async function extractReceiptFromImage(
  file: File,
  userId: string = 'user123'
): Promise<ApiResponse<ReceiptData>> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('userId', userId);

  try {
    const response = await fetch(`${API_BASE_URL}/api/receipts/extract`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `API Error: ${response.status}`,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data || data,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Extract Receipt Error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get all receipts for a user
 */
export async function getReceipts(userId?: string): Promise<ApiResponse<Receipt[]>> {
  let endpoint = '/api/receipts';
  if (userId) {
    endpoint += `?userId=${encodeURIComponent(userId)}`;
  }
  return apiRequest<Receipt[]>(endpoint, {
    method: 'GET',
  });
}

/**
 * Get a single receipt by ID
 */
export async function getReceiptById(id: string): Promise<ApiResponse<Receipt>> {
  return apiRequest<Receipt>(`/api/receipts/${id}`, {
    method: 'GET',
  });
}

/**
 * Update a receipt
 */
export async function updateReceipt(
  id: string,
  updates: Partial<Receipt>
): Promise<ApiResponse<Receipt>> {
  return apiRequest<Receipt>(`/api/receipts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/receipts/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type { Receipt, ReceiptData, ApiResponse };
