'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = {
  hero_titulo: string; hero_subtitulo: string; hero_cta: string
  hero_tag1: string; hero_tag2: string; hero_tag3: string
  meta_titulo: string; meta_descripcion: string; og_imagen: string
}

const DEFAULTS: Fields = {
  hero_titulo: 'Compra tech con estilo express.',
  hero_subtitulo: 'Los mejores accesorios, periféricos y gadgets.',
  hero_cta: 'Ver productos',
  hero_tag1: 'Entrega rápida', hero_tag2: 'Stock limitado', hero_tag3: 'Garantía incluida',
  meta_titulo: '', meta_descripcion: '', og_imagen: '',
}

export default function PaginasPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront')
      .select('hero_titulo,hero_subtitulo,hero_cta,hero_tag1,hero_tag2,hero_tag3,meta_titulo,meta_descripcion,og_imagen')
      .eq('id', 1).single()
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
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Páginas</h1>
        </div>

        {/* Banner principal */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Banner principal</p>
          <div style={{ background: '#78716c', borderRadius: 10, height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 16px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <p style={{ color: '#ffffffcc', fontSize: 10, fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>INICIO</p>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.2 }}>{f.hero_titulo || '—'}</p>
            <p style={{ color: '#ffffff80', fontSize: 10, margin: 0 }}>{f.hero_subtitulo || '—'}</p>
            <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 6 }}>
              {[f.hero_tag1, f.hero_tag2, f.hero_tag3].filter(Boolean).map(t => (
                <span key={t} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={lbl}>Título principal</label>
              <input style={inp} value={f.hero_titulo} onChange={e => set('hero_titulo', e.target.value)} placeholder="Compra tech con estilo express." />
            </div>
            <div>
              <label style={lbl}>Subtítulo</label>
              <input style={inp} value={f.hero_subtitulo} onChange={e => set('hero_subtitulo', e.target.value)} placeholder="Los mejores accesorios, periféricos y gadgets." />
            </div>
            <div>
              <label style={lbl}>Texto del botón CTA</label>
              <input style={inp} value={f.hero_cta} onChange={e => set('hero_cta', e.target.value)} placeholder="Ver productos" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Badges del hero</p>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Los 3 chips que aparecen en la franja inferior del banner.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {(['hero_tag1', 'hero_tag2', 'hero_tag3'] as const).map((key, i) => (
              <div key={key}>
                <label style={lbl}>Badge {i + 1}</label>
                <input style={inp} value={f[key]} onChange={e => set(key, e.target.value)} placeholder={DEFAULTS[key]} />
              </div>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>SEO y redes sociales</p>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Metadatos que aparecen en buscadores y al compartir en redes.</p>

          {/* Preview Google */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 20, background: '#fafafa' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px', fontWeight: 600 }}>Vista previa en Google</p>
            <p style={{ fontSize: 14, color: '#1a0dab', fontWeight: 600, margin: '0 0 2px' }}>
              {f.meta_titulo || 'Order Express'}
            </p>
            <p style={{ fontSize: 12, color: '#006621', margin: '0 0 4px' }}>localhost:3001</p>
            <p style={{ fontSize: 12, color: '#545454', margin: 0 }}>
              {f.meta_descripcion || f.hero_subtitulo || 'Los mejores accesorios, periféricos y gadgets.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={lbl}>Título SEO <span style={{ fontWeight: 400, color: '#9ca3af' }}>(aparece en la pestaña del navegador)</span></label>
              <input style={inp} value={f.meta_titulo} onChange={e => set('meta_titulo', e.target.value)} placeholder="Order Express — Tecnología y accesorios" />
              <p style={{ fontSize: 11, color: f.meta_titulo.length > 60 ? '#dc2626' : '#9ca3af', marginTop: 4 }}>
                {f.meta_titulo.length}/60 caracteres recomendados
              </p>
            </div>
            <div>
              <label style={lbl}>Meta descripción</label>
              <textarea style={{ ...inp, height: 72, resize: 'vertical' }} value={f.meta_descripcion} onChange={e => set('meta_descripcion', e.target.value)} placeholder="Los mejores accesorios tech con entrega rápida y garantía incluida." />
              <p style={{ fontSize: 11, color: f.meta_descripcion.length > 155 ? '#dc2626' : '#9ca3af', marginTop: 4 }}>
                {f.meta_descripcion.length}/155 caracteres recomendados
              </p>
            </div>
            <div>
              <label style={lbl}>Imagen Open Graph <span style={{ fontWeight: 400, color: '#9ca3af' }}>(URL — se muestra al compartir en redes)</span></label>
              <input style={inp} value={f.og_imagen} onChange={e => set('og_imagen', e.target.value)} placeholder="https://... (1200×630 px recomendado)" />
              {f.og_imagen && (
                <img src={f.og_imagen} alt="OG preview" style={{ marginTop: 8, width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              )}
            </div>
          </div>
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
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa</h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>Los cambios se reflejan en la tienda al guardar.</p>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          Abrir tienda ↗
        </a>
      </div>
    </div>
  )
}
