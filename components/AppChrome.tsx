'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

// El storefront (raíz "/") usa su propio layout a pantalla completa con su
// propio sidebar, así que se renderiza sin el chrome administrativo.
// El resto de rutas (panel admin) conservan Sidebar + Topbar + main.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/') {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <Topbar />
      <main style={{ marginLeft: 240, marginTop: 56, padding: '32px', minHeight: 'calc(100vh - 56px)', background: '#f9fafb' }}>
        {children}
      </main>
    </>
  )
}
