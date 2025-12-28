"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-gray-900 mb-8">
          Todo Management SaaS
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          A modern todo management application with Getting Things Done (GTD) methodology support.
          Organize your tasks, projects, and life with progressive feature disclosure.
        </p>
        <div className="space-x-4">
          <Link
            href="/auth/signin"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-white hover:bg-gray-50 text-indigo-600 font-bold py-3 px-6 rounded-lg text-lg border-2 border-indigo-600 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}