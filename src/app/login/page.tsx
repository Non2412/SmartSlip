"use client"
import { signIn } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import styles from "./login.module.css"

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
    }
  }, [searchParams])

  const handleLineLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn("line", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("❌ ข้อผิดพลาดในการเข้าสู่ระบบ:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.loginWrapper}>
      {/* Grid overlay */}
      <div className={styles.gridOverlay} />

      {/* Floating particles */}
      <div className={styles.particles}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.particle} />
        ))}
      </div>

      {/* Card */}
      <div className={styles.loginCard}>

        {/* Live badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className={styles.loginBadge}>
            <span className={styles.badgeDot} />
            SmartSlip AI — พร้อมใช้งาน
          </div>
        </div>

        {/* Header */}
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <img src="/logo-dark.png" alt="SmartSlip AI Logo" width={360} height={144} />
          </div>
          <p>เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>

        {/* Body */}
        <div className={styles.loginBody}>
          {success && <div className={styles.successAlert}>✅ {success}</div>}
          {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

          {/* Feature chips */}
          <div className={styles.featureRow}>
            <span className={styles.featureChip}>📄 อ่านสลิปอัตโนมัติ</span>
            <span className={styles.featureChip}>🤖 AI วิเคราะห์</span>
            <span className={styles.featureChip}>📊 รายงานสรุป</span>
          </div>

          {/* LINE login button */}
          <div className={styles.socialGrid}>
            <button
              id="line-login-btn"
              className={styles.lineBtn}
              onClick={handleLineLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.loader} />
              ) : (
                <img src="/line-icon.svg" alt="LINE" width={22} height={22} />
              )}
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย LINE"}
            </button>
          </div>

          <p className={styles.privacyNote}>
            การเข้าสู่ระบบถือว่าคุณยอมรับ<br />
            นโยบายความเป็นส่วนตัวและเงื่อนไขการใช้งาน
          </p>
        </div>

        {/* Footer */}
        <div className={styles.loginFooter}>
          <p>© 2026 SmartSlip AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1e',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter, sans-serif'
      }}>
        กำลังโหลด...
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
