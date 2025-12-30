"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { FeatureHighlights } from "@/components/marketing/FeatureHighlights"

export default function AboutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-lg sm:text-xl font-semibold hover:text-gray-700">
                ToDo Management
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/dashboard/preferences"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Preferences
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About ToDo Management
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A modern todo management application designed for productivity and simplicity.
            Built to help you organize your tasks and projects without the complexity.
          </p>
        </div>

        {/* Feature Highlights */}
        <FeatureHighlights showTitle={true} className="mb-12" />

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Open Source & Community</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Get Involved</h3>
              <p className="text-gray-600 mb-4">
                ToDo Management is open source and welcomes contributions from the community. 
                Whether you want to report bugs, request features, or contribute code, we'd love to hear from you.
              </p>
              <div className="space-y-3">
                <a
                  href="https://github.com/arvindmathur/todo-management"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  View Source Code on GitHub
                </a>
                <a
                  href="https://github.com/arvindmathur/todo-management/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Report Issues or Request Features
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Technology Stack</h3>
              <p className="text-gray-600 mb-4">
                Built with modern web technologies for performance, reliability, and scalability.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Next.js 14 with App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• PostgreSQL database</li>
                <li>• Prisma ORM</li>
                <li>• NextAuth.js for authentication</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Deployed on Vercel</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Version Information */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Version 3.0.1 • Built with ❤️ for productivity enthusiasts
          </p>
          <p className="mt-2">
            Built with{" "}
            <a
              href="https://kiro.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Kiro
            </a>
            {" "}for productivity enthusiasts
          </p>
        </div>
      </main>
    </div>
  )
}