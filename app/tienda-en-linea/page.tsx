'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const subNav = [
  { href: '/tienda-en-linea', label: 'Diseño' },
  { href: '/tienda-en-linea/paginas', label: 'Páginas' },
  { href: '/tienda-en-linea/blog', label: 'Blog', badge: 'Nuevo' },
  { href: '/tienda-en-linea/menus', label: 'Menús' },
  { href: '/tienda-en-linea/filtros', label: 'Filtros' },
  { href: '/tienda-en-linea/redes-sociales', label: 'Links de redes sociales' },
]

const temasThumbs = ['Moda oscuro', 'Cosmética', 'Deportes', 'Minimalista', 'Cali', 'Uyuni', 'Toluca', 'Colorido']
const thumbColors = ['#6366f1','#14b8a6','#ec4899','#64748b','#eab308','#db2777','#f97316','#22c55e']

const temasExtra = ['Nocturno', 'Vintage', 'Pastel', 'Corporativo', 'Oceáno', 'Bosque']
const thumbColorsExtra = ['#1e1b4b','#92400e','#f9a8d4','#1e3a5f','#0284c7','#166534']

type Config = {
  nombre_tienda: string
  hero_titulo: string
  hero_subtitulo: string
  hero_cta: string
  color_acento: string
  whatsapp: string
  email_contacto: string
  instagram: string
}

const DEFAULTS: Config = {
  nombre_tienda: 'Order Express',
  hero_titulo: 'Productos de calidad',
  hero_subtitulo: 'Los mejores productos al mejor precio.',
  hero_cta: 'Ver productos',
  color_acento: '#e7226d',
  whatsapp: '',
  email_contacto: '',
  instagram: '',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

export default function TiendaEnLineaPage() {
  const pathname = usePathname()
  const [editMode, setEditMode] = useState(false)
  const [config, setConfig] = useState<Config>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mostrarMasTemas, setMostrarMasTemas] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setConfig({ ...DEFAULTS, ...data }) })
  }, [])

  function set(key: keyof Config, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...config, updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 24, alignItems: 'start' }}>
      {/* Sub-nav */}
      <aside style={{ background: '#fff', borderRadius: 10, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {subNav.map(item => {
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

        {/* Vista previa del tema */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ background: '#f3f4f6', padding: 12 }}>
            <div style={{ background: '#fff', borderRadius: '6px 6px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 12 }}>🔍</span>
                <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.12em' }}>{config.nombre_tienda.toUpperCase()}</span>
                <span style={{ fontSize: 12 }}>👤 🛒</span>
              </div>
            </div>
            <div style={{ background: '#78716c', borderRadius: '0 0 6px 6px', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 14px', position: 'relative' }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{config.hero_titulo}</p>
              <p style={{ color: '#ffffff80', fontSize: 9 }}>{config.hero_subtitulo}</p>
              <span style={{ position: 'absolute', bottom: 10, right: 10, background: config.color_acento, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>
                {config.hero_cta}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Tema actual</span>
              <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Activo</span>
            </div>
            <button onClick={() => setEditMode(e => !e)}
              style={{ background: editMode ? '#f3f4f6' : '#0049ff', color: editMode ? '#374151' : '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {editMode ? 'Cerrar editor' : 'Editar diseño actual'}
            </button>
          </div>
        </div>

        {/* Editor de configuración */}
        {editMode && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 20 }}>Configuración de la tienda</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Identidad */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Identidad</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>Nombre de la tienda</label>
                    <input style={inp} value={config.nombre_tienda} onChange={e => set('nombre_tienda', e.target.value)} placeholder="Order Express" />
                  </div>
                  <div>
                    <label style={lbl}>Color de acento</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={config.color_acento} onChange={e => set('color_acento', e.target.value)}
                        style={{ width: 42, height: 38, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                      <input style={{ ...inp, flex: 1 }} value={config.color_acento} onChange={e => set('color_acento', e.target.value)} placeholder="#e7226d" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero / Banner */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Banner principal</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={lbl}>Título principal</label>
                    <input style={inp} value={config.hero_titulo} onChange={e => set('hero_titulo', e.target.value)} placeholder="Productos de calidad" />
                  </div>
                  <div>
                    <label style={lbl}>Subtítulo</label>
                    <input style={inp} value={config.hero_subtitulo} onChange={e => set('hero_subtitulo', e.target.value)} placeholder="Los mejores productos al mejor precio." />
                  </div>
                  <div>
                    <label style={lbl}>Texto del botón</label>
                    <input style={inp} value={config.hero_cta} onChange={e => set('hero_cta', e.target.value)} placeholder="Ver productos" />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div style={{ padding: '16px 0' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Contacto</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>WhatsApp</label>
                    <input style={inp} value={config.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+52 55 0000 0000" />
                  </div>
                  <div>
                    <label style={lbl}>Email de contacto</label>
                    <input type="email" style={inp} value={config.email_contacto} onChange={e => set('email_contacto', e.target.value)} placeholder="hola@tienda.com" />
                  </div>
                  <div>
                    <label style={lbl}>Instagram</label>
                    <input style={inp} value={config.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@tutienda" />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={guardar} disabled={saving}
                style={{ background: saved ? '#059669' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
                {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* Galería de temas */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: 2 }}>
            {temasThumbs.map((t, i) => (
              <div key={t} style={{ height: 80, background: thumbColors[i], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Temas extra (colapsables) */}
          {mostrarMasTemas && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: '0 2px 2px' }}>
              {temasExtra.map((t, i) => (
                <div key={t} style={{ height: 80, background: thumbColorsExtra[i], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Más temas disponibles</span>
            <button onClick={() => setMostrarMasTemas(v => !v)}
              style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {mostrarMasTemas ? 'Ocultar temas ▲' : 'Ver otros temas ▼'}
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa en vivo</h3>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>
            Los cambios se verán reflejados en la tienda al guardar.
          </p>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
            Abrir tienda ↗
          </a>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, background: config.color_acento, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0, fontSize: 18 }}>🎨</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Color de acento</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>Afecta botones, badges y elementos destacados de la tienda.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {['#e7226d','#0049ff','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#374151'].map(c => (
              <button key={c} onClick={() => set('color_acento', c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: config.color_acento === c ? '3px solid #111' : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
