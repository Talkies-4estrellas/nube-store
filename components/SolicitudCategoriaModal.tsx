'use client'

import { useState } from 'react'
import type { CategoriaConHijos } from '@/components/CategoriaSelector'

const NAVY = '#252855'
const PINK = '#e7226d'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Props = {
  arbol: CategoriaConHijos[]
  onClose: () => void
  onEnviar: (data: { nombre: string; parentId: number | null }) => Promise<string | void>
}

export default function SolicitudCategoriaModal({ arbol, onClose, onEnviar }: Props) {
  const [tipo, setTipo] = useState<'padre' | 'hija'>('padre')
  const [parentId, setParentId] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit() {
    if (!nombre.trim()) { setError('Escribe el nombre de la categoría'); return }
    if (tipo === 'hija' && !parentId) { setError('Elige a qué categoría pertenece'); return }
    setEnviando(true)
    const err = await onEnviar({ nombre: nombre.trim(), parentId: tipo === 'hija' ? Number(parentId) : null })
    setEnviando(false)
    if (err) { setError(err); return }
    setEnviado(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {enviado ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 6 }}>Solicitud enviada</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              El admin va a revisar "{nombre}" — en cuanto la apruebe, va a aparecer disponible para elegirla en tus productos.
            </p>
            <button type="button" onClick={onClose}
              style={{ width: '100%', background: NAVY, color: '#fff', border: 'none', padding: '11px 0', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Listo
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Solicitar categoría</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>El admin debe aprobarla antes de que puedas usarla.</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div>
                <label style={labelStyle}>¿Qué necesitas?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setTipo('padre')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '2px solid',
                    borderColor: tipo === 'padre' ? PINK : '#e5e7eb',
                    background: tipo === 'padre' ? '#fdf2f6' : '#fff',
                    color: tipo === 'padre' ? PINK : '#374151',
                  }}>Categoría nueva</button>
                  <button type="button" onClick={() => setTipo('hija')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '2px solid',
                    borderColor: tipo === 'hija' ? PINK : '#e5e7eb',
                    background: tipo === 'hija' ? '#fdf2f6' : '#fff',
                    color: tipo === 'hija' ? PINK : '#374151',
                  }}>Subcategoría</button>
                </div>
              </div>

              {tipo === 'hija' && (
                <div>
                  <label style={labelStyle}>Subcategoría de...</label>
                  <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">— Elige una categoría —</option>
                    {arbol.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={labelStyle}>Nombre de la {tipo === 'hija' ? 'subcategoría' : 'categoría'}</label>
                <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder={tipo === 'hija' ? 'Ej: Sandalias' : 'Ej: Papelería'} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={enviando} style={{ background: enviando ? '#f472b6' : PINK, color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {enviando ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
