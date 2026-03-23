"use client";

import React from 'react';
import styles from './ReceiptHistory.module.css';

const ReceiptHistory = () => {
  return (
    <div style={{ flex: 1, minWidth: 0, paddingBottom: '40px' }}>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <span style={{ position: 'absolute', left: '14px', top: '10px', color: '#94a3b8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input type="text" className={styles.searchInput} placeholder="ค้นหาร้านค้า, วันที่, ยอดเงิน..." />
        </div>
        <div className={styles.filterGroup}>
          <div className={styles.filterLabel}>หมวดหมู่:</div>
          <div className={styles.btnGroup}>
            <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>ทั้งหมด</div>
            <div className={styles.filterBtn}>อาหาร</div>
            <div className={styles.filterBtn}>เครื่องใช้</div>
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
        <div>แสดง 1-6 จาก 1,240 รายการ</div>
        <div className={styles.pageCountSelect}>
          <span>แสดง:</span>
          {[5, 10, 25].map(n => (
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
              <th>ร้านค้า</th>
              <th>หมวดหมู่</th>
              <th>ยอดสุทธิ</th>
              <th>ชำระโดย</th>
              <th>สถานะ</th>
              <th>วันที่</th>
            </tr>
          </thead>
          <tbody>
            <TableRow
              store="7-Eleven"
              category="อาหารและเครื่องดื่ม"
              amount="125.00"
              method="K Plus"
              status="ตรวจสอบแล้ว"
              date="23 มี.ค. 2569"
              time="10:15"
              color="#10b981"
            />
            <TableRow
              store="Inthanin"
              category="เครื่องดื่ม"
              amount="65.00"
              method="Thai QR"
              status="ตรวจสอบแล้ว"
              date="23 มี.ค. 2569"
              time="09:40"
              color="#10b981"
            />
            <TableRow
              store="Grab Food"
              category="อาหาร"
              amount="320.00"
              method="บัตรเครดิต"
              status="รอตรวจสอบ"
              date="22 มี.ค. 2569"
              time="19:20"
              color="#f59e0b"
            />
            <TableRow
              store="Lotus's"
              category="สินค้าอุปโภค"
              amount="1,240.00"
              method="K Plus"
              status="ตรวจสอบแล้ว"
              date="22 มี.ค. 2569"
              time="14:30"
              color="#10b981"
            />
            <TableRow
              store="Starbucks"
              category="เครื่องดื่ม"
              amount="185.00"
              method="App Wallet"
              status="ตรวจสอบแล้ว"
              date="21 มี.ค. 2569"
              time="11:10"
              color="#059669"
            />
            <TableRow
              store="Big C"
              category="ของใช้ในบ้าน"
              amount="450.00"
              method="เงินสด"
              status="ตรวจสอบแล้ว"
              date="20 มี.ค. 2569"
              time="16:45"
              color="#ef4444"
            />
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
  status: 'ตรวจสอบแล้ว' | 'รอตรวจสอบ' | 'ปฏิเสธ';
  date: string;
  time: string;
  color: string;
}

const TableRow = ({ store, category, amount, method, status, date, time, color }: TableRowProps) => (
  <tr>
    <td>
      <div className={styles.storeInfo}>
        <div className={styles.storeIcon} style={{ background: `${color}15`, color: color }}>
          {store.charAt(0)}
        </div>
        <span style={{ fontWeight: 600 }}>{store}</span>
      </div>
    </td>
    <td>
      <span className={styles.categoryBadge}>{category}</span>
    </td>
    <td>
      <span className={styles.amountText}>฿ {amount}</span>
    </td>
    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{method}</td>
    <td>
      <div className={styles.statusWrapper}>
        <div className={styles.statusDot} style={{ background: status === 'ตรวจสอบแล้ว' ? '#10b981' : (status === 'รอตรวจสอบ' ? '#f59e0b' : '#ef4444') }}></div>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: status === 'ตรวจสอบแล้ว' ? '#059669' : (status === 'รอตรวจสอบ' ? '#d97706' : '#dc2626')
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
