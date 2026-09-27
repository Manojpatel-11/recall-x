import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'RECALL-X | AI Agent Memory for Experiments',
  description: 'An AI Agent That Remembers Why Experiments Failed — Before You Repeat Them',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="bg-dark-50 text-dark-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}