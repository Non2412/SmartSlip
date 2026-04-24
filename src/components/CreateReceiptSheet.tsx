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
    amount: number;
    subtotal: number;
    vat: number;
    wht: number;
}

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<FormTabType>('header');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage, loading: hookLoading, error: hookError } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form states - Header
    const [shopName, setShopName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('💵 โอนเงิน');
    const [notes, setNotes] = useState('');
    const [receiptNo, setReceiptNo] = useState('');
    const [payerName, setPayerName] = useState('Nobphanan Katain');
    const [docType, setDocType] = useState('receipt');
    const [vendorTaxId, setVendorTaxId] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [currency, setCurrency] = useState('THB - Thai Baht (฿)');

    // Form states - Items
    const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
        { id: '1', description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0 }
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
                setPaymentMethod('🏦 โอนเงิน');
                setNotes('');
                setErrorMsg(null);
                setFormTab('header');
                setReceiptNo('');
                setVendorTaxId('');
                setVendorAddress('');
                setCreationMethod('upload');
                setZoom(1);
                setRotation(0);
                setPosition({ x: 0, y: 0 });
                setExpenseItems([{ id: '1', description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0 }]);
                setSelectedItemId('1');
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
                setShopName(result.store || result.receiver || '');
                setAmount(result.amount?.toString() || '');
                if (result.date) setDate(new Date(result.date).toISOString().split('T')[0]);
                if (result.tax_id) setVendorTaxId(result.tax_id);
                if (result.address) setVendorAddress(result.address);
                if (result.receipt_no) setReceiptNo(result.receipt_no);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (creationMethod === 'manual' || (creationMethod === 'upload' && image)) {
            if (!shopName || !amount || !date) {
                setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน ในหน้าข้อมูลหัวบิล (*)');
                setFormTab('header');
                return;
            }
        }

        setIsSaving(true);
        try {
            await createReceipt({
                userId,
                storeName: shopName,
                totalAmount: parseFloat(amount || '0'),
                extractedData: {
                    date,
                    paymentMethod,
                    notes,
                    receiptNo,
                    payerName,
                    vendorTaxId,
                    vendorAddress,
                    currency,
                    items: expenseItems
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
        const newId = (expenseItems.length + 1).toString();
        setExpenseItems([...expenseItems, { id: newId, description: '', type: 'product', category: '', quantity: 1, amount: 0, subtotal: 0, vat: 0, wht: 0 }]);
        setSelectedItemId(newId);
    };

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
                        {(['header', 'items', 'evidence'] as FormTabType[]).map((tab) => (
                            <button key={tab} onClick={() => setFormTab(tab)} style={{ padding: '16px 16px', marginRight: '16px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === tab ? '3px solid #0052cc' : '3px solid transparent', color: formTab === tab ? '#0052cc' : '#94a3b8', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                                {tab === 'header' ? 'ข้อมูลหัวบิล' : tab === 'items' ? 'รายการค่าใช้จ่าย' : 'หลักฐานเพิ่มเติม'}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                        {formTab === 'header' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* User Info Section - Refined style */}
                                <div style={{ borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>อัปโหลดใบเสร็จชำระเงินสำหรับ</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>นพนนท์ เกษอินทร์</span>
                                        <span style={{ fontSize: '1rem', color: '#94a3b8', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px' }}>Nobphanan Katain</span>
                                    </div>
                                </div>

                                {/* Creation Method label with underline */}
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '20px', borderBottom: '2.5px solid #0052cc', display: 'inline-block', paddingBottom: '4px' }}>วิธีการสร้างค่าใช้จ่าย</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                                        <div onClick={() => setCreationMethod('upload')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'upload' ? '#0052cc' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'upload' ? '#f0f7ff' : '#fff' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${creationMethod === 'upload' ? '#0052cc' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {creationMethod === 'upload' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0052cc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>อัปโหลดใบเสร็จ</div>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ใบเสร็จรับเงินต้นแบบ</p>
                                            </div>
                                        </div>
                                        <div onClick={() => setCreationMethod('manual')} style={{ padding: '16px', borderRadius: '12px', border: `1.5px solid ${creationMethod === 'manual' ? '#0052cc' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: creationMethod === 'manual' ? '#f0f7ff' : '#fff' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${creationMethod === 'manual' ? '#0052cc' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {creationMethod === 'manual' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0052cc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>ไม่มีใบเสร็จ</div>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>สร้างใบรับรองแทนใบเสร็จ</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Dropzone (Refined Icons/Layout) */}
                                {creationMethod === 'upload' && (
                                    <div onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '180px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', backgroundColor: '#fcfcfd' }}>
                                        <div style={{ color: '#0052cc' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: '800', fontSize: '1rem' }}>ลากวางไฟล์ หรือ <span style={{ color: '#0052cc', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>รองรับไฟล์ JPEG, PNG, WebP, HEIC, PDF</p>
                                        </div>
                                    </div>
                                )}

                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" />

                                {/* Items Count Label */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>รายการค่าใช้จ่าย</h3>
                                    <span style={{ color: '#0052cc', fontSize: '0.9rem', fontWeight: '800' }}>{image ? expenseItems.length : 0} รายการ</span>
                                </div>

                                {/* Info Banner */}
                                <div style={{ ...bannerStyle, margin: 0, padding: '16px', background: '#f8fafc' }}>
                                    <div style={{ color: '#0052cc' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
                                    <span style={{ fontSize: '0.85rem' }}>รายการค่าใช้จ่ายจะถูกบันทึกแยกตามหมวดหมู่เพื่อความสะดวกในการจัดทำรายงานภาษี</span>
                                </div>

                                {/* Receipt Details Form (Only if image is selected or manual) */}
                                {(creationMethod === 'manual' || (creationMethod === 'upload' && image)) && (
                                    <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '20px' }}>
                                         <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '20px' }}>รายละเอียดใบเสร็จ</h3>
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                             <div><label style={labelStyle}>ผู้ขาย/ผู้ให้บริการ *</label><input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="ระบุผู้ขาย" style={inputStyle} /></div>
                                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                 <div><label style={labelStyle}>วันที่ *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></div>
                                                 <div><label style={labelStyle}>ยอดรวม *</label><input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
                                             </div>
                                         </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {formTab === 'items' && (
                            /* Items Tab Content (Refined) */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>รายการค่าใช้จ่าย ({expenseItems.length})</h3>
                                    <button onClick={addItem} style={{ padding: '8px 16px', background: '#f0f7ff', border: 'none', color: '#0052cc', fontWeight: '700', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>+ เพิ่มรายการ</button>
                                </div>
                                
                                {expenseItems.map((item, idx) => (
                                    <div key={item.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '16px', background: selectedItemId === item.id ? '#f8faff' : 'white' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '16px' }}>
                                            <input type="text" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} placeholder="รายละเอียดสินค้า/บริการ" style={inputStyle} />
                                            <input type="number" value={item.amount} onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="ราคา" style={inputStyle} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {formTab === 'evidence' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>หลักฐานเพิ่มเติม</h3>
                                <SmallDropzone onClick={() => evidenceInputRef.current?.click()} />
                                <input type="file" ref={evidenceInputRef} style={{ display: 'none' }} multiple />
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>ยกเลิก</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '10px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: '800', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                            {isSaving ? <LoadingSpinner /> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> เพิ่มใบเสร็จ</>}
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
