'use client';

import { useState, useCallback } from 'react';
import {
  getReceipts,
  createReceipt,
  extractReceiptFromImage,
  deleteReceipt,
  type Receipt,
  type ReceiptData,
  type ApiResponse,
} from '@/lib/apiClient';

interface UseReceiptsReturn {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  fetchReceipts: (userId?: string) => Promise<void>;
  uploadReceipt: (storeName: string, amount: number, userId: string) => Promise<Receipt | null>;
  extractFromImage: (file: File) => Promise<ReceiptData | null>;
  removeReceipt: (id: string) => Promise<boolean>;
}

export function useReceipts(): UseReceiptsReturn {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReceipts(userId);
      if (response.success && response.data) {
        setReceipts(response.data);
      } else {
        setError(response.error || 'Failed to fetch receipts');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadReceipt = useCallback(async (
    storeName: string,
    amount: number,
    userId: string
  ): Promise<Receipt | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await createReceipt(storeName, amount, userId);
      if (response.success && response.data) {
        setReceipts((prev) => [...prev, response.data!]);
        return response.data;
      } else {
        setError(response.error || 'Failed to upload receipt');
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const extractFromImage = useCallback(async (file: File): Promise<ReceiptData | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await extractReceiptFromImage(file);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to extract receipt data');
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeReceipt = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await deleteReceipt(id);
      if (response.success) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
        return true;
      } else {
        setError(response.error || 'Failed to delete receipt');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    receipts,
    loading,
    error,
    fetchReceipts,
    uploadReceipt,
    extractFromImage,
    removeReceipt,
  };
}
