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
import { identifyDuplicateReceipts } from '@/lib/ocr-utils';
import styles from './Notification.module.css';

export default function NotificationPage() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const { receipts, fetchReceipts, loading } = useReceipts();
  const [budgets, setBudgets] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  // Load budgets settings
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.budgets) {
          setBudgets(data.budgets);
        }
      })
      .catch(console.error);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  // Filter for receipts in pending status (no extractedData)
  const pendingReceipts = receipts.filter(r => !r.extractedData);

  // Calculate duplicate statistics and current month budget spend ratios
  const normalizedReceipts = receipts.map(r => {
    const doc = { ...r, id: r._id || r.id };
    if (doc.amount !== undefined && doc.totalAmount === undefined) {
      doc.totalAmount = doc.amount;
    }
    return doc;
  });

  const { duplicateIds } = identifyDuplicateReceipts(normalizedReceipts);
  const duplicatesCount = duplicateIds.size;
  const uniqueReceipts = normalizedReceipts.filter(r => !duplicateIds.has(r.id || ''));

  // Current month calculation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthUniqueReceipts = uniqueReceipts.filter(r => {
    const dateStr = r.extractedData?.date || r.createdAt;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  let foodSpent = 0;
  let travelSpent = 0;
  let shoppingSpent = 0;
  let otherSpent = 0;
  let totalSpent = 0;

  currentMonthUniqueReceipts.forEach(r => {
    const amt = Number(r.amount !== undefined ? r.amount : (r.totalAmount || 0));
    totalSpent += amt;
    
    const cat = r.extractedData?.category || 'อื่นๆ';
    if (cat === 'อาหาร') {
      foodSpent += amt;
    } else if (cat === 'เดินทาง') {
      travelSpent += amt;
    } else if (cat === 'ช้อปปิ้ง') {
      shoppingSpent += amt;
    } else {
      otherSpent += amt;
    }
  });

  const budgetAlerts: any[] = [];
  if (budgets) {
    const checkBudget = (spent: number, limit: number, name: string) => {
      if (limit > 0) {
        const percent = (spent / limit) * 100;
        if (percent >= 100) {
          budgetAlerts.push({
            type: 'danger',
            message: `งบประมาณสำหรับหมวดหมู่ "${name}" เกินกำหนด 100% แล้ว (ใช้ไป ฿${spent.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จากงบ ฿${limit.toLocaleString('th-TH')})`
          });
        } else if (percent >= 80) {
          budgetAlerts.push({
            type: 'warning',
            message: `งบประมาณสำหรับหมวดหมู่ "${name}" สูงเกิน 80% แล้ว (ใช้ไป ฿${spent.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จากงบ ฿${limit.toLocaleString('th-TH')})`
          });
        }
      }
    };

    checkBudget(foodSpent, budgets.food, 'อาหาร');
    checkBudget(travelSpent, budgets.travel, 'เดินทาง');
    checkBudget(shoppingSpent, budgets.shopping, 'ช้อปปิ้ง');
    checkBudget(otherSpent, budgets.other, 'อื่นๆ');
    checkBudget(totalSpent, budgets.total, 'ยอดรวมทั้งหมด');
  }

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
            {/* Custom Audit & Budget Alerts (Top section) */}
            {!loading && (budgetAlerts.length > 0 || duplicatesCount > 0) && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Duplicate receipts alert */}
                {duplicatesCount > 0 && (
                  <div style={{
                    padding: '16px 20px', borderRadius: '12px',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', fontSize: '0.9rem' }}>ตรวจพบใบเสร็จซ้ำซ้อนในระบบ</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>พบใบเสร็จที่มีรูปภาพหรือองค์ประกอบธุรกรรมตรงกันจำนวน {duplicatesCount} รายการ ถูกซ่อนเพื่อความถูกต้อง</span>
                      </div>
                    </div>
                    <Link href="/line-receipts" style={{
                      padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none'
                    }}>
                      ดูรายการสลิปซ้ำ
                    </Link>
                  </div>
                )}

                {/* Budget limits alert list */}
                {budgetAlerts.map((alert, index) => (
                  <div key={index} style={{
                    padding: '14px 20px', borderRadius: '12px',
                    background: alert.type === 'danger' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: alert.type === 'danger' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>{alert.type === 'danger' ? '🚨' : '⚠️'}</span>
                    <div>
                      <strong style={{ color: 'var(--text-main)', display: 'block', fontSize: '0.9rem' }}>
                        {alert.type === 'danger' ? 'งบประมาณเกินกำหนด (Limit Exceeded)' : 'งบประมาณใกล้เต็ม (Budget Warning)'}
                      </strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{alert.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
