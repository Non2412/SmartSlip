"use client";
import React, { useState, useEffect } from "react";
import styles from "./Profile.module.css";

export default function ProfileForm({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm({
            name: data.name || "",
            company: data.company || "",
            email: data.email || "",
            phone: data.phone || "",
          });
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        if (onSaved) onSaved();
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className={styles.card}>กำลังโหลด...</div>;
  }

  return (
    <div className={styles.card}>
      <h3>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        แก้ไขข้อมูลของฉัน
      </h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>ชื่อ-นามสกุล</label>
          <input className={styles.input} name="name" placeholder="ชื่อ-นามสกุล" value={form.name} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>ชื่อบริษัท / ธุรกิจ</label>
          <input className={styles.input} name="company" placeholder="บริษัทจำกัด..." value={form.company} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>อีเมลติดต่อ</label>
          <input className={styles.input} name="email" type="email" placeholder="example@email.com" value={form.email} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>เบอร์โทรศัพท์</label>
          <input className={styles.input} name="phone" placeholder="08x-xxx-xxxx" value={form.phone} onChange={handleChange} />
        </div>
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
        </button>
      </form>
    </div>
  );
}
