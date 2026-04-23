import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    googleAccessToken?: string
    googleRefreshToken?: string
    googleExpiresAt?: number
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    googleAccessToken?: string
    googleRefreshToken?: string
    googleExpiresAt?: number
  }
}
