"use client";

import { useState, useCallback } from 'react';
import { Receipt, CreateReceiptData, receiptApi, activityLogApi } from '@/lib/apiClient';

export interface UseReceiptsReturn {
  receipts: Receipt[];
  fetchReceipts: (userId: string, lineUserId?: string) => Promise<void>;
  createReceipt: (data: CreateReceiptData) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  updateReceipt: (id: string, data: Partial<Receipt>) => Promise<{ success: boolean; data?: Receipt; error?: string }>;
  updateMultipleReceipts: (ids: string[], updates: { category?: string; storeName?: string; paymentMethod?: string; date?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
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
      const receiptToDelete = receipts.find(r => r._id === id || r.id === id);
      const result = await receiptApi.delete(id) as any;
      if (result.success) {
        setReceipts(prev => prev.filter(r => r._id !== id && r.id !== id));
        if (receiptToDelete) {
          try {
            const storeName = receiptToDelete.storeName || 'ไม่ระบุร้านค้า';
            const amt = (receiptToDelete.amount !== undefined ? receiptToDelete.amount : receiptToDelete.totalAmount || 0);
            await activityLogApi.create(
              receiptToDelete.userId || 'user123',
              'delete',
              `ลบใบเสร็จร้าน "${storeName}" ยอดเงิน ฿${parseFloat(amt.toString()).toFixed(2)} บาท`
            );
          } catch (logErr) {
            console.error('Failed to log activity:', logErr);
          }
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete receipt' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [receipts]);

  const updateMultipleReceipts = useCallback(async (
    ids: string[],
    updates: { category?: string; storeName?: string; paymentMethod?: string; date?: string; notes?: string }
  ) => {
    try {
      const updatePromises = ids.map(id => {
        const targetReceipt = receipts.find(r => (r._id === id || r.id === id));
        if (!targetReceipt) return Promise.resolve({ success: true });

        const patchData: Partial<Receipt> = {};
        if (updates.storeName !== undefined && updates.storeName.trim() !== '') {
          patchData.storeName = updates.storeName;
        }

        const newExtracted = {
          ...(targetReceipt.extractedData || {}),
        };
        if (updates.category !== undefined && updates.category.trim() !== '') {
          newExtracted.category = updates.category;
        }
        if (updates.paymentMethod !== undefined && updates.paymentMethod.trim() !== '') {
          newExtracted.paymentMethod = updates.paymentMethod;
          newExtracted.method = updates.paymentMethod;
        }
        if (updates.date !== undefined && updates.date.trim() !== '') {
          newExtracted.date = updates.date;
        }
        if (updates.notes !== undefined && updates.notes.trim() !== '') {
          newExtracted.notes = updates.notes;
        }

        patchData.extractedData = newExtracted;
        return receiptApi.update(id, patchData);
      });

      const results = await Promise.all(updatePromises);
      const hasError = results.some(res => !res.success);

      if (!hasError) {
        const idSet = new Set(ids);
        setReceipts(prev => prev.map(r => {
          const rId = r._id || r.id || '';
          if (!idSet.has(rId)) return r;

          const updatedStore = (updates.storeName !== undefined && updates.storeName.trim() !== '') ? updates.storeName : r.storeName;
          const updatedExtracted = {
            ...(r.extractedData || {}),
            ...(updates.category !== undefined && updates.category.trim() !== '' ? { category: updates.category } : {}),
            ...(updates.paymentMethod !== undefined && updates.paymentMethod.trim() !== '' ? { paymentMethod: updates.paymentMethod, method: updates.paymentMethod } : {}),
            ...(updates.date !== undefined && updates.date.trim() !== '' ? { date: updates.date } : {}),
            ...(updates.notes !== undefined && updates.notes.trim() !== '' ? { notes: updates.notes } : {}),
          };

          return {
            ...r,
            storeName: updatedStore,
            extractedData: updatedExtracted,
            updatedAt: new Date().toISOString(),
          };
        }));

        try {
          const firstId = ids[0];
          const sampleReceipt = receipts.find(r => r._id === firstId || r.id === firstId);
          await activityLogApi.create(
            sampleReceipt?.userId || 'user123',
            'edit',
            `แก้ไขใบเสร็จแบบกลุ่มจำนวน ${ids.length} รายการ`
          );
        } catch (logErr) {
          console.error('Failed to log activity:', logErr);
        }

        return { success: true };
      } else {
        return { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตใบเสร็จบางรายการ' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [receipts]);

  const deleteMultipleReceipts = useCallback(async (ids: string[]) => {
    try {
      const targetReceipts = receipts.filter(r => ids.includes(r._id || '') || ids.includes(r.id || ''));
      const result = await receiptApi.deleteMultiple(ids) as any;
      if (result.success) {
        const idSet = new Set(ids);
        setReceipts(prev => prev.filter(r => !idSet.has(r._id || '') && !idSet.has(r.id || '')));
        if (targetReceipts.length > 0) {
          try {
            const sampleReceipt = targetReceipts[0];
            await activityLogApi.create(
              sampleReceipt?.userId || 'user123',
              'delete',
              `ลบใบเสร็จแบบกลุ่มจำนวน ${ids.length} รายการ`
            );
          } catch (logErr) {
            console.error('Failed to log activity:', logErr);
          }
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete receipts' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [receipts]);

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
    updateMultipleReceipts,
    deleteReceipt,
    deleteMultipleReceipts,
    extractFromImage,
    loading,
    error,
  };
};