'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CSSProperties, useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import { useAuth, ROLE_ROUTES, type Role } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useSidebar } from '@/lib/sidebar-context'

type NavItem = { href: string; label: string; icon: string; badge?: string }
type NavSection = { label: string; items: NavItem[] }

const ALL_SECTIONS: NavSection[] = [
  {
    label: 'INICIO',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    label: 'GESTIÓN',
    items: [
      { href: '/ventas',     label: 'Ventas',    icon: 'cart'  },
      { href: '/productos',  label: 'Productos', icon: 'box'   },
      { href: '/clientes',   label: 'Clientes',  icon: 'users' },
      { href: '/envio-nube', label: 'Envíos',    icon: 'truck' },
    ],
  },
  {
    label: 'CANALES',
    items: [
      { href: '/tienda-en-linea', label: 'Tienda en línea', icon: 'store' },
    ],
  },
]

const TIENDA_EN_LINEA_SUBITEMS = [
  { href: '/tienda-en-linea',                label: 'Diseño' },
  { href: '/tienda-en-linea/paginas',         label: 'Páginas' },
  { href: '/tienda-en-linea/blog',            label: 'Carrusel', badge: 'Nuevo' },
  { href: '/tienda-en-linea/menus',           label: 'Menús' },
  { href: '/tienda-en-linea/filtros',         label: 'Filtros' },
  { href: '/tienda-en-linea/redes-sociales',  label: 'Redes sociales' },
  { href: '/tienda-en-linea/legal',           label: 'Legal / Envíos' },
]


const NAVY = '#252855'
const PINK = '#e7226d'

const ROLE_BADGE: Record<Role, { label: string; bg: string; color: string }> = {
  admin:     { label: 'Admin',     bg: '#ede9fe', color: '#6d28d9' },
  vendedor:  { label: 'Vendedor',  bg: '#dbeafe', color: '#1e40af' },
  bodega:    { label: 'Bodega',    bg: '#d1fae5', color: '#065f46' },
  proveedor: { label: 'Proveedor', bg: '#fef3c7', color: '#92400e' },
  basico:    { label: 'Cliente',   bg: '#f3f4f6', color: '#374151' },
}

const s: Record<string, CSSProperties> = {
  sidebar: {
    width: 240, height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
    zIndex: 100, padding: '20px 14px 16px', overflow: 'hidden',
  },
  nav:     { flex: 1, minHeight: 0, background: '#f1f2f6', borderRadius: 22, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  label:   { fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '12px 14px 6px', display: 'block' },
  footer:  { paddingTop: 12 },
}

function NavLink({ href, label, icon, badge, active }: NavItem & { active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
      color: NAVY, textDecoration: 'none', fontSize: 14,
      fontWeight: active ? 800 : 700, borderRadius: 999,
      background: active ? '#fff' : 'transparent',
      border: active ? `2px solid ${NAVY}` : '2px solid transparent',
      boxShadow: active ? '0 6px 16px rgba(37,40,85,0.12)' : 'none',
    }}>
      <Icon name={icon} size={18} color={NAVY} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>{badge}</span>}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { isMobile, open } = useSidebar()
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [stockBajoCount, setStockBajoCount] = useState(0)

  useEffect(() => {
    function cargarSolicitudes() {
      supabase.from('solicitudes_productos').select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente').then(({ count }) => setSolicitudesPendientes(count ?? 0))
    }
    function cargarStock() {
      supabase.from('productos').select('id', { count: 'exact', head: true })
        .lte('stock', 5).then(({ count }) => setStockBajoCount(count ?? 0))
    }
    cargarSolicitudes()
    cargarStock()

    const chSol = supabase.channel('sidebar-solicitudes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_productos' }, cargarSolicitudes)
      .subscribe()
    const chStock = supabase.channel('sidebar-stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarStock)
      .subscribe()
    return () => { supabase.removeChannel(chSol); supabase.removeChannel(chStock) }
  }, [])

  const allowed = user ? new Set(ROLE_ROUTES[user.role]) : null
  const visibleSections = ALL_SECTIONS
    .map(section => ({ ...section, items: section.items.filter(i => !allowed || allowed.has(i.href)) }))
    .filter(section => section.items.length > 0)

  const showConfig = !user || user.role === 'admin'
  const badge = user ? ROLE_BADGE[user.role] : null

  const sidebarStyle: CSSProperties = isMobile
    ? {
        ...s.sidebar,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 200,
        boxShadow: open ? '4px 0 24px rgba(0,0,0,0.18)' : 'none',
      }
    : s.sidebar

  return (
    <aside style={sidebarStyle}>
      <div style={{ padding: '0 8px', marginBottom: 16 }}>
        <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 44, width: 'auto', maxWidth: '100%' }} />
      </div>

      <nav className="admin-nav-scroll" style={s.nav}>
        {visibleSections.map(section => (
          <div key={section.label}>
            <span style={s.label}>{section.label}</span>
            {section.items.map(item => (
              item.href === '/productos' ? (
                <div key={item.href} style={{ position: 'relative' }}>
                  <NavLink {...item} active={pathname.startsWith(item.href)} />
                  {stockBajoCount > 0 && (
                    <span style={{ position: 'absolute', top: 8, right: 10, background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', pointerEvents: 'none' }}>
                      {stockBajoCount > 99 ? '99+' : stockBajoCount}
                    </span>
                  )}
                </div>
              ) : item.href === '/tienda-en-linea' ? (
                <div key={item.href}>
                  <NavLink {...item} active={pathname.startsWith(item.href)} />
                  {pathname.startsWith(item.href) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '2px 0 4px 30px', borderLeft: '2px solid #e5e7eb', paddingLeft: 10 }}>
                      {TIENDA_EN_LINEA_SUBITEMS.map(sub => {
                        const active = pathname === sub.href
                        return (
                          <Link key={sub.href} href={sub.href} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                            fontSize: 13, color: active ? NAVY : '#6b7280',
                            fontWeight: active ? 800 : 600,
                            background: active ? '#fff' : 'transparent',
                            borderRadius: 8, textDecoration: 'none',
                          }}>
                            {sub.label}
                            {sub.badge && (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10 }}>
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
              )
            ))}
          </div>
        ))}
        {/* Ver tienda — abre la tienda pública en nueva pestaña */}
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
          color: NAVY, textDecoration: 'none', fontSize: 14, fontWeight: 700,
          borderRadius: 999, background: 'transparent', border: '2px solid transparent', marginTop: 4,
        }}>
          <Icon name="store" size={18} color={NAVY} />
          <span style={{ flex: 1 }}>Ver tienda</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>↗</span>
        </a>

          {showConfig && (
          <div style={{ marginTop: 4, position: 'relative' }}>
            <NavLink href="/configuracion" label="Configuración" icon="settings" active={pathname === '/configuracion'} />
            {solicitudesPendientes > 0 && (
              <span style={{ position: 'absolute', top: 8, right: 10, background: PINK, color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', pointerEvents: 'none' }}>
                {solicitudesPendientes > 99 ? '99+' : solicitudesPendientes}
              </span>
            )}
          </div>
        )}
      </nav>

      {/* Perfil del usuario */}
      {user && (
        <div style={{ padding: '12px 8px 0', borderTop: '1px solid #f3f4f6', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
            <div style={{ width: 34, height: 34, background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nombre}</p>
              {badge && (
                <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, padding: '1px 7px', borderRadius: 20 }}>{badge.label}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={signOut} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px', border: 'none', borderRadius: 999,
            background: 'rgba(231,34,109,0.10)', color: PINK,
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>
            <Icon name="logout" size={16} color={PINK} />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
