'use client';

import React, { useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './CreateReceiptModal.module.css';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

export function CreateReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
}: CreateReceiptModalProps) {
  const [storeName, setStoreName] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const { uploadReceipt, extractFromImage, loading, error } = useReceipts();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !amount) return;

    const receipt = await uploadReceipt(storeName, parseFloat(amount), userId);
    if (receipt) {
      setStoreName('');
      setAmount('');
      setFile(null);
      onSuccess?.();
      onClose();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // แยกข้อมูลจากรูป
    const data = await extractFromImage(selectedFile);
    if (data) {
      setStoreName(data.receiver || '');
      setAmount(data.amount?.toString() || '');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>สร้างใบเสร็จ</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('manual')}
            className={`${styles.tabButton} ${activeTab === 'manual' ? styles.tabButtonActive : ''}`}
          >
            📝 ป้อนตัวเลข
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`${styles.tabButton} ${activeTab === 'upload' ? styles.tabButtonActive : ''}`}
          >
            🖼️ อัพโหลดรูป
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                ชื่อร้าน/ธุรกิจ *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="เช่น: DMDM Restaurant"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                จำนวนเงิน (บาท) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={styles.input}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </form>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className={styles.form}>
            <label className={`${styles.uploadArea} ${file ? styles.fileSelected : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div className={styles.uploadIcon}>📸</div>
              <div className={styles.uploadTextPrimary}>
                {file ? file.name : 'คลิกเลือกรูปใบเสร็จ'}
              </div>
              <div className={styles.uploadTextSecondary}>หรือลากรูปมาวางที่นี่</div>
            </label>

            {file && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    ชื่อร้าน/ธุรกิจ
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    จำนวนเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className={styles.input}
                  />
                </div>
              </>
            )}

            <button
              onClick={handleManualSubmit}
              disabled={loading || !storeName || !amount}
              className={styles.submitButton}
              type="button"
            >
              {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
