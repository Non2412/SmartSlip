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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");
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
          if (data.customCategories) {
            setCustomCategories(data.customCategories);
          }
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddCategory = () => {
    const input = newCatInput.trim();
    if (!input) return;

    const defaults = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ', 'ทั้งหมด'];
    if (defaults.includes(input) || customCategories.includes(input)) {
      alert("มีหมวดหมู่นี้อยู่แล้วครับ!");
      return;
    }

    setCustomCategories([...customCategories, input]);
    setNewCatInput("");
  };

  const handleRemoveCategory = (catName: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${catName}"?`)) {
      setCustomCategories(customCategories.filter(c => c !== catName));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, customCategories }),
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

        {/* Custom Categories section */}
        <h3 style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
          จัดการหมวดหมู่รายจ่ายของคุณ
        </h3>

        {customCategories.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {customCategories.map((cat, idx) => (
              <div key={idx} className={styles.customCategoryRow} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '100px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {cat}
                </div>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleRemoveCategory(cat)}
                  title={`ลบหมวดหมู่ ${cat}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Custom Category Row */}
        <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
          ➕ สร้างหมวดหมู่รายจ่ายใหม่
        </h4>
        <div className={styles.addCategoryRow} style={{ marginBottom: '24px' }}>
          <input
            className={styles.input}
            type="text"
            placeholder="ชื่อหมวดหมู่ เช่น ค่าไฟ, ท่องเที่ยว..."
            value={newCatInput}
            onChange={(e) => setNewCatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAddCategory}
          >
            สร้างหมวดหมู่
          </button>
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลทั้งหมด"}
        </button>
      </form>
    </div>
  );
}
