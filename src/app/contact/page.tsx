"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import styles from './contact.module.css';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useSession } from 'next-auth/react';
import { useReceipts } from '@/hooks/useReceipts';

export default function ContactPage() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { fetchReceipts } = useReceipts();
    const userId = session?.user?.id || 'guest';
    const user = session?.user;

    useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

    const toggleSidebar = () => setIsSidebarOpen(v => !v);
    const closeSidebar = () => setIsSidebarOpen(false);
    const handleCreateNew = () => setShowCreateModal(true);
    const handleModalClose = () => setShowCreateModal(false);
    const handleModalSuccess = () => {
        const lineUserId = (session as any)?.lineUserId as string | undefined;
        fetchReceipts(userId, lineUserId);
    };

    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactSubject, setContactSubject] = useState('แจ้งปัญหาการใช้งาน');
    const [contactMessage, setContactMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            setContactName((session as any)?.lineUserName || user.name || '');
            setContactEmail(user.email || '');
        }
    }, [user, session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
            setSubmitError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: contactName,
                    email: contactEmail,
                    subject: contactSubject,
                    message: contactMessage,
                    userId: user?.id,
                }),
            });
            const result = await res.json();
            if (result.success) {
                setIsSubmitSuccess(true);
                setContactMessage('');
            } else {
                setSubmitError(result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
            }
        } catch {
            setSubmitError('เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="dashboard-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                onAddReceipt={() => { setShowCreateModal(true); closeSidebar(); }}
            />
            <main className="main-content">
                <TopBar
                    title="ติดต่อทีมงาน"
                    onToggleSidebar={toggleSidebar}
                    onCreateNew={handleCreateNew}
                />
                <div className="page-container">
                    <div className={styles.wrap}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    ติดต่อทีมงาน / แจ้งปัญหา
                                </h2>
                            </div>

                            <div className={styles.cardBody}>
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
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                        <h4 className={styles.successTitle}>ส่งข้อความสำเร็จ!</h4>
                                        <p className={styles.successText}>เราได้รับข้อความของคุณเรียบร้อยแล้ว ทีมงานจะรีบตรวจสอบและติดต่อกลับโดยเร็วที่สุด</p>
                                        <button className={styles.submitBtn} onClick={() => setIsSubmitSuccess(false)}>ตกลง</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>ชื่อผู้ติดต่อ</label>
                                            <input type="text" className={styles.formInput} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="กรอกชื่อของคุณ" disabled={isSubmitting} required />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>อีเมลติดต่อกลับ</label>
                                            <input type="email" className={styles.formInput} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="example@email.com" disabled={isSubmitting} required />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>หัวข้อเรื่อง</label>
                                            <select className={styles.formSelect} value={contactSubject} onChange={e => setContactSubject(e.target.value)} disabled={isSubmitting}>
                                                <option value="แจ้งปัญหาการใช้งาน">แจ้งปัญหาการใช้งาน</option>
                                                <option value="ข้อเสนอแนะ">ข้อเสนอแนะ</option>
                                                <option value="สอบถามทั่วไป">สอบถามทั่วไป</option>
                                                <option value="อื่นๆ">อื่นๆ</option>
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>รายละเอียดข้อความ</label>
                                            <textarea className={styles.formTextarea} value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="อธิบายรายละเอียดปัญหา หรือข้อความที่ต้องการติดต่อ..." disabled={isSubmitting} required />
                                        </div>
                                        {submitError && <div className={styles.errorMessage}>{submitError}</div>}
                                        <div style={{ marginTop: '20px' }}>
                                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                                {isSubmitting ? (
                                                    <>
                                                        <svg style={{ animation: 'spin 1.5s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" /></svg>
                                                        กำลังส่ง...
                                                    </>
                                                ) : 'ส่งข้อความ'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <CreateReceiptSheet
                isOpen={showCreateModal}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                userId={userId}
            />
        </div>
    );
}
