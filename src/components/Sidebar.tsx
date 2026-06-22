"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

import styles from './Sidebar.module.css';

interface SidebarProps {
  onAddReceipt?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ onAddReceipt, isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const count = parseInt(localStorage.getItem('smartslip_unread_count') || '0', 10);
        setUnreadCount(isNaN(count) ? 0 : count);
      } catch { setUnreadCount(0); }
    };
    update();
    window.addEventListener('smartslip_unread_update', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('smartslip_unread_update', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const userId = user?.id || 'guest';
  
  // Show LINE user info as primary account, fallback to current user
  const displayName = (session as any)?.lineUserName || user?.name || 'แขกผู้เข้าชม';
  const displayImage = (session as any)?.lineUserImage || user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

  // States for Contact Support Modal
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('แจ้งปัญหาการใช้งาน');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // Pre-fill user information when user is loaded
  useEffect(() => {
    if (user) {
      setContactName((session as any)?.lineUserName || user.name || '');
      setContactEmail(user.email || '');
    }
  }, [user, session]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setSubmitError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
          userId: user?.id,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setIsSubmitSuccess(true);
        setContactMessage('');
      } else {
        setSubmitError(result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err) {
      setSubmitError('เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeContactModal = () => {
    setIsContactOpen(false);
    setIsSubmitSuccess(false);
    setSubmitError(null);
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarActive : ''}`}>

      <div className={styles.logoContainer}>
        <Link href="/">
          <img
            src="/logo-dark.png"
            alt="SmartSlip AI"
            className={styles.logo}
          />
        </Link>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          เมนูธุรกิจ
        </div>
        <ul className={styles.navList}>
          <SidebarItem href="/dashboard" active={pathname === '/dashboard'} label="รายการใบเสร็จ" icon={<ListIcon />} />
          <SidebarItem href="/line-receipts" active={pathname === '/line-receipts'} label="รูปภาพ" icon={<ImageIcon />} badge={unreadCount} />
          <SidebarItem href="/export" active={pathname === '/export'} label="ส่งออกข้อมูล" icon={<ExportIcon />} />
          <SidebarItem href="#" label="เพิ่มใบเสร็จ" icon={<PlusIcon />} onClick={onAddReceipt} />
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
          <SidebarItem
            href="#"
            label="ติดต่อเรา"
            icon={<MailIcon />}
            onClick={() => {
              setIsContactOpen(true);
              if (onClose) onClose();
            }}
          />
        </ul>

        <div className={styles.navSpacer} />
      </nav>

      <div className={styles.userCard}>
        <div className={styles.userAvatar}>
          <img src={displayImage} alt="User" />
          <div className={styles.statusIndicator}></div>
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{displayName}</div>
          <div className={styles.userId}>{userId}</div>
        </div>
        <button
          className={styles.logoutButton}
          title="ออกจากระบบ"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogoutIcon />
        </button>
      </div>

      {/* Contact Support Modal */}
      {isContactOpen && (
        <div className={styles.modalOverlay} onClick={closeContactModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ติดต่อทีมงาน / แจ้งปัญหา
              </h3>
              <button className={styles.closeBtn} onClick={closeContactModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Direct email contact card */}
              <div className={styles.directContactBox}>
                <div className={styles.directContactIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </div>
                <div className={styles.directContactText}>
                  <span className={styles.directLabel}>อีเมลสำหรับติดต่อกลับ / ติดต่อโดยตรง</span>
                  <a href="mailto:sittiratlayer1150@gmail.com" className={styles.directEmail}>
                    sittiratlayer1150@gmail.com
                  </a>
                </div>
              </div>

              {isSubmitSuccess ? (
                <div className={styles.successWrapper}>
                  <div className={styles.successIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h4 className={styles.successTitle}>ส่งข้อความสำเร็จ!</h4>
                  <p className={styles.successText}>เราได้รับข้อความของคุณเรียบร้อยแล้ว ทีมงานจะรีบตรวจสอบและติดต่อกลับโดยเร็วที่สุด</p>
                  <button className={styles.submitBtn} onClick={closeContactModal}>ตกลง</button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>ชื่อผู้ติดต่อ</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)} 
                      placeholder="กรอกชื่อของคุณ"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>อีเมลติดต่อกลับ</label>
                    <input 
                      type="email" 
                      className={styles.formInput} 
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)} 
                      placeholder="example@email.com"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>หัวข้อเรื่อง</label>
                    <select 
                      className={styles.formSelect}
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="แจ้งปัญหาการใช้งาน">แจ้งปัญหาการใช้งาน</option>
                      <option value="ข้อเสนอแนะ">ข้อเสนอแนะ</option>
                      <option value="สอบถามทั่วไป">สอบถามทั่วไป</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>รายละเอียดข้อความ</label>
                    <textarea 
                      className={styles.formTextarea} 
                      value={contactMessage} 
                      onChange={(e) => setContactMessage(e.target.value)} 
                      placeholder="อธิบายรายละเอียดปัญหา หรือข้อความที่ต้องการติดต่อ..."
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  {submitError && <div className={styles.errorMessage}>{submitError}</div>}
                  
                  <div style={{ marginTop: '24px' }}>
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <svg style={{ animation: 'spin 1.5s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path></svg>
                          กำลังส่ง...
                        </>
                      ) : (
                        'ส่งข้อความ'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

const SidebarItem = ({
  href,
  label,
  icon,
  active = false,
  isExternal = false,
  onClick,
  badge = 0,
}: {
  href?: string,
  label: string,
  icon: React.ReactNode,
  active?: boolean,
  isExternal?: boolean,
  onClick?: () => void,
  badge?: number,
}) => {
  const content = (
    <>
      <span className={`${styles.sidebarLinkIcon} ${active ? styles.sidebarLinkIconActive : ''}`}>
        {icon}
      </span>
      <span className={styles.sidebarLinkLabel}>{label}</span>
      {badge > 0 && (
        <span style={{
          marginLeft: 'auto', minWidth: '20px', height: '20px',
          background: '#ef4444', color: 'white', borderRadius: '10px',
          fontSize: '0.7rem', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px', lineHeight: 1,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {isExternal && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
      )}
    </>
  );

  const className = `${styles.sidebarLink} ${active ? styles.sidebarLinkActive : styles.sidebarLinkInactive}`;

  if (onClick && (!href || href === '#')) {
    return (
      <li>
        <button
          onClick={onClick}
          className={className}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li>
      {isExternal ? (
        // Use plain <a> for external/redirect links to avoid Next.js RSC fetch + CORS issue
        <a
          href={href || '/'}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {content}
        </a>
      ) : (
        <Link
          href={href || '/'}
          className={className}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick();
            }
          }}
        >
          {content}
        </Link>
      )}
    </li>
  );
};

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

function PlusIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
}

function SheetsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>;
}

function HelpIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

function LogoutIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

function UserIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

function ImageIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
}

function ExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export default Sidebar;
