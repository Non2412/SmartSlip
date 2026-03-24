'use client';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { StatCard } from '@/app/dashborad/DashboardItems';
import ReceiptHistory from '@/app/history/ReceiptHistory';
import { CreateReceiptModal } from '@/app/createreceipt/CreateReceiptModal';
import { useReceipts } from '@/hooks/useReceipts';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { receipts, fetchReceipts, loading } = useReceipts();
  const [userId, setUserId] = useState<string>('user123'); // ใช้ ID เริ่มต้น
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // เรียก API เพื่อดึงรายการใบเสร็จ
    fetchReceipts(userId);
  }, []);

  // คำนวณสถิติ
  const totalExpense = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
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
    fetchReceipts(userId);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onAddReceipt={() => setIsSheetOpen(true)} />

      <main className="main-content">
        <TopBar title="ภาพรวมรายจ่าย" onCreateNew={handleCreateNew} />

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
              subValue={`฿ ${totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              value=""
              trend="+12.5%"
            />
            <StatCard
              title="รอตรวจสอบ"
              value={`${pendingCount} รายการ`}
              status="รออนุมัติ"
            />
            <StatCard
              title="อนุมัติแล้ว"
              value={`${approvedCount} รายการ`}
              trend="+5%"
            />
          </div>

          {/* Content Row: History Table */}
          <div style={{
            display: 'block',
            width: '100%'
          }}>
            <ReceiptHistory />
          </div>
        </div>
      </main>

      {/* Modal สร้างใบเสร็จ */}
      <CreateReceiptModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        userId={userId}
      />
    </div>
  );
}
