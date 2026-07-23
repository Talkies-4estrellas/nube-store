'use client'

import { useState, useEffect, useRef } from 'react'

export default function TiendaEnLineaPage() {
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: 0 }}>Diseño</h1>
      </div>

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
  )
}
