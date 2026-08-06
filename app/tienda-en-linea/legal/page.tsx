'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const ta: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
  resize: 'vertical', minHeight: 100,
}
/** Fusiona con los valores por defecto sin dejar pasar `null` — las columnas
 * opcionales que nunca se llenaron vienen `null` desde Supabase, y un
 * `<input>` controlado no acepta `value={null}` (React se queja en consola). */
function conDefaults<T extends object>(defaults: T, data: Partial<Record<keyof T, unknown>>): T {
  const resultado = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const val = data[key]
    if (val !== null && val !== undefined) resultado[key] = val as T[keyof T]
  }
  return resultado
}

type Fields = { politica_envio: string; politica_devolucion: string; terminos: string; quienes_somos: string }
const DEFAULTS: Fields = { politica_envio: '', politica_devolucion: '', terminos: '', quienes_somos: '' }

type PreguntaFrecuente = { pregunta: string; respuesta: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}

const secciones = [
  {
    key: 'politica_envio' as const,
    label: 'Política de envíos',
    icon: '🚚',
    placeholder: 'Ej: Los pedidos se procesan en 1-2 días hábiles. El envío estándar tarda de 3 a 5 días. Hacemos envíos a toda la república...',
    hint: 'Aparece en la sección Soporte de la tienda bajo "Envío y entrega".',
  },
  {
    key: 'politica_devolucion' as const,
    label: 'Política de devoluciones',
    icon: '↩️',
    placeholder: 'Ej: Aceptamos devoluciones dentro de los 30 días posteriores a la entrega. El producto debe estar en su empaque original...',
    hint: 'Aparece en la sección Soporte bajo "Cambios y devoluciones".',
  },
  {
    key: 'terminos' as const,
    label: 'Términos y condiciones',
    icon: '📄',
    placeholder: 'Ej: Al realizar una compra en nuestra tienda, aceptas los siguientes términos y condiciones de uso...',
    hint: 'Página pública en /terminos, enlazada desde el pie de página.',
  },
  {
    key: 'quienes_somos' as const,
    label: 'Quienes somos',
    icon: '🏢',
    placeholder: 'Ej: Somos una empresa familiar con más de 30 años conectando personas a través de envíos confiables...',
    hint: 'Página pública en /quienes-somos, enlazada desde el pie de página.',
  },
]

export default function LegalPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [faq, setFaq] = useState<PreguntaFrecuente[]>([])
  const [savingFaq, setSavingFaq] = useState(false)
  const [savedFaq, setSavedFaq] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('politica_envio,politica_devolucion,terminos,quienes_somos,preguntas_frecuentes').eq('id', 1).single()
      .then(({ data }) => {
        if (data) setF(conDefaults(DEFAULTS, data))
        if (Array.isArray(data?.preguntas_frecuentes)) setFaq(data.preguntas_frecuentes)
      })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function agregarPregunta() {
    setFaq(prev => [...prev, { pregunta: '', respuesta: '' }])
  }
  function actualizarPregunta(i: number, campo: keyof PreguntaFrecuente, val: string) {
    setFaq(prev => { const f2 = [...prev]; f2[i] = { ...f2[i], [campo]: val }; return f2 })
  }
  function eliminarPregunta(i: number) {
    setFaq(prev => prev.filter((_, idx) => idx !== i))
  }
  async function guardarFaq() {
    setSavingFaq(true)
    await supabase.from('config_storefront').upsert({ id: 1, preguntas_frecuentes: faq, updated_at: new Date().toISOString() })
    setSavingFaq(false); setSavedFaq(true)
    setTimeout(() => setSavedFaq(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Legal / Envíos</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Textos legales y políticas que aparecen en la sección de Soporte y el pie de la tienda.</p>

        {secciones.map(s => (
          <div key={s.key} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{s.hint}</p>
              </div>
              {f[s.key] && (
                <span style={{ marginLeft: 'auto', background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  Configurado
                </span>
              )}
            </div>
            <textarea style={ta} value={f[s.key]} onChange={e => set(s.key, e.target.value)} placeholder={s.placeholder} />
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

        {/* ---- Preguntas frecuentes ---- */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>❓</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Preguntas frecuentes</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Página pública en /preguntas-frecuentes, enlazada desde el pie de página.</p>
              </div>
            </div>
            <button type="button" onClick={agregarPregunta}
              style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Agregar pregunta
            </button>
          </div>

          {faq.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Todavía no agregaste ninguna pregunta.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {faq.map((p, i) => (
                <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={inp} value={p.pregunta} onChange={e => actualizarPregunta(i, 'pregunta', e.target.value)} placeholder="Pregunta" />
                    <button type="button" onClick={() => eliminarPregunta(i)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                      🗑
                    </button>
                  </div>
                  <textarea style={{ ...ta, minHeight: 60 }} value={p.respuesta} onChange={e => actualizarPregunta(i, 'respuesta', e.target.value)} placeholder="Respuesta" />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={guardarFaq} disabled={savingFaq} style={{
              background: savedFaq ? '#059669' : NAVY, color: '#fff', border: 'none',
              padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
            }}>
              {savingFaq ? 'Guardando...' : savedFaq ? '¡Guardado!' : 'Guardar preguntas'}
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>¿Dónde aparece?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {secciones.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: NAVY }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{s.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, margin: 0 }}>Estado actual</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {secciones.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#374151' }}>{s.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: f[s.key] ? '#d1fae5' : '#f3f4f6', color: f[s.key] ? '#065f46' : '#9ca3af' }}>
                  {f[s.key] ? 'OK' : 'Vacío'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          Abrir tienda ↗
        </a>
      </div>
    </div>
  )
}
