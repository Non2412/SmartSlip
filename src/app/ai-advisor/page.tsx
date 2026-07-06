"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './Advisor.module.css';

const CreateReceiptSheet = dynamic(() => import('@/components/CreateReceiptSheet'), { ssr: false });

export default function AIAdvisorPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState(0);

  // Sync state with localStorage to persist advisor analysis
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const cachedReport = localStorage.getItem(`smartslip_ai_report_${session.user.id}`);
      const cachedTime = localStorage.getItem(`smartslip_ai_report_time_${session.user.id}`);
      if (cachedReport) {
        setAiReport(cachedReport);
      }
      if (cachedTime) {
        setLastUpdated(cachedTime);
      }
    }
  }, [session]);

  // Loading status text cycles
  useEffect(() => {
    if (!loading) return;
    const steps = [
      'กำลังรวบรวมและวิเคราะห์ข้อมูลรายจ่ายจากสลิปของคุณ...',
      'กำลังส่งข้อมูลให้ที่ปรึกษาการเงินอัจฉริยะ (Gemini AI)...',
      'ที่ปรึกษา AI กำลังประเมินและวิเคราะห์จุดรั่วไหลทางการเงิน...',
      'กำลังจัดเตรียมเคล็ดลับการออมเงินและตั้งค่าชาเลนจ์เฉพาะคุณ...',
      'กำลังสรุปรายงานในไม่ช้า กรุณารอสักครู่...'
    ];

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % steps.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [loading]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleRequestAnalysis = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setLoadingStep(0);
    setError(null);

    try {
      const lineUserId = (session as any)?.lineUserId;
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, lineUserId })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to generate financial analysis');
      }

      const reportText = resData.data;
      const timeString = new Date().toLocaleString('th-TH');

      setAiReport(reportText);
      setLastUpdated(timeString);

      // Save to localStorage
      localStorage.setItem(`smartslip_ai_report_${session.user.id}`, reportText);
      localStorage.setItem(`smartslip_ai_report_time_${session.user.id}`, timeString);
    } catch (err: any) {
      console.error('Request AI Advisor Error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการขอข้อมูลคำแนะนำการเงินจาก AI');
    } finally {
      setLoading(false);
    }
  };

  // Simple and safe helper function to parse Gemini Markdown output into HTML
  const parseMarkdownToHtml = (md: string) => {
    if (!md) return '';
    
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings (H2)
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');

    // Headings (H3)
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

    // Blockquotes
    html = html.replace(/^&gt; (.*?)$/gm, '<blockquote>$1</blockquote>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet lists
    html = html.replace(/^[-\*] (.*?)$/gm, '<li>$1</li>');

    // Paragraph split (by double newlines)
    const segments = html.split(/\n\n+/);
    const parsed = segments.map(seg => {
      const trimmed = seg.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    return parsed;
  };

  const stepsText = [
    'กำลังรวบรวมและวิเคราะห์ข้อมูลรายจ่ายจากสลิปของคุณ...',
    'กำลังส่งข้อมูลให้ที่ปรึกษาการเงินอัจฉริยะ (Gemini AI)...',
    'ที่ปรึกษา AI กำลังประเมินและวิเคราะห์จุดรั่วไหลทางการเงิน...',
    'กำลังจัดเตรียมเคล็ดลับการออมเงินและตั้งค่าชาเลนจ์เฉพาะคุณ...',
    'กำลังสรุปรายงานในไม่ช้า กรุณารอสักครู่...'
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
        onAddReceipt={openCreateSheet}
      />

      <main className="main-content">
        <TopBar
          title="ที่ปรึกษาการเงิน (AI)"
          onToggleSidebar={toggleSidebar}
          onCreateNew={openCreateSheet}
        />

        <div className="page-container">
          <div className={styles.container}>
            <div className={styles.headerSection}>
              <h1 className={styles.title}>ที่ปรึกษาทางการเงินอัจฉริยะ</h1>
              <p className={styles.subtitle}>
                ให้ AI สแกนข้อมูลสถิติรายจ่ายจากสลิปและใบเสร็จของคุณ เพื่อช่วยให้คุณควบคุมการเงินได้ดีและมีเงินเก็บมากขึ้น
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.advisorIntro}>
                <div className={styles.aiAvatarWrapper}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H9" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <circle cx="9" cy="13" r="1" />
                    <circle cx="15" cy="13" r="1" />
                    <path d="M9 17h6" />
                  </svg>
                </div>
                <div className={styles.introText}>
                  <h3>สวัสดีครับ! ผมคือที่ปรึกษาการเงิน SmartSlip AI</h3>
                  <p>
                    ผมสามารถช่วยสแกนรายจ่ายรวมแยกตามหมวดหมู่ ตรวจพฤติกรรมการจ่ายเงินที่ซ้ำซาก หรือรายจ่ายก้อนใหญ่ที่เป็นจุดรั่วไหล 
                    พร้อมให้คำแนะนำ 5 ข้อย่อย และชาเลนจ์ท้าทายให้คุณออมเงินได้สำเร็จในเดือนนี้
                  </p>
                </div>
                <div>
                  <button 
                    onClick={handleRequestAnalysis} 
                    className={styles.actionButton}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    {aiReport ? 'วิเคราะห์การเงินใหม่อีกครั้ง' : 'เริ่มต้นวิเคราะห์การเงิน'}
                  </button>
                </div>
              </div>

              {loading && (
                <div className={styles.loadingSection}>
                  <div className={styles.spinner}></div>
                  <div className={styles.loadingText}>{stepsText[loadingStep]}</div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '16px 20px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontSize: '0.9rem', fontWeight: '600',
                  marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <span>⚠️</span>
                  <div>{error}</div>
                </div>
              )}

              {aiReport && !loading && (
                <div className={styles.reportContainer}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(aiReport) }}
                  />
                  
                  {lastUpdated && (
                    <div className={styles.reportFooter}>
                      <span className={styles.timestamp}>วิเคราะห์ล่าสุดเมื่อ: {lastUpdated}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        userId={session?.user?.id || 'user123'}
      />
    </div>
  );
}
