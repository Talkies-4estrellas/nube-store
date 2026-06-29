import type { Metadata } from 'next'
import './globals.css'
import AppChrome from '@/components/AppChrome'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Order Express | Panel Administrativo',
  description: 'Dashboard de gestión de Order Express',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
      </body>
    </html>
  )
}
