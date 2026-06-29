'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const subNav = [
  { href: '/tienda-en-linea', label: 'Diseño' },
  { href: '/tienda-en-linea/paginas', label: 'Páginas' },
  { href: '/tienda-en-linea/blog', label: 'Blog', badge: 'Nuevo' },
  { href: '/tienda-en-linea/menus', label: 'Menús' },
  { href: '/tienda-en-linea/filtros', label: 'Filtros' },
  { href: '/tienda-en-linea/redes-sociales', label: 'Links de redes sociales' },
  { href: '/tienda-en-linea/construccion', label: 'Página en construcción' },
]

const temasThumbs = ['Moda oscuro', 'Cosmética', 'Deportes', 'Minimalista', 'Cali', 'Uyuni', 'Toluca', 'Colorido']
const thumbColors = ['#6366f1','#14b8a6','#ec4899','#64748b','#eab308','#db2777','#f97316','#22c55e']

export default function TiendaEnLineaPage() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 280px', gap: 24, alignItems: 'start' }}>
      {/* Sub-nav */}
      <aside style={{ background: '#fff', borderRadius: 10, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {subNav.map((item) => {
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

      {/* Contenido */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 20 }}>Diseño</h1>

        {/* Tema actual */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ background: '#f3f4f6', padding: 12 }}>
            <div style={{ background: '#fff', borderRadius: '6px 6px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 12 }}>🔍</span>
                <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.12em' }}>MORELIA</span>
                <span style={{ fontSize: 12 }}>👤 🛒</span>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: '5px 12px', fontSize: 10, color: '#374151' }}>
                {['Relojes','Bolsos','Cinturones','Billeteras','Estuches'].map(c => <span key={c}>{c}</span>)}
              </div>
            </div>
            <div style={{ background: '#78716c', borderRadius: '0 0 6px 6px', height: 100, display: 'flex', alignItems: 'flex-end', padding: 10, position: 'relative' }}>
              <p style={{ color: '#fff', fontSize: 9, maxWidth: '55%' }}>Nuestra marca tiene una tradición que se transmite hace 3 generaciones.</p>
              <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4 }}>
                100% Cuero
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Morelia</span>
              <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Diseño actual</span>
            </div>
            <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Editar diseño actual
            </button>
          </div>
        </div>

        {/* Galería de temas */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: 2 }}>
            {temasThumbs.map((t, i) => (
              <div key={t} style={{ height: 80, background: thumbColors[i], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Más de 60 temas disponibles</span>
            <button style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Ver otros temas
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Logo de tu tienda</h3>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>
            Sube el logo y muestra la imagen de tu marca en tu tienda.
          </p>
          <button style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Subir logo
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, background: '#4f46e5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>N</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Nuby</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>Nuby es la herramienta todo-en-uno para aumentar conversiones, captar leads y más.</p>
            </div>
          </div>
          <div style={{ fontSize: 13 }}>
            <a href="#" style={{ color: '#0049ff', fontWeight: 700, textDecoration: 'none' }}>Instalar</a>
            <span style={{ color: '#d1d5db', margin: '0 8px' }}>·</span>
            <a href="#" style={{ color: '#0049ff', fontSize: 12, textDecoration: 'none' }}>Más apps de marketing ↗</a>
          </div>
        </div>
      </div>
    </div>
  )
}
