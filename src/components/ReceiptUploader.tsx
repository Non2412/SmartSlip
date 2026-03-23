'use client';

import React, { useRef, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { ReceiptData } from '@/lib/apiClient';

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
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📸 อัพโหลดใบเสร็จ</h3>

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
        style={{
          padding: '12px 24px',
          backgroundColor: '#007AFF',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '⏳ กำลังประมวลผล...' : '📤 เลือกรูปใบเสร็จ'}
      </button>

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#FFE5E5',
          color: '#C00',
          borderRadius: '4px',
          fontSize: '14px',
        }}>
          ❌ {error}
        </div>
      )}

      {preview && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            width: '100%',
            maxWidth: '300px',
            height: '300px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#f5f5f5',
          }}>
            <img
              src={preview}
              alt="Receipt preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      )}

      {extractedData && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          border: '1px solid #007AFF',
        }}>
          <h4 style={{ marginTop: 0, color: '#007AFF' }}>✅ ผลการประมวลผล</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            {extractedData.amount && (
              <div>
                <span style={{ color: '#666' }}>💰 จำนวนเงิน:</span>
                <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                  {formatCurrency(extractedData.amount)}
                </div>
              </div>
            )}

            {extractedData.receiver && (
              <div>
                <span style={{ color: '#666' }}>🏢 ผู้รับ:</span>
                <div style={{ fontWeight: '600', color: '#333' }}>{extractedData.receiver}</div>
              </div>
            )}

            {extractedData.sender && (
              <div>
                <span style={{ color: '#666' }}>👤 ผู้ส่ง:</span>
                <div style={{ fontWeight: '600', color: '#333' }}>{extractedData.sender}</div>
              </div>
            )}

            {extractedData.date && (
              <div>
                <span style={{ color: '#666' }}>📅 วันที่:</span>
                <div style={{ fontWeight: '600', color: '#333' }}>{extractedData.date}</div>
              </div>
            )}
          </div>

          {extractedData.confidence && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <span style={{ color: '#666' }}>ความแม่นยำ: </span>
              <span
                style={{
                  fontWeight: '600',
                  backgroundColor:
                    extractedData.confidence === 'high'
                      ? '#E8F5E9'
                      : extractedData.confidence === 'medium'
                        ? '#FFF3CD'
                        : '#FFE5E5',
                  color:
                    extractedData.confidence === 'high'
                      ? '#2E7D32'
                      : extractedData.confidence === 'medium'
                        ? '#856404'
                        : '#C00',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
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
