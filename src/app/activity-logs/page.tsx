"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import dynamic from 'next/dynamic';
import { activityLogApi } from '@/lib/apiClient';
import styles from './activity-logs.module.css';

const CreateReceiptSheet = dynamic(() => import('@/components/CreateReceiptSheet'), { ssr: false });

export default function ActivityLogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  const fetchLogs = async (userId: string, lineUserId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await activityLogApi.getAll(userId, lineUserId);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.error || 'ดึงประวัติกิจกรรมไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดประวัติกิจกรรม');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchLogs(session.user.id, lineUserId);
    }
  }, [session]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      
      const dateStr = d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      return `${dateStr} ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'add':
        return <span className={`${styles.actionBadge} ${styles.badgeAdd}`}>เพิ่มใบเสร็จ</span>;
      case 'edit':
        return <span className={`${styles.actionBadge} ${styles.badgeEdit}`}>แก้ไขใบเสร็จ</span>;
      case 'export':
        return <span className={`${styles.actionBadge} ${styles.badgeExport}`}>ส่งออกข้อมูล</span>;
      default:
        return <span className={styles.actionBadge}>{action}</span>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add':
        return (
          <div className={`${styles.iconWrapper} ${styles.iconAdd}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        );
      case 'edit':
        return (
          <div className={`${styles.iconWrapper} ${styles.iconEdit}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        );
      case 'export':
        return (
          <div className={`${styles.iconWrapper} ${styles.iconExport}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={styles.iconWrapper}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar overlay for mobile drawer */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar onAddReceipt={openCreateSheet} isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className="main-content">
        <TopBar
          title="ประวัติกิจกรรม"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="dashboard-container">
          <div className={styles.container}>
            
            <div className={styles.titleSection}>
              <div>
                <h1 className={styles.pageTitle}>ประวัติกิจกรรม</h1>
                <p className={styles.pageDesc}>ติดตามประวัติการเพิ่ม แก้ไข และส่งออกข้อมูลใบเสร็จของคุณ</p>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 18px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#991b1b', fontSize: '0.88rem', fontWeight: '600' }}>
                ⚠️ {error}
              </div>
            )}

            <div className={styles.logsCard}>
              {loading ? (
                <div style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: '600', margin: 0 }}>กำลังโหลดประวัติกิจกรรม...</p>
                </div>
              ) : logs.length > 0 ? (
                <div className={styles.logsList}>
                  {logs.map((log) => (
                    <div key={log.id} className={styles.logItem}>
                      {getActionIcon(log.action)}
                      
                      <div className={styles.logDetails}>
                        <p className={styles.logMessage}>{log.details}</p>
                        <div className={styles.logMeta}>
                          {getActionBadge(log.action)}
                          <span className={styles.logTime}>{formatDate(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noLogs}>
                  <div className={styles.noLogsIcon}>📜</div>
                  <h4 className={styles.noLogsText}>ยังไม่มีประวัติกิจกรรมใดๆ</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px', marginBottom: 0 }}>กิจกรรมต่างๆ ของคุณ เช่น การเพิ่มใบเสร็จ หรือแก้ไขข้อมูลจะบันทึกแสดงที่นี่</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSuccess={() => {
          if (session?.user?.id) {
            fetchLogs(session.user.id);
          }
        }}
        userId={session?.user?.id || 'user123'}
      />
    </div>
  );
}
