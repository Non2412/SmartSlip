"use client"
import { signIn } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
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



  const handleGuestLogin = () => {
    setIsLoading(true)
    window.location.href = "/dashboard"
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <img src="/logo.png" alt="SmartSlip AI Logo" width={450} height={180} />
          </div>
          <p>Login to your account to continue</p>
        </div>

        <div className={styles.loginBody}>
          {success && <div className={styles.successAlert}>{success}</div>}
          {error && <div className={styles.errorAlert}>{error}</div>}



          <div className={styles.socialGrid}>
            <button
              className={styles.lineBtn}
              onClick={handleLineLogin}
              disabled={isLoading}
            >
              <img src="/line-icon.svg" alt="LINE" width={20} height={20} />
              LINE
            </button>
          </div>



          <div className={styles.divider}>
            <span>หรือ</span>
          </div>

          <button
            className={styles.guestBtn}
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            เข้าใช้งานในฐานะผู้มาเยือน (Guest Mode)
          </button>
        </div>

        <div className={styles.loginFooter}>
          <p>© 2026 SmartSlip AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลด...</div>}>
      <LoginContent />
    </Suspense>
  )
}
