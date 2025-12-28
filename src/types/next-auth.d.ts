import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      gtdEnabled: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    tenantId: string
    gtdEnabled: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string
    gtdEnabled: boolean
  }
}