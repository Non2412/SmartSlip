"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

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

  const sortedLogs = [...logs].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return sortOrder === 'newest' ? -diff : diff;
  });

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
      case 'delete':
        return <span className={`${styles.actionBadge} ${styles.badgeDelete}`}>ลบใบเสร็จ</span>;
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
      case 'delete':
        return (
          <div className={`${styles.iconWrapper} ${styles.iconDelete}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
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

        <div className="page-container">
          <div className={styles.container}>
            
            <div className={styles.titleSection}>
              <div>
                <h1 className={styles.pageTitle}>ประวัติกิจกรรม</h1>
                <p className={styles.pageDesc}>ติดตามประวัติการเพิ่ม แก้ไข และส่งออกข้อมูลใบเสร็จของคุณ</p>
              </div>

              {isMobile ? (
                <div className={styles.sortMenuWrap} ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(v => !v)}
                    className={styles.sortMenuBtn}
                    title="เรียงลำดับ"
                    aria-label="เรียงลำดับ"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="4" x2="8" y2="20" />
                      <polyline points="5 7 8 4 11 7" />
                      <line x1="16" y1="20" x2="16" y2="4" />
                      <polyline points="19 17 16 20 13 17" />
                    </svg>
                  </button>

                  {showSortMenu && (
                    <div className={styles.sortMenuDropdown}>
                      <button
                        type="button"
                        onClick={() => { setSortOrder('oldest'); setShowSortMenu(false); }}
                        className={`${styles.sortMenuItem} ${sortOrder === 'oldest' ? styles.sortMenuItemActive : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <polyline points="19 12 12 19 5 12" />
                        </svg>
                        เก่าสุดไปใหม่สุด
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSortOrder('newest'); setShowSortMenu(false); }}
                        className={`${styles.sortMenuItem} ${sortOrder === 'newest' ? styles.sortMenuItemActive : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="19" x2="12" y2="5" />
                          <polyline points="5 12 12 5 19 12" />
                        </svg>
                        ใหม่สุดไปเก่าสุด
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.sortButtonGroup}>
                  <button
                    type="button"
                    onClick={() => setSortOrder('oldest')}
                    className={`${styles.sortButton} ${sortOrder === 'oldest' ? styles.sortButtonActive : ''}`}
                    title="เรียงจากเก่าสุด"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                    เก่าสุดไปใหม่สุด
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('newest')}
                    className={`${styles.sortButton} ${sortOrder === 'newest' ? styles.sortButtonActive : ''}`}
                    title="เรียงจากใหม่สุด"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                    ใหม่สุดไปเก่าสุด
                  </button>
                </div>
              )}
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
                  {sortedLogs.map((log) => {
                    const isExportLog = log.action === 'export';
                    // Older export logs (created before start/end date + file format
                    // were tracked) don't have metadata — recover the file format from
                    // the details text as a best-effort fallback; the date range was
                    // never recorded for these and can't be reconstructed.
                    const inferredFileFormat = !log.metadata?.fileFormat && isExportLog
                      ? log.details?.match(/เป็นไฟล์ (Excel|CSV)/)?.[1]
                      : null;
                    const displayMeta = log.metadata?.fileFormat
                      ? log.metadata
                      : (inferredFileFormat ? { fileFormat: inferredFileFormat } : log.metadata);
                    const hasExtraDetails = !!(displayMeta && (displayMeta.startDate || displayMeta.endDate || displayMeta.fileFormat));
                    const isExpanded = expandedId === log.id;
                    return (
                      <div key={log.id} className={styles.logItem}>
                        {getActionIcon(log.action)}

                        <div className={styles.logDetails}>
                          <p className={styles.logMessage}>{log.details}</p>
                          <div className={styles.logMeta}>
                            {getActionBadge(log.action)}
                            <span className={styles.logTime}>{formatDate(log.timestamp)}</span>
                          </div>

                          {isExpanded && (
                            <div className={styles.logExpandPanel}>
                              {hasExtraDetails ? (
                                <>
                                  {displayMeta.startDate ? (
                                    <div className={styles.logExpandRow}>
                                      <span className={styles.logExpandLabel}>วันที่เริ่มต้น</span>
                                      <span className={styles.logExpandValue}>{displayMeta.startDate}</span>
                                    </div>
                                  ) : (
                                    <div className={styles.logExpandRow}>
                                      <span className={styles.logExpandLabel}>วันที่เริ่มต้น</span>
                                      <span className={styles.logExpandEmpty}>ไม่มีข้อมูลบันทึกไว้</span>
                                    </div>
                                  )}
                                  {displayMeta.endDate ? (
                                    <div className={styles.logExpandRow}>
                                      <span className={styles.logExpandLabel}>วันที่สิ้นสุด</span>
                                      <span className={styles.logExpandValue}>{displayMeta.endDate}</span>
                                    </div>
                                  ) : (
                                    <div className={styles.logExpandRow}>
                                      <span className={styles.logExpandLabel}>วันที่สิ้นสุด</span>
                                      <span className={styles.logExpandEmpty}>ไม่มีข้อมูลบันทึกไว้</span>
                                    </div>
                                  )}
                                  {displayMeta.fileFormat && (
                                    <div className={styles.logExpandRow}>
                                      <span className={styles.logExpandLabel}>รูปแบบไฟล์</span>
                                      <span className={styles.logExpandValue}>{displayMeta.fileFormat}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className={styles.logExpandEmpty}>ไม่มีข้อมูลบันทึกไว้สำหรับรายการนี้</span>
                              )}
                            </div>
                          )}
                        </div>

                        {isExportLog && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className={`${styles.expandBtn} ${isExpanded ? styles.expandBtnOpen : ''}`}
                            aria-label={isExpanded ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
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
