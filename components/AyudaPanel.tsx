'use client'

import { useState, useEffect } from 'react'
import { PREGUNTAS, type Pregunta } from '@/lib/preguntasFrecuentes'

const PANEL_WIDTH = 340

const NAVY = '#252855'
const BLUE = '#0049ff'

const CATEGORIAS = Array.from(new Set(PREGUNTAS.map(p => p.categoria)))

export default function AyudaPanel() {
  const [abierto, setAbierto] = useState(false)
  const [activa, setActiva] = useState<Pregunta | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaRespuesta, setIaRespuesta] = useState('')
  const [iaError, setIaError] = useState('')

  const normalizada = busqueda.trim().toLowerCase()
  const buscando = normalizada.length > 0
  const resultados = buscando
    ? PREGUNTAS.filter(p => `${p.pregunta} ${p.explicacion} ${p.confusion}`.toLowerCase().includes(normalizada))
    : null

  async function preguntarIA() {
    if (!normalizada) return
    setIaLoading(true)
    setIaError('')
    setIaRespuesta('')
    try {
      const res = await fetch('/api/ia/preguntar-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: busqueda }),
      })
      const data = await res.json()
      if (!res.ok || !data.respuesta) { setIaError(data.error || 'No se pudo obtener respuesta'); return }
      setIaRespuesta(data.respuesta)
    } catch {
      setIaError('No se pudo conectar con el servicio de IA')
    } finally {
      setIaLoading(false)
    }
  }

  // En vez de flotar encima del contenido (tapando las tarjetas de abajo),
  // el panel empuja el contenido de la página hacia la izquierda mientras
  // está abierto, reservándose su propio espacio fijo a la derecha. En
  // ventanas angostas no hay espacio real que "liberar" empujando —forzarlo
  // ahí rompía el layout del Dashboard (todo se apachurraba)—, así que por
  // debajo de cierto ancho el panel vuelve a flotar como overlay normal.
  const [empujar, setEmpujar] = useState(true)
  useEffect(() => {
    function actualizar() { setEmpujar(window.innerWidth >= 1100) }
    actualizar()
    window.addEventListener('resize', actualizar)
    return () => window.removeEventListener('resize', actualizar)
  }, [])
  useEffect(() => {
    document.body.style.transition = 'padding-right 0.22s ease'
    document.body.style.paddingRight = abierto && empujar ? `${PANEL_WIDTH}px` : ''
    return () => { document.body.style.paddingRight = '' }
  }, [abierto, empujar])

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setAbierto(v => !v)} title="Ayuda del panel"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: '1px solid #e5e7eb', background: abierto ? NAVY : '#fff', color: abierto ? '#fff' : '#374151', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
        ?
      </button>

      {abierto && !empujar && (
        <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: PANEL_WIDTH, overflowY: 'auto',
        background: '#fff', borderLeft: '1px solid #e5e7eb', boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
        zIndex: 200, padding: 8, transform: abierto ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
        transition: 'transform 0.22s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Preguntas frecuentes del panel</p>
          <button onClick={() => setAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Búsqueda local instantánea sobre las preguntas ya redactadas —
            gratis y sin depender de nada externo. Si el usuario no
            encuentra lo que busca, puede pedirle a la IA con el botón de
            abajo (bajo demanda, nunca automático, para no gastar cuota). */}
        <div style={{ padding: '0 10px 10px' }}>
          <input type="text" value={busqueda} onChange={e => { setBusqueda(e.target.value); setIaRespuesta(''); setIaError('') }}
            placeholder="Escribe tu pregunta..."
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {buscando ? (
          <div>
            {resultados!.length > 0 ? (
              resultados!.map(p => (
                <button key={p.pregunta} onClick={() => setActiva(p)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', lineHeight: 1.35 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                  {p.pregunta}
                </button>
              ))
            ) : (
              <p style={{ fontSize: 12, color: '#9ca3af', padding: '4px 10px 10px' }}>Ninguna pregunta guardada coincide con eso.</p>
            )}

            <div style={{ padding: '4px 10px 10px' }}>
              <button onClick={preguntarIA} disabled={iaLoading}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px dashed ${BLUE}`, background: `${BLUE}0d`, color: BLUE, fontSize: 12, fontWeight: 700, cursor: iaLoading ? 'default' : 'pointer' }}>
                {iaLoading ? 'Preguntando a la IA...' : '✨ ¿Ninguna responde tu duda? Pregúntale a la IA'}
              </button>
              {iaError && <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{iaError}</p>}
              {iaRespuesta && (
                <div style={{ marginTop: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', margin: '0 0 4px' }}>✨ Respuesta de la IA</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{iaRespuesta}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          CATEGORIAS.map(cat => (
            <div key={cat}>
              <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, padding: '8px 10px 2px', margin: 0 }}>{cat}</p>
              {PREGUNTAS.filter(p => p.categoria === cat).map(p => (
                <button key={p.pregunta} onClick={() => setActiva(p)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', lineHeight: 1.35 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                  {p.pregunta}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {activa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setActiva(null) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, margin: '0 0 4px' }}>{activa.categoria}</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>{activa.pregunta}</h3>
              </div>
              <button onClick={() => setActiva(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ padding: '18px 24px 24px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, margin: '0 0 16px' }}>{activa.explicacion}</p>

              <p style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>⚠️ Confusión común</p>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>{activa.confusion}</p>
                <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55, margin: 0 }}><strong>¿Por qué pasa?</strong> {activa.porQuePasa}</p>
                <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.55, margin: 0 }}><strong>Posible solución:</strong> {activa.solucion}</p>
              </div>

              <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>✅ Cómo hacerlo</p>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'decimal' }}>
                {activa.tutorial.map((paso, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, display: 'list-item' }}>{paso}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
