'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SubNav from '../_subnav'

const NAVY = '#252855'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Slide = { img: string; kicker: string; title: string }

const DEFAULT_SLIDES: Slide[] = [
  { img: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1400&q=80', kicker: 'Setup destacado', title: 'Teclados compactos para crear y jugar.' },
  { img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1400&q=80', kicker: 'Gaming portátil', title: 'Control total en cualquier lugar.' },
  { img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1400&q=80', kicker: 'Audio premium', title: 'Sonido claro para concentrarte más.' },
]

export default function BlogPage() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('carrusel').eq('id', 1).single()
      .then(({ data }) => {
        if (data?.carrusel && data.carrusel.length > 0) setSlides(data.carrusel)
      })
  }, [])

  function setSlide(i: number, field: keyof Slide, val: string) {
    setSlides(prev => { const s = [...prev]; s[i] = { ...s[i], [field]: val }; return s })
  }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, carrusel: slides, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 260px', gap: 24, alignItems: 'start' }}>
      <SubNav />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Carrusel de imágenes</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Las 3 diapositivas del banner principal. Pega la URL directa de cada imagen (Supabase Storage o cualquier imagen pública).</p>

        {slides.map((slide, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {/* Preview */}
            <div style={{ height: 120, background: '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
              {slide.img && (
                <img src={slide.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
              <span style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                Slide {i + 1}
              </span>
              {slide.title && (
                <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}>
                  {slide.kicker && <p style={{ color: '#ffffffaa', fontSize: 10, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{slide.kicker}</p>}
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{slide.title}</p>
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>URL de imagen</label>
                <input style={inp} value={slide.img} onChange={e => setSlide(i, 'img', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label style={lbl}>Kicker (etiqueta)</label>
                <input style={inp} value={slide.kicker} onChange={e => setSlide(i, 'kicker', e.target.value)} placeholder="Audio premium" />
              </div>
              <div>
                <label style={lbl}>Título</label>
                <input style={inp} value={slide.title} onChange={e => setSlide(i, 'title', e.target.value)} placeholder="Sonido claro para concentrarte más." />
              </div>
            </div>
          </div>
        ))}

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
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            💡 Puedes usar imágenes de Supabase Storage o cualquier URL pública. Tamaño recomendado: <strong>1400 × 700 px</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
