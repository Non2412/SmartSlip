"use client";

import { useState, useCallback } from 'react';
import { Receipt, CreateReceiptData, receiptApi, activityLogApi } from '@/lib/apiClient';

export interface UseReceiptsReturn {
  receipts: Receipt[];
  fetchReceipts: (userId: string, lineUserId?: string) => Promise<void>;
  createReceipt: (data: CreateReceiptData) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  updateReceipt: (id: string, data: Partial<Receipt>) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  deleteReceipt: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteMultipleReceipts: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  extractFromImage: (file: File, userId: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export const useReceipts = (): UseReceiptsReturn => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async (userId: string, lineUserId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await receiptApi.getAll(userId, lineUserId) as any;
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
        try {
          const storeName = result.data.storeName || 'ไม่ระบุร้านค้า';
          const amt = (result.data.amount !== undefined ? result.data.amount : result.data.totalAmount || 0);
          await activityLogApi.create(
            data.userId || 'user123',
            'add',
            `เพิ่มใบเสร็จร้าน "${storeName}" ยอดเงิน ฿${parseFloat(amt.toString()).toFixed(2)} บาท`,
            result.data._id || result.data.id
          );
        } catch (logErr) {
          console.error('Failed to log activity:', logErr);
        }
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

  const updateReceipt = useCallback(async (id: string, data: Partial<Receipt>) => {
    try {
      const result = await receiptApi.update(id, data) as any;
      if (result.success && result.data) {
        setReceipts(prev => prev.map(r => (r._id === id || r.id === id) ? (result.data as Receipt) : r));
        try {
          const storeName = result.data.storeName || 'ไม่ระบุร้านค้า';
          const amt = (result.data.amount !== undefined ? result.data.amount : result.data.totalAmount || 0);
          await activityLogApi.create(
            result.data.userId || 'user123',
            'edit',
            `แก้ไขใบเสร็จร้าน "${storeName}" ยอดเงิน ฿${parseFloat(amt.toString()).toFixed(2)} บาท`,
            result.data._id || result.data.id
          );
        } catch (logErr) {
          console.error('Failed to log activity:', logErr);
        }
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to update receipt' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const deleteReceipt = useCallback(async (id: string) => {
    try {
      const result = await receiptApi.delete(id) as any;
      if (result.success) {
        setReceipts(prev => prev.filter(r => r._id !== id && r.id !== id));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete receipt' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const deleteMultipleReceipts = useCallback(async (ids: string[]) => {
    try {
      const result = await receiptApi.deleteMultiple(ids) as any;
      if (result.success) {
        const idSet = new Set(ids);
        setReceipts(prev => prev.filter(r => !idSet.has(r._id || '') && !idSet.has(r.id || '')));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete receipts' };
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
    deleteReceipt,
    deleteMultipleReceipts,
    extractFromImage,
    loading,
    error,
  };
};