import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
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
  .sr-ver-header { padding: 0 16px !important; min-height: 56px !important; }
  .sr-ver-layout { flex-direction: column !important; overflow: auto !important; }
  .sr-ver-img    { flex: none !important; width: 100% !important; height: 240px !important;
                   min-height: unset !important; border-right: none !important;
                   border-bottom: 1px solid #e2e8f0 !important; }
  .sr-ver-form   { padding: 14px 14px !important; overflow-y: auto !important; flex: 1 !important; }
  .sr-ver-footer { padding: 10px 14px !important; flex-wrap: wrap !important; gap: 8px !important; }

  /* Line-items table on verification — collapse to 4-col */
  .sr-tbl-header { display: none !important; }
  .sr-tbl-row    { grid-template-columns: 1fr 44px 84px 32px !important;
                   gap: 5px !important; padding: 7px 12px !important; }
  /* hide row number col on mobile */
  .sr-tbl-row > span:first-child { display: none !important; }
  /* hide subtotal read-only col on mobile (4-col: desc qty price del) */
  .sr-tbl-row > div:nth-child(5) { display: none !important; }

  /* ซ่อน left image panel บนมือถือ — ภาพจะแสดงใน dropzone แทน */
  .sr-left-panel { display: none !important; }

  /* Title + tabs ปรับให้พอดีบนมือถือ */
  .sr-page-title { font-size: 1.05rem !important; white-space: nowrap !important; }
  .sr-tab-btn    { padding: 12px 8px !important; margin-right: 4px !important;
                   font-size: 0.78rem !important; }
}

/* ── Dark mode overrides — force all CSS-variable-based inline styles ── */
[data-theme="dark"] .sr-ver-form {
  background-color: #1e293b !important;
  color: #f1f5f9 !important;
}
[data-theme="dark"] .sr-ver-form > div {
  background: #1e293b !important;
  border-color: #334155 !important;
}
[data-theme="dark"] .sr-ver-form > div > div:first-child {
  background: #334155 !important;
  border-color: #334155 !important;
}
/* Catch elements that use CSS variable strings in inline color */
[data-theme="dark"] .sr-ver-form [style*="--text-main"],
[data-theme="dark"] .sr-content [style*="--text-main"] {
  color: #f1f5f9 !important;
}
[data-theme="dark"] .sr-ver-form [style*="--text-muted"],
[data-theme="dark"] .sr-content [style*="--text-muted"] {
  color: #94a3b8 !important;
}
/* Catch elements that use CSS variable strings in inline background */
[data-theme="dark"] .sr-ver-form [style*="--card-bg"],
[data-theme="dark"] .sr-content [style*="--card-bg"] {
  background-color: #1e293b !important;
  background: #1e293b !important;
}
[data-theme="dark"] .sr-ver-form [style*="--input-bg"],
[data-theme="dark"] .sr-content [style*="--input-bg"] {
  background-color: #1e293b !important;
  background: #1e293b !important;
}
[data-theme="dark"] .sr-ver-form [style*="--surface-color"],
[data-theme="dark"] .sr-content [style*="--surface-color"] {
  background-color: #1e293b !important;
  background: #1e293b !important;
}
[data-theme="dark"] .sr-ver-form [style*="--border-color"],
[data-theme="dark"] .sr-content [style*="--border-color"] {
  border-color: #334155 !important;
}
[data-theme="dark"] .sr-ver-form input,
[data-theme="dark"] .sr-ver-form select,
[data-theme="dark"] .sr-ver-form textarea {
  background-color: #1e293b !important;
  color: #f1f5f9 !important;
  border-color: #334155 !important;
  color-scheme: dark;
}
[data-theme="dark"] .sr-ver-img {
  background: #0f172a !important;
  border-color: #334155 !important;
}
[data-theme="dark"] .sr-content {
  background-color: #0f172a !important;
}
[data-theme="dark"] .sr-content input,
[data-theme="dark"] .sr-content select,
[data-theme="dark"] .sr-content textarea {
  background-color: #1e293b !important;
  color: #f1f5f9 !important;
  border-color: #334155 !important;
  color-scheme: dark;
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

const compressImageFile = (file: File, maxWidth = 1200, quality = 0.7): Promise<{ file: File; base64: string }> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ file, base64: e.target?.result as string });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve({ file, base64: img.src });
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve({ file, base64: img.src });
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    
                    const compressedReader = new FileReader();
                    compressedReader.onload = (ce) => {
                        resolve({
                            file: compressedFile,
                            base64: ce.target?.result as string
                        });
                    };
                    compressedReader.onerror = reject;
                    compressedReader.readAsDataURL(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => {
                resolve({ file, base64: reader.result as string });
            };
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const { data: session } = useSession();
    const user = session?.user;
    const displayName = (session as any)?.lineUserName || user?.name || 'ผู้ใช้';
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const sync = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);


    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<'info' | 'items'>('info');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('manual');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const manualImageRef = useRef<HTMLInputElement>(null);
    const extraFileInputRef = useRef<HTMLInputElement>(null);
    const [extraFiles, setExtraFiles] = useState<{name: string, data: string, type: string}[]>([]);
    const [showDocStrip, setShowDocStrip] = useState(true);
    const [activeDocIndex, setActiveDocIndex] = useState(-1);
    const [fileQueue, setFileQueue] = useState<File[]>([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [queueThumbnails, setQueueThumbnails] = useState<string[]>([]);
    const [queueSummaries, setQueueSummaries] = useState<{shopName: string, amount: string, date: string, thumb: string}[]>([]);
    const savedQueueStatesRef = useRef<Map<number, any>>(new Map());
    const [batchCategory, setBatchCategory] = useState('');
    const ocrGenerationRef = useRef(0);
    const ocrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { createReceipt, updateReceipt, extractFromImage } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [extractedReceiptId, setExtractedReceiptId] = useState<string | null>(null);

    // Simple form states (manual entry)
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [shopName, setShopName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [approver, setApprover] = useState('Nobphanan Katain');
    const [isTaxInvoice, setIsTaxInvoice] = useState(false);
    const [taxInvoiceNo, setTaxInvoiceNo] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Mobile Banking');
    const [mainCategory, setMainCategory] = useState('อื่นๆ');
    const [notes, setNotes] = useState('');
    const [receiptNo, setReceiptNo] = useState('');
    const [vendorTaxId, setVendorTaxId] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [currency, setCurrency] = useState('THB');
    const [manualTime, setManualTime] = useState('');
    const [manualDiscount, setManualDiscount] = useState(0);

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


    const formatInputDate = (dateText?: string) => {
        if (!dateText) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText;
        const slashMatch = dateText.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
        if (slashMatch) {
            const [, day, month] = slashMatch;
            let year = slashMatch[3];
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
                setExtraFiles([]);
                setShowDocStrip(true);
                setActiveDocIndex(-1);
                setFileQueue([]);
                setQueueIndex(0);
                setQueueThumbnails([]);
                setQueueSummaries([]);
                setBatchCategory('');
                savedQueueStatesRef.current.clear();
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
                setExtractedReceiptId(null);
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

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setErrorMsg('กรุณาอัพโหลดไฟล์รูปภาพหรือ PDF เท่านั้น');
            return;
        }
        setErrorMsg(null);
        try {
            const { file: compressedFile, base64 } = await compressImageFile(file);
            setSelectedFile(compressedFile);
            setImage(base64);
            runOCR(compressedFile);
        } catch (err) {
            console.error('Compression failed', err);
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImage(e.target?.result as string);
                runOCR(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleManualImageFile = async (file: File) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setErrorMsg('กรุณาอัพโหลดไฟล์รูปภาพหรือ PDF เท่านั้น');
            return;
        }
        setErrorMsg(null);
        try {
            const { file: compressedFile, base64 } = await compressImageFile(file);
            setSelectedFile(compressedFile);
            setImage(base64);
        } catch (err) {
            console.error('Compression failed', err);
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const runOCR = async (file?: File, generation?: number) => {
        const fileToProcess = file || selectedFile;
        if (!fileToProcess) return;
        if (generation !== undefined && generation !== ocrGenerationRef.current) return;
        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const result = await extractFromImage(fileToProcess, userId ?? '') as any;
            if (generation !== undefined && generation !== ocrGenerationRef.current) return;
            if (result) {
                if (result.id) {
                    setExtractedReceiptId(result.id);
                }
                // ── Shared OCR values ──
                const ocrStore    = result.store || result.vendor || '';
                const ocrDate     = formatInputDate(result.date) || new Date().toISOString().split('T')[0];
                const ocrTime     = result.time || '';
                const ocrCategory = batchCategory || result.category || 'อื่นๆ';
                const ocrPayment  = detectPaymentMethodFromText(result.method || result.paymentMethod);
                const ocrDiscount = typeof result.discount === 'number' ? result.discount : 0;
                const ocrVat      = typeof result.vat === 'number' ? result.vat : 0;
                const ocrTaxId    = result.taxId || result.tax_id || '';
                const ocrAmount   = result.amount?.toString() || '';
                const rawItems    = result.items;

                // ── Populate Verification view ──
                setVerStore(ocrStore);
                setVerCategory(ocrCategory);
                setVerDate(ocrDate);
                setVerTime(ocrTime);
                setVerPaymentMethod(ocrPayment);
                setVerCurrency('THB');
                setVerTaxId(ocrTaxId);
                setVerDiscount(ocrDiscount);
                setVerVat(ocrVat);

                // ── Populate Normal Form (so data is ready when user goes back) ──
                setShopName(ocrStore);
                setDate(ocrDate);
                setManualTime(ocrTime);
                setMainCategory(ocrCategory);
                setPaymentMethod(ocrPayment);
                setAmount(ocrAmount);
                setManualDiscount(ocrDiscount);
                setVendorTaxId(ocrTaxId);

                // ── Build line items for both views ──
                if (Array.isArray(rawItems) && rawItems.length > 0) {
                    setVerItems(rawItems.map((it: any, idx: number) => ({
                        id: (idx + 1).toString(),
                        description: it.description || '',
                        quantity: it.quantity || 1,
                        unitPrice: it.unitPrice ?? it.unit_price ?? it.total ?? 0,
                    })));
                    setExpenseItems(rawItems.map((it: any, idx: number) => {
                        const qty  = it.quantity || 1;
                        const price = it.unitPrice ?? it.unit_price ?? it.total ?? 0;
                        return {
                            id: (idx + 1).toString(),
                            description: it.description || '',
                            type: 'product' as const,
                            category: '',
                            quantity: qty,
                            amount: price,
                            subtotal: qty * price,
                            vat: 0,
                            wht: 0,
                            note: '',
                        };
                    }));
                } else {
                    const fallbackAmt = parseFloat(result.amount) || 0;
                    setVerItems([{ id: '1', description: ocrStore, quantity: 1, unitPrice: fallbackAmt }]);
                    setExpenseItems([{
                        id: '1', description: ocrStore, type: 'product', category: '',
                        quantity: 1, amount: fallbackAmt, subtotal: fallbackAmt, vat: 0, wht: 0, note: '',
                    }]);
                }

                setSuccessMsg('AI วิเคราะห์สำเร็จ ตรวจสอบและแก้ไขข้อมูลด้านล่างได้เลย');
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
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                try {
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: image, userId: userId ?? '' })
                    });
                    const uploadResData = await uploadRes.json();
                    if (uploadResData.success && uploadResData.data?.imageUrl) {
                        finalImageUrl = uploadResData.data.imageUrl;
                    }
                } catch (e) {
                    console.error("Upload failed", e);
                }
            }

            const grandTotal = calcVerTotal();
            const payload = {
                date: verDate,
                time: verTime,
                paymentStatus: 'paid',
                paymentMethod: verPaymentMethod,
                category: verCategory,
                currency: verCurrency,
                vendorTaxId: verTaxId,
                notes: `หมวดหมู่: ${verCategory}`,
                imageData: finalImageUrl || undefined,
                items: verItems,
                summary: {
                    subtotal: calcVerSubtotal(),
                    discount: verDiscount,
                    vat: verVat,
                    total: grandTotal,
                },
            };

            const result = extractedReceiptId
                ? await updateReceipt(extractedReceiptId, {
                    userId: userId ?? '',
                    imageUrl: finalImageUrl || undefined,
                    source: 'web',
                    storeName: verStore,
                    totalAmount: grandTotal,
                    extractedData: payload
                  })
                : await createReceipt({
                    userId: userId ?? '',
                    storeName: verStore,
                    totalAmount: grandTotal,
                    extractedData: payload,
                  }) as any;

            if (result?.success) {
                if (onSuccess) onSuccess();
                const nextIdx = queueIndex + 1;
                if (nextIdx < fileQueue.length) {
                    setQueueSummaries(prev => {
                        const updated = [...prev];
                        updated[queueIndex] = { shopName: verStore, amount: String(grandTotal), date: verDate, thumb: queueThumbnails[queueIndex] || '' };
                        return updated;
                    });
                    const snapshot = { image, shopName: verStore, amount: String(grandTotal), date: verDate, paymentMethod: verPaymentMethod, mainCategory: verCategory, notes: '', manualTime: verTime, manualDiscount: verDiscount, vendorTaxId: verTaxId, vendorAddress: '', currency: verCurrency, receiptNo: '', taxInvoiceNo: '', isTaxInvoice: false, paymentStatus: 'paid' as const, verStore, verCategory, verDate, verTime, verPaymentMethod, verCurrency, verTaxId, verItems, verDiscount, verVat, extractedReceiptId, successMsg, showVerification: true };
                    navigateToQueueIndex(queueIndex, nextIdx, snapshot);
                } else {
                    onClose();
                }
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
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                try {
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: image, userId: userId ?? '' })
                    });
                    const uploadResData = await uploadRes.json();
                    if (uploadResData.success && uploadResData.data?.imageUrl) {
                        finalImageUrl = uploadResData.data.imageUrl;
                    }
                } catch (e) {
                    console.error("Upload failed", e);
                }
            }

            const { subtotal, vat, wht, total } = calculateTotals();
            const finalTotal = parseFloat(amount) || total;
            const payload = {
                date,
                time: manualTime,
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
                imageData: finalImageUrl || undefined,
                items: expenseItems,
                summary: { subtotal: parseFloat(amount) || subtotal, vat, wht, total: finalTotal }
            };

            const result = extractedReceiptId
                ? await updateReceipt(extractedReceiptId, {
                    userId: userId ?? '',
                    imageUrl: finalImageUrl || undefined,
                    source: 'web',
                    storeName: shopName,
                    totalAmount: finalTotal,
                    extractedData: payload
                  })
                : await createReceipt({
                    userId: userId ?? '',
                    storeName: shopName,
                    totalAmount: finalTotal,
                    extractedData: payload
                  }) as any;

            if (result?.success) {
                if (onSuccess) onSuccess();
                const nextIdx = queueIndex + 1;
                if (nextIdx < fileQueue.length) {
                    setQueueSummaries(prev => {
                        const updated = [...prev];
                        updated[queueIndex] = { shopName, amount: String(finalTotal), date, thumb: queueThumbnails[queueIndex] || '' };
                        return updated;
                    });
                    const snapshot = { image, shopName, amount: String(finalTotal), date, paymentMethod, mainCategory, notes, manualTime, manualDiscount, vendorTaxId, vendorAddress, currency, receiptNo, taxInvoiceNo, isTaxInvoice, paymentStatus, verStore, verCategory, verDate, verTime, verPaymentMethod, verCurrency, verTaxId, verItems, verDiscount, verVat, extractedReceiptId, successMsg, showVerification };
                    navigateToQueueIndex(queueIndex, nextIdx, snapshot);
                } else {
                    onClose();
                }
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

    const { subtotal, vat } = calculateTotals();

    const bgMain  = isDark ? '#0f172a' : '#f8fafc';
    const bgCard  = isDark ? '#1e293b' : '#ffffff';
    const bgSect  = isDark ? '#334155' : '#f1f5f9';
    const bgMuted = isDark ? '#1e293b' : '#f8fafc';
    const bgImage = isDark ? '#1e293b' : '#ffffff';
    const bdColor = isDark ? '#334155' : '#e2e8f0';
    const bdLight = isDark ? '#334155' : '#e2e8f0';
    const txMain  = isDark ? '#f1f5f9' : '#1e293b';
    const txMuted = isDark ? '#94a3b8' : '#64748b';
    const txLabel = isDark ? '#94a3b8' : '#64748b';

    const viewingImage = activeDocIndex === -1 ? image : (extraFiles[activeDocIndex]?.data ?? image);
    const viewingFileType = activeDocIndex === -1 ? (selectedFile?.type ?? '') : (extraFiles[activeDocIndex]?.type ?? '');

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: '4px', border: `1px solid ${bdColor}`,
        fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', backgroundColor: bgCard, color: txMain
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '0.85rem', fontWeight: '800', color: txMain, marginBottom: '8px', display: 'block'
    };

    return (
        <>
        {/* Backdrop overlay — dims background when sheet is open */}
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: isOpen ? 'blur(6px)' : 'blur(0px)',
                WebkitBackdropFilter: isOpen ? 'blur(6px)' : 'blur(0px)',
                zIndex: 999,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.5s cubic-bezier(0.4, 0, 0.2, 1), -webkit-backdrop-filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        />
        <div style={{
            position: 'fixed',
            top: 0,
            right: isOpen ? 0 : '-100vw',
            width: selectedFile ? '100vw' : 'min(850px, 100vw)',
            height: '100vh',
            backgroundColor: bgMain,
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

                    {/* ── Header ── */}
                    <div className="sr-ver-header" style={{
                        padding: '0 32px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
                        flexShrink: 0, minHeight: '64px', gap: '16px'
                    }}>
                        {/* Left: back + title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                            <button
                                onClick={() => setShowVerification(false)}
                                style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                                title="กลับ"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ color: 'white', fontWeight: '900', fontSize: '1.05rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    ตรวจสอบและยืนยันข้อมูล
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '2px 0 0', fontWeight: '500' }}>
                                    แก้ไขข้อมูลที่ AI ถอดได้ให้ถูกต้องก่อนบันทึก
                                </p>
                            </div>
                        </div>
                        {/* Right: step pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            {[{ n: '1', label: 'อัปโหลด', done: true }, { n: '2', label: 'ตรวจสอบ', active: true }, { n: '3', label: 'ยืนยัน' }].map((s, i) => (
                                <React.Fragment key={s.n}>
                                    {i > 0 && <div style={{ width: '20px', height: '1px', background: s.active ? '#7c3aed' : '#334155' }} />}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: s.active ? 'rgba(124,58,237,0.25)' : s.done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${s.active ? '#7c3aed' : s.done ? '#22c55e' : 'rgba(255,255,255,0.08)'}` }}>
                                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: s.active ? '#7c3aed' : s.done ? '#22c55e' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900', color: 'white' }}>
                                            {s.done ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : s.n}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: s.active ? '#c4b5fd' : s.done ? '#86efac' : '#475569' }}>{s.label}</span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* ── Alert banner ── */}
                    {successMsg && !errorMsg && (
                        <div style={{ padding: '9px 28px', background: 'linear-gradient(90deg,#f0fdf4,#dcfce7)', borderBottom: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.82rem', fontWeight: '700', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '20px', height: '20px', background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            {successMsg}
                            <span style={{ marginLeft: 'auto', padding: '2px 8px', background: '#bbf7d0', borderRadius: '20px', fontSize: '0.72rem', color: '#166534', fontWeight: '800' }}>AI ✓</span>
                        </div>
                    )}
                    {errorMsg && (
                        <div style={{ padding: '9px 28px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.82rem', fontWeight: '700', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {errorMsg}
                        </div>
                    )}

                    {/* ── Two-column body ── */}
                    <div className="sr-ver-layout" style={{ display: 'flex', flex: 1, overflow: isMobile ? 'auto' : 'hidden', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>

                        {/* ═══ LEFT: Receipt image panel (matches main upload style) ═══ */}
                        <div className="sr-ver-img" style={{ flex: isMobile ? 'none' : '0 0 42%', width: isMobile ? '100%' : undefined, height: isMobile ? '260px' : undefined, borderRight: isMobile ? 'none' : `1px solid ${bdLight}`, borderBottom: isMobile ? `1px solid ${bdLight}` : 'none', background: bgImage, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                            {/* AI confirmed badge */}
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px 0', flexShrink: 0 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '999px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white', letterSpacing: '0.03em' }}>AI วิเคราะห์สำเร็จ</span>
                                </div>
                            </div>

                            {/* Pannable / zoomable image */}
                            <div
                                style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isDraggingImage ? 'grabbing' : 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onWheel={handleWheel}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <div style={{ transition: isDraggingImage ? 'none' : 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', transform: `translate(${position.x}px,${position.y}px) scale(${zoom}) rotate(${rotation}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {image ? (
                                        selectedFile?.type === 'application/pdf' ? (
                                            <embed src={image} type="application/pdf" style={{ width: '80vw', height: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }} />
                                        ) : (
                                            <img src={image} style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '6px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', pointerEvents: 'none' }} alt="Receipt" />
                                        )
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>ไม่มีรูปภาพ</p>
                                        </div>
                                    )}
                                </div>

                                {/* Zoom / Rotate toolbar */}
                                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', background: bgCard, border: `1px solid ${bdColor}`, borderRadius: '4px', padding: '6px 14px', gap: '14px', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
                                    <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', width: '42px', textAlign: 'center', color: txMain }}>{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                    <div style={{ width: '1px', height: '20px', backgroundColor: bdColor }} />
                                    <button onClick={() => setRotation(r => r - 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg></button>
                                    <button onClick={() => setRotation(r => r + 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg></button>
                                    <div style={{ width: '1px', height: '20px', backgroundColor: bdColor }} />
                                    <button onClick={() => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted, display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span style={{ fontSize: '0.82rem' }}>รีเซ็ต</span></button>
                                </div>
                            </div>

                            {/* Queue progress strip (queue mode) */}
                            {fileQueue.length > 1 && (
                                <div style={{ flexShrink: 0, borderTop: `1px solid ${bdLight}`, background: bgCard, padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center' }}>
                                    {queueThumbnails.map((thumb, idx) => (
                                        <div key={idx} style={{ width: '48px', height: '36px', borderRadius: '5px', overflow: 'hidden', border: `2px solid ${idx === queueIndex ? '#0052cc' : bdColor}`, opacity: idx === queueIndex ? 1 : 0.5, flexShrink: 0 }}>
                                            {thumb === 'pdf' ? (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                                            ) : thumb ? (
                                                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', background: bgMuted }} />
                                            )}
                                        </div>
                                    ))}
                                    <span style={{ fontSize: '0.72rem', color: txMuted, fontWeight: '600', flexShrink: 0 }}>{queueIndex + 1} / {fileQueue.length}</span>
                                </div>
                            )}
                        </div>

                        {/* ═══ RIGHT: Editable verification form ═══ */}
                        <div className="sr-ver-form" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', backgroundColor: bgMuted }}>

                            {/* ── Card 1: ข้อมูลร้านค้า ── */}
                            <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, marginBottom: '16px', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>ข้อมูลร้านค้า / ผู้ให้บริการ</span>
                                </div>
                                <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="sr-grid-2">
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ ...labelStyle, color: txLabel }}>ชื่อร้านค้า / ผู้ให้บริการ <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>🏪</span>
                                            <input
                                                value={verStore}
                                                onChange={e => setVerStore(e.target.value)}
                                                style={{ ...inputStyle, paddingLeft: '34px', border: `1px solid ${verStore ? bdColor : '#fca5a5'}`, backgroundColor: verStore ? bgCard : 'rgba(239,68,68,0.08)' }}
                                                placeholder="ชื่อร้านค้าหรือบริษัท"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, color: txLabel }}>สกุลเงิน</label>
                                        <select
                                            value={verCurrency}
                                            onChange={e => setVerCurrency(e.target.value)}
                                            style={{ ...inputStyle, cursor: 'pointer' }}
                                        >
                                            {['THB', 'USD', 'EUR', 'JPY', 'CNY', 'SGD'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── Card 2: วันเวลา & หมวดหมู่ ── */}
                            <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, marginBottom: '16px', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>วันเวลาและหมวดหมู่</span>
                                </div>
                                <div style={{ padding: '16px 18px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="sr-grid-2">
                                        <div>
                                            <label style={{ ...labelStyle, color: txLabel }}>วันที่ในใบเสร็จ <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="date"
                                                value={verDate}
                                                onChange={e => setVerDate(e.target.value)}
                                                style={{ ...inputStyle, border: `1px solid ${verDate ? bdColor : '#fca5a5'}` }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, color: txLabel }}>เวลา</label>
                                            <input type="time" value={verTime} onChange={e => setVerTime(e.target.value)} style={inputStyle} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, color: txLabel }}>หมวดหมู่ค่าใช้จ่าย</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {[
                                                { id: 'อาหาร', icon: '🍴', color: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                                                { id: 'เดินทาง', icon: '🚗', color: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                                                { id: 'ช้อปปิ้ง', icon: '🛍️', color: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
                                                { id: 'อื่นๆ', icon: '✨', color: '#f8fafc', border: '#94a3b8', text: '#475569' },
                                            ].map(cat => {
                                                const active = verCategory === cat.id;
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setVerCategory(cat.id)}
                                                        style={{
                                                            padding: '6px 14px', borderRadius: '20px',
                                                            border: `1.5px solid ${active ? cat.border : bdColor}`,
                                                            background: active ? cat.color : bgCard,
                                                            color: active ? cat.text : txMuted,
                                                            fontWeight: active ? '800' : '600',
                                                            fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                                                            display: 'flex', alignItems: 'center', gap: '5px',
                                                            boxShadow: active ? `0 0 0 3px ${cat.border}22` : 'none'
                                                        }}
                                                    >
                                                        {cat.icon} {cat.id}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* fallback text if not in chips */}
                                        {!['อาหาร','เดินทาง','ช้อปปิ้ง','อื่นๆ'].includes(verCategory) && (
                                            <input
                                                value={verCategory}
                                                onChange={e => setVerCategory(e.target.value)}
                                                style={{ ...inputStyle, marginTop: '10px' }}
                                                placeholder="ระบุหมวดหมู่กำหนดเอง"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Card 3: รายการสินค้า ── */}
                            <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, marginBottom: '16px', overflow: 'hidden' }}>
                                <div style={{ padding: isMobile ? '10px 14px' : '12px 18px', borderBottom: `1px solid ${bdLight}`, background: bgSect, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '8px' : '0' }}>
                                    {/* แถวบน: icon + ชื่อ */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#fff7ed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                        </div>
                                        <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>รายการสินค้าและบริการ</span>
                                        {!isMobile && (
                                            <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.72rem', fontWeight: '800' }}>
                                                {verItems.length} รายการ
                                            </span>
                                        )}
                                    </div>
                                    {/* แถวล่าง (mobile) / ขวา (desktop): badge + ปุ่ม */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        {isMobile && (
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.75rem', fontWeight: '800' }}>
                                                {verItems.length} รายการ
                                            </span>
                                        )}
                                        <button
                                            onClick={addVerItem}
                                            style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(124,58,237,0.35)', marginLeft: isMobile ? 'auto' : undefined }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            เพิ่มรายการ
                                        </button>
                                    </div>
                                </div>

                                {/* Table header */}
                                <div className="sr-tbl-header" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 108px 92px 36px', gap: '8px', padding: '8px 16px', background: bgMuted, borderBottom: `1px solid ${bdLight}` }}>
                                    {['#', 'ชื่อสินค้า / บริการ', 'จำนวน', 'ราคา/หน่วย', 'รวม (฿)', ''].map((h, i) => (
                                        <div key={i} style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textAlign: i >= 4 ? 'right' : i === 2 ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                                    ))}
                                </div>

                                {/* Item rows */}
                                {verItems.length === 0 ? (
                                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/></svg>
                                        <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>ยังไม่มีรายการ — กด "เพิ่มรายการ"</p>
                                    </div>
                                ) : verItems.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className="sr-tbl-row"
                                        style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 108px 92px 36px', gap: '8px', padding: '8px 16px', borderBottom: `1px solid ${bdLight}`, alignItems: 'center', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = bgSect)}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{idx + 1}</span>
                                        <input
                                            value={item.description}
                                            onChange={e => updateVerItem(item.id, { description: e.target.value })}
                                            placeholder="ชื่อสินค้า / บริการ"
                                            style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.85rem' }}
                                        />
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            min={1}
                                            onChange={e => updateVerItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                            style={{ ...inputStyle, padding: '7px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                                        />
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => updateVerItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                            style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                                        />
                                        <div style={{ padding: '7px 10px', background: bgMuted, border: `1px solid ${bdColor}`, borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800', textAlign: 'right', color: txMain, letterSpacing: '-0.02em' }}>
                                            {(item.quantity * item.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </div>
                                        <button
                                            onClick={() => removeVerItem(item.id)}
                                            style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'; (e.currentTarget as HTMLButtonElement).style.color = '#e11d48'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fee2e2'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* ── Card 5: สรุปยอดเงิน ── */}
                            <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>สรุปยอดเงิน</span>
                                </div>
                                <div style={{ padding: '16px 18px' }}>
                                    {/* Discount + VAT inputs */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="sr-grid-2">
                                        <div>
                                            <label style={{ ...labelStyle, color: txLabel }}>ส่วนลดท้ายบิล (฿)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={verDiscount}
                                                    onChange={e => setVerDiscount(parseFloat(e.target.value) || 0)}
                                                    style={{ ...inputStyle, paddingRight: '36px', color: '#ef4444', fontWeight: '700' }}
                                                    placeholder="0.00"
                                                />
                                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#ef4444', fontWeight: '700' }}>−</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, color: txLabel }}>ภาษีมูลค่าเพิ่ม VAT (฿)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={verVat}
                                                    onChange={e => setVerVat(parseFloat(e.target.value) || 0)}
                                                    style={{ ...inputStyle, paddingRight: '36px', color: '#16a34a', fontWeight: '700' }}
                                                    placeholder="0.00"
                                                />
                                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>+</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Totals breakdown */}
                                    <div style={{ background: bgMuted, borderRadius: '10px', padding: '16px', border: `1px solid ${bdLight}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: txMuted, marginBottom: '8px' }}>
                                            <span>ยอดรวมรายการ</span>
                                            <span style={{ fontWeight: '700', color: txMain, fontVariantNumeric: 'tabular-nums' }}>
                                                ฿{calcVerSubtotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {verDiscount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', marginBottom: '8px' }}>
                                                <span>ส่วนลด</span>
                                                <span style={{ fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>−฿{verDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {verVat > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '8px' }}>
                                                <span>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                                <span style={{ fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>+฿{verVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,#e2e8f0,transparent)', margin: '12px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '900', fontSize: '0.95rem', color: txMain }}>ยอดสุทธิทั้งหมด</div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>รวม VAT {verDiscount > 0 ? '/ หักส่วนลดแล้ว' : ''}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '900', fontSize: '1.6rem', color: '#7c3aed', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                                                    ฿{calcVerTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>{verCurrency}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* bottom padding for footer overlap */}
                            <div style={{ height: '16px' }} />
                        </div>
                    </div>

                    {/* ── Footer action bar ── */}
                    <div className="sr-ver-footer" style={{ padding: '14px 28px', borderTop: `1px solid ${bdColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bgCard, flexShrink: 0, gap: '12px' }}>
                        <button
                            onClick={() => setShowVerification(false)}
                            style={{ padding: '10px 22px', border: `1.5px solid ${bdColor}`, borderRadius: '10px', background: bgCard, fontWeight: '700', cursor: 'pointer', color: txMuted, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.88rem', transition: 'all 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.color = txMain; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = bdColor; (e.currentTarget as HTMLButtonElement).style.color = txMuted; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            กลับแก้ไขไฟล์
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* totals mini-badge */}
                            <div style={{ padding: '6px 14px', background: '#f8f4ff', borderRadius: '8px', border: '1px solid #ede9fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '700' }}>ยอดสุทธิ</span>
                                <span style={{ fontSize: '1rem', fontWeight: '900', color: '#5b21b6', fontVariantNumeric: 'tabular-nums' }}>฿{calcVerTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <button
                                onClick={handleVerificationSave}
                                disabled={isSaving || !verStore || !verDate}
                                style={{
                                    padding: '11px 28px', borderRadius: '10px',
                                    background: isSaving || !verStore || !verDate
                                        ? '#a78bfa'
                                        : 'linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)',
                                    color: 'white', fontWeight: '800', border: 'none',
                                    cursor: isSaving || !verStore || !verDate ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '9px',
                                    fontSize: '0.92rem', boxShadow: isSaving ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isSaving ? (
                                    <><LoadingSpinner /> กำลังบันทึก...</>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        ยืนยันและบันทึก
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
            /* ===== NORMAL SHEET VIEW ===== */
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* LEFT SIDE: รูปภาพ (ซ่อนบนมือถือ — ภาพแสดงใน dropzone แทน) */}
                {selectedFile && (
                    <div className="sr-left-panel" style={{
                        flex: '1.2',
                        borderRight: `1px solid ${bdLight}`,
                        background: bgImage,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        height: '100%'
                    }}>
                        {/* Re-analyze button */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px 0', flexShrink: 0 }}>
                            <button
                                onClick={() => runOCR()}
                                disabled={isProcessing}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '9px 20px', borderRadius: '999px',
                                    border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    background: isProcessing ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: isProcessing ? '#94a3b8' : 'white',
                                    fontSize: '0.85rem', fontWeight: '700',
                                    boxShadow: isProcessing ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isProcessing ? (
                                    <div style={{ width: '14px', height: '14px', border: '2px solid #94a3b8', borderTop: '2px solid #cbd5e1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                    </svg>
                                )}
                                {isProcessing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ใหม่ด้วย AI'}
                            </button>
                        </div>

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
                                {viewingImage ? (
                                    viewingFileType === 'application/pdf' ? (
                                        <embed src={viewingImage} type="application/pdf" style={{ width: '80vw', height: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} />
                                    ) : (
                                        <img src={viewingImage} style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', pointerEvents: 'none' }} alt="Receipt" />
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
                                    <p style={{ marginTop: '16px', fontWeight: '700', color: txMain }}>AI กำลังวิเคราะห์ข้อมูล...</p>
                                </div>
                            )}

                            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', background: bgCard, border: `1px solid ${bdColor}`, borderRadius: '4px', padding: '8px 16px', gap: '16px', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 20 }}>
                                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                <span style={{ fontSize: '0.9rem', fontWeight: '500', width: '45px', textAlign: 'center', color: txMain }}>{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
                                <div style={{ width: '1px', height: '20px', backgroundColor: bdColor }} />
                                <button onClick={() => setRotation(r => r - 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg></button>
                                <button onClick={() => setRotation(r => r + 90)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg></button>
                                <div style={{ width: '1px', height: '20px', backgroundColor: bdColor }} />
                                <button onClick={() => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: txMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span style={{ fontSize: '0.85rem' }}>รีเซ็ต</span></button>
                            </div>
                        </div>

                        {/* ── Document Strip ── */}
                        <div style={{ flexShrink: 0, borderTop: `1px solid ${bdLight}`, backgroundColor: bgCard }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: txMain }}>เอกสารรายจ่าย</span>
                                    {!showDocStrip && (
                                        <span style={{ fontSize: '0.75rem', color: txMuted }}>ไฟล์ที่ Paypers อ่าน</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowDocStrip(s => !s)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: txMuted, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {showDocStrip ? 'ซ่อน' : 'แสดงเอกสาร'}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points={showDocStrip ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
                                </button>
                            </div>

                            {showDocStrip && (
                                <div style={{ display: 'flex', gap: '10px', padding: '0 16px 14px', overflowX: 'auto' }}>
                                    {/* Queue thumbnails — one per file */}
                                    {queueThumbnails.map((thumb, idx) => {
                                        const isCurrent = idx === queueIndex;
                                        const isPdf = thumb === 'pdf';
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                if (idx === queueIndex) { setActiveDocIndex(-1); setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); return; }
                                                const snapshot = { image, shopName, amount, date, paymentMethod, mainCategory, notes, manualTime, manualDiscount, vendorTaxId, vendorAddress, currency, receiptNo, taxInvoiceNo, isTaxInvoice, paymentStatus, verStore, verCategory, verDate, verTime, verPaymentMethod, verCurrency, verTaxId, verItems, verDiscount, verVat, extractedReceiptId, successMsg, showVerification };
                                                setActiveDocIndex(-1);
                                                navigateToQueueIndex(queueIndex, idx, snapshot);
                                            }}
                                                style={{ width: '80px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${isCurrent ? '#0052cc' : bdColor}`, boxShadow: isCurrent ? '0 0 0 3px rgba(0,82,204,0.15)' : 'none', transition: 'all 0.15s', position: 'relative', opacity: isCurrent ? 1 : 0.55 }}
                                            >
                                                <div style={{ width: '80px', height: '60px', overflow: 'hidden', background: bgMuted }}>
                                                    {isPdf ? (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#1c1407' : '#fef2f2' }}>
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                        </div>
                                                    ) : thumb ? (
                                                        <img src={thumb} alt={`receipt-${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: '16px', height: '16px', border: `2px solid ${bdColor}`, borderTop: '2px solid #0052cc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: '4px 6px', background: bgCard }}>
                                                    <p style={{ fontSize: '0.65rem', color: isCurrent ? '#0052cc' : txMain, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {isCurrent ? 'Paypers อ่าน' : `ใบที่ ${idx + 1}`}
                                                    </p>
                                                    <p style={{ fontSize: '0.6rem', color: txMuted }}>{isCurrent ? 'กำลังวิเคราะห์' : 'รอดำเนินการ'}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteFromQueue(idx); }}
                                                    style={{ position: 'absolute', top: '3px', right: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                >
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Extra file thumbnails */}
                                    {extraFiles.map((f, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { setActiveDocIndex(idx); setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }}
                                            style={{ width: '80px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${activeDocIndex === idx ? '#0052cc' : bdColor}`, boxShadow: activeDocIndex === idx ? '0 0 0 3px rgba(0,82,204,0.15)' : 'none', transition: 'all 0.15s', position: 'relative' }}
                                        >
                                            <div style={{ width: '80px', height: '60px', overflow: 'hidden', background: bgMuted }}>
                                                {f.type === 'application/pdf' ? (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#1c1407' : '#fef2f2' }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                    </div>
                                                ) : (
                                                    <img src={f.data} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}
                                            </div>
                                            <div style={{ padding: '4px 6px', background: bgCard }}>
                                                <p style={{ fontSize: '0.65rem', color: txMain, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                                                <p style={{ fontSize: '0.6rem', color: txMuted }}>หลักฐาน</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExtraFiles(prev => prev.filter((_, i) => i !== idx));
                                                    if (activeDocIndex === idx) { setActiveDocIndex(-1); setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }
                                                    else if (activeDocIndex > idx) setActiveDocIndex(prev => prev - 1);
                                                }}
                                                style={{ position: 'absolute', top: '3px', right: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add more button */}
                                    <div
                                        onClick={() => extraFileInputRef.current?.click()}
                                        style={{ width: '80px', height: '96px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', border: `1.5px dashed ${bdColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: txMuted, transition: 'all 0.15s' }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                                        <span style={{ fontSize: '0.6rem', fontWeight: '600', textAlign: 'center', lineHeight: 1.3 }}>เพิ่มใบเสร็จ<br/>เข้าคิว</span>
                                    </div>
                                    <input type="file" ref={extraFileInputRef} multiple accept="image/*,.pdf" onChange={handleExtraFileChange} style={{ display: 'none' }} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RIGHT SIDE: ข้อมูล */}
                <div style={{ flex: '1', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: bgMain }}>
                    <div className="sr-header" style={{ padding: '20px 32px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 className="sr-page-title" style={{ fontSize: '1.3rem', fontWeight: '900', color: txMain }}>อัปโหลดใบเสร็จ</h3>
                            {fileQueue.length > 1 && (
                                <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#0052cc', fontSize: '0.78rem', fontWeight: '800' }}>
                                    {queueIndex + 1} / {fileQueue.length}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {fileQueue.length > 1 && queueIndex > 0 && (
                                <button
                                    onClick={() => {
                                        const snapshot = { image, shopName, amount, date, paymentMethod, mainCategory, notes, manualTime, manualDiscount, vendorTaxId, vendorAddress, currency, receiptNo, taxInvoiceNo, isTaxInvoice, paymentStatus, verStore, verCategory, verDate, verTime, verPaymentMethod, verCurrency, verTaxId, verItems, verDiscount, verVat, extractedReceiptId, successMsg, showVerification };
                                        navigateToQueueIndex(queueIndex, queueIndex - 1, snapshot);
                                    }}
                                    style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${bdColor}`, background: bgCard, color: txMuted, fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                    ก่อนหน้า
                                </button>
                            )}
                            {fileQueue.length > 1 && queueIndex < fileQueue.length - 1 && (
                                <button
                                    onClick={() => {
                                        const snapshot = { image, shopName, amount, date, paymentMethod, mainCategory, notes, manualTime, manualDiscount, vendorTaxId, vendorAddress, currency, receiptNo, taxInvoiceNo, isTaxInvoice, paymentStatus, verStore, verCategory, verDate, verTime, verPaymentMethod, verCurrency, verTaxId, verItems, verDiscount, verVat, extractedReceiptId, successMsg, showVerification };
                                        setQueueSummaries(prev => {
                                            const updated = [...prev];
                                            updated[queueIndex] = { shopName, amount, date, thumb: queueThumbnails[queueIndex] || '' };
                                            return updated;
                                        });
                                        navigateToQueueIndex(queueIndex, queueIndex + 1, snapshot);
                                    }}
                                    style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${bdColor}`, background: bgCard, color: txMuted, fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    ถัดไป
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                            )}
                            <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: bgMuted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="sr-tabs" style={{ display: 'flex', borderBottom: `1px solid ${bdLight}`, padding: '0 32px' }}>
                        <button className="sr-tab-btn" onClick={() => setFormTab('info')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'info' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'info' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            ข้อมูลรายจ่าย
                        </button>
                        <button className="sr-tab-btn" onClick={() => setFormTab('items')} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === 'items' ? '3px solid #0052cc' : '3px solid transparent', color: formTab === 'items' ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            รายการใบเสร็จ
                            {(fileQueue.length > 1 ? queueSummaries.length + 1 : expenseItems.filter(i => i.description).length) > 0 && (
                                <span style={{ padding: '1px 7px', borderRadius: '20px', background: formTab === 'items' ? '#eff6ff' : bgSect, border: `1px solid ${formTab === 'items' ? '#bfdbfe' : bdColor}`, color: formTab === 'items' ? '#0052cc' : '#94a3b8', fontSize: '0.72rem', fontWeight: '800' }}>
                                    {fileQueue.length > 1 ? queueSummaries.length + 1 : expenseItems.filter(i => i.description).length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="sr-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 32px', backgroundColor: bgMain }}>
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
                                <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${bdLight}` }}>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>รายจ่ายสำหรับ</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: '900', color: txMain }}>{displayName}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${bdLight}` }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', color: txMain }}>วิธีการอัปโหลดรายจ่าย</h3>
                                    <div className="sr-grid-upload" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div onClick={() => setCreationMethod('upload')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'upload' ? '#0052cc' : bdColor}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'upload' ? 'rgba(0,82,204,0.12)' : bgMain }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${creationMethod === 'upload' ? '#0052cc' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {creationMethod === 'upload' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0052cc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>อัปโหลดไฟล์</div>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>อัปโหลดไฟล์ให้ Paypers อ่าน</p>
                                            </div>
                                        </div>
                                        <div onClick={() => setCreationMethod('manual')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'manual' ? '#0052cc' : bdColor}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'manual' ? 'rgba(0,82,204,0.12)' : bgMain }}>
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
                                            backgroundColor: image ? 'rgba(0,82,204,0.1)' : bgMain,
                                            overflow: 'hidden', padding: image ? '14px' : '0'
                                        }}
                                    >
                                        {isProcessing ? (
                                            /* กำลังวิเคราะห์ AI */
                                            <>
                                                <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                <p style={{ fontSize: '0.88rem', fontWeight: '700', color: txMain }}>AI กำลังวิเคราะห์ข้อมูล...</p>
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
                                <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" />

                                {(creationMethod === 'manual' || (creationMethod === 'upload' && image)) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                        {/* ── Card 1: ข้อมูลร้านค้า ── */}
                                        <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                </div>
                                                <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>ข้อมูลร้านค้า / ผู้ให้บริการ</span>
                                            </div>
                                            <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="sr-grid-2">
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ ...labelStyle, color: txLabel }}>ชื่อร้านค้า / ผู้ให้บริการ <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>🏪</span>
                                                        <input
                                                            value={shopName}
                                                            onChange={e => setShopName(e.target.value)}
                                                            placeholder="ชื่อร้านค้าหรือบริษัท"
                                                            style={{ ...inputStyle, paddingLeft: '34px', border: `1px solid ${shopName ? bdColor : '#fca5a5'}`, backgroundColor: shopName ? bgCard : 'rgba(239,68,68,0.08)' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ ...labelStyle, color: txLabel }}>สกุลเงิน</label>
                                                    <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                                        {['THB', 'USD', 'EUR', 'JPY', 'CNY', 'SGD'].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Card 2: วันเวลาและหมวดหมู่ ── */}
                                        <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                </div>
                                                <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>วันเวลาและหมวดหมู่</span>
                                            </div>
                                            <div style={{ padding: '16px 18px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="sr-grid-2">
                                                    <div>
                                                        <label style={{ ...labelStyle, color: txLabel }}>วันที่ <span style={{ color: '#ef4444' }}>*</span></label>
                                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, border: `1px solid ${date ? bdColor : '#fca5a5'}` }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ ...labelStyle, color: txLabel }}>เวลา</label>
                                                        <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={inputStyle} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, color: txLabel }}>หมวดหมู่ค่าใช้จ่าย</label>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {[
                                                            { id: 'อาหาร',       icon: '🍴', color: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                                                            { id: 'เดินทาง',     icon: '🚗', color: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                                                            { id: 'ช้อปปิ้ง',   icon: '🛍️', color: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
                                                            { id: 'อื่นๆ',      icon: '✨', color: '#f8fafc', border: '#94a3b8', text: '#475569' },
                                                        ].map(cat => {
                                                            const active = mainCategory === cat.id;
                                                            return (
                                                                <button key={cat.id} onClick={() => setMainCategory(cat.id)} style={{
                                                                    padding: '6px 14px', borderRadius: '20px',
                                                                    border: `1.5px solid ${active ? cat.border : bdColor}`,
                                                                    background: active ? cat.color : bgCard,
                                                                    color: active ? cat.text : txMuted,
                                                                    fontWeight: active ? '800' : '600',
                                                                    fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                                    boxShadow: active ? `0 0 0 3px ${cat.border}22` : 'none'
                                                                }}>
                                                                    {cat.icon} {cat.id}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Card 3: จำนวนเงินและหมายเหตุ ── */}
                                        <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                </div>
                                                <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>จำนวนเงินและหมายเหตุ</span>
                                            </div>
                                            <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="sr-grid-2">
                                                <div>
                                                    <label style={{ ...labelStyle, color: txLabel }}>จำนวนเงิน (รวม) <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="number"
                                                            value={amount}
                                                            onChange={e => setAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            style={{ ...inputStyle, paddingRight: '52px', fontWeight: '800', color: '#7c3aed', fontSize: '1.05rem' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8' }}>{currency}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, color: txLabel }}>หมายเหตุ</label>
                                                    <textarea
                                                        value={notes}
                                                        onChange={e => setNotes(e.target.value)}
                                                        placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                                                        style={{ ...inputStyle, height: '44px', resize: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Card 4: รูปภาพหลักฐาน ── */}
                                        <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bgSect }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                    </div>
                                                    <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>รูปภาพหลักฐาน</span>
                                                    <span style={{ fontSize: '0.72rem', color: txMuted, fontWeight: '500' }}>(ไม่บังคับ)</span>
                                                </div>
                                                {image && (
                                                    <button
                                                        onClick={() => { setImage(null); setSelectedFile(null); }}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #fca5a5`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                        ลบรูป
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ padding: '16px 18px' }}>
                                                {image ? (
                                                    /* Preview */
                                                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${bdColor}`, background: bgMuted }}>
                                                        <img
                                                            src={image}
                                                            alt="หลักฐานใบเสร็จ"
                                                            style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                                                        />
                                                        {selectedFile && (
                                                            <div style={{ padding: '8px 14px', borderTop: `1px solid ${bdColor}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgCard }}>
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                                <span style={{ fontSize: '0.75rem', color: txMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                                                                <span style={{ fontSize: '0.68rem', color: txMuted, flexShrink: 0 }}>({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Dropzone */
                                                    <div
                                                        onClick={() => manualImageRef.current?.click()}
                                                        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#22c55e'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(34,197,94,0.06)'; }}
                                                        onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = bdColor; (e.currentTarget as HTMLDivElement).style.background = bgMuted; }}
                                                        onDrop={e => {
                                                            e.preventDefault();
                                                            (e.currentTarget as HTMLDivElement).style.borderColor = bdColor;
                                                            (e.currentTarget as HTMLDivElement).style.background = bgMuted;
                                                            const file = e.dataTransfer.files?.[0];
                                                            if (file) handleManualImageFile(file);
                                                        }}
                                                        style={{ border: `2px dashed ${bdColor}`, borderRadius: '10px', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: bgMuted, transition: 'all 0.2s' }}
                                                    >
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: txMain, margin: '0 0 4px' }}>คลิกเพื่อเลือกรูปหรือลากไฟล์มาวาง</p>
                                                        <p style={{ fontSize: '0.75rem', color: txMuted, margin: 0 }}>รองรับ JPG, PNG, WEBP, PDF</p>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={manualImageRef}
                                                    accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                                                    style={{ display: 'none' }}
                                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleManualImageFile(f); e.target.value = ''; }}
                                                />
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        )}

                        {formTab === 'items' && fileQueue.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {/* ── Batch category selector ── */}
                                <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                        </div>
                                        <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>หมวดหมู่สำหรับทุกใบเสร็จ</span>
                                        {batchCategory && (
                                            <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.72rem', fontWeight: '800' }}>
                                                ใช้งาน: {batchCategory}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ padding: '14px 18px' }}>
                                        <p style={{ fontSize: '0.78rem', color: txMuted, marginBottom: '12px', fontWeight: '500' }}>
                                            เลือกหมวดหมู่เพื่อใช้กับใบเสร็จทุกใบในชุดนี้โดยอัตโนมัติ
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {[
                                                { id: 'อาหาร',    icon: '🍴', color: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                                                { id: 'เดินทาง',  icon: '🚗', color: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                                                { id: 'ช้อปปิ้ง', icon: '🛍️', color: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
                                                { id: 'อื่นๆ',    icon: '✨', color: '#f8fafc', border: '#94a3b8', text: '#475569' },
                                            ].map(cat => {
                                                const active = batchCategory === cat.id;
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const newCat = active ? '' : cat.id;
                                                            setBatchCategory(newCat);
                                                            setVerCategory(newCat);
                                                            setMainCategory(newCat || 'อื่นๆ');
                                                            savedQueueStatesRef.current.forEach((state, idx) => {
                                                                savedQueueStatesRef.current.set(idx, { ...state, verCategory: newCat, mainCategory: newCat || 'อื่นๆ' });
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '7px 16px', borderRadius: '20px',
                                                            border: `1.5px solid ${active ? cat.border : bdColor}`,
                                                            background: active ? cat.color : bgCard,
                                                            color: active ? cat.text : txMuted,
                                                            fontWeight: active ? '800' : '600',
                                                            fontSize: '0.82rem', cursor: 'pointer',
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
                                    </div>
                                </div>

                                <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0052cc" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                                        </div>
                                        <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>สรุปใบเสร็จในชุด</span>
                                        <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#0052cc', fontSize: '0.72rem', fontWeight: '800' }}>{queueSummaries.length + 1} / {fileQueue.length}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '28px 48px 1fr 90px 70px', gap: '8px', padding: '8px 16px', background: bgMuted, borderBottom: `1px solid ${bdLight}` }}>
                                        {['#', '', 'ร้าน / ผู้รับเงิน', 'ยอด (฿)', 'สถานะ'].map((h, i) => (
                                            <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</div>
                                        ))}
                                    </div>
                                    {[...queueSummaries.map((s, i) => ({ ...s, isCurrent: false, idx: i })), { shopName, amount, date, thumb: queueThumbnails[queueIndex] || '', isCurrent: true, idx: queueSummaries.length }].map((row) => (
                                        <div key={row.idx} style={{ display: 'grid', gridTemplateColumns: '28px 48px 1fr 90px 70px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${bdLight}`, alignItems: 'center', background: row.isCurrent ? (isDark ? 'rgba(0,82,204,0.08)' : 'rgba(0,82,204,0.04)') : 'transparent' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8' }}>{row.idx + 1}</span>
                                            <div style={{ width: '40px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${bdColor}`, background: bgMuted, flexShrink: 0 }}>
                                                {row.thumb === 'pdf' ? (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                                                ) : row.thumb ? (
                                                    <img src={row.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '10px', height: '10px', border: `2px solid ${bdColor}`, borderTop: '2px solid #0052cc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.83rem', fontWeight: '700', color: txMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.shopName || (row.isCurrent && isProcessing ? 'กำลังวิเคราะห์...' : '—')}</p>
                                                <p style={{ fontSize: '0.68rem', color: txMuted }}>{row.date}</p>
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: '800', color: row.isCurrent ? '#0052cc' : txMain }}>
                                                {row.amount ? `฿${parseFloat(row.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '—'}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', background: row.isCurrent ? '#eff6ff' : '#f0fdf4', border: `1px solid ${row.isCurrent ? '#bfdbfe' : '#bbf7d0'}`, color: row.isCurrent ? '#0052cc' : '#15803d' }}>
                                                    {row.isCurrent ? 'กำลังดำเนินการ' : 'บันทึกแล้ว'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formTab === 'items' && fileQueue.length <= 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                {/* ── Card: รายการสินค้าและบริการ ── */}
                                <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: isMobile ? '10px 14px' : '12px 18px', borderBottom: `1px solid ${bdLight}`, background: bgSect, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '8px' : '0' }}>
                                        {/* แถวบน: icon + ชื่อ */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#fff7ed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                            </div>
                                            <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>รายการสินค้าและบริการ</span>
                                            {!isMobile && (
                                                <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.72rem', fontWeight: '800' }}>
                                                    {expenseItems.length} รายการ
                                                </span>
                                            )}
                                        </div>
                                        {/* แถวล่าง (mobile) / ขวา (desktop): badge + ปุ่ม */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            {isMobile && (
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '0.75rem', fontWeight: '800' }}>
                                                    {expenseItems.length} รายการ
                                                </span>
                                            )}
                                            <button
                                                onClick={addItem}
                                                style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(124,58,237,0.35)', marginLeft: isMobile ? 'auto' : undefined }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                เพิ่มรายการ
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table header */}
                                    <div className="sr-tbl-header" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 108px 92px 36px', gap: '8px', padding: '8px 16px', background: bgMuted, borderBottom: `1px solid ${bdLight}` }}>
                                        {['#', 'ชื่อสินค้า / บริการ', 'จำนวน', 'ราคา/หน่วย', 'รวม (฿)', ''].map((h, i) => (
                                            <div key={i} style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textAlign: i >= 4 ? 'right' : i === 2 ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                                        ))}
                                    </div>

                                    {/* Item rows */}
                                    {expenseItems.length === 0 ? (
                                        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>ยังไม่มีรายการ — กด "เพิ่มรายการ"</p>
                                        </div>
                                    ) : expenseItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className="sr-tbl-row"
                                            style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 108px 92px 36px', gap: '8px', padding: '8px 16px', borderBottom: `1px solid ${bdLight}`, alignItems: 'center', transition: 'background 0.1s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = bgSect)}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{idx + 1}</span>
                                            <input
                                                value={item.description}
                                                onChange={e => updateItem(item.id, { description: e.target.value })}
                                                placeholder="ชื่อสินค้า / บริการ"
                                                style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.85rem' }}
                                            />
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                min={1}
                                                onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                style={{ ...inputStyle, padding: '7px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                                            />
                                            <input
                                                type="number"
                                                value={item.amount}
                                                onChange={e => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                                style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                                            />
                                            <div style={{ padding: '7px 10px', background: bgMuted, border: `1px solid ${bdColor}`, borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800', textAlign: 'right', color: txMain }}>
                                                {(item.amount * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'; (e.currentTarget as HTMLButtonElement).style.color = '#e11d48'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fee2e2'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Card: สรุปยอดเงิน ── */}
                                <div style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${bdColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${bdLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: bgSect }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                        </div>
                                        <span style={{ fontWeight: '800', fontSize: '0.82rem', color: txMain }}>สรุปยอดเงิน</span>
                                    </div>
                                    <div style={{ padding: '16px 18px' }}>
                                        {/* Discount + VAT inputs */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="sr-grid-2">
                                            <div>
                                                <label style={{ ...labelStyle, color: txLabel }}>ส่วนลดท้ายบิล (฿)</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={manualDiscount}
                                                        onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                                                        style={{ ...inputStyle, paddingRight: '36px', color: '#ef4444', fontWeight: '700' }}
                                                        placeholder="0.00"
                                                    />
                                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#ef4444', fontWeight: '700' }}>−</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ ...labelStyle, color: txLabel }}>ภาษีมูลค่าเพิ่ม VAT (฿)</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={vat}
                                                        readOnly
                                                        style={{ ...inputStyle, paddingRight: '36px', color: '#16a34a', fontWeight: '700', backgroundColor: bgMuted }}
                                                        placeholder="0.00"
                                                    />
                                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>+</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Totals breakdown */}
                                        <div style={{ background: bgMuted, borderRadius: '10px', padding: '16px', border: `1px solid ${bdLight}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: txMuted, marginBottom: '8px' }}>
                                                <span>ยอดรวมรายการ</span>
                                                <span style={{ fontWeight: '700', color: txMain }}>฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            {manualDiscount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', marginBottom: '8px' }}>
                                                    <span>ส่วนลด</span>
                                                    <span style={{ fontWeight: '700' }}>−฿{manualDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {vat > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '8px' }}>
                                                    <span>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                                    <span style={{ fontWeight: '700' }}>+฿{vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,#e2e8f0,transparent)', margin: '12px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '900', fontSize: '0.95rem', color: txMain }}>ยอดสุทธิทั้งหมด</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{currency}{manualDiscount > 0 ? ' / หักส่วนลดแล้ว' : ''}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: '900', fontSize: '1.6rem', color: '#7c3aed', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                                                        ฿{(subtotal - manualDiscount + vat).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>{currency}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                    <div className="sr-footer" style={{ padding: '16px 32px', borderTop: `1px solid ${bdLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bgCard }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: `1.5px solid ${bdColor}`, backgroundColor: bgCard, color: txMuted, fontWeight: '800', cursor: 'pointer' }}>ยกเลิก</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: '800', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                            {isSaving ? <LoadingSpinner /> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> {fileQueue.length > 1 && queueIndex < fileQueue.length - 1 ? `บันทึก และถัดไป (${queueIndex + 1}/${fileQueue.length})` : 'สร้างรายจ่าย'}</>}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
        </>
    );
};

const LoadingSpinner = () => (
    <div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default CreateReceiptSheet;