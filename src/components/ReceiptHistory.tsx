"use client";

import React from 'react';
import styles from './ReceiptHistory.module.css';

const ReceiptHistory = () => {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>ประวัติการเคลื่อนไหวสต็อก</h2>
            {/* Header Stats */}
            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>ทั้งหมด</div>
                        <div className={styles.statValue}>65</div>
                    </div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ color: '#10b981' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>รับเข้า</div>
                        <div className={styles.statValue}>33</div>
                    </div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ color: '#3b82f6' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>โอนสต็อก</div>
                        <div className={styles.statValue}>32</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchInputWrapper}>
                    <input type="text" className={styles.searchInput} placeholder="ค้นหาสินค้า, ผู้ส่ง, เอกสาร..." />
                </div>
                <div className={styles.filterGroup}>
                    <div className={styles.filterLabel}>ประเภท:</div>
                    <div className={styles.btnGroup}>
                        <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>ทั้งหมด</div>
                        <div className={styles.filterBtn}>รับเข้า</div>
                        <div className={styles.filterBtn}>โอน</div>
                    </div>
                </div>
                <div className={styles.filterGroup}>
                    <div className={styles.filterLabel}>ช่วงเวลา:</div>
                    <div className={styles.btnGroup}>
                        <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>ทั้งหมด</div>
                        <div className={styles.filterBtn}>วันนี้</div>
                        <div className={styles.filterBtn}>7 วัน</div>
                        <div className={styles.filterBtn}>30 วัน</div>
                    </div>
                </div>
            </div>

            {/* Pagination Info */}
            <div className={styles.paginationInfo}>
                <div>แสดง 1-10 จาก 65 รายการ</div>
                <div className={styles.pageCountSelect}>
                    <span>แสดง:</span>
                    {[5, 10, 50, 100].map(n => (
                        <div key={n} className={`${styles.pageCountBtn} ${n === 10 ? styles.pageCountBtnActive : ''}`}>{n}</div>
                    ))}
                    <span>รายการ</span>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
                <table className={styles.historyTable}>
                    <thead>
                        <tr>
                            <th>ประเภท</th>
                            <th>สินค้า</th>
                            <th>จำนวน</th>
                            <th>จาก</th>
                            <th>ไปยัง</th>
                            <th>ผู้บันทึก</th>
                            <th>วันเวลา</th>
                        </tr>
                    </thead>
                    <tbody>
                        <TableRow type="in" item="ผ้าห่ม" amount="+100 ม้วน" from="กรมที่ดิน" to="กองกลาง" user="แอดหวัง" date="13 ก.พ. 2569 06:53" />
                        <TableRow type="out" item="เสื้อผ้า" amount="1 กล่อง" from="กองกลางจังหวัด" to="วิทยาลัยเกษตรและเทคโนโลยีศรีสะเกษ" user="แอดหวัง" date="12 ก.พ. 2569 23:51" />
                        <TableRow type="out" item="ยาแก้หวัด" amount="1 ขวด" from="กองกลางจังหวัด" to="วิทยาลัยเกษตรและเทคโนโลยีศรีสะเกษ" user="แอดหวัง" date="12 ก.พ. 2569 23:51" />
                        <TableRow type="out" item="ผ้าห่ม" amount="1 ม้วน" from="กองกลางจังหวัด" to="วิทยาลัยเกษตรและเทคโนโลยีศรีสะเกษ" user="แอดหวัง" date="12 ก.พ. 2569 23:51" />
                        <TableRow type="out" item="น้ำดื่มแพ็คเล็ก" amount="1 แพ็ค" from="กองกลางจังหวัด" to="วิทยาลัยเกษตรและเทคโนโลยีศรีสะเกษ" user="แอดหวัง" date="12 ก.พ. 2569 23:51" />
                        <TableRow type="out" item="ข้าวกล่อง" amount="1 กล่อง" from="กองกลางจังหวัด" to="วิทยาลัยเกษตรและเทคโนโลยีศรีสะเกษ" user="แอดหวัง" date="12 ก.พ. 2569 23:51" />
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface TableRowProps {
    type: 'in' | 'out';
    item: string;
    amount: string;
    from: string;
    to: string;
    user: string;
    date: string;
}

const TableRow = ({ type, item, amount, from, to, user, date }: TableRowProps) => (
    <tr>
        <td>
            <div className={`${styles.typeBadge} ${type === 'in' ? styles.typeIn : styles.typeOut}`}>
                {type === 'in' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                )}
                {type === 'in' ? 'รับเข้า' : 'โอน'}
            </div>
        </td>
        <td style={{ fontWeight: 600 }}>{item}</td>
        <td style={{ color: type === 'in' ? '#10b981' : '#334155' }} className={styles.amountText}>{amount}</td>
        <td>{from}</td>
        <td>{to}</td>
        <td>{user}</td>
        <td>
            <div className={styles.dateText}>
                <span>{date.split(' ')[0]} {date.split(' ')[1]} {date.split(' ')[2]}</span>
                <span className={styles.timeText}>{date.split(' ')[3]}</span>
            </div>
        </td>
    </tr>
);

export default ReceiptHistory;
