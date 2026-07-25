'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'

type Pregunta = { pregunta: string; respuesta: string }

export default function PreguntasFrecuentesPage() {
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null)
  const [abierta, setAbierta] = useState<number | null>(0)

  useEffect(() => {
    supabase.from('config_storefront').select('preguntas_frecuentes').eq('id', 1).single()
      .then(({ data }) => setPreguntas(Array.isArray(data?.preguntas_frecuentes) ? data.preguntas_frecuentes : []))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
          ← Volver a la tienda
        </a>

        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 20 }}>Preguntas frecuentes</h1>

          {preguntas === null ? (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Cargando...</p>
          ) : preguntas.length === 0 ? (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Todavía no hay preguntas frecuentes publicadas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {preguntas.map((p, i) => {
                const abiertaAhora = abierta === i
                return (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setAbierta(abiertaAhora ? null : i)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{p.pregunta}</span>
                      <span style={{ fontSize: 14, color: '#9ca3af', transform: abiertaAhora ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
                    </button>
                    {abiertaAhora && (
                      <p style={{ margin: 0, padding: '0 16px 16px', fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{p.respuesta}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
