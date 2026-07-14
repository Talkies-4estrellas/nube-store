'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SubNav from './_subnav'

const temasThumbs = ['Moda oscuro', 'Cosmética', 'Deportes', 'Minimalista', 'Cali', 'Uyuni', 'Toluca', 'Colorido']
const thumbColors = ['#6366f1','#14b8a6','#ec4899','#64748b','#eab308','#db2777','#f97316','#22c55e']
const temasExtra = ['Nocturno', 'Vintage', 'Pastel', 'Corporativo', 'Océano', 'Bosque']
const thumbColorsExtra = ['#1e1b4b','#92400e','#f9a8d4','#1e3a5f','#0284c7','#166534']

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { nombre_tienda: string; color_acento: string; hero_titulo: string; hero_subtitulo: string; hero_cta: string }
const DEFAULTS: Fields = { nombre_tienda: 'Order Express', color_acento: '#e7226d', hero_titulo: 'Compra tech con estilo express.', hero_subtitulo: 'Los mejores accesorios, periféricos y gadgets.', hero_cta: 'Ver productos' }

export default function TiendaEnLineaPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [mostrarMasTemas, setMostrarMasTemas] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('nombre_tienda,color_acento,hero_titulo,hero_subtitulo,hero_cta').eq('id', 1).single()
      .then(({ data }) => { if (data) setF({ ...DEFAULTS, ...data }) })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 24, alignItems: 'start' }}>
      <SubNav />

      {/* Contenido */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 20 }}>Diseño</h1>

        {/* Vista previa del tema */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ background: '#f3f4f6', padding: 12 }}>
            <div style={{ background: '#fff', borderRadius: '6px 6px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 12 }}>🔍</span>
                <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.12em' }}>{f.nombre_tienda.toUpperCase()}</span>
                <span style={{ fontSize: 12 }}>👤 🛒</span>
              </div>
            </div>
            <div style={{ background: '#78716c', borderRadius: '0 0 6px 6px', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 14px', position: 'relative' }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{f.hero_titulo}</p>
              <p style={{ color: '#ffffff80', fontSize: 9 }}>{f.hero_subtitulo}</p>
              <span style={{ position: 'absolute', bottom: 10, right: 10, background: f.color_acento, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>
                {f.hero_cta}
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

        {/* Editor de identidad */}
        {editMode && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Identidad</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Nombre de la tienda</label>
                <input style={inp} value={f.nombre_tienda} onChange={e => set('nombre_tienda', e.target.value)} placeholder="Order Express" />
              </div>
              <div>
                <label style={lbl}>Color de acento</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={f.color_acento} onChange={e => set('color_acento', e.target.value)}
                    style={{ width: 42, height: 38, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <input style={{ ...inp, flex: 1 }} value={f.color_acento} onChange={e => set('color_acento', e.target.value)} placeholder="#e7226d" />
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
              Para editar el banner, badges, menú, carrusel y redes sociales usa las secciones del menú lateral.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>Los cambios se reflejan en la tienda al guardar.</p>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
            Abrir tienda ↗
          </a>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, background: f.color_acento, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0, fontSize: 18 }}>🎨</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Color de acento</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>Afecta botones, badges y elementos destacados.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {['#e7226d','#0049ff','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#374151'].map(c => (
              <button key={c} onClick={() => set('color_acento', c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: f.color_acento === c ? '3px solid #111' : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
