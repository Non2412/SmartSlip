'use client';

import React, { useRef, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './ReceiptUploader.module.css';

interface ReceiptUploaderProps {
  onOCRSuccess: (data: any) => void;
  userId: string;
}

export function ReceiptUploader({ onOCRSuccess, userId }: ReceiptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [editableData, setEditableData] = useState({
    store: '',
    amount: '',
    date: '',
    method: 'เงินสด',
    receiver: 'อาหาร'
  });
  const { extractFromImage, loading, error } = useReceipts();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Extract receipt data using AI
    setExtractedData(null);
    // You can pass the actual userId here, e.g., from a session
    const data = await extractFromImage(file, 'user123'); 
    if (data) {
      setExtractedData(data);
      setEditableData({
        store: data.store || '',
        amount: data.amount?.toString() || '',
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        method: data.method || 'เงินสด',
        receiver: data.receiver || 'อาหาร'
      });
      // ส่งข้อมูลกลับไปให้หน้าจอหลัก (Modal) เพื่อเติมข้อมูลในช่องต่างๆ
      onOCRSuccess(data);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📸 อัพโหลดใบเสร็จ</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <button
        onClick={handleUploadClick}
        disabled={loading}
        className={styles.uploadButton}
      >
        {loading ? '⏳ กำลังวิเคราะห์ข้อมูล...' : '📤 เลือกรูปใบเสร็จ'}
      </button>

      {error && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      {preview && (
        <div className={styles.previewContainer}>
          <div className={styles.previewWrapper}>
            <img
              src={preview}
              alt="Receipt preview"
              className={styles.previewImage}
            />
          </div>
        </div>
      )}

      {extractedData && (
        <div className={styles.dataContainer}>
          <h4 className={styles.dataTitle}>✅ ผลการประมวลผล (AI) - แก้ไขได้</h4>

          <div className={styles.dataGrid}>
            <div>
              <label className={styles.dataLabel}>🏢 ร้านค้า:</label>
              <input
                type="text"
                value={editableData.store}
                onChange={(e) => setEditableData(prev => ({ ...prev, store: e.target.value }))}
                className={styles.dataInput}
              />
            </div>

            <div>
              <label className={styles.dataLabel}>💰 ยอดเงิน:</label>
              <input
                type="number"
                step="0.01"
                value={editableData.amount}
                onChange={(e) => setEditableData(prev => ({ ...prev, amount: e.target.value }))}
                className={styles.dataInput}
              />
            </div>

            <div>
              <label className={styles.dataLabel}>📅 วันที่:</label>
              <input
                type="date"
                value={editableData.date}
                onChange={(e) => setEditableData(prev => ({ ...prev, date: e.target.value }))}
                className={styles.dataInput}
              />
            </div>

            <div>
              <label className={styles.dataLabel}>💳 ชำระโดย:</label>
              <select
                value={editableData.method}
                onChange={(e) => setEditableData(prev => ({ ...prev, method: e.target.value }))}
                className={styles.dataInput}
              >
                <option value="เงินสด">เงินสด</option>
                <option value="โอนเงิน">โอนเงินธนาคาร</option>
                <option value="บัตรเครดิต">บัตรเครดิต</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className={styles.dataLabel}>📂 หมวดหมู่:</label>
              <select
                value={editableData.receiver}
                onChange={(e) => setEditableData(prev => ({ ...prev, receiver: e.target.value }))}
                className={styles.dataInput}
              >
                <option value="อาหาร">อาหารและเครื่องดื่ม</option>
                <option value="ของใช้">ของใช้ทั่วไป</option>
                <option value="เดินทาง">การเดินทาง</option>
                <option value="บันเทิง">ความบันเทิง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => onOCRSuccess(editableData)}
            className={styles.confirmButton}
          >
            ✅ ยืนยันข้อมูล
          </button>
        </div>
      )}
    </div>
  );
}
