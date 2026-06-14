"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ReceiptDetailSheet from '@/components/ReceiptDetailSheet';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { Receipt } from '@/lib/apiClient';
import { identifyDuplicateReceipts } from '@/lib/ocr-utils';
import styles from './LineReceipts.module.css';

const VIEWED_KEY = 'smartslip_viewed_receipts';
const UNREAD_EVENT = 'smartslip_unread_update';

function getViewedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(VIEWED_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
}

function saveViewedIds(ids: Set<string>) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new Event(UNREAD_EVENT));
}

function LineReceiptsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Receipt | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'line' | 'web' | 'duplicate'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'line' || tab === 'web' || tab === 'duplicate') return tab;
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const { receipts, fetchReceipts, deleteReceipt, loading } = useReceipts();

  useEffect(() => {
    setViewedIds(getViewedIds());
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  // Update unread count in localStorage whenever receipts or viewedIds change
  const { duplicateIds, allDuplicateIds } = identifyDuplicateReceipts(receipts);
  const allImageReceipts = receipts.filter(r => r.extractedData?.imageData || r.imageURL || r.imageUrl);
  const lineReceipts = allImageReceipts.filter(r => {
    const isSubsequentDuplicate = duplicateIds.has(r._id || r.id || '');
    const isAnyDuplicate = allDuplicateIds.has(r._id || r.id || '');
    if (filterTab === 'duplicate') return isAnyDuplicate;
    
    // For other tabs, exclude duplicates
    if (isSubsequentDuplicate) return false;

    const isLine = r.source === 'line' || r.transactionId?.startsWith('LINE-');
    if (filterTab === 'line') return isLine;
    if (filterTab === 'web')  return !isLine;
    return true;
  });

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const availableYears = Array.from(new Set([
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
    new Date().getFullYear() - 3,
    ...receipts.map(r => {
      const dateStr = r.extractedData?.date || r.createdAt;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date(r.createdAt).getFullYear() : d.getFullYear();
    }).filter(y => !isNaN(y))
  ])).sort((a, b) => b - a);

  const filteredReceipts = lineReceipts.filter(r => {
    // 1. Search Query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const storeName = (r.storeName || '').toLowerCase();
      const amount = String(r.amount !== undefined ? r.amount : r.totalAmount || 0);
      
      const dateObj = new Date(r.extractedData?.date || r.createdAt);
      const dateFormatted = dateObj.toLocaleDateString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
      }).toLowerCase();
      
      const matchStore = storeName.includes(q);
      const matchAmount = amount.includes(q);
      const matchDate = dateFormatted.includes(q);
      
      if (!matchStore && !matchAmount && !matchDate) {
        return false;
      }
    }

    // 2. Category filter
    if (selectedCategory !== 'ทั้งหมด') {
      const cat = r.extractedData?.category || 'ไม่ระบุ';
      if (cat !== selectedCategory) {
        return false;
      }
    }

    // 3. Period filter
    const dateObj = new Date(r.extractedData?.date || r.createdAt);
    if (selectedPeriod === '7 วัน') {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) return false;
    } else if (selectedPeriod === 'รายเดือน') {
      if (dateObj.getMonth() !== filterMonth || dateObj.getFullYear() !== filterYear) {
        return false;
      }
    } else if (selectedPeriod === 'รายปี') {
      if (dateObj.getFullYear() !== filterYear) {
        return false;
      }
    }

    return true;
  });

  useEffect(() => {
    if (lineReceipts.length === 0) return;
    const unread = lineReceipts.filter(r => !viewedIds.has(r._id || r.id || '')).length;
    localStorage.setItem('smartslip_unread_count', String(unread));
    window.dispatchEvent(new Event(UNREAD_EVENT));
  }, [lineReceipts, viewedIds]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const markAsViewed = useCallback((id: string) => {
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveViewedIds(next);
      return next;
    });
  }, []);

  const handleReceiptClick = (receipt: Receipt) => {
    markAsViewed(receipt._id || receipt.id || '');
    setSelectedReceipt(receipt);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    await deleteReceipt(deleteConfirm._id || deleteConfirm.id || '');
    setDeleteConfirm(null);
  };

  // Proxy GCS images through local API to bypass public access restrictions
  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('storage.googleapis.com')) {
      return `/api/gcs-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} onAddReceipt={() => setIsCreateSheetOpen(true)} />

      <main className="main-content">
        <TopBar
          title="แกลเลอรีรูปใบเสร็จจาก LINE"
          mobileTitle="แกลเลอรี"
          onToggleSidebar={toggleSidebar}
          onCreateNew={() => setIsCreateSheetOpen(true)}
        />

        <div className="page-container">
          <div className={styles.header} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2>รูปใบเสร็จที่ส่งผ่าน LINE</h2>
              <p>รวมรูปภาพทั้งหมดที่คุณส่งเข้ามาผ่านบอท LINE</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                {
                  key: 'all',
                  label: 'ทั้งหมด',
                  count: allImageReceipts.filter(r => !duplicateIds.has(r._id || r.id || '')).length,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  ),
                  activeColor: '#475569',
                  activeBg: '#475569',
                  activeBadge: '#334155',
                },
                {
                  key: 'line',
                  label: 'LINE',
                  count: allImageReceipts.filter(r => (r.source === 'line' || r.transactionId?.startsWith('LINE-')) && !duplicateIds.has(r._id || r.id || '')).length,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 5.92 2 10.72c0 3.1 1.73 5.84 4.35 7.52-.16.58-.52 2.1-.6 2.43-.1.4.15.4.31.29.13-.09 1.98-1.35 2.78-1.9.37.05.74.08 1.16.08 5.52 0 10-3.92 10-8.72S17.52 2 12 2z"/>
                    </svg>
                  ),
                  activeColor: '#00b900',
                  activeBg: '#00b900',
                  activeBadge: '#009900',
                },
                {
                  key: 'web',
                  label: 'เว็บ',
                  count: allImageReceipts.filter(r => !(r.source === 'line' || r.transactionId?.startsWith('LINE-')) && !duplicateIds.has(r._id || r.id || '')).length,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ),
                  activeColor: '#2563eb',
                  activeBg: '#2563eb',
                  activeBadge: '#1d4ed8',
                },
                {
                  key: 'duplicate',
                  label: 'ซ้ำกัน',
                  count: allImageReceipts.filter(r => allDuplicateIds.has(r._id || r.id || '')).length,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="13" y2="13" />
                      <circle cx="17" cy="17" r="3" fill="#ef4444" stroke="none" />
                    </svg>
                  ),
                  activeColor: '#ef4444',
                  activeBg: '#ef4444',
                  activeBadge: '#dc2626',
                }
              ] as const).map(tab => {
                const isActive = filterTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                      fontSize: '0.875rem', fontWeight: '700', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      border: isActive ? 'none' : '1.5px solid var(--border-color)',
                      background: isActive ? tab.activeBg : 'var(--surface-color)',
                      color: isActive ? 'white' : 'var(--text-muted)',
                      boxShadow: isActive ? `0 4px 12px ${tab.activeBg}40` : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: '800', padding: '2px 7px', borderRadius: '20px',
                      background: isActive ? tab.activeBadge : 'var(--sidebar-item-hover)',
                      color: isActive ? 'white' : 'var(--text-muted)',
                      minWidth: '20px', textAlign: 'center',
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar (Search + Category + Period) */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                placeholder="ค้นหาร้านค้า, วันที่, ยอดเงิน..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Desktop: chips (hidden on mobile) */}
            <div className={`${styles.filterGroup} ${styles.desktopOnly}`}>
              <span className={styles.filterLabel}>หมวดหมู่:</span>
              <div className={styles.filterChips}>
                {['ทั้งหมด', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ'].map(cat => (
                  <div
                    key={cat}
                    className={`${styles.filterChip} ${selectedCategory === cat ? styles.filterChipActive : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            </div>
            <div className={`${styles.filterGroup} ${styles.desktopOnly}`}>
              <span className={styles.filterLabel}>ช่วงเวลา:</span>
              <div className={styles.filterChips}>
                {['7 วัน', 'รายเดือน', 'รายปี'].map(period => (
                  <div
                    key={period}
                    className={`${styles.filterChip} ${selectedPeriod === period ? styles.filterChipActive : ''}`}
                    onClick={() => setSelectedPeriod(prev => prev === period ? null : period)}
                  >
                    {period}
                  </div>
                ))}
              </div>

              {/* Secondary dropdowns for Month and Year */}
              {selectedPeriod === 'รายเดือน' && (
                <div className={styles.secondaryFilters}>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(Number(e.target.value))}
                    className={styles.secondarySelect}
                  >
                    {monthNames.map((name, index) => (
                      <option key={index} value={index}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(Number(e.target.value))}
                    className={styles.secondarySelect}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPeriod === 'รายปี' && (
                <div className={styles.secondaryFilters}>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(Number(e.target.value))}
                    className={styles.secondarySelect}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Mobile: dropdowns (hidden on desktop) */}
            <div className={styles.mobileDropdownsContainer}>
              <div className={styles.mobileDropdowns}>
                <select
                  className={styles.mobileSelect}
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="ทั้งหมด">หมวดหมู่: ทั้งหมด</option>
                  <option value="อาหาร">อาหาร</option>
                  <option value="เดินทาง">เดินทาง</option>
                  <option value="ช้อปปิ้ง">ช้อปปิ้ง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
                <select
                  className={styles.mobileSelect}
                  value={selectedPeriod || ''}
                  onChange={e => setSelectedPeriod(e.target.value || null)}
                >
                  <option value="">ช่วงเวลา</option>
                  <option value="7 วัน">7 วัน</option>
                  <option value="รายเดือน">รายเดือน</option>
                  <option value="รายปี">รายปี</option>
                </select>
              </div>

              {/* Mobile Secondary selectors */}
              {selectedPeriod === 'รายเดือน' && (
                <div className={styles.mobileSecondaryFilters}>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(Number(e.target.value))}
                    className={styles.mobileSelect}
                  >
                    {monthNames.map((name, index) => (
                      <option key={index} value={index}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(Number(e.target.value))}
                    className={styles.mobileSelect}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPeriod === 'รายปี' && (
                <div className={styles.mobileSecondaryFilters}>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(Number(e.target.value))}
                    className={styles.mobileSelect}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>กำลังโหลดรูปภาพ...</p>
            </div>
          ) : lineReceipts.length === 0 ? (
            <div className={styles.emptyState}>
              {filterTab === 'duplicate' ? (
                <>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3 style={{ color: '#1e293b', marginTop: '16px' }}>ไม่พบสลิปที่ซ้ำกัน</h3>
                  <p>ยอดเยี่ยมมาก! ไม่มีสลิปโอนเงินที่ซ้ำกันในระบบของคุณเลย</p>
                </>
              ) : (
                <>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <h3>ไม่พบรูปภาพ</h3>
                  <p>{filterTab === 'line' ? 'ยังไม่มีรูปจาก LINE Bot' : filterTab === 'web' ? 'ยังไม่มีรูปที่อัปโหลดจากเว็บ' : 'ลองส่งรูปใบเสร็จเข้าไปในแชท LINE Bot ของคุณดูสิ!'}</p>
                </>
              )}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <h3>ไม่พบรูปภาพตามเงื่อนไข</h3>
              <p>ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองหมวดหมู่/ช่วงเวลาอื่นดูนะ</p>
            </div>
          ) : (
            <div className={styles.galleryGrid}>
              {filteredReceipts.map((receipt, index) => {
                const isNew = !viewedIds.has(receipt._id || receipt.id || '');
                return (
                  <div
                    key={(receipt._id || receipt.id) || index}
                    className={styles.galleryCard}
                    onClick={() => handleReceiptClick(receipt)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {isNew && (
                      <div style={{
                        position: 'absolute', top: '8px', left: '8px', zIndex: 10,
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: '#ef4444', border: '2px solid white',
                        boxShadow: '0 0 0 2px rgba(239,68,68,0.3)',
                      }} title="ใหม่" />
                    )}

                    <div
                      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                            if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            border: 'none', background: 'var(--surface-color)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)',
                          }}
                        >⋮</button>
                        <div style={{
                          display: 'none', position: 'absolute', right: 0, top: '32px',
                          background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '130px', overflow: 'hidden', zIndex: 20,
                        }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleReceiptClick(receipt);
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            แก้ไข
                          </button>
                          <div style={{ height: '1px', background: '#f3f4f6', margin: '0 10px' }} />
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirm(receipt);
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff1f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.imageContainer}>
                      {receipt.extractedData?.imageData || receipt.imageURL || receipt.imageUrl ? (
                        <img src={receipt.extractedData?.imageData || getImageUrl(receipt.imageURL || receipt.imageUrl) || undefined} alt={`ใบเสร็จจาก ${receipt.storeName}`} loading="lazy" />
                      ) : (
                        <div className={styles.noImage}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span>ไม่มีรูปภาพ</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardDetails}>
                      <div className={styles.storeName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {receipt.storeName}
                        {isNew && (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '20px', letterSpacing: '0.02em' }}>
                            ใหม่
                          </span>
                        )}
                      </div>
                      <div className={styles.amount}>฿ {((receipt.amount !== undefined ? receipt.amount : receipt.totalAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                      <div className={styles.date}>
                        {new Date(receipt.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '28px 32px', width: 'min(400px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              ต้องการลบ <strong style={{ color: '#1e293b' }}>{deleteConfirm.storeName || 'รายการนี้'}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleDeleteConfirmed} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={() => {
          if (session?.user?.id) fetchReceipts(session.user.id);
          setIsCreateSheetOpen(false);
        }}
        userId={session?.user?.id}
      />

      {/* ── Receipt Detail Sheet ── */}
      <ReceiptDetailSheet
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onSuccess={() => {
          if (session?.user?.id) fetchReceipts(session.user.id);
          setSelectedReceipt(null);
        }}
      />
    </div>
  );
}

export default function LineReceiptsPage() {
  return (
    <Suspense>
      <LineReceiptsContent />
    </Suspense>
  );
}
