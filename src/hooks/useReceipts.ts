"use client";

import { useState, useCallback } from 'react';
import { apiRequest, Receipt, CreateReceiptData, receiptApi } from '@/lib/apiClient';

export interface UseReceiptsReturn {
  receipts: Receipt[];
  fetchReceipts: (userId: string) => Promise<void>;
  createReceipt: (data: CreateReceiptData) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
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
      const result = await receiptApi.getAll(userId);
      if (result.success && result.data) {
        setReceipts(result.data);
      } else {
        setError(result.error || 'Failed to fetch receipts');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createReceipt = useCallback(async (data: CreateReceiptData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await receiptApi.create(data);
      
      if (result.success && result.data) {
        setReceipts(prev => [result.data as Receipt, ...prev]);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to create receipt' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const extractFromImage = useCallback(async (file: File, userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await receiptApi.extract(base64, userId);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error || 'Failed to extract data');
        return null;
      }
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    receipts,
    fetchReceipts,
    createReceipt,
    extractFromImage,
    loading,
    error,
  };
};
