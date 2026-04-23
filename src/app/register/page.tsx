"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import styles from "../login/login.module.css"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }

      // Success
      router.push('/login?registered=true')
    } catch (error: any) {
      console.error(error)
      setError(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <img src="/logo.png" alt="SmartSlip AI Logo" width={450} height={180} style={{ objectFit: 'contain' }} />
          </div>
          <h1>สมัครสมาชิกใหม่</h1>
          <p>สร้างบัญชีเพื่อเริ่มต้นใช้งาน SmartSlip AI</p>
        </div>

        <div className={styles.loginBody}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleRegister} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="name">ชื่อ-นามสกุล</label>
              <input 
                id="name"
                type="text" 
                placeholder="สมชาย ใจดี"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                id="confirmPassword"
                type="password" 
                placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className={styles.loginBtn}
              disabled={isLoading}
            >
              {isLoading ? 'กำลังลงทะเบียน...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <div className={styles.registerLink}>
            มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบที่นี่</Link>
          </div>
        </div>

        <div className={styles.loginFooter}>
          <p>© 2026 SmartSlip AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
