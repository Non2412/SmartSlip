import React from 'react';

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
      borderRight: '1px solid #ffffff10'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
        <div style={{ 
          width: '32px', height: '32px', backgroundColor: 'var(--primary-color)', 
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 'bold'
        }}>G</div>
        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>SmartReceipt</span>
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <SidebarItem active label="หน้าหลัก" icon={<HomeIcon />} />
          <SidebarItem label="รายการใบเสร็จ" icon={<ListIcon />} />
          <SidebarItem label="รายงานสรุป" icon={<ChartIcon />} />
          
          <div style={{ margin: '24px 8px 8px', fontSize: '0.75rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Settings
          </div>
          <SidebarItem label="ตั้งค่าระบบ" icon={<SettingsIcon />} />
        </ul>
      </nav>

      <div style={{ 
        marginTop: 'auto', padding: '12px', backgroundColor: '#ffffff0a', borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6366f1', overflow: 'hidden' }}>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>ศิริชัย พัฒนา</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PREMIUM ACCOUNT</div>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem = ({ label, icon, active = false }: { label: string, icon: React.ReactNode, active?: boolean }) => (
  <li>
    <a href="#" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      color: active ? 'white' : 'var(--sidebar-text)',
      backgroundColor: active ? 'var(--sidebar-item-active)' : 'transparent',
      transition: 'all 0.2s ease',
      fontSize: '0.925rem',
      fontWeight: active ? '600' : '500'
    }}>
      <span style={{ color: active ? 'var(--primary-color)' : 'inherit' }}>{icon}</span>
      {label}
    </a>
  </li>
);

// Minimal Icon Components
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
);
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default Sidebar;
