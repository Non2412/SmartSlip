'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './DashboardItems.module.css';
import { TableRowSkeleton } from './Skeleton';

interface StatCardProps {
    title: string;
    value: string;
    trend?: string;
    status?: string;
    icon?: React.ReactNode;
    iconBg?: 'green' | 'orange' | string;
}

export const StatCard = ({ title, value, trend, status, icon, iconBg = 'green' }: StatCardProps) => (
    <div className={styles.statCard}>
        <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{
                backgroundColor: iconBg === 'green' ? 'rgba(16,185,129,0.12)' : 'rgba(249,115,22,0.12)',
                color: iconBg === 'green' ? '#10b981' : '#f97316',
            }}>
                {icon || (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                )}
            </div>
            {trend && (
                <span className={styles.trendBadge}>
                    {trend}
                </span>
            )}
            {status && (
                <span className={styles.statusBadge}>
                    {status}
                </span>
            )}
        </div>
        <div>
            <div className={styles.statTitle}>{title}</div>
            <div className={styles.statValue}>{value}</div>
        </div>
    </div>
);

export const FilterBar = () => (
    <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
                type="text"
                placeholder="ค้นหาร้านค้า, วันที่, ยอดเงิน..."
                className={styles.searchInput}
            />
        </div>

        {/* Desktop: chips (hidden on mobile) */}
        <div className={`${styles.filterGroup} ${styles.desktopOnly}`}>
            <span className={styles.filterLabel}>หมวดหมู่:</span>
            <div className={styles.filterChips}>
                <div className={`${styles.filterChip} ${styles.filterChipActive}`}>ทั้งหมด</div>
                <div className={styles.filterChip}>อาหาร</div>
                <div className={styles.filterChip}>ของใช้</div>
            </div>
        </div>
        <div className={`${styles.filterGroup} ${styles.desktopOnly}`}>
            <span className={styles.filterLabel}>ช่วงเวลา:</span>
            <div className={styles.filterChips}>
                <div className={`${styles.filterChip} ${styles.filterChipActive}`}>30 วัน</div>
                <div className={styles.filterChip}>รายเดือน</div>
                <div className={styles.filterChip}>รายปี</div>
            </div>
        </div>

        {/* Mobile: dropdowns (hidden on desktop) */}
        <div className={styles.mobileDropdowns}>
            <select className={styles.mobileSelect} defaultValue="all">
                <option value="all">หมวดหมู่: ทั้งหมด</option>
                <option value="food">อาหาร</option>
                <option value="item">ของใช้</option>
            </select>
            <select className={styles.mobileSelect} defaultValue="30d">
                <option value="30d">ช่วงเวลา: 30 วัน</option>
                <option value="month">รายเดือน</option>
                <option value="year">รายปี</option>
            </select>
        </div>
    </div>
);

export const ReceiptTable = ({ loading, receipts = [] }: { loading?: boolean, receipts?: any[] }) => (
    <div className={styles.tableContainer}>
        <table className={styles.receiptTable}>
            <thead>
                <tr>
                    <th>ร้านค้า</th>
                    <th>หมวดหมู่</th>
                    <th>ยอดสุทธิ</th>
                    <th>สถานะ</th>
                    <th>วันที่</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                            <td colSpan={6} style={{ padding: '12px 0' }}>
                                <TableRowSkeleton />
                            </td>
                        </tr>
                    ))
                ) : (
                    receipts.map((receipt, index) => (
                        <tr key={receipt._id || receipt.id || index}>
                            <td className={styles.storeCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        overflow: 'hidden', flexShrink: 0,
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--input-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)',
                                    }}>
                                        {(() => {
                                            const raw = receipt.extractedData?.imageData || receipt.imageURL || receipt.imageUrl;
                                            if (!raw) return receipt.storeName?.charAt(0) || 'R';
                                            const src = raw.includes('storage.googleapis.com') ? '/api/gcs-image?url=' + encodeURIComponent(raw) : raw;
                                            return <img src={src} alt={receipt.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                        })()}
                                    </div>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                        {receipt.storeName || 'ไม่ระบุ'}
                                    </span>
                                </div>
                            </td>
                            <td>{receipt.extractedData?.category || 'ไม่ระบุ'}</td>
                            <td className={styles.amountCell}>฿ {(receipt.amount !== undefined ? receipt.amount : receipt.totalAmount)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                            <td>
                                <span className={!receipt.extractedData ? styles.statusWarning : styles.statusSuccess}>
                                    {!receipt.extractedData ? 'รอตรวจสอบ' : 'สำเร็จ'}
                                </span>
                            </td>
                            <td>
                                {receipt.extractedData?.date ? 
                                    new Date(receipt.extractedData.date).toLocaleDateString('th-TH') : 
                                    new Date(receipt.createdAt).toLocaleDateString('th-TH')}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
        {!loading && receipts.length === 0 && (
            <div className={styles.emptyState}>
                ไม่พบรายการใบเสร็จในขณะนี้
            </div>
        )}
        {loading && (
            <div className={styles.emptyState}>
                กำลังโหลด...
            </div>
        )}
    </div>
);

export const ExpenseChart = ({ receipts = [] }: { receipts?: any[] }) => {
    const [viewType, setViewType] = useState<'week' | 'month' | 'year'>('week');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // Reset hover index when switching views or selection parameters
    useEffect(() => {
        setHoveredIdx(null);
    }, [viewType, selectedMonth, selectedYear]);

    // Available years for selection (include current year and at least 3 previous years, plus any years present in receipts)
    const currentYearVal = new Date().getFullYear();
    const defaultYears = [currentYearVal, currentYearVal - 1, currentYearVal - 2, currentYearVal - 3];
    const receiptYears = receipts.map(r => {
        const dateStr = r.extractedData?.date || r.createdAt;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date(r.createdAt).getFullYear() : d.getFullYear();
    }).filter(y => !isNaN(y));

    const availableYears = Array.from(new Set([...defaultYears, ...receiptYears]));
    availableYears.sort((a, b) => b - a);

    const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // Define labels and compute amounts based on selected viewType
    let labels: string[] = [];
    let amounts: number[] = [];

    if (viewType === 'week') {
        labels = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
        amounts = [0, 0, 0, 0, 0, 0, 0];
        
        // Filter for current week (Mon-Sun)
        const now = new Date();
        const getStartOfWeek = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(date.setDate(diff));
            start.setHours(0, 0, 0, 0);
            return start;
        };
        const startOfWeek = getStartOfWeek(now);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Check if there is any data in the current week to decide if we fall back to general weekday trends
        let hasDataInCurrentWeek = false;
        receipts.forEach(receipt => {
            const amountVal = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
            if (amountVal) {
                const dateStr = receipt.extractedData?.date || receipt.createdAt;
                let date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    date = new Date(receipt.createdAt);
                }
                if (date >= startOfWeek && date <= endOfWeek) {
                    hasDataInCurrentWeek = true;
                }
            }
        });

        receipts.forEach(receipt => {
            const amountVal = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
            if (amountVal) {
                const dateStr = receipt.extractedData?.date || receipt.createdAt;
                let date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    date = new Date(receipt.createdAt);
                }
                
                if (!hasDataInCurrentWeek || (date >= startOfWeek && date <= endOfWeek)) {
                    let dayIndex = date.getDay() - 1;
                    if (dayIndex === -1) dayIndex = 6;
                    
                    if (dayIndex >= 0 && dayIndex < 7) {
                        amounts[dayIndex] += amountVal;
                    }
                }
            }
        });
    } else if (viewType === 'month') {
        labels = ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4', 'สัปดาห์ 5'];
        amounts = [0, 0, 0, 0, 0];
        
        receipts.forEach(receipt => {
            const amountVal = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
            if (amountVal) {
                const dateStr = receipt.extractedData?.date || receipt.createdAt;
                let date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    date = new Date(receipt.createdAt);
                }
                
                // Filter by selected month and current year
                const currentYear = new Date().getFullYear();
                if (date.getMonth() === selectedMonth && date.getFullYear() === currentYear) {
                    const dayOfMonth = date.getDate();
                    const weekIndex = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
                    if (weekIndex >= 0 && weekIndex < 5) {
                        amounts[weekIndex] += amountVal;
                    }
                }
            }
        });
    } else {
        labels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        amounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        
        receipts.forEach(receipt => {
            const amountVal = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
            if (amountVal) {
                const dateStr = receipt.extractedData?.date || receipt.createdAt;
                let date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    date = new Date(receipt.createdAt);
                }
                
                // Filter by selected year
                if (date.getFullYear() === selectedYear) {
                    const monthIndex = date.getMonth();
                    if (monthIndex >= 0 && monthIndex < 12) {
                        amounts[monthIndex] += amountVal;
                    }
                }
            }
        });
    }

    const maxAmount = Math.max(...amounts);

    // SVG coordinates calculation
    const paddingLeft = 45;
    const paddingRight = 25;
    const chartWidth = 500 - paddingLeft - paddingRight;
    const chartHeight = 140;
    const xCoords = labels.map((_, i) => paddingLeft + i * (chartWidth / (labels.length - 1)));
    const yCoords = amounts.map(amount => {
        if (maxAmount === 0) return 30 + chartHeight; // baseline if no data
        return 30 + chartHeight - (amount / maxAmount) * chartHeight;
    });

    // Build Bezier curve path string dynamically
    let pathD = '';
    let fillD = '';
    if (xCoords.length > 0) {
        pathD = `M ${xCoords[0]} ${yCoords[0]}`;
        for (let i = 0; i < xCoords.length - 1; i++) {
            const spacing = (xCoords[i + 1] - xCoords[i]) * 0.4;
            const cp1x = xCoords[i] + spacing;
            const cp1y = yCoords[i];
            const cp2x = xCoords[i + 1] - spacing;
            const cp2y = yCoords[i + 1];
            pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xCoords[i + 1]} ${yCoords[i + 1]}`;
        }
        fillD = `${pathD} L ${xCoords[xCoords.length - 1]} ${30 + chartHeight} L ${xCoords[0]} ${30 + chartHeight} Z`;
    }

    // Grid lines Y coordinates (0%, 25%, 50%, 75%, 100%)
    const gridLines = [0, 0.25, 0.5, 0.75, 1];

    return (
        <div className={styles.chartCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div className={styles.chartTitle}>แนวโน้มรายจ่าย ({viewType === 'week' ? 'รายสัปดาห์' : viewType === 'month' ? 'รายเดือน' : 'รายปี'})</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Segmented Chips */}
                    <div className={styles.filterChips} style={{ display: 'flex' }}>
                        <div 
                            className={`${styles.filterChip} ${viewType === 'week' ? styles.filterChipActive : ''}`}
                            onClick={() => setViewType('week')}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            สัปดาห์
                        </div>
                        <div 
                            className={`${styles.filterChip} ${viewType === 'month' ? styles.filterChipActive : ''}`}
                            onClick={() => setViewType('month')}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            เดือน
                        </div>
                        <div 
                            className={`${styles.filterChip} ${viewType === 'year' ? styles.filterChipActive : ''}`}
                            onClick={() => setViewType('year')}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            ปี
                        </div>
                    </div>

                    {/* Secondary Dropdown for Month */}
                    {viewType === 'month' && (
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className={styles.chartSelect}
                        >
                            {monthNames.map((name, index) => (
                                <option key={index} value={index}>{name}</option>
                            ))}
                        </select>
                    )}

                    {/* Secondary Dropdown for Year */}
                    {viewType === 'year' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className={styles.chartSelect}
                        >
                            {availableYears.map((year) => (
                                <option key={year} value={year}>พ.ศ. {year + 543}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '250px' }}>
                <svg viewBox="0 0 500 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <defs>
                        {/* Fill Gradient under line */}
                        <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                        {/* Stroke Gradient for the line */}
                        <linearGradient id="chartStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="50%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                        {/* Glow Filter */}
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Horizontal Grid lines with dynamic labels */}
                    {gridLines.map((ratio, idx) => {
                        const y = 30 + chartHeight - ratio * chartHeight;
                        const labelValue = maxAmount > 0 ? Math.round(ratio * maxAmount) : 0;
                        return (
                            <g key={idx}>
                                <line 
                                    x1={paddingLeft} 
                                    y1={y} 
                                    x2={500 - paddingRight} 
                                    y2={y} 
                                    stroke="#f1f5f9" 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4" 
                                />
                                <text 
                                    x={paddingLeft - 10} 
                                    y={y + 4} 
                                    fill="#94a3b8" 
                                    fontSize="9.5" 
                                    fontWeight="600"
                                    textAnchor="end"
                                >
                                    ฿{labelValue >= 1000 ? `${(labelValue / 1000).toFixed(1)}k` : labelValue}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area Fill */}
                    {fillD && <path d={fillD} fill="url(#chartFillGradient)" />}

                    {/* Line Stroke with Glow */}
                    {pathD && (
                        <>
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="#6366f1" 
                                strokeWidth="5" 
                                opacity="0.15" 
                                filter="url(#glow)" 
                                strokeLinecap="round" 
                            />
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="url(#chartStrokeGradient)" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                            />
                        </>
                    )}

                    {/* Interactive dots and hit targets */}
                    {xCoords.map((x, i) => {
                        const y = yCoords[i];
                        const isHovered = hoveredIdx === i;
                        return (
                            <g key={i}>
                                {/* Outer hover ring */}
                                <circle 
                                    cx={x} 
                                    cy={y} 
                                    r={isHovered ? 8 : 4} 
                                    fill="#ffffff" 
                                    stroke={isHovered ? "#4f46e5" : "#6366f1"} 
                                    strokeWidth={isHovered ? 3.5 : 2.5} 
                                    style={{ transition: 'all 0.15s ease-out' }}
                                />
                                {/* Hidden large hit target for easier mouse hover */}
                                <circle 
                                    cx={x} 
                                    cy={y} 
                                    r={viewType === 'year' ? 16 : 24} 
                                    fill="transparent" 
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredIdx(i)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                />
                            </g>
                        );
                    })}

                    {/* Day/Week/Month labels below the chart */}
                    {xCoords.map((x, i) => (
                        <text 
                            key={i} 
                            x={x} 
                            y={30 + chartHeight + 22} 
                            fill="#64748b" 
                            fontSize={viewType === 'year' ? "9" : "10.5"} 
                            fontWeight="700" 
                            textAnchor="middle"
                        >
                            {labels[i]}
                        </text>
                    ))}

                    {/* Tooltip Overlay */}
                    {hoveredIdx !== null && (
                        <g style={{ transition: 'all 0.15s' }}>
                            {/* Glow shadow behind tooltip */}
                            <rect
                                x={Math.max(50, Math.min(450, xCoords[hoveredIdx])) - 50}
                                y={yCoords[hoveredIdx] - 38}
                                width="100"
                                height="26"
                                rx="6"
                                fill="#0f172a"
                                opacity="0.15"
                                filter="url(#glow)"
                            />
                            {/* Main Tooltip box */}
                            <rect
                                x={Math.max(50, Math.min(450, xCoords[hoveredIdx])) - 50}
                                y={yCoords[hoveredIdx] - 38}
                                width="100"
                                height="26"
                                rx="6"
                                fill="#0f172a"
                            />
                            <text
                                x={Math.max(50, Math.min(450, xCoords[hoveredIdx]))}
                                y={yCoords[hoveredIdx] - 21}
                                fill="#ffffff"
                                fontSize="10.5"
                                fontWeight="800"
                                textAnchor="middle"
                            >
                                ฿{amounts[hoveredIdx].toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
};

export const RecentUploads = ({
    receipts = [],
    onReceiptClick,
    onEdit,
    onDelete,
}: {
    receipts?: any[];
    onReceiptClick?: (receipt: any) => void;
    onEdit?: (receipt: any) => void;
    onDelete?: (receipt: any) => void;
}) => {
    const recentReceipts = [...receipts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ปิด dropdown เมื่อคลิกนอกพื้นที่
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className={styles.recentCard}>
            <div className={styles.recentTitle}>รูปภาพจาก LINE</div>
            <div className={styles.uploadList} ref={menuRef}>
                {recentReceipts.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        ไม่มีรายการอัปโหลดล่าสุด
                    </div>
                ) : (
                    recentReceipts.map((receipt, index) => {
                        const imageData = receipt.extractedData?.imageData || ((receipt.imageURL || receipt.imageUrl) ? ((receipt.imageURL || receipt.imageUrl).includes('storage.googleapis.com') ? '/api/gcs-image?url=' + encodeURIComponent((receipt.imageURL || receipt.imageUrl)) : (receipt.imageURL || receipt.imageUrl)) : null);
                        const isMenuOpen = openMenuId === (receipt._id || receipt.id || '');
                        return (
                            <div
                                key={receipt._id || receipt.id || index}
                                className={styles.uploadItem}
                                onClick={() => onReceiptClick?.(receipt)}
                                style={{ cursor: onReceiptClick ? 'pointer' : 'default', transition: 'background 0.15s', position: 'relative' }}
                            >
                                {/* Thumbnail */}
                                <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                                    {imageData ? (
                                        <img src={imageData} alt="slip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className={styles.uploadInfo}>
                                    <div className={styles.uploadName}>{receipt.storeName || 'ไม่ระบุร้านค้า'}</div>
                                    <div className={styles.uploadDate}>
                                        {new Date(receipt.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} • {(receipt.amount !== undefined ? receipt.amount : receipt.totalAmount) ? `฿${(receipt.amount !== undefined ? receipt.amount : receipt.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '—'}
                                    </div>
                                </div>

                                {/* Three-dot menu button */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(isMenuOpen ? null : (receipt._id || receipt.id || ''));
                                        }}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            border: '1px solid transparent', background: 'transparent',
                                            color: '#9ca3af', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.05em',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                                            (e.currentTarget as HTMLButtonElement).style.color = '#374151';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isMenuOpen) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                                                (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                                            }
                                        }}
                                        title="ตัวเลือก"
                                    >
                                        ⋮
                                    </button>

                                    {/* Dropdown */}
                                    {isMenuOpen && (
                                        <div
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                position: 'absolute', right: 0, top: '32px', zIndex: 100,
                                                background: 'white', borderRadius: '10px',
                                                border: '1px solid #e5e7eb',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                minWidth: '140px', overflow: 'hidden',
                                            }}
                                        >
                                            {/* แก้ไข */}
                                            <button
                                                onClick={() => { setOpenMenuId(null); onEdit?.(receipt); }}
                                                style={{
                                                    width: '100%', padding: '10px 16px',
                                                    background: 'transparent', border: 'none',
                                                    textAlign: 'left', cursor: 'pointer',
                                                    fontSize: '0.875rem', fontWeight: '600', color: '#374151',
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                แก้ไข
                                            </button>

                                            {/* เส้นแบ่ง */}
                                            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 12px' }} />

                                            {/* ลบ */}
                                            <button
                                                onClick={() => { setOpenMenuId(null); onDelete?.(receipt); }}
                                                style={{
                                                    width: '100%', padding: '10px 16px',
                                                    background: 'transparent', border: 'none',
                                                    textAlign: 'left', cursor: 'pointer',
                                                    fontSize: '0.875rem', fontWeight: '600', color: '#ef4444',
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff1f2')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                ลบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {receipts.length > 0 && (
                <Link href="/line-receipts?tab=line" className={styles.viewAllButton} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                    ดูรายการทั้งหมด
                </Link>
            )}
        </div>
    );
};
