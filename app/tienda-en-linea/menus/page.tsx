'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'

const NAV_OPTIONS = [
  { view: 'catalogo',  label: 'Catálogo',   icon: '🛍️', desc: 'Muestra el catálogo completo de productos con filtros' },
  { view: 'novedades', label: 'Novedades',   icon: '✨', desc: 'Lanzamientos y drops recientes' },
  { view: 'favoritos', label: 'Favoritos',   icon: '❤️', desc: 'Wishlist del cliente' },
  { view: 'ofertas',   label: 'Ofertas',     icon: '🏷️', desc: 'Descuentos y promociones' },
  { view: 'carrito',   label: 'Carrito',     icon: '🛒', desc: 'Resumen de compra y checkout' },
  { view: 'soporte',   label: 'Soporte',     icon: '🎧', desc: 'Centro de ayuda y contacto' },
]

export default function MenusPage() {
  const [navOcultar, setNavOcultar] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('nav_ocultar').eq('id', 1).single()
      .then(({ data }) => { if (data) setNavOcultar(data.nav_ocultar ?? '') })
  }, [])

  function toggle(view: string) {
    const hidden = new Set(navOcultar.split(',').map(s => s.trim()).filter(Boolean))
    if (hidden.has(view)) hidden.delete(view)
    else hidden.add(view)
    setNavOcultar(Array.from(hidden).join(','))
  }

  const hidden = new Set(navOcultar.split(',').map(s => s.trim()).filter(Boolean))

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, nav_ocultar: navOcultar, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Menús</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Activa o desactiva las secciones del menú lateral de la tienda. <strong>Inicio</strong> siempre es visible.</p>

        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {/* Inicio (fijo, no editable) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🏠</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Inicio</p>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Página principal de la tienda</p>
              </div>
            </div>
            <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>Siempre visible</span>
          </div>

          {NAV_OPTIONS.map((opt, i) => {
            const active = !hidden.has(opt.view)
            return (
              <div key={opt.view} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < NAV_OPTIONS.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: active ? '#fff' : '#fafafa',
                opacity: active ? 1 : 0.7,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: active ? NAVY : '#9ca3af' }}>{opt.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{opt.desc}</p>
                  </div>
                </div>
                {/* Toggle switch */}
                <button type="button" onClick={() => toggle(opt.view)} style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? '#0049ff' : '#d1d5db',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <span style={{
                    position: 'absolute', top: 3, left: active ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={saving} style={{
            background: saved ? '#059669' : NAVY, color: '#fff', border: 'none',
            padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
          }}>
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa</h3>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>Los cambios se reflejan en la tienda al guardar.</p>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
            Abrir tienda ↗
          </a>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Visibles ahora</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🏠</span>
              <span style={{ fontSize: 13, color: '#374151' }}>Inicio</span>
            </div>
            {NAV_OPTIONS.filter(o => !hidden.has(o.view)).map(o => (
              <div key={o.view} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{o.icon}</span>
                <span style={{ fontSize: 13, color: '#374151' }}>{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
