import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useFlow } from '@/context/FlowContext';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './CreateReceiptSheet.module.css';

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

interface CreateReceiptSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess }: CreateReceiptSheetProps) => {
    const { data: session } = useSession();
    const { setStep } = useFlow();
    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<{ label: string; value: string }[]>([]);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<'info' | 'items'>('info');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('manual');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage, loading: hookLoading, error: hookError } = useReceipts();
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        if (isOpen) {
            setStep(2); // Set to Upload step when opened
        }
        if (!isOpen) {
            // No reset to 1 here because user is still logged in
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
    }, [isOpen, setStep]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
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
        setStep(3); // Set to Processing step
        setErrorMsg(null);

        try {
            const response = await fetch('/api/receipts/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image, userId: session?.user?.id })
            });

            if (response.status === 413) throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป');
            if (!response.ok) throw new Error('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');

            const res = await response.json();
            if (res.success) {
                const data = res.data;
                setExtractedData(data);
                setResults([
                    { label: 'ชื่อร้าน', value: data.store || '-' },
                    { label: 'วันที่', value: data.date ? new Date(data.date).toLocaleDateString('th-TH') : '-' },
                    { label: 'วิธีชำระเงิน', value: data.method || '-' },
                    { label: 'ยอดรวม', value: `฿ ${data.amount ? data.amount.toLocaleString() : '0.00'}` },
                    { label: 'Google Drive', value: data.imageFileId ? 'บันทึกรูปสำเร็จ' : '-' }
                ]);
                setStep(4); // Set to Review step
            } else {
                throw new Error(res.error || 'ข้อผิดพลาดที่ไม่ทราบ');
            }

        } catch (error: any) {
            console.error("❌ ข้อผิดพลาด OCR:", error);
            setErrorMsg(error.message || 'ไม่สามารถติดต่อ OCR Server ได้');
            setResults([]);
            setStep(2); // Fallback to Upload on error
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
                userId: session?.user?.id || '',
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>ลากวางไฟล์ หรือ <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>รองรับไฟล์ JPEG, PNG, WebP, HEIC, PDF</p>
        </div>
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className={styles.backdrop}
                style={{
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}
                onClick={onClose}
            />

            {/* Sidebar Sheet */}
            <div
                className={styles.sheet}
                style={{
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>สร้างใบเสร็จด้วย AI</h2>
                    <button
                        onClick={onClose}
                        className={styles.closeButton}
                    >
                        ✕
                    </button>
                </div>

                <p className={styles.description}>
                    อัปโหลดรูปภาพใบเสร็จของคุณ ระบบจะใช้ <strong>EasyOCR</strong> ในการดึงข้อมูลโดยอัตโนมัติ
                </p>

                {errorMsg && (
                    <div className={styles.errorBox}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Upload Section */}
                <div
                    onClick={() => !image && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={styles.uploadArea}
                    style={{
                        borderColor: isDragging || (image === null && !errorMsg) ? 'var(--primary-color)' : errorMsg ? '#ef4444' : 'var(--border-color)',
                        backgroundColor: isDragging ? 'var(--sidebar-item-active)' : '#f8fafc',
                        cursor: image ? 'default' : 'pointer',
                    }}
                >
                    {image ? (
                        <div className={styles.previewContainer}>
                            <img src={image} alt="Receipt Preview" className={styles.previewImage} />
                            <button
                                onClick={(e) => { e.stopPropagation(); setImage(null); setResults([]); }}
                                className={styles.changeImageButton}
                            >
                                เปลี่ยนรูป
                            </button>
                        </div>
                    ) : (
                        <div className={styles.uploadPlaceholder}>
                            <div className={styles.uploadIcon}>
                                <UploadIcon />
                            </div>
                            <span className={styles.uploadText}>คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง</span>
                            <span className={styles.uploadSubtext}>PNG, JPG, WEBP (ไม่เกิน 10MB)</span>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className={styles.hiddenInput}
                        style={{ display: 'none' }}
                        accept="image/*"
                    />
                </div>

                {/* Action Button */}
                <button
                    onClick={runOCR}
                    disabled={!image || isProcessing}
                    className={styles.actionButton}
                    style={{
                        backgroundColor: image && !isProcessing ? 'var(--primary-color)' : '#94a3b8',
                        cursor: image && !isProcessing ? 'pointer' : 'not-allowed',
                    }}
                >
                    {isProcessing ? (
                        <>
                            <div className={styles.spinner}></div>
                            <span>กำลังประมวลผล...</span>
                        </>
                    ) : (
                        <>
                            <MagicIcon />
                            <span>ประมวลผลด้วย EasyOCR</span>
                        </>
                    )}
                </button>

                {/* Results Section */}
                {results.length > 0 && (
                    <div className={styles.resultsSection}>
                        <h3 className={styles.resultsTitle}>ผลลัพธ์ที่ได้</h3>
                        <div className={styles.resultsList}>
                            {results.map((item, idx) => (
                                <div key={idx} className={styles.resultItem}>
                                    <span className={styles.resultLabel}>{item.label}</span>
                                    <span className={styles.resultValue}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ ...bannerStyle, margin: '16px 0', padding: '12px 16px', background: '#f8fafc' }}>
                            <div style={{ color: '#0052cc' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
                            <span style={{ fontSize: '0.85rem' }}>รายการค่าใช้จ่ายจะถูกบันทึกแยกตามหมวดหมู่เพื่อความสะดวกในการจัดทำรายงานภาษี</span>
                        </div>

                        <button
                            onClick={async () => {
                                setStep(5); // Confirm
                                try {
                                    const saveRes = await fetch('/api/receipts', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            storeName: extractedData?.store || 'ไม่ระบุ',
                                            totalAmount: extractedData?.amount || 0,
                                            userId: session?.user?.id,
                                            extractedData: {
                                                date: extractedData?.date,
                                                method: extractedData?.method,
                                                receiver: extractedData?.receiver,
                                                paymentMethod: extractedData?.method
                                            },
                                            imageFileId: extractedData?.imageFileId
                                        })
                                    });
                                    if (!saveRes.ok) throw new Error('บันทึกข้อมูลไม่สำเร็จ');
                                    
                                    setStep(6); // Done
                                    if (onSuccess) onSuccess();
                                    
                                    setTimeout(() => {
                                        onClose();
                                        setStep(1); 
                                    }, 1500);
                                } catch (error: any) {
                                    console.error('Save error:', error);
                                    setErrorMsg(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
                                    setStep(4);
                                }
                            }}
                            className={styles.saveButton}
                        >
                            บันทึกข้อมูลเข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);

const MagicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
);

export default CreateReceiptSheet;
