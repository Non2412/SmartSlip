"use client";

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import styles from './Advisor.module.css';

const CreateReceiptSheet = dynamic(() => import('@/components/CreateReceiptSheet'), { ssr: false });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

export default function AIAdvisorPage() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete_session' | 'clear_chat';
    sessionId?: string;
    sessionTitle?: string;
  }>({ isOpen: false, type: 'delete_session' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const createNewSession = (currentSessions: ChatSession[] = sessions) => {
    if (!session?.user?.id) return;
    const newSession: ChatSession = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'แชทใหม่',
      createdAt: Date.now(),
      messages: []
    };
    const updated = [newSession, ...currentSessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    localStorage.setItem(`smartslip_chat_sessions_${session.user.id}`, JSON.stringify(updated));
  };

  // Sync state with localStorage to persist chat history sessions
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const cachedSessions = localStorage.getItem(`smartslip_chat_sessions_${session.user.id}`);
      if (cachedSessions) {
        try {
          const parsed = JSON.parse(cachedSessions);
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
          } else {
            createNewSession(parsed);
          }
        } catch (e) {
          console.error('Error parsing cached sessions', e);
          createNewSession([]);
        }
      } else {
        createNewSession([]);
      }
    }
  }, [session]);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Close suggestions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSuggestionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const openCreateSheet = () => setIsCreateSheetOpen(true);
  const closeCreateSheet = () => setIsCreateSheetOpen(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !session?.user?.id || !activeSessionId) return;

    if (!textToSend) setInputText('');

    // Append user message
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        const updatedMsgs = [...s.messages, userMsg];
        const title = s.messages.length === 0 
          ? (text.substring(0, 24) + (text.length > 24 ? '...' : '')) 
          : s.title;
        return { ...s, title, messages: updatedMsgs };
      }
      return s;
    });

    setSessions(updatedSessions);
    localStorage.setItem(`smartslip_chat_sessions_${session.user.id}`, JSON.stringify(updatedSessions));
    setLoading(true);
    setError(null);

    try {
      const lineUserId = (session as any)?.lineUserId;
      const sessionToSend = updatedSessions.find(s => s.id === activeSessionId);
      const messagesToSend = sessionToSend ? sessionToSend.messages : [userMsg];

      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, lineUserId, messages: messagesToSend })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to generate chat response');
      }

      const replyText = resData.data;
      const assistantMsg: ChatMessage = { role: 'assistant', content: replyText };
      
      const finalSessions = updatedSessions.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, assistantMsg] };
        }
        return s;
      });

      setSessions(finalSessions);
      localStorage.setItem(`smartslip_chat_sessions_${session.user.id}`, JSON.stringify(finalSessions));
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสนทนากับ AI');
    } finally {
      setLoading(false);
    }
  };

  const promptDeleteSession = (e: React.MouseEvent, s: ChatSession) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'delete_session',
      sessionId: s.id,
      sessionTitle: s.title
    });
  };

  const promptClearChat = () => {
    setConfirmModal({
      isOpen: true,
      type: 'clear_chat',
      sessionId: activeSessionId || undefined,
      sessionTitle: activeSession?.title
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'delete_session' && confirmModal.sessionId) {
      const idToDelete = confirmModal.sessionId;
      const updated = sessions.filter(s => s.id !== idToDelete);
      setSessions(updated);
      if (session?.user?.id) {
        localStorage.setItem(`smartslip_chat_sessions_${session.user.id}`, JSON.stringify(updated));
      }
      
      if (activeSessionId === idToDelete) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
        } else {
          createNewSession(updated);
        }
      }
      showToast('ลบห้องสนทนาเรียบร้อยแล้ว', 'success');
    } else if (confirmModal.type === 'clear_chat') {
      const updated = sessions.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [] };
        }
        return s;
      });
      setSessions(updated);
      if (session?.user?.id) {
        localStorage.setItem(`smartslip_chat_sessions_${session.user.id}`, JSON.stringify(updated));
      }
      showToast('ล้างข้อความในห้องสนทนาเรียบร้อยแล้ว', 'info');
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSendMessage(suggestionText);
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

  const suggestionChips = [
    { text: '📊 วิเคราะห์รายจ่ายของฉันทั้งหมด', label: 'วิเคราะห์สุขภาพการเงิน' },
    { text: '💡 แนะนำ 5 วิธีประหยัดค่าเดินทางด่วน', label: 'วิธีลดค่าเดินทาง' },
    { text: '🛒 แนะนำการคุมรายจ่ายหมวดอาหาร', label: 'คุมงบอาหาร' },
    { text: '🛍️ แนะนำวิธีประหยัดค่าช้อปปิ้ง', label: 'คุมงบช้อปปิ้ง' },
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
              <h1 className={styles.title}>SmartSlip AI Chatbot</h1>
              <p className={`${styles.subtitle} ${styles.subtitleFull}`}>
                ปรึกษา วางแผน และสนทนาการเงินแบบเป็นกันเอง โดย AI อัจฉริยะจะอ้างอิงจากข้อมูลรายจ่ายจริงของคุณ
              </p>
              <p className={`${styles.subtitle} ${styles.subtitleShort}`}>
                ปรึกษาการเงินกับ AI อ้างอิงจากรายจ่ายจริงของคุณ
              </p>
            </div>

            <div className={styles.chatLayoutContainer}>
              {/* Chat History Sessions Sidebar */}
              <div className={styles.sessionsSidebar}>
                <div className={styles.sidebarHeader}>
                  <button onClick={() => createNewSession()} className={styles.newChatBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    สร้างแชทใหม่
                  </button>
                </div>
                <div className={styles.sessionsList}>
                  {sessions.map((s) => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`${styles.sessionItem} ${isActive ? styles.sessionItemActive : ''}`}
                      >
                        <div className={styles.sessionMeta}>
                          <span>💬</span>
                          <span className={styles.sessionTitle}>{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => promptDeleteSession(e, s)}
                          className={styles.sessionDeleteBtn}
                          title="ลบห้องสนทนานี้"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Chat Area */}
              <div className={styles.chatMainArea}>
                {/* Chat Panel Header */}
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderInfo}>
                    <div className={styles.statusIndicator}></div>
                    <h3>{activeSession?.title || 'ห้องสนทนากับ AI'}</h3>
                  </div>
                  {messages.length > 0 && (
                    <button onClick={promptClearChat} className={styles.clearBtn}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      ล้างข้อความ
                    </button>
                  )}
                </div>

                {/* Chat Message List */}
                <div className={styles.chatMessages}>
                  {messages.length === 0 ? (
                    // Initial welcome intro view
                    <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '440px', padding: '20px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                        สวัสดีครับ! ผมคือที่ปรึกษาการเงิน AI
                      </h3>
                      <p className={styles.welcomeSubtext} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                        พิมพ์ทักทายหรือเลือกหัวข้อแนะนำด้านล่างนี้ เพื่อเริ่มปรึกษาการเงิน แนะนำวิธีลดรายจ่าย หรือประเมินพฤติกรรมการจ่ายเงินจริงของคุณได้ทันทีครับ
                      </p>
                    </div>
                  ) : (
                    // Render active messages list
                    messages.map((msg, index) => {
                      const isAi = msg.role === 'assistant';
                      return (
                        <div key={index} className={`${styles.messageRow} ${isAi ? styles.messageRowAi : styles.messageRowUser}`}>
                          {isAi && (
                            <div className={styles.avatarWrapper} style={{ overflow: 'visible', background: 'none', border: 'none', padding: 0 }}>
                              <img
                                src="/BOT.png"
                                alt="SmartSlip AI"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          )}
                          <div 
                            className={`${styles.messageBubble} ${isAi ? styles.aiBubble : styles.userBubble}`}
                            dangerouslySetInnerHTML={{ __html: isAi ? parseMarkdownToHtml(msg.content) : msg.content }}
                          />
                        </div>
                      );
                    })
                  )}

                  {/* Loading typing bubble */}
                  {loading && (
                    <div className={`${styles.messageRow} ${styles.messageRowAi}`}>
                      <div className={styles.avatarWrapper} style={{ overflow: 'visible', background: 'none', border: 'none', padding: 0 }}>
                        <img
                          src="/BOT.png"
                          alt="SmartSlip AI"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div className={`${styles.messageBubble} ${styles.aiBubble}`} style={{ padding: '8px 12px' }}>
                        <div className={styles.typingBubble}>
                          <div className={styles.typingDot}></div>
                          <div className={styles.typingDot}></div>
                          <div className={styles.typingDot}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {error && (
                    <div style={{
                      padding: '12px 18px', borderRadius: '12px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444', fontSize: '0.85rem', fontWeight: '600',
                      display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content'
                    }}>
                      <span>⚠️</span>
                      <div>{error}</div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className={styles.chatInputForm}
                  style={{ position: 'relative' }}
                >
                  {/* Vertical Three Dot Suggestion Button */}
                  <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowSuggestionsMenu(!showSuggestionsMenu)}
                      className={styles.menuBtn}
                      title="หัวข้อแนะนำ"
                      disabled={loading}
                    >
                      ⋮
                    </button>

                    {showSuggestionsMenu && (
                      <div className={styles.suggestionsDropdown}>
                        <div className={styles.dropdownHeader}>หัวข้อสนทนาแนะนำ</div>
                        {suggestionChips.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleSuggestionClick(chip.text);
                              setShowSuggestionsMenu(false);
                            }}
                            className={styles.dropdownItem}
                          >
                            <span>{chip.text.split(' ')[0]}</span>
                            <span>{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="พิมพ์คุยปรึกษาหรือถามเรื่องเงิน..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className={styles.chatInput}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className={styles.sendBtn}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'rotate(45deg) translate(-1px, 1px)' }}>
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateReceiptSheet
        isOpen={isCreateSheetOpen}
        onClose={closeCreateSheet}
        userId={session?.user?.id || 'user123'}
      />

      {/* Confirmation Modal for Delete Session / Clear Chat */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '20px',
              padding: '28px 24px',
              width: 'min(420px, 92vw)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              animation: 'advisorModalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes advisorModalFadeIn {
                from { opacity: 0; transform: scale(0.93) translateY(8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}} />
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#ef4444'
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: '0 0 8px' }}>
              {confirmModal.type === 'delete_session' ? 'ยืนยันการลบห้องสนทนา' : 'ยืนยันการล้างข้อความ'}
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #64748b)', margin: '0 0 24px', lineHeight: 1.55 }}>
              {confirmModal.type === 'delete_session' ? (
                <>คุณแน่ใจหรือไม่ว่าต้องการลบห้องสนทนา <strong style={{ color: 'var(--text-main)' }}>"{confirmModal.sessionTitle || 'แชทนี้'}"</strong> ? ข้อมูลข้อความทั้งหมดจะไม่สามารถกู้คืนได้</>
              ) : (
                <>คุณแน่ใจหรือไม่ว่าต้องการล้างข้อความทั้งหมดในห้องสนทนานี้? ข้อความจะถูกลบถาวร</>
              )}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'transparent',
                  color: 'var(--text-main, #334155)',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                {confirmModal.type === 'delete_session' ? 'ลบห้องสนทนา' : 'ล้างข้อความ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
