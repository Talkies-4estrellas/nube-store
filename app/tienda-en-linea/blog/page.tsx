'use client'

import { useRef, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToSupabase } from '@/lib/uploadWebp'

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

const SLIDE_VACIO: Slide = { img: '', kicker: '', title: '' }

export default function BlogPage() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    supabase.from('config_storefront').select('carrusel').eq('id', 1).single()
      .then(({ data }) => {
        if (data?.carrusel && data.carrusel.length > 0) setSlides(data.carrusel)
      })
  }, [])

  function setSlide(i: number, field: keyof Slide, val: string) {
    setSlides(prev => { const s = [...prev]; s[i] = { ...s[i], [field]: val }; return s })
  }

  function agregarSlide() {
    setSlides(prev => [...prev, { ...SLIDE_VACIO }])
  }

  function eliminarSlide(i: number) {
    if (!confirm('¿Eliminar esta diapositiva del carrusel?')) return
    setSlides(prev => prev.filter((_, idx) => idx !== i))
    delete fileRefs.current[i]
  }

  async function handleImgUpload(i: number, file: File) {
    setUploading(i)
    try {
      const path = `carrusel/slide-${i + 1}-${Date.now()}.webp`
      const url = await uploadToSupabase(file, supabase, 'productos', path)
      setSlide(i, 'img', url)
    } catch (e) {
      console.error('Error subiendo imagen:', e)
    } finally {
      setUploading(null)
    }
  }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, carrusel: slides, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Carrusel de imágenes</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Las diapositivas del banner principal. Sube una imagen o pega una URL pública, y agrega o elimina las que necesites.</p>

        {slides.map((slide, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {/* Preview */}
            <div style={{ height: 140, background: '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
              {slide.img && (
                <img src={slide.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
              <span style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                Slide {i + 1}
              </span>
              {/* Botones sobre la imagen */}
              <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6 }}>
                <button onClick={() => fileRefs.current[i]?.click()}
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {uploading === i ? 'Subiendo…' : '📁 Subir imagen'}
                </button>
                <button onClick={() => eliminarSlide(i)} disabled={slides.length <= 1}
                  title={slides.length <= 1 ? 'Debe quedar al menos una diapositiva' : 'Eliminar diapositiva'}
                  style={{ background: 'rgba(220,38,38,0.75)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: slides.length <= 1 ? 'default' : 'pointer', opacity: slides.length <= 1 ? 0.5 : 1 }}>
                  🗑 Eliminar
                </button>
              </div>
              <input ref={el => { fileRefs.current[i] = el }} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleImgUpload(i, e.target.files[0]) }} />
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
                <label style={lbl}>URL de imagen (o sube una arriba)</label>
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

        <button onClick={agregarSlide} type="button" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#fff', color: NAVY, border: '2px dashed #d1d5db', borderRadius: 12,
          padding: '16px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          + Agregar diapositiva
        </button>

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
            💡 Tamaño recomendado: <strong>1400 × 700 px</strong>. Puedes subir JPG, PNG o WebP directamente.
          </p>
        </div>
      </div>
    </div>
  )
}
