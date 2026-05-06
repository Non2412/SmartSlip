"use client";
import React, { useEffect, useState } from "react";
import styles from "./Profile.module.css";

export default function ProfileCard({ refreshTrigger }: { refreshTrigger?: number }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.error) {
          setData(resData);
        }
      })
      .catch(console.error);
  }, [refreshTrigger]);

  if (!data) return <div className={styles.card}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className={styles.card}>
      <h3>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ข้อมูลของฉัน
      </h3>
      <div className={styles.row}>
        <span>ชื่อ:</span>
        <strong>{data.name || "-"}</strong>
      </div>
      <div className={styles.row}>
        <span>บริษัท:</span>
        <strong>{data.company || "-"}</strong>
      </div>
      <div className={styles.row}>
        <span>อีเมล:</span>
        <strong>{data.email || "-"}</strong>
      </div>
      <div className={styles.row}>
        <span>เบอร์โทร:</span>
        <strong>{data.phone || "-"}</strong>
      </div>
      
      <button className={styles.button} style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', marginTop: '20px' }} onClick={() => window.print()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        พิมพ์ข้อมูล / PDF
      </button>
    </div>
  );
}
