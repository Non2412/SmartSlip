"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styles from "./Profile.module.css";
import { useToast } from "./Toast";

export default function ProfileForm({ onSaved }: { onSaved?: () => void }) {
  const { data: session, update } = useSession();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    address: "",
    citizenId: "",
  });
  const [requestedRole, setRequestedRole] = useState<"clerk" | "user">("user");
  const [requestMode, setRequestMode] = useState<"role_change" | "issue_report">("role_change");
  const [issueCategory, setIssueCategory] = useState<string>("🐛 พบข้อผิดพลาด/บักในระบบ");
  const [roleReason, setRoleReason] = useState("");
  const [roleRequestsList, setRoleRequestsList] = useState<any[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+66");
  const [phoneNumberOnly, setPhoneNumberOnly] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isForced, setIsForced] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [dismissedRequests, setDismissedRequests] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("ขนาดรูปภาพต้องไม่เกิน 5MB ครับ", "error");
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            image: base64,
          }),
        });

        if (res.ok) {
          setUserImage(base64);
          showToast("อัปเดตรูปโปรไฟล์ใหม่เรียบร้อยแล้ว! 🖼️", "success");
        } else {
          showToast("เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์", "error");
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload avatar error:", err);
      showToast("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "error");
      setIsUploadingImage(false);
    }
  };

  const fetchRoleRequests = () => {
    fetch("/api/role-requests?myOwn=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoleRequestsList(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("force") === "true") {
        setIsForced(true);
      }
      try {
        const saved = localStorage.getItem("smartslip_dismissed_role_requests");
        if (saved) {
          setDismissedRequests(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to load dismissed requests:", err);
      }
    }
    fetchRoleRequests();
  }, []);

  const handleDismissNotification = (id: string) => {
    const updated = [...dismissedRequests, id];
    setDismissedRequests(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartslip_dismissed_role_requests", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save dismissed requests:", err);
      }
    }
  };

  const isSessionNotCompleted = session?.user && (session.user as any).role === "user" && (session as any).isProfileCompleted === false;
  const isSessionPending = session?.user && (session.user as any).role === "user" && (session.user as any).status === "pending";
  const isSessionRejected = session?.user && (session.user as any).role === "user" && (session.user as any).status === "rejected";
  const isSessionRestricted = session?.user && (session.user as any).role === "user" && (session.user as any).status === "restricted";
  const isForcedView = isForced || isSessionNotCompleted || isSessionPending || isSessionRejected || isSessionRestricted;

  const handleRoleRequestSubmit = async () => {
    if (!roleReason.trim()) {
      showToast(requestMode === "role_change" ? "กรุณาระบุเหตุผลการยื่นคำร้องขอเปลี่ยนบทบาทครับ" : "กรุณาระบุรายละเอียดปัญหาที่พบครับ", "warning");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await fetch("/api/role-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: requestedRole,
          reason: roleReason.trim(),
          requestType: requestMode,
          issueCategory: requestMode === "issue_report" ? issueCategory : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(requestMode === "role_change" ? "ยื่นคำร้องขอเปลี่ยนบทบาทส่งไปยังผู้ดูแลระบบเรียบร้อยแล้ว! 📨" : "ส่งรายงานแจ้งปัญหาไปยังผู้ดูแลระบบเรียบร้อยแล้ว! 🛠️", "success", 5000);
        setRoleReason("");
        fetchRoleRequests();
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการส่งข้อมูล", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการส่งข้อมูล", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const pendingRequest = roleRequestsList.find((r) => r.status === "pending");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm({
            name: data.name || "",
            company: data.company || "",
            email: data.email || "",
            address: data.address || data.about || data.from || "",
            citizenId: data.citizenId || "",
          });

          if (data.image) {
            setUserImage(data.image);
          }

          if (data.requestedRole === 'clerk' || data.requestedRole === 'user') {
            setRequestedRole(data.requestedRole);
          }

          const phoneVal = data.phone || "";
          if (phoneVal.startsWith("+66")) {
            setPhoneCode("+66");
            setPhoneNumberOnly(phoneVal.replace("+66", "").trim());
          } else {
            setPhoneCode("+66");
            setPhoneNumberOnly(phoneVal);
          }

          if (Array.isArray(data.customCategories)) {
            setCustomCategories(data.customCategories);
          } else {
            setCustomCategories(['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ']);
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
      case 'address':
        return value.trim() ? '' : 'กรุณากรอกที่อยู่ / ประวัติตนเอง';
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

  const saveCategoriesToDb = async (categories: string[]) => {
    try {
      const cleanPhoneOnly = phoneNumberOnly.replace(/[^\d]/g, "").replace(/^0/, "");
      const finalPhone = `${phoneCode}${cleanPhoneOnly}`;
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...form, 
          phone: finalPhone, 
          customCategories: categories 
        }),
      });
    } catch (err) {
      console.error("Failed to auto-save categories:", err);
    }
  };

  const handleAddCategory = () => {
    const input = newCatInput.trim();
    if (!input) return;

    const exists = customCategories.some(c => c.toLowerCase() === input.toLowerCase());
    if (exists || input === 'ทั้งหมด') {
      showToast("มีหมวดหมู่นี้อยู่แล้วครับ!", "warning");
      return;
    }

    const updated = [...customCategories, input];
    setCustomCategories(updated);
    setNewCatInput("");
    saveCategoriesToDb(updated);
    showToast(`เพิ่มหมวดหมู่ "${input}" เรียบร้อยแล้ว`, "success");
  };

  const handleRemoveCategory = (catName: string) => {
    const updated = customCategories.filter(c => c !== catName);
    setCustomCategories(updated);
    saveCategoriesToDb(updated);
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
    const addressErr = validateField('address', form.address);
    const cleanPhone = phoneNumberOnly.replace(/[^\d]/g, '');
    const phoneErr = !phoneNumberOnly.trim() ? 'กรุณากรอกเบอร์โทรศัพท์'
      : (cleanPhone.length < 9 || cleanPhone.length > 10) ? 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก' : '';
    const citizenErr = validateField('citizenId', form.citizenId);

    const newErrors = { name: nameErr, company: companyErr, email: emailErr, address: addressErr, phone: phoneErr, citizenId: citizenErr };
    setErrors(newErrors);
    setTouched({ name: true, company: true, email: true, address: true, phone: true, citizenId: true });

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
          requestedRole,
          customCategories 
        }),
      });
      if (res.ok) {
        showToast("บันทึกข้อมูลเรียบร้อยแล้ว! ✅", "success", 5000);
        
        if (update) {
          await update();
        }

        if (onSaved) onSaved();

        if (isForcedView) {
          setTimeout(() => { window.location.href = "/profile"; }, 1500);
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
    return <div className={styles.card} style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูลโปรไฟล์...</div>;
  }

  const isComplete = form.name.trim() && form.company.trim() && form.email.trim() && form.address.trim() && phoneNumberOnly.trim() && form.citizenId.trim() && validateCitizenId(form.citizenId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── 1. Profile Hero Banner ── */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: '20px',
        padding: '24px 28px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar Container with Camera Overlay Badge */}
          <div 
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
            title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileSelect}
            />

            <img 
              src={userImage || session?.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name || 'User')}`} 
              alt={form.name || "User Avatar"} 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name || 'User')}`;
              }}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--primary-color, #10b981)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                opacity: isUploadingImage ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            />

            {/* Camera Overlay Badge Button */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--primary-color, #10b981)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              border: '2px solid var(--card-bg, #ffffff)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
            }}>
              {isUploadingImage ? '⌛' : '📷'}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main, #0f172a)' }}>
                {form.name || session?.user?.name || 'โปรไฟล์ของฉัน'}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px',
                background: (session?.user as any)?.role === 'admin' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: (session?.user as any)?.role === 'admin' ? '#6366f1' : '#10b981',
                border: (session?.user as any)?.role === 'admin' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                {(session?.user as any)?.role === 'admin' ? '🛡️ ผู้ดูแลระบบ (Admin)' : '👤 ผู้ใช้งานทั่วไป'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
              {form.email || session?.user?.email || 'ไม่มีอีเมล'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            padding: '6px 14px',
            borderRadius: '12px',
            background: isComplete ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: isComplete ? '#22c55e' : '#f59e0b',
            border: isComplete ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {isComplete ? '✅ ข้อมูลครบถ้วนสมบูรณ์' : '⏳ รอดำเนินการกรอกข้อมูล'}
          </span>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color, #10b981)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)'}
          >
            🖨️ พิมพ์ข้อมูล / PDF
          </button>
        </div>
      </div>

      {isForcedView && (
        <div style={{
          background: (session?.user as any)?.status === "pending" ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: (session?.user as any)?.status === "pending" ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {(session?.user as any)?.status === "pending" ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '1.05rem' }}>
                <span>⏳</span> อยู่ระหว่างรอการอนุมัติสิทธิ์การใช้งานจากผู้ดูแลระบบ
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                บัญชีของคุณได้รับการลงทะเบียนและกรอกข้อมูลครบถ้วนแล้ว เพื่อความปลอดภัย บัญชีของคุณจึงจำเป็นต้องได้รับการอนุมัติจากผู้ดูแลระบบ (Admin) ก่อนเริ่มใช้งานครับ กรุณาแจ้งผู้ดูแลระบบของคุณเพื่ออนุมัติเปิดใช้งานบัญชี
              </p>
            </>
          ) : ((session?.user as any)?.status === "rejected" || (session?.user as any)?.status === "restricted") ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.05rem' }}>
                <span>❌</span> บัญชีถูกปิดใช้งาน หรือ คำขออนุมัติถูกปฏิเสธ
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                บัญชีของคุณถูกยกเลิกการใช้งาน หรือไม่ได้รับการอนุมัติสิทธิ์เข้าใช้งานในขณะนี้ หากต้องการกลับมาใช้งานระบบ กรุณาตรวจสอบและแก้ไขข้อมูลส่วนตัวด้านล่างให้ถูกต้อง จากนั้นกดปุ่มส่งขอสิทธิ์ใหม่อีกครั้งเพื่อส่งกลับไปให้ผู้ดูแลระบบตรวจสอบใหม่ครับ
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.05rem' }}>
                <span>⚠️</span> กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนเริ่มใช้งานระบบ
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                เพื่อความถูกต้องและความปลอดภัยในการใช้งาน จำเป็นต้องกรอกชื่อ-นามสกุล, ชื่อบริษัท/ที่ทำงาน, ที่อยู่/ประวัติตนเอง, เบอร์โทรศัพท์ และรหัสประจำตัวประชาชนให้ครบถ้วนก่อนจึงจะสามารถทำรายการเข้าชมหน้าหลักหรือแดชบอร์ดได้ครับ
              </p>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', marginTop: '4px' }}>
            {(session?.user as any)?.status === "pending" && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
                }}
              >
                🔄 รีเฟรชสถานะ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                import('next-auth/react').then((m) => m.signOut({ callbackUrl: '/login' }));
              }}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: (session?.user as any)?.status === "pending" ? '1px solid #94a3b8' : '1px solid #ef4444',
                color: (session?.user as any)?.status === "pending" ? '#94a3b8' : '#ef4444',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🚪 ออกจากระบบ / Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Unified Profile Form Card ── */}
      <div className={styles.card} style={{ borderRadius: '20px', padding: '32px' }}>
        <form onSubmit={handleSubmit}>
          
          {/* Section 1: ข้อมูลส่วนตัวและการติดต่อ */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '6px 10px', borderRadius: '10px', color: 'var(--primary-color, #10b981)', fontSize: '1rem' }}>👤</span>
              ข้อมูลส่วนตัวและสถานที่ทำงาน
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className={styles.formGroup} style={{ margin: 0 }}>
                <label className={styles.label}>ชื่อ-นามสกุล</label>
                <input
                  className={styles.input}
                  name="name"
                  placeholder="ตัวอย่าง: นาย สมชาย ใจดี"
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

              <div className={styles.formGroup} style={{ margin: 0 }}>
                <label className={styles.label}>ชื่อบริษัท / ที่ทำงาน</label>
                <input
                  className={styles.input}
                  name="company"
                  placeholder="ตัวอย่าง: บริษัท สมาร์ทสลิป จำกัด (มหาชน)"
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

              <div className={styles.formGroup} style={{ margin: 0 }}>
                <label className={styles.label}>อีเมลติดต่อ</label>
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  placeholder="ตัวอย่าง: somchai.j@example.com"
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

              <div className={styles.formGroup} style={{ margin: 0 }}>
                <label className={styles.label}>เบอร์โทรศัพท์ติดต่อ</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={phoneCode} 
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className={styles.input} 
                    style={{ width: '130px', flexShrink: 0, paddingRight: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: errors.phone && touched.phone ? '1px solid #ef4444' : '1px solid var(--border-color)', borderRadius: '10px' }}
                  >
                    <option value="+66">🇹🇭 (+66)</option>
                  </select>
                  <input 
                    className={styles.input}
                    placeholder="ตัวอย่าง: 081-234-5678" 
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
            </div>

            {/* ที่อยู่ / ประวัติตนเอง */}
            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
              <label className={styles.label}>เป็นใครมาจากไหน (ที่อยู่ / ประวัติตนเอง)</label>
              <textarea
                className={styles.input}
                name="address"
                placeholder="ตัวอย่าง: 123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110"
                value={form.address}
                onChange={(e: any) => handleChange(e)}
                onBlur={(e: any) => handleBlur(e)}
                rows={2}
                style={{ resize: 'vertical', minHeight: '68px', fontFamily: 'inherit', padding: '12px 14px', lineHeight: '1.5' }}
                required
              />
              {touched.address && errors.address && (
                <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>⚠ {errors.address}</span>
              )}
            </div>

            {/* เลขประจำตัวประชาชน */}
            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
              <label className={styles.label}>
                เลขประจำตัวประชาชน (13 หลัก)
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>🔒 แสดงเฉพาะ 3 ตัวท้ายเพื่อความปลอดภัย</span>
              </label>
              <input 
                className={styles.input} 
                name="citizenId" 
                placeholder="ตัวอย่าง: 1-1004-99999-99-9" 
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

            {/* ── Role Request Selection Cards ── */}
            <div style={{ marginTop: '24px', background: 'var(--input-bg, #f8fafc)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <label className={styles.label} style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔑</span> เลือกขอสถานะ / สิทธิ์การใช้งานระบบ
              </label>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                กรุณาเลือกสถานะการใช้งานที่คุณต้องการขออนุญาตจากผู้ดูแลระบบ (Admin)
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* Option 1: เสมียน (Clerk) */}
                <div 
                  onClick={() => setRequestedRole('clerk')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: requestedRole === 'clerk' ? '2px solid #6366f1' : '1px solid var(--border-color, #e2e8f0)',
                    background: requestedRole === 'clerk' ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <input 
                    type="radio" 
                    name="requestedRole" 
                    value="clerk" 
                    checked={requestedRole === 'clerk'} 
                    onChange={() => setRequestedRole('clerk')} 
                    style={{ marginTop: '3px', accentColor: '#6366f1' }}
                  />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: requestedRole === 'clerk' ? '#6366f1' : 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💼</span> 1. เสมียน (Clerk)
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.4' }}>
                      ขอสิทธิ์ใช้งานในฐานะเสมียน เพื่อช่วยตรวจสอบ ตรวจเช็ค และจัดการเอกสารสลิป/ใบเสร็จในระบบ
                    </p>
                  </div>
                </div>

                {/* Option 2: ผู้ใช้งานทั่วไป (General User) */}
                <div 
                  onClick={() => setRequestedRole('user')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: requestedRole === 'user' ? '2px solid #10b981' : '1px solid var(--border-color, #e2e8f0)',
                    background: requestedRole === 'user' ? 'rgba(16, 185, 129, 0.08)' : 'var(--card-bg, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <input 
                    type="radio" 
                    name="requestedRole" 
                    value="user" 
                    checked={requestedRole === 'user'} 
                    onChange={() => setRequestedRole('user')} 
                    style={{ marginTop: '3px', accentColor: '#10b981' }}
                  />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: requestedRole === 'user' ? '#10b981' : 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>👤</span> 2. ผู้ใช้งานทั่วไป (General User)
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.4' }}>
                      ขอสิทธิ์ใช้งานในฐานะผู้ใช้งานทั่วไป สำหรับสแกน บันทึก และคุมรายจ่ายใบเสร็จส่วนตัว
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <div style={{ marginTop: '24px' }}>
              <button 
                type="submit" 
                className={styles.button} 
                disabled={loading}
                style={{
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading 
                  ? "⌛ กำลังบันทึกข้อมูลโปรไฟล์..." 
                  : (session?.user && (session.user as any).status === "active" 
                      ? "💾 บันทึกข้อมูลโปรไฟล์" 
                      : "📨 ขอสิทธิ์การใช้งาน")}
              </button>
            </div>
          </div>

          <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px dashed var(--border-color, #cbd5e1)' }} />

          {/* Section 2: จัดการหมวดหมู่รายจ่ายส่วนตัว */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '6px 10px', borderRadius: '10px', color: '#6366f1', fontSize: '1rem' }}>🏷️</span>
              จัดการหมวดหมู่รายจ่ายส่วนตัวของคุณ
            </h3>

            {customCategories.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {customCategories.map((cat, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: 'var(--input-bg, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main, #0f172a)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span>🏷️ {cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                      title={`ลบหมวดหมู่ ${cat}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Category Row */}
            <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
              <input
                className={styles.input}
                type="text"
                placeholder="พิมพ์ชื่อหมวดหมู่ใหม่ เช่น ค่าไฟ, ท่องเที่ยว..."
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
                style={{ flexShrink: 0 }}
              >
                ➕ เพิ่มหมวดหมู่
              </button>
            </div>
          </div>

          <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px dashed var(--border-color, #cbd5e1)' }} />

          {/* Section 3: ยื่นคำร้องขอเปลี่ยนสิทธิ์บทบาท / แจ้งปัญหา */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '6px 10px', borderRadius: '10px', color: '#6366f1', fontSize: '1rem' }}>📝</span>
              ยื่นคำร้องขอเปลี่ยนสิทธิ์บทบาท / แจ้งปัญหาการใช้งาน
            </h3>

            {/* 2 Mode Selector Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {/* Mode 1: ขอเปลี่ยนบทบาท */}
              <button
                type="button"
                onClick={() => setRequestMode('role_change')}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  border: requestMode === 'role_change' ? '2px solid #6366f1' : '1px solid var(--border-color, #e2e8f0)',
                  background: requestMode === 'role_change' ? 'rgba(99, 102, 241, 0.12)' : 'var(--input-bg, #f8fafc)',
                  color: requestMode === 'role_change' ? '#6366f1' : 'var(--text-muted, #64748b)',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: requestMode === 'role_change' ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <span>👤</span> 1. ยื่นขอเปลี่ยนบทบาท (Role)
              </button>

              {/* Mode 2: แจ้งปัญหาการใช้งาน */}
              <button
                type="button"
                onClick={() => setRequestMode('issue_report')}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  border: requestMode === 'issue_report' ? '2px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
                  background: requestMode === 'issue_report' ? 'rgba(239, 68, 68, 0.12)' : 'var(--input-bg, #f8fafc)',
                  color: requestMode === 'issue_report' ? '#ef4444' : 'var(--text-muted, #64748b)',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: requestMode === 'issue_report' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <span>⚠️</span> 2. แจ้งปัญหาการใช้งานระบบ
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.5' }}>
              {requestMode === 'role_change'
                ? 'หากคุณต้องการปรับเปลี่ยนสิทธิ์บทบาทการใช้งาน (เช่น ขอเปลี่ยนสิทธิ์เป็นเสมียน หรือผู้ใช้งานทั่วไป) จำเป็นต้องระบุเหตุผลความจำเป็นเพื่อให้ผู้ดูแลระบบ (Admin) พิจารณาอนุมัติก่อนเปลี่ยนสิทธิ์ครับ'
                : 'หากคุณพบข้อผิดพลาด (Bug) สแกนใบเสร็จไม่ตรง หรือมีข้อเสนอแนะในการปรับปรุงระบบ สามารถกรอกรายละเอียดแจ้งปัญหาไปยังผู้ดูแลระบบได้ทันทีครับ'}
            </p>

            {/* Active Pending Request Alert */}
            {pendingRequest && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '0.92rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏳</span> รายการของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบ
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-main, #0f172a)' }}>
                  ประเภท: <strong>{pendingRequest.requestType === 'issue_report' ? `⚠️ แจ้งปัญหา (${pendingRequest.issueCategory || 'ทั่วไป'})` : `👤 ขอเปลี่ยนสิทธิ์เป็น ${pendingRequest.targetRole === 'clerk' ? '💼 เสมียน (Clerk)' : '👤 ผู้ใช้งานทั่วไป'}`}</strong>
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                  รายละเอียด: &ldquo;{pendingRequest.reason}&rdquo; ({new Date(pendingRequest.createdAt).toLocaleString('th-TH')})
                </p>
              </div>
            )}

            {/* Resolved Status Notification Banners */}
            {!pendingRequest && roleRequestsList.length > 0 && roleRequestsList[0].status === 'approved' && !dismissedRequests.includes(roleRequestsList[0]._id || roleRequestsList[0].id) && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
                position: 'relative'
              }}>
                <button
                  type="button"
                  onClick={() => handleDismissNotification(roleRequestsList[0]._id || roleRequestsList[0].id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#10b981',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    opacity: 0.7,
                    fontWeight: 'bold'
                  }}
                  title="ปิดการแจ้งเตือน"
                >
                  ✕
                </button>
                <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.92rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎉</span> รายการล่าสุดได้รับการดำเนินการแล้ว!
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)', paddingRight: '24px' }}>
                  {roleRequestsList[0].requestType === 'issue_report'
                    ? 'ผู้ดูแลระบบได้รับทราบและดำเนินการตรวจสอบปัญหาของคุณเรียบร้อยแล้วครับ'
                    : `สิทธิ์การใช้งานใหม่ของคุณถูกปรับเป็น ${roleRequestsList[0].targetRole === 'clerk' ? '💼 เสมียน (Clerk)' : '👤 ผู้ใช้งานทั่วไป'} เรียบร้อยแล้วครับ`}
                </p>
              </div>
            )}

            {!pendingRequest && roleRequestsList.length > 0 && roleRequestsList[0].status === 'rejected' && !dismissedRequests.includes(roleRequestsList[0]._id || roleRequestsList[0].id) && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
                position: 'relative'
              }}>
                <button
                  type="button"
                  onClick={() => handleDismissNotification(roleRequestsList[0]._id || roleRequestsList[0].id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    opacity: 0.7,
                    fontWeight: 'bold'
                  }}
                  title="ปิดการแจ้งเตือน"
                >
                  ✕
                </button>
                <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.92rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>❌</span> รายการสิทธิ์ล่าสุดถูกปฏิเสธ
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)', paddingRight: '24px' }}>
                  คำร้องสิทธิ์ถูกปฏิเสธโดยผู้ดูแลระบบ{roleRequestsList[0].adminNote ? ` (เหตุผล: ${roleRequestsList[0].adminNote})` : ''}
                </p>
              </div>
            )}

            <div style={{ background: 'var(--input-bg, #f8fafc)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              {/* Category Pills when in Mode 2 */}
              {requestMode === 'issue_report' && (
                <div style={{ marginBottom: '16px' }}>
                  <label className={styles.label} style={{ marginBottom: '8px' }}>เลือกประเภทปัญหาที่พบ:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      '🐛 พบข้อผิดพลาด/บักในระบบ',
                      '📄 ปัญหาสแกน/อ่านสลิป',
                      '🔑 ปัญหาเข้าสู่ระบบ/บัญชี',
                      '💡 ข้อเสนอแนะการใช้งาน'
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setIssueCategory(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          border: issueCategory === cat ? '1px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
                          background: issueCategory === cat ? 'rgba(239, 68, 68, 0.12)' : 'var(--card-bg, #ffffff)',
                          color: issueCategory === cat ? '#ef4444' : 'var(--text-muted, #64748b)',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>
                  {requestMode === 'role_change' ? 'เหตุผลความจำเป็นในการขอเปลี่ยนบทบาท (Role)' : 'รายละเอียดปัญหาหรือข้อผิดพลาดที่พบ'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className={styles.input}
                  placeholder={requestMode === 'role_change'
                    ? 'ระบุเหตุผลความจำเป็น เช่น ต้องช่วยตรวจเช็คเอกสารสลิปของแผนกการเงิน หรือช่วยคุมรายจ่าย...'
                    : 'อธิบายรายละเอียดปัญหาที่พบ เช่น สแกนสลิปใบเสร็จแล้วยอดเงินไม่ตรง หรือระบบแสดงผลช้าในมือถือ...'}
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', padding: '12px 14px', lineHeight: '1.5' }}
                />
              </div>

              <button
                type="button"
                onClick={handleRoleRequestSubmit}
                disabled={isSubmittingRequest || !roleReason.trim()}
                style={{
                  padding: '12px 22px',
                  background: requestMode === 'role_change' ? '#6366f1' : '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: isSubmittingRequest || !roleReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingRequest || !roleReason.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: requestMode === 'role_change' ? '0 4px 12px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(239, 68, 68, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmittingRequest
                  ? '⌛ กำลังส่งข้อมูล...'
                  : requestMode === 'role_change'
                    ? '📨 ยื่นคำร้องขอเปลี่ยนสิทธิ์บทบาทแก่ Admin'
                    : '🛠️ ส่งรายงานแจ้งปัญหาแก่ Admin'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
