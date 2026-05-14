"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';

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
  const { receipts, fetchReceipts, loading } = useReceipts();



  useEffect(() => {
    if (session?.user?.id) {
      fetchReceipts(session.user.id);
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
                <RecentUploads receipts={receipts} />
              </>
            )}
          </div>

          <FilterBar />

          <ReceiptTable loading={loading} receipts={receipts} />
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSuccess={() => {
          if (session?.user?.id) {
            fetchReceipts(session.user.id);
          }
        }}
      />
    </div>
  );
}
