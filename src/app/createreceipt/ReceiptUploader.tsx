'use client';

import React, { useRef, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { ReceiptData } from '@/lib/apiClient';
import styles from './ReceiptUploader.module.css';

export function ReceiptUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
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

    // Extract receipt data
    setExtractedData(null);
    const data = await extractFromImage(file);
    if (data) {
      setExtractedData(data);
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
        style={{ backgroundColor: '#10b981' }}
      >
        {loading ? '⏳ กำลังประมวลผล...' : '📤 เลือกรูปใบเสร็จ'}
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
          <h4 className={styles.dataTitle}>✅ ผลการประมวลผล</h4>

          <div className={styles.dataGrid}>
            {extractedData.amount && (
              <div>
                <span className={styles.dataLabel}>💰 จำนวนเงิน:</span>
                <div className={styles.amountValue}>
                  {formatCurrency(extractedData.amount)}
                </div>
              </div>
            )}

            {extractedData.receiver && (
              <div>
                <span className={styles.dataLabel}>🏢 ผู้รับ:</span>
                <div className={styles.dataValue}>{extractedData.receiver}</div>
              </div>
            )}

            {extractedData.sender && (
              <div>
                <span className={styles.dataLabel}>👤 ผู้ส่ง:</span>
                <div className={styles.dataValue}>{extractedData.sender}</div>
              </div>
            )}

            {extractedData.date && (
              <div>
                <span className={styles.dataLabel}>📅 วันที่:</span>
                <div className={styles.dataValue}>{extractedData.date}</div>
              </div>
            )}
          </div>

          {extractedData.confidence && (
            <div className={styles.confidenceContainer}>
              <span className={styles.dataLabel}>ความแม่นยำ: </span>
              <span
                className={`${styles.confidenceBadge} ${
                  extractedData.confidence === 'high'
                    ? styles.confidenceHigh
                    : extractedData.confidence === 'medium'
                      ? styles.confidenceMedium
                      : styles.confidenceLow
                }`}
              >
                {extractedData.confidence === 'high'
                  ? '✅ สูง'
                  : extractedData.confidence === 'medium'
                    ? '⚠️ ปานกลาง'
                    : '❓ ต่ำ'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
