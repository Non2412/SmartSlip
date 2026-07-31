"use client";

import { signOut } from 'next-auth/react';
import React from 'react';

export default function RestrictedPage() {
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
          • ลองสลับเข้าสู่ระบบด้วยบัญชีอื่นที่มีสิทธิ์การใช้งานที่ถูกต้อง
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.3)';
            }}
          >
            ออกจากระบบและเปลี่ยนบัญชี
          </button>
        </div>
      </div>
    </div>
  );
}
