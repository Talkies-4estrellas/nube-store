import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export const metadata: Metadata = {
  title: 'Order Express | Panel Administrativo',
  description: 'Dashboard de gestión de Order Express',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Sidebar />
        <Topbar />
        <main style={{ marginLeft: 240, marginTop: 56, padding: '32px', minHeight: 'calc(100vh - 56px)', background: '#f9fafb' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
