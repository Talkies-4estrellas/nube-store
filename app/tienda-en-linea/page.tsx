'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import SubNav from './_subnav'

type Tema = { nombre: string; color: string; acento: string }
const temas: Tema[] = [
  { nombre: 'Order Express', color: '#e7226d', acento: '#e7226d' },
  { nombre: 'Moda oscuro',   color: '#6366f1', acento: '#6366f1' },
  { nombre: 'Cosmética',     color: '#14b8a6', acento: '#14b8a6' },
  { nombre: 'Deportes',      color: '#ec4899', acento: '#ec4899' },
  { nombre: 'Minimalista',   color: '#64748b', acento: '#64748b' },
  { nombre: 'Cali',          color: '#eab308', acento: '#eab308' },
  { nombre: 'Uyuni',         color: '#db2777', acento: '#db2777' },
  { nombre: 'Toluca',        color: '#f97316', acento: '#f97316' },
]
const temasExtra: Tema[] = [
  { nombre: 'Colorido',      color: '#22c55e', acento: '#22c55e' },
  { nombre: 'Nocturno',      color: '#1e1b4b', acento: '#818cf8' },
  { nombre: 'Vintage',       color: '#92400e', acento: '#d97706' },
  { nombre: 'Pastel',        color: '#f9a8d4', acento: '#ec4899' },
  { nombre: 'Corporativo',   color: '#1e3a5f', acento: '#3b82f6' },
  { nombre: 'Océano',        color: '#0284c7', acento: '#0ea5e9' },
  { nombre: 'Bosque',        color: '#166534', acento: '#22c55e' },
]

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { nombre_tienda: string; color_acento: string }
const DEFAULTS: Fields = { nombre_tienda: 'Order Express', color_acento: '#e7226d' }

export default function TiendaEnLineaPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [mostrarMasTemas, setMostrarMasTemas] = useState(false)
  const [vista, setVista] = useState<'pc' | 'movil'>('pc')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)

  // El ancho del panel se mide en vivo: en escritorio son 520px, pero en
  // móvil la rejilla se apila y el panel pasa a ocupar el ancho disponible.
  // Sin medirlo, la escala quedaría fija y el iframe se vería recortado.
  const [PREVIEW_W, setPreviewW] = useState(520)

  // Alto del marco: en PC es un rectángulo acostado (como un monitor,
  // ~16:10) para que no se vea un recuadro alto y angosto. En Móvil se
  // mantiene igual que antes (recuadro alto, forma de teléfono).
  const PREVIEW_H = vista === 'pc'
    ? Math.max(260, Math.min(420, Math.round(PREVIEW_W * 0.62)))
    : 640

  useEffect(() => {
    const box = previewBoxRef.current
    if (!box) return
    const medir = () => setPreviewW(box.clientWidth || 520)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // Viewport simulado: PC (escritorio) o Móvil (teléfono centrado).
  //
  // OJO con el ancho de PC: el storefront cambia a diseño móvil con
  // `@media (max-width: 1180px)`, y max-width es INCLUSIVO. Simular
  // exactamente 1180 caía dentro del rango móvil y la vista previa de PC
  // mostraba la barra con hamburguesa en lugar del sidebar de escritorio.
  // Debe quedar por encima del breakpoint.
  const conf = vista === 'pc'
    ? { vp: 1280, scale: PREVIEW_W / 1280 }              // escritorio real (> 1180)
    : { vp: 430,  scale: Math.min(0.98, PREVIEW_W / 430) } // móvil: nunca más ancho que el panel
  const renderedW = conf.vp * conf.scale
  const previewLeft = Math.max(0, (PREVIEW_W - renderedW) / 2)

  useEffect(() => {
    supabase.from('config_storefront').select('nombre_tienda,color_acento').eq('id', 1).single()
      .then(({ data }) => { if (data) setF({ ...DEFAULTS, ...data }) })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    iframeRef.current?.contentWindow?.location.reload()
  }

  async function aplicarTema(tema: Tema) {
    set('color_acento', tema.acento)
    await supabase.from('config_storefront').upsert({ id: 1, color_acento: tema.acento, updated_at: new Date().toISOString() })
    setTimeout(() => iframeRef.current?.contentWindow?.location.reload(), 300)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 520px', gap: 24, alignItems: 'start' }}>

      {/* Contenido */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <SubNav />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: 0 }}>Diseño</h1>
        </div>

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
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Compra tech con estilo express.</p>
              <p style={{ color: '#ffffff80', fontSize: 9 }}>Los mejores accesorios, periféricos y gadgets.</p>
              <span style={{ position: 'absolute', bottom: 10, right: 10, background: f.color_acento, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>
                Ver productos
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

        {/* Galería de temas — ahora funcionales */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Temas de color</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Haz clic en un tema para aplicarlo al instante.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: 2 }}>
            {temas.map(t => {
              const activo = f.color_acento === t.acento
              return (
                <button key={t.nombre} onClick={() => aplicarTema(t)} style={{
                  height: 80, background: t.color, borderRadius: 4, border: activo ? '3px solid #111' : '3px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{t.nombre}</span>
                  {activo && <span style={{ fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.35)', padding: '1px 6px', borderRadius: 10 }}>Activo</span>}
                </button>
              )
            })}
          </div>
          {mostrarMasTemas && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: '0 2px 2px' }}>
              {temasExtra.map(t => {
                const activo = f.color_acento === t.acento
                return (
                  <button key={t.nombre} onClick={() => aplicarTema(t)} style={{
                    height: 80, background: t.color, borderRadius: 4, border: activo ? '3px solid #111' : '3px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{t.nombre}</span>
                    {activo && <span style={{ fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.35)', padding: '1px 6px', borderRadius: 10 }}>Activo</span>}
                  </button>
                )
              })}
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

      {/* Panel derecho — iframe de vista previa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Vista previa</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Switch PC / Móvil */}
              <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
                {([['pc', '🖥️ PC'], ['movil', '📱 Móvil']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setVista(v)}
                    style={{ border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: vista === v ? '#fff' : 'transparent',
                      color: vista === v ? '#111' : '#9ca3af',
                      boxShadow: vista === v ? '0 1px 2px rgba(0,0,0,0.12)' : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => iframeRef.current?.contentWindow?.location.reload()}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#0049ff', fontWeight: 600, cursor: 'pointer' }}>
                ↺ Recargar
              </button>
            </div>
          </div>
          <div ref={previewBoxRef} style={{ position: 'relative', height: PREVIEW_H, background: '#eef0f4', overflow: 'hidden' }}>
            <iframe ref={iframeRef} src="/" style={{ position: 'absolute', top: 0, left: previewLeft, width: conf.vp, height: PREVIEW_H / conf.scale, border: 'none', transformOrigin: 'top left', transform: `scale(${conf.scale})`, boxShadow: vista === 'movil' ? '0 0 0 1px #e5e7eb' : 'none' }} />
          </div>
          <div style={{ padding: '10px 16px' }}>
            <a href="/" target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
              Abrir en pestaña nueva ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
