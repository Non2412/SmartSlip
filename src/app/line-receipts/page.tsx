"use client";

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ReceiptDetailSheet from '@/components/ReceiptDetailSheet';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './LineReceipts.module.css';

const VIEWED_KEY = 'smartslip_viewed_receipts';
const UNREAD_EVENT = 'smartslip_unread_update';

function getViewedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(VIEWED_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
}

function saveViewedIds(ids: Set<string>) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new Event(UNREAD_EVENT));
}

export default function LineReceiptsPage() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const { receipts, fetchReceipts, deleteReceipt, loading } = useReceipts();

  // Load viewed IDs from localStorage on mount
  useEffect(() => {
    setViewedIds(getViewedIds());
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchReceipts(session.user.id);
    }
  }, [session, fetchReceipts]);

  // Update unread count in localStorage whenever receipts or viewedIds change
  const lineReceipts = receipts.filter(r => r.extractedData?.imageData || r.imageUrl);

  useEffect(() => {
    if (lineReceipts.length === 0) return;
    const unread = lineReceipts.filter(r => !viewedIds.has(r.id)).length;
    localStorage.setItem('smartslip_unread_count', String(unread));
    window.dispatchEvent(new Event(UNREAD_EVENT));
  }, [lineReceipts, viewedIds]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const markAsViewed = useCallback((id: string) => {
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveViewedIds(next);
      return next;
    });
  }, []);

  const handleReceiptClick = (receipt: any) => {
    markAsViewed(receipt.id);
    setSelectedReceipt(receipt);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    await deleteReceipt(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

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
              {lineReceipts.map(receipt => {
                const isNew = !viewedIds.has(receipt.id);
                return (
                  <div
                    key={receipt.id}
                    className={styles.galleryCard}
                    onClick={() => handleReceiptClick(receipt)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {/* NEW badge — red dot */}
                    {isNew && (
                      <div style={{
                        position: 'absolute', top: '8px', left: '8px', zIndex: 10,
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: '#ef4444', border: '2px solid white',
                        boxShadow: '0 0 0 2px rgba(239,68,68,0.3)',
                      }} title="ใหม่" />
                    )}

                    {/* Three-dot menu */}
                    <div
                      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                            if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            border: 'none', background: 'rgba(255,255,255,0.9)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1rem', fontWeight: '900', color: '#374151',
                          }}
                        >⋮</button>
                        <div style={{
                          display: 'none', position: 'absolute', right: 0, top: '32px',
                          background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '130px', overflow: 'hidden', zIndex: 20,
                        }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleReceiptClick(receipt);
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            แก้ไข
                          </button>
                          <div style={{ height: '1px', background: '#f3f4f6', margin: '0 10px' }} />
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirm(receipt);
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff1f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.imageContainer}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={receipt.extractedData?.imageData || receipt.imageUrl} alt={`ใบเสร็จจาก ${receipt.storeName}`} loading="lazy" />
                    </div>
                    <div className={styles.cardDetails}>
                      <div className={styles.storeName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {receipt.storeName}
                        {isNew && (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '20px', letterSpacing: '0.02em' }}>
                            ใหม่
                          </span>
                        )}
                      </div>
                      <div className={styles.amount}>฿ {receipt.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                      <div className={styles.date}>
                        {new Date(receipt.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px 32px', width: 'min(400px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              ต้องการลบ <strong style={{ color: '#1e293b' }}>{deleteConfirm.storeName || 'รายการนี้'}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '700', fontSize: '0.9rem', color: '#64748b', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleDeleteConfirmed} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Detail Sheet ── */}
      <ReceiptDetailSheet
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onSuccess={() => {
          if (session?.user?.id) fetchReceipts(session.user.id);
          setSelectedReceipt(null);
        }}
      />
    </div>
  );
}