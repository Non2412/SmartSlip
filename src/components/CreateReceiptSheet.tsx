'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFlow } from '@/context/FlowContext';

interface CreateReceiptSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateReceiptSheet = ({ isOpen, onClose }: CreateReceiptSheetProps) => {
    const { setStep } = useFlow();
    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<{ label: string; value: string }[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when closing
    useEffect(() => {
        if (isOpen) {
            setStep(2); // Set to Upload step when opened
        }
        if (!isOpen) {
            // No reset to 1 here because user is still logged in
            setTimeout(() => {
                setImage(null);
                setResults([]);
                setIsProcessing(false);
                setErrorMsg(null);
            }, 300);
        }
    }, [isOpen, setStep]);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }

        setErrorMsg(null);
        const reader = new FileReader();
        reader.onload = (event) => {
            setImage(event.target?.result as string);
            setResults([]);
        };
        reader.onerror = () => setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์');
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
            if (e.target) e.target.value = ''; // Clear for next selection
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const runOCR = async () => {
        if (!image) return;
        setIsProcessing(true);
        setStep(3); // Set to Processing step
        setErrorMsg(null);

        try {
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image })
            });

            if (response.status === 413) throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป');
            if (!response.ok) throw new Error('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');

            const res = await response.json();
            if (res.success) {
                const data = res.data;
                setResults([
                    { label: 'ชื่อร้าน', value: data.shop_name || '-' },
                    { label: 'วันที่', value: data.date || '-' },
                    { label: 'เวลา', value: data.time || '-' },
                    { label: 'ยอดรวม', value: `฿ ${data.total_amount || '0.00'}` },
                    { label: 'เลขที่ใบกำกับภาษี', value: data.receipt_no || '-' },
                ]);
                setStep(4); // Set to Review step
            } else {
                throw new Error(res.error || 'Unknown error');
            }

        } catch (error: any) {
            console.error("OCR Error:", error);
            setErrorMsg(error.message || 'ไม่สามารถติดต่อ OCR Server ได้');
            setResults([]);
            setStep(2); // Fallback to Upload on error
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease-in-out'
                }}
                onClick={onClose}
            />

            {/* Sidebar Sheet */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '500px',
                    height: '100%',
                    backgroundColor: 'white',
                    zIndex: 1000,
                    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)' }}>สร้างใบเสร็จด้วย AI</h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
                    อัปโหลดรูปภาพใบเสร็จของคุณ ระบบจะใช้ <strong style={{ color: 'var(--primary-color)' }}>EasyOCR</strong> ในการดึงข้อมูลโดยอัตโนมัติ
                </p>

                {errorMsg && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        marginBottom: '20px',
                        border: '1px solid #fee2e2'
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Upload Section */}
                <div
                    onClick={() => !image && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                        width: '100%',
                        height: '240px',
                        border: '2px dashed',
                        borderColor: isDragging || (image === null && !errorMsg) ? 'var(--primary-color)' : errorMsg ? '#ef4444' : 'var(--border-color)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDragging ? 'var(--sidebar-item-active)' : '#f8fafc',
                        cursor: image ? 'default' : 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {image ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <img src={image} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            <button
                                onClick={(e) => { e.stopPropagation(); setImage(null); setResults([]); }}
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                เปลี่ยนรูป
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--sidebar-item-active)',
                                color: 'var(--primary-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px'
                            }}>
                                <UploadIcon />
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, WEBP (ไม่เกิน 10MB)</span>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/*"
                    />
                </div>

                {/* Action Button */}
                <button
                    onClick={runOCR}
                    disabled={!image || isProcessing}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: image && !isProcessing ? 'var(--primary-color)' : '#94a3b8',
                        color: 'white',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '1rem',
                        marginTop: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: image && !isProcessing ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isProcessing ? (
                        <>
                            <LoadingSpinner />
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
                    <div style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)' }}>ผลลัพธ์ที่ได้</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {results.map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.label}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={async () => {
                                setStep(5); // Confirm
                                // Simulate API call
                                await new Promise(r => setTimeout(r, 1000));
                                setStep(6); // Done
                                setTimeout(() => {
                                    onClose();
                                    // Reset to step 1 (logged in) or dashboard view
                                    setStep(1); 
                                }, 1500);
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: 'white',
                                color: 'var(--primary-color)',
                                border: '1px solid var(--primary-color)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                marginTop: '24px',
                                cursor: 'pointer'
                            }}
                        >
                            บันทึกข้อมูลเข้าสู่ระบบ
                        </button>
                    </div>
                )}
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

const LoadingSpinner = () => (
    <div style={{
        width: '18px',
        height: '18px',
        border: '2px solid rgba(255,255,255,0.3)',
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
