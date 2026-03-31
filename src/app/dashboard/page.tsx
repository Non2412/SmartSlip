"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { StatCard, ExpenseChart, RecentUploads } from '@/components/DashboardItems';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardPage() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

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
      />

      <main className="main-content">
        <TopBar 
          title="ภาพรวมรายจ่าย" 
          onToggleSidebar={toggleSidebar}
        />

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
    </div>
  );
}

