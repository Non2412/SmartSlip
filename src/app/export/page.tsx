"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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

  // Default range: July 2, 2024 to August 7, 2024 (matching mockup image)
  const [startDate, setStartDate] = useState<Date | null>(new Date('2024-07-02'));
  const [endDate, setEndDate] = useState<Date | null>(new Date('2024-08-07'));

  // Calendar navigation state (starting display on July 2024)
  const [currentYear, setCurrentYear] = useState(2024);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed (6 is July)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('Approved'); // Default 'Approved' (อนุมัติแล้ว) as in mockup
  const [categoryFilter, setCategoryFilter] = useState<string>('ทั้งหมด');
  const [submitterFilter, setSubmitterFilter] = useState<string>('ทั้งหมด');

  // Format selection
  const [fileFormat, setFileFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

  // Interactive Date Range Logic
  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Move calendar backwards
  const prevMonths = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Move calendar forwards
  const nextMonths = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days for a specific month/year
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay(); // Day of week (0 = Sunday, 1 = Monday...)
    const numDays = new Date(year, month + 1, 0).getDate();

    // Padding for empty space before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days in month
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  // Left and Right month values
  const leftYear = currentYear;
  const leftMonth = currentMonth;

  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;

  const leftMonthDays = useMemo(() => getDaysInMonth(leftYear, leftMonth), [leftYear, leftMonth]);
  const rightMonthDays = useMemo(() => getDaysInMonth(rightYear, rightMonth), [rightYear, rightMonth]);

  const monthNamesTh = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper check: is same day
  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Helper check: is in range
  const isBetweenDates = (date: Date | null) => {
    if (!date || !startDate || !endDate) return false;
    // Set hours to 0 to compare purely by calendar day
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
    return d > s && d < e;
  };

  // Helper: check if date is start or end
  const isEdgeDate = (date: Date | null) => {
    return isSameDay(date, startDate) || isSameDay(date, endDate);
  };

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
      const dateStr = r.extractedData?.date ? new Date(r.extractedData.date).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0];

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
        const itemTime = new Date(item.date).getTime();
        
        if (startDate) {
          const sTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
          if (itemTime < sTime) return false;
        }

        if (endDate) {
          const eTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
          if (itemTime > eTime) return false;
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

    if (fileFormat === 'excel' || fileFormat === 'csv') {
      // Create CSV format
      const headers = ['Invoice #', 'Store Name', 'Submission Date', 'Amount (THB)', 'Status', 'Category', 'Source'];
      const csvRows = [headers.join(',')];

      filteredItems.forEach(item => {
        const statusLabel = item.status === 'Approved' ? 'Approved' : 'Pending';
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
    } else if (fileFormat === 'pdf') {
      // Trigger browser printing for clean printout layout
      window.print();
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar overlay for mobile drawer */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className="main-content">
        <TopBar
          title="ส่งออกข้อมูล"
          mobileTitle="ส่งออก"
          onToggleSidebar={toggleSidebar}
        />

        <div className="page-container">
          <div className={styles.headerArea}>
            <h1 className={styles.mainTitle}>ส่งออกข้อมูล</h1>
            <p className={styles.subTitle}>เลือกชุดข้อมูล รูปแบบไฟล์ และเริ่มดาวน์โหลด</p>
          </div>

          <div className={styles.formContainer}>
            {/* Filter Section */}
            <div className={styles.card}>
              <h2 className={styles.sectionHeader}>ตัวเลือกการกรอง</h2>

              {/* Date Range Calendar */}
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>ช่วงวันที่</label>
                <div className={styles.calendarWidget}>
                  
                  {/* Calendar Header with navigation */}
                  <div className={styles.calendarNavHeader}>
                    <button type="button" onClick={prevMonths} className={styles.navBtn} title="ย้อนกลับ">
                      &lt;
                    </button>
                    <span className={styles.monthDisplay}>
                      {monthNamesTh[leftMonth]} {leftYear}
                    </span>
                    <span className={styles.monthDisplay}>
                      {monthNamesTh[rightMonth]} {rightYear}
                    </span>
                    <button type="button" onClick={nextMonths} className={styles.navBtn} title="ถัดไป">
                      &gt;
                    </button>
                  </div>

                  {/* Dual Calendar View */}
                  <div className={styles.dualCalendarContainer}>
                    
                    {/* Left Month */}
                    <div className={styles.calendarMonth}>
                      <div className={styles.dayNamesHeader}>
                        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                      </div>
                      <div className={styles.daysGrid}>
                        {leftMonthDays.map((date, idx) => {
                          if (!date) return <div key={`empty-left-${idx}`} className={styles.emptyDay} />;
                          
                          const active = isEdgeDate(date);
                          const between = isBetweenDates(date);
                          const isStart = isSameDay(date, startDate);
                          const isEnd = isSameDay(date, endDate);

                          return (
                            <button
                              key={`left-${date.toISOString()}`}
                              type="button"
                              onClick={() => handleDateClick(date)}
                              className={`${styles.dayBtn} ${active ? styles.activeDay : ''} ${between ? styles.betweenDay : ''} ${isStart ? styles.startDay : ''} ${isEnd ? styles.endDay : ''}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider for responsiveness */}
                    <div className={styles.calendarDivider} />

                    {/* Right Month */}
                    <div className={styles.calendarMonth}>
                      <div className={styles.dayNamesHeader}>
                        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                      </div>
                      <div className={styles.daysGrid}>
                        {rightMonthDays.map((date, idx) => {
                          if (!date) return <div key={`empty-right-${idx}`} className={styles.emptyDay} />;
                          
                          const active = isEdgeDate(date);
                          const between = isBetweenDates(date);
                          const isStart = isSameDay(date, startDate);
                          const isEnd = isSameDay(date, endDate);

                          return (
                            <button
                              key={`right-${date.toISOString()}`}
                              type="button"
                              onClick={() => handleDateClick(date)}
                              className={`${styles.dayBtn} ${active ? styles.activeDay : ''} ${between ? styles.betweenDay : ''} ${isStart ? styles.startDay : ''} ${isEnd ? styles.endDay : ''}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
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

            {/* File Format Selection */}
            <div className={styles.card}>
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
                <button
                  type="button"
                  onClick={() => setFileFormat('pdf')}
                  className={`${styles.formatBtn} ${fileFormat === 'pdf' ? styles.formatBtnActive : ''}`}
                >
                  PDF (.pdf)
                </button>
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
                              {item.status === 'Approved' ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Bar */}
            <div className={styles.actionsBar}>
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
      </main>
    </div>
  );
}
