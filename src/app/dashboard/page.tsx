"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import dynamic from 'next/dynamic';

const CreateReceiptSheet = dynamic(() => import('@/components/CreateReceiptSheet'), { ssr: false });
const ReceiptDetailSheet = dynamic(() => import('@/components/ReceiptDetailSheet'), { ssr: false });

import { StatCard, ReceiptTable, FilterBar, ExpenseChart, RecentUploads } from '@/components/DashboardItems';
import { useState, useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { StatCardSkeleton, ChartSkeleton, RecentUploadsSkeleton } from '@/components/Skeleton';
import { identifyDuplicateReceipts } from '@/lib/ocr-utils';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [searchText, setSearchText] = useState('');
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [recentlyEditedId, setRecentlyEditedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { receipts, fetchReceipts, deleteReceipt, loading } = useReceipts();
  const [showAiWidget, setShowAiWidget] = useState(true);

  const handleReceiptClick = (r: any) => setSelectedReceipt(r);

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  const filterCategories = ['ทั้งหมด', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ'];

  // Auto-open receipt detail sheet if openReceiptId is present in URL
  useEffect(() => {
    if (receipts.length > 0) {
      const openReceiptId = searchParams.get('openReceiptId');
      if (openReceiptId) {
        const matched = receipts.find(r => (r._id || r.id) === openReceiptId);
        if (matched) {
          handleReceiptClick(matched);
          // Clean the query parameter from URL to avoid reopening on reload
          const newUrl = window.location.pathname;
          window.history.replaceState({ path: newUrl }, '', newUrl);
        }
      }
    }
  }, [receipts, searchParams]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    await deleteReceipt(deleteConfirm._id || deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // คำนวณสถิติจริง (ไม่รวมใบที่ซ้ำกัน)
  const uniqueReceipts = useMemo(() => {
    const { duplicateIds } = identifyDuplicateReceipts(receipts);
    return receipts.filter(r => !duplicateIds.has(r._id || r.id || ''));
  }, [receipts]);

  const aiDynamicInsight = useMemo(() => {
    const { duplicateIds } = identifyDuplicateReceipts(receipts);
    if (duplicateIds.size > 0) {
      return `สะกิดเตือนหน่อยน้า! พี่สแกนเจอใบเสร็จที่ข้อมูลซ้ำกันจำนวน ${duplicateIds.size} รายการในระบบ ลองเข้าไปตรวจสอบและลบออกแบบกลุ่มในหน้า "รูปภาพ" เพื่อให้สถิติถูกต้องนะครับผม`;
    }
    return `ตอนนี้พี่สแกนตรวจแล้วยังไม่พบใบเสร็จที่ข้อมูลซ้ำกันในระบบเลยครับ ยอดเยี่ยมมาก! ลองกดดูรายการเพื่อตรวจสอบซ้ำได้ตลอดเวลานะครับผม`;
  }, [receipts]);

  const aiInsightAction = { label: 'ดูใบเสร็จซ้ำกัน', href: '/line-receipts?tab=duplicate' };

  const { totalAmount, pendingCount, approvedCount } = useMemo(() => ({
    totalAmount: uniqueReceipts.reduce((acc, r) => acc + ((r.amount !== undefined ? r.amount : r.totalAmount) || 0), 0),
    pendingCount: uniqueReceipts.filter(r => r.isPending || !r.extractedData).length,
    approvedCount: uniqueReceipts.filter(r => !r.isPending && r.extractedData).length,
  }), [uniqueReceipts]);

  const budgetAlerts: any[] = [];

  const filteredReceipts = useMemo(() => uniqueReceipts.filter(r => {
    // 1. Category filter
    const cat = r.extractedData?.category || 'อื่นๆ';
    const matchCat = activeCategory === 'ทั้งหมด' || cat === activeCategory;

    // 2. Period filter
    let matchPeriod = true;
    const dateObj = new Date(r.extractedData?.date || r.createdAt);
    if (activePeriod === '7 วัน') {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) matchPeriod = false;
    } else if (activePeriod === 'รายเดือน') {
      if (dateObj.getMonth() !== filterMonth || dateObj.getFullYear() !== filterYear) {
        matchPeriod = false;
      }
    } else if (activePeriod === 'รายปี') {
      if (dateObj.getFullYear() !== filterYear) {
        matchPeriod = false;
      }
    }

    // 3. Search query filter
    const q = searchText.trim().toLowerCase();
    const matchSearch = !q || (r.storeName || '').toLowerCase().includes(q) ||
      String((r.amount ?? r.totalAmount) || '').includes(q) || cat.toLowerCase().includes(q);

    return matchCat && matchPeriod && matchSearch;
  }), [uniqueReceipts, activeCategory, activePeriod, filterMonth, filterYear, searchText]);

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onAddReceipt={openCreateSheet}
      />

      <main className="main-content">
        <TopBar
          title="ภาพรวมรายจ่าย"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="page-container">
          {/* Budget Warnings Banner */}
          {!loading && budgetAlerts.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {budgetAlerts.map((alert, idx) => (
                <div key={idx} style={{
                  padding: '12px 18px', borderRadius: '10px',
                  background: alert.type === 'danger' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                  border: alert.type === 'danger' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)',
                  color: alert.type === 'danger' ? '#ef4444' : '#f59e0b',
                  fontSize: '0.85rem', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <span>{alert.type === 'danger' ? '🚨' : '⚠️'}</span>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats Row */}
          <div className={styles.summaryStatsRow}>
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title="ยอดใช้จ่ายรวม"
                  value={`฿ ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
                  trend="+12.5%"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  }
                />
                <StatCard
                  title="รอตรวจสอบ"
                  value={`${pendingCount} รายการ`}
                  status="รออนุมัติ"
                  iconBg="orange"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  }
                />
                <StatCard
                  title="อนุมัติแล้ว"
                  value={`${approvedCount} รายการ`}
                  trend="+5%"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  }
                />
              </>
            )}
          </div>

          {/* AI Coach Insights Card */}
          {!loading && showAiWidget && (
            <div className={styles.aiInsightCard}>
              <div className={styles.aiInsightAvatar} style={{ overflow: 'visible', background: 'none', boxShadow: 'none', padding: 0 }}>
                <img
                  src="/BOT.png"
                  alt="SmartSlip AI"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <div className={styles.aiAvatarPing}></div>
              </div>
              <div className={styles.aiInsightContent}>
                <span className={styles.aiInsightTag}>💬 คำแนะนำจากพี่ SmartSlip AI:</span>
                <p className={styles.aiInsightText}>{aiDynamicInsight}</p>
              </div>
              <div className={styles.aiInsightActions}>
                <button
                  onClick={() => window.location.href = aiInsightAction.href}
                  className={styles.aiInsightBtn}
                >
                  {aiInsightAction.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
                <button 
                  className={styles.aiInsightClose} 
                  onClick={() => setShowAiWidget(false)}
                  title="ปิดข้อความ"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className={styles.chartsRow}>
            {loading ? (
              <>
                <div className={styles.chartColSpan2}>
                  <ChartSkeleton />
                </div>
                <RecentUploadsSkeleton />
              </>
            ) : (
              <>
                <div className={styles.chartColSpan2}>
                  <ExpenseChart receipts={uniqueReceipts} />
                </div>
                <RecentUploads
                  receipts={uniqueReceipts.filter(r => r.source === 'line')}
                  onReceiptClick={handleReceiptClick}
                  onEdit={handleReceiptClick}
                  onDelete={setDeleteConfirm}
                  recentlyEditedId={recentlyEditedId}
                />
              </>
            )}
          </div>
          <FilterBar
            searchText={searchText}
            onSearchChange={setSearchText}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            activePeriod={activePeriod}
            onPeriodChange={setActivePeriod}
            filterMonth={filterMonth}
            onMonthChange={setFilterMonth}
            filterYear={filterYear}
            onYearChange={setFilterYear}
            categories={filterCategories}
          />
          <ReceiptTable loading={loading} receipts={filteredReceipts} recentlyEditedId={recentlyEditedId} />
        </div>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px 32px',
            width: 'min(400px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Icon */}
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              ต้องการลบ <strong style={{ color: 'var(--text-main)' }}>{deleteConfirm.storeName || 'รายการนี้'}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirmed}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSuccess={() => {
          if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
            setToastMsg('อัปโหลดและสร้างใบเสร็จสำเร็จ!');
            setTimeout(() => setToastMsg(null), 6000);
          }
        }}
        userId={session?.user?.id || 'user123'}
      />

      <ReceiptDetailSheet
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt ?? undefined}
        onClose={() => setSelectedReceipt(null)}
        onSuccess={(id) => {
          if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
          }
          if (id) {
            setRecentlyEditedId(id);
            setToastMsg('แก้ไขข้อมูลสำเร็จ! คุณสามารถกลับไปเช็ครูปภาพของรายการนี้ได้');
            setTimeout(() => {
              setRecentlyEditedId(null);
            }, 15000);
            setTimeout(() => setToastMsg(null), 8000);
          }
          setSelectedReceipt(null);
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          backgroundColor: '#0f172a', color: 'white', padding: '16px 20px',
          borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '12px',
          fontFamily: 'inherit',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideIn {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>ทำรายการสำเร็จ</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{toastMsg}</div>
          </div>
          <button onClick={() => setToastMsg(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold', marginLeft: '12px' }}>✕</button>
        </div>
      )}
    </div>
  );
}
