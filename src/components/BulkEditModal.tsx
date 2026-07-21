"use client";

import React, { useState } from 'react';

export interface BulkEditData {
  category?: string;
  storeName?: string;
  paymentMethod?: string;
  date?: string;
  notes?: string;
}

interface BulkEditModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onSave: (updates: BulkEditData) => Promise<void>;
}

const CATEGORIES = [
  'อาหาร',
  'เดินทาง',
  'ช้อปปิ้ง',
  'ค่าบริการ',
  'สาธารณูปโภค',
  'ความบันเทิง',
  'ซ่อมบำรุง',
  'อื่นๆ'
];

const PAYMENT_METHODS = [
  'โอนเงิน / PromptPay',
  'บัตรเครดิต/เดบิต',
  'เงินสด',
  'อื่นๆ'
];

export default function BulkEditModal({
  isOpen,
  selectedCount,
  onClose,
  onSave
}: BulkEditModalProps) {
  const [enableCategory, setEnableCategory] = useState(false);
  const [category, setCategory] = useState('อาหาร');

  const [enableStore, setEnableStore] = useState(false);
  const [storeName, setStoreName] = useState('');

  const [enablePaymentMethod, setEnablePaymentMethod] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('โอนเงิน / PromptPay');

  const [enableDate, setEnableDate] = useState(false);
  const [date, setDate] = useState('');

  const [enableNotes, setEnableNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!enableCategory && !enableStore && !enablePaymentMethod && !enableDate && !enableNotes) {
      setValidationError('กรุณาเลือกหัวข้อที่ต้องการแก้ไขอย่างน้อย 1 รายการ');
      return;
    }

    if (enableStore && !storeName.trim()) {
      setValidationError('กรุณาระบุชื่อร้านค้า');
      return;
    }

    if (enableDate && !date) {
      setValidationError('กรุณาระบุวันที่');
      return;
    }

    const updates: BulkEditData = {};
    if (enableCategory) updates.category = category;
    if (enableStore) updates.storeName = storeName.trim();
    if (enablePaymentMethod) updates.paymentMethod = paymentMethod;
    if (enableDate) updates.date = date;
    if (enableNotes) updates.notes = notes.trim();

    setIsSubmitting(true);
    try {
      await onSave(updates);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '28px 32px',
        width: 'min(520px, 94vw)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.25))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              แก้ไขข้อมูลใบเสร็จแบบกลุ่ม
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              กำลังแก้ไข <strong style={{ color: 'var(--primary-color)' }}>{selectedCount} รายการ</strong> ที่เลือกไว้
            </p>
          </div>
        </div>

        {validationError && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            ⚠️ {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Field 1: Category */}
          <div style={{
            border: enableCategory ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: enableCategory ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            transition: 'all 0.2s'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={enableCategory}
                onChange={e => setEnableCategory(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              🏷️ แก้ไขหมวดหมู่
            </label>

            {enableCategory && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(cat => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      border: category === cat ? 'none' : '1px solid var(--border-color)',
                      backgroundColor: category === cat ? 'var(--primary-color)' : 'var(--surface-color)',
                      color: category === cat ? 'white' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Field 2: Store Name */}
          <div style={{
            border: enableStore ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: enableStore ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            transition: 'all 0.2s'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={enableStore}
                onChange={e => setEnableStore(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              🏪 แก้ไขชื่อร้านค้า / ผู้รับเงิน
            </label>

            {enableStore && (
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="ระบุชื่อร้านค้าใหม่..."
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Field 3: Payment Method */}
          <div style={{
            border: enablePaymentMethod ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: enablePaymentMethod ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            transition: 'all 0.2s'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={enablePaymentMethod}
                onChange={e => setEnablePaymentMethod(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              💳 แก้ไขช่องทางการชำระเงิน
            </label>

            {enablePaymentMethod && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PAYMENT_METHODS.map(pm => (
                  <button
                    type="button"
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      border: paymentMethod === pm ? 'none' : '1px solid var(--border-color)',
                      backgroundColor: paymentMethod === pm ? 'var(--primary-color)' : 'var(--surface-color)',
                      color: paymentMethod === pm ? 'white' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Field 4: Date */}
          <div style={{
            border: enableDate ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: enableDate ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            transition: 'all 0.2s'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={enableDate}
                onChange={e => setEnableDate(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              📅 แก้ไขวันที่
            </label>

            {enableDate && (
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Field 5: Notes */}
          <div style={{
            border: enableNotes ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: enableNotes ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            transition: 'all 0.2s'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={enableNotes}
                onChange={e => setEnableNotes(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              📝 แก้ไขหมายเหตุ
            </label>

            {enableNotes && (
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุใหม่..."
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid var(--border-color)',
                background: 'var(--surface-color)',
                fontWeight: '700',
                fontSize: '0.92rem',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1.5,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.92rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <span>บันทึกการแก้ไข ({selectedCount} รายการ)</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
