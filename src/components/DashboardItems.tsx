import React from 'react';
import styles from './DashboardItems.module.css';

export const StatCard = ({ title, value, subValue, trend, status }: { title: string, value: string, subValue?: string, trend?: string, status?: string }) => (
    <div className={styles.statCard}>
        <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
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

export const RecentUploads = () => (
    <div className={styles.uploadsCard}>
        <h3 className={styles.uploadsTitle}>อัปโหลดล่าสุด</h3>
        <div className={styles.uploadsList}>
            <UploadItem name="Receipt_Oct_24.pdf" status="กำลังประมวลผล OCR..." iconColor="#6366f1" />
            <UploadItem name="IMG_20231023.jpg" status="เสร็จสิ้น" completed iconColor="#10b981" />
            <UploadItem name="Grab_Taxi_Slip.jpg" status="เสร็จสิ้น" completed iconColor="#10b981" />
        </div>
        <button className={styles.historyButton}>
            ดูประวัติทั้งหมด
        </button>
    </div>
);

const UploadItem = ({ name, status, completed = false, iconColor }: { name: string, status: string, completed?: boolean, iconColor: string }) => (
    <div className={styles.uploadItem}>
        <div className={styles.uploadIconWrapper} style={{ color: iconColor }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        </div>
        <div className={styles.uploadInfo}>
            <div className={styles.uploadName}>{name}</div>
            <div className={`${styles.uploadStatus} ${completed ? styles.completedStatus : styles.processingStatus}`}>{status}</div>
        </div>
        {completed ? (
            <div className={styles.completedIndicator}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
        ) : (
            <div className={styles.processingIndicator}></div>
        )}
    </div>
);
