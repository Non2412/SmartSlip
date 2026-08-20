"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import Image from 'next/image';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';
import { useSession } from 'next-auth/react';
import { useUserCategories } from '@/lib/useUserCategories';

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

const darkInputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
    fontSize: '0.92rem', outline: 'none', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
    boxSizing: 'border-box' as const,
};
const darkLabelStyle: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em'
};
const zoomBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', borderRadius: '8px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)',
    cursor: 'pointer', transition: 'all 0.15s',
};

const ReceiptDetailSheet = ({ isOpen, onClose, onSuccess, receipt, allReceipts, initialIndex = 0 }: ReceiptDetailSheetProps) => {
    const { updateReceipt, extractFromImage } = useReceipts();
    const { data: session } = useSession();
    const { categoriesWithoutAll } = useUserCategories();
    const isQueueMode = !!(allReceipts && allReceipts.length > 0);

    const [currentIdx, setCurrentIdx] = useState(initialIndex);
    const currentReceipt = isQueueMode ? allReceipts![currentIdx] : receipt;

    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState<'image' | 'form'>('form');
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Reset index when opening / allReceipts changes
    useEffect(() => {
        if (isOpen) {
            setCurrentIdx(initialIndex);
            setActiveTab('form');
        }
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

    // Touch equivalents — mobile browsers don't reliably fire mouse events,
    // so drag-to-pan needs its own touch handlers to work on real phones.
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        setIsDragging(true);
        dragStart.current = { x: t.clientX, y: t.clientY, px: position.x, py: position.y };
    }, [position]);
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        const t = e.touches[0];
        setPosition({ x: dragStart.current.px + t.clientX - dragStart.current.x, y: dragStart.current.py + t.clientY - dragStart.current.y });
    }, [isDragging]);
    const handleTouchEnd = useCallback(() => setIsDragging(false), []);

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

    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

    const handleRecalculate = async () => {
        if (!imageData) return;
        setIsProcessingOCR(true);
        setErrorMsg(null);
        try {
            const proxiedUrl = cleanAndProxyImageUrl(imageData);
            const res = await fetch(proxiedUrl);
            if (!res.ok) {
                throw new Error(`Failed to download image: ${res.statusText}`);
            }
            const blob = await res.blob();
            const file = new File([blob], 'receipt.jpg', { type: blob.type || 'image/jpeg' });

            const userId = session?.user?.id || currentReceipt?.userId || 'user123';
            const result = await extractFromImage(file, userId) as any;

            if (result) {
                const ocrStore = result.store || result.vendor || '';
                const ocrDate = formatToInputDate(result.date || new Date().toISOString());
                const ocrTime = formatToInputTime(result.time || '');
                const ocrCategory = result.category || 'อื่นๆ';
                const ocrPayment = result.method || result.paymentMethod || '';
                const ocrDiscount = typeof result.discount === 'number' ? result.discount : 0;
                const ocrVat = typeof result.vat === 'number' ? result.vat : 0;
                const ocrTaxId = result.taxId || result.tax_id || '';
                const rawItems = result.items;

                setStore(ocrStore);
                setCategory(ocrCategory);
                setDate(ocrDate);
                setTime(ocrTime);
                setPaymentMethod(ocrPayment);
                setTaxId(ocrTaxId);
                setDiscount(ocrDiscount);
                setVat(ocrVat);

                if (Array.isArray(rawItems) && rawItems.length > 0) {
                    setItems(rawItems.map((it: any, idx: number) => ({
                        id: (idx + 1).toString(),
                        description: it.description || '',
                        quantity: it.quantity || 1,
                        unitPrice: it.unitPrice ?? it.unit_price ?? it.amount ?? it.total ?? 0,
                    })));
                } else {
                    const fallbackAmt = parseFloat(result.amount) || 0;
                    setItems([{ id: '1', description: ocrStore, quantity: 1, unitPrice: fallbackAmt }]);
                }
            }
        } catch (err: any) {
            console.error('Recalculate OCR failed:', err);
            setErrorMsg('การคำนวณด้วย AI ล้มเหลว: ' + (err?.message || err));
        } finally {
            setIsProcessingOCR(false);
        }
    };


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

    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [queueUpdates, setQueueUpdates] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setErrorMsg(null);
                setIsSaving(false);
                setShowSummaryModal(false);
                setQueueUpdates({});
            }, 400);
        }
    }, [isOpen]);

    const updateItem = (id: string, updates: Partial<LineItem>) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
    const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
    const calcSubtotal = () => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const calcTotal = () => calcSubtotal() - discount;

    const getCurrentUpdatedReceipt = (): any | null => {
        if (!currentReceipt) return null;
        const grandTotal = calcTotal();
        return {
            ...currentReceipt,
            storeName: store,
            totalAmount: grandTotal,
            extractedData: {
                ...currentReceipt.extractedData,
                date, time, paymentMethod, category, currency,
                vendorTaxId: taxId,
                items,
                summary: { subtotal: calcSubtotal(), discount, vat, total: grandTotal },
            },
        };
    };

    const handleSaveNext = () => {
        if (!store || !date) { setErrorMsg('กรุณาระบุร้านค้าและวันที่'); return; }
        const curUpdated = getCurrentUpdatedReceipt();
        if (curUpdated) {
            const id = curUpdated._id || curUpdated.id || '';
            setQueueUpdates(prev => ({ ...prev, [id]: curUpdated }));
        }
        if (isQueueMode && hasNext) {
            setCurrentIdx(i => i + 1);
        } else {
            setShowSummaryModal(true);
        }
    };

    const handleOpenSummary = () => {
        if (!store || !date) { setErrorMsg('กรุณาระบุร้านค้าและวันที่'); return; }
        const curUpdated = getCurrentUpdatedReceipt();
        if (curUpdated) {
            const id = curUpdated._id || curUpdated.id || '';
            setQueueUpdates(prev => ({ ...prev, [id]: curUpdated }));
        }
        setShowSummaryModal(true);
    };

    const handleFinalConfirmSave = async () => {
        setIsSaving(true);
        setErrorMsg(null);
        try {
            const curUpdated = getCurrentUpdatedReceipt();
            const finalMap = { ...queueUpdates };
            if (curUpdated) {
                const curId = curUpdated._id || curUpdated.id || '';
                finalMap[curId] = curUpdated;
            }

            const receiptsToSave = isQueueMode && allReceipts && allReceipts.length > 0
                ? allReceipts.map(r => {
                    const rId = r._id || r.id || '';
                    return finalMap[rId] || r;
                  })
                : [curUpdated || currentReceipt!];

            for (const r of receiptsToSave) {
                const id = r._id || r.id || '';
                if (id) {
                    // ถ้า status = 'reviewing' ให้เปลี่ยนเป็น 'approved'
                    const updateData = { ...r };
                    if (r.status === 'reviewing') {
                        updateData.status = 'approved';
                    }
                    await updateReceipt(id, updateData);
                    if (onSuccess) onSuccess(id);
                }
            }
            setShowSummaryModal(false);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    const getDisplayReceipt = (r: any) => {
        const rId = r._id || r.id || '';
        if (rId === (currentReceipt?._id || currentReceipt?.id) && getCurrentUpdatedReceipt()) {
            return getCurrentUpdatedReceipt()!;
        }
        return queueUpdates[rId] || r;
    };

    const summaryList = isQueueMode && allReceipts && allReceipts.length > 0 ? allReceipts : (currentReceipt ? [currentReceipt] : []);

    const grandSummaryTotal = summaryList.reduce((sum, r) => {
        const disp = getDisplayReceipt(r);
        const amt = (disp?.totalAmount !== undefined ? disp.totalAmount : disp?.amount) || 0;
        return sum + amt;
    }, 0);

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
            <div style={{ padding: isMobile ? '0 14px' : '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', flexShrink: 0, minHeight: '60px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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
                    <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '700', padding: '4px 8px' }}>ปิด ✕</button>
                </div>
            </div>

            {errorMsg && (
                <div style={{ padding: isMobile ? '10px 14px' : '10px 24px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0 }}>
                    {errorMsg}
                </div>
            )}

            {/* ── Mobile Tabs ── */}
            {isMobile && (
                <div style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid var(--border-color)', 
                    backgroundColor: 'var(--card-bg)',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('image')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            border: 'none',
                            background: 'none',
                            color: activeTab === 'image' ? '#7c3aed' : 'var(--text-muted)',
                            fontWeight: '800',
                            fontSize: '0.88rem',
                            borderBottom: activeTab === 'image' ? '3px solid #7c3aed' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        รูปใบเสร็จ
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('form')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            border: 'none',
                            background: 'none',
                            color: activeTab === 'form' ? '#7c3aed' : 'var(--text-muted)',
                            fontWeight: '800',
                            fontSize: '0.88rem',
                            borderBottom: activeTab === 'form' ? '3px solid #7c3aed' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
                        </svg>
                        แก้ไขข้อมูล ({items.length})
                    </button>
                </div>
            )}

            {/* ── Two-column body ── */}
            <div style={{ display: 'flex', flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
                {/* Top (mobile) / Left (desktop): Image */}
                <div style={{ flexGrow: isMobile ? 1 : 0, flexShrink: isMobile ? 1 : 0, flexBasis: isMobile ? '0%' : '38%', width: isMobile ? '100%' : undefined, height: '100%', borderRight: isMobile ? 'none' : '1px solid #e2e8f0', borderBottom: isMobile ? '1px solid #e2e8f0' : 'none', backgroundColor: '#f8fafc', padding: '16px', display: isMobile ? (activeTab === 'image' ? 'flex' : 'none') : 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                    <div
                        style={{
                            flexGrow: 1, flexShrink: 1, flexBasis: '0%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', position: 'relative', width: '100%', height: '100%', minHeight: isMobile ? '208px' : '300px',
                            cursor: imageData ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none',
                        }}
                        onWheel={imageData ? handleWheel : undefined}
                        onMouseDown={imageData ? handleMouseDown : undefined}
                        onMouseMove={imageData ? handleMouseMove : undefined}
                        onMouseUp={imageData ? handleMouseUp : undefined}
                        onMouseLeave={imageData ? handleMouseUp : undefined}
                        onTouchStart={imageData ? handleTouchStart : undefined}
                        onTouchMove={imageData ? handleTouchMove : undefined}
                        onTouchEnd={imageData ? handleTouchEnd : undefined}
                    >
                        {/* ── Left Navigation Arrow (Image 3) ── */}
                        {isQueueMode && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasPrev) setCurrentIdx(i => i - 1);
                                }}
                                disabled={!hasPrev}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 30,
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    backgroundColor: hasPrev ? 'rgba(30, 41, 59, 0.82)' : 'rgba(30, 41, 59, 0.3)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                                    color: hasPrev ? '#ffffff' : '#94a3b8',
                                    cursor: hasPrev ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                                    backdropFilter: 'blur(6px)',
                                    transition: 'all 0.2s ease',
                                }}
                                title="รูปก่อนหน้า"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"/>
                                </svg>
                            </button>
                        )}

                        {/* ── Right Navigation Arrow (Image 3 & 4) ── */}
                        {isQueueMode && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasNext) setCurrentIdx(i => i + 1);
                                }}
                                disabled={!hasNext}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 30,
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    backgroundColor: hasNext ? 'rgba(30, 41, 59, 0.82)' : 'rgba(30, 41, 59, 0.3)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                                    color: hasNext ? '#ffffff' : '#94a3b8',
                                    cursor: hasNext ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                                    backdropFilter: 'blur(6px)',
                                    transition: 'all 0.2s ease',
                                }}
                                title="รูปถัดไป"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            </button>
                        )}

                        {imageData ? (
                            <Image
                                src={imageData}
                                alt="Receipt"
                                fill
                                unoptimized
                                draggable={false}
                                sizes="(max-width: 768px) 100vw, 38vw"
                                style={{
                                    objectFit: 'contain', borderRadius: '8px', userSelect: 'none',
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                                }}
                            />
                        ) : (
                            <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 12px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                ไม่มีรูปภาพ
                            </div>
                        )}
                    </div>
                    {imageData && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                                title="ซูมออก"
                                style={zoomBtnStyle}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                            </button>
                            <button
                                type="button"
                                onClick={resetView}
                                title="รีเซ็ตมุมมอง"
                                style={{ ...zoomBtnStyle, width: 'auto', padding: '0 10px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))}
                                title="ซูมเข้า"
                                style={zoomBtnStyle}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                title="หมุนภาพ"
                                style={zoomBtnStyle}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
                            </button>
                        </div>
                    )}
                    {imageData && (
                        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                            <button
                                onClick={handleRecalculate}
                                disabled={isProcessingOCR}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '9px 24px', borderRadius: '999px',
                                    border: 'none', cursor: isProcessingOCR ? 'not-allowed' : 'pointer',
                                    background: isProcessingOCR ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: isProcessingOCR ? '#94a3b8' : 'white',
                                    fontSize: '0.85rem', fontWeight: '700',
                                    boxShadow: isProcessingOCR ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isProcessingOCR ? (
                                    <div style={{ width: '14px', height: '14px', border: '2px solid #94a3b8', borderTop: '2px solid #cbd5e1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                    </svg>
                                )}
                                {isProcessingOCR ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ใหม่ด้วย AI'}
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT: Editable form */}
                <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflowY: 'auto', padding: isMobile ? '14px' : '16px 20px', backgroundColor: 'var(--main-bg)', display: isMobile ? (activeTab === 'form' ? 'block' : 'none') : 'block' }}>

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
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                    {categoriesWithoutAll.map(catName => {
                                        let icon = '🏷️';
                                        let color = '#f0fdf4';
                                        let border = '#10b981';
                                        let text = '#047857';

                                        if (catName === 'อาหาร') { icon = '🍴'; color = '#fef3c7'; border = '#f59e0b'; text = '#92400e'; }
                                        else if (catName === 'เดินทาง') { icon = '🚗'; color = '#eff6ff'; border = '#3b82f6'; text = '#1e40af'; }
                                        else if (catName === 'ช้อปปิ้ง') { icon = '🛍️'; color = '#fdf4ff'; border = '#a855f7'; text = '#6b21a8'; }
                                        else if (catName === 'อื่นๆ') { icon = '✨'; color = '#f8fafc'; border = '#94a3b8'; text = '#475569'; }

                                        const active = category === catName;
                                        return (
                                            <button
                                                key={catName}
                                                type="button"
                                                onClick={() => setCategory(catName)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '20px',
                                                    border: `1.5px solid ${active ? border : 'var(--border-color)'}`,
                                                    background: active ? color : 'var(--input-bg)',
                                                    color: active ? text : 'var(--text-muted)',
                                                    fontWeight: active ? '800' : '600',
                                                    fontSize: '0.8rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    boxShadow: active ? `0 0 0 3px ${border}22` : 'none',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {icon} {catName}
                                            </button>
                                        );
                                    })}
                                </div>
                                {!categoriesWithoutAll.includes(category) && (
                                    <input
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        style={darkInputStyle}
                                        placeholder="ระบุหมวดหมู่กำหนดเอง"
                                    />
                                )}
                            </div>
                            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
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

                    {/* Line items */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                    รายการสินค้าและบริการ
                                </span>
                                <span style={{ padding: '1px 7px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.7rem', fontWeight: '800' }}>
                                    {items.length} รายการ
                                </span>
                            </div>
                            <button onClick={addItem} style={{ padding: '5px 12px', background: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> เพิ่มรายการ
                            </button>
                        </div>

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
                                    <input
                                        value={item.description}
                                        onChange={e => updateItem(item.id, { description: e.target.value })}
                                        placeholder="ชื่อสินค้า/บริการ"
                                        style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '0.88rem' }}
                                    />
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
                    </div>

                    {/* Summary */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white', fontWeight: '900' }}>฿</div>
                            <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>สรุปยอดเงิน</span>
                        </div>
                        <div style={{ padding: '14px 16px' }}>
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
                            <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>ยอดรวมรายการ</span>
                                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>฿{calcSubtotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {isQueueMode && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '10px', color: '#2563eb' }}>
                                        <span>ยอดรวมทุกใบที่เลือก ({allReceipts!.length} ใบ)</span>
                                        <span style={{ fontWeight: '700' }}>
                                            ฿{allReceipts!.reduce((s, r) => s + ((r.amount !== undefined ? r.amount : r.totalAmount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
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
                                            ฿{calcTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
            <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Queue thumbnail strip (Transparent style matching theme) */}
                {isQueueMode && (
                    <div style={{
                        background: 'transparent',
                        borderBottom: '1px solid var(--border-color)',
                        padding: isMobile ? '8px 12px' : '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        overflowX: 'auto',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            color: 'var(--text-muted)',
                            paddingRight: '10px',
                            borderRight: '1px solid var(--border-color)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>
                            <span>รูปที่เลือก ({total})</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'thin', padding: '2px 0', width: '100%' }}>
                            {allReceipts!.map((r, idx) => {
                                const img = getImageUrl(r.extractedData?.imageData) || getImageUrl(r.imageURL || r.imageUrl) || null;
                                const isActive = idx === currentIdx;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentIdx(idx)}
                                        style={{
                                            flexShrink: 0,
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            border: isActive ? '2.5px solid #3b82f6' : '1.5px solid var(--border-color)',
                                            boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
                                            cursor: 'pointer',
                                            opacity: isActive ? 1 : 0.5,
                                            transform: isActive ? 'scale(1.06)' : 'scale(1)',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                            position: 'relative',
                                            backgroundColor: 'var(--surface-hover)'
                                        }}
                                        title={`รายการที่ ${idx + 1}: ${r.storeName || 'ไม่ระบุชื่อร้าน'}`}
                                    >
                                        {img ? (
                                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer action bar */}
                <div style={{
                    padding: isMobile ? '12px 16px' : '12px 24px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: isQueueMode && !isMobile ? 'space-between' : 'flex-end',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? '10px' : '12px'
                }}>
                    {isQueueMode && !isMobile && (
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            กำลังแก้ไขรูปที่ <span style={{ color: '#7c3aed', fontWeight: '900' }}>{currentIdx + 1}</span> จาก {total}
                        </div>
                    )}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row', 
                        gap: '8px', 
                        width: '100%',
                        justifyContent: 'flex-end'
                    }}>
                        {/* Main Action Button on top for mobile */}
                        {isMobile && (
                            <button onClick={handleSaveNext} disabled={isSaving || !store || !date} style={{
                                padding: '12px 0',
                                borderRadius: '10px',
                                background: isSaving || !store || !date ? '#6d28d9' : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                                color: 'white', fontWeight: '800', border: 'none',
                                cursor: isSaving || !store || !date ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem',
                                boxShadow: isSaving ? 'none' : '0 4px 12px rgba(124,58,237,0.4)',
                                opacity: isSaving || !store || !date ? 0.7 : 1,
                                width: '100%'
                            }}>
                                {isSaving ? (
                                    <><SpinIcon /> กำลังบันทึก...</>
                                ) : isQueueMode && hasNext ? (
                                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>บันทึก และถัดไป ({currentIdx + 1}/{total})</>
                                ) : (
                                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>สรุปรายการและบันทึก</>
                                )}
                            </button>
                        )}

                        <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: 'flex-end' 
                        }}>
                            <button onClick={onClose} style={{ 
                                padding: isMobile ? '11px 0' : '10px 20px', 
                                flex: isMobile ? '1' : 'none', 
                                border: '1.5px solid var(--border-color)', 
                                borderRadius: '10px', 
                                background: 'var(--surface-hover)', 
                                fontWeight: '700', 
                                cursor: 'pointer', 
                                color: 'var(--text-muted)', 
                                fontSize: '0.85rem' 
                            }}>
                                ยกเลิก
                            </button>

                            {isQueueMode && hasNext && (
                                <>
                                    <button
                                        onClick={() => setCurrentIdx(i => i + 1)}
                                        style={{ 
                                            padding: isMobile ? '11px 0' : '10px 16px', 
                                            flex: isMobile ? '1' : 'none', 
                                            border: '1.5px solid var(--border-color)', 
                                            borderRadius: '10px', 
                                            background: 'var(--surface-hover)', 
                                            fontWeight: '700', 
                                            cursor: 'pointer', 
                                            color: 'var(--text-muted)', 
                                            fontSize: '0.85rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '4px' 
                                        }}
                                    >
                                        ข้าม
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                    </button>
                                    <button
                                        onClick={handleOpenSummary}
                                        style={{ 
                                            padding: isMobile ? '11px 0' : '10px 16px', 
                                            flex: isMobile ? '1' : 'none', 
                                            border: '1.5px solid rgba(124,58,237,0.3)', 
                                            borderRadius: '10px', 
                                            background: 'rgba(124,58,237,0.08)', 
                                            fontWeight: '800', 
                                            cursor: 'pointer', 
                                            color: '#7c3aed', 
                                            fontSize: '0.85rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '4px' 
                                        }}
                                    >
                                        สรุปยอด
                                    </button>
                                </>
                            )}

                            {/* Main Action Button on right for desktop */}
                            {!isMobile && (
                                <button onClick={handleSaveNext} disabled={isSaving || !store || !date} style={{
                                    padding: '11px 24px',
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
                                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>สรุปรายการและบันทึก</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Floating Action Button (FAB) for mobile quick tab switching */}
            {isMobile && imageData && (
                <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'image' ? 'form' : 'image')}
                    style={{
                        position: 'absolute',
                        bottom: '90px',
                        right: '20px',
                        zIndex: 999,
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '56px',
                        height: '56px',
                        boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    title={activeTab === 'image' ? 'แก้ไขข้อมูล' : 'ดูรูปใบเสร็จ'}
                >
                    {activeTab === 'image' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    )}
                </button>
            )}
        </div>

        {/* Mobile description edit modal */}
        {isMobile && editingDescId && (
            <div onClick={closeDescModal} style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--card-bg)', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', margin: '0 0 10px' }}>ชื่อสินค้า / บริการ</p>
                    <input autoFocus value={editingDescValue} onChange={e => setEditingDescValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && closeDescModal()} placeholder="ชื่อสินค้า/บริการ" style={{ ...darkInputStyle, fontSize: '1rem', padding: '12px 14px' }} />
                    <button onClick={closeDescModal} style={{ marginTop: '14px', width: '100%', padding: '12px', borderRadius: '10px', background: '#7c3aed', color: 'white', fontWeight: '800', border: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>ยืนยัน</button>
                </div>
            </div>
        )}

        {/* ── Summary Confirmation Modal ── */}
        {showSummaryModal && (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 3000,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '16px' : '24px',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '580px',
                    maxHeight: '90vh',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(59, 130, 246, 0.08))'
                    }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                            flexShrink: 0
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                สรุปรายการและยอดเงินทั้งหมด
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                โปรดตรวจสอบความถูกต้องของรายการและยอดเงินทั้งหมดก่อนกดบันทึกจริง
                            </p>
                        </div>
                    </div>

                    {/* Body: List of receipts */}
                    <div style={{ padding: '16px 24px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.03em', marginBottom: '4px' }}>
                            รายการใบเสร็จที่รอดำเนินการ ({summaryList.length} รายการ)
                        </div>

                        {summaryList.map((r, idx) => {
                            const disp = getDisplayReceipt(r);
                            if (!disp) return null;
                            const rAmt = (disp.totalAmount !== undefined ? disp.totalAmount : disp.amount) || 0;
                            const rDate = disp.extractedData?.date || disp.createdAt || '';
                            const rCat = disp.extractedData?.category || 'ทั่วไป';

                            return (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'var(--surface-hover)',
                                    border: '1px solid var(--border-color)',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                        <span style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'rgba(124, 58, 237, 0.12)',
                                            color: '#7c3aed',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {disp.storeName || 'ไม่ระบุชื่อร้าน'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                                                <span>📅 {rDate ? new Date(rDate).toLocaleDateString('th-TH') : '-'}</span>
                                                <span>•</span>
                                                <span>🏷️ {rCat}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '0.98rem', fontWeight: '900', color: '#7c3aed' }}>
                                            ฿{rAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total Box */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(59, 130, 246, 0.08))',
                            border: '1.5px solid rgba(124, 58, 237, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    ยอดเงินรวมที่รอดำเนินการทั้งหมด
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    รวมใบเสร็จทั้งหมด {summaryList.length} ใบ
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#7c3aed', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                    ฿{grandSummaryTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>
                                    THB
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setShowSummaryModal(false)}
                                disabled={isSaving}
                                style={{
                                    padding: '11px 20px',
                                    borderRadius: '10px',
                                    border: '1.5px solid var(--border-color)',
                                    background: 'var(--surface-hover)',
                                    color: 'var(--text-main)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    flex: isMobile ? 1 : 'none'
                                }}
                            >
                                ย้อนกลับไปแก้ไข
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalConfirmSave}
                                disabled={isSaving}
                                style={{
                                    padding: '11px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: isSaving ? '#6d28d9' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                                    color: 'white',
                                    fontWeight: '900',
                                    fontSize: '0.88rem',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                                    flex: isMobile ? 2 : 'none'
                                }}
                            >
                                {isSaving ? (
                                    <><SpinIcon /> กำลังบันทึก...</>
                                ) : (
                                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> ยืนยันบันทึกข้อมูลจริง</>
                                )}
                            </button>
                        </div>
                    </div>
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
