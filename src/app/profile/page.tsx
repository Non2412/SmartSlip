"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ProfileForm from "@/components/ProfileForm";
import ProfileCard from "@/components/ProfileCard";
import styles from "./ProfilePage.module.css";
import CreateReceiptSheet from "@/components/CreateReceiptSheet";

export default function ProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const handleProfileSaved = () => {
    // Trigger ProfileCard to re-fetch data
    setRefreshTrigger(prev => prev + 1);
  };

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
            <ProfileCard refreshTrigger={refreshTrigger} />
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
