"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styles from "./Profile.module.css";
import { useToast } from "./Toast";

export default function ProfileForm({ onSaved }: { onSaved?: () => void }) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    citizenId: "",
  });
  const [phoneCode, setPhoneCode] = useState("+66");
  const [phoneNumberOnly, setPhoneNumberOnly] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isForced, setIsForced] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("force") === "true") {
        setIsForced(true);
      }
    }
  }, []);

  const isSessionNotCompleted = session?.user && (session.user as any).role === "user" && (session as any).isProfileCompleted === false;
  const isForcedView = isForced || isSessionNotCompleted;

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm({
            name: data.name || "",
            company: data.company || "",
            email: data.email || "",
            citizenId: data.citizenId || "",
          });

          const phoneVal = data.phone || "";
          if (phoneVal.startsWith("+66")) {
            setPhoneCode("+66");
            setPhoneNumberOnly(phoneVal.replace("+66", "").trim());
          } else {
            setPhoneCode("+66");
            setPhoneNumberOnly(phoneVal);
          }

          if (data.customCategories) {
            setCustomCategories(data.customCategories);
          }
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error as soon as user starts editing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        return value.trim() ? '' : 'กรุณากรอกชื่อ-นามสกุล';
      case 'company':
        return value.trim() ? '' : 'กรุณากรอกชื่อบริษัท / ที่ทำงาน';
      case 'email':
        if (!value.trim()) return 'กรุณากรอกอีเมลติดต่อ';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
        return '';
      case 'citizenId': {
        const clean = value.replace(/-/g, '').trim();
        if (!clean) return 'กรุณากรอกเลขประจำตัวประชาชน';
        if (clean.length < 13) return `กรอกแล้ว ${clean.length}/13 หลัก`;
        if (!validateCitizenId(value)) return 'เลขประจำตัวประชาชนไม่ถูกต้องตามหลักโครงสร้าง';
        return '';
      }
      default:
        return '';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    // citizenId input shows a masked value — validate against the real stored value
    const realValue = name === 'citizenId' ? form.citizenId : value;
    const err = validateField(name, realValue);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumberOnly(val);
    if (touched['phone']) {
      const clean = val.replace(/[^\d]/g, '');
      if (!val.trim()) {
        setErrors(prev => ({ ...prev, phone: 'กรุณากรอกเบอร์โทรศัพท์' }));
      } else if (clean.length < 9 || clean.length > 10) {
        setErrors(prev => ({ ...prev, phone: 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก' }));
      } else {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
    }
  };

  const handlePhoneBlur = () => {
    setTouched(prev => ({ ...prev, phone: true }));
    const clean = phoneNumberOnly.replace(/[^\d]/g, '');
    if (!phoneNumberOnly.trim()) {
      setErrors(prev => ({ ...prev, phone: 'กรุณากรอกเบอร์โทรศัพท์' }));
    } else if (clean.length < 9 || clean.length > 10) {
      setErrors(prev => ({ ...prev, phone: 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก' }));
    } else {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  // Mask citizen ID: show X for all digits except last 3
  const maskCitizenId = (real: string): string => {
    if (!real) return '';
    const digits = real.replace(/-/g, '');
    if (digits.length <= 3) return real;
    const visiblePart = digits.slice(-3);
    const hiddenCount = digits.length - 3;
    return 'X'.repeat(hiddenCount) + visiblePart;
  };

  const handleCitizenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const currentMasked = maskCitizenId(form.citizenId);

    let newReal: string;
    if (inputVal.length > currentMasked.length) {
      // Characters added — extract only newly typed chars (after the masked portion)
      const added = inputVal.slice(currentMasked.length).replace(/[^0-9]/g, '');
      newReal = form.citizenId + added;
    } else {
      // Characters deleted from the end
      const deletedCount = currentMasked.length - inputVal.length;
      newReal = form.citizenId.slice(0, Math.max(0, form.citizenId.length - deletedCount));
    }

    // Enforce 13 digit limit
    if (newReal.replace(/-/g, '').length > 13) return;

    setForm({ ...form, citizenId: newReal });

    // Real-time validation feedback
    const cleanLen = newReal.replace(/-/g, '').length;
    if (newReal && cleanLen < 13) {
      setErrors(prev => ({ ...prev, citizenId: `กรอกแล้ว ${cleanLen}/13 หลัก` }));
    } else if (cleanLen === 13 && !validateCitizenId(newReal)) {
      setErrors(prev => ({ ...prev, citizenId: 'เลขประจำตัวประชาชนไม่ถูกต้องตามหลักโครงสร้าง' }));
    } else {
      setErrors(prev => ({ ...prev, citizenId: '' }));
    }
  };

  const handleAddCategory = () => {
    const input = newCatInput.trim();
    if (!input) return;

    const defaults = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ', 'ทั้งหมด'];
    if (defaults.includes(input) || customCategories.includes(input)) {
      showToast("มีหมวดหมู่นี้อยู่แล้วครับ!", "warning");
      return;
    }

    setCustomCategories([...customCategories, input]);
    setNewCatInput("");
    showToast(`เพิ่มหมวดหมู่ "${input}" เรียบร้อยแล้ว`, "success");
  };

  const handleRemoveCategory = (catName: string) => {
    setCustomCategories(customCategories.filter(c => c !== catName));
    showToast(`ลบหมวดหมู่ "${catName}" เรียบร้อยแล้ว`, "info");
  };

  const validateCitizenId = (id: string) => {
    const clean = id.replace(/-/g, "").trim();
    if (clean.length !== 13) return false;
    if (!/^\d{13}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean.charAt(i)) * (13 - i);
    }
    const check = (11 - (sum % 11)) % 10;
    return check === parseInt(clean.charAt(12));
  };

  const validatePhone = (num: string) => {
    const clean = num.replace(/[^\d]/g, "");
    return clean.length >= 9 && clean.length <= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submit
    const nameErr = validateField('name', form.name);
    const companyErr = validateField('company', form.company);
    const emailErr = validateField('email', form.email);
    const cleanPhone = phoneNumberOnly.replace(/[^\d]/g, '');
    const phoneErr = !phoneNumberOnly.trim() ? 'กรุณากรอกเบอร์โทรศัพท์'
      : (cleanPhone.length < 9 || cleanPhone.length > 10) ? 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก' : '';
    const citizenErr = validateField('citizenId', form.citizenId);

    const newErrors = { name: nameErr, company: companyErr, email: emailErr, phone: phoneErr, citizenId: citizenErr };
    setErrors(newErrors);
    setTouched({ name: true, company: true, email: true, phone: true, citizenId: true });

    if (Object.values(newErrors).some(e => e)) return;

    setLoading(true);
    try {
      const cleanPhoneOnly = phoneNumberOnly.replace(/[^\d]/g, "").replace(/^0/, "");
      const finalPhone = `${phoneCode}${cleanPhoneOnly}`;

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...form, 
          phone: finalPhone, 
          customCategories 
        }),
      });
      if (res.ok) {
        showToast("บันทึกข้อมูลเรียบร้อยแล้ว! ✅", "success", 5000);
        if (onSaved) onSaved();

        if (isForcedView) {
          setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
        }
      } else {
        showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className={styles.card}>กำลังโหลด...</div>;
  }

  return (
    <div className={styles.card}>
      {isForcedView && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.05rem' }}>
            <span>⚠️</span> กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนเข้าใช้งานระบบ
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            เพื่อความถูกต้องและความปลอดภัยในการใช้งาน จำเป็นต้องกรอกชื่อ-นามสกุล, ชื่อบริษัท/ที่ทำงาน, เบอร์โทรศัพท์ และรหัสประจำตัวประชาชนให้ครบถ้วนก่อนจึงจะสามารถทำรายการเข้าชมหน้าหลักหรือแดชบอร์ดได้ครับ
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                import('next-auth/react').then((m) => m.signOut({ callbackUrl: '/login' }));
              }}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              🚪 ออกจากระบบ / Sign Out
            </button>
          </div>
        </div>
      )}

      <h3>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        {isForcedView ? "ลงทะเบียนประวัติส่วนตัว" : "แก้ไขข้อมูลของฉัน"}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>ชื่อ-นามสกุล</label>
          <input
            className={styles.input}
            name="name"
            placeholder="ชื่อ-นามสกุล"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            style={errors.name && touched.name ? { borderColor: '#ef4444' } : {}}
            required
          />
          {touched.name && errors.name && (
            <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.name}</span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>ชื่อบริษัท / ที่ทำงาน</label>
          <input
            className={styles.input}
            name="company"
            placeholder="บริษัทจำกัด..."
            value={form.company}
            onChange={handleChange}
            onBlur={handleBlur}
            style={errors.company && touched.company ? { borderColor: '#ef4444' } : {}}
            required
          />
          {touched.company && errors.company && (
            <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.company}</span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>อีเมลติดต่อ</label>
          <input
            className={styles.input}
            name="email"
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            style={errors.email && touched.email ? { borderColor: '#ef4444' } : {}}
            required
          />
          {touched.email && errors.email && (
            <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.email}</span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>เบอร์โทรศัพท์</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={phoneCode} 
              onChange={(e) => setPhoneCode(e.target.value)}
              className={styles.input} 
              style={{ width: '135px', flexShrink: 0, paddingRight: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: errors.phone && touched.phone ? '1px solid #ef4444' : '1px solid var(--border-color)', borderRadius: '10px' }}
            >
              <option value="+66">🇹🇭 (+66)</option>
            </select>
            <input 
              className={styles.input}
              placeholder="8x-xxx-xxxx" 
              value={phoneNumberOnly} 
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              style={errors.phone && touched.phone ? { borderColor: '#ef4444' } : {}}
              required
            />
          </div>
          {touched.phone && errors.phone && (
            <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.phone}</span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            เลขประจำตัวประชาชน (13 หลัก)
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>🔒 แสดงเฉพาะ 3 ตัวท้าย</span>
          </label>
          <input 
            className={styles.input} 
            name="citizenId" 
            placeholder="X-XXXX-XXXXX-XX-X" 
            value={maskCitizenId(form.citizenId)}
            onChange={handleCitizenIdChange}
            onBlur={handleBlur}
            style={{
              letterSpacing: '2px',
              fontFamily: 'monospace',
              ...(errors.citizenId && touched.citizenId ? { borderColor: '#ef4444' } : {})
            }}
            required
          />
          {errors.citizenId && (
            <span style={{ color: errors.citizenId.startsWith('กรอกแล้ว') ? '#f59e0b' : '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.citizenId}</span>
          )}
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
