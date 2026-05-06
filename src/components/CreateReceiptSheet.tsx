'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useFlow } from '@/context/FlowContext';
import styles from './CreateReceiptSheet.module.css';

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

export default CreateReceiptSheet;
