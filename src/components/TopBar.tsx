'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { cleanAndProxyImageUrl, activityLogApi } from '@/lib/apiClient';
import styles from './TopBar.module.css';

function useDarkMode() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('smartslip_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const dark = stored ? stored === 'dark' : prefersDark;
        setIsDark(dark);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, []);

    const toggle = () => {
        setIsDark(prev => {
            const next = !prev;
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
            localStorage.setItem('smartslip_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    return { isDark, toggle };
}

const DotsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
    </svg>
);

const TopBar = ({
    title,
    mobileTitle,
    onCreateNew,
    onToggleSidebar
}: {
    title: string,
    mobileTitle?: string,
    onCreateNew?: () => void,
    onToggleSidebar?: () => void
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const { receipts, fetchReceipts } = useReceipts();
    const { isDark, toggle: toggleDark } = useDarkMode();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [lastViewedTime, setLastViewedTime] = useState<string>('1970-01-01T00:00:00.000Z');
    const [hasOpenedDropdown, setHasOpenedDropdown] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setLastViewedTime(localStorage.getItem('smartslip_notifications_last_viewed') || '1970-01-01T00:00:00.000Z');
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
                setMobileMenuOpen(false);
            }
        };
        if (mobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    const fetchLogs = async (userId: string, lineUserId?: string) => {
        try {
            const res = await activityLogApi.getAll(userId, lineUserId);
            if (res.success && res.data) {
                setActivityLogs(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch activity logs in TopBar:', err);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
            fetchLogs(session.user.id, lineUserId);
        }
    }, [session, fetchReceipts]);

    useEffect(() => {
        if (isDropdownOpen && session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchLogs(session.user.id, lineUserId);
        }
    }, [isDropdownOpen, session]);

    const toggleDropdown = () => {
        if (!isDropdownOpen) {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('smartslip_notifications_last_viewed') || '1970-01-01T00:00:00.000Z';
                setLastViewedTime(stored);
            }
            setIsDropdownOpen(true);
            setHasOpenedDropdown(true);
            if (typeof window !== 'undefined') {
                localStorage.setItem('smartslip_notifications_last_viewed', new Date().toISOString());
            }
        } else {
            setIsDropdownOpen(false);
        }
    };

    const formatTimeAgoThai = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            if (diffMs < 0) return 'เมื่อครู่';
            
            const diffMins = Math.floor(diffMs / (60 * 1000));
            if (diffMins < 60) return `${diffMins || 1} นาที`;
            
            const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
            if (diffHours < 24) return `${diffHours} ชั่วโมง`;
            
            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
            if (diffDays === 1) return 'เมื่อวานนี้';
            if (diffDays < 7) return `${diffDays} วัน`;
            
            const diffWeeks = Math.floor(diffDays / 7);
            if (diffWeeks < 4) return `${diffWeeks} สัปดาห์`;
            
            return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        } catch {
            return 'ไม่ระบุเวลา';
        }
    };

    // Construct unified list
    const notificationItems: any[] = [];
    const loggedReceiptIds = new Set();

    activityLogs.forEach(log => {
        const correspondingReceipt = log.receiptId 
          ? receipts.find(r => r._id === log.receiptId || r.id === log.receiptId) 
          : null;
        
        let title = '';
        let details = log.details;
        let link = '/activity-logs';
        let imageUrl = '';
        let isPending = false;

        const isUserOrRoleUpdate = log.action === 'role_approved' || 
          log.action === 'role_rejected' || 
          log.action === 'role_update' || 
          log.action === 'user_update' || 
          (log.details && (log.details.includes('เปลี่ยนสิทธิ์') || log.details.includes('แก้ไขบัญชีผู้ใช้')));

        if (isUserOrRoleUpdate) {
            if (log.action === 'role_approved') {
                title = '🎉 อนุมัติสิทธิ์การใช้งาน';
            } else if (log.action === 'role_rejected') {
                title = '❌ ปฏิเสธคำร้องขอสิทธิ์';
            } else {
                title = '👤 อัปเดตสิทธิ์ / บัญชีผู้ใช้งาน';
            }
            link = '/profile';
        } else if (correspondingReceipt) {
            loggedReceiptIds.add(correspondingReceipt._id || correspondingReceipt.id);
            imageUrl = cleanAndProxyImageUrl(correspondingReceipt.imageUrl || correspondingReceipt.imageURL);
            isPending = correspondingReceipt.isPending || !correspondingReceipt.extractedData;
            
            if (isPending) {
                const isLine = correspondingReceipt.source === 'line' || correspondingReceipt.transactionId?.startsWith('LINE-');
                title = `ใบเสร็จรอตรวจสอบ • ${correspondingReceipt.storeName || 'ไม่ระบุร้านค้า'}`;
                if (isLine) {
                    title = `ใบเสร็จรอตรวจสอบ (จาก LINE) • ${correspondingReceipt.storeName || 'ไม่ระบุร้านค้า'}`;
                }
                const rawAmt = correspondingReceipt.amount !== undefined ? correspondingReceipt.amount : correspondingReceipt.totalAmount || 0;
                details = `ยอดเงิน ฿${parseFloat(rawAmt.toString()).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
                link = `/dashboard?openReceiptId=${correspondingReceipt._id || correspondingReceipt.id}`;
            } else {
                if (log.action === 'add') {
                    const isLine = correspondingReceipt.source === 'line' || correspondingReceipt.transactionId?.startsWith('LINE-');
                    title = isLine ? 'เพิ่มใบเสร็จใหม่ (จาก LINE)' : 'เพิ่มใบเสร็จใหม่';
                    link = `/dashboard?openReceiptId=${correspondingReceipt._id || correspondingReceipt.id}`;
                } else if (log.action === 'edit') {
                    title = 'แก้ไขใบเสร็จ';
                    link = `/dashboard?openReceiptId=${correspondingReceipt._id || correspondingReceipt.id}`;
                }
            }
        }

        if (!title) {
            switch (log.action) {
                case 'add':
                    title = 'เพิ่มใบเสร็จ';
                    break;
                case 'edit':
                    title = 'แก้ไขข้อมูล';
                    break;
                case 'delete':
                    title = 'ลบใบเสร็จ';
                    break;
                case 'export':
                    title = 'ส่งออกข้อมูล';
                    break;
                default:
                    title = 'การแจ้งเตือน';
            }
        }

        notificationItems.push({
            id: log.id || log._id || `log-${log.timestamp}`,
            action: log.action,
            title,
            details,
            timestamp: log.timestamp,
            link,
            imageUrl,
            isPending
        });
    });

    // Fallback: pending receipts that are not yet logged
    receipts.forEach(r => {
        const rId = r._id || r.id;
        if (!loggedReceiptIds.has(rId)) {
            const isPending = r.isPending || !r.extractedData;
            if (isPending) {
                const isLine = r.source === 'line' || r.transactionId?.startsWith('LINE-');
                let title = `ใบเสร็จรอตรวจสอบ • ${r.storeName || 'ไม่ระบุร้านค้า'}`;
                if (isLine) {
                    title = `ใบเสร็จรอตรวจสอบ (จาก LINE) • ${r.storeName || 'ไม่ระบุร้านค้า'}`;
                }
                const rawAmt = r.amount !== undefined ? r.amount : r.totalAmount || 0;
                const details = `ยอดเงิน ฿${parseFloat(rawAmt.toString()).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
                notificationItems.push({
                    id: `fallback-${rId}`,
                    action: 'add',
                    title,
                    details,
                    timestamp: r.createdAt,
                    link: `/dashboard?openReceiptId=${rId}`,
                    imageUrl: cleanAndProxyImageUrl(r.imageUrl || r.imageURL),
                    isPending: true
                });
            }
        }
    });

    // Sort by timestamp
    notificationItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate unread count (pending is always unread; others depend on lastViewedTime)
    const bellBadgeCount = hasOpenedDropdown ? 0 : notificationItems.filter(item => {
        if (item.isPending) return true;
        return new Date(item.timestamp).getTime() > new Date(lastViewedTime).getTime();
    }).length;

    // Filter by tab
    const displayedItems = activeTab === 'unread' 
        ? notificationItems.filter(item => item.isPending || (new Date(item.timestamp).getTime() > new Date(lastViewedTime).getTime()))
        : notificationItems;

    // Group by age
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const newItems: any[] = [];
    const todayItems: any[] = [];
    const earlierItems: any[] = [];

    displayedItems.forEach(item => {
        const date = new Date(item.timestamp);
        if (date >= twoHoursAgo) {
            newItems.push(item);
        } else if (date >= todayStart) {
            todayItems.push(item);
        } else {
            earlierItems.push(item);
        }
    });

    const renderDropdownItem = (item: any) => {
        const imgUrl = item.imageUrl;
        const timeAgo = formatTimeAgoThai(item.timestamp);
        const isUnread = item.isPending || (new Date(item.timestamp).getTime() > new Date(lastViewedTime).getTime());

        const getNotificationIcon = (action: string) => {
            switch (action) {
                case 'add':
                    return (
                        <div className={`${styles.itemIconCircle} ${styles.iconAdd}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </div>
                    );
                case 'edit':
                    return (
                        <div className={`${styles.itemIconCircle} ${styles.iconEdit}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </div>
                    );
                case 'delete':
                    return (
                        <div className={`${styles.itemIconCircle} ${styles.iconDelete}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </div>
                    );
                case 'export':
                    return (
                        <div className={`${styles.itemIconCircle} ${styles.iconExport}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </div>
                    );
                case 'role_approved':
                case 'role_update':
                case 'user_update':
                    return (
                        <div className={styles.itemIconCircle} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>👤</span>
                        </div>
                    );
                case 'role_rejected':
                    return (
                        <div className={styles.itemIconCircle} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>❌</span>
                        </div>
                    );
                default:
                    return (
                        <div className={styles.itemIconCircle} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>🔔</span>
                        </div>
                    );
            }
        };

        return (
            <Link
                key={item.id}
                href={item.link}
                className={`${styles.dropdownItem} ${isUnread ? styles.dropdownItemUnread : ''}`}
                onClick={() => setIsDropdownOpen(false)}
            >
                {imgUrl ? (
                    <div className={styles.itemImageWrapper}>
                        <Image
                            src={imgUrl}
                            alt={item.title}
                            fill
                            unoptimized
                            className={styles.itemImage}
                        />
                    </div>
                ) : (
                    getNotificationIcon(item.action)
                )}

                <div className={styles.itemContent}>
                    <p className={item.isPending ? styles.itemTitle : styles.itemTitle}>
                        {item.title}
                    </p>
                    <p className={styles.itemDetails}>
                        {item.details}
                    </p>
                    <span className={isUnread ? styles.itemTime : styles.itemTimeMuted}>
                        {timeAgo}
                    </span>
                </div>

                {isUnread && <div className={styles.itemIndicator} />}
            </Link>
        );
    };

    return (
        <>
            <header className={styles.header}>
                <div className={styles.leftSection}>
                    <button className={styles.menuButton} onClick={onToggleSidebar} aria-label="Toggle Sidebar">
                        <MenuIcon />
                    </button>
                    <h1 className={styles.title}>
                        {mobileTitle ? (
                            <>
                                <span className={styles.titleFull}>{title}</span>
                                <span className={styles.titleMobile}>{mobileTitle}</span>
                            </>
                        ) : (
                            title
                        )}
                    </h1>
                </div>

                <div className={styles.actions}>

                    <div className={styles.notificationWrapper} ref={dropdownRef}>
                        <button
                            className={styles.iconButton}
                            onClick={toggleDropdown}
                            title="การแจ้งเตือน"
                            aria-expanded={isDropdownOpen}
                        >
                            <BellIcon />
                            {bellBadgeCount > 0 && (
                                <span className={styles.notificationBadge}>{bellBadgeCount}</span>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <h3 className={styles.dropdownTitle}>การแจ้งเตือน</h3>
                                </div>

                                <div className={styles.dropdownTabs}>
                                    <button
                                        type="button"
                                        className={`${styles.tabButton} ${activeTab === 'all' ? styles.tabButtonActive : ''}`}
                                        onClick={() => setActiveTab('all')}
                                    >
                                        ทั้งหมด
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tabButton} ${activeTab === 'unread' ? styles.tabButtonActive : ''}`}
                                        onClick={() => setActiveTab('unread')}
                                    >
                                        ยังไม่ได้อ่าน
                                    </button>
                                </div>

                                <div className={styles.dropdownList}>
                                    {displayedItems.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p className={styles.emptyTitle}>ไม่มีการแจ้งเตือน</p>
                                            <p className={styles.emptySubtitle}>คุณได้ตรวจสอบข้อมูลใบเสร็จหมดเรียบร้อยแล้ว</p>
                                        </div>
                                    ) : (
                                        <>
                                            {newItems.length > 0 && (
                                                <>
                                                    <h4 className={styles.dropdownSectionTitle}>ใหม่</h4>
                                                    {newItems.map(item => renderDropdownItem(item))}
                                                </>
                                            )}

                                            {todayItems.length > 0 && (
                                                <>
                                                    <h4 className={styles.dropdownSectionTitle}>วันนี้</h4>
                                                    {todayItems.map(item => renderDropdownItem(item))}
                                                </>
                                            )}

                                            {earlierItems.length > 0 && (
                                                <>
                                                    <h4 className={styles.dropdownSectionTitle}>ก่อนหน้านี้</h4>
                                                    {earlierItems.map(item => renderDropdownItem(item))}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className={styles.darkModeButton}
                        onClick={toggleDark}
                        title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
                    >
                        {isDark ? <SunIcon /> : <MoonIcon />}
                    </button>

                    <Link
                        href="/export"
                        className={styles.exportButton}
                    >
                        <ExportIcon />
                        <span>ส่งออกข้อมูล</span>
                    </Link>

                    <button
                        onClick={onCreateNew}
                        className={styles.primaryButton}
                    >
                        <PlusIcon />
                        <span>สร้างใบเสร็จ</span>
                    </button>

                    {/* 3-dot menu — mobile only */}
                    <div className={styles.mobileMenuWrap} ref={mobileMenuRef}>
                        <button
                            className={styles.mobileMenuBtn}
                            onClick={() => setMobileMenuOpen(v => !v)}
                            aria-label="เมนูเพิ่มเติม"
                        >
                            <DotsIcon />
                        </button>
                        {mobileMenuOpen && (
                            <div className={styles.mobileDropdown}>
                                <button
                                    className={styles.mobileDropdownItem}
                                    onClick={() => { onCreateNew?.(); setMobileMenuOpen(false); }}
                                >
                                    <PlusIcon />
                                    <span>สร้างใบเสร็จ</span>
                                </button>
                                <button
                                    className={styles.mobileDropdownItem}
                                    onClick={() => { toggleDark(); setMobileMenuOpen(false); }}
                                >
                                    {isDark ? <SunIcon /> : <MoonIcon />}
                                    <span>{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.mobileDropdownItem}
                                    onClick={() => { 
                                        setMobileMenuOpen(false); 
                                        if (!isDropdownOpen) {
                                            toggleDropdown();
                                        }
                                    }}
                                >
                                    <BellIcon />
                                    <span>การแจ้งเตือน</span>
                                    {bellBadgeCount > 0 && (
                                        <span className={styles.dropdownBadge}>{bellBadgeCount}</span>
                                    )}
                                </button>
                                <Link
                                    href="/export"
                                    className={styles.mobileDropdownItem}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <ExportIcon />
                                    <span>ส่งออกข้อมูล</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

        </>
    );
};


const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const BellIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const PlusIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
const MenuIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);

const ExportIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
);

const MoonIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SunIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

export default TopBar;