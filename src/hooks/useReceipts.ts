"use client";

import { useState, useCallback } from 'react';
import { Receipt, CreateReceiptData, receiptApi } from '@/lib/apiClient';

export interface UseReceiptsReturn {
  receipts: Receipt[];
  fetchReceipts: (userId: string) => Promise<void>;
  createReceipt: (data: CreateReceiptData) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  updateReceipt: (id: string, data: { storeName?: string; totalAmount?: number; extractedData?: unknown }) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  extractFromImage: (file: File, userId: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export const useReceipts = (): UseReceiptsReturn => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await receiptApi.getAll(userId) as any;
      if (result.success && result.data) {
        setReceipts(result.data);
      } else {
        setError(result.error || 'Failed to fetch receipts');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createReceipt = useCallback(async (data: CreateReceiptData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await receiptApi.create(data) as any;
      if (result.success && result.data) {
        setReceipts(prev => [result.data as Receipt, ...prev]);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to create receipt' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReceipt = useCallback(async (id: string, data: { storeName?: string; totalAmount?: number; extractedData?: unknown }) => {
    try {
      const result = await receiptApi.update(id, data) as any;
      if (result.success && result.data) {
        setReceipts(prev => prev.map(r => r.id === id ? (result.data as Receipt) : r));
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to update receipt' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const extractFromImage = useCallback(async (file: File, userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await receiptApi.extract(file, userId || '');
      if (result.success) {
        const data = (result as any).data;
        if (data) return data;
      }
      const errMsg = (result as any).error || 'OCR extraction failed';
      setError(errMsg);
      throw new Error(errMsg);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    receipts,
    fetchReceipts,
    createReceipt,
    updateReceipt,
    extractFromImage,
    loading,
    error,
  };
};