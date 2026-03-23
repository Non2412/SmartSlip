import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { StatCard, RecentUploads } from '@/components/DashboardItems';
import ReceiptHistory from '@/components/ReceiptHistory';

export default function DashboardPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <TopBar title="ภาพรวมรายจ่าย" />

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

          {/* Content Row: History and Recent Uploads */}
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1.8, minWidth: 0 }}>
              <ReceiptHistory />
            </div>
            
            <div style={{ flex: 1, minWidth: '320px' }}>
              <RecentUploads />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
