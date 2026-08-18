"use client";

import { signOut, useSession } from 'next-auth/react';
import React, { useState } from 'react';

export default function RestrictedPage() {
  const { update } = useSession();
  const [isReapplying, setIsReapplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleReapply = async () => {
    setIsReapplying(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/user/reapply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('ยื่นเรื่องสำเร็จ! กำลังพาท่านไปหน้าตั้งค่าโปรไฟล์...');
        await update();
        setTimeout(() => {
          window.location.href = '/profile?force=true';
        }, 1500);
      } else {
        setErrorMsg(data.error || 'เกิดข้อผิดพลาดในการส่งคำขอใหม่');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsReapplying(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      color: '#f8fafc',
      fontFamily: 'var(--font-anuphan), sans-serif',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1)',
        animation: 'fadeIn 0.6s ease-out',
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
        
        {/* Warning Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
          color: '#ef4444',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: '800',
          marginBottom: '16px',
          color: '#f8fafc',
          letterSpacing: '-0.025em'
        }}>
          บัญชีของคุณถูกระงับสิทธิ์การใช้งาน
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          ระบบผู้ดูแลระบบตรวจพบพฤติกรรมบางอย่าง หรือบัญชีของคุณได้รับการปรับปรุงสถานะเป็น <strong style={{ color: '#ef4444' }}>Restricted</strong> ส่งผลให้ไม่สามารถเข้าถึงหน้า Dashboard หรือใช้งานระบบได้ในขณะนี้
        </p>

        <div style={{
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.85rem',
          color: '#cbd5e1',
          lineHeight: '1.5',
          textAlign: 'left',
          marginBottom: '36px'
        }}>
          <div style={{ fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>💡 สิ่งที่คุณสามารถทำได้:</div>
          • ตรวจสอบสิทธิ์กับผู้บริหารหรือผู้ดูแลระบบ<br />
          • กดปุ่มด้านล่างเพื่อแก้ไขข้อมูล/ยื่นคำร้องขอสิทธิ์ใหม่อีกครั้ง<br />
          • ลองสลับเข้าสู่ระบบด้วยบัญชีอื่นที่มีสิทธิ์การใช้งานที่ถูกต้อง
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '12px',
            color: '#4ade80',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            ✅ {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleReapply}
            disabled={isReapplying}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: isReapplying ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              if (!isReapplying) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!isReapplying) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.3)';
              }
            }}
          >
            {isReapplying ? '⌛ กำลังส่งคำขอ...' : '📝 แก้ไขข้อมูลและขอสิทธิ์การใช้งานใหม่'}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#f8fafc';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            ออกจากระบบและเปลี่ยนบัญชี
          </button>
        </div>
      </div>
    </div>
  );
}
