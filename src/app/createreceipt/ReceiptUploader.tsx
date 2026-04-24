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
    const data = await extractFromImage(file, userId); 
    if (data) {
      setExtractedData(data);
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
        className={styles.hiddenInput}
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
          <h4 className={styles.dataTitle}>✅ ผลการประมวลผล (AI)</h4>

          <div className={styles.dataGrid}>
            {extractedData.amount !== undefined && (
              <div>
                <span className={styles.dataLabel}>💰 ยอดเงิน:</span>
                <div className={styles.amountValue}>
                  {formatCurrency(extractedData.amount)}
                </div>
              </div>
            )}

            {extractedData.store && (
              <div>
                <span className={styles.dataLabel}>🏢 ร้านค้า:</span>
                <div className={styles.dataValue}>{extractedData.store}</div>
              </div>
            )}

            {extractedData.method && (
              <div>
                <span className={styles.dataLabel}>💳 ชำระโดย:</span>
                <div className={styles.dataValue}>{extractedData.method}</div>
              </div>
            )}

            {extractedData.date && (
              <div>
                <span className={styles.dataLabel}>📅 วันที่:</span>
                <div className={styles.dataValue}>
                   {new Date(extractedData.date).toLocaleDateString('th-TH')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
