'use client';

import React from 'react';
import styles from './TopBar.module.css';

const TopBar = ({ 
    title, 
    onCreateNew, 
    onToggleSidebar
}: { 
    title: string, 
    onCreateNew?: () => void,
    onToggleSidebar?: () => void
}) => {
    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                <button className={styles.menuButton} onClick={onToggleSidebar} aria-label="Toggle Sidebar">
                    <MenuIcon />
                </button>
                <h1 className={styles.title}>{title}</h1>
            </div>

            <div className={styles.actions}>
                <div className={styles.searchContainer}>
                    <div className={styles.searchIcon}>
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา..."
                        className={styles.searchInput}
                    />
                </div>

                <button className={styles.iconButton}>
                    <BellIcon />
                </button>

                <button
                    onClick={onCreateNew}
                    className={styles.primaryButton}
                >
                    <PlusIcon />
                    <span>สร้างใบเสร็จ</span>
                </button>
            </div>
        </header>
    );
};


const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const BellIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const PlusIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);

const MenuIcon = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);

export default TopBar;

