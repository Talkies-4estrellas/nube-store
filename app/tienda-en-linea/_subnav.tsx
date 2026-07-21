'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const NAVY = '#252855'

const items = [
  { href: '/tienda-en-linea',                label: 'Diseño' },
  { href: '/tienda-en-linea/paginas',         label: 'Páginas' },
  { href: '/tienda-en-linea/blog',            label: 'Carrusel', badge: 'Nuevo' },
  { href: '/tienda-en-linea/menus',           label: 'Menús' },
  { href: '/tienda-en-linea/filtros',         label: 'Filtros' },
  { href: '/tienda-en-linea/redes-sociales',  label: 'Redes sociales' },
  { href: '/tienda-en-linea/legal',           label: 'Legal / Envíos' },
]

export default function SubNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const actual = items.find(i => i.href === pathname) ?? items[0]

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Cerrar al cambiar de ruta
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 40 }}>
      {/* Botón hamburguesa */}
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        fontSize: 14, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap',
      }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 18, height: 2, background: NAVY, borderRadius: 2, display: 'block' }} />
          ))}
        </span>
        {actual.label}
        <span style={{ fontSize: 10, color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {/* Dropdown flotante */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 200,
          background: '#fff', borderRadius: 10, padding: '6px 0',
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)', border: '1px solid #f3f4f6',
        }}>
          {items.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                fontSize: 13, color: active ? '#0049ff' : '#374151',
                fontWeight: active ? 700 : 500,
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
        </div>
      )}
    </div>
  )
}
