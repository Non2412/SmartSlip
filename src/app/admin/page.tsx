"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useToast } from '@/components/Toast';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';
import styles from './AdminDashboard.module.css';

interface UserStat {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  requestedRole?: string;
  lineUserId: string | null;
  receiptCount: number;
  createdAt: string;
  lastActiveAt?: string | null;
  profile?: {
    company: string;
    phone: string;
    address: string;
    budgets: number;
    citizenId?: string;
    requestedRole?: string;
  };
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  restrictedUsers: number;
  pendingUsers: number;
  totalReceipts: number;
  webReceipts: number;
  lineReceipts: number;
  totalLogs: number;
  totalAmount: number;
  uploadTrend?: { date: string; count: number }[];
  activeUsersInMonth?: { userId: string; name: string; image: string | null; role: string; status: string; count: number }[];
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  action: string;
  details: string;
  timestamp: string;
  receiptId?: string;
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  // Mask citizen ID — show only last 3 digits
  const maskCitizenId = (id?: string): string => {
    if (!id) return 'ไม่ระบุ';
    const digits = id.replace(/-/g, '');
    if (digits.length <= 3) return id;
    return 'X'.repeat(digits.length - 3) + digits.slice(-3);
  };

  const isUserOnline = (lastActiveAt?: string | null) => {
    if (!lastActiveAt) return false;
    const diff = new Date().getTime() - new Date(lastActiveAt).getTime();
    return diff < 90000; // 90 seconds threshold
  };

  const formatLastActive = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'เมื่อครู่นี้';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'receipts' | 'logs' | 'approvals' | 'images' | 'role_requests'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileTabDropdownOpen, setIsMobileTabDropdownOpen] = useState(false);

  // States for API data
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserStat[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [loadingRoleRequests, setLoadingRoleRequests] = useState(false);

  const tabOptions = useMemo(() => [
    { id: 'overview', label: '1. ภาพรวมระบบ', icon: '📊', count: null },
    { id: 'users', label: '2. จัดการผู้ใช้', icon: '👥', count: `${users.length} คน` },
    { id: 'receipts', label: '3. ตรวจสอบใบเสร็จ', icon: '📄', count: `${receipts.length} รายการ` },
    { id: 'logs', label: '4. บันทึกกิจกรรม', icon: '🪵', count: `${logs.length} รายการ` },
    { id: 'approvals', label: '5. อนุมัติการใช้งาน', icon: '⏳', count: users.filter(u => u.status === 'pending').length > 0 ? `${users.filter(u => u.status === 'pending').length} รออนุมัติ` : null },
    { id: 'images', label: '6. กราฟปริมาณรูปภาพ', icon: '📈', count: null },
    { id: 'role_requests', label: '7. คำร้องขอเปลี่ยนบทบาท', icon: '📩', count: roleRequests.filter(r => r.status === 'pending').length > 0 ? `${roleRequests.filter(r => r.status === 'pending').length} คำร้อง` : null },
  ], [users, receipts, logs, roleRequests]);

  const currentTabOption = useMemo(() => 
    tabOptions.find(t => t.id === activeTab) || tabOptions[0]
  , [tabOptions, activeTab]);

  // Graph Date Filters
  const [graphYear, setGraphYear] = useState<number>(new Date().getFullYear());
  const [graphMonth, setGraphMonth] = useState<number>(new Date().getMonth() + 1);

  // Loading and error states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Inspect user modal states
  const [inspectingUser, setInspectingUser] = useState<UserStat | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    company: '',
    phone: '',
    address: '',
    budgets: 0
  });

  // Watch inspectingUser to populate editProfileForm
  useEffect(() => {
    if (inspectingUser) {
      setEditProfileForm({
        company: inspectingUser.profile?.company || 'ไม่ระบุ',
        phone: inspectingUser.profile?.phone || 'ไม่ระบุ',
        address: inspectingUser.profile?.address || 'ไม่ระบุ',
        budgets: inspectingUser.profile?.budgets || 0
      });
    }
  }, [inspectingUser]);

  // Protect client route as a fallback
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (sessionStatus === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, sessionStatus, router]);

  // Fetch initial data
  const fetchStats = async (year: number = graphYear, month: number = graphMonth) => {
    try {
      setLoadingStats(true);
      const res = await fetch(`/api/admin/stats?year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const res = await fetch('/api/receipts?all=true');
      const json = await res.json();
      if (json.success) setReceipts(json.data || json.receipts || []);
    } catch (e) {
      console.error('Failed to fetch receipts:', e);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/admin/logs');
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch stats when graph filter dependencies change
  useEffect(() => {
    if (sessionStatus === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchStats(graphYear, graphMonth);
    }
  }, [session, sessionStatus, graphYear, graphMonth]);

  const fetchRoleRequests = async () => {
    try {
      setLoadingRoleRequests(true);
      const res = await fetch('/api/role-requests');
      const json = await res.json();
      if (Array.isArray(json)) setRoleRequests(json);
    } catch (e) {
      console.error('Failed to fetch role requests:', e);
    } finally {
      setLoadingRoleRequests(false);
    }
  };

  const handleRoleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(requestId);
      const res = await fetch('/api/role-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const json = await res.json();
      if (json.success) {
        showToast(action === 'approve' ? 'อนุมัติการเปลี่ยนบทบาทเรียบร้อยแล้ว!' : 'ปฏิเสธคำร้องเรียบร้อยแล้ว', 'success');
        await Promise.all([fetchRoleRequests(), fetchUsers(), fetchStats()]);
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการดำเนินการ', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch lists on load
  useEffect(() => {
    if (sessionStatus === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchUsers();
      fetchReceipts();
      fetchLogs();
      fetchRoleRequests();
    }
  }, [session, sessionStatus]);

  // Handle user role or status change
  const handleUserUpdate = async (userId: string, updates: { role?: string; status?: string }) => {
    try {
      setActionLoading(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates })
      });
      const json = await res.json();
      if (json.success) {
        // Refresh users & stats & logs
        await Promise.all([fetchUsers(), fetchStats(), fetchLogs()]);
        showToast('อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว!', 'success');
      } else {
        showToast(json.error || 'Failed to update user', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle saving profile changes
  const handleSaveProfile = async () => {
    if (!inspectingUser) return;
    try {
      setActionLoading(inspectingUser.id);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: inspectingUser.id,
          profile: editProfileForm
        })
      });
      const json = await res.json();
      if (json.success) {
        // Refresh lists
        await Promise.all([fetchUsers(), fetchStats(), fetchLogs()]);
        // Update local modal state
        setInspectingUser(prev => prev ? {
          ...prev,
          profile: {
            company: editProfileForm.company,
            phone: editProfileForm.phone,
            address: editProfileForm.address,
            budgets: editProfileForm.budgets
          }
        } : null);
        showToast('บันทึกข้อมูลสำเร็จเรียบร้อยครับ!', 'success');
      } else {
        showToast('เกิดข้อผิดพลาด: ' + (json.error || 'ไม่สามารถบันทึกข้อมูลได้'), 'error');
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาดการเชื่อมต่อ: ' + e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle receipt delete
  const handleReceiptDelete = async (receiptId: string) => {
    try {
      setActionLoading(receiptId);
      const res = await fetch(`/api/receipts?id=${receiptId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        await Promise.all([fetchReceipts(), fetchStats(), fetchLogs()]);
        showToast('ลบใบเสร็จเรียบร้อยแล้ว', 'success');
      } else {
        showToast(json.error || 'Failed to delete receipt', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered views
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.toLowerCase().trim();
    if (!q) return receipts;
    return receipts.filter(r => 
      (r.storeName || '').toLowerCase().includes(q) || 
      String(r.totalAmount || r.amount || '').includes(q) ||
      (r.userId || '').toLowerCase().includes(q) ||
      (r.extractedData?.category || 'อื่นๆ').toLowerCase().includes(q)
    );
  }, [receipts, receiptSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(l => 
      (l.userName || '').toLowerCase().includes(q) || 
      (l.details || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q)
    );
  }, [logs, logSearch]);

  // Sidebar controls
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && (session?.user as any)?.role !== 'admin')) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', color: '#94a3b8' }}>
        กำลังโหลดหน้าระบบจัดการ...
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      <main className="main-content">
        <TopBar title="จัดการระบบ (Admin Dashboard)" onToggleSidebar={toggleSidebar} />
        
        <div className={styles.container}>
          {/* Custom Mobile Tab Dropdown Component */}
          <div className={styles.customMobileDropdownContainer}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📑</span> เลือกเมนูการทำงานฝั่งผู้ดูแลระบบ:
            </label>
            <div 
              className={styles.customMobileDropdownTrigger}
              onClick={() => setIsMobileTabDropdownOpen(!isMobileTabDropdownOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{currentTabOption.icon}</span>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {currentTabOption.label} {currentTabOption.count ? `(${currentTabOption.count})` : ''}
                </span>
              </div>
              <span style={{ transform: isMobileTabDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ▼
              </span>
            </div>

            {isMobileTabDropdownOpen && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.15)' }}
                  onClick={() => setIsMobileTabDropdownOpen(false)}
                />
                <div className={styles.customMobileDropdownMenu}>
                  {tabOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`${styles.customMobileDropdownItem} ${activeTab === opt.id ? styles.customMobileDropdownItemActive : ''}`}
                      onClick={() => {
                        setActiveTab(opt.id as any);
                        if (opt.id === 'role_requests') fetchRoleRequests();
                        setIsMobileTabDropdownOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: activeTab === opt.id ? '700' : '500' }}>
                          {opt.label}
                        </span>
                      </div>

                      {opt.count && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: activeTab === opt.id ? 'var(--primary-color)' : 'var(--input-bg)',
                          color: activeTab === opt.id ? '#ffffff' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)'
                        }}>
                          {opt.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 ภาพรวมระบบ
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'users' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 จัดการผู้ใช้
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'receipts' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('receipts')}
            >
              📄 ตรวจสอบใบเสร็จ
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'logs' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              🪵 บันทึกกิจกรรม
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'approvals' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              ⏳ อนุมัติการใช้งาน
              {users.filter(u => u.status === 'pending').length > 0 && (
                <span style={{
                  background: '#f59e0b',
                  color: '#0f172a',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  marginLeft: '6px',
                  boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)'
                }}>
                  {users.filter(u => u.status === 'pending').length}
                </span>
              )}
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'images' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('images')}
            >
              📈 กราฟปริมาณรูปภาพ
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'role_requests' ? styles.activeTab : ''}`}
              onClick={() => {
                setActiveTab('role_requests');
                fetchRoleRequests();
              }}
            >
              📩 คำร้องขอเปลี่ยนบทบาท
              {roleRequests.filter(r => r.status === 'pending').length > 0 && (
                <span style={{
                  background: '#6366f1',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  marginLeft: '6px',
                  boxShadow: '0 0 6px rgba(99, 102, 241, 0.4)'
                }}>
                  {roleRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {loadingStats ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดข้อมูล...</div>
              ) : stats ? (
                <>
                  <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>ผู้ใช้ทั้งหมด</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>👥</div>
                      </div>
                      <div>
                        <div className={styles.statValue}>{stats.totalUsers} คน</div>
                        <div className={styles.statDetails}>
                          <span>🟢 Active: {stats.activeUsers}</span>
                          <span>⏳ รออนุมัติ: {stats.pendingUsers}</span>
                          <span>🔴 Restricted: {stats.restrictedUsers}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>ใบเสร็จทั้งหมดในระบบ</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>📄</div>
                      </div>
                      <div>
                        <div className={styles.statValue}>{stats.totalReceipts} ใบ</div>
                        <div className={styles.statDetails}>
                          <span>💻 Web: {stats.webReceipts}</span>
                          <span>💬 LINE Bot: {stats.lineReceipts}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>ยอดค่าใช้จ่ายรวมผ่านระบบ</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>฿</div>
                      </div>
                      <div>
                        <div className={styles.statValue}>฿ {stats.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                        <div className={styles.statDetails}>
                          <span>เฉลี่ย: ฿ {(stats.totalReceipts > 0 ? stats.totalAmount / stats.totalReceipts : 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} / ใบ</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>บันทึกกิจกรรม</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#64748b' }}>🪵</div>
                      </div>
                      <div>
                        <div className={styles.statValue}>{stats.totalLogs} กิจกรรม</div>
                        <div className={styles.statDetails}>
                          <span>ประวัติตรวจสอบระบบ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Activity Summary Card */}
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>📊 กิจกรรมล่าสุดในระบบ</div>
                    {loadingLogs ? (
                      <div>กำลังโหลดกิจกรรม...</div>
                    ) : logs.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูลกิจกรรม</div>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {logs.slice(0, 5).map(l => (
                          <div key={l.id} className={`${styles.logItem} ${styles[`log${l.action.charAt(0).toUpperCase() + l.action.slice(1)}`] || ''}`}>
                            <div className={styles.logDetails}>
                              <span className={styles.logText}>{l.details}</span>
                              <div className={styles.logMeta}>
                                <span>👤 ทำโดย: {l.userName}</span>
                                <span>🕒 {new Date(l.timestamp).toLocaleString('th-TH')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>เกิดข้อผิดพลาดในการดึงข้อมูล</div>
              )}
            </div>
          )}

          {/* Tab 2: Users Management */}
          {activeTab === 'users' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>รายชื่อผู้ใช้งานระบบ ({filteredUsers.length} คน)</div>
                <div className={styles.searchBar}>
                  🔍
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ อีเมล หรือ ID..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดผู้ใช้งาน...</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ผู้ใช้</th>
                        <th>LINE ID</th>
                        <th>บทบาท</th>
                        <th>สถานะบัญชี</th>
                        <th>จำนวนใบเสร็จ</th>
                        <th>วันที่เข้าร่วม</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.userCell}>
                              <div style={{ position: 'relative' }}>
                                <img 
                                  src={u.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + u.name} 
                                  alt={u.name} 
                                  className={styles.avatar} 
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '0',
                                  right: '0',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: isUserOnline(u.lastActiveAt) ? '#22c55e' : '#94a3b8',
                                  border: '1.5px solid var(--card-bg)',
                                  boxShadow: isUserOnline(u.lastActiveAt) ? '0 0 8px #22c55e' : 'none'
                                }} title={isUserOnline(u.lastActiveAt) ? 'ออนไลน์' : 'ออฟไลน์'} />
                              </div>
                              <div>
                                <div className={styles.userName}>{u.name}</div>
                                <div className={styles.userEmail}>{u.email || 'ไม่มีอีเมล (LINE login)'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {isUserOnline(u.lastActiveAt) ? (
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>🟢 ออนไลน์</span>
                                  ) : u.lastActiveAt ? (
                                    `ใช้งานล่าสุด: ${formatLastActive(u.lastActiveAt)}`
                                  ) : (
                                    '⚫ ออฟไลน์'
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {u.lineUserId ? (
                              <span title={u.lineUserId} style={{ color: '#06c755', fontWeight: 'bold' }}>
                                🟢 เชื่อมต่อ ({u.lineUserId.substring(0, 8)}...)
                              </span>
                            ) : (
                              '❌ ไม่ได้เชื่อมต่อ'
                            )}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}`}>
                              {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${
                              u.status === 'restricted' ? styles.badgeRestricted : 
                              u.status === 'pending' ? styles.badgePending : 
                              styles.badgeActive
                            }`}>
                              {u.status === 'restricted' ? '🚫 Restricted' : 
                               u.status === 'pending' ? '⏳ Pending' : 
                               '🟢 Active'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700', paddingLeft: '24px' }}>{u.receiptCount} ใบ</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(u.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {/* Inspect details button */}
                              <button 
                                className={styles.actionBtn}
                                style={{ 
                                  background: 'transparent',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-main)',
                                  fontWeight: '600'
                                }}
                                onClick={() => setInspectingUser(u)}
                              >
                                🔍 ตรวจสอบข้อมูล
                              </button>

                              {/* Toggle Role */}
                              <button 
                                className={styles.actionBtn}
                                onClick={() => handleUserUpdate(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                                disabled={actionLoading !== null}
                              >
                                {u.role === 'admin' ? '🛡️ ลดสิทธิ์' : '🔑 ตั้ง Admin'}
                              </button>
                              
                              {/* Status Action */}
                              {u.status === 'pending' ? (
                                <>
                                  <button 
                                    className={`${styles.actionBtn} ${styles.successBtn}`}
                                    onClick={() => handleUserUpdate(u.id, { status: 'active' })}
                                    disabled={actionLoading !== null}
                                    title="อนุมัติการใช้งาน"
                                  >
                                    ✅ อนุมัติ
                                  </button>
                                  <button 
                                    className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                    onClick={() => handleUserUpdate(u.id, { status: 'restricted' })}
                                    disabled={actionLoading !== null}
                                    title="ปฏิเสธและระงับการใช้งาน"
                                  >
                                    ❌ ปฏิเสธ
                                  </button>
                                </>
                              ) : (
                                <button 
                                  className={`${styles.actionBtn} ${u.status === 'restricted' ? styles.successBtn : styles.dangerBtn}`}
                                  onClick={() => handleUserUpdate(u.id, { status: u.status === 'restricted' ? 'active' : 'restricted' })}
                                  disabled={actionLoading !== null}
                                >
                                  {u.status === 'restricted' ? '🔓 ปลดบล็อก' : '🚫 ระงับใช้งาน'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Receipts Audit */}
          {activeTab === 'receipts' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>ตรวจสอบใบเสร็จระบบทั้งหมด ({filteredReceipts.length} รายการ)</div>
                <div className={styles.searchBar}>
                  🔍
                  <input 
                    type="text" 
                    placeholder="ค้นหาร้านค้า ยอดเงิน หรือ หมวดหมู่..." 
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingReceipts ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดใบเสร็จ...</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ร้านค้า</th>
                        <th>ยอดเงิน</th>
                        <th>หมวดหมู่</th>
                        <th>ช่องทางชำระ</th>
                        <th>ผู้ส่ง (User ID)</th>
                        <th>ช่องทางส่ง</th>
                        <th>วันที่ทำรายการ</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceipts.map((r, index) => {
                        const amt = r.totalAmount !== undefined ? r.totalAmount : r.amount;
                        const date = r.extractedData?.date || r.createdAt;
                        const cat = r.extractedData?.category || 'อื่นๆ';
                        const method = r.extractedData?.method || r.extractedData?.paymentMethod || 'ไม่ระบุ';
                        const isLine = r.source === 'line' || r.transactionId?.startsWith('LINE-');

                        return (
                          <tr key={r.id || r._id || index}>
                            <td style={{ fontWeight: '700' }}>{r.storeName || 'ไม่ระบุร้านค้า'}</td>
                            <td style={{ color: 'var(--primary-hover)', fontWeight: 'bold' }}>
                              ฿ {typeof amt === 'number' ? amt.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 8px', background: 'var(--input-bg)', border: '1px solid var(--border-color)',
                                borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                              }}>
                                {cat}
                              </span>
                            </td>
                            <td>{method}</td>
                            <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }} title={r.userId}>
                              {r.userId ? `${r.userId.substring(0, 10)}...` : 'Unknown'}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isLine ? '💬 LINE' : '💻 Web'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(date).toLocaleString('th-TH')}
                            </td>
                            <td>
                              <button 
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                onClick={() => handleReceiptDelete(r.id || r._id)}
                                disabled={actionLoading !== null}
                              >
                                🗑️ ลบใบเสร็จ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: System Activity Logs */}
          {activeTab === 'logs' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>บันทึกกิจกรรมของระบบ ({filteredLogs.length} รายการ)</div>
                <div className={styles.searchBar}>
                  🔍
                  <input 
                    type="text" 
                    placeholder="ค้นหาข้อความ กิจกรรม หรือ ชื่อผู้ทำ..." 
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingLogs ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดบันทึกกิจกรรม...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredLogs.map(l => (
                    <div 
                      key={l.id} 
                      className={`${styles.logItem} ${styles[`log${l.action.charAt(0).toUpperCase() + l.action.slice(1)}`] || ''}`}
                    >
                      <div className={styles.logDetails}>
                        <div className={styles.logText}>{l.details}</div>
                        <div className={styles.logMeta}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {l.userImage && (
                              <img src={l.userImage} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                            )}
                            👤 ผู้ทำ: <strong>{l.userName}</strong>
                          </span>
                          <span>🔑 Action: {l.action}</span>
                          {l.receiptId && (
                            <span style={{ fontFamily: 'monospace' }}>📄 ID ใบเสร็จ: {l.receiptId}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.logTime}>
                        {new Date(l.timestamp).toLocaleString('th-TH')}
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      ไม่พบประวัติกิจกรรมที่ค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: User Approvals */}
          {activeTab === 'approvals' && (
            <div className={styles.card}>
              <div className={styles.cardHeader} style={{ marginBottom: '24px' }}>
                <div>
                  <div className={styles.cardTitle}>⏳ คำขออนุมัติเข้าใช้งานระบบ ({users.filter(u => u.status === 'pending').length} รายการ)</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    กรุณาตรวจสอบรายชื่อและประวัติผู้สมัครใหม่ก่อนอนุมัติสิทธิ์การเข้าถึงระบบ
                  </p>
                </div>
              </div>

              {loadingUsers ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดข้อมูล...</div>
              ) : users.filter(u => u.status === 'pending').length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 24px',
                  color: 'var(--text-muted)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                    fontSize: '1.8rem',
                    marginBottom: '16px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </div>
                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
                    ไม่มีคำขอรออนุมัติ
                  </h3>
                  <p style={{ fontSize: '0.9rem', maxWidth: '360px' }}>
                    ผู้ใช้ทั้งหมดได้รับการเปิดสิทธิ์และตรวจสอบเรียบร้อยแล้ว
                  </p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ผู้ใช้งาน</th>
                        <th>สถานะ LINE</th>
                        <th>วันที่สมัคร</th>
                        <th style={{ textAlign: 'right' }}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.status === 'pending').map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.userCell}>
                              <div style={{ position: 'relative' }}>
                                <img 
                                  src={u.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + u.name} 
                                  alt={u.name} 
                                  className={styles.avatar} 
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '0',
                                  right: '0',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: isUserOnline(u.lastActiveAt) ? '#22c55e' : '#94a3b8',
                                  border: '1.5px solid var(--card-bg)',
                                  boxShadow: isUserOnline(u.lastActiveAt) ? '0 0 8px #22c55e' : 'none'
                                }} title={isUserOnline(u.lastActiveAt) ? 'ออนไลน์' : 'ออฟไลน์'} />
                              </div>
                              <div>
                                <div className={styles.userName}>{u.name}</div>
                                <div className={styles.userEmail}>{u.email || 'ไม่มีอีเมล (LINE login)'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {isUserOnline(u.lastActiveAt) ? (
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>🟢 ออนไลน์</span>
                                  ) : u.lastActiveAt ? (
                                    `ใช้งานล่าสุด: ${formatLastActive(u.lastActiveAt)}`
                                  ) : (
                                    '⚫ ออฟไลน์'
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {u.lineUserId ? (
                              <span title={u.lineUserId} style={{ color: '#06c755', fontWeight: 'bold' }}>
                                🟢 LINE Linked ({u.lineUserId.substring(0, 8)}...)
                              </span>
                            ) : (
                              '❌ ไม่ได้เชื่อมต่อ'
                            )}
                          </td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {new Date(u.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className={styles.actionBtn}
                                style={{ 
                                  padding: '8px 16px', 
                                  fontWeight: '600',
                                  background: 'transparent',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-main)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => setInspectingUser(u)}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = 'var(--input-bg)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                🔍 ตรวจสอบข้อมูล
                              </button>
                              <button 
                                className={`${styles.actionBtn} ${styles.successBtn}`}
                                style={{ padding: '8px 16px', fontWeight: '700' }}
                                onClick={() => handleUserUpdate(u.id, { status: 'active' })}
                                disabled={actionLoading !== null}
                              >
                                ✅ อนุมัติ
                              </button>
                              <button 
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                style={{ padding: '8px 16px', fontWeight: '700' }}
                                onClick={() => handleUserUpdate(u.id, { status: 'restricted' })}
                                disabled={actionLoading !== null}
                              >
                                ❌ ปฏิเสธ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Image Trend Graph (Spam Detection) */}
          {activeTab === 'images' && (() => {
            const THAI_MONTHS = [
              'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
            ];
            const years = [2024, 2025, 2026, 2027];

            return (
              <div className={styles.card}>
                <div className={styles.cardHeader} style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div className={styles.cardTitle}>
                      📈 กราฟปริมาณการอัปโหลดรูปภาพประจำเดือน {THAI_MONTHS[graphMonth - 1]} พ.ศ. {graphYear + 543}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                      ใช้สำหรับการตรวจสอบการอัปโหลดใบเสร็จสแปม (Spamming) หรือพฤติกรรมการใช้งานที่ผิดปกติในแต่ละวัน
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    💡 เกณฑ์เฝ้าระวัง: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>เกิน 20 รูป / วัน</span>
                  </div>
                </div>

                {/* Filters Dropdown */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <select
                    value={graphMonth}
                    onChange={(e) => setGraphMonth(parseInt(e.target.value))}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {THAI_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={graphYear}
                    onChange={(e) => setGraphYear(parseInt(e.target.value))}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {years.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543}</option>
                    ))}
                  </select>
                </div>

                {loadingStats ? (
                  <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังคำนวณข้อมูลสถิติ...</div>
                ) : stats?.uploadTrend ? (() => {
                  const trend = stats.uploadTrend || [];
                  const maxCount = Math.max(...trend.map(d => d.count), 5);
                  const spikeThreshold = 20;
                  const spikeDays = trend.filter(d => d.count >= spikeThreshold);
                  
                  // SVG dimensions
                  const svgW = 1000;
                  const svgH = 380;
                  const paddingL = 60;
                  const paddingR = 30;
                  const paddingT = 30;
                  const paddingB = 60;
                  
                  const chartW = svgW - paddingL - paddingR;
                  const chartH = svgH - paddingT - paddingB;
                  const stepX = chartW / (trend.length > 0 ? trend.length : 1);
                  const barW = Math.max(stepX * 0.6, 6);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Spike Warning Banner */}
                      {spikeDays.length > 0 ? (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          lineHeight: '1.5'
                        }}>
                          <div style={{ fontSize: '1.4rem', marginTop: '-2px' }}>⚠️</div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>ตรวจพบทราฟฟิกอัปโหลดสูงผิดปกติ!</div>
                            พบการส่งรูปภาพเข้าระบบเกิน {spikeThreshold} รูปต่อวันในวันที่: <strong style={{ color: 'var(--text-main)' }}>{spikeDays.map(d => {
                              const [y, m, md] = d.date.split('-');
                              return `${md}/${m}`;
                            }).join(', ')}</strong> (คลิกที่แท็บ "บันทึกกิจกรรม" หรือ "ตรวจสอบใบเสร็จ" เพื่อตรวจหาเจ้าของบัญชีผู้ส่งข้อมูลสแปม)
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.08)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          borderRadius: '16px',
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem'
                        }}>
                          <span>🟢</span>
                          <span>สถานะระบบปกติ: ไม่พบการสแปมอัปโหลดรูปภาพในช่วง 30 วันที่ผ่านมา</span>
                        </div>
                      )}

                      {/* SVG Chart Container */}
                      <div style={{ 
                        background: 'var(--input-bg)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '20px', 
                        padding: '24px 16px',
                        overflowX: 'auto'
                      }}>
                        <div style={{ minWidth: '800px', position: 'relative' }}>
                          <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: 'visible' }}>
                            <defs>
                              {/* Gradients for bars */}
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                              </linearGradient>
                              <linearGradient id="spamGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                                <stop offset="100%" stopColor="#b91c1c" stopOpacity="1" />
                              </linearGradient>
                            </defs>

                            {/* Dotted Grid lines & Y-axis scale */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                              const val = Math.round(maxCount * ratio);
                              const y = paddingT + chartH * (1 - ratio);
                              return (
                                <g key={index}>
                                  {/* Grid Line */}
                                  <line 
                                    x1={paddingL} 
                                    y1={y} 
                                    x2={svgW - paddingR} 
                                    y2={y} 
                                    stroke="var(--border-color)" 
                                    strokeDasharray="4 4" 
                                    strokeWidth="1"
                                    opacity="0.6"
                                  />
                                  {/* Y-axis Label */}
                                  <text 
                                    x={paddingL - 12} 
                                    y={y + 4} 
                                    fill="var(--text-muted)" 
                                    fontSize="0.75rem" 
                                    textAnchor="end"
                                    fontFamily="monospace"
                                  >
                                    {val}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Chart Bars */}
                            {trend.map((d, i) => {
                              const x = paddingL + i * stepX + (stepX - barW) / 2;
                              const barH = (d.count / maxCount) * chartH;
                              const y = paddingT + chartH - barH;
                              const isSpike = d.count >= spikeThreshold;
                              const [yr, mn, day] = d.date.split('-');

                              return (
                                <g key={d.date} style={{ cursor: 'pointer' }}>
                                  <title>{`${d.date}\nปริมาณ: ${d.count} รูป`}</title>
                                  {/* Active Column Bar */}
                                  <rect
                                    x={x}
                                    y={y}
                                    width={barW}
                                    height={Math.max(barH, 2)}
                                    rx="4"
                                    fill={isSpike ? "url(#spamGrad)" : "url(#barGrad)"}
                                    style={{
                                      transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.setAttribute('opacity', '0.8');
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.setAttribute('opacity', '1');
                                    }}
                                  />

                                  {/* Bar count number text displayed above columns */}
                                  {d.count > 0 && (
                                    <text
                                      x={x + barW / 2}
                                      y={y - 6}
                                      fill={isSpike ? '#ef4444' : 'var(--text-main)'}
                                      fontSize="0.7rem"
                                      fontWeight={isSpike ? 'bold' : 'normal'}
                                      textAnchor="middle"
                                    >
                                      {d.count}
                                    </text>
                                  )}

                                  {/* X-axis Label (Draw every 3 days to keep labels neat) */}
                                  {(i % 3 === 0 || i === trend.length - 1) && (
                                    <text
                                      x={x + barW / 2}
                                      y={svgH - paddingB + 20}
                                      fill="var(--text-muted)"
                                      fontSize="0.7rem"
                                      textAnchor="middle"
                                      transform={`rotate(25, ${x + barW / 2}, ${svgH - paddingB + 20})`}
                                    >
                                      {`${day}/${mn}`}
                                    </text>
                                  )}
                                </g>
                              );
                            })}

                            {/* Base X Axis line */}
                            <line 
                              x1={paddingL} 
                              y1={svgH - paddingB} 
                              x2={svgW - paddingR} 
                              y2={svgH - paddingB} 
                              stroke="var(--border-color)" 
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* รายชื่อผู้ใช้งานที่ส่งรูปภาพเข้ามาในเดือนนี้ */}
                      <div style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>👥</span>
                          <span>ผู้ใช้อัปโหลดรูปภาพประจำเดือนนี้ ({stats.activeUsersInMonth?.length || 0} คน)</span>
                        </h3>
                        {stats.activeUsersInMonth && stats.activeUsersInMonth.length > 0 ? (
                          <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
                            <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>ผู้ใช้งาน</th>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>User ID</th>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>บทบาท</th>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>สถานะบัญชี</th>
                                  <th style={{ textAlign: 'right', padding: '12px' }}>จำนวนภาพที่ส่ง</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.activeUsersInMonth.map((u, index) => (
                                  <tr key={u.userId || index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px' }}>
                                      <div className={styles.userCell} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <img 
                                          src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                                          alt={u.name} 
                                          className={styles.avatar} 
                                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                                        />
                                        <div className={styles.userName} style={{ fontWeight: '500' }}>{u.name}</div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                      {u.userId}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                      <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}`}>
                                        {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                      <span className={`${styles.badge} ${
                                        u.status === 'restricted' ? styles.badgeRestricted : 
                                        u.status === 'pending' ? styles.badgePending : 
                                        styles.badgeActive
                                      }`}>
                                        {u.status === 'restricted' ? '🚫 Restricted' : 
                                         u.status === 'pending' ? '⏳ Pending' : 
                                         '🟢 Active'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '700', textAlign: 'right', color: u.count >= 20 ? '#ef4444' : 'var(--text-main)', fontSize: '0.95rem' }}>
                                      {u.count} รูป
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', background: 'var(--input-bg)', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '0.85rem' }}>
                            ไม่มีประวัติการส่งรูปภาพในเดือนนี้
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    ไม่พบข้อมูลสถิติสำหรับการแสดงผลกราฟ
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab 7: Role Change Requests */}
          {activeTab === 'role_requests' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  📩 รายการคำร้องขอเปลี่ยนสิทธิ์บทบาท & แจ้งปัญหา ({roleRequests.length} รายการ)
                </div>
                <button 
                  onClick={fetchRoleRequests}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  🔄 รีเฟรช
                </button>
              </div>

              {loadingRoleRequests ? (
                <div className={styles.loadingSpinner}><div className={styles.spinner} /> กำลังโหลดคำร้องขอ...</div>
              ) : roleRequests.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  ยังไม่มีคำร้องขอเปลี่ยนบทบาทหรือแจ้งปัญหาเข้ามาในระบบครับ
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ผู้ยื่นคำร้อง</th>
                        <th>สิทธิ์ปัจจุบัน</th>
                        <th>สิทธิ์ที่ขอเปลี่ยน</th>
                        <th>เหตุผลความจำเป็นที่ระบุ</th>
                        <th>วันที่ยื่น</th>
                        <th>สถานะ</th>
                        <th>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleRequests.map((r: any) => (
                        <tr key={r._id || r.id}>
                          <td>
                            <div className={styles.userCell}>
                              <img 
                                src={r.userImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + r.userName} 
                                alt={r.userName} 
                                className={styles.avatar} 
                              />
                              <div>
                                <div className={styles.userName}>{r.userName}</div>
                                <div className={styles.userEmail}>{r.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${r.currentRole === 'admin' ? styles.badgeAdmin : r.currentRole === 'clerk' ? styles.badgeAdmin : styles.badgeUser}`}>
                              {r.currentRole === 'admin' ? '🛡️ Admin' : r.currentRole === 'clerk' ? '💼 Clerk' : '👤 User'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              background: r.targetRole === 'clerk' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: r.targetRole === 'clerk' ? '#6366f1' : '#10b981',
                              border: r.targetRole === 'clerk' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                              {r.targetRole === 'clerk' ? '💼 1. เสมียน (Clerk)' : '👤 2. ผู้ใช้งานทั่วไป'}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <div style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-main)',
                              background: 'var(--input-bg)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              lineHeight: '1.4'
                            }}>
                              💬 &ldquo;{r.reason}&rdquo;
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(r.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${
                              r.status === 'approved' ? styles.badgeActive : r.status === 'rejected' ? styles.badgeRestricted : styles.badgePending
                            }`}>
                              {r.status === 'approved' ? '✅ อนุมัติแล้ว' : r.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รออนุมัติ'}
                            </span>
                          </td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleRoleRequestAction(r._id || r.id, 'approve')}
                                  disabled={actionLoading === (r._id || r.id)}
                                  className={`${styles.actionBtn} ${styles.approveBtn}`}
                                  title="อนุมัติการเปลี่ยนบทบาท"
                                >
                                  ✅ อนุมัติ
                                </button>
                                <button
                                  onClick={() => handleRoleRequestAction(r._id || r.id, 'reject')}
                                  disabled={actionLoading === (r._id || r.id)}
                                  className={`${styles.actionBtn} ${styles.restrictBtn}`}
                                  title="ปฏิเสธคำร้อง"
                                >
                                  ❌ ปฏิเสธ
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ดำเนินการแล้ว</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {inspectingUser && (() => {
            const userReceipts = receipts.filter(r => 
              r.userId === inspectingUser.id || 
              (inspectingUser.lineUserId && r.userId === inspectingUser.lineUserId)
            );

            return (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '24px',
                  width: '100%',
                  maxWidth: '850px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  animation: 'fadeIn 0.25s ease'
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={inspectingUser.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${inspectingUser.name}`} 
                        alt={inspectingUser.name} 
                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          ตรวจสอบข้อมูลผู้ใช้: {inspectingUser.name}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                          ID: {inspectingUser.id}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setInspectingUser(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.8rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        outline: 'none',
                        lineHeight: '1',
                        padding: '4px'
                      }}
                      title="ปิดหน้าต่าง"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Section 1: ข้อมูลประวัติการกรอก (Registration Details) */}
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📝</span> ข้อมูลการลงทะเบียนประวัติส่วนตัว
                      </h4>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '24px'
                      }}>
                        {/* เป็นใครมาจากไหน */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>เป็นใครมาจากไหน (ที่อยู่ / ประวัติตนเอง)</span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {inspectingUser.profile?.address || 'ไม่ระบุ'}
                          </span>
                        </div>

                        {/* ทำงานอยู่ที่ไหน */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>ทำงานอยู่ที่ไหน (บริษัท / สถานที่ทำงาน)</span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {inspectingUser.profile?.company || 'ไม่ระบุ'}
                          </span>
                        </div>

                        {/* เบอร์โทรศัพท์ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>เบอร์โทรศัพท์ติดต่อ</span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {inspectingUser.profile?.phone || 'ไม่ระบุ'}
                          </span>
                        </div>

                         {/* รหัสบัตรประชาชน */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                            เลขประจำตัวประชาชน (13 หลัก)
                            <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '4px', opacity: 0.6 }}>🔒 3 ตัวท้าย</span>
                          </span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            fontFamily: 'monospace',
                            letterSpacing: '1.5px'
                          }}>
                            {maskCitizenId(inspectingUser.profile?.citizenId)}
                          </span>
                        </div>

                        {/* สิทธิ์ที่ขอใช้งาน */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>สถานะ / สิทธิ์ที่ขอใช้งาน</span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: (inspectingUser.profile?.requestedRole === 'clerk' || inspectingUser.requestedRole === 'clerk') ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                            border: (inspectingUser.profile?.requestedRole === 'clerk' || inspectingUser.requestedRole === 'clerk') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', 
                            borderRadius: '10px',
                            color: (inspectingUser.profile?.requestedRole === 'clerk' || inspectingUser.requestedRole === 'clerk') ? '#6366f1' : '#10b981',
                            fontSize: '0.9rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: '700'
                          }}>
                            {(inspectingUser.profile?.requestedRole === 'clerk' || inspectingUser.requestedRole === 'clerk') ? '💼 1. เสมียน (Clerk)' : '👤 2. ผู้ใช้งานทั่วไป (General User)'}
                          </span>
                        </div>

                        {/* จำนวนเงินในบัญชี */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>จำนวนเงินในบัญชี (รวมใบเสร็จทั้งหมด)</span>
                          <span style={{ 
                            padding: '10px 16px', 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px',
                            color: '#10b981',
                            fontSize: '0.95rem',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: '700'
                          }}>
                            ฿{userReceipts.reduce((sum: number, r: any) => sum + (parseFloat(r.totalAmount || r.amount || 0) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: รายการใบเสร็จทั้งหมด (All Receipts Uploaded) */}
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🧾</span> รายการใบเสร็จทั้งหมดของผู้ใช้คนนี้ ({userReceipts.length} รายการ)
                      </h4>
                      
                      {userReceipts.length > 0 ? (
                        <div className={styles.tableContainer} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                          <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
                                <th style={{ textAlign: 'left', padding: '12px' }}>ร้านค้า</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>ช่องทาง</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>วันที่ส่ง</th>
                                <th style={{ textAlign: 'right', padding: '12px' }}>จำนวนเงิน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userReceipts.map((r: any, index: number) => {
                                const rawImg = r.imageUrl || r.imageURL || r.extractedData?.imageData || r.extractedData?.imageUrl;
                                const proxiedImg = cleanAndProxyImageUrl(rawImg);
                                return (
                                  <tr key={r.id || r._id || index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {proxiedImg ? (
                                          <img 
                                            src={proxiedImg} 
                                            alt="slip" 
                                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid var(--border-color)', flexShrink: 0 }} 
                                            onClick={() => window.open(proxiedImg, '_blank')}
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(148, 163, 184, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, color: 'var(--text-muted)' }}>
                                            🧾
                                          </div>
                                        )}
                                        <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{r.storeName || 'ไม่ระบุร้านค้า'}</div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                      <span className={`${styles.badge} ${r.source === 'line' ? styles.badgeAdmin : styles.badgeUser}`}>
                                        {r.source === 'line' ? '💬 LINE Bot' : '🌐 Web UI'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                      {new Date(r.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '700', textAlign: 'right', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                      ฿{parseFloat(r.totalAmount || r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--input-bg)', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '0.85rem' }}>
                          ไม่พบประวัติการส่งใบเสร็จใดๆ ในระบบสำหรับผู้ใช้นี้
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
