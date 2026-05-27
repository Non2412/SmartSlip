'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './DashboardItems.module.css';
import { TableRowSkeleton } from './Skeleton';

interface StatCardProps {
    title: string;
    value: string;
    trend?: string;
    status?: string;
    icon?: React.ReactNode;
    iconBg?: string;
}

export const StatCard = ({ title, value, trend, status, icon, iconBg = '#ecfdf5' }: StatCardProps) => (
    <div className={styles.statCard}>
        <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: iconBg, color: iconBg === '#ecfdf5' ? '#10b981' : '#f97316' }}>
                {icon || (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                )}
            </div>
            {trend && (
                <span className={styles.trendBadge}>
                    {trend}
                </span>
            )}
            {status && (
                <span className={styles.statusBadge} style={{ backgroundColor: '#fff7ed', color: '#f97316' }}>
                    {status}
                </span>
            )}
        </div>
        <div>
            <div className={styles.statTitle}>{title}</div>
            <div className={styles.statValue}>{value}</div>
        </div>
    </div>
);

export const FilterBar = () => (
    <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input 
                type="text" 
                placeholder="ค้นหาร้านค้า, วันที่, ยอดเงิน..." 
                className={styles.searchInput}
            />
        </div>

        <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>หมวดหมู่:</span>
            <div className={styles.filterChips}>
                <div className={`${styles.filterChip} ${styles.filterChipActive}`}>ทั้งหมด</div>
                <div className={styles.filterChip}>อาหาร</div>
                <div className={styles.filterChip}>ของใช้</div>
            </div>
        </div>

        <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>ช่วงเวลา:</span>
            <div className={styles.filterChips}>
                <div className={`${styles.filterChip} ${styles.filterChipActive}`}>30 วัน</div>
                <div className={styles.filterChip}>รายเดือน</div>
                <div className={styles.filterChip}>รายปี</div>
            </div>
        </div>
    </div>
);

export const ReceiptTable = ({ loading, receipts = [] }: { loading?: boolean, receipts?: any[] }) => (
    <div className={styles.tableContainer}>
        <table className={styles.receiptTable}>
            <thead>
                <tr>
                    <th>ร้านค้า</th>
                    <th>หมวดหมู่</th>
                    <th>ยอดสุทธิ</th>
                    <th>สถานะ</th>
                    <th>วันที่</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                            <td colSpan={6} style={{ padding: '12px 0' }}>
                                <TableRowSkeleton />
                            </td>
                        </tr>
                    ))
                ) : (
                    receipts.map((receipt) => (
                        <tr key={receipt.id}>
                            <td className={styles.storeCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        overflow: 'hidden', flexShrink: 0,
                                        border: '1px solid #e5e7eb',
                                        background: '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.85rem', fontWeight: '700', color: '#64748b',
                                    }}>
                                        {receipt.extractedData?.imageData ? (
                                            <img
                                                src={receipt.extractedData.imageData}
                                                alt={receipt.storeName}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            receipt.storeName?.charAt(0) || 'R'
                                        )}
                                    </div>
                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                        {receipt.storeName || 'ไม่ระบุ'}
                                    </span>
                                </div>
                            </td>
                            <td>{receipt.extractedData?.category || 'ไม่ระบุ'}</td>
                            <td className={styles.amountCell}>฿ {receipt.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                            <td>
                                <span className={!receipt.extractedData ? styles.statusWarning : styles.statusSuccess}>
                                    {!receipt.extractedData ? 'รอตรวจสอบ' : 'สำเร็จ'}
                                </span>
                            </td>
                            <td>
                                {receipt.extractedData?.date ? 
                                    new Date(receipt.extractedData.date).toLocaleDateString('th-TH') : 
                                    new Date(receipt.createdAt).toLocaleDateString('th-TH')}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
        {!loading && receipts.length === 0 && (
            <div className={styles.emptyState}>
                ไม่พบรายการใบเสร็จในขณะนี้
            </div>
        )}
        {loading && (
            <div className={styles.emptyState}>
                กำลังโหลด...
            </div>
        )}
    </div>
);

export const ExpenseChart = ({ receipts = [] }: { receipts?: any[] }) => {
    // Group totals by day of week (Monday = 0, Sunday = 6)
    const amountsByDay = [0, 0, 0, 0, 0, 0, 0];
    
    receipts.forEach(receipt => {
        if (receipt.totalAmount) {
            const dateStr = receipt.extractedData?.date || receipt.createdAt;
            // Attempt to parse date, might need robust parsing if format is varied
            let date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                date = new Date(receipt.createdAt);
            }
            
            let dayIndex = date.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6;
            
            amountsByDay[dayIndex] += receipt.totalAmount;
        }
    });

    const maxAmount = Math.max(...amountsByDay);

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartTitle}>แนวโน้มรายจ่าย (รวมตามวัน)</div>
            <div className={styles.chartContainer}>
                {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((day, i) => {
                    const percentage = maxAmount > 0 ? (amountsByDay[i] / maxAmount) * 100 : 0;
                    return (
                        <div key={day} className={styles.barWrapper} title={`฿ ${amountsByDay[i].toLocaleString()}`}>
                            <div 
                                className={`${styles.bar} ${amountsByDay[i] > 0 ? styles.barActive : ''}`} 
                                style={{ height: amountsByDay[i] > 0 ? `${Math.max(percentage, 5)}%` : '0%' }}
                            />
                            <span className={styles.barLabel}>{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const RecentUploads = ({
    receipts = [],
    onReceiptClick,
    onEdit,
    onDelete,
}: {
    receipts?: any[];
    onReceiptClick?: (receipt: any) => void;
    onEdit?: (receipt: any) => void;
    onDelete?: (receipt: any) => void;
}) => {
    const recentReceipts = [...receipts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ปิด dropdown เมื่อคลิกนอกพื้นที่
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className={styles.recentCard}>
            <div className={styles.recentTitle}>รูปภาพจาก LINE</div>
            <div className={styles.uploadList} ref={menuRef}>
                {recentReceipts.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        ไม่มีรายการอัปโหลดล่าสุด
                    </div>
                ) : (
                    recentReceipts.map((receipt) => {
                        const imageData = receipt.extractedData?.imageData;
                        const isMenuOpen = openMenuId === receipt.id;
                        return (
                            <div
                                key={receipt.id}
                                className={styles.uploadItem}
                                onClick={() => onReceiptClick?.(receipt)}
                                style={{ cursor: onReceiptClick ? 'pointer' : 'default', transition: 'background 0.15s', position: 'relative' }}
                            >
                                {/* Thumbnail */}
                                <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                                    {imageData ? (
                                        <img src={imageData} alt="slip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className={styles.uploadInfo}>
                                    <div className={styles.uploadName}>{receipt.storeName || 'ไม่ระบุร้านค้า'}</div>
                                    <div className={styles.uploadDate}>
                                        {new Date(receipt.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} • {receipt.totalAmount ? `฿${receipt.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '—'}
                                    </div>
                                </div>

                                {/* Three-dot menu button */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(isMenuOpen ? null : receipt.id);
                                        }}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            border: '1px solid transparent', background: 'transparent',
                                            color: '#9ca3af', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.05em',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                                            (e.currentTarget as HTMLButtonElement).style.color = '#374151';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isMenuOpen) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                                                (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                                            }
                                        }}
                                        title="ตัวเลือก"
                                    >
                                        ⋮
                                    </button>

                                    {/* Dropdown */}
                                    {isMenuOpen && (
                                        <div
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                position: 'absolute', right: 0, top: '32px', zIndex: 100,
                                                background: 'white', borderRadius: '10px',
                                                border: '1px solid #e5e7eb',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                minWidth: '140px', overflow: 'hidden',
                                            }}
                                        >
                                            {/* แก้ไข */}
                                            <button
                                                onClick={() => { setOpenMenuId(null); onEdit?.(receipt); }}
                                                style={{
                                                    width: '100%', padding: '10px 16px',
                                                    background: 'transparent', border: 'none',
                                                    textAlign: 'left', cursor: 'pointer',
                                                    fontSize: '0.875rem', fontWeight: '600', color: '#374151',
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                แก้ไข
                                            </button>

                                            {/* เส้นแบ่ง */}
                                            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 12px' }} />

                                            {/* ลบ */}
                                            <button
                                                onClick={() => { setOpenMenuId(null); onDelete?.(receipt); }}
                                                style={{
                                                    width: '100%', padding: '10px 16px',
                                                    background: 'transparent', border: 'none',
                                                    textAlign: 'left', cursor: 'pointer',
                                                    fontSize: '0.875rem', fontWeight: '600', color: '#ef4444',
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff1f2')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                ลบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {receipts.length > 5 && <button className={styles.viewAllButton}>ดูทั้งหมด</button>}
        </div>
    );
};
