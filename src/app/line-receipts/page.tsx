"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './LineReceipts.module.css';

export default function LineReceiptsPage() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { receipts, fetchReceipts, loading } = useReceipts();

  useEffect(() => {
    if (session?.user?.id) {
      fetchReceipts(session.user.id);
    }
  }, [session, fetchReceipts]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Filter only receipts that came from LINE and have an image
  const lineReceipts = receipts.filter(r => r.source === 'line' && r.imageUrl);

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      <main className="main-content">
        <TopBar
          title="แกลเลอรีรูปใบเสร็จจาก LINE"
          onToggleSidebar={toggleSidebar}
        />

        <div className="page-container">
          <div className={styles.header}>
            <h2>รูปใบเสร็จที่ส่งผ่าน LINE</h2>
            <p>รวมรูปภาพทั้งหมดที่คุณส่งเข้ามาผ่านบอท LINE</p>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>กำลังโหลดรูปภาพ...</p>
            </div>
          ) : lineReceipts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <h3>ยังไม่มีรูปภาพจาก LINE</h3>
              <p>ลองส่งรูปใบเสร็จเข้าไปในแชท LINE Bot ของคุณดูสิ!</p>
            </div>
          ) : (
            <div className={styles.galleryGrid}>
              {lineReceipts.map(receipt => (
                <div key={receipt.id} className={styles.galleryCard}>
                  <div className={styles.imageContainer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={receipt.imageUrl} alt={`ใบเสร็จจาก ${receipt.storeName}`} loading="lazy" />
                  </div>
                  <div className={styles.cardDetails}>
                    <div className={styles.storeName}>{receipt.storeName}</div>
                    <div className={styles.amount}>฿ {receipt.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                    <div className={styles.date}>
                      {new Date(receipt.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
