import React from 'react';

interface TopBarProps {
    title: string;
    onCreateReceipt: () => void;
}

const TopBar = ({ title, onCreateReceipt }: TopBarProps) => {
    return (
        <header style={{
            height: 'var(--header-height)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'transparent',
            marginTop: '12px',
            position: 'relative',
            zIndex: 10
        }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <SearchIcon />
                    </span>
                    <input
                        type="text"
                        placeholder="ค้นหา..."
                        style={{
                            padding: '10px 16px 10px 40px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            width: '280px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            backgroundColor: 'white'
                        }}
                    />
                </div>

                <button style={{
                    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)'
                }}>
                    <BellIcon />
                </button>

                <button
                    onClick={onCreateReceipt}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '12px',
                        fontWeight: '600', fontSize: '0.9rem', border: 'none', transition: 'filter 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
                    onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
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
