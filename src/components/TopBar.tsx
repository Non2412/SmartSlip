'use client';

import React, { useState } from 'react';

const TopBar = ({ title, onCreateNew }: { title: string, onCreateNew?: () => void }) => {
    return (
        <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>

            <div className={styles.actions}>
                <div className={styles.searchContainer}>
                    <span className={styles.searchIconWrapper}>
                        <SearchIcon />
                    </span>
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
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '12px',
                        fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: 'none',
                        opacity: 0.9
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                >
                    <PlusIcon />
                    <span>สร้างใบเสร็จ</span>
                </button>
            </div>
        </header>
    );
};

const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);

export default TopBar;
