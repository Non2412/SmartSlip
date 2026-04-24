"use client"
import { signIn } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "./login.module.css"

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error(error)
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')
      setIsLoading(false)
    }
  }

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

  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError("Email หรือ Password ไม่ถูกต้อง")
      } else {
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
    } finally {
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

          <form onSubmit={handleNormalLogin} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input 
                id="email"
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className={styles.loginBtn}
              disabled={isLoading}
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className={styles.divider}>
            <span>หรือเข้าสู่ระบบด้วย</span>
          </div>

          <div className={styles.socialGrid}>
            <button
              className={styles.googleBtn}
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <img src="/google-icon.svg" alt="Google" width={20} height={20} />
              Google
            </button>

            <button
              className={styles.lineBtn}
              onClick={handleLineLogin}
              disabled={isLoading}
            >
              <img src="/line-icon.svg" alt="LINE" width={20} height={20} />
              LINE
            </button>
          </div>

          <div className={styles.registerLink}>
            ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิกใหม่ที่นี่</Link>
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
