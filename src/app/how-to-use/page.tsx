import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import styles from './how-to-use.module.css';

export default function HowToUsePage() {
    const steps = [
        {
            id: 1,
            title: "การสมัครสมาชิกและเข้าสู่ระบบ",
            description: "ผู้ใช้งานเข้าสู่หน้าเว็บไซต์ กดปุ่ม สมัครสมาชิก (Register) กรอกข้อมูล เช่น ชื่อ, อีเมล, รหัสผ่าน เมื่อสมัครสำเร็จ ให้เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน",
            icon: <UserIcon />,
            color: "#6366f1"
        },
        {
            id: 2,
            title: "การอัปโหลดใบเสร็จ",
            description: "ไปที่เมนู อัปโหลดใบเสร็จ เลือกรูปภาพใบเสร็จจากอุปกรณ์ กดปุ่ม อัปโหลด ระบบจะทำการประมวลผลด้วย OCR เพื่อดึงข้อมูลจากภาพ",
            icon: <UploadIcon />,
            color: "#10b981"
        },
        {
            id: 3,
            title: "การตรวจสอบและแก้ไขข้อมูล",
            description: "หลังจาก OCR ประมวลผล ระบบจะแสดงข้อมูล เช่น ชื่อร้านค้า วันที่ จำนวนเงิน ผู้ใช้สามารถตรวจสอบความถูกต้อง หากข้อมูลผิด สามารถแก้ไขได้ก่อนบันทึก",
            icon: <SearchIcon />,
            color: "#f59e0b"
        },
        {
            id: 4,
            title: "การบันทึกและจัดเก็บข้อมูล",
            description: "เมื่อข้อมูลถูกต้องแล้ว กดปุ่ม บันทึกข้อมูล ระบบจะจัดเก็บข้อมูลลงฐานข้อมูล สามารถเรียกดูย้อนหลังได้ในเมนู รายการใบเสร็จ",
            icon: <SaveIcon />,
            color: "#ec4899"
        },
        {
            id: 5,
            title: "การค้นหาและจัดการใบเสร็จ",
            description: "ไปที่เมนู รายการใบเสร็จ ใช้ช่องค้นหา เช่น ค้นหาตามวันที่ ค้นหาตามชื่อร้าน สามารถแก้ไขหรือลบรายการได้",
            icon: <ListIcon />,
            color: "#8b5cf6"
        },
        {
            id: 6,
            title: "การใช้งานผ่าน LINE Chat Bot",
            description: "เพิ่มเพื่อน LINE Official Account ของระบบ ส่งรูปใบเสร็จผ่าน LINE ระบบจะประมวลผล OCR อัตโนมัติ ข้อมูลจะถูกส่งไปยังเว็บไซต์และบันทึกทันที",
            icon: <LineIcon />,
            color: "#06b6d4"
        },
        {
            id: 7,
            title: "การออกจากระบบ",
            description: "กดปุ่ม ออกจากระบบ (Logout) ระบบจะนำผู้ใช้ออกจากบัญชีเพื่อความปลอดภัย",
            icon: <LogoutIcon />,
            color: "#ef4444"
        }
    ];

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <main className="main-content">
                <TopBar title="วิธีการใช้งาน" />

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
