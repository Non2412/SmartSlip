'use client';

import React from 'react';
import styles from './DashboardItems.module.css';

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

export const ReceiptTable = ({ loading }: { loading?: boolean }) => (
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
                {/* Empty state for now as seen in screenshot */}
            </tbody>
        </table>
        {!loading && (
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
