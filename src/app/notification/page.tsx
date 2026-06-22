"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useReceipts } from '@/hooks/useReceipts';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';
import styles from './Notification.module.css';

export default function NotificationPage() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const { receipts, fetchReceipts, loading } = useReceipts();

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  // Filter for receipts in pending status (no extractedData)
  const pendingReceipts = receipts.filter(r => !r.extractedData);

  return (
    <div className="dashboard-layout">
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} onAddReceipt={openCreateSheet} />

      <main className="main-content">
        <TopBar
          title="การแจ้งเตือน"
          mobileTitle="แจ้งเตือน"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="page-container">
          <div className={styles.headerArea}>
            <h1 className={styles.mainTitle}>การแจ้งเตือนระบบ</h1>
            <p className={styles.subTitle}>ติดตามและยืนยันข้อมูลใบเสร็จที่อยู่ในสถานะรอตรวจสอบความถูกต้อง</p>
          </div>

          <div className={styles.notificationsContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>กำลังค้นหาข้อมูลแจ้งเตือน...</p>
              </div>
            ) : pendingReceipts.length === 0 ? (
              /* Clean Success State */
              <div className={styles.emptyState}>
                <div className={styles.successIconWrapper}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className={styles.emptyTitle}>ไม่มีรายการแจ้งเตือนในขณะนี้</h3>
                <p className={styles.emptySubtitle}>ใบเสร็จทุกใบได้รับการตรวจสอบและยืนยันข้อมูลเรียบร้อยแล้ว ไม่พบสถานะรอตรวจสอบ</p>
                <Link href="/dashboard" className={styles.dashboardLink}>
                  ไปที่หน้ารายการใบเสร็จ
                </Link>
              </div>
            ) : (
              /* Alerts list */
              <div className={styles.alertsList}>
                <div className={styles.alertSummaryBanner}>
                  <div className={styles.bannerIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <span>ตรวจพบสลิปใบเสร็จรอตรวจสอบจำนวน <strong>{pendingReceipts.length} รายการ</strong> ที่ข้อมูลอาจต้องการความถูกต้อง</span>
                </div>

                {pendingReceipts.map(receipt => {
                  const receiptId = receipt._id || receipt.id;
                  const shopName = receipt.storeName || 'ไม่ระบุร้านค้า';
                  const rawAmount = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
                  const amountText = rawAmount !== undefined
                    ? `฿${rawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                    : 'ไม่ระบุยอดเงิน';
                  const dateText = new Date(receipt.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const isLine = receipt.source === 'line' || receipt.transactionId?.startsWith('LINE-') || receipt.transactionId?.startsWith('web-LINE-');
                  const imgUrl = cleanAndProxyImageUrl(receipt.imageUrl || receipt.imageURL);

                  return (
                    <div key={receiptId} className={styles.alertCard}>
                      <div className={styles.alertMainSection}>
                        {/* Thumbnail Image Section */}
                        <div className={styles.thumbnailWrapper}>
                          {imgUrl ? (
                            <div className={styles.imageContainer}>
                              <Image
                                src={imgUrl}
                                alt={shopName}
                                fill
                                unoptimized
                                className={styles.receiptImage}
                              />
                            </div>
                          ) : (
                            <div className={styles.warningIconCircle}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Content Body */}
                        <div className={styles.alertContent}>
                          <div className={styles.alertHeaderRow}>
                            <h4 className={styles.alertTitle}>ใบเสร็จรอตรวจสอบ • {shopName}</h4>
                            {isLine ? (
                              <span className={styles.sourceBadgeLine}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                                  <path d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.3 10.1 10.1l-.4 2.2c-.1.5.2.5.4.3l2.8-2.6c3.9-.3 11.1-2.9 11.1-9.7z"/>
                                </svg>
                                LINE
                              </span>
                            ) : (
                              <span className={styles.sourceBadgeWeb}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="2" y1="12" x2="22" y2="12" />
                                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                Web Portal
                              </span>
                            )}
                          </div>

                          <div className={styles.metaRow}>
                            <span className={styles.metaDate}>{dateText}</span>
                            <span className={styles.metaAmount}>{amountText}</span>
                            {receipt.extractedData?.category && (
                              <span className={styles.metaCategory}>{receipt.extractedData.category}</span>
                            )}
                          </div>

                          <p className={styles.alertText}>
                            ใบเสร็จนี้อยู่ระหว่างรอตรวจสอบเพื่อนำไปคำนวณสถิติรายจ่าย ข้อมูลระบบอาจขาดความถูกต้องสมบูรณ์หรืออยู่ระหว่างขั้นตอนการแปลง OCR
                          </p>

                          <div className={styles.alertActions}>
                            <Link href={`/dashboard?openReceiptId=${receiptId}`} className={styles.inspectBtn}>
                              <span>ตรวจสอบและแก้ไขข้อมูล</span>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '6px' }}>
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSuccess={() => {
          if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
          }
        }}
        userId={session?.user?.id || 'user123'}
      />
    </div>
  );
}
