"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useReceipts } from '@/hooks/useReceipts';
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
            <p className={styles.subTitle}>ติดตามข้อมูลต้องสงสัยและแจ้งเตือนข้อผิดพลาด</p>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>ตรวจพบสลิปใบเสร็จรอตรวจสอบจำนวน <strong>{pendingReceipts.length} รายการ</strong> ที่อาจไม่ถูกต้องหรือมีปัญหา</span>
                </div>

                {pendingReceipts.map(receipt => {
                  const receiptId = receipt._id || receipt.id;
                  const shopName = receipt.storeName || 'ไม่ระบุร้านค้า';
                  const amountText = (receipt.amount !== undefined ? receipt.amount : receipt.totalAmount) 
                    ? `ยอดเงิน ฿${((receipt.amount !== undefined ? receipt.amount : receipt.totalAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                    : 'ไม่ระบุยอดเงิน';
                  const dateText = new Date(receipt.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div key={receiptId} className={styles.alertCard}>
                      <div className={styles.alertLeft}>
                        <div className={styles.warningIconCircle}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className={styles.alertBody}>
                        <div className={styles.alertHeadingRow}>
                          <h4 className={styles.alertTitle}>ใบเสร็จรอตรวจสอบ - {shopName}</h4>
                          <span className={styles.alertMeta}>{dateText} • {amountText}</span>
                        </div>
                        <p className={styles.alertText}>
                          ตรวจพบสลิปใบเสร็จนี้มีสถานะรอการตรวจสอบ ข้อมูลอาจไม่ถูกต้อง ครบถ้วน หรือมีปัญหาจากการประมวลผล OCR อัตโนมัติ กรุณาทำการตรวจสอบและปรับปรุงแก้ไขข้อมูลด้วยตนเอง
                        </p>
                        <div className={styles.alertActions}>
                          <Link href={`/dashboard?openReceiptId=${receiptId}`} className={styles.inspectBtn}>
                            ตรวจสอบและแก้ไขข้อมูล
                          </Link>
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
