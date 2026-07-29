'use client'

import { useState } from 'react'

const MOTIVOS_SUGERIDOS = [
  'Información incompleta',
  'Mala calidad de imagen',
  'Producto incorrecto',
  'Falta documentación',
]

type Props = {
  onConfirm: (motivo: string) => void
  onCancel: () => void
  enviando?: boolean
}

export default function MotivoRechazoDialog({ onConfirm, onCancel, enviando }: Props) {
  const [motivo, setMotivo] = useState('')
  const [tocado, setTocado] = useState(false)
  const vacio = !motivo.trim()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>¿Por qué se rechaza?</h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>El motivo es obligatorio y se le notifica al proveedor.</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {MOTIVOS_SUGERIDOS.map(m => (
            <button key={m} type="button" onClick={() => setMotivo(m)}
              style={{ background: motivo === m ? '#252855' : '#f3f4f6', color: motivo === m ? '#fff' : '#374151', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {m}
            </button>
          ))}
        </div>

        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          onBlur={() => setTocado(true)}
          rows={3}
          placeholder="Escribe el motivo del rechazo..."
          style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${tocado && vacio ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
        {tocado && vacio && <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, margin: '6px 0 0' }}>El motivo no puede quedar vacío</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Cancelar
          </button>
          <button
            onClick={() => { setTocado(true); if (!vacio) onConfirm(motivo.trim()) }}
            disabled={enviando}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1 }}>
            {enviando ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}
