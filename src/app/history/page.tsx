"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import dynamic from 'next/dynamic';
import { useReceipts } from '@/hooks/useReceipts';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';
import { identifyDuplicateReceipts } from '@/lib/ocr-utils';
import styles from './history.module.css';

const CreateReceiptSheet = dynamic(() => import('@/components/CreateReceiptSheet'), { ssr: false });
const ReceiptDetailSheet = dynamic(() => import('@/components/ReceiptDetailSheet'), { ssr: false });

const CATEGORIES = ['ทั้งหมด', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ'];
const PERIODS = ['7 วัน', 'รายเดือน', 'รายปี'];
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function HistoryPage() {
  const { data: session } = useSession();
  const { receipts, fetchReceipts, loading, error } = useReceipts();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
  
  // Filters State
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [activeStatus, setActiveStatus] = useState<string>('ทั้งหมด'); // ทั้งหมด | สำเร็จ | รอตรวจสอบ
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  // Sidebar Controls
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  // Available Years from Receipts
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    receipts.forEach(r => {
      const dateStr = r.extractedData?.date || r.createdAt;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [receipts]);

  // Filter out duplicates (following dashboard structure)
  const uniqueReceipts = useMemo(() => {
    const { duplicateIds } = identifyDuplicateReceipts(receipts);
    return receipts.filter(r => !duplicateIds.has(r._id || r.id || ''));
  }, [receipts]);

  // Apply Advanced Filters
  const filteredReceipts = useMemo(() => {
    return uniqueReceipts.filter(r => {
      // 1. Search Query Filter
      const q = searchText.trim().toLowerCase();
      const amountVal = r.amount !== undefined ? r.amount : r.totalAmount;
      const store = (r.storeName || '').toLowerCase();
      const cat = (r.extractedData?.category || 'อื่นๆ').toLowerCase();
      const matchSearch = !q || store.includes(q) || cat.includes(q) || String(amountVal || '').includes(q);

      // 2. Category Filter
      const categoryVal = r.extractedData?.category || 'อื่นๆ';
      const matchCategory = activeCategory === 'ทั้งหมด' || categoryVal === activeCategory;

      // 3. Status Filter
      const isApproved = r.extractedData !== undefined && r.extractedData !== null;
      let matchStatus = true;
      if (activeStatus === 'สำเร็จ') {
        matchStatus = isApproved;
      } else if (activeStatus === 'รอตรวจสอบ') {
        matchStatus = !isApproved;
      }

      // 4. Period Filter
      let matchPeriod = true;
      const dateObj = new Date(r.extractedData?.date || r.createdAt);
      if (activePeriod === '7 วัน') {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - dateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) matchPeriod = false;
      } else if (activePeriod === 'รายเดือน') {
        if (dateObj.getMonth() !== filterMonth || dateObj.getFullYear() !== filterYear) {
          matchPeriod = false;
        }
      } else if (activePeriod === 'รายปี') {
        if (dateObj.getFullYear() !== filterYear) {
          matchPeriod = false;
        }
      }

      return matchSearch && matchCategory && matchStatus && matchPeriod;
    });
  }, [uniqueReceipts, searchText, activeCategory, activeStatus, activePeriod, filterMonth, filterYear]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeCategory, activeStatus, activePeriod, filterMonth, filterYear, pageSize]);

  // Pagination calculation
  const totalItems = filteredReceipts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const paginatedReceipts = useMemo(() => {
    return filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredReceipts, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      if (currentPage <= 3) {
        start = 1;
        end = maxVisiblePages;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisiblePages + 1;
        end = totalPages;
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const handleClearFilters = () => {
    setSearchText('');
    setActiveCategory('ทั้งหมด');
    setActivePeriod(null);
    setActiveStatus('ทั้งหมด');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { dateStr, timeStr: '' };
      return {
        dateStr: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        timeStr: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { dateStr, timeStr: '' };
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar mobile overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onAddReceipt={openCreateSheet}
      />

      <main className="main-content">
        <TopBar
          title="ประวัติใบเสร็จ"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="page-container">
          <div className={styles.container}>
            {/* Filter Panel */}
            <div className={styles.filterBar}>
              <div className={styles.searchRow}>
                <div className={styles.searchWrapper}>
                  <span className={styles.searchIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="ค้นหาร้านค้า, ยอดเงิน..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
                <button className={styles.clearFiltersBtn} onClick={handleClearFilters}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  ล้างตัวกรอง
                </button>
              </div>

              {/* Desktop Filters */}
              <div className={styles.filtersRow}>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>หมวดหมู่:</span>
                  <div className={styles.filterChips}>
                    {CATEGORIES.map(cat => (
                      <div
                        key={cat}
                        className={`${styles.filterChip} ${activeCategory === cat ? styles.filterChipActive : ''}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>สถานะ:</span>
                  <div className={styles.filterChips}>
                    {['ทั้งหมด', 'สำเร็จ', 'รอตรวจสอบ'].map(status => (
                      <div
                        key={status}
                        className={`${styles.filterChip} ${activeStatus === status ? styles.filterChipActive : ''}`}
                        onClick={() => setActiveStatus(status)}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>ช่วงเวลา:</span>
                  <div className={styles.filterChips}>
                    {PERIODS.map(period => (
                      <div
                        key={period}
                        className={`${styles.filterChip} ${activePeriod === period ? styles.filterChipActive : ''}`}
                        onClick={() => setActivePeriod(prev => prev === period ? null : period)}
                      >
                        {period}
                      </div>
                    ))}
                  </div>

                  {activePeriod === 'รายเดือน' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                      <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(Number(e.target.value))}
                        className={styles.secondarySelect}
                      >
                        {MONTHS.map((name, index) => (
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

                  {activePeriod === 'รายปี' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
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
              </div>

              {/* Mobile Filters Dropdown */}
              <div className={styles.mobileDropdowns}>
                <select
                  className={styles.mobileSelect}
                  value={activeCategory}
                  onChange={e => setActiveCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>หมวดหมู่: {cat}</option>
                  ))}
                </select>
                <select
                  className={styles.mobileSelect}
                  value={activeStatus}
                  onChange={e => setActiveStatus(e.target.value)}
                >
                  <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
                  <option value="สำเร็จ">สำเร็จ</option>
                  <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                </select>
                <select
                  className={styles.mobileSelect}
                  value={activePeriod || ''}
                  onChange={e => setActivePeriod(e.target.value || null)}
                >
                  <option value="">ช่วงเวลา: ทั้งหมด</option>
                  <option value="7 วัน">7 วัน</option>
                  <option value="รายเดือน">รายเดือน</option>
                  <option value="รายปี">รายปี</option>
                </select>
              </div>
            </div>

            {/* Table / List Card */}
            <div className={styles.tableCard}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>ร้านค้า</th>
                    <th>หมวดหมู่</th>
                    <th>ยอดสุทธิ</th>
                    <th>วิธีชำระ</th>
                    <th>สถานะ</th>
                    <th>วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className={styles.loadingRow}>
                      <td colSpan={6} className={styles.loadingCell}>
                        <div className={styles.loadingPulse}>กำลังโหลดข้อมูลใบเสร็จ...</div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyCell} style={{ color: '#ef4444' }}>
                        ⚠️ เกิดข้อผิดพลาด: {error}
                      </td>
                    </tr>
                  ) : paginatedReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyCell}>
                        ไม่พบรายการใบเสร็จในประวัติของคุณ
                      </td>
                    </tr>
                  ) : (
                    paginatedReceipts.map((receipt, index) => {
                      const amount = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
                      const isApproved = receipt.extractedData !== undefined && receipt.extractedData !== null;
                      const { dateStr, timeStr } = formatDate(receipt.extractedData?.date || receipt.createdAt);
                      const imgUrl = receipt.extractedData?.imageData || receipt.imageUrl || receipt.imageURL;
                      const cleanedImg = cleanAndProxyImageUrl(imgUrl);

                      return (
                        <tr key={receipt._id || receipt.id || index} onClick={() => setSelectedReceipt(receipt)}>
                          <td data-label="ร้านค้า">
                            <div className={styles.storeCell}>
                              <div className={styles.storeIcon}>
                                {cleanedImg ? (
                                  <img src={cleanedImg} alt={receipt.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  receipt.storeName?.charAt(0) || 'R'
                                )}
                              </div>
                              <span className={styles.storeName}>{receipt.storeName || 'ไม่ระบุร้านค้า'}</span>
                            </div>
                          </td>
                          <td data-label="หมวดหมู่">
                            <span className={styles.categoryBadge}>
                              {receipt.extractedData?.category || 'อื่นๆ'}
                            </span>
                          </td>
                          <td data-label="ยอดสุทธิ">
                            <span className={styles.amountText}>
                              ฿{amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </span>
                          </td>
                          <td data-label="วิธีชำระ">
                            {receipt.extractedData?.paymentMethod || receipt.extractedData?.method || 'ไม่ระบุ'}
                          </td>
                          <td data-label="สถานะ">
                            <div className={styles.statusWrapper}>
                              <span
                                className={styles.statusDot}
                                style={{ backgroundColor: isApproved ? '#10b981' : '#f59e0b' }}
                              />
                              <span
                                className={styles.statusText}
                                style={{ color: isApproved ? '#10b981' : '#d97706' }}
                              >
                                {isApproved ? 'สำเร็จ' : 'รอตรวจสอบ'}
                              </span>
                            </div>
                          </td>
                          <td data-label="วันที่">
                            <div className={styles.dateText}>
                              <span>{dateStr}</span>
                              <span className={styles.timeText}>{timeStr}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              {!loading && totalItems > 0 && (
                <div className={styles.paginationContainer}>
                  <div className={styles.paginationInfo}>
                    แสดง {startIndex} ถึง {endIndex} จากทั้งหมด {totalItems} รายการ
                  </div>
                  <div className={styles.paginationControls}>
                    <div className={styles.pageSizeSelector}>
                      <span>แสดง:</span>
                      <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className={styles.pageSizeSelect}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span>รายการ</span>
                    </div>

                    <div className={styles.paginationButtons}>
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
                        title="หน้าแรก"
                      >
                        &lt;&lt;
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
                        title="หน้าก่อน"
                      >
                        &lt;
                      </button>

                      {getPageNumbers().map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
                        title="หน้าถัดไป"
                      >
                        &gt;
                      </button>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
                        title="หน้าสุดท้าย"
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Slide-out Receipt Drawer */}
      {selectedReceipt && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelectedReceipt(null)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>รายละเอียดใบเสร็จ</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>

            <div className={styles.drawerContent}>
              {/* Image Preview */}
              <div className={styles.imagePreviewBox}>
                {(() => {
                  const imgUrl = selectedReceipt.extractedData?.imageData || selectedReceipt.imageUrl || selectedReceipt.imageURL;
                  const cleanedImg = cleanAndProxyImageUrl(imgUrl);
                  return cleanedImg ? (
                    <img src={cleanedImg} alt="Receipt Slip" className={styles.drawerImage} />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ไม่มีรูปภาพสลิป</div>
                  );
                })()}
              </div>

              {/* Basic Meta Details */}
              <div className={styles.detailCard}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ร้านค้า</span>
                  <span className={styles.detailVal}>{selectedReceipt.storeName || 'ไม่ระบุ'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>หมวดหมู่</span>
                  <span className={styles.detailVal}>{selectedReceipt.extractedData?.category || 'อื่นๆ'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ยอดสุทธิ</span>
                  <span className={styles.detailVal} style={{ color: '#10b981' }}>
                    ฿{(selectedReceipt.amount !== undefined ? selectedReceipt.amount : selectedReceipt.totalAmount)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>วันที่ทำรายการ</span>
                  <span className={styles.detailVal}>
                    {formatDate(selectedReceipt.extractedData?.date || selectedReceipt.createdAt).dateStr}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>เวลาทำรายการ</span>
                  <span className={styles.detailVal}>
                    {formatDate(selectedReceipt.extractedData?.date || selectedReceipt.createdAt).timeStr || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ชำระโดย</span>
                  <span className={styles.detailVal}>
                    {selectedReceipt.extractedData?.paymentMethod || selectedReceipt.extractedData?.method || 'ไม่ระบุ'}
                  </span>
                </div>
                {selectedReceipt.extractedData?.taxId && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>เลขผู้เสียภาษี</span>
                    <span className={styles.detailVal}>{selectedReceipt.extractedData.taxId}</span>
                  </div>
                )}
                {selectedReceipt.extractedData?.receiptNo && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>เลขที่ใบเสร็จ</span>
                    <span className={styles.detailVal}>{selectedReceipt.extractedData.receiptNo}</span>
                  </div>
                )}
              </div>

              {/* Items Section */}
              {selectedReceipt.extractedData?.items && Array.isArray(selectedReceipt.extractedData.items) && selectedReceipt.extractedData.items.length > 0 && (
                <div className={styles.itemsSection}>
                  <h4 className={styles.itemsTitle}>รายการสินค้า / บริการ</h4>
                  <div className={styles.itemList}>
                    {selectedReceipt.extractedData.items.map((item: any, idx: number) => (
                      <div key={idx} className={styles.itemRow}>
                        <div>
                          <div className={styles.itemName}>{item.description || 'ไม่ระบุชื่อรายการ'}</div>
                          <div className={styles.itemQtyPrice}>
                            {item.quantity || 1} x ฿{(item.unitPrice || item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <span className={styles.itemTotal}>
                          ฿{(item.total || item.totalPrice || ((item.quantity || 1) * (item.unitPrice || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Button */}
              <div className={styles.actionsSection}>
                <button
                  className={styles.actionBtnEdit}
                  onClick={() => {
                    setEditingReceipt(selectedReceipt);
                    setSelectedReceipt(null);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  ตรวจสอบ / แก้ไขข้อมูล
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Drawer Trigger Sheets */}
      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSuccess={() => {
          if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
          }
        }}
        userId={session?.user?.id || 'user123'}
      />

      <ReceiptDetailSheet
        isOpen={!!editingReceipt}
        receipt={editingReceipt ?? undefined}
        onClose={() => setEditingReceipt(null)}
        onSuccess={() => {
          if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
          }
          setEditingReceipt(null);
        }}
      />
    </div>
  );
}
