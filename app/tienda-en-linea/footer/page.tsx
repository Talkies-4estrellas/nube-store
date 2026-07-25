'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToSupabase } from '@/lib/uploadWebp'

const NAVY = '#252855'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Pagina = { label: string; url: string }
type Envio = { nombre: string; logo_url: string }

type Fields = {
  youtube: string
  footer_telefono_2: string
  footer_direccion: string
  footer_copyright: string
  footer_newsletter_activo: boolean
}
const DEFAULTS: Fields = {
  youtube: '', footer_telefono_2: '', footer_direccion: '', footer_copyright: '', footer_newsletter_activo: true,
}

export default function FooterPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [paginas, setPaginas] = useState<Pagina[]>([])
  const [envios, setEnvios] = useState<Envio[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingEnvio, setUploadingEnvio] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    supabase.from('config_storefront')
      .select('youtube,footer_telefono_2,footer_direccion,footer_copyright,footer_newsletter_activo,footer_paginas,footer_envios_logos')
      .eq('id', 1).single()
      .then(({ data }) => {
        if (!data) return
        setF({ ...DEFAULTS, ...data })
        setPaginas(Array.isArray(data.footer_paginas) ? data.footer_paginas : [])
        setEnvios(Array.isArray(data.footer_envios_logos) ? data.footer_envios_logos : [])
      })
  }, [])

  function set(key: keyof Fields, val: string | boolean) { setF(p => ({ ...p, [key]: val })) }

  function agregarPagina() {
    setPaginas(prev => [...prev, { label: '', url: '' }])
  }
  function actualizarPagina(i: number, campo: keyof Pagina, val: string) {
    setPaginas(prev => { const p = [...prev]; p[i] = { ...p[i], [campo]: val }; return p })
  }
  function eliminarPagina(i: number) {
    setPaginas(prev => prev.filter((_, idx) => idx !== i))
  }

  function agregarEnvio() {
    setEnvios(prev => [...prev, { nombre: '', logo_url: '' }])
  }
  function actualizarEnvio(i: number, campo: keyof Envio, val: string) {
    setEnvios(prev => { const e = [...prev]; e[i] = { ...e[i], [campo]: val }; return e })
  }
  function eliminarEnvio(i: number) {
    setEnvios(prev => prev.filter((_, idx) => idx !== i))
    delete fileRefs.current[i]
  }
  async function handleEnvioUpload(i: number, file: File) {
    setUploadingEnvio(i)
    try {
      const path = `footer-envios/logo-${i + 1}-${Date.now()}.webp`
      const url = await uploadToSupabase(file, supabase, 'productos', path)
      actualizarEnvio(i, 'logo_url', url)
    } catch (e) {
      console.error('Error subiendo logo:', e)
    } finally {
      setUploadingEnvio(null)
    }
  }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({
      id: 1, ...f, footer_paginas: paginas, footer_envios_logos: envios, updated_at: new Date().toISOString(),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Footer</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          El pie de página de la tienda (por ahora solo en la vista de escritorio). WhatsApp, Instagram, Facebook,
          teléfono y email ya se configuran en <strong>Redes sociales</strong> — aquí solo lo que le falta al footer.
        </p>

        {/* Contacto y redes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Contacto y redes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={lbl}>YouTube</label>
              <input style={inp} value={f.youtube} onChange={e => set('youtube', e.target.value)} placeholder="youtube.com/@tutienda" />
            </div>
            <div>
              <label style={lbl}>Segundo teléfono <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
              <input style={inp} value={f.footer_telefono_2} onChange={e => set('footer_telefono_2', e.target.value)} placeholder="447 116 37 50" />
            </div>
            <div>
              <label style={lbl}>Domicilio fiscal</label>
              <input style={inp} value={f.footer_direccion} onChange={e => set('footer_direccion', e.target.value)} placeholder="Calle y número, colonia, municipio, estado" />
            </div>
          </div>
        </div>

        {/* Páginas / enlaces institucionales */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Enlaces (columna "Info")</p>
            <button type="button" onClick={agregarPagina}
              style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Agregar enlace
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>Contáctanos, Términos y condiciones, Quienes somos, Preguntas frecuentes, etc.</p>

          {paginas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Todavía no agregaste ningún enlace.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paginas.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
                  <input style={inp} value={p.label} onChange={e => actualizarPagina(i, 'label', e.target.value)} placeholder="Texto del enlace" />
                  <input style={inp} value={p.url} onChange={e => actualizarPagina(i, 'url', e.target.value)} placeholder="https:// o /pagina" />
                  <button type="button" onClick={() => eliminarPagina(i)}
                    style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 2px' }}>Bloque de newsletter</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Formulario de correo en el footer. Todavía no envía a ninguna lista real, solo confirma visualmente.</p>
            </div>
            <button onClick={() => set('footer_newsletter_activo', !f.footer_newsletter_activo)} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', background: f.footer_newsletter_activo ? '#0049ff' : '#d1d5db',
              cursor: 'pointer', position: 'relative', flexShrink: 0,
            }}>
              <span style={{ position: 'absolute', top: 2, left: f.footer_newsletter_activo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </div>

        {/* Opciones de envío */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Logos de paqueterías</p>
            <button type="button" onClick={agregarEnvio}
              style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Agregar logo
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>Se muestran en la franja "Opciones de envío" del footer.</p>

          {envios.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Todavía no agregaste ningún logo.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {envios.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #f3f4f6', borderRadius: 10, padding: 10 }}>
                  <div style={{ width: 48, height: 32, borderRadius: 6, background: '#f9fafb', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {e.logo_url ? <img src={e.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : '📦'}
                  </div>
                  <input style={{ ...inp, flex: 1 }} value={e.nombre} onChange={ev => actualizarEnvio(i, 'nombre', ev.target.value)} placeholder="Nombre (ej. Skydropx)" />
                  <button type="button" onClick={() => fileRefs.current[i]?.click()}
                    style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploadingEnvio === i ? 'Subiendo…' : '📁 Subir'}
                  </button>
                  <input ref={el => { fileRefs.current[i] = el }} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={ev => { if (ev.target.files?.[0]) handleEnvioUpload(i, ev.target.files[0]) }} />
                  <button type="button" onClick={() => eliminarEnvio(i)}
                    style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Copyright</p>
          <input style={inp} value={f.footer_copyright} onChange={e => set('footer_copyright', e.target.value)}
            placeholder={`© ${new Date().getFullYear()} Order Express. Todos los derechos reservados.`} />
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>Si lo dejas vacío, se arma automáticamente con el año actual y el nombre de la tienda.</p>
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
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>
          El footer se ve al final del Inicio de la tienda, solo en escritorio por ahora.
        </p>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          Abrir tienda ↗
        </a>
      </div>
    </div>
  )
}
