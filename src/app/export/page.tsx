"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useReceipts } from '@/hooks/useReceipts';
import styles from './Export.module.css';

// Interface for export rows
interface ExportItem {
  id: string;
  invoiceNo: string;
  storeName: string;
  date: string;
  amount: number;
  status: 'Approved' | 'Pending';
  category: string;
  source: 'LINE' | 'Web';
}

export default function ExportPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const { receipts, fetchReceipts, loading } = useReceipts();

  // Load receipts on mount
  useEffect(() => {
    if (session?.user?.id) {
      const lineUserId = (session as any)?.lineUserId as string | undefined;
      fetchReceipts(session.user.id, lineUserId);
    }
  }, [session, fetchReceipts]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Helper to format Date to local YYYY-MM-DD
  const formatDateToYYYYMMDD = (date: Date | null) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper to parse local YYYY-MM-DD string to Date object
  const parseLocalYYYYMMDD = (val: string) => {
    if (!val) return null;
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper to get today's local date (at midnight)
  const getTodayLocalDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  // Default range: Initialized to today's local date
  const [startDate, setStartDate] = useState<Date | null>(getTodayLocalDate());
  const [endDate, setEndDate] = useState<Date | null>(getTodayLocalDate());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด'); // Default to 'ทั้งหมด' to prevent showing empty table immediately
  const [categoryFilter, setCategoryFilter] = useState<string>('ทั้งหมด');
  const [submitterFilter, setSubmitterFilter] = useState<string>('ทั้งหมด');

  // Format selection
  // Format selection
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv'>('excel');

  // Clear button action
  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setStatusFilter('ทั้งหมด');
    setCategoryFilter('ทั้งหมด');
    setSubmitterFilter('ทั้งหมด');
  };

  // Default mock data (matching exact invoice numbers and amounts in mockup)
  const defaultMockItems: ExportItem[] = [
    {
      id: 'mock-1',
      invoiceNo: 'INV-00123',
      storeName: '7-Eleven',
      date: '2024-07-15',
      amount: 1500.00,
      status: 'Approved',
      category: 'อาหาร',
      source: 'LINE'
    },
    {
      id: 'mock-2',
      invoiceNo: 'INV-00124',
      storeName: 'Starbucks',
      date: '2024-07-22',
      amount: 850.50,
      status: 'Approved',
      category: 'เครื่องดื่ม',
      source: 'Web'
    },
    {
      id: 'mock-3',
      invoiceNo: 'INV-00125',
      storeName: 'Lotus Express',
      date: '2024-08-01',
      amount: 3200.00,
      status: 'Approved',
      category: 'ของใช้',
      source: 'LINE'
    },
    {
      id: 'mock-4',
      invoiceNo: 'INV-00126',
      storeName: 'Big C Extra',
      date: '2024-08-05',
      amount: 1250.00,
      status: 'Pending',
      category: 'ของใช้',
      source: 'LINE'
    },
    {
      id: 'mock-5',
      invoiceNo: 'INV-00127',
      storeName: 'Shabushi',
      date: '2024-07-10',
      amount: 499.00,
      status: 'Approved',
      category: 'อาหาร',
      source: 'Web'
    }
  ];

  // Convert real receipts to export format if available
  const allItems = useMemo(() => {
    const convertedReceipts: ExportItem[] = receipts.map((r, idx) => {
      // Find invoice no or construct one
      const invNo = r.extractedData?.receiptNo || r.transactionId || `INV-${String(10128 + idx).padStart(5, '0')}`;
      const amountVal = r.amount !== undefined ? r.amount : (r.totalAmount || 0);
      const isApproved = r.extractedData !== undefined;
      const status: 'Approved' | 'Pending' = isApproved ? 'Approved' : 'Pending';
      const category = r.extractedData?.category || 'ไม่ระบุ';
      const source = (r.source === 'line' || r.transactionId?.startsWith('LINE-')) ? 'LINE' : 'Web';
      let dateStr = '';
      if (r.extractedData?.date && /^\d{4}-\d{2}-\d{2}$/.test(r.extractedData.date)) {
        dateStr = r.extractedData.date;
      } else if (r.extractedData?.date) {
        dateStr = formatDateToYYYYMMDD(new Date(r.extractedData.date));
      } else {
        dateStr = formatDateToYYYYMMDD(new Date(r.createdAt));
      }

      return {
        id: r._id || r.id || `real-${idx}`,
        invoiceNo: invNo,
        storeName: r.storeName || 'ไม่ระบุร้านค้า',
        date: dateStr,
        amount: amountVal,
        status,
        category,
        source
      };
    });

    // Merge default mockup items so the user gets a working preview immediately
    return [...convertedReceipts, ...defaultMockItems];
  }, [receipts]);

  // Extract unique categories for the dropdown filter
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    allItems.forEach(item => {
      if (item.category) list.add(item.category);
    });
    return ['ทั้งหมด', ...Array.from(list)];
  }, [allItems]);

  // Filtered dataset for preview table and downloading
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Status Filter
      if (statusFilter !== 'ทั้งหมด') {
        const checkStatus = statusFilter === 'Approved' ? 'Approved' : 'Pending';
        if (item.status !== checkStatus) return false;
      }

      // Category Filter
      if (categoryFilter !== 'ทั้งหมด' && item.category !== categoryFilter) {
        return false;
      }

      // Submitter Filter
      if (submitterFilter !== 'ทั้งหมด' && item.source !== submitterFilter) {
        return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const itemDateObj = parseLocalYYYYMMDD(item.date);
        if (itemDateObj) {
          const itemTime = itemDateObj.getTime();
          
          if (startDate) {
            const sTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
            if (itemTime < sTime) return false;
          }

          if (endDate) {
            const eTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
            if (itemTime > eTime) return false;
          }
        }
      }

      return true;
    });
  }, [allItems, startDate, endDate, statusFilter, categoryFilter, submitterFilter]);

  // Export File Downloader Action
  const handleExportDownload = () => {
    if (filteredItems.length === 0) {
      alert("ไม่พบข้อมูลที่จะส่งออกในตัวกรองนี้");
      return;
    }

    // Create CSV format
    const headers = ['Invoice #', 'Store Name', 'Submission Date', 'Amount (THB)', 'Status', 'Category', 'Source'];
    const csvRows = [headers.join(',')];

    filteredItems.forEach(item => {
      const statusLabel = item.status === 'Approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ';
      const row = [
        `"${item.invoiceNo}"`,
        `"${item.storeName.replace(/"/g, '""')}"`,
        `"${item.date}"`,
        item.amount.toFixed(2),
        `"${statusLabel}"`,
        `"${item.category}"`,
        `"${item.source}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "\uFEFF" + csvRows.join('\n'); // Add UTF-8 BOM for Thai characters
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `smartslip_export_${new Date().toISOString().split('T')[0]}.${fileFormat === 'excel' ? 'xls' : 'csv'}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar overlay for mobile drawer */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} onAddReceipt={() => setIsCreateSheetOpen(true)} />

      <main className="main-content">
        <TopBar
          title="ส่งออกข้อมูล"
          mobileTitle="ส่งออก"
          onToggleSidebar={toggleSidebar}
          onCreateNew={() => setIsCreateSheetOpen(true)}
        />

        <div className="page-container">
          <div className={styles.headerArea}>
            <h1 className={styles.mainTitle}>ส่งออกข้อมูล</h1>
            <p className={styles.subTitle}>เลือกชุดข้อมูล รูปแบบไฟล์ และเริ่มดาวน์โหลด</p>
          </div>

          <div className={styles.formContainer}>
            <div className={styles.topConfigsRow}>
              {/* Filter Section */}
              <div className={styles.card}>
                <h2 className={styles.sectionHeader}>ตัวเลือกการกรอง</h2>

                 {/* Date Input Range */}
                <div className={styles.dateRangeRow}>
                  <div className={styles.dateCol}>
                    <label className={styles.inputLabel}>วันที่เริ่มต้น</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={formatDateToYYYYMMDD(startDate)}
                      onChange={(e) => setStartDate(parseLocalYYYYMMDD(e.target.value))}
                    />
                  </div>
                  <div className={styles.dateCol}>
                    <label className={styles.inputLabel}>วันที่สิ้นสุด</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={formatDateToYYYYMMDD(endDate)}
                      onChange={(e) => setEndDate(parseLocalYYYYMMDD(e.target.value))}
                    />
                  </div>
                </div>

                {/* Selector Inputs */}
                <div className={styles.selectRowGrid}>
                  <div className={styles.selectCol}>
                    <label className={styles.inputLabel}>สถานะ</label>
                    <select
                      className={styles.dropdownInput}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      <option value="Approved">อนุมัติแล้ว</option>
                      <option value="Pending">รอตรวจสอบ</option>
                    </select>
                  </div>

                  <div className={styles.selectCol}>
                    <label className={styles.inputLabel}>หมวดหมู่</label>
                    <select
                      className={styles.dropdownInput}
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.selectCol}>
                    <label className={styles.inputLabel}>ผู้ส่ง</label>
                    <select
                      className={styles.dropdownInput}
                      value={submitterFilter}
                      onChange={(e) => setSubmitterFilter(e.target.value)}
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      <option value="LINE">LINE</option>
                      <option value="Web">เว็บ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* File Format & Actions Selection Card */}
              <div className={`${styles.card} ${styles.formatCard}`}>
                <h2 className={styles.sectionHeader}>เลือกรูปแบบไฟล์</h2>
                <div className={styles.formatSegmentControl}>
                  <button
                    type="button"
                    onClick={() => setFileFormat('excel')}
                    className={`${styles.formatBtn} ${fileFormat === 'excel' ? styles.formatBtnActive : ''}`}
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileFormat('csv')}
                    className={`${styles.formatBtn} ${fileFormat === 'csv' ? styles.formatBtnActive : ''}`}
                  >
                    CSV (.csv)
                  </button>
                </div>

                {/* Actions Row at the bottom of the card */}
                <div className={styles.actionsBarInside}>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className={styles.clearBtn}
                  >
                    ล้างค่า
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDownload}
                    className={styles.downloadBtn}
                  >
                    สร้างและดาวน์โหลด
                  </button>
                </div>
              </div>
            </div>

            {/* Table Preview */}
            <div className={styles.card}>
              <h2 className={styles.sectionHeader}>ตัวอย่างข้อมูล</h2>
              <div className={styles.tableResponsiveContainer}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Submission Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className={styles.loadingCell}>
                          กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          ไม่พบข้อมูลรายการใบเสร็จตามตัวกรองที่กำหนด
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map(item => (
                        <tr key={item.id}>
                          <td className={styles.invoiceCell}>{item.invoiceNo}</td>
                          <td>{item.date}</td>
                          <td className={styles.amountCell}>
                            ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={item.status === 'Approved' ? styles.statusBadgeApproved : styles.statusBadgePending}>
                              {item.status === 'Approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>



          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={() => {
          if (session?.user?.id) fetchReceipts(session.user.id);
          setIsCreateSheetOpen(false);
        }}
        userId={session?.user?.id}
      />
    </div>
  );
}
