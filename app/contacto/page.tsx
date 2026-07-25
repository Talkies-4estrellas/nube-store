'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validation'

const NAVY = '#252855'
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Info = { horario_atencion: string; footer_direccion: string }

export default function ContactoPage() {
  const [info, setInfo] = useState<Info>({ horario_atencion: '', footer_direccion: '' })

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('config_storefront').select('horario_atencion, footer_direccion').eq('id', 1).single()
      .then(({ data }) => { if (data) setInfo(data) })
  }, [])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    if (!isValidEmail(email)) { setError('El email no es válido'); return }
    if (!mensaje.trim()) { setError('Escribe tu mensaje'); return }

    setEnviando(true)
    const { error: errIns } = await supabase.from('mensajes_contacto').insert({
      nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() || null, mensaje: mensaje.trim(),
    })
    setEnviando(false)
    if (errIns) { setError('No se pudo enviar tu mensaje. Intenta de nuevo.'); return }

    setEnviado(true)
    setNombre(''); setEmail(''); setTelefono(''); setMensaje('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
          ← Volver a la tienda
        </a>

        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 10 }}>Contacto</h1>

          {(info.horario_atencion || info.footer_direccion) && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {info.horario_atencion && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Horario de atención:</strong> {info.horario_atencion}</p>}
              {info.footer_direccion && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Domicilio fiscal:</strong> {info.footer_direccion}</p>}
            </div>
          )}

          {enviado ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 52, height: 52, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>¡Mensaje enviado!</p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Te responderemos lo antes posible.</p>
              <button type="button" onClick={() => setEnviado(false)}
                style={{ marginTop: 16, background: 'none', border: 'none', color: NAVY, fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" disabled={enviando} />
              </div>
              <div>
                <label style={lbl}>Correo electrónico</label>
                <input type="email" style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" disabled={enviando} />
              </div>
              <div>
                <label style={lbl}>Teléfono <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
                <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="55 1234 5678" disabled={enviando} />
              </div>
              <div>
                <label style={lbl}>Mensaje</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 100 }} value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="¿En qué te ayudamos?" disabled={enviando} />
              </div>

              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</div>
              )}

              <button type="submit" disabled={enviando}
                style={{ background: enviando ? '#9ca3af' : NAVY, color: '#fff', border: 'none', padding: '13px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: enviando ? 'default' : 'pointer' }}>
                {enviando ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
