'use client';

import React, { useEffect, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';

export const StatCard = ({ title, value, subValue, trend, status }: { title: string, value: string, subValue?: string, trend?: string, status?: string }) => (
    <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        flex: 1,
        minWidth: '240px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)'
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
            </div>
            {trend && (
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '99px' }}>
                    {trend}
                </span>
            )}
            {status && (
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '99px' }}>
                    {status}
                </span>
            )}
        </div>
        <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
            {subValue && <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '4px' }}>{subValue}</div>}
        </div>
    </div>
);

export const ExpenseChart = () => (
    <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        flex: 2,
        minHeight: '400px'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>แนวโน้มค่าใช้จ่าย</h3>
            <select style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option>7 วันล่าสุด</option>
                <option>30 วันล่าสุด</option>
            </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '250px', paddingBottom: '20px' }}>
            {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{
                        width: '60%',
                        height: `${height * 2.5}px`,
                        backgroundColor: i === 6 ? 'var(--primary-color)' : '#f1f5f9',
                        borderRadius: '6px',
                        transition: 'all 0.3s ease'
                    }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                </div>
            ))}
        </div>
    </div>
);

export const RecentUploads = ({ userId }: { userId?: string }) => {
    const { receipts, loading, fetchReceipts } = useReceipts();

    useEffect(() => {
        fetchReceipts(userId);
    }, [userId, fetchReceipts]);

    // แสดงเพียง 3 รายการล่าสุด
    const recentReceipts = receipts.slice(0, 3);

    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            flex: 1,
            minWidth: '320px'
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px' }}>อัปโหลดล่าสุด</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        ⏳ กำลังโหลด...
                    </div>
                ) : recentReceipts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        ยังไม่มีรายการอัพโหลด
                    </div>
                ) : (
                    recentReceipts.map((receipt) => (
                        <UploadItem
                            key={receipt.id}
                            name={receipt.storeName}
                            status="เสร็จสิ้น"
                            completed
                            icon="#10b981"
                        />
                    ))
                )}
            </div>
            <button style={{
                width: '100%', padding: '12px', marginTop: '24px', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'var(--primary-color)', fontWeight: '600', fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}>
                ดูประวัติทั้งหมด
            </button>
        </div>
    );
};

const UploadItem = ({ name, status, completed = false, icon }: { name: string, status: string, completed?: boolean, icon: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
        <div style={{
            width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: icon
        }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{name}</div>
            <div style={{ fontSize: '0.75rem', color: completed ? '#10b981' : 'var(--text-muted)' }}>{status}</div>
        </div>
        {completed ? (
            <div style={{ color: '#10b981' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
        ) : (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
        )}
    </div>
);
