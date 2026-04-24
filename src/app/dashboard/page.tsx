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
      if (!session?.user?.id || !session?.user?.email) {
        console.log('⚠️ Waiting for session... ID:', session?.user?.id);
        return;
      }

      try {
        const isLineUser = (session as any)?.lineUserName ? true : false;
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

        {/* Google Drive Auth Section */}
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>ตั้งค่า Google Drive:</span>
          <GoogleDriveAuth showText={true} />
        </div>

        <div className="page-container">
          {/* Summary Stats Row */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
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
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <ExpenseChart />
            <RecentUploads />
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
