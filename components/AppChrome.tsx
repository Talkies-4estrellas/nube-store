'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { useAuth, canAccess } from '@/lib/auth-context'

const NAVY = '#252855'
const PINK = '#e7226d'

// Páginas sin chrome: storefront y login
const PUBLIC_PATHS = ['/', '/login', '/proveedores']

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Storefront y login renderizan sin chrome
  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>

  // Spinner de carga mientras se verifica la sesión
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${NAVY}20`, borderTop: `3px solid ${NAVY}`, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 600 }}>Verificando sesión...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  // Sin sesión (el middleware ya redirige, pero por si acaso)
  if (!user) return null

  // Verificar permiso de rol para esta ruta
  const hasAccess = canAccess(user.role, pathname)

  return (
    <>
      <Sidebar />
      <Topbar />
      <main style={{ marginLeft: 240, marginTop: 56, padding: '32px', minHeight: 'calc(100vh - 56px)', background: '#f9fafb' }}>
        {hasAccess ? children : <AccessDenied role={user.role} />}
      </main>
    </>
  )
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_HOME:   Record<string, string> = { admin: '/dashboard', vendedor: '/dashboard', bodega: '/productos' }

function AccessDenied({ role }: { role: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 12 }}>
      <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>Acceso restringido</h2>
      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 340, lineHeight: 1.5 }}>
        Tu rol de <strong>{ROLE_LABELS[role] ?? role}</strong> no tiene permiso para ver esta sección.
      </p>
      <a href={ROLE_HOME[role] ?? '/dashboard'}
        style={{ marginTop: 8, background: NAVY, color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
        Ir a mi panel
      </a>
    </div>
  )
}
