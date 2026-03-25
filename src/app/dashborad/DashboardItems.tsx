'use client';

import React, { useEffect } from 'react';
import styles from './DashboardItems.module.css';
import { useReceipts } from '@/hooks/useReceipts';

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string;
    trend?: string;
    status?: string;
}

export const StatCard = ({ title, value, subValue, trend, status }: StatCardProps) => (
    <div className={styles.statCard}>
        <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
            </div>
            {trend && (
                <span className={styles.trendBadge}>
                    {trend}
                </span>
            )}
            {status && (
                <span className={styles.statusBadge}>
                    {status}
                </span>
            )}
        </div>
        <div>
            <div className={styles.statLabel}>{title}</div>
            <div className={styles.statValue}>{value}</div>
            {subValue && <div className={styles.statSubValue}>{subValue}</div>}
        </div>
    </div>
);

export const ExpenseChart = () => (
    <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>แนวโน้มค่าใช้จ่าย</h3>
            <select className={styles.chartSelect}>
                <option>7 วันล่าสุด</option>
                <option>30 วันล่าสุด</option>
            </select>
        </div>

        <div className={styles.chartContainer}>
            {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
                <div key={i} className={styles.barWrapper}>
                    <div
                        className={styles.bar}
                        style={{
                            height: `${height * 2.5}px`,
                            backgroundColor: i === 6 ? 'var(--primary-color)' : '#f1f5f9'
                        }}
                    ></div>
                    <span className={styles.dayLabel}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                </div>
            ))}
        </div>
    </div>
);

export const RecentUploads = ({ userId }: { userId?: string }) => {
    const { receipts, loading, fetchReceipts } = useReceipts();

    useEffect(() => {
        if (userId) {
            fetchReceipts(userId);
        }
    }, [userId, fetchReceipts]);

    // แสดงเพียง 3 รายการล่าสุด
    const recentReceipts = receipts.slice(0, 3);

    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            flex: 1,
            minWidth: '320px'
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px' }}>อัปโหลดล่าสุด</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        ⏳ กำลังโหลด...
                    </div>
                ) : recentReceipts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        ยังไม่มีรายการอัพโหลด
                    </div>
                ) : (
                    recentReceipts.map((receipt) => (
                        <UploadItem
                            key={receipt.id}
                            name={receipt.storeName}
                            status="เสร็จสิ้น"
                            completed
                            iconColor="#10b981"
                        />
                    ))
                )}
            </div>
            <button style={{
                width: '100%', padding: '12px', marginTop: '24px', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'var(--primary-color)', fontWeight: '600', fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}>
                ดูประวัติทั้งหมด
            </button>
        </div>
    );
};

interface UploadItemProps {
    name: string;
    status: string;
    completed?: boolean;
    iconColor: string;
}

const UploadItem = ({ name, status, completed = false, iconColor }: UploadItemProps) => (
    <div className={styles.uploadItem}>
        <div className={styles.uploadIconWrapper} style={{ color: iconColor }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        </div>
        <div className={styles.uploadInfo}>
            <div className={styles.uploadName}>{name}</div>
            <div className={`${styles.uploadStatus} ${completed ? styles.completedStatus : styles.processingStatus}`}>{status}</div>
        </div>
        {completed ? (
            <div className={styles.completedIndicator}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
        ) : (
            <div className={styles.processingIndicator}></div>
        )}
    </div>
);
