import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      role?: string
      status?: string
    } & DefaultSession["user"]
    lineUserName?: string
    lineUserImage?: string
    lineUserId?: string
    googleAccessToken?: string
    googleRefreshToken?: string
    googleExpiresAt?: number
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    role?: string
    status?: string
    lineUserName?: string
    lineUserImage?: string
    lineUserId?: string
    googleAccessToken?: string
    googleRefreshToken?: string
    googleExpiresAt?: number
  }
}
