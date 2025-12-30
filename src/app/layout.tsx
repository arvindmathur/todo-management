import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NextAuthSessionProvider from '@/components/providers/session-provider'
import { ToastProvider, ErrorBoundary } from '@/components/feedback'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ToDo Management',
  description: 'A modern todo management application for organizing your tasks and projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <NextAuthSessionProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </NextAuthSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}