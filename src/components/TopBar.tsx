'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
import { cleanAndProxyImageUrl } from '@/lib/apiClient';
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

    useEffect(() => {
        if (session?.user?.id) {
            const lineUserId = (session as any)?.lineUserId as string | undefined;
            fetchReceipts(session.user.id, lineUserId);
        }
    }, [session, fetchReceipts]);

    const pendingCount = receipts.filter(r => r.isPending || !r.extractedData).length;

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const pendingReceipts = receipts.filter(r => r.isPending || !r.extractedData);
    const sortedReceipts = [...receipts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const displayedItems = activeTab === 'unread' ? pendingReceipts : sortedReceipts;

    const newItems: typeof receipts = [];
    const todayItems: typeof receipts = [];
    const earlierItems: typeof receipts = [];

    displayedItems.forEach(r => {
        const date = new Date(r.createdAt);
        if (date >= twoHoursAgo) {
            newItems.push(r);
        } else if (date >= todayStart) {
            todayItems.push(r);
        } else {
            earlierItems.push(r);
        }
    });

    const renderDropdownItem = (receipt: typeof receipts[0]) => {
        const id = receipt._id || receipt.id;
        const shopName = receipt.storeName || 'ไม่ระบุร้านค้า';
        const rawAmt = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount || 0;
        const amountText = `฿${parseFloat(rawAmt.toString()).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        const imgUrl = cleanAndProxyImageUrl(receipt.imageUrl || receipt.imageURL);
        const timeAgo = formatTimeAgoThai(receipt.createdAt);
        const isPending = receipt.isPending || !receipt.extractedData;

        return (
            <Link
                key={id}
                href={`/dashboard?openReceiptId=${id}`}
                className={styles.dropdownItem}
                onClick={() => setIsDropdownOpen(false)}
            >
                {imgUrl ? (
                    <div className={styles.itemImageWrapper}>
                        <Image
                            src={imgUrl}
                            alt={shopName}
                            fill
                            unoptimized
                            className={styles.itemImage}
                        />
                    </div>
                ) : (
                    <div className={styles.itemIconCircle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                )}

                <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>
                        ใบเสร็จรอตรวจสอบ • {shopName} ยอดเงิน {amountText}
                    </p>
                    <span className={isPending ? styles.itemTime : styles.itemTimeMuted}>
                        {timeAgo}
                    </span>
                </div>

                {isPending && <div className={styles.itemIndicator} />}
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
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            title="การแจ้งเตือน"
                            aria-expanded={isDropdownOpen}
                        >
                            <BellIcon />
                            {pendingCount > 0 && (
                                <span className={styles.notificationBadge}>{pendingCount}</span>
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
                                    onClick={() => { setMobileMenuOpen(false); setIsDropdownOpen(true); }}
                                >
                                    <BellIcon />
                                    <span>การแจ้งเตือน</span>
                                    {pendingCount > 0 && (
                                        <span className={styles.dropdownBadge}>{pendingCount}</span>
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