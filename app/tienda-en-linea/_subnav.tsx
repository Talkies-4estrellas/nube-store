'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/tienda-en-linea',                label: 'Diseño' },
  { href: '/tienda-en-linea/paginas',         label: 'Páginas' },
  { href: '/tienda-en-linea/blog',            label: 'Carrusel', badge: 'Nuevo' },
  { href: '/tienda-en-linea/menus',           label: 'Menús' },
  { href: '/tienda-en-linea/filtros',         label: 'Filtros' },
  { href: '/tienda-en-linea/redes-sociales',  label: 'Redes sociales' },
]

export default function SubNav() {
  const pathname = usePathname()
  return (
    <aside style={{ background: '#fff', borderRadius: 10, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      {items.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            fontSize: 13, color: active ? '#0049ff' : '#374151',
            fontWeight: active ? 700 : 400,
            background: active ? '#eff6ff' : 'transparent',
            borderLeft: active ? '3px solid #0049ff' : '3px solid transparent',
            textDecoration: 'none',
          }}>
            {item.label}
            {item.badge && (
              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10 }}>
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </aside>
  )
}
