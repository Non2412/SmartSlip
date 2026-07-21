"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

import styles from './how-to-use.module.css';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CreateReceiptSheet from '@/components/CreateReceiptSheet';
import { useReceipts } from '@/hooks/useReceipts';
import { useSession } from 'next-auth/react';

export default function HowToUsePage() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { fetchReceipts } = useReceipts();
    const userId = session?.user?.id || 'guest';

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);
    
    const handleCreateNew = () => setShowCreateModal(true);
    const handleModalClose = () => setShowCreateModal(false);
    const handleModalSuccess = () => {
        const lineUserId = (session as any)?.lineUserId as string | undefined;
        fetchReceipts(userId, lineUserId);
    };

    const steps = [
        {
            id: 1,
            title: "การสมัครใช้งานและเข้าสู่ระบบ",
            description: "สมัครบัญชีผู้ใช้งานใหม่หรือเลือกเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านเพื่อเริ่มบันทึกประวัติค่าใช้จ่ายส่วนตัวได้อย่างปลอดภัย",
            icon: <UserIcon />,
            color: "#6366f1"
        },
        {
            id: 2,
            title: "การอัปโหลดใบเสร็จเข้าระบบ",
            description: "กดปุ่ม 'เพิ่มใบเสร็จ' เพื่ออัปโหลดไฟล์รูปภาพหรือ PDF โดยสามารถเลือกอัปโหลดทีละใบ กรอกข้อมูลเอง หรืออัปโหลดแบบกลุ่ม (Batch Upload) ได้พร้อมกันหลายรูป",
            icon: <UploadIcon />,
            color: "#10b981"
        },
        {
            id: 3,
            title: "การประมวลผลและยืนยันข้อมูล (OCR)",
            description: "ระบบ AI จะดึงข้อมูลจากใบเสร็จโดยอัตโนมัติ (ชื่อร้านค้า, วันเวลา, ยอดรวม, รายการสินค้า) ให้คุณตรวจสอบความถูกต้อง แก้ไขข้อมูล หรือเลือกหมวดหมู่ก่อนกดบันทึก",
            icon: <SearchIcon />,
            color: "#f59e0b"
        },
        {
            id: 4,
            title: "การวิเคราะห์สถิติรายจ่ายบนแดชบอร์ด",
            description: "ตรวจสอบสุขภาพทางการเงินได้ทันทีในหน้าแดชบอร์ด ดูสถิติสัดส่วนค่าใช้จ่ายรายสัปดาห์/รายเดือน/รายปีจำแนกตามหมวดหมู่ อาหาร, เดินทาง, ช้อปปิ้ง และอื่นๆ",
            icon: <ListIcon />,
            color: "#ec4899"
        },
        {
            id: 5,
            title: "ปรึกษาการเงินกับ SmartSlip AI",
            description: "เข้าเมนู 'คุยกับ AI' เพื่อเปิดห้องสนทนากับบอทผู้ช่วยส่วนตัว สามารถแบ่งเซสชันคุยแยกตามหัวข้อได้อิสระ เพื่อขอคำแนะนำในการลดและควบคุมรายจ่าย",
            icon: <ChatIcon />,
            color: "#8b5cf6"
        },
        {
            id: 6,
            title: "เชื่อมโยงความสะดวกด้วย LINE Bot",
            description: "แอดไลน์ออฟฟิเชียลของ SmartSlip แล้วส่งสลิปโอนเงินหรือใบเสร็จเข้าห้องแชทไลน์ได้ทันที บอทจะประมวลผลส่งข้อมูลเข้ามาจัดเก็บบนเว็บไซต์ให้อัตโนมัติ",
            icon: <LineIcon />,
            color: "#06b6d4"
        },
        {
            id: 7,
            title: "การจัดการและส่งออกข้อมูล (Export)",
            description: "เข้าเมนู 'ส่งออกข้อมูล' เพื่อดาวน์โหลดประวัติใบเสร็จรับเงินทั้งหมดของคุณออกมาเป็นไฟล์ตาราง CSV หรือ Excel นำไปประยุกต์ใช้งานต่อได้อย่างง่ายดาย",
            icon: <ExportIcon />,
            color: "#ef4444"
        }
    ];

    return (
        <div className="dashboard-layout">
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
                onClick={closeSidebar}
            />

            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                onAddReceipt={() => {
                  setShowCreateModal(true);
                  closeSidebar();
                }}
            />

            <main className="main-content">
                <TopBar
                    title="วิธีการใช้งาน"
                    onToggleSidebar={toggleSidebar}
                    onCreateNew={handleCreateNew}
                />


                <div className="page-container">
                    <div className={styles.heroSection}>
                        <h2 className={styles.heroTitle}>ระบบจัดการใบเสร็จอัจฉริยะด้วย OCR และ LINE Chat Bot</h2>
                        <p className={styles.heroSubtitle}>คู่มือเริ่มต้นการใช้งานระบบสำหรับผู้ใช้งานใหม่</p>
                    </div>

                    <div className={styles.stepsGrid}>
                        {steps.map((step) => (
                            <div key={step.id} className={styles.stepCard} style={{ '--accent-color': step.color } as React.CSSProperties}>
                                <div className={styles.stepHeader}>
                                    <div className={styles.iconWrapper}>
                                        {step.icon}
                                        <div className={styles.stepBadge}>{step.id}</div>
                                    </div>
                                    <h3 className={styles.stepTitle}>{step.title}</h3>
                                </div>
                                <p className={styles.stepDescription}>{step.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className={styles.noteSection}>
                        <div className={styles.noteIcon}>🔒</div>
                        <div className={styles.noteContent}>
                            <h4 className={styles.noteTitle}>หมายเหตุ</h4>
                            <ul className={styles.noteList}>
                                <li>รองรับไฟล์ภาพ เช่น JPG, PNG</li>
                                <li>ควรใช้ภาพที่ชัดเจนเพื่อความแม่นยำของ OCR</li>
                                <li>ข้อมูลทั้งหมดจะถูกเก็บอย่างปลอดภัย</li>
                            </ul>
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

const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const SaveIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
);
const ListIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
);
const LineIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
);
const LogoutIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
const ChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const ExportIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
