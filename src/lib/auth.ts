import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { DatabaseConnection } from "./db-connection"
import { auditLogger } from "./audit-logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await DatabaseConnection.withRetry(
          () => prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          }),
          'auth-find-user'
        )

        if (!user || !user.password) {
          // Log failed login attempt
          if (user) {
            await auditLogger.logFailedLogin(user.tenantId, credentials.email)
          }
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          // Log failed login attempt
          await auditLogger.logFailedLogin(user.tenantId, credentials.email)
          return null
        }

        // Log successful login
        await auditLogger.logLogin(user.tenantId, user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          tenantId: user.tenantId,
          gtdEnabled: user.gtdEnabled,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId
        token.gtdEnabled = user.gtdEnabled
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.tenantId = token.tenantId as string
        session.user.gtdEnabled = token.gtdEnabled as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}