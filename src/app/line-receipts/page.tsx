"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { Receipt } from '@/lib/apiClient';
import styles from './LineReceipts.module.css';

export default function LineReceiptsPage() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const { receipts, fetchReceipts, loading } = useReceipts();

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Proxy GCS images through local API to bypass public access restrictions
  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('storage.googleapis.com')) {
      return `/api/gcs-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Filter only receipts that came from LINE (show even if image upload failed)
  const lineReceipts = receipts.filter(r => r.source === 'line');

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
          mobileTitle="แกลเลอรี"
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
                <div
                  key={receipt.id}
                  className={styles.galleryCard}
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <div className={styles.imageContainer}>
                    {receipt.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageUrl(receipt.imageUrl)!} alt={`ใบเสร็จจาก ${receipt.storeName}`} loading="lazy" />
                    ) : (
                      <div className={styles.noImage}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>ไม่มีรูปภาพ</span>
                      </div>
                    )}
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

      {/* Detail Modal */}
      {selectedReceipt && (
        <div className={styles.modalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>รายละเอียดใบเสร็จ</h3>
              <button className={styles.modalClose} onClick={() => setSelectedReceipt(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {selectedReceipt.imageUrl && (
              <div className={styles.modalImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(selectedReceipt.imageUrl)!} alt="ใบเสร็จ" />
              </div>
            )}
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>ร้านค้า</span>
                <span className={styles.modalValue}>{selectedReceipt.storeName}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>ยอดรวม</span>
                <span className={`${styles.modalValue} ${styles.modalAmount}`}>
                  ฿ {selectedReceipt.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {selectedReceipt.extractedData?.date && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>วันที่ในใบเสร็จ</span>
                  <span className={styles.modalValue}>{selectedReceipt.extractedData.date}</span>
                </div>
              )}
              {selectedReceipt.extractedData?.method && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>วิธีชำระ</span>
                  <span className={styles.modalValue}>{selectedReceipt.extractedData.method}</span>
                </div>
              )}
              {selectedReceipt.extractedData?.receiver && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>ผู้รับ</span>
                  <span className={styles.modalValue}>{selectedReceipt.extractedData.receiver}</span>
                </div>
              )}
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>บันทึกเมื่อ</span>
                <span className={styles.modalValue}>
                  {new Date(selectedReceipt.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              {(selectedReceipt.extractedData?.items as any[])?.length > 0 && (
                <div className={styles.modalItems}>
                  <div className={styles.modalLabel}>รายการสินค้า</div>
                  {(selectedReceipt.extractedData!.items as any[]).map((item: any, i: number) => (
                    <div key={i} className={styles.modalItem}>
                      <span>{item.description}</span>
                      <span>฿{Number(item.totalPrice || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
