"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import Image from 'next/image';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';

const formatToInputDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    } catch { /* fallback */ }
    return dateStr;
};

const formatToInputTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const match = timeStr.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : timeStr;
};

const css = `
@keyframes spin { to { transform: rotate(360deg); } }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
`;

interface ReceiptDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (id?: string) => void;
    receipt: any | null;
    allReceipts?: any[];
    initialIndex?: number;
}

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '0.92rem', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b',
    boxSizing: 'border-box' as const,
};
const darkInputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
    fontSize: '0.92rem', outline: 'none', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
    boxSizing: 'border-box' as const,
};
const darkLabelStyle: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em'
};

const ReceiptDetailSheet = ({ isOpen, onClose, onSuccess, receipt, allReceipts, initialIndex = 0 }: ReceiptDetailSheetProps) => {
    const { updateReceipt } = useReceipts();
    const isQueueMode = !!(allReceipts && allReceipts.length > 0);

    const [currentIdx, setCurrentIdx] = useState(initialIndex);
    const currentReceipt = isQueueMode ? allReceipts![currentIdx] : receipt;

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Reset index when opening / allReceipts changes
    useEffect(() => {
        if (isOpen) setCurrentIdx(initialIndex);
    }, [isOpen, initialIndex]);

    // Image zoom/pan state
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

    const resetView = useCallback(() => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.min(5, Math.max(0.1, z - e.deltaY * 0.001)));
    }, []);
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y };
    }, [position]);
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y });
    }, [isDragging]);
    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    // Mobile description edit
    const [editingDescId, setEditingDescId] = useState<string | null>(null);
    const [editingDescValue, setEditingDescValue] = useState('');
    const openDescModal = (item: LineItem) => { setEditingDescId(item.id); setEditingDescValue(item.description); };
    const closeDescModal = () => {
        if (editingDescId) updateItem(editingDescId, { description: editingDescValue });
        setEditingDescId(null);
    };

    // Form state
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

    // Populate form when currentReceipt changes
    useEffect(() => {
        if (currentReceipt && isOpen) {
            const ed = currentReceipt.extractedData || {};
            setStore(currentReceipt.storeName || '');
            setCategory(ed.category || '');
            setDate(formatToInputDate(ed.date || currentReceipt.createdAt || ''));
            setTime(formatToInputTime(ed.time || (currentReceipt.createdAt ? new Date(currentReceipt.createdAt).toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '')));
            setPaymentMethod(ed.paymentMethod || ed.method || '');
            setCurrency(ed.currency || 'THB');
            setTaxId(ed.vendorTaxId || '');
            setDiscount(ed.summary?.discount ?? ed.discount ?? 0);
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
                setItems([{ id: '1', description: currentReceipt.storeName || '', quantity: 1, unitPrice: (currentReceipt.amount !== undefined ? currentReceipt.amount : currentReceipt.totalAmount) || 0 }]);
            }
            resetView();
        }
    }, [currentReceipt, isOpen]);

    useEffect(() => {
        if (!isOpen) { setTimeout(() => { setErrorMsg(null); setIsSaving(false); }, 400); }
    }, [isOpen]);

    const updateItem = (id: string, updates: Partial<LineItem>) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
    const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
    const calcSubtotal = () => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const calcTotal = () => calcSubtotal() - discount + vat;

    const handleSave = async () => {
        if (!store || !date) { setErrorMsg('กรุณาระบุร้านค้าและวันที่'); return; }
        if (!currentReceipt) return;
        setIsSaving(true);
        setErrorMsg(null);
        try {
            const grandTotal = calcTotal();
            const result = await updateReceipt(receipt._id || receipt.id || '', {
                ...receipt,
                storeName: store,
                totalAmount: grandTotal,
                extractedData: {
                    ...currentReceipt.extractedData,
                    date, time, paymentMethod, category, currency,
                    vendorTaxId: taxId,
                    items,
                    summary: { subtotal: calcSubtotal(), discount, vat, total: grandTotal },
                },
            }) as any;

            if (result?.success) {
                if (onSuccess) onSuccess(receipt._id || receipt.id || '');
                if (isQueueMode && currentIdx < allReceipts!.length - 1) {
                    setCurrentIdx(i => i + 1);
                } else {
                    onClose();
                }
            } else {
                setErrorMsg(result?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    const getImageUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('storage.googleapis.com')) return '/api/gcs-image?url=' + encodeURIComponent(url);
        return url;
    };
    const imageData = getImageUrl(currentReceipt?.extractedData?.imageData) || getImageUrl(currentReceipt?.imageURL || currentReceipt?.imageUrl) || null;

    const total = allReceipts?.length ?? 1;
    const hasNext = isQueueMode && currentIdx < total - 1;
    const hasPrev = isQueueMode && currentIdx > 0;

    return (
        <>
        <div style={{
            position: 'fixed', top: 0, right: isOpen ? 0 : '-100vw',
            width: '100vw', height: '100vh', backgroundColor: 'var(--card-bg)',
            zIndex: 1000, transition: 'right 0.5s cubic-bezier(0.4,0,0.2,1)',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter","Sarabun",sans-serif',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)'
        }}>
            <style dangerouslySetInnerHTML={{ __html: css }} />

            {/* ── Header ── */}
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', flexShrink: 0, minHeight: '60px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {isQueueMode && (
                        <button
                            onClick={() => hasPrev && setCurrentIdx(i => i - 1)}
                            disabled={!hasPrev}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', background: hasPrev ? 'var(--surface-hover)' : 'transparent', color: hasPrev ? 'var(--text-main)' : 'var(--text-muted)', cursor: hasPrev ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                    )}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ตรวจสอบและยืนยันข้อมูลใบเสร็จ</h2>
                            {isQueueMode && (
                                <span style={{ padding: '2px 10px', borderRadius: '20px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.35)', color: '#2563eb', fontSize: '0.78rem', fontWeight: '800', flexShrink: 0 }}>
                                    {currentIdx + 1} / {total}
                                </span>
                            )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '2px 0 0', fontWeight: '500' }}>แก้ไขข้อมูลที่ต้องการแล้วกดบันทึก</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isQueueMode && (
                        <button
                            onClick={() => hasNext && setCurrentIdx(i => i + 1)}
                            disabled={!hasNext}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', background: hasNext ? 'var(--surface-hover)' : 'transparent', color: hasNext ? 'var(--text-main)' : 'var(--text-muted)', cursor: hasNext ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    )}
                    <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '700', padding: '4px 8px' }}>ปิด ✕</button>
                </div>
            </div>

            {/* Queue thumbnail strip */}
            {isQueueMode && (
                <div style={{ background: 'var(--main-bg)', borderBottom: '1px solid var(--border-color)', padding: '8px 24px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
                    {allReceipts!.map((r, idx) => {
                        const img = getImageUrl(r.extractedData?.imageData) || getImageUrl(r.imageURL || r.imageUrl) || null;
                        const isActive = idx === currentIdx;
                        return (
                            <div
                                key={idx}
                                onClick={() => setCurrentIdx(idx)}
                                style={{ flexShrink: 0, width: '48px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${isActive ? '#2563eb' : 'var(--border-color)'}`, cursor: 'pointer', opacity: isActive ? 1 : 0.55, transition: 'all 0.15s', position: 'relative' }}
                            >
                                {img ? (
                                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {errorMsg && (
                <div style={{ padding: '10px 24px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0 }}>
                    {errorMsg}
                </div>
            )}

            {/* ── Two-column body ── */}
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

                {/* RIGHT: Editable form */}
                <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflowY: 'auto', padding: '16px 20px', backgroundColor: 'var(--main-bg)' }}>

                    {/* AI Success Banner */}
                    <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#22c55e' }}>AI วิเคราะห์สำเร็จ ตรวจสอบและแก้ไขข้อมูลด้านล่างได้เลย</span>
                    </div>

                    {/* Store + category */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                            </div>
                            <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>ข้อมูลร้านค้า / ผู้ให้บริการ</span>
                        </div>
                        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={darkLabelStyle}>ชื่อร้านค้า / ผู้ให้บริการ <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>🏪</span>
                                    <input value={store} onChange={e => setStore(e.target.value)} style={{ ...darkInputStyle, paddingLeft: '32px', border: `1px solid ${store ? 'var(--border-color)' : '#ef4444'}` }} placeholder="ชื่อร้านค้า" />
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={darkLabelStyle}>หมวดหมู่ค่าใช้จ่าย</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: ['อาหาร','เดินทาง','ช้อปปิ้ง','อื่นๆ'].includes(category) ? 0 : '8px' }}>
                                    {[
                                        { id: 'อาหาร',    icon: '🍴', color: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                                        { id: 'เดินทาง',  icon: '🚗', color: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                                        { id: 'ช้อปปิ้ง', icon: '🛍️', color: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
                                        { id: 'อื่นๆ',    icon: '✨', color: '#f8fafc', border: '#94a3b8', text: '#475569' },
                                    ].map(cat => {
                                        const active = category === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setCategory(cat.id)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '20px',
                                                    border: `1.5px solid ${active ? cat.border : 'var(--border-color)'}`,
                                                    background: active ? cat.color : 'var(--input-bg)',
                                                    color: active ? cat.text : 'var(--text-muted)',
                                                    fontWeight: active ? '800' : '600',
                                                    fontSize: '0.8rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    boxShadow: active ? `0 0 0 3px ${cat.border}22` : 'none',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {cat.icon} {cat.id}
                                            </button>
                                        );
                                    })}
                                </div>
                                {!['อาหาร','เดินทาง','ช้อปปิ้ง','อื่นๆ'].includes(category) && (
                                    <input
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        style={darkInputStyle}
                                        placeholder="ระบุหมวดหมู่กำหนดเอง"
                                    />
                                )}
                            </div>
                            <div>
                                <label style={darkLabelStyle}>สกุลเงิน</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...darkInputStyle, cursor: 'pointer' }}>
                                    {['THB', 'USD', 'EUR', 'JPY', 'CNY', 'SGD'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Date / time */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>วันเวลา</span>
                        </div>
                        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={darkLabelStyle}>วันที่ <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>📅</span>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...darkInputStyle, paddingLeft: '32px', border: `1px solid ${date ? 'var(--border-color)' : '#ef4444'}` }} />
                                </div>
                            </div>
                            <div>
                                <label style={darkLabelStyle}>เวลา</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>🕐</span>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...darkInputStyle, paddingLeft: '32px' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Line items / Queue list */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                    {isQueueMode ? 'รายการใบเสร็จทั้งหมด' : 'รายการสินค้าและบริการ'}
                                </span>
                                <span style={{ padding: '1px 7px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.7rem', fontWeight: '800' }}>
                                    {isQueueMode ? `${allReceipts!.length} ใบ` : `${items.length} รายการ`}
                                </span>
                            </div>
                            {!isQueueMode && (
                                <button onClick={addItem} style={{ padding: '5px 12px', background: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> เพิ่มรายการ
                                </button>
                            )}
                        </div>

                        {isQueueMode ? (
                            <>
                                {/* Queue mode: one row per receipt */}
                                {!isMobile && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 80px', gap: '6px', padding: '7px 16px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                                        {['#', 'ร้าน / ผู้รับเงิน', 'ยอดเงิน (฿)', 'สถานะ'].map((h, i) => (
                                            <div key={i} style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                                        ))}
                                    </div>
                                )}
                                {allReceipts!.map((r, idx) => {
                                    const rAmt = (r.amount !== undefined ? r.amount : r.totalAmount) || 0;
                                    const isSelected = idx === currentIdx;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setCurrentIdx(idx)}
                                            style={{
                                                display: 'grid', gridTemplateColumns: isMobile ? '1fr 100px' : '28px 1fr 110px 80px',
                                                gap: '6px', padding: '10px 16px', borderBottom: '1px solid var(--border-color)',
                                                alignItems: 'center', cursor: 'pointer',
                                                background: isSelected ? 'rgba(124,58,237,0.06)' : 'transparent',
                                                borderLeft: isSelected ? '3px solid #7c3aed' : '3px solid transparent',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {!isMobile && (
                                                <span style={{ fontSize: '0.78rem', color: isSelected ? '#7c3aed' : '#94a3b8', fontWeight: '700', textAlign: 'center' }}>{idx + 1}</span>
                                            )}
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {r.storeName || 'ไม่ระบุร้านค้า'}
                                                </div>
                                                {isMobile && (
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                                        {new Date(r.extractedData?.date || r.createdAt).toLocaleDateString('th-TH')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: '800', color: isSelected ? '#7c3aed' : '#64748b' }}>
                                                ฿{rAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                            {!isMobile && (
                                                <div style={{ textAlign: 'right' }}>
                                                    {isSelected ? (
                                                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontSize: '0.68rem', fontWeight: '800' }}>● แก้ไข</span>
                                                    ) : (
                                                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '0.68rem', fontWeight: '800' }}>✓ บันทึก</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <>
                                {/* Single mode: show items of current receipt */}
                                {!isMobile && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 96px 34px', gap: '6px', padding: '7px 16px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                                        {['#', 'ชื่อสินค้า / บริการ', 'จำนวน', 'ราคา', ''].map((h, i) => (
                                            <div key={i} style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</div>
                                        ))}
                                    </div>
                                )}
                                {items.map((item, idx) => (
                                    isMobile ? (
                                        <div key={item.id} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {/* Row 1: item name */}
                                            <div onClick={() => openDescModal(item)} style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '0.88rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.description ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                {item.description || 'ชื่อสินค้า/บริการ'}
                                            </div>
                                            {/* Row 2: price | quantity | delete */}
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', paddingLeft: '2px' }}>ราคา</span>
                                                    <input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={{ ...darkInputStyle, padding: '7px 8px', fontSize: '0.88rem', textAlign: 'right' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center', paddingLeft: '2px' }}>จำนวน</span>
                                                    <input type="number" value={item.quantity} min={1} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })} style={{ ...darkInputStyle, padding: '7px 6px', fontSize: '0.88rem', textAlign: 'center', width: '56px' }} />
                                                </div>
                                                <button onClick={() => removeItem(item.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flexShrink: 0 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 96px 34px', gap: '6px', padding: '8px 16px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>{idx + 1}</span>
                                            <input value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="ชื่อสินค้า/บริการ" style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '0.88rem' }} />
                                            <input type="number" value={item.quantity} min={1} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })} style={{ ...darkInputStyle, padding: '7px 6px', fontSize: '0.88rem', textAlign: 'center' }} />
                                            <input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} style={{ ...darkInputStyle, padding: '7px 8px', fontSize: '0.88rem', textAlign: 'right' }} />
                                            <button onClick={() => removeItem(item.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    )
                                ))}
                            </>
                        )}
                    </div>

                    {/* Summary */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white', fontWeight: '900' }}>฿</div>
                            <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>สรุปยอดเงิน</span>
                        </div>
                        <div style={{ padding: '14px 16px' }}>
                            {!isQueueMode && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={darkLabelStyle}>ส่วนลดท้ายบิล (฿)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={{ ...darkInputStyle, color: '#dc2626', fontWeight: '700' }} placeholder="0" />
                                            <button onClick={() => setDiscount(d => Math.max(0, d - 1))} style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={darkLabelStyle}>ภาษีมูลค่าเพิ่ม VAT (฿)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input type="number" value={vat} onChange={e => setVat(parseFloat(e.target.value) || 0)} style={{ ...darkInputStyle, color: '#16a34a', fontWeight: '700' }} placeholder="0" />
                                            <button onClick={() => setVat(v => v + 1)} style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                {isQueueMode && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '10px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>ยอดรวมทุกใบ ({allReceipts!.length} ใบ)</span>
                                        <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>
                                            ฿{allReceipts!.reduce((s, r) => s + ((r.amount !== undefined ? r.amount : r.totalAmount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                {!isQueueMode && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '10px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>ยอดรวมรายการ</span>
                                        <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>฿{calcSubtotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ fontWeight: '900', fontSize: '0.9rem', color: 'var(--text-main)' }}>ยอดสุทธิทั้งหมด</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{currency}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '900', fontSize: '1.6rem', color: '#7c3aed', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                            ฿{isQueueMode
                                                ? allReceipts!.reduce((s, r) => s + ((r.amount !== undefined ? r.amount : r.totalAmount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                                                : calcTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{currency}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '8px' }} />
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ padding: isMobile ? '12px 16px' : '14px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', flexShrink: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: isMobile ? 'stretch' : 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '10px' : '12px' }}>
                {/* Total badge — full width on mobile */}
                <div style={{ padding: '10px 16px', background: 'rgba(124,58,237,0.12)', borderRadius: '10px', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: '8px', order: isMobile ? 0 : 1 }}>
                    <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: '700' }}>ยอดสุทธิ</span>
                    <span style={{ fontSize: isMobile ? '1.1rem' : '1rem', fontWeight: '900', color: '#7c3aed' }}>฿{calcTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Action buttons row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', order: isMobile ? 1 : 0 }}>
                    <button onClick={onClose} style={{ padding: isMobile ? '11px 0' : '10px 22px', width: isMobile ? '100%' : 'auto', flex: isMobile ? '1' : 'none', border: '1.5px solid var(--border-color)', borderRadius: '10px', background: 'var(--surface-hover)', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        ยกเลิก
                    </button>

                    {isQueueMode && hasNext && (
                        <button
                            onClick={() => setCurrentIdx(i => i + 1)}
                            style={{ padding: isMobile ? '11px 0' : '10px 18px', flex: isMobile ? '1' : 'none', border: '1.5px solid var(--border-color)', borderRadius: '10px', background: 'var(--surface-hover)', fontWeight: '700', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            ข้าม
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    )}

                    <button onClick={handleSave} disabled={isSaving || !store || !date} style={{
                        padding: isMobile ? '11px 0' : '11px 24px',
                        flex: isMobile ? '2' : 'none',
                        borderRadius: '10px',
                        background: isSaving || !store || !date ? '#6d28d9' : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                        color: 'white', fontWeight: '800', border: 'none',
                        cursor: isSaving || !store || !date ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem',
                        boxShadow: isSaving ? 'none' : '0 4px 12px rgba(124,58,237,0.4)',
                        opacity: isSaving || !store || !date ? 0.7 : 1,
                    }}>
                        {isSaving ? (
                            <><SpinIcon /> กำลังบันทึก...</>
                        ) : isQueueMode && hasNext ? (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>บันทึก และถัดไป ({currentIdx + 1}/{total})</>
                        ) : (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>บันทึกการแก้ไข</>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile description edit modal */}
        {isMobile && editingDescId && (
            <div onClick={closeDescModal} style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', margin: '0 0 10px' }}>ชื่อสินค้า / บริการ</p>
                    <input autoFocus value={editingDescValue} onChange={e => setEditingDescValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && closeDescModal()} placeholder="ชื่อสินค้า/บริการ" style={{ ...inputStyle, fontSize: '1rem', padding: '12px 14px' }} />
                    <button onClick={closeDescModal} style={{ marginTop: '14px', width: '100%', padding: '12px', borderRadius: '10px', background: '#7c3aed', color: 'white', fontWeight: '800', border: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>ยืนยัน</button>
                </div>
            </div>
        )}
        </>
    );
};

const SpinIcon = () => (
    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default ReceiptDetailSheet;
