import React, { useState, useEffect, useRef } from 'react';
import { useReceipts } from '@/hooks/useReceipts';

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

/* ===== Responsive ===== */
@media (max-width: 767px) {
  /* Panel header / tabs / content / footer */
  .sr-header  { padding: 14px 16px 0 16px !important; }
  .sr-tabs    { padding: 0 12px !important; }
  .sr-content { padding: 14px 12px !important; }
  .sr-footer  { padding: 12px 16px !important; gap: 8px !important; flex-wrap: wrap !important; }

  /* 2-col → 1-col */
  .sr-grid-2 { grid-template-columns: 1fr !important; gap: 14px !important; }
  /* 3-col → 2-col */
  .sr-grid-3 { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
  /* upload radio cards → 1-col */
  .sr-grid-upload { grid-template-columns: 1fr !important; gap: 10px !important; }
  /* items sidebar + detail → stack */
  .sr-grid-items { grid-template-columns: 1fr !important; min-height: unset !important; }

  /* Verification view */
  .sr-ver-header { padding: 12px 16px !important; }
  .sr-ver-layout { flex-direction: column !important; overflow-y: auto !important; }
  .sr-ver-img    { flex: none !important; height: 200px !important; min-height: unset !important;
                   border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; }
  .sr-ver-form   { padding: 16px !important; }
  .sr-ver-footer { padding: 12px 16px !important; flex-wrap: wrap !important; gap: 8px !important; }

  /* Line-items table on verification */
  .sr-tbl-header { display: none !important; }
  .sr-tbl-row    { grid-template-columns: 1fr 44px 80px 30px !important;
                   gap: 5px !important; padding: 6px 10px !important; }

  /* ซ่อน left image panel บนมือถือ — ภาพจะแสดงใน dropzone แทน */
  .sr-left-panel { display: none !important; }

  /* Title + tabs ปรับให้พอดีบนมือถือ */
  .sr-page-title { font-size: 1.05rem !important; white-space: nowrap !important; }
  .sr-tab-btn    { padding: 12px 8px !important; margin-right: 4px !important;
                   font-size: 0.78rem !important; }
}
`;

interface CreateReceiptSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    userId?: string;
}

type CreationMethod = 'upload' | 'manual';

interface ExpenseItem {
    id: string;
    description: string;
    type: 'product' | 'service';
    category: string;
    quantity: number;
    amount: number;
    subtotal: number;
    vat: number;
    wht: number;
    note: string;
}

interface VerificationLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<'info' | 'items'>('info');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('manual');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Simple form states (manual entry)
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [shopName, setShopName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [approver, setApprover] = useState('Nobphanan Katain');
    const [isTaxInvoice, setIsTaxInvoice] = useState(false);
    const [taxInvoiceNo, setTaxInvoiceNo] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('โอน');
    const [mainCategory, setMainCategory] = useState('อื่นๆ');
    const [notes, setNotes] = useState('');
    const [receiptNo, setReceiptNo] = useState('');
    const [vendorTaxId, setVendorTaxId] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [currency, setCurrency] = useState('THB - Thai Baht (฿)');

    // Verification view states
    const [showVerification, setShowVerification] = useState(false);
    const [verStore, setVerStore] = useState('');
    const [verCategory, setVerCategory] = useState('');
    const [verDate, setVerDate] = useState('');
    const [verTime, setVerTime] = useState('');
    const [verPaymentMethod, setVerPaymentMethod] = useState('');
    const [verCurrency, setVerCurrency] = useState('THB');
    const [verTaxId, setVerTaxId] = useState('');
    const [verItems, setVerItems] = useState<VerificationLineItem[]>([]);
    const [verDiscount, setVerDiscount] = useState(0);
    const [verVat, setVerVat] = useState(0);

    const detectPaymentMethodFromText = (methodText: string | null | undefined) => {
        if (!methodText) return 'Mobile Banking';
        const text = methodText.toString().toLowerCase();
        if (/เงินสด|cash/.test(text)) return 'Cash';
        if (/promptpay|prompt pay|พร้อมเพย์/.test(text)) return 'PromptPay';
        if (/credit/.test(text)) return 'Credit Card';
        if (/debit/.test(text)) return 'Debit Card';
        return 'Mobile Banking';
    };

    const detectCategoryFromText = (text?: string) => {
        if (!text) return 'อื่นๆ';
        const lower = text.toLowerCase();
        if (/อาหาร|restaurant|cafe|coffee|food|delivery|foodpanda|grab/i.test(lower)) return 'อาหาร';
        if (/เดินทาง|travel|taxi|grab|uber|bus|train|flight|airline|hotel/i.test(lower)) return 'เดินทาง';
        if (/shopping|ช้อปปิ้ง|mall|department|shopee|lazada/i.test(lower)) return 'ช้อปปิ้ง';
        return 'อื่นๆ';
    };

    const formatInputDate = (dateText?: string) => {
        if (!dateText) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText;
        const slashMatch = dateText.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
        if (slashMatch) {
            let [, day, month, year] = slashMatch;
            if (year.length === 2) year = `20${year}`;
            return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const parsed = new Date(dateText);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        return '';
    };

    // Verification helpers
    const updateVerItem = (id: string, updates: Partial<VerificationLineItem>) => {
        setVerItems(items => items.map(it => it.id === id ? { ...it, ...updates } : it));
    };
    const removeVerItem = (id: string) => {
        setVerItems(items => items.filter(it => it.id !== id));
    };
    const addVerItem = () => {
        setVerItems(items => [...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
    };
    const calcVerSubtotal = () => verItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const calcVerTotal = () => calcVerSubtotal() - verDiscount + verVat;

    // Item list for manual form
    const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
        { id: '1', description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0, note: '' }
    ]);
    const [selectedItemId, setSelectedItemId] = useState('1');

    // Image viewer states
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setImage(null);
                setSelectedFile(null);
                setIsProcessing(false);
                setIsSaving(false);
                setIsSuccess(false);
                setShopName('');
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setPaymentMethod('โอน');
                setMainCategory('อื่นๆ');
                setNotes('');
                setErrorMsg(null);
                setSuccessMsg(null);
                setFormTab('info');
                setReceiptNo('');
                setVendorTaxId('');
                setVendorAddress('');
                setCreationMethod('manual');
                setZoom(1);
                setRotation(0);
                setPosition({ x: 0, y: 0 });
                setExpenseItems([{ id: '1', description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0, note: '' }]);
                setSelectedItemId('1');
                setPaymentStatus('paid');
                setApprover('Nobphanan Katain');
                setIsTaxInvoice(false);
                setTaxInvoiceNo('');
                // Reset verification
                setShowVerification(false);
                setVerStore('');
                setVerCategory('');
                setVerDate('');
                setVerTime('');
                setVerPaymentMethod('');
                setVerCurrency('THB');
                setVerTaxId('');
                setVerItems([]);
                setVerDiscount(0);
                setVerVat(0);
            }, 400);
        }
    }, [isOpen]);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setZoom(z => Math.min(Math.max(0.1, z + delta), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDraggingImage(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingImage) return;
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDraggingImage(false);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setErrorMsg('กรุณาอัพโหลดไฟล์รูปภาพหรือ PDF เท่านั้น');
            return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImage(e.target?.result as string);
        reader.readAsDataURL(file);
        setErrorMsg(null);
        setTimeout(() => runOCR(file), 500);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const runOCR = async (file?: File) => {
        const fileToProcess = file || selectedFile;
        if (!fileToProcess) return;
        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const result = await extractFromImage(fileToProcess, userId ?? '') as any;
            if (result) {
                // Populate verification form
                setVerStore(result.store || result.vendor || '');
                setVerCategory(result.category || 'Other');
                setVerDate(formatInputDate(result.date) || new Date().toISOString().split('T')[0]);
                setVerTime(result.time || '');
                setVerPaymentMethod(detectPaymentMethodFromText(result.method || result.paymentMethod));
                setVerCurrency('THB');
                setVerTaxId(result.tax_id || result.taxId || '');
                setVerDiscount(typeof result.discount === 'number' ? result.discount : 0);
                setVerVat(typeof result.vat === 'number' ? result.vat : 0);

                const rawItems = result.items;
                if (Array.isArray(rawItems) && rawItems.length > 0) {
                    setVerItems(rawItems.map((it: any, idx: number) => ({
                        id: (idx + 1).toString(),
                        description: it.description || '',
                        quantity: it.quantity || 1,
                        unitPrice: it.unitPrice ?? it.unit_price ?? it.total ?? 0,
                    })));
                } else {
                    setVerItems([{
                        id: '1',
                        description: result.store || '',
                        quantity: 1,
                        unitPrice: parseFloat(result.amount) || 0,
                    }]);
                }

                setSuccessMsg('วิเคราะห์รูปภาพสำเร็จ ตรวจสอบข้อมูลด้านล่างได้เลย');
                setShowVerification(true);
            }
        } catch (err: any) {
            setErrorMsg('ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerificationSave = async () => {
        if (!verStore || !verDate) {
            setErrorMsg('กรุณาระบุร้านค้าและวันที่');
            return;
        }
        setIsSaving(true);
        setErrorMsg(null);
        try {
            const grandTotal = calcVerTotal();
            const result = await createReceipt({
                userId: userId ?? '',
                storeName: verStore,
                totalAmount: grandTotal,
                extractedData: {
                    date: verDate,
                    time: verTime,
                    paymentStatus: 'paid',
                    paymentMethod: verPaymentMethod,
                    category: verCategory,
                    currency: verCurrency,
                    vendorTaxId: verTaxId,
                    notes: `หมวดหมู่: ${verCategory}`,
                    imageData: image,
                    items: verItems,
                    summary: {
                        subtotal: calcVerSubtotal(),
                        discount: verDiscount,
                        vat: verVat,
                        total: grandTotal,
                    },
                },
            }) as any;
            if (result?.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setErrorMsg('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            setErrorMsg('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!shopName || !date) {
            setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ผู้ขาย และ วันที่)');
            setFormTab('info');
            return;
        }
        setIsSaving(true);
        setErrorMsg(null);
        try {
            const { subtotal, vat, wht, total } = calculateTotals();
            const finalTotal = parseFloat(amount) || total;
            const result = await createReceipt({
                userId: userId ?? '',
                storeName: shopName,
                totalAmount: finalTotal,
                extractedData: {
                    date,
                    paymentStatus,
                    paymentMethod,
                    category: mainCategory,
                    approver,
                    isTaxInvoice,
                    taxInvoiceNo,
                    notes,
                    receiptNo,
                    vendorTaxId,
                    vendorAddress,
                    currency,
                    items: expenseItems,
                    summary: { subtotal: parseFloat(amount) || subtotal, vat, wht, total: finalTotal }
                }
            }) as any;
            if (result?.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setErrorMsg('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            setErrorMsg('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSaving(false);
        }
    };

    const updateItem = (id: string, updates: Partial<ExpenseItem>) => {
        setExpenseItems(items => items.map(it => it.id === id ? { ...it, ...updates } : it));
    };

    const addItem = () => {
        const newId = (Date.now()).toString();
        setExpenseItems([...expenseItems, { id: newId, description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0, note: '' }]);
        setSelectedItemId(newId);
    };

    const removeItem = (id: string) => {
        if (expenseItems.length === 1) return;
        const newItems = expenseItems.filter(it => it.id !== id);
        setExpenseItems(newItems);
        if (selectedItemId === id) setSelectedItemId(newItems[0].id);
    };

    const calculateTotals = () => {
        const subtotal = expenseItems.reduce((acc, it) => acc + (it.amount * it.quantity), 0);
        const vat = expenseItems.reduce((acc, it) => acc + it.vat, 0);
        const wht = expenseItems.reduce((acc, it) => acc + it.wht, 0);
        const total = subtotal + vat - wht;
        return { subtotal, vat, wht, total };
    };

    const { subtotal, vat, wht, total } = calculateTotals();

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0',
        fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#ffffff', color: '#1e293b'
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', display: 'block'
    };
    const bannerStyle: React.CSSProperties = {
        padding: '12px 24px', backgroundColor: '#f8f8f8', color: '#64748b', borderRadius: '4px',
        marginBottom: '24px', border: '1px solid #f1f1f1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px'
    };

    const selectedItem = expenseItems.find(it => it.id === selectedItemId) || expenseItems[0];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: isOpen ? 0 : '-100vw',
            width: selectedFile ? '100vw' : 'min(850px, 100vw)',
            height: '100vh',
            backgroundColor: '#ffffff',
            zIndex: 1000,
            overflow: 'hidden',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Inter", "Sarabun", sans-serif',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)'
        }}>
            <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />

            {/* ===== VERIFICATION VIEW ===== */}
            {showVerification ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* Dark header */}
                    <div className="sr-ver-header" style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', flexShrink: 0 }}>
                        <h2 style={{ color: 'white', fontWeight: '900', fontSize: '1.15rem', margin: 0 }}>ตรวจสอบและยืนยันข้อมูลใบเสร็จ</h2>
                        <button onClick={() => setShowVerification(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '700' }}>ยกเลิก</button>
                    </div>

                    {/* Success */}
                    {successMsg && !errorMsg && (
                        <div style={{ padding: '10px 32px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {successMsg}
                        </div>
                    )}
                    {/* Error */}
                    {errorMsg && (
                        <div style={{ padding: '10px 32px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {errorMsg}
                        </div>
                    )}

                    {/* Two-column body */}
                    <div className="sr-ver-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                        {/* Left: Image */}
                        <div className="sr-ver-img" style={{ flex: '0 0 42%', borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#64748b' }}>ภาพถ่ายสลิปใบเสร็จต้นฉบับ</span>
                                {image && (
                                    <button onClick={() => window.open(image!, '_blank')} style={{ color: '#0052cc', fontSize: '0.8rem', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        ดูขนาดจริง ↗
                                    </button>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {image ? (
                                    <img src={image} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                                ) : (
                                    <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>ไม่มีรูปภาพ</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Editable form */}
                        <div className="sr-ver-form" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', backgroundColor: '#ffffff' }}>
                            {/* 2-col grid for main fields */}
                            <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>ร้านค้า / ผู้ให้บริการ</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🏪</span>
                                        <input value={verStore} onChange={e => setVerStore(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} placeholder="ชื่อร้านค้า" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>หมวดหมู่ค่าใช้จ่าย</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🏷️</span>
                                        <input value={verCategory} onChange={e => setVerCategory(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} placeholder="เช่น Utilities, Food" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>วันที่ในใบเสร็จ</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>📅</span>
                                        <input type="date" value={verDate} onChange={e => setVerDate(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>เวลาในใบเสร็จ</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🕐</span>
                                        <input type="time" value={verTime} onChange={e => setVerTime(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>วิธีการชำระเงิน</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>💳</span>
                                        <input value={verPaymentMethod} onChange={e => setVerPaymentMethod(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} placeholder="Mobile Banking" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>สกุลเงิน</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>$</span>
                                        <input value={verCurrency} onChange={e => setVerCurrency(e.target.value)} style={{ ...inputStyle, paddingLeft: '28px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Tax ID */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>เลขประจำตัวผู้เสียภาษีของร้านค้า (TAX ID)</label>
                                <input value={verTaxId} onChange={e => setVerTaxId(e.target.value)} placeholder="เลข 13 หลักของบริษัท (ถ้ามี)" style={inputStyle} />
                            </div>

                            {/* Line items table */}
                            <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h4 style={{ fontWeight: '900', fontSize: '0.95rem', margin: 0 }}>รายการสินค้าและบริการ ({verItems.length})</h4>
                                </div>

                                {/* Header row */}
                                <div className="sr-tbl-header" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px 36px', gap: '8px', padding: '8px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {['รายการ', 'จำนวน', 'ราคา/หน่วย', 'รวม', ''].map((h, i) => (
                                        <div key={i} style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                                    ))}
                                </div>

                                {/* Item rows */}
                                {verItems.map(item => (
                                    <div key={item.id} className="sr-tbl-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px 36px', gap: '8px', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                                        <input
                                            value={item.description}
                                            onChange={e => updateVerItem(item.id, { description: e.target.value })}
                                            placeholder="ชื่อสินค้า/บริการ"
                                            style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.88rem' }}
                                        />
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => {
                                                const q = parseInt(e.target.value) || 1;
                                                updateVerItem(item.id, { quantity: q });
                                            }}
                                            style={{ ...inputStyle, padding: '7px 8px', fontSize: '0.88rem', textAlign: 'center' }}
                                        />
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => updateVerItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                            style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.88rem', textAlign: 'right' }}
                                        />
                                        <div style={{ padding: '7px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '700', textAlign: 'right', color: '#1e293b' }}>
                                            {(item.quantity * item.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </div>
                                        <button
                                            onClick={() => removeVerItem(item.id)}
                                            style={{ background: '#fff1f2', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                ))}

                                {/* Add row */}
                                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={addVerItem}
                                        style={{ padding: '7px 16px', backgroundColor: '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span>+</span> เพิ่มสินค้า
                                    </button>
                                </div>
                            </div>

                            {/* Discount & VAT */}
                            <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>ส่วนลดท้ายบิล</label>
                                    <input type="number" value={verDiscount} onChange={e => setVerDiscount(parseFloat(e.target.value) || 0)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>ภาษีมูลค่าเพิ่ม (VAT)</label>
                                    <input type="number" value={verVat} onChange={e => setVerVat(parseFloat(e.target.value) || 0)} style={inputStyle} />
                                </div>
                            </div>

                            {/* Totals */}
                            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                                    <span>ยอดรวมก่อนหักรายการ:</span>
                                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{calcVerSubtotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', borderTop: '2px solid #e2e8f0', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '900', fontSize: '1.05rem', color: '#1e293b' }}>ยอดสุทธิทั้งหมด:</span>
                                    <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#7c3aed' }}>
                                        {calcVerTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom action bar */}
                    <div className="sr-ver-footer" style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', flexShrink: 0 }}>
                        <button
                            onClick={() => setShowVerification(false)}
                            style={{ padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleVerificationSave}
                            disabled={isSaving}
                            style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: isSaving ? '#a78bfa' : '#7c3aed', color: 'white', fontWeight: '800', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}
                        >
                            {isSaving ? <><LoadingSpinner /> กำลังบันทึก...</> : <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                อนุมัติ & บันทึกตาราง
                            </>}
                        </button>
                    </div>
                </div>
            ) : (
            /* ===== NORMAL SHEET VIEW ===== */
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* LEFT SIDE: รูปภาพ (ซ่อนบนมือถือ — ภาพแสดงใน dropzone แทน) */}
                {selectedFile && (
                    <div className="sr-left-panel" style={{
                        flex: '1.2',
                        borderRight: '1px solid #f1f5f9',
                        background: '#f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        height: '100%'
                    }}>
                        <div
                            style={{
                                flex: 1,
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: isDraggingImage ? 'grabbing' : 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <div style={{
                                transition: isDraggingImage ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {image ? (
                                    selectedFile?.type === 'application/pdf' ? (
                                        <embed src={image} type="application/pdf" style={{ width: '80vw', height: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} />
                                    ) : (
                                        <img src={image} style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', pointerEvents: 'none' }} alt="Receipt" />
                                    )
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                                        <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>กำลังเตรียมรูปภาพ...</p>
                                    </div>
                                )}
                            </div>

                            {isProcessing && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                    <LoadingSpinner />
                                    <p style={{ marginTop: '16px', fontWeight: '700', color: '#1e293b' }}>AI กำลังวิเคราะห์ข้อมูล...</p>
                                </div>
                            )}

                            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 16px', gap: '16px', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 20 }}>
                                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                <span style={{ fontSize: '0.9rem', fontWeight: '500', width: '45px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />
                                <button onClick={() => setRotation(r => r - 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg></button>
                                <button onClick={() => setRotation(r => r + 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg></button>
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />
                                <button onClick={() => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span style={{ fontSize: '0.85rem' }}>รีเซ็ต</span></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RIGHT SIDE: ข้อมูล */}
                <div style={{ flex: '1', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <div className="sr-header" style={{ padding: '20px 32px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="sr-page-title" style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1e293b' }}>อัปโหลดใบเสร็จ</h3>
                        <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="sr-tabs" style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 32px' }}>
                        <button className="sr-tab-btn" onClick={() => setFormTab('info')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'info' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'info' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            ข้อมูลรายจ่าย
                        </button>
                        <button className="sr-tab-btn" onClick={() => setFormTab('items')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'items' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'items' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            รายการและสรุปค่าใช้จ่าย
                        </button>
                    </div>

                    <div className="sr-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 32px', backgroundColor: '#fcfcfd' }}>
                        {successMsg && !errorMsg && (
                            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                {successMsg}
                            </div>
                        )}
                        {errorMsg && (
                            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                {errorMsg}
                            </div>
                        )}
                        {formTab === 'info' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>รายจ่ายสำหรับ</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b' }}>นพนนท์ เกษอินทร์</span>
                                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Nobphanan Katain</span>
                                        </div>
                                        <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> เปลี่ยนธุรกิจ
                                        </button>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>วิธีการอัปโหลดรายจ่าย</h3>
                                    <div className="sr-grid-upload" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div onClick={() => setCreationMethod('upload')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'upload' ? '#0052cc' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'upload' ? '#f0f7ff' : '#fff' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${creationMethod === 'upload' ? '#0052cc' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {creationMethod === 'upload' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0052cc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>อัปโหลดไฟล์</div>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>อัปโหลดไฟล์ให้ Paypers อ่าน</p>
                                            </div>
                                        </div>
                                        <div onClick={() => setCreationMethod('manual')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'manual' ? '#0052cc' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'manual' ? '#f0f7ff' : '#fff' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${creationMethod === 'manual' ? '#0052cc' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {creationMethod === 'manual' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0052cc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>กรอกข้อมูลเอง</div>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ไม่มีไฟล์ อยากบันทึกค่าใช้จ่าย</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {creationMethod === 'upload' && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                                            height: image ? 'auto' : '180px', minHeight: '120px',
                                            border: `1.5px dashed ${image ? '#0052cc' : '#cbd5e1'}`,
                                            borderRadius: '12px', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            gap: '10px', cursor: 'pointer',
                                            backgroundColor: image ? '#f0f7ff' : '#fcfcfd',
                                            overflow: 'hidden', padding: image ? '14px' : '0'
                                        }}
                                    >
                                        {isProcessing ? (
                                            /* กำลังวิเคราะห์ AI */
                                            <>
                                                <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                <p style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>AI กำลังวิเคราะห์ข้อมูล...</p>
                                            </>
                                        ) : image ? (
                                            /* แสดง preview ภาพที่อัปโหลดแล้ว */
                                            <>
                                                <img
                                                    src={image}
                                                    alt="Receipt preview"
                                                    style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', pointerEvents: 'none' }}
                                                />
                                                <span style={{ fontSize: '0.78rem', color: '#0052cc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                    แตะเพื่อเปลี่ยนรูป
                                                </span>
                                            </>
                                        ) : (
                                            /* ยังไม่มีไฟล์ — แสดงปุ่มอัปโหลด */
                                            <>
                                                <div style={{ color: '#0052cc' }}>
                                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                </div>
                                                <div style={{ textAlign: 'center', padding: '0 12px', wordBreak: 'break-word' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>ลากวางไฟล์ หรือ <span style={{ color: '#0052cc', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
                                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>รองรับ JPEG, PNG, WebP, HEIC, PDF</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" />

                                {(creationMethod === 'manual' || (creationMethod === 'upload' && image)) && (
                                    <>
                                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '24px' }}>ข้อมูลรายจ่าย</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div>
                                                        <label style={labelStyle}>วันที่ *</label>
                                                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>หมวดหมู่ *</label>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ'].map(cat => (
                                                                <button key={cat} onClick={() => setMainCategory(cat)} style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${mainCategory === cat ? '#0052cc' : '#e2e8f0'}`, backgroundColor: mainCategory === cat ? '#f0f7ff' : 'white', color: mainCategory === cat ? '#0052cc' : '#64748b', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {cat === 'อาหาร' && '🍴'}{cat === 'เดินทาง' && '🚗'}{cat === 'ช้อปปิ้ง' && '🛍️'}{cat === 'อื่นๆ' && '✨'}
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div>
                                                        <label style={labelStyle}>ผู้ขาย/ผู้ให้บริการ *</label>
                                                        <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="ระบุชื่อผู้ขาย" style={inputStyle} />
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>จำนวนเงิน (รวม) *</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...inputStyle, paddingRight: '45px', fontWeight: '800', color: '#0052cc', fontSize: '1.1rem' }} />
                                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8' }}>THB</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div>
                                                        <label style={labelStyle}>ช่องทางชำระเงิน *</label>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            {['โอน', 'เงินสด'].map(method => (
                                                                <button key={method} onClick={() => setPaymentMethod(method)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${paymentMethod === method ? '#0052cc' : '#e2e8f0'}`, backgroundColor: paymentMethod === method ? '#f0f7ff' : 'white', color: paymentMethod === method ? '#0052cc' : '#64748b', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                                                                    {method === 'โอน' ? '🏦' : '💵'}{method}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>รายละเอียด *</label>
                                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ระบุรายละเอียดเพิ่มเติม" style={{ ...inputStyle, height: '44px', resize: 'none' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {isTaxInvoice && (
                                            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '24px' }}>ข้อมูลเพิ่มเติมสำหรับใบกำกับภาษี</h3>
                                                <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div>
                                                        <label style={labelStyle}>เลขประจำตัวผู้เสียภาษีของผู้ขาย</label>
                                                        <input type="text" value={vendorTaxId} onChange={(e) => setVendorTaxId(e.target.value)} placeholder="เลขประจำตัวผู้เสียภาษี" style={inputStyle} />
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>เลขที่ใบกำกับภาษี</label>
                                                        <input type="text" value={taxInvoiceNo} onChange={(e) => setTaxInvoiceNo(e.target.value)} placeholder="เลขที่ใบกำกับภาษี" style={inputStyle} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {formTab === 'items' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>รายการค่าใช้จ่าย <span style={{ color: '#0052cc', fontSize: '0.9rem', backgroundColor: '#f0f7ff', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>{expenseItems.length} รายการ</span></h3>
                                </div>

                                <div>
                                    <label style={labelStyle}>สกุลเงิน *</label>
                                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                                        <option value="THB - Thai Baht (฿)">THB - Thai Baht (฿)</option>
                                    </select>
                                </div>

                                <div style={{ ...bannerStyle, margin: 0, padding: '12px 16px', background: '#f8fafc' }}>
                                    <div style={{ color: '#0052cc' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
                                    <span style={{ fontSize: '0.85rem' }}>รายการค่าใช้จ่ายจะถูกบันทึกแยกตามหมวดหมู่เพื่อความสะดวกในการจัดทำรายงานภาษี</span>
                                </div>

                                <div className="sr-grid-items" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', minHeight: '500px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {expenseItems.map((item, idx) => (
                                            <div key={item.id} onClick={() => setSelectedItemId(item.id)} style={{ padding: '16px', borderRadius: '10px', border: `2px solid ${selectedItemId === item.id ? '#0052cc' : '#f1f5f9'}`, background: selectedItemId === item.id ? '#f0f7ff' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem', marginBottom: '8px' }}>#{idx + 1} {item.description || 'ไม่มีรายละเอียด'}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                                                    <span>ยอดชำระ</span>
                                                    <span style={{ fontWeight: '700', color: '#1e293b' }}>฿{(item.amount * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addItem} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#0052cc', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center' }}>
                                            เพิ่มรายการค่าใช้จ่าย
                                        </button>
                                    </div>

                                    <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: '900' }}>รายการที่ {expenseItems.findIndex(it => it.id === selectedItemId) + 1}</h4>
                                            <button onClick={() => removeItem(selectedItemId)} style={{ background: '#fff1f2', border: 'none', color: '#e11d48', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div>
                                                <label style={labelStyle}>รายละเอียด *</label>
                                                <input type="text" value={selectedItem.description} onChange={(e) => updateItem(selectedItemId, { description: e.target.value })} placeholder="ชื่อสินค้า/บริการ" style={inputStyle} />
                                            </div>
                                            <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label style={labelStyle}>ประเภท *</label>
                                                    <div style={{ display: 'flex', gap: '16px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                            <input type="radio" checked={selectedItem.type === 'product'} onChange={() => updateItem(selectedItemId, { type: 'product' })} style={{ width: '18px', height: '18px' }} />
                                                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>สินค้า</span>
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                            <input type="radio" checked={selectedItem.type === 'service'} onChange={() => updateItem(selectedItemId, { type: 'service' })} style={{ width: '18px', height: '18px' }} />
                                                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>บริการ</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>จำนวน *</label>
                                                    <input type="number" value={selectedItem.quantity} onChange={(e) => updateItem(selectedItemId, { quantity: parseInt(e.target.value) || 0 })} style={inputStyle} />
                                                </div>
                                            </div>
                                            <div className="sr-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label style={labelStyle}>ยอดชำระ</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.amount * selectedItem.quantity} onChange={(e) => { const t = parseFloat(e.target.value) || 0; updateItem(selectedItemId, { amount: t / (selectedItem.quantity || 1) }); }} style={{ ...inputStyle, paddingRight: '40px' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>ภาษีมูลค่าเพิ่ม (VAT)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.vat} onChange={(e) => updateItem(selectedItemId, { vat: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, paddingRight: '40px' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>หมายเหตุ</label>
                                                <textarea value={selectedItem.note} onChange={(e) => updateItem(selectedItemId, { note: e.target.value })} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" style={{ ...inputStyle, height: '80px', resize: 'none' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: '20px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '24px' }}>สรุปรวมค่าใช้จ่าย</h3>
                                    <div className="sr-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                        {[['ยอดรวม', total], ['ยอดก่อนภาษี', subtotal], ['VAT', vat]].map(([lbl, val]) => (
                                            <div key={lbl as string}>
                                                <label style={{ ...labelStyle, color: '#64748b' }}>{lbl}</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input type="text" value={(val as number).toLocaleString(undefined, { minimumFractionDigits: 2 })} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px', fontWeight: '800' }} />
                                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sr-footer" style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>ยกเลิก</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: '800', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                            {isSaving ? <LoadingSpinner /> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> สร้างรายจ่าย</>}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

const LoadingSpinner = () => (
    <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default CreateReceiptSheet;