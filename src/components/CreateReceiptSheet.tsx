import React, { useState, useEffect, useRef } from 'react';
import { useReceipts } from '@/hooks/useReceipts';

// Add keyframes for the shimmer effect
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
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

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<FormTabType>('header');
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage, loading: hookLoading, error: hookError } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form states
    const [shopName, setShopName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('💵 เงินสด');
    const [category, setCategory] = useState('🍔 อาหารและเครื่องดื่ม');
    const [notes, setNotes] = useState('');
    const [receiptNo, setReceiptNo] = useState('');
    const [payerName, setPayerName] = useState('Nobphanan Katain');
    const [docType, setDocType] = useState('receipt');
    const [itemType, setItemType] = useState<'product' | 'service'>('product');

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
                setPaymentMethod('💵 เงินสด');
                setCategory('🍔 อาหารและเครื่องดื่ม');
                setNotes('');
                setErrorMsg(null);
                setFormTab('header');
                setReceiptNo('');
                setCreationMethod('upload');
            }, 400);
        }
    }, [isOpen]);

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
                // Map API keys to form states
                setShopName(result.store || result.receiver || '');
                setAmount(result.amount?.toString() || '');
                if (result.date) setDate(new Date(result.date).toISOString().split('T')[0]);
                if (result.method) {
                    if (result.method.includes('โอน')) setPaymentMethod('🏦 โอนเงิน');
                    else if (result.method.includes('สด')) setPaymentMethod('💵 เงินสด');
                    else if (result.method.includes('บัตร')) setPaymentMethod('💳 บัตรเครดิต');
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!shopName || !amount || !date) {
            setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน ในหน้าข้อมูลหัวบิล (*)');
            setFormTab('header');
            return;
        }

        setIsSaving(true);
        try {
            await createReceipt({
                userId,
                storeName: shopName,
                totalAmount: parseFloat(amount),
                extractedData: {
                    date,
                    category,
                    paymentMethod,
                    notes,
                    receiptNo,
                    payerName
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

    // Style Helpers
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '1.05rem', outline: 'none', transition: 'all 0.2s ease', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: '500'
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '1rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'block'
    };

    // Icons
    const RotateIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
    );
    const SimpleUploadIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
    );
    const LoadingSpinner = () => (
        <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    );
    const SkeletonField = () => (
        <div style={{ width: '100%', height: '45px', borderRadius: '12px', background: '#f1f5f9', animation: 'shimmer 1.5s infinite linear', position: 'relative', overflow: 'hidden' }} />
    );

    return (
        <div style={{
            position: 'fixed', top: 0, right: isOpen ? 0 : '-100%', width: image ? '95vw' : '850px', maxWidth: '1600px', height: '100%', backgroundColor: '#ffffff', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 1000, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', 'Sarabun', sans-serif"
        }}>
            <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
            
            {isSuccess && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', animation: 'fadeIn 0.5s ease forwards' }}>
                    <div style={{ width: '100px', height: '100px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'white', boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)', animation: 'popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>บันทึกสำเร็จ!</h2>
                    <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '32px' }}>ใบเสร็จของคุณถูกบันทึกและจัดเก็บเรียบร้อยแล้ว</p>
                    <button onClick={onClose} style={{ padding: '16px 48px', backgroundColor: '#1e293b', color: 'white', borderRadius: '16px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>กลับหน้าหลัก</button>
                </div>
            )}

            <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>อัปโหลดใบเสร็จ</h2>
                <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 32px' }}>
                {(['header', 'items', 'evidence'] as FormTabType[]).map((tab) => (
                    <button key={tab} onClick={() => setFormTab(tab)} style={{ padding: '16px 32px', backgroundColor: 'transparent', border: 'none', borderBottom: formTab === tab ? '2px solid #4f46e5' : '2px solid transparent', color: formTab === tab ? '#4f46e5' : '#94a3b8', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
                        {tab === 'header' ? 'ข้อมูลหัวบิล' : tab === 'items' ? 'รายการค่าใช้จ่าย' : 'หลักฐานเพิ่มเติม'}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#fcfcfd' }}>
                {image && (
                    <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '10px' }}>
                                <img src={image} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Receipt" />
                             </div>
                             <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setImage(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><RotateIcon /> เปลี่ยนรูป</button>
                                <button onClick={() => runOCR()} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', borderRadius: '12px', fontWeight: '700', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>{isProcessing ? <LoadingSpinner /> : 'วิเคราะห์ใหม่'}</button>
                             </div>
                        </div>
                    </div>
                )}

                <div style={{ flex: image ? 1.2 : 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px' }}>
                    {isProcessing && <div style={{ padding: '16px 20px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '12px', marginBottom: '24px', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}><LoadingSpinner /> <span>ระบบ AI กำลังวิเคราะห์ข้อมูล...</span></div>}
                    {!isProcessing && image && <div style={{ padding: '12px 20px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '12px', marginBottom: '24px', border: '1px solid #dcfce7', fontWeight: '600' }}>✨ ใช้ 1 เครดิตสำหรับวิเคราะห์ใบเสร็จนี้แล้ว</div>}
                    {errorMsg && <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '12px', marginBottom: '24px', border: '1px solid #fee2e2', fontWeight: '500' }}>⚠️ {errorMsg}</div>}

                    {formTab === 'header' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            {!image && (
                                <>
                                    {/* 1. User Info Section */}
                                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>อัปโหลดใบเสร็จสำหรับ</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>นพนันท์ เกษอินทร์</span>
                                            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Nobphanan Katain</span>
                                        </div>
                                    </div>

                                    {/* 2. Selection Cards */}
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>วิธีการสร้างค่าใช้จ่าย</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                                            <div onClick={() => setCreationMethod('upload')} style={{ padding: '20px', borderRadius: '16px', border: `2px solid ${creationMethod === 'upload' ? '#4f46e5' : '#f1f5f9'}`, backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: creationMethod === 'upload' ? '0 10px 20px rgba(79, 70, 229, 0.08)' : 'none' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${creationMethod === 'upload' ? '#4f46e5' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {creationMethod === 'upload' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4f46e5' }} />}
                                                </div>
                                                <div><div style={{ fontWeight: '800', fontSize: '1.05rem' }}>อัปโหลดใบเสร็จ</div><p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>มีใบเสร็จต้นฉบับแนบ</p></div>
                                            </div>
                                            <div onClick={() => setCreationMethod('manual')} style={{ padding: '20px', borderRadius: '16px', border: `2px solid ${creationMethod === 'manual' ? '#4f46e5' : '#f1f5f9'}`, backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: creationMethod === 'manual' ? '0 10px 20px rgba(79, 70, 229, 0.08)' : 'none' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${creationMethod === 'manual' ? '#4f46e5' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {creationMethod === 'manual' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4f46e5' }} />}
                                                </div>
                                                <div><div style={{ fontWeight: '800', fontSize: '1.05rem' }}>ไม่มีใบเสร็จ</div><p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>สร้างใบรับรองแทนใบเสร็จ</p></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Upload Zone */}
                                    {creationMethod === 'upload' && (
                                        <div onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '180px', border: '2px dashed #e2e8f0', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', backgroundColor: '#ffffff' }}>
                                            <div style={{ color: '#4f46e5' }}><SimpleUploadIcon /></div>
                                            <div style={{ fontWeight: '700' }}>ลากวางไฟล์ หรือ <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div>
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>รองรับ JPEG, PNG, WebP, HEIC, PDF</p>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" />

                            {/* 4. Info Banner & Section Headers */}
                            {(image || creationMethod === 'manual') && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b' }}>รายการค่าใช้จ่าย</h3>
                                        <span style={{ backgroundColor: '#f1f5f9', color: '#4f46e5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>{amount ? '1 รายการ' : '0 รายการ'}</span>
                                    </div>

                                    <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                         <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                                         <p style={{ fontSize: '0.85rem', color: '#64748b' }}>รายการค่าใช้จ่ายจะถูกบันทึกแยกตามหมวดหมู่เพื่อความสะดวกในการจัดทำรายงานภาษี</p>
                                    </div>

                                    {/* 5. Basic Info Form */}
                                    <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '4px', height: '18px', backgroundColor: '#10b981', borderRadius: '4px' }} /><h3 style={{ fontSize: '1rem', fontWeight: '800' }}>ข้อมูลพื้นฐาน</h3></div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label style={labelStyle}>ประเภทเอกสาร *</label>
                                                <div style={{ display: 'flex', gap: '20px' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" checked={docType === 'tax'} onChange={() => setDocType('tax')} disabled /> ใบกำกับภาษี</label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" checked={docType === 'receipt'} onChange={() => setDocType('receipt')} /> ใบเสร็จ</label>
                                                </div>
                                            </div>
                                            <div><label style={labelStyle}>เลขที่ใบกำกับ/ใบเสร็จ</label><input type="text" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="ระบุเลขที่เอกสาร" style={inputStyle} /></div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div><label style={labelStyle}>วันที่ออกใบเสร็จ *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></div>
                                            <div><label style={labelStyle}>ผู้ขาย/ผู้ให้บริการ *</label>{isProcessing ? <SkeletonField /> : <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="เช่น: Inthanin Coffee" style={inputStyle} />}</div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label style={labelStyle}>จำนวนเงิน (บาท) *</label>
                                                {isProcessing ? <SkeletonField /> : (
                                                    <div style={{ position: 'relative' }}>
                                                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
                                                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '700' }}>THB</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label style={labelStyle}>วิธีชำระเงิน</label>
                                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
                                                    <option>💵 เงินสด</option>
                                                    <option>🏦 โอนเงิน</option>
                                                    <option>💳 บัตรเครดิต</option>
                                                    <option>📱 PromptPay</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div><label style={labelStyle}>ผู้ขออนุญาตเบิกจ่าย *</label><select value={payerName} onChange={(e) => setPayerName(e.target.value)} style={inputStyle}><option>Nobphanan Katain</option><option>อื่นๆ</option></select></div>
                                        <div><label style={labelStyle}>ที่อยู่ผู้ขาย</label><textarea placeholder="ระบุที่อยู่ผู้ขาย (ถ้ามี)" style={{ ...inputStyle, height: '80px', resize: 'none' }} /></div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {formTab === 'items' && <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}><h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>รายการค่าใช้จ่าย 1 รายการ</h3><div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}><div style={{ padding: '20px', backgroundColor: 'rgba(79, 70, 229, 0.05)', borderBottom: '1.5px solid #4f46e5' }}><div style={{ fontWeight: '800' }}>#1 {shopName || 'รายการใหม่'}</div><div style={{ color: '#64748b' }}>ยอดชำระ: ฿{amount || '0.00'}</div></div><div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}><div><label style={labelStyle}>รายละเอียด *</label><input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} style={inputStyle} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><label style={labelStyle}>ประเภท *</label><div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setItemType('product')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1.5px solid ${itemType === 'product' ? '#4f46e5' : '#e2e8f0'}`, backgroundColor: itemType === 'product' ? '#4f46e5' : 'white', color: itemType === 'product' ? 'white' : '#64748b', fontWeight: '700' }}>สินค้า</button><button onClick={() => setItemType('service')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1.5px solid ${itemType === 'service' ? '#4f46e5' : '#e2e8f0'}`, backgroundColor: itemType === 'service' ? '#4f46e5' : 'white', color: itemType === 'service' ? 'white' : '#64748b', fontWeight: '700' }}>บริการ</button></div></div><div><label style={labelStyle}>จำนวน *</label><input type="number" defaultValue="1" style={inputStyle} /></div></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><label style={labelStyle}>หมวดหมู่ *</label><select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}><option>🍔 อาหารและเครื่องดื่ม</option><option>🚗 การเดินทาง</option><option>🛍️ ช้อปปิ้ง</option><option>📦 อื่น ๆ</option></select></div><div><label style={labelStyle}>ยอดชำระ *</label><div style={{ position: 'relative' }}><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} /><span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '700' }}>THB</span></div></div></div></div></div></div>}

                    {formTab === 'evidence' && <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>{[ {l:'ยอดชำระ', v:amount}, {l:'ยอดก่อนภาษี', v:amount}, {l:'VAT', v:'0.00'}, {l:'WHT', v:'0.00'} ].map((s,i)=>(<div key={i} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.l}</div><div style={{ fontWeight: '800' }}>฿{s.v || '0.00'}</div></div>))}</div><div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0' }}><h3 style={labelStyle}>หลักฐานเพิ่มเติม (ไม่จำเป็น)</h3><p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>อัปโหลดเอกสารหลักฐานเพิ่มเติม (สูงสุด 5 ไฟล์)</p><div onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '180px', border: '2px dashed #e2e8f0', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', backgroundColor: '#fcfcfd' }}><div style={{ color: '#4f46e5' }}><SimpleUploadIcon /></div><div style={{ fontWeight: '700' }}>ลากวางไฟล์ หรือ <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>กดเพื่อเลือกไฟล์</span></div><p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>รองรับ JPEG, PNG, WebP, HEIC, PDF</p></div></div></div>}
                </div>
            </div>

            <div style={{ padding: '20px 32px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.02)' }}>
                <button onClick={onClose} style={{ padding: '14px 40px', borderRadius: '12px', border: '1.5px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontWeight: '700' }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={isSaving || isProcessing} style={{ padding: '16px 60px', borderRadius: '12px', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: '800', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: (isSaving || isProcessing) ? 'not-allowed' : 'pointer' }}>
                    {isSaving ? <LoadingSpinner /> : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> เพิ่มใบเสร็จ</>}
                </button>
            </div>
        </div>
    );
};

export default CreateReceiptSheet;
