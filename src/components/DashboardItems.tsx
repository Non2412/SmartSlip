'use client';

import React from 'react';
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
                    <th>ชำระโดย</th>
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
                                <div className={styles.storeIcon}>
                                    {receipt.storeName?.charAt(0) || 'R'}
                                </div>
                                {receipt.storeName || 'ไม่ระบุ'}
                            </td>
                            <td>{/* No category field in API currently */ 'ไม่ระบุหมวดหมู่'}</td>
                            <td className={styles.amountCell}>฿ {receipt.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                            <td>{receipt.extractedData?.paymentMethod || receipt.extractedData?.method || 'เงินสด'}</td>
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

export const RecentUploads = ({ receipts = [] }: { receipts?: any[] }) => {
    const recentReceipts = [...receipts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <div className={styles.recentCard}>
            <div className={styles.recentTitle}>การอัปโหลดล่าสุด</div>
            <div className={styles.uploadList}>
                {recentReceipts.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        ไม่มีรายการอัปโหลดล่าสุด
                    </div>
                ) : (
                    recentReceipts.map((receipt) => (
                        <div key={receipt.id} className={styles.uploadItem}>
                            <div className={styles.uploadIconWrapper}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <div className={styles.uploadInfo}>
                                <div className={styles.uploadName}>ใบเสร็จ {receipt.storeName || 'ไม่ระบุ'}</div>
                                <div className={styles.uploadDate}>
                                    {new Date(receipt.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(receipt.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {receipts.length > 5 && <button className={styles.viewAllButton}>ดูทั้งหมด</button>}
        </div>
    );
};
