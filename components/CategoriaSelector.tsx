'use client'

import { useMemo, useState } from 'react'

export type CategoriaHijo = { id: number; nombre: string }
export type CategoriaConHijos = { id: number; nombre: string; hijos: CategoriaHijo[] }

type Props = {
  arbol: CategoriaConHijos[]
  value: string
  onChange: (id: string) => void
  onCrear: (nombre: string, parentId: number | null) => Promise<{ id: number; nombre: string } | null>
  error?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fff', color: '#111', boxSizing: 'border-box',
}
const btnSecundario: React.CSSProperties = {
  padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151',
}
const btnGuardar: React.CSSProperties = {
  padding: '9px 14px', border: 'none', borderRadius: 8, background: '#0049ff', color: '#fff',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

export default function CategoriaSelector({ arbol, value, onChange, onCrear, error }: Props) {
  const [nuevoPadreMode, setNuevoPadreMode] = useState(false)
  const [nuevoPadreNombre, setNuevoPadreNombre] = useState('')
  const [nuevoHijoMode, setNuevoHijoMode] = useState(false)
  const [nuevoHijoNombre, setNuevoHijoNombre] = useState('')
  const [creando, setCreando] = useState(false)

  const padreActual = useMemo(() => {
    const idNum = Number(value)
    if (!idNum) return null
    const comoPadre = arbol.find(p => p.id === idNum)
    if (comoPadre) return comoPadre
    return arbol.find(p => p.hijos.some(h => h.id === idNum)) ?? null
  }, [arbol, value])

  const hijoActualId = useMemo(() => {
    const idNum = Number(value)
    if (!idNum || !padreActual) return ''
    return padreActual.hijos.some(h => h.id === idNum) ? String(idNum) : ''
  }, [padreActual, value])

  async function crear(nombre: string, parentId: number | null) {
    if (!nombre.trim()) return
    setCreando(true)
    const nueva = await onCrear(nombre, parentId)
    setCreando(false)
    if (!nueva) return
    onChange(String(nueva.id))
    if (parentId === null) { setNuevoPadreMode(false); setNuevoPadreNombre('') }
    else { setNuevoHijoMode(false); setNuevoHijoNombre('') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Categoría</label>
        {!nuevoPadreMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={padreActual ? String(padreActual.id) : ''}
              onChange={e => onChange(e.target.value)}
              style={{ ...inputStyle, borderColor: error ? '#dc2626' : '#e5e7eb', flex: 1, cursor: 'pointer' }}
            >
              <option value="">Selecciona una categoría</option>
              {arbol.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <button type="button" onClick={() => setNuevoPadreMode(true)} style={btnSecundario}>+ Nueva</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus value={nuevoPadreNombre} disabled={creando}
              onChange={e => setNuevoPadreNombre(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); crear(nuevoPadreNombre, null) }
                if (e.key === 'Escape') setNuevoPadreMode(false)
              }}
              placeholder="Nombre de la nueva categoría..." style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={() => crear(nuevoPadreNombre, null)} disabled={creando} style={btnGuardar}>
              {creando ? '...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setNuevoPadreMode(false); setNuevoPadreNombre('') }} style={btnSecundario}>×</button>
          </div>
        )}
        {error && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'block', marginTop: 6 }}>{error}</span>}
      </div>

      {padreActual && (
        <div>
          <label style={labelStyle}>Subcategoría <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
          {!nuevoHijoMode ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={hijoActualId}
                onChange={e => onChange(e.target.value || String(padreActual.id))}
                style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
              >
                <option value="">— Sin subcategoría —</option>
                {padreActual.hijos.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
              </select>
              <button type="button" onClick={() => setNuevoHijoMode(true)} style={btnSecundario}>+ Nueva</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus value={nuevoHijoNombre} disabled={creando}
                onChange={e => setNuevoHijoNombre(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); crear(nuevoHijoNombre, padreActual.id) }
                  if (e.key === 'Escape') setNuevoHijoMode(false)
                }}
                placeholder="Nombre de la subcategoría..." style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => crear(nuevoHijoNombre, padreActual.id)} disabled={creando} style={btnGuardar}>
                {creando ? '...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => { setNuevoHijoMode(false); setNuevoHijoNombre('') }} style={btnSecundario}>×</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
