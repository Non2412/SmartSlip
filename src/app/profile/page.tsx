"use client";

import { useState, useEffect } from "react";
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
  const { data: session, status, update } = useSession();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const handleProfileSaved = () => {
    // Trigger ProfileCard to re-fetch data
    setRefreshTrigger(prev => prev + 1);
  };

  // Polling to detect admin approval
  useEffect(() => {
    if (!session || (session.user as any).status === "active") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "active" && (session.user as any).status !== "active") {
            console.log("🔔 Approval detected! Updating session...");
            await update();
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Error polling profile status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session, update]);

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg, #f4f6fa)', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-anuphan), sans-serif' }}>
        กำลังโหลดข้อมูลโปรไฟล์...
      </div>
    );
  }

  const isProfileNotCompleted = session?.user && (session.user as any).role !== "admin" && ((session as any).isProfileCompleted === false || (session.user as any).status !== "active");

  if (isProfileNotCompleted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        height: '100dvh', 
        width: '100vw',
        background: 'var(--main-bg, #f4f6fa)', 
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
