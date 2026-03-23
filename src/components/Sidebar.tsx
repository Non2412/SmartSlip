"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Link href="/">
          <img
            src="/logo.png"
            alt="SmartSlip AI"
            className={styles.logo}
          />
        </Link>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          To-do ของฉัน
        </div>
        <ul className={styles.navList}>
          <SidebarItem href="#" label="เช็กใบเสร็จที่เจอจากอีเมล" icon={<MailIcon />} />
          <SidebarItem href="#" label="Task ที่ต้องตรวจสอบ/จัดการ" icon={<TaskIcon />} />
        </ul>

        <div className={styles.navSection}>
          เมนูธุรกิจ
        </div>
        <ul className={styles.navList}>
          <SidebarItem href="/" active={pathname === '/'} label="รายการใบเสร็จ" icon={<ListIcon />} />
          <SidebarItem href="#" label="เพิ่มใบเสร็จ" icon={<UploadIcon />} />
          <SidebarItem href="#" label="Google Sheets" icon={<SheetsIcon />} isExternal />
          <SidebarItem href="#" label="Google Drive" icon={<DriveIcon />} isExternal />
        </ul>

        <div className={styles.navSection}>
          ช่วยเหลือ
        </div>
        <ul className={styles.navListNoMargin}>
          <SidebarItem
            href="/how-to-use"
            active={pathname === '/how-to-use'}
            label="วิธีการใช้งาน"
            icon={<HelpIcon />}
          />
        </ul>
      </nav>

      <div className={styles.userCard}>
        <div className={styles.userAvatar}>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          <div className={styles.statusIndicator}></div>
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>นพนันท์ เกษอินทร์</div>
          <div className={styles.userId}>1339200044447</div>
        </div>
        <button className={styles.logoutButton} title="ออกจากระบบ">
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
};

const SidebarItem = ({ href, label, icon, active = false, isExternal = false }: { href: string, label: string, icon: React.ReactNode, active?: boolean, isExternal?: boolean }) => (
  <li>
    <Link
      href={href}
      className={`${styles.sidebarLink} ${active ? styles.sidebarLinkActive : styles.sidebarLinkInactive}`}
    >
      <span className={`${styles.sidebarLinkIcon} ${active ? styles.sidebarLinkIconActive : ''}`}>
        {icon}
      </span>
      <span className={styles.sidebarLinkLabel}>{label}</span>
      {isExternal && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
      )}
    </Link>
  </li>
);

// Icons
function MailIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}

function TaskIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>;
}

function ListIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
}

function UploadIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}

function SheetsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>;
}

function DriveIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19L14.5 6H9.5L2 19H22Z" /><path d="M14.5 6L18 12.5L22 19H14.5L14.5 6Z" /><path d="M9.5 6L14.5 6L11.5 11L9.5 6Z" /></svg>;
}

function HelpIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

function LogoutIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

export default Sidebar;
