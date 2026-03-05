"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import styles from "./login.module.css"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLineLogin = async () => {
    setIsLoading(true)
    try {
      await signIn("line", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <img src="/logo.png" alt="SmartSlip AI Logo" width={180} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <p>Login to your account to continue</p>
        </div>

        <div className={styles.loginBody}>
          <button
            className={styles.lineBtn}
            onClick={handleLineLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.loader}></span>
            ) : (
              <>
                <img src="/line-icon.svg" alt="LINE" width={24} height={24} />
                Continue with LINE
              </>
            )}
          </button>
        </div>

        <div className={styles.loginFooter}>
          <p>© 2026 SmartSlip AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
