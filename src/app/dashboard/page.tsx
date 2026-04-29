"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { GoogleDriveAuth } from '@/components/GoogleDriveAuth';
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

  // Setup Google Drive folder on first login (for both Google and LINE users)
  useEffect(() => {
    console.log('🔍 Dashboard loaded, session:', session?.user?.id);

    const autoSetupGoogleDrive = async () => {
      if (!session?.user?.id) {
        console.log('⚠️ Waiting for session... ID:', session?.user?.id);
        return;
      }

      try {
        const isLineUser = (session as unknown as { lineUserName: string })?.lineUserName ? true : false;
        console.log(`📁 Auto-setting up Google Drive for ${isLineUser ? 'LINE' : 'Google'} user:`, session.user.id);

        const response = await fetch('/api/drive/auto-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error(`❌ Failed to setup (Status ${response.status}):`, errorData);
          if (errorData?.error) {
            console.error('Error detail:', errorData.error);
          }
          return;
        }

        const data = await response.json();
        console.log('✅ Google Drive auto-setup successful:', data);

        // Link LINE user ID + Google Drive folder + Sheet to backend user record
        const lineUserId = (session as any)?.lineUserId;
        const folderId = data?.data?.userFolderId || data?.folderId;
        const sheetId = data?.data?.googleSheetId || data?.googleSheetId;
        console.log('🔍 lineUserId:', lineUserId, 'folderId:', folderId, 'sheetId:', sheetId);
        if (lineUserId) {
          try {
            const linkRes = await fetch('https://smart-slip-api.vercel.app/api/user/link-line', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: session.user.id,
                lineUserId: lineUserId,
                googleDriveFolderId: folderId,
                googleSheetId: sheetId,
              }),
            });
            const linkData = await linkRes.json();
            console.log('✅ LINE user linked to Drive+Sheets:', linkData);
          } catch (linkErr) {
            console.warn('⚠️ LINE link failed (non-critical):', linkErr);
          }
        }
      } catch (error) {
        console.error('❌ Setup error:', error);
      }
    };

    autoSetupGoogleDrive();
  }, [session]);

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
          {/* Google Drive Auth Section */}
          <div className={styles.driveSection}>
            <span className={styles.driveLabel}>ตั้งค่า Google Drive:</span>
            <GoogleDriveAuth showText={true} />
          </div>

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
                  <ExpenseChart />
                </div>
                <RecentUploads />
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
      />
    </div>
  );
}
