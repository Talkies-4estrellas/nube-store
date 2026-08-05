'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validation'

const NAVY = '#252855'
const PINK = '#e7226d'

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

export default function RegistroProveedorPage() {
  const [cargando, setCargando] = useState(true)
  const [activo, setActivo] = useState(false)

  const [nombreContacto, setNombreContacto] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [categoriaInteres, setCategoriaInteres] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [sitioORedes, setSitioORedes] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('registro_proveedor_activo').eq('id', 1).single()
      .then(({ data }) => {
        setActivo(!!data?.registro_proveedor_activo)
        setCargando(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombreContacto.trim()) { setError('Escribe tu nombre'); return }
    if (!isValidEmail(email)) { setError('El email no es válido'); return }

    setEnviando(true)
    const { error: insertError } = await supabase.from('solicitudes_registro_proveedor').insert({
      nombre_contacto: nombreContacto.trim(),
      email: email.trim(),
      telefono: telefono.trim() || null,
      nombre_negocio: nombreNegocio.trim() || null,
      categoria_interes: categoriaInteres.trim() || null,
      descripcion: descripcion.trim() || null,
      sitio_o_redes: sitioORedes.trim() || null,
    })
    setEnviando(false)

    if (insertError) { setError('No se pudo enviar tu solicitud. Intenta de nuevo.'); return }
    setEnviado(true)
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${NAVY}20`, borderTop: `3px solid ${NAVY}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!activo) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🔒</p>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Formulario no disponible</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            Este registro de proveedores no está abierto en este momento. Si llegaste aquí por una campaña activa, contáctanos directamente.
          </p>
          <a href="/" style={{ display: 'inline-block', marginTop: 20, background: NAVY, color: '#fff', padding: '11px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Ir a la tienda
          </a>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>¡Solicitud enviada!</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            Gracias por tu interés en vender con nosotros. Revisaremos tu información y te contactaremos a <strong>{email}</strong> en los próximos días.
          </p>
          <a href="/" style={{ display: 'inline-block', marginTop: 20, background: NAVY, color: '#fff', padding: '11px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Ir a la tienda
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 60, width: 'auto', marginBottom: 8 }} />
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>Regístrate como proveedor</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '32px 32px 28px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 22px' }}>
            Cuéntanos sobre tu negocio. Un asesor revisará tu solicitud y te contactará para los siguientes pasos.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Nombre completo</label>
              <input style={inp} value={nombreContacto} onChange={e => setNombreContacto(e.target.value)} placeholder="Tu nombre" disabled={enviando} />
            </div>

            <div>
              <label style={lbl}>Email</label>
              <input type="email" style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" disabled={enviando} autoComplete="email" />
            </div>

            <div>
              <label style={lbl}>Teléfono (opcional)</label>
              <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="55 1234 5678" disabled={enviando} />
            </div>

            <div>
              <label style={lbl}>Nombre del negocio (opcional)</label>
              <input style={inp} value={nombreNegocio} onChange={e => setNombreNegocio(e.target.value)} placeholder="Nombre de tu empresa o marca" disabled={enviando} />
            </div>

            <div>
              <label style={lbl}>¿Qué tipo de productos ofreces?</label>
              <input style={inp} value={categoriaInteres} onChange={e => setCategoriaInteres(e.target.value)} placeholder="Ej. Ropa, electrónica, artesanías..." disabled={enviando} />
            </div>

            <div>
              <label style={lbl}>Cuéntanos más sobre tu negocio (opcional)</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Años de experiencia, catálogo, capacidad de envío..." disabled={enviando} />
            </div>

            <div>
              <label style={lbl}>Sitio web o redes sociales (opcional)</label>
              <input style={inp} value={sitioORedes} onChange={e => setSitioORedes(e.target.value)} placeholder="instagram.com/tunegocio" disabled={enviando} />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</div>
            )}

            <button type="submit" disabled={enviando}
              style={{ background: enviando ? '#9ca3af' : PINK, color: '#fff', border: 'none', padding: '13px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: enviando ? 'default' : 'pointer', marginTop: 4 }}>
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
