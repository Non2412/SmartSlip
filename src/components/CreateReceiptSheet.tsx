import React, { useState, useEffect, useRef } from 'react';
import { useReceipts } from '@/hooks/useReceipts';

// Animations
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
`;

interface CreateReceiptSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    userId: string;
}

type FormTabType = 'header' | 'items' | 'evidence';
type CreationMethod = 'upload' | 'manual';

interface ExpenseItem {
    id: string;
    description: string;
    type: 'product' | 'service';
    category: string;
    quantity: number;
    amount: number; // Unit price
    subtotal: number; // Total for this item before tax
    vat: number;
    wht: number;
    note: string;
}

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<'info' | 'items'>('info');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('manual');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage, loading: hookLoading, error: hookError } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form states - Header (Info)
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
    const [payerName, setPayerName] = useState('Nobphanan Katain');
    const [docType, setDocType] = useState('receipt');
    const [vendorTaxId, setVendorTaxId] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [currency, setCurrency] = useState('THB - Thai Baht (฿)');
    const [editSummaryManually, setEditSummaryManually] = useState(false);

    const detectPaymentMethodFromText = (methodText: string | null | undefined) => {
        if (!methodText) return 'โอน';
        const text = methodText.toString().toLowerCase();
        if (/เงินสด|cash|cashier/.test(text)) return 'เงินสด';
        if (/โอน|transfer|promptpay|prompt pay|บัตร|card|credit|debit/.test(text)) return 'โอน';
        return 'โอน';
    };

    const detectCategoryFromText = (text?: string) => {
        if (!text) return 'อื่นๆ';
        const lower = text.toLowerCase();
        if (/อาหาร|restaurant|ร้านอาหาร|cafe|coffee|eat|food|delivery|foodpanda|grab/i.test(lower)) return 'อาหาร';
        if (/เดินทาง|travel|taxi|grab|uber|bus|train|flight|airline|hotel|ที่พัก|travel|trip/i.test(lower)) return 'เดินทาง';
        if (/shopping|ช้อปปิ้ง|mall|department|fashion|online|shopee|lazada|ร้านค้าทั่วไป|ซื้อของ/i.test(lower)) return 'ช้อปปิ้ง';
        return 'อื่นๆ';
    };

    const formatInputDate = (dateText?: string) => {
        if (!dateText) return '';
        const isoMatch = dateText.match(/^\d{4}-\d{2}-\d{2}$/);
        if (isoMatch) return dateText;

        const slashMatch = dateText.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
        if (slashMatch) {
            let [, day, month, year] = slashMatch;
            if (year.length === 2) {
                year = `20${year}`;
            }
            return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        const parsed = new Date(dateText);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return '';
    };

    const buildNotesFromExtraction = (result: any) => {
        if (!result) return '';
        const parts = [];
        const receiptId = result.receipt_no || result.receiptNo;
        if (receiptId) parts.push(`ใบเสร็จ: ${receiptId}`);
        if (result.method) parts.push(`วิธีชำระ: ${result.method}`);
        if (result.receiver) parts.push(`จาก: ${result.receiver}`);
        return parts.join(' | ');
    };

    // Form states - Items
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

    // Reset state when closing
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
                setEditSummaryManually(false);
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
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDraggingImage(false);
    };

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
        
        if (file.type.startsWith('image/')) {
            setTimeout(() => runOCR(file), 500);
        }
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
            const result = await extractFromImage(fileToProcess, userId) as any;
            if (result) {
                setShopName(result.store || result.receiver || result.shop_name || '');
                setAmount((result.amount ?? result.total_amount ?? '').toString());
                const parsedDate = formatInputDate(result.date || result.transaction_date || result.date_time);
                if (parsedDate) setDate(parsedDate);
                if (result.tax_id) setVendorTaxId(result.tax_id);
                if (result.taxId) setVendorTaxId(result.taxId);
                if (result.address) setVendorAddress(result.address);
                if (result.receipt_no || result.receiptNo) setReceiptNo(result.receipt_no || result.receiptNo);

                setPaymentMethod(detectPaymentMethodFromText(result.method || result.payment_method));
                setMainCategory(detectCategoryFromText(`${result.store || result.receiver || result.shop_name || ''} ${result.method || result.payment_method || ''}`));
                const autoNotes = buildNotesFromExtraction(result);
                if (autoNotes) setNotes(autoNotes);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!shopName || !date) {
            setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนในหน้าข้อมูลรายจ่าย (*)');
            setFormTab('info');
            return;
        }

        setIsSaving(true);
        try {
            const { subtotal, vat, wht, total } = calculateTotals();
            // ใช้จำนวนเงินจากหน้า Info ถ้ามีการระบุไว้ มิฉะนั้นใช้จากรายการสินค้า
            const finalTotal = parseFloat(amount) || total;
            
            await createReceipt({
                userId,
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
                    payerName,
                    vendorTaxId,
                    vendorAddress,
                    currency,
                    items: expenseItems,
                    summary: {
                        subtotal: parseFloat(amount) || subtotal,
                        vat,
                        wht,
                        total: finalTotal
                    }
                }
            });
            setIsSuccess(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 1500);
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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
        if (selectedItemId === id) {
            setSelectedItemId(newItems[0].id);
        }
    };

    const calculateTotals = () => {
        const subtotal = expenseItems.reduce((acc, it) => acc + (it.amount * it.quantity), 0);
        const vat = expenseItems.reduce((acc, it) => acc + it.vat, 0);
        const wht = expenseItems.reduce((acc, it) => acc + it.wht, 0);
        const total = subtotal + vat - wht;
        return { subtotal, vat, wht, total };
    };

    const { subtotal, vat, wht, total } = calculateTotals();

    // Styling Helpers
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#ffffff', color: '#1e293b'
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', display: 'block'
    };
    const bannerStyle: React.CSSProperties = {
        padding: '12px 24px', backgroundColor: '#f8f8f8', color: '#64748b', borderRadius: '4px', marginBottom: '24px', border: '1px solid #f1f1f1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px'
    };

    const selectedItem = expenseItems.find(it => it.id === selectedItemId) || expenseItems[0];

    const SmallDropzone = ({ onClick }: { onClick: () => void }) => (
        <div onClick={onClick} style={{ height: '140px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', backgroundColor: '#fcfcfd' }}>
            <div style={{ color: '#4f46e5' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>ลากวางไฟล์ หรือ <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>รองรับไฟล์ JPEG, PNG, WebP, HEIC, PDF</p>
        </div>
    );

    return (
        <div style={{
            position: 'fixed', 
            top: 0, 
            right: isOpen ? 0 : (selectedFile ? '-100vw' : '-850px'), 
            width: selectedFile ? '100vw' : '850px', 
            height: '100vh', 
            backgroundColor: '#ffffff', 
            zIndex: 1000, 
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
            display: 'flex', 
            flexDirection: 'column', 
            fontFamily: '"Inter", "Sarabun", sans-serif', 
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)'
        }}>
            <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* LEFT SIDE: รูปภาพ (Visible only after selected) */}
                {selectedFile && (
                    <div style={{ 
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
                                        <embed 
                                            src={image} 
                                            type="application/pdf"
                                            style={{ width: '80vw', height: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} 
                                        />
                                    ) : (
                                        <img 
                                            src={image} 
                                            style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', pointerEvents: 'none' }} 
                                            alt="Receipt" 
                                        />
                                    )
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                                        <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>กำลังเตรียมรูปภาพ...</p>
                                    </div>
                                )}
                            </div>

                            {/* Processing Overlay */}
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
                                <button onClick={() => {setZoom(1); setRotation(0); setPosition({x:0, y:0});}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span style={{ fontSize: '0.85rem' }}>รีเซ็ต</span></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RIGHT SIDE: ข้อมูล */}
                <div style={{ 
                    flex: '1', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    backgroundColor: '#ffffff'
                }}>
                    {/* Sheet Header Inside Data Column */}
                    <div style={{ padding: '20px 32px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1e293b' }}>อัปโหลดใบเสร็จ</h3>
                        <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 32px' }}>
                        <button onClick={() => setFormTab('info')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'info' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'info' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            ข้อมูลรายจ่าย
                        </button>
                        <button onClick={() => setFormTab('items')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'items' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'items' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            รายการและสรุปค่าใช้จ่าย
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: '#fcfcfd' }}>
                        {errorMsg && (
                            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                {errorMsg}
                            </div>
                        )}
                        {formTab === 'info' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* รายจ่ายสำหรับ */}
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

                                {/* วิธีการอัปโหลดรายจ่าย */}
                                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>วิธีการอัปโหลดรายจ่าย</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ไม่มีไฟล์อะไรเลย อยากมาบันทึกค่าใช้จ่าย</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Dropzone for Upload Mode */}
                                {creationMethod === 'upload' && (
                                    <div onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '180px', border: '1.5px dashed #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', backgroundColor: '#fcfcfd' }}>
                                        <div style={{ color: '#0052cc' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: '800', fontSize: '1rem' }}>ลากวางไฟล์ หรือ <span style={{ color: '#0052cc', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>รองรับไฟล์ JPEG, PNG, WebP, HEIC, PDF</p>
                                        </div>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" />

                                {/* ข้อมูลรายจ่าย & ข้อมูลผู้ขาย Section - Hidden until upload if in upload mode */}
                                {(creationMethod === 'manual' || (creationMethod === 'upload' && image)) && (
                                    <>
                                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '24px' }}>ข้อมูลรายจ่าย</h3>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    {/* วันที่ออกใบเสร็จ */}
                                                    <div>
                                                        <label style={labelStyle}>วันที่ *</label>
                                                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
                                                    </div>
                                                    {/* หมวดหมู่ */}
                                                    <div>
                                                        <label style={labelStyle}>หมวดหมู่ *</label>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ'].map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    onClick={() => setMainCategory(cat)}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        borderRadius: '20px',
                                                                        border: `1.5px solid ${mainCategory === cat ? '#0052cc' : '#e2e8f0'}`,
                                                                        backgroundColor: mainCategory === cat ? '#f0f7ff' : 'white',
                                                                        color: mainCategory === cat ? '#0052cc' : '#64748b',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.85rem',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}
                                                                >
                                                                    {cat === 'อาหาร' && '🍴'}
                                                                    {cat === 'เดินทาง' && '🚗'}
                                                                    {cat === 'ช้อปปิ้ง' && '🛍️'}
                                                                    {cat === 'อื่นๆ' && '✨'}
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    {/* ผู้ขาย */}
                                                    <div>
                                                        <label style={labelStyle}>ผู้ขาย/ผู้ให้บริการ *</label>
                                                        <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="ระบุชื่อผู้ขาย" style={inputStyle} />
                                                    </div>
                                                    {/* จำนวนเงิน */}
                                                    <div>
                                                        <label style={labelStyle}>จำนวนเงิน (รวม) *</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...inputStyle, paddingRight: '45px', fontWeight: '800', color: '#0052cc', fontSize: '1.1rem' }} />
                                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8' }}>THB</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    {/* ช่องทางชำระเงิน */}
                                                    <div>
                                                        <label style={labelStyle}>ช่องทางชำระเงิน *</label>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            {['โอน', 'เงินสด'].map(method => (
                                                                <button
                                                                    key={method}
                                                                    onClick={() => setPaymentMethod(method)}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '10px',
                                                                        borderRadius: '10px',
                                                                        border: `1.5px solid ${paymentMethod === method ? '#0052cc' : '#e2e8f0'}`,
                                                                        backgroundColor: paymentMethod === method ? '#f0f7ff' : 'white',
                                                                        color: paymentMethod === method ? '#0052cc' : '#64748b',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.9rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '8px',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {method === 'โอน' ? '🏦' : '💵'}
                                                                    {method}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* รายละเอียด */}
                                                    <div>
                                                        <label style={labelStyle}>รายละเอียด *</label>
                                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ระบุรายละเอียดเพิ่มเติม" style={{ ...inputStyle, height: '44px', resize: 'none' }} />
                                                    </div>
                                                </div>


                                            </div>
                                        </div>

                                        {/* ข้อมูลเพิ่มเติมสำหรับใบกำกับภาษี */}
                                        {isTaxInvoice && (
                                            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '24px' }}>ข้อมูลเพิ่มเติมสำหรับใบกำกับภาษี</h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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

                                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', minHeight: '500px' }}>
                                    {/* Left Sidebar: Item List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {expenseItems.map((item, idx) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => setSelectedItemId(item.id)}
                                                style={{ 
                                                    padding: '16px', 
                                                    borderRadius: '10px', 
                                                    border: `2px solid ${selectedItemId === item.id ? '#0052cc' : '#f1f5f9'}`, 
                                                    background: selectedItemId === item.id ? '#f0f7ff' : 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
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

                                    {/* Right Content: Item Details */}
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

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

                                            <div>
                                                <label style={labelStyle}>หมวดหมู่ *</label>
                                                <select value={selectedItem.category} onChange={(e) => updateItem(selectedItemId, { category: e.target.value })} style={inputStyle}>
                                                    <option value="">เลือกหมวดหมู่</option>
                                                    <option value="travel">ค่าเดินทาง</option>
                                                    <option value="office">อุปกรณ์สำนักงาน</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label style={labelStyle}>ยอดชำระ</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.amount * selectedItem.quantity} onChange={(e) => {
                                                            const total = parseFloat(e.target.value) || 0;
                                                            updateItem(selectedItemId, { amount: total / (selectedItem.quantity || 1) });
                                                        }} style={{ ...inputStyle, paddingRight: '40px' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>ยอดรวมก่อนภาษี</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.amount * selectedItem.quantity} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label style={labelStyle}>ภาษีมูลค่าเพิ่ม (VAT)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.vat} onChange={(e) => updateItem(selectedItemId, { vat: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, paddingRight: '40px' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>ภาษีหัก ณ ที่จ่าย (WHT)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={selectedItem.wht} onChange={(e) => updateItem(selectedItemId, { wht: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, paddingRight: '40px' }} />
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

                                {/* สรุปรวมค่าใช้จ่าย */}
                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>สรุปรวมค่าใช้จ่าย</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div onClick={() => setEditSummaryManually(!editSummaryManually)} style={{ width: '40px', height: '22px', background: editSummaryManually ? '#0052cc' : '#cbd5e1', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: editSummaryManually ? '20px' : '2px', transition: 'all 0.2s' }} />
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>แก้ไขยอดรวมด้วยตนเอง</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                                        <div>
                                            <label style={{ ...labelStyle, color: '#64748b' }}>ยอดชำระ</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" value={total.toLocaleString(undefined, { minimumFractionDigits: 2 })} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px', fontWeight: '800' }} />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, color: '#64748b' }}>ยอดรวมก่อนภาษี</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" value={subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px' }} />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, color: '#64748b' }}>ภาษีมูลค่าเพิ่ม (VAT)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" value={vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px' }} />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, color: '#64748b' }}>ภาษีหัก ณ ที่จ่าย (WHT)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" value={wht.toLocaleString(undefined, { minimumFractionDigits: 2 })} readOnly style={{ ...inputStyle, backgroundColor: '#f8fafc', paddingRight: '40px' }} />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>THB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ใบแทนใบเสร็จ */}
                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>ใบแทนใบเสร็จ</h3>
                                        <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> แก้ไขชื่อผู้อนุมัติ
                                        </button>
                                    </div>
                                    <div style={{ padding: '16px', background: '#f0f7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ color: '#0052cc' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
                                        <span style={{ fontSize: '0.9rem', color: '#0052cc', fontWeight: '600' }}>ระบบจะสร้างใบรับรองใบแทนใบเสร็จให้โดยอัตโนมัติ</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>ยกเลิก</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: '800', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                            {isSaving ? <LoadingSpinner /> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> สร้างรายจ่าย</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner = () => (
    <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default CreateReceiptSheet;
