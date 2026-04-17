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

  // Setup Google Drive folder on first login
  useEffect(() => {
    console.log('🔍 useEffect ทำงาน, session:', session);
    console.log('🔍 user ID:', session?.user?.id);
    
    const setupGoogleDrive = async () => {
      if (!session?.user?.id || !session?.user?.email) {
        console.log('⚠️ รอเซสชัน... ID:', session?.user?.id, 'Email:', session?.user?.email);
        return;
      }

      try {
        console.log('📁 ตั้งค่าโฟลเดอร์ Google Drive สำหรับผู้ใช้:', session.user.id, session.user.email);
        const response = await fetch('/api/drive/setup', {
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
          console.error('❌ ล้มเหลวในการตั้งค่า:', error);
          return;
        }

        const data = await response.json();
        console.log('✅ ตั้งค่า Google Drive สำเร็จ:', data);
      } catch (error) {
        console.error('❌ ข้อผิดพลาดในการตั้งค่า:', error);
      }
    };

    setupGoogleDrive();
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

