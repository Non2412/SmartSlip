'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';
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

    const pendingCount = receipts.filter(r => !r.extractedData).length;

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

                    <Link href="/notification" className={styles.iconButton} title="การแจ้งเตือน">
                        <BellIcon />
                        {pendingCount > 0 && (
                            <span className={styles.notificationBadge}>{pendingCount}</span>
                        )}
                    </Link>

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
                                <Link
                                    href="/notification"
                                    className={styles.mobileDropdownItem}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <BellIcon />
                                    <span>การแจ้งเตือน</span>
                                    {pendingCount > 0 && (
                                        <span className={styles.dropdownBadge}>{pendingCount}</span>
                                    )}
                                </Link>
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