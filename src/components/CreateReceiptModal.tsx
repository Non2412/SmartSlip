'use client';

import React, { useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>สร้างใบเสร็จ</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              padding: '10px',
              border: activeTab === 'manual' ? '2px solid #007AFF' : '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: activeTab === 'manual' ? '#f0f8ff' : 'white',
              color: activeTab === 'manual' ? '#007AFF' : '#64748b',
              fontWeight: activeTab === 'manual' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📝 ป้อนตัวเลข
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '10px',
              border: activeTab === 'upload' ? '2px solid #007AFF' : '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: activeTab === 'upload' ? '#f0f8ff' : 'white',
              color: activeTab === 'upload' ? '#007AFF' : '#64748b',
              fontWeight: activeTab === 'upload' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🖼️ อัพโหลดรูป
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FFE5E5',
              color: '#C00',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                ชื่อร้าน/ธุรกิจ *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="เช่น: DMDM Restaurant"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                จำนวนเงิน (บาท) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                backgroundColor: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
                marginTop: '8px',
              }}
            >
              {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </form>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label
              style={{
                border: '2px dashed #007AFF',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#f0f8ff',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📸</div>
              <div style={{ fontWeight: '600', color: '#007AFF', marginBottom: '4px' }}>
                {file ? file.name : 'คลิกเลือกรูปใบเสร็จ'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>หรือลากรูปมาวางที่นี่</div>
            </label>

            {file && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    ชื่อร้าน/ธุรกิจ
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    จำนวนเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  onClick={handleManualSubmit}
                  disabled={loading || !storeName || !amount}
                  style={{
                    padding: '12px',
                    backgroundColor: '#007AFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: loading || !storeName || !amount ? 'not-allowed' : 'pointer',
                    opacity: loading || !storeName || !amount ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  type="button"
                >
                  {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
