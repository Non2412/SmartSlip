import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { StatCard, ExpenseChart, RecentUploads } from '@/components/DashboardItems';

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
