'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CSSProperties } from 'react'

type NavItem = { href: string; label: string; icon: string; badge?: string }
type NavSection = { label: string; items: NavItem[] }

const navItems: NavSection[] = [
  {
    label: 'GESTIÓN',
    items: [
      { href: '/envio-nube', label: 'Envío Nube', icon: '🚚', badge: 'Nuevo' },
    ],
  },
  {
    label: 'CANALES DE VENTA',
    items: [
      { href: '/tienda-en-linea', label: 'Tienda en línea', icon: '🏪' },
      { href: '/punto-de-venta', label: 'Punto de Venta', icon: '💳' },
    ],
  },
]

const s: Record<string, CSSProperties> = {
  sidebar: {
    width: 240,
    minHeight: '100vh',
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  logoText: {
    fontWeight: 700,
    fontSize: 15,
    color: '#111',
    flex: 1,
  },
  nav: {
    flex: 1,
    padding: '12px 0',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9ca3af',
    letterSpacing: '0.06em',
    padding: '8px 20px 4px',
    display: 'block',
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '8px 0',
  },
}

function NavItem({ href, label, icon, badge, active }: {
  href: string; label: string; icon: string; badge?: string; active: boolean
}) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 20px',
      color: active ? '#0049ff' : '#374151',
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      background: active ? '#eff6ff' : 'transparent',
      borderRight: active ? '3px solid #0049ff' : '3px solid transparent',
    }}>
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          background: '#e0f2fe',
          color: '#0369a1',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 20,
        }}>{badge}</span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <div style={{
          width: 28, height: 28, background: '#0049ff', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>T</span>
        </div>
        <span style={s.logoText}>Tienda Nube</span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16 }}>☰</button>
      </div>

      <nav style={s.nav}>
        {navItems.map((section) => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            <span style={s.sectionLabel}>{section.label}</span>
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div style={s.footer}>
        <NavItem href="/configuracion" label="Configuración" icon="⚙️" active={pathname === '/configuracion'} />
      </div>
    </aside>
  )
}
