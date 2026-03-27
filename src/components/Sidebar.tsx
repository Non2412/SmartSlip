"use client"
import React from 'react';
import { signOut } from 'next-auth/react';

const Sidebar = () => {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      borderRight: '1px solid var(--border-color)'
    }}>
      <div style={{ marginBottom: '32px', padding: '0 8px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <img
          src="/logo.png"
          alt="SmartSlip AI"
          style={{ width: '160px', height: 'auto', display: 'block' }}
        />
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '0 8px 12px', fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8' }}>
          To-do ของฉัน
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          <SidebarItem label="เช็กใบเสร็จที่เจอจากอีเมล" icon={<MailIcon />} />
          <SidebarItem label="Task ที่ต้องตรวจสอบ/จัดการ" icon={<TaskIcon />} />
        </ul>

        <div style={{ padding: '0 8px 12px', fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8' }}>
          เมนูธุรกิจ
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <SidebarItem active label="รายการใบเสร็จ" icon={<ListIcon />} />
          <SidebarItem label="เพิ่มใบเสร็จ" icon={<UploadIcon />} />
          <SidebarItem label="Google Sheets" icon={<SheetsIcon />} isExternal />
          <SidebarItem label="Google Drive" icon={<DriveIcon />} isExternal />
        </ul>
      </nav>

      <div style={{
        marginTop: 'auto', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)'
      }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6366f1', overflow: 'hidden', position: 'relative' }}>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid white', borderRadius: '50%' }}></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)' }}>นพนันท์ เกษอินทร์</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>1339200044447</div>
        </div>
      </div>

      <div style={{
        marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px'
      }}>
        <SidebarItem 
          label="ออกจากระบบ" 
          icon={<LogoutIcon />} 
          onClick={() => signOut({ callbackUrl: '/login' })}
          danger
        />
      </div>
    </aside>
  );
};

const SidebarItem = ({ 
  label, 
  icon, 
  active = false, 
  isExternal = false, 
  onClick,
  danger = false
}: { 
  label: string, 
  icon: React.ReactNode, 
  active?: boolean, 
  isExternal?: boolean,
  onClick?: () => void,
  danger?: boolean
}) => (
  <li>
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        color: danger ? '#ef4444' : (active ? '#1e293b' : '#64748b'),
        backgroundColor: active ? '#f1f5f9' : 'transparent',
        transition: 'all 0.2s ease',
        fontSize: '0.9rem',
        fontWeight: active ? '700' : '500',
        textDecoration: 'none',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', color: danger ? '#ef4444' : (active ? '#475569' : 'inherit') }}>{icon}</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {isExternal && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
      )}
    </button>
  </li>
);

// Icons based on the image
const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);

const TaskIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);

const SheetsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
);

const DriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19L14.5 6H9.5L2 19H22Z" /><path d="M14.5 6L18 12.5L22 19H14.5L14.5 6Z" /><path d="M9.5 6L14.5 6L11.5 11L9.5 6Z" /></svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);

export default Sidebar;
