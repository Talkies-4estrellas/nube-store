'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CSSProperties } from 'react'
import Icon from '@/components/Icon'

type NavItem = { href: string; label: string; icon: string; badge?: string }
type NavSection = { label: string; items: NavItem[] }

const navItems: NavSection[] = [
  {
    label: 'INICIO',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { href: '/ventas', label: 'Ventas', icon: 'cart' },
      { href: '/productos', label: 'Productos', icon: 'box' },
      { href: '/clientes', label: 'Clientes', icon: 'users' },
      { href: '/envio-nube', label: 'Envío', icon: 'truck' },
    ],
  },
  {
    label: 'CANALES DE VENTA',
    items: [
      { href: '/tienda-en-linea', label: 'Tienda en línea', icon: 'store' },
      { href: '/punto-de-venta', label: 'Punto de Venta', icon: 'creditcard' },
    ],
  },
]

const NAVY = '#252855'
const PINK = '#e7226d'

const s: Record<string, CSSProperties> = {
  sidebar: {
    width: 240,
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    padding: '20px 14px 16px',
    overflow: 'hidden',
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    padding: '0 8px',
    marginBottom: 16,
  },
  nav: {
    flex: 1,
    minHeight: 0,
    background: '#f1f2f6',
    borderRadius: 22,
    padding: '12px 10px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#9aa0b4',
    letterSpacing: '0.08em',
    padding: '12px 14px 6px',
    display: 'block',
  },
  footer: {
    paddingTop: 12,
  },
}

function NavItem({ href, label, icon, badge, active }: {
  href: string; label: string; icon: string; badge?: string; active: boolean
}) {
  return (
    <Link
      href={href}
      className={`admin-nav-item${active ? ' active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        color: NAVY,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: active ? 800 : 700,
        borderRadius: 999,
        background: active ? '#fff' : 'transparent',
        border: active ? `2px solid ${NAVY}` : '2px solid transparent',
        boxShadow: active ? '0 6px 16px rgba(37, 40, 85, 0.12)' : 'none',
      }}
    >
      <Icon name={icon} size={18} color={NAVY} />
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
  const router = useRouter()

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <span style={{ color: '#1b1f4b' }}>Order</span>
        <span style={{ color: PINK }}>Express</span>
      </div>

      <nav className="admin-nav-scroll" style={s.nav}>
        {navItems.map((section) => (
          <div key={section.label}>
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

        <div style={{ marginTop: 4 }}>
          <NavItem href="/configuracion" label="Configuración" icon="settings" active={pathname === '/configuracion'} />
        </div>
      </nav>

      <div style={s.footer}>
        <button
          type="button"
          className="admin-logout"
          onClick={() => router.push('/')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '13px',
            border: 'none',
            borderRadius: 999,
            background: 'rgba(231, 34, 109, 0.10)',
            color: PINK,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Icon name="logout" size={18} color={PINK} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
