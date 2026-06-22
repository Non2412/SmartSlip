"use client";

import React, { useState, useEffect } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import Image from 'next/image';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';

const formatToInputDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch {
        // fallback
    }
    return dateStr;
};

const formatToInputTime = (timeStr: string): string => {
    if (!timeStr) return '';
    try {
        const match = timeStr.match(/^(\d{2}:\d{2})/);
        if (match) {
            return match[1];
        }
    } catch {
        // fallback
    }
    return timeStr;
};

const shimmer = `
@keyframes spin { to { transform: rotate(360deg); } }
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
`;

interface ReceiptDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (id?: string) => void;
    receipt: any | null;
}

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', display: 'block'
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0',
    fontSize: '0.95rem', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b'
};

const ReceiptDetailSheet = ({ isOpen, onClose, onSuccess, receipt }: ReceiptDetailSheetProps) => {
    const { updateReceipt } = useReceipts();

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const [editingDescId, setEditingDescId] = useState<string | null>(null);
    const [editingDescValue, setEditingDescValue] = useState('');

    const openDescModal = (item: LineItem) => {
        setEditingDescId(item.id);
        setEditingDescValue(item.description);
    };
    const closeDescModal = () => {
        if (editingDescId) {
            updateItem(editingDescId, { description: editingDescValue });
        }
        setEditingDescId(null);
    };

    const [store, setStore] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [currency, setCurrency] = useState('THB');
    const [taxId, setTaxId] = useState('');
    const [items, setItems] = useState<LineItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [vat, setVat] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (receipt && isOpen) {
            const ed = receipt.extractedData || {};
            setStore(receipt.storeName || '');
            setCategory(ed.category || '');
            setDate(formatToInputDate(ed.date || receipt.createdAt || ''));
            setTime(formatToInputTime(ed.time || (receipt.createdAt ? new Date(receipt.createdAt).toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '')));
            setPaymentMethod(ed.paymentMethod || ed.method || '');
            setCurrency(ed.currency || 'THB');
            setTaxId(ed.vendorTaxId || '');
            setDiscount(ed.summary?.discount ?? 0);
            setVat(ed.summary?.vat ?? ed.vat ?? 0);
            setErrorMsg(null);

            const rawItems = ed.items;
            if (Array.isArray(rawItems) && rawItems.length > 0) {
                setItems(rawItems.map((it: any, idx: number) => ({
                    id: (idx + 1).toString(),
                    description: it.description || '',
                    quantity: it.quantity || 1,
                    unitPrice: it.unitPrice ?? it.unit_price ?? it.amount ?? it.total ?? 0,
                })));
            } else {
                setItems([{
                    id: '1',
                    description: receipt.storeName || '',
                    quantity: 1,
                    unitPrice: (receipt.amount !== undefined ? receipt.amount : receipt.totalAmount) || 0,
                }]);
            }
        }
    }, [receipt, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setErrorMsg(null);
                setIsSaving(false);
            }, 400);
        }
    }, [isOpen]);

    const updateItem = (id: string, updates: Partial<LineItem>) => {
        setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    };
    const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
    const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
    const calcSubtotal = () => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const calcTotal = () => calcSubtotal() - discount + vat;

    const handleSave = async () => {
        if (!store || !date) {
            setErrorMsg('กรุณาระบุร้านค้าและวันที่');
            return;
        }
        setIsSaving(true);
        setErrorMsg(null);
        try {
            const grandTotal = calcTotal();
            const result = await updateReceipt(receipt._id || receipt.id || '', {
                ...receipt,
                storeName: store,
                totalAmount: grandTotal,
                extractedData: {
                    ...receipt.extractedData,
                    date,
                    time,
                    paymentMethod,
                    category,
                    currency,
                    vendorTaxId: taxId,
                    items,
                    summary: {
                        subtotal: calcSubtotal(),
                        discount,
                        vat,
                        total: grandTotal,
                    },
                },
            }) as any;

            if (result?.success) {
                if (onSuccess) onSuccess(receipt._id || receipt.id || '');
                onClose();
            } else {
                setErrorMsg(result?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    const imageData = cleanAndProxyImageUrl(receipt?.extractedData?.imageData || receipt?.imageURL || receipt?.imageUrl || undefined) || null;

    return (
        <>
        <div style={{
            position: 'fixed', top: 0, right: isOpen ? 0 : '-100vw',
            width: '100vw', height: '100vh', backgroundColor: '#ffffff',
            zIndex: 1000, transition: 'right 0.5s cubic-bezier(0.4,0,0.2,1)',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter","Sarabun",sans-serif',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)'
        }}>
            <style dangerouslySetInnerHTML={{ __html: shimmer }} />

            {/* Dark header */}
            <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', flexShrink: 0 }}>
                <div>
                    <h2 style={{ color: 'white', fontWeight: '900', fontSize: '1.15rem', margin: 0 }}>ตรวจสอบและยืนยันข้อมูลใบเสร็จ</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0' }}>แก้ไขข้อมูลที่ต้องการแล้วกดบันทึก</p>
                </div>
                <button onClick={onClose} style={{ color: '#94a3b8', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '700' }}>ปิด ✕</button>
            </div>

            {errorMsg && (
                <div style={{ padding: '10px 32px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0 }}>
                    {errorMsg}
                </div>
            )}

            {/* Two-column body */}
            <div style={{ display: 'flex', flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflow: isMobile ? 'auto' : 'hidden', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
                {/* Top (mobile) / Left (desktop): Image */}
                <div style={{ flexGrow: 0, flexShrink: 0, flexBasis: isMobile ? 'auto' : '38%', width: isMobile ? '100%' : undefined, height: isMobile ? '240px' : undefined, borderRight: isMobile ? 'none' : '1px solid #e2e8f0', borderBottom: isMobile ? '1px solid #e2e8f0' : 'none', backgroundColor: '#f8fafc', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                    <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', width: '100%', height: '100%', minHeight: isMobile ? '208px' : '300px' }}>
                        {imageData ? (
                            <Image
                                src={imageData}
                                alt="Receipt"
                                fill
                                unoptimized
                                sizes="(max-width: 768px) 100vw, 38vw"
                                style={{ objectFit: 'contain', borderRadius: '8px' }}
                            />
                        ) : (
                            <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 12px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                ไม่มีรูปภาพ
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Editable form */}
                <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflowY: 'auto', padding: '28px 32px', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>ร้านค้า / ผู้ให้บริการ</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🏪</span>
                                <input value={store} onChange={e => setStore(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} placeholder="ชื่อร้านค้า" />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>หมวดหมู่ค่าใช้จ่าย</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🏷️</span>
                                <input value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} placeholder="เช่น Food, Shopping" />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>วันที่ในใบเสร็จ</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>📅</span>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>เวลาในใบเสร็จ</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🕐</span>
                                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>สกุลเงิน</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>$</span>
                                <input value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, paddingLeft: '28px' }} />
                            </div>
                        </div>
                    </div>

                    {/* Line items */}
                    <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontWeight: '900', fontSize: '0.95rem', margin: 0 }}>รายการสินค้าและบริการ ({items.length})</h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 54px 90px 32px' : '1fr 80px 130px 36px', gap: '8px', padding: '8px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            {['รายการ', 'จำนวน', 'ราคา', ''].map((h, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                            ))}
                        </div>
                        {items.map(item => (
                            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 54px 90px 32px' : '1fr 80px 130px 36px', gap: '8px', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                                {isMobile ? (
                                    <div
                                        onClick={() => openDescModal(item)}
                                        style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.88rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.description ? '#1e293b' : '#94a3b8' }}
                                    >
                                        {item.description || 'ชื่อสินค้า/บริการ'}
                                    </div>
                                ) : (
                                    <input value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="ชื่อสินค้า/บริการ" style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.88rem' }} />
                                )}
                                <input type="number" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, padding: '7px 8px', fontSize: '0.88rem', textAlign: 'center' }} />
                                <div style={{ padding: '7px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '700', textAlign: 'right', color: '#1e293b' }}>
                                    {(item.quantity * item.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <button onClick={() => removeItem(item.id)} style={{ background: '#fff1f2', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        ))}
                        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={addItem} style={{ padding: '7px 16px', backgroundColor: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>+</span> เพิ่มสินค้า
                            </button>
                        </div>
                    </div>

                    {/* Discount & VAT */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>ส่วนลดท้ายบิล</label>
                            <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>ภาษีมูลค่าเพิ่ม (VAT)</label>
                            <input type="number" value={vat} onChange={e => setVat(parseFloat(e.target.value) || 0)} style={inputStyle} />
                        </div>
                    </div>

                    {/* Totals */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                            <span>ยอดรวมก่อนหักรายการ:</span>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{calcSubtotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', borderTop: '2px solid #e2e8f0', alignItems: 'center' }}>
                            <span style={{ fontWeight: '900', fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#1e293b' }}>{isMobile ? 'ยอดรวม:' : 'ยอดสุทธิทั้งหมด:'}</span>
                            <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#7c3aed' }}>
                                {calcTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom action bar */}
            <div style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', flexShrink: 0 }}>
                <button onClick={onClose} style={{ padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}>
                    ยกเลิก
                </button>
                <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: isSaving ? '#a78bfa' : '#7c3aed', color: 'white', fontWeight: '800', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    {isSaving ? (
                        <><SpinIcon /> กำลังบันทึก...</>
                    ) : (
                        <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>บันทึกการแก้ไข</>
                    )}
                </button>
            </div>
        </div>

        {/* Mobile description edit modal */}
        {isMobile && editingDescId && (
            <div
                onClick={closeDescModal}
                style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    backgroundColor: 'rgba(15,23,42,0.6)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px',
                }}
            >
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', margin: '0 0 10px' }}>ชื่อสินค้า / บริการ</p>
                    <input
                        autoFocus
                        value={editingDescValue}
                        onChange={e => setEditingDescValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && closeDescModal()}
                        placeholder="ชื่อสินค้า/บริการ"
                        style={{ ...inputStyle, fontSize: '1rem', padding: '12px 14px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                        onClick={closeDescModal}
                        style={{ marginTop: '14px', width: '100%', padding: '12px', borderRadius: '10px', background: '#7c3aed', color: 'white', fontWeight: '800', border: 'none', fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                        ยืนยัน
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

const SpinIcon = () => (
    <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default ReceiptDetailSheet;
