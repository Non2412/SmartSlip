'use client';


import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { StatCard } from '@/components/DashboardItems';
import ReceiptHistory from '@/app/history/ReceiptHistory';
import { CreateReceiptModal } from '@/app/createreceipt/CreateReceiptModal';
import { useReceipts } from '@/hooks/useReceipts';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardPage() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { receipts, fetchReceipts, loading, error } = useReceipts();

  const [userId, setUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // ดึง user ID จาก session เมื่อ session โหลดเสร็จ
    if (session?.user?.id) {
      setUserId(session.user.id)
      fetchReceipts(session.user.id)
    }
  }, [session, fetchReceipts]);

  useEffect(() => {
    // ปิด sidebar เมื่อเปลี่ยนหน้า
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // คำนวณสถิติ
  const totalExpense = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const pendingCount = receipts.filter(r => !r.extractedData).length;
  const approvedCount = receipts.filter(r => r.extractedData).length;

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
  };

  const handleModalSuccess = () => {
    // รีโหลดข้อมูลหลังจากสร้างใบเสร็จใหม่
    if (userId) {
      fetchReceipts(userId);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={closeSidebar}
      />

      <Sidebar 
        onAddReceipt={() => {
          setShowCreateModal(true);
          closeSidebar();
        }} 
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      <main className="main-content">
        <TopBar 
          title="ภาพรวมรายจ่าย" 
          onCreateNew={handleCreateNew} 
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
              subValue={loading ? "กำลังโหลด..." : `฿ ${(totalExpense || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              value=""
              trend="+12.5%"
            />
            <StatCard
              title="รอตรวจสอบ"
              value={loading ? "..." : `${pendingCount} รายการ`}
              status="รออนุมัติ"
            />
            <StatCard
              title="อนุมัติแล้ว"
              value={loading ? "..." : `${approvedCount} รายการ`}
              trend="+5%"
            />
          </div>

          {/* Content Row: History Table */}
          <div style={{
            display: 'block',
            width: '100%'
          }}>
            <ReceiptHistory 
              receipts={receipts} 
              loading={loading} 
              error={error} 
            />
          </div>
        </div>
      </main>

      {/* Modal สร้างใบเสร็จ (Side Panel) */}
      <CreateReceiptModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        userId={userId}
      />
    </div>
  );
}
