"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ProfileForm from "@/components/ProfileForm";
import ProfileCard from "@/components/ProfileCard";
import styles from "./ProfilePage.module.css";
import CreateReceiptSheet from "@/components/CreateReceiptSheet";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: session, status } = useSession();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const handleProfileSaved = () => {
    // Trigger ProfileCard to re-fetch data
    setRefreshTrigger(prev => prev + 1);
  };

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-anuphan), sans-serif' }}>
        กำลังโหลดข้อมูลโปรไฟล์...
      </div>
    );
  }

  const isProfileNotCompleted = session?.user && (session.user as any).role !== "admin" && ((session as any).isProfileCompleted === false || (session.user as any).status === "pending");

  if (isProfileNotCompleted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        height: '100dvh', 
        width: '100vw',
        background: 'var(--bg-main, #0f172a)', 
        padding: '40px 20px',
        fontFamily: 'var(--font-anuphan), sans-serif',
        overflowY: 'auto',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ProfileForm onSaved={handleProfileSaved} />
        </div>
      </div>
    );
  }

  const isAccountInactive =
    session?.user &&
    (session.user as any).role !== "admin" &&
    (session.user as any).status !== "active" &&
    (session.user as any).status !== "pending";

  if (isAccountInactive) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100dvh', background: 'var(--bg-main, #0f172a)',
        fontFamily: 'var(--font-anuphan), sans-serif'
      }}>
        <div style={{ 
          maxWidth: '500px', 
          width: '100%', 
          padding: '40px 20px',
          background: '#fee2e2', 
          border: '1px solid #fca5a5',
          borderRadius: '12px', 
          color: '#991b1b',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
          <strong style={{ fontSize: '1.1rem' }}>✗ บัญชีถูกปิดใช้งาน หรือ คำขออนุมัติถูกปฏิเสธ</strong>
          <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#7f1d1d', lineHeight: '1.5' }}>
            กรุณาติดต่อผู้ดูแลระบบ เพื่อตรวจสอบข้อมูลของคุณ
          </p>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontFamily: 'var(--font-anuphan), sans-serif',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
          >
            ออกจากระบบ / Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
        onClick={closeSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onAddReceipt={openCreateSheet}
      />

      <main className="main-content">
        <TopBar
          title="โปรไฟล์ของฉัน"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="page-container">
          <div className={styles.profileContainer}>
            <ProfileForm onSaved={handleProfileSaved} />
          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        userId={session?.user?.id || 'user123'}
      />
    </div>
  );
}
