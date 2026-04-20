"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { GoogleDriveAuth } from '@/components/GoogleDriveAuth';
import { StatCard, ExpenseChart, RecentUploads } from '@/components/DashboardItems';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

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
          const error = await response.json();
          console.error('❌ Failed to setup:', error);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Sidebar Overlay for mobile */}
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
              subValue="฿ 425,000.00"
              value=""
              trend="+12.5%"
            />
            <StatCard
              title="รอตรวจสอบ"
              value="15 รายการ"
              status="รออนุมัติ"
            />
            <StatCard
              title="อนุมัติแล้ว"
              value="128 รายการ"
              trend="+5%"
            />
          </div>

          {/* Charts and Lists Row */}
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <ExpenseChart />
            <RecentUploads />
          </div>
        </div>
      </main>

      <CreateReceiptSheet 
        isOpen={isCreateSheetOpen} 
        onClose={closeCreateSheet} 
      />
    </div>
  );
}

