import type { Metadata } from 'next'
import './globals.css'
import AppChrome from '@/components/AppChrome'
import { AuthProvider } from '@/lib/auth-context'
import { SidebarProvider } from '@/lib/sidebar-context'

export const metadata: Metadata = {
  title: 'Order Express | Panel Administrativo',
  description: 'Dashboard de gestión de Order Express',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>
            <AppChrome>{children}</AppChrome>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
