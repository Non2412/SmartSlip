"use client";

import React, { useState, useEffect } from 'react';
import styles from './CreateReceiptModal.module.css';
import { ReceiptUploader } from './ReceiptUploader';
import { useReceipts } from '@/hooks/useReceipts';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  userId 
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [storeName, setStoreName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [paymentMethod, setPaymentMethod] = useState('เงินสด');
  const [category, setCategory] = useState('อาหาร');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createReceipt } = useReceipts();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStoreName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !amount) {
      setError('กรุณากรอกชื่อร้านและจำนวนเงินให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createReceipt({
      storeName,
      totalAmount: parseFloat(amount),
      userId,
      extractedData: {
        date,
        method: paymentMethod,
        receiver: category
      }
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleOCRSuccess = (data: any) => {
    // When OCR succeeds, populate manual fields and switch to manual tab for review
    setStoreName(data.store || '');
    setAmount(data.amount?.toString() || '');
    if (data.date) {
        try {
            const isoDate = new Date(data.date).toISOString().split('T')[0];
            setDate(isoDate);
        } catch { /* keep current date */ }
    }
    setPaymentMethod(data.method || 'ไม่ระบุ');
    setCategory(data.receiver || 'ทั่วไป');
    setActiveTab('manual');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sidepanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>สร้างใบเสร็จ</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'manual' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            📝 ป้อนตัวเลข
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            🖼️ อัพโหลดรูป
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'upload' ? (
            <ReceiptUploader onOCRSuccess={handleOCRSuccess} userId={userId} />
          ) : (
            <form onSubmit={handleManualSubmit} className={styles.form}>
              {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
              
              <div className={styles.inputGroup}>
                <label>ชื่อร้าน/ธุรกิจ *</label>
                <input 
                  type="text" 
                  placeholder="เช่น: Inthanin Coffee" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>จำนวนเงิน (บาท) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label>วันที่ *</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>วิธีชำระเงิน</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงินธนาคาร</option>
                    <option value="บัตรเครดิต">บัตรเครดิต</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>หมวดหมู่</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="อาหาร">อาหารและเครื่องดื่ม</option>
                  <option value="ของใช้">ของใช้ทั่วไป</option>
                  <option value="เดินทาง">การเดินทาง</option>
                  <option value="บันเทิง">ความบันเทิง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div className={styles.footer}>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึก'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
