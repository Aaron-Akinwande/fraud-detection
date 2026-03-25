import type { Metadata } from 'next'
import './globals.css'
import Sidebar from './components/Sidebar'

export const metadata: Metadata = {
  title: 'FraudWatch — Credit Card Fraud Detection',
  description: 'Real-time credit card fraud detection dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="scanlines">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-56 min-h-screen grid-bg">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
