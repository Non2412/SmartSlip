"use client";

import React from 'react';
import styles from './ReceiptHistory.module.css';
import { Receipt } from '@/lib/apiClient';

interface ReceiptHistoryProps {
    receipts: Receipt[];
    loading: boolean;
    error: string | null;
}

const ReceiptHistory = ({ receipts, loading, error }: ReceiptHistoryProps) => {
    // Function to format date from ISO string
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return {
                date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
                time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            };
        } catch {
            return { date: dateStr, time: '' };
        }
    };

    return (
        <div className={styles.container}>
            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchInputWrapper}>
                    <span className={styles.searchIcon}>
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </span>
                    <input type="text" className={styles.searchInput} placeholder="ค้นหาร้านค้า, วันที่, ยอดเงิน..." />
                </div>
                <div className={styles.filterGroup}>
                   <div className={styles.filterLabel}>หมวดหมู่:</div>
                   <div className={styles.btnGroup}>
                       <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>ทั้งหมด</div>
                       <div className={styles.filterBtn}>อาหาร</div>
                       <div className={styles.filterBtn}>ของใช้</div>
                   </div>
                </div>
                <div className={styles.filterGroup}>
                   <div className={styles.filterLabel}>ช่วงเวลา:</div>
                   <div className={styles.btnGroup}>
                       <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>30 วัน</div>
                       <div className={styles.filterBtn}>รายเดือน</div>
                       <div className={styles.filterBtn}>รายปี</div>
                   </div>
                </div>
            </div>

            {/* Pagination Info */}
            <div className={styles.paginationInfo}>
                <div>
                    {loading ? 'กำลังโหลดข้อมูล...' : `แสดง ${receipts.length} รายการ`}
                </div>
                {!loading && receipts.length > 0 && (
                    <div className={styles.pageCountSelect}>
                        <span>แสดง:</span>
                        {[5, 10, 25].map(n => (
                            <div key={n} className={`${styles.pageCountBtn} ${n === 10 ? styles.pageCountBtnActive : ''}`}>{n}</div>
                        ))}
                        <span>รายการ</span>
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className={styles.errorBox}>
                    <strong>⚠️ เกิดข้อผิดพลาด:</strong> {error}
                </div>
            )}

            {/* Table */}
            <div className={styles.tableCard}>
                <table className={styles.historyTable}>
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
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} className={styles.loadingRow}>
                                    <td colSpan={6} className={styles.loadingCell}>
                                        <div className={styles.loadingPulse}>กำลังดึงข้อมูล...</div>
                                    </td>
                                </tr>
                            ))
                        ) : receipts.length === 0 ? (
                            <tr key="empty-state">
                                <td colSpan={6} className={styles.emptyCell}>
                                    ไม่พบรายการใบเสร็จในขณะนี้
                                </td>
                            </tr>
                        ) : (
                            receipts.map((receipt) => {
                                const { date, time } = formatDate(receipt.createdAt);
                                return (
                                    <TableRow 
                                      key={receipt.id}
                                      store={receipt.storeName} 
                                      category={receipt.extractedData?.receiver || 'ทั่วไป'} 
                                      amount={(receipt.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} 
                                      method={receipt.extractedData?.method || 'ไม่ระบุ'} 
                                      status={receipt.extractedData ? "ตรวจสอบแล้ว" : "รอตรวจสอบ"} 
                                      date={date} 
                                      time={time} 
                                      color={receipt.extractedData ? "#10b981" : "#f59e0b"} 
                                    />
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface TableRowProps {
    store: string;
    category: string;
    amount: string;
    method: string;
    status: string;
    date: string;
    time: string;
    color: string;
}

const TableRow = ({ store, category, amount, method, status, date, time, color }: TableRowProps) => (
    <tr>
        <td>
            <div className={styles.storeInfo}>
                <div className={styles.storeIcon} style={{ background: `${color}15`, color: color }}>
                    {store ? store.charAt(0).toUpperCase() : '?'}
                </div>
                <span className={styles.storeName}>{store}</span>
            </div>
        </td>
        <td>
            <span className={styles.categoryBadge}>{category}</span>
        </td>
        <td>
            <span className={styles.amountText}>฿ {amount}</span>
        </td>
        <td className={styles.methodCell}>{method}</td>
        <td>
            <div className={styles.statusWrapper}>
                <div className={styles.statusDot} style={{ background: color }}></div>
                <span className={styles.statusText} style={{ 
                    color: color === '#10b981' ? '#059669' : '#d97706' 
                }}>
                    {status}
                </span>
            </div>
        </td>
        <td>
            <div className={styles.dateText}>
                <span>{date}</span>
                <span className={styles.timeText}>{time}</span>
            </div>
        </td>
    </tr>
);

export default ReceiptHistory;
