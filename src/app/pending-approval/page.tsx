"use client";

import { signOut } from 'next-auth/react';
import React from 'react';

export default function PendingApprovalPage() {
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
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.08)',
        animation: 'fadeIn 0.6s ease-out',
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
        
        {/* Pending Clock Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
          color: '#f59e0b',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: '800',
          marginBottom: '16px',
          color: '#f8fafc',
          letterSpacing: '-0.025em'
        }}>
          อยู่ระหว่างรอการอนุมัติสิทธิ์
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          บัญชีของคุณได้รับการลงทะเบียนเข้าสู่ระบบเรียบร้อยแล้ว แต่เพื่อป้องกันผู้ไม่หวังดี (Scammer) และการแอบอ้างสิทธิ์ บัญชีของคุณจึงจำเป็นต้องได้รับการอนุมัติจากผู้ดูแลระบบ (Admin) ก่อนเริ่มใช้งาน
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
          <div style={{ fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>💡 ขั้นตอนถัดไป:</div>
          • กรุณาแจ้งผู้ดูแลระบบของคุณเพื่อขออนุมัติเปิดใช้งานบัญชี<br />
          • เมื่อได้รับการอนุมัติแล้ว คุณสามารถรีเฟรชหน้าจอนี้เพื่อเริ่มต้นใช้งานได้ทันที
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              marginBottom: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
            }}
          >
            🔄 รีเฟรชสถานะการอนุมัติ
          </button>
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              color: '#94a3b8',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
