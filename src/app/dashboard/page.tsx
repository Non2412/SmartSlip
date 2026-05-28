"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import ReceiptDetailSheet from '@/components/ReceiptDetailSheet';

import { StatCard, FilterBar, ReceiptTable, ExpenseChart, RecentUploads } from '@/components/DashboardItems';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { StatCardSkeleton, ChartSkeleton, RecentUploadsSkeleton } from '@/components/Skeleton';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const { receipts, fetchReceipts, deleteReceipt, loading } = useReceipts();



  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    await deleteReceipt(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // คำนวณสถิติจริง
  const totalAmount = receipts.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
  const pendingCount = receipts.filter(r => !r.extractedData).length;
  const approvedCount = receipts.filter(r => r.extractedData).length;

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
                  iconBg="#fff7ed"
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
                  <ExpenseChart receipts={receipts} />
                </div>
                <RecentUploads
                  receipts={receipts}
                  onReceiptClick={setSelectedReceipt}
                  onEdit={setSelectedReceipt}
                  onDelete={setDeleteConfirm}
                />
              </>
            )}
          </div>

          <FilterBar />

          <ReceiptTable loading={loading} receipts={receipts} />
        </div>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '28px 32px',
            width: 'min(400px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Icon */}
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              ต้องการลบ <strong style={{ color: '#1e293b' }}>{deleteConfirm.storeName || 'รายการนี้'}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '700', fontSize: '0.9rem', color: '#64748b', cursor: 'pointer' }}
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
            fetchReceipts(session.user.id);
          }
        }}
        userId={session?.user?.id || 'user123'}
      />

      <ReceiptDetailSheet
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onSuccess={() => {
          if (session?.user?.id) {
            fetchReceipts(session.user.id);
          }
          setSelectedReceipt(null);
        }}
      />
    </div>
  );
}
