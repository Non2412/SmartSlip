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
  const [budgets, setBudgets] = useState({
    food: 0,
    travel: 0,
    shopping: 0,
    other: 0,
    total: 0,
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
          if (data.budgets) {
            setBudgets({
              food: data.budgets.food || 0,
              travel: data.budgets.travel || 0,
              shopping: data.budgets.shopping || 0,
              other: data.budgets.other || 0,
              total: data.budgets.total || 0,
            });
          }
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setBudgets({ ...budgets, [e.target.name]: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, budgets }),
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

        <hr style={{ margin: '24px 0', border: 'none', borderTop: '1.5px dashed #cbd5e1' }} />

        <h3 style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
          เป้าหมายงบประมาณรายเดือน (บาท)
        </h3>

        <div className={styles.formGroup}>
          <label className={styles.label}>งบอาหาร (Food)</label>
          <input className={styles.input} type="number" name="food" min="0" placeholder="0" value={budgets.food || ""} onChange={handleBudgetChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>งบเดินทาง (Travel)</label>
          <input className={styles.input} type="number" name="travel" min="0" placeholder="0" value={budgets.travel || ""} onChange={handleBudgetChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>งบช้อปปิ้ง (Shopping)</label>
          <input className={styles.input} type="number" name="shopping" min="0" placeholder="0" value={budgets.shopping || ""} onChange={handleBudgetChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>งบอื่น ๆ (Other)</label>
          <input className={styles.input} type="number" name="other" min="0" placeholder="0" value={budgets.other || ""} onChange={handleBudgetChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>งบรวมทั้งหมด (Total Limit)</label>
          <input className={styles.input} type="number" name="total" min="0" placeholder="0" value={budgets.total || ""} onChange={handleBudgetChange} style={{ fontWeight: 'bold' }} />
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลทั้งหมด"}
        </button>
      </form>
    </div>
  );
}
