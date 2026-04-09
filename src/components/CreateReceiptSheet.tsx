import React, { useState, useEffect, useRef } from 'react';

// Add keyframes for the shimmer effect
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
}
`;

interface CreateReceiptSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    userId: string;
}

type TabType = 'manual' | 'upload';

import { useReceipts } from '@/hooks/useReceipts';

const CreateReceiptSheet = ({ isOpen, onClose, onSuccess, userId }: CreateReceiptSheetProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('manual');
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { createReceipt, extractFromImage, loading: hookLoading, error: hookError } = useReceipts();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form states
    const [shopName, setShopName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('เงินสด');
    const [category, setCategory] = useState('อาหารและเครื่องดื่ม');
    const [notes, setNotes] = useState('');
    const [driveFileId, setDriveFileId] = useState<string | undefined>(undefined);

    // Reset state when closing
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setImage(null);
                setSelectedFile(null);
                setIsProcessing(false);
                setErrorMsg(null);
                setActiveTab('manual');
                setShopName('');
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setNotes('');
                setDriveFileId(undefined);
            }, 300);
        }
    }, [isOpen]);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
            setErrorMsg('กรุณาเลือกไฟล์รูปภาพหรือ PDF เท่านั้น');
            return;
        }

        setErrorMsg(null);
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            setImage(event.target?.result as string);
        };
        reader.onerror = () => setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์');
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
            if (e.target) e.target.value = '';
        }
    };

    const runOCR = async () => {
        if (!selectedFile) {
            setErrorMsg('กรุณาเลือกไฟล์ก่อนเริ่มสแกน');
            return;
        }
        
        setIsProcessing(true);
        setErrorMsg(null);
        
        // Switch to manual tab immediately to show the loading excitement!
        setActiveTab('manual');

        try {
            // Using the hook with the stored file object
            const res: any = await extractFromImage(selectedFile, userId);
            
            if (res) {
                setShopName(res.store || '');
                setAmount(res.amount?.toString() || '');
                if (res.date) {
                    try {
                        const isoDate = new Date(res.date).toISOString().split('T')[0];
                        setDate(isoDate);
                    } catch { /* keep current */ }
                }
                if (res.method) setPaymentMethod(res.method);
                if (res.imageFileId) setDriveFileId(res.imageFileId);
                
                setActiveTab('manual');
            } else {
                throw new Error('ไม่สามารถวิเคราะห์ข้อมูลได้');
            }

        } catch (error: any) {
            setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการประมวลผล');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!shopName || !amount) {
            setErrorMsg('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
            return;
        }
        
        setIsSaving(true);
        try {
            const result = await createReceipt({
                storeName: shopName,
                totalAmount: parseFloat(amount),
                userId: userId,
                imageFileId: driveFileId,
                extractedData: {
                    date,
                    method: paymentMethod,
                    receiver: category,
                    notes
                }
            });

            if (result.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    setIsSuccess(false);
                    if (onSuccess) onSuccess();
                    onClose();
                }, 2000);
            } else {
                setErrorMsg(result.error || 'บันทึกไม่สำเร็จ');
            }
        } catch (err) {
            setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
        } finally {
            setIsSaving(false);
        }
    };

    const SkeletonField = ({ height = '45px' }: { height?: string }) => (
        <div style={{
            width: '100%',
            height: height,
            backgroundColor: '#f1f5f9',
            backgroundImage: 'linear-gradient(to right, #f1f5f9 0%, #e2e8f0 20%, #f1f5f9 40%, #f1f5f9 100%)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '800px 100%',
            display: 'inline-block',
            borderRadius: '12px',
            animation: 'shimmer 1.5s infinite linear reverse'
        }} />
    );

    return (
        <>
            <style>{shimmerKeyframes}</style>
            
            {/* Success Overlay */}
            {isSuccess && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.4s easeOut'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        marginBottom: '24px',
                        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
                        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>บันทึกสำเร็จ!</h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '500' }}>ใบเสร็จของคุณถูกบันทึกเรียบร้อยแล้ว</p>
                    
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes popIn { 
                            0% { transform: scale(0.5); opacity: 0; } 
                            70% { transform: scale(1.1); }
                            100% { transform: scale(1); opacity: 1; } 
                        }
                    `}</style>
                </div>
            )}
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 999,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={onClose}
            />

            {/* Sidebar Sheet */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '100%',
                    maxWidth: '580px',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    backgroundImage: 'radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.03) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.03) 0, transparent 50%)',
                    zIndex: 1000,
                    boxShadow: '-30px 0 60px rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden'
                }}
            >
                {/* Header Section */}
                <div style={{ padding: '32px 32px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ 
                                fontSize: '1.85rem', 
                                fontWeight: '900', 
                                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.03em',
                                marginBottom: '4px'
                            }}>
                                สร้างใบเสร็จ
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }}>
                                บันทึกค่าใช้จ่ายและจัดการใบเสร็จของคุณ
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: 'translateY(-10px)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.borderColor = '#fee2e2';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(-12px) scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                e.currentTarget.style.color = '#64748b';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1)';
                            }}
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 32px' }}>
                    
                    {/* Tabs Navigation */}
                    <div style={{ 
                        padding: '16px 32px', 
                        backgroundColor: '#f8fafc', 
                        display: 'flex', 
                        gap: '12px',
                        borderBottom: '1px solid #f1f5f9' 
                    }}>
                        <button
                            onClick={() => setActiveTab('manual')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                border: '1px solid',
                                borderColor: activeTab === 'manual' ? '#10b981' : 'transparent',
                                backgroundColor: activeTab === 'manual' ? '#ffffff' : 'transparent',
                                color: activeTab === 'manual' ? '#10b981' : '#64748b',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: activeTab === 'manual' ? '0 6px 16px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                        >
                            <EditIcon />
                            ป้อนตัวเลข
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                border: '1px solid',
                                borderColor: activeTab === 'upload' ? '#10b981' : 'transparent',
                                backgroundColor: activeTab === 'upload' ? '#ffffff' : 'transparent',
                                color: activeTab === 'upload' ? '#10b981' : '#64748b',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: activeTab === 'upload' ? '0 6px 16px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                        >
                            <ImageIcon />
                            อัพโหลดรูป
                        </button>
                    </div>

                    <div style={{ padding: '32px' }}>
                        {errorMsg && (
                            <div style={{
                                padding: '14px 18px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                borderRadius: '16px',
                                fontSize: '0.9rem',
                                marginBottom: '24px',
                                border: '1px solid #fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontWeight: '500'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span> {errorMsg}
                            </div>
                        )}

                        {activeTab === 'manual' ? (
                            /* Manual Form */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                
                                {/* Form Card: Basic Info */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '24px',
                                    padding: '24px',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <div style={{ width: '4px', height: '18px', backgroundColor: '#10b981', borderRadius: '4px' }} />
                                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>ข้อมูลพื้นฐาน</h3>
                                    </div>

                                    {/* Shop Name */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>ชื่อร้าน/ธุรกิจ *</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={inputIconWrapperStyle}>
                                            <ShopIcon />
                                        </div>
                                        {isProcessing ? (
                                            <SkeletonField />
                                        ) : (
                                            <input
                                                type="text"
                                                value={shopName}
                                                onChange={(e) => setShopName(e.target.value)}
                                                placeholder="เช่น: Inthanin Coffee"
                                                style={{ ...inputStyle, paddingLeft: '48px' }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>จำนวนเงิน (บาท) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={inputIconWrapperStyle}>
                                            <BahtIcon />
                                        </div>
                                        {isProcessing ? (
                                            <SkeletonField />
                                        ) : (
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                style={{ ...inputStyle, paddingLeft: '48px' }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Date & Payment Method Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>วันที่ *</label>
                                        {isProcessing ? (
                                            <SkeletonField />
                                        ) : (
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                style={inputStyle}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>วิธีชำระเงิน</label>
                                        {isProcessing ? (
                                            <SkeletonField />
                                        ) : (
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                style={inputStyle}
                                            >
                                                <option>💵 เงินสด</option>
                                                <option>🏦 โอนเงิน</option>
                                                <option>💳 บัตรเครดิต</option>
                                                <option>📱 PromptPay</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Category */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>หมวดหมู่</label>
                                    {isProcessing ? (
                                        <SkeletonField />
                                    ) : (
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            style={inputStyle}
                                        >
                                            <option>🍔 อาหารและเครื่องดื่ม</option>
                                            <option>🚗 การเดินทาง</option>
                                            <option>🛍️ ช้อปปิ้ง</option>
                                            <option>🎬 สุขภาพและบันเทิง</option>
                                            <option>📦 อื่น ๆ</option>
                                        </select>
                                    )}
                                </div>

                                </div>

                                {/* Form Card: Additional Details */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '24px',
                                    padding: '24px',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <div style={{ width: '4px', height: '18px', backgroundColor: '#6366f1', borderRadius: '4px' }} />
                                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>รายละเอียดเพิ่มเติม</h3>
                                    </div>

                                    {/* Notes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>หมายเหตุ (เพิ่มเติม)</label>
                                        <textarea
                                            placeholder="รายละเอียดเพิ่มเติม..."
                                            style={{ ...inputStyle, height: '100px', resize: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        width: '100%',
                                        padding: '18px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderRadius: '18px',
                                        fontWeight: '700',
                                        fontSize: '1.05rem',
                                        marginTop: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        border: 'none',
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSaving) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.35)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.25)';
                                    }}
                                >
                                    {isSaving ? (
                                        <LoadingSpinner />
                                    ) : (
                                        <>
                                            <SaveIcon />
                                            <span>บันทึก</span>
                                        </>
                                    )}
                                </button>

                            </div>
                        ) : (
                            /* AI Upload Tab */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                <div
                                    onClick={() => !image && fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleFile(file);
                                    }}
                                    style={{
                                        width: '100%',
                                        height: '320px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDragging ? '#f8fafc' : '#fcfcfd',
                                        cursor: image ? 'default' : 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.3s ease',
                                        overflow: 'hidden',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                                    }}
                                >
                                    {image ? (
                                        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ flex: 1, minHeight: 0, padding: '24px' }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '16px',
                                                    backgroundImage: `url(${image})`,
                                                    backgroundSize: 'contain',
                                                    backgroundPosition: 'center',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                    border: '1px solid #f1f5f9'
                                                }} />
                                            </div>
                                            <div style={{ 
                                                padding: '24px', 
                                                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                                                backdropFilter: 'blur(10px)',
                                                borderTop: '1px solid #f1f5f9',
                                                display: 'flex',
                                                gap: '12px'
                                            }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '14px',
                                                        backgroundColor: '#f8fafc',
                                                        color: '#64748b',
                                                        borderRadius: '14px',
                                                        fontSize: '0.95rem',
                                                        fontWeight: '700',
                                                        border: '1.5px solid #e2e8f0',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                >
                                                    เปลี่ยนรูป
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); runOCR(); }}
                                                    disabled={isProcessing}
                                                    style={{
                                                        flex: 2,
                                                        padding: '14px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        borderRadius: '14px',
                                                        fontSize: '0.95rem',
                                                        fontWeight: '800',
                                                        border: 'none',
                                                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '10px',
                                                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseEnter={(e) => { if(!isProcessing) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    {isProcessing ? <LoadingSpinner /> : <><MagicIcon /> <span>เริ่มสแกนด้วย AI</span></>}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
                                            <div style={{
                                                color: '#10b981',
                                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                                padding: '24px',
                                                borderRadius: '24px',
                                                marginBottom: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <SimpleUploadIcon />
                                            </div>
                                            <h3 style={{ 
                                                fontWeight: '900', 
                                                color: '#1e293b', 
                                                fontSize: '1.35rem', 
                                                marginBottom: '8px',
                                                letterSpacing: '-0.02em'
                                            }}>
                                                อัพโหลดใบเสร็จของคุณ
                                            </h3>
                                            <p style={{ 
                                                color: '#64748b', 
                                                fontSize: '1rem', 
                                                fontWeight: '500',
                                                textAlign: 'center',
                                                marginBottom: '20px'
                                            }}>
                                                ลากไฟล์มาที่นี่ หรือ <span style={{ color: '#10b981', textDecoration: 'underline' }}>เลือกไฟล์</span>
                                            </p>
                                            <div style={{ 
                                                fontSize: '0.85rem', 
                                                color: '#94a3b8',
                                                fontWeight: '700',
                                                backgroundColor: '#f8fafc',
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid #f1f5f9',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                JPEG, PNG, WebP, PDF
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                                    />
                                </div>

                                <div style={{ 
                                    padding: '16px', 
                                    borderRadius: '16px', 
                                    backgroundColor: '#f0f9ff', 
                                    border: '1px solid #e0f2fe',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <div style={{ color: '#0ea5e9', marginTop: '2px' }}><SparklesIcon /></div>
                                    <p style={{ fontSize: '0.85rem', color: '#0369a1', lineHeight: '1.5' }}>
                                        ระบบ AI จะประมวลผลและกรอกข้อมูล ชื่อร้าน, วันที่ และยอดเงิน ให้ท่านโดยอัตโนมัติ
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// Styles
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '16px',
    fontSize: '0.95rem',
    color: '#1e293b',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    appearance: 'none',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

const inputIconWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    pointerEvents: 'none',
    zIndex: 1
};

// Icons components
const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
);

const ShopIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4" /><path d="M5 21V10.85" /><path d="M19 21V10.85" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /></svg>
);

const BahtIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 6h6a3 3 0 0 1 0 6H7" /><path d="M7 12h6a3 3 0 0 1 0 6H7" /><path d="M7 6v12" /><path d="M11 4v16" /></svg>
);

const ImageIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);

const SaveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
);

const SimpleUploadIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);

const SparklesIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
);

const MagicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
);

const RotateIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
);

const LoadingSpinner = () => (
    <div style={{
        width: '24px',
        height: '24px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderRadius: '50%',
        borderTopColor: 'white',
        animation: 'spin 0.8s linear infinite'
    }}>
        <style>{`
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
);

export default CreateReceiptSheet;

