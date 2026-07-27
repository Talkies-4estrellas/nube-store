'use client'

import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarMensaje, marcarLeidos, type Mensaje, type TipoRemitente } from '@/lib/mensajeria'

const NAVY = '#252855'

type Props = {
  supabase: SupabaseClient
  conversacionId: string
  remitenteTipo: TipoRemitente
  remitenteEmail: string
  remitenteNombre: string
  accent?: string
}

export default function ChatPanel({ supabase, conversacionId, remitenteTipo, remitenteEmail, remitenteNombre, accent = NAVY }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    supabase.from('mensajes').select('*').eq('conversacion_id', conversacionId).order('created_at')
      .then(({ data }) => {
        if (cancelado) return
        setMensajes(data ?? [])
        setCargando(false)
        marcarLeidos(supabase, conversacionId, remitenteTipo)
      })

    const canal = supabase
      .channel(`mensajes-${conversacionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${conversacionId}` }, ({ new: nuevo }) => {
        setMensajes(prev => prev.some(m => m.id === (nuevo as Mensaje).id) ? prev : [...prev, nuevo as Mensaje])
        if ((nuevo as Mensaje).remitente_tipo !== remitenteTipo) marcarLeidos(supabase, conversacionId, remitenteTipo)
      })
      .subscribe()

    return () => { cancelado = true; supabase.removeChannel(canal) }
  }, [conversacionId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    const ok = await enviarMensaje(supabase, { conversacionId, remitenteTipo, remitenteEmail, remitenteNombre, texto: limpio })
    setEnviando(false)
    if (ok) setTexto('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 420, background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f9fafb' }}>
        {cargando ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>Cargando mensajes...</p>
        ) : mensajes.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>Todavía no hay mensajes. Escribe el primero.</p>
        ) : (
          mensajes.map(m => {
            const esPropio = m.remitente_tipo === remitenteTipo
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: esPropio ? 'flex-end' : 'flex-start' }}>
                {!esPropio && (
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, margin: '0 4px 3px' }}>{m.remitente_nombre || m.remitente_email}</span>
                )}
                <div style={{
                  maxWidth: '78%', padding: '9px 13px', borderRadius: 14,
                  borderBottomRightRadius: esPropio ? 4 : 14, borderBottomLeftRadius: esPropio ? 14 : 4,
                  background: esPropio ? accent : '#fff', color: esPropio ? '#fff' : '#111',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', boxShadow: esPropio ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                }}>
                  {m.texto}
                </div>
                <span style={{ fontSize: 10, color: '#9ca3af', margin: '3px 4px 0' }}>
                  {new Date(m.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      <form onSubmit={handleEnviar} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #e5e7eb', background: '#fff' }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={enviando}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 999, fontSize: 13, outline: 'none' }}
        />
        <button type="submit" disabled={enviando || !texto.trim()}
          style={{ background: accent, color: '#fff', border: 'none', padding: '0 20px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: enviando ? 'default' : 'pointer', opacity: texto.trim() ? 1 : 0.6 }}>
          Enviar
        </button>
      </form>
    </div>
  )
}
