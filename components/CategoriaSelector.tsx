'use client'

import { useEffect, useMemo, useState } from 'react'

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

/** Input de texto con autocompletado — sugiere las opciones existentes mientras se escribe. */
function ComboBox({ query, onQueryChange, opciones, onSeleccionar, onCerrar, placeholder, borderColor, sinResultadosHint }: {
  query: string
  onQueryChange: (v: string) => void
  opciones: { id: number; nombre: string }[]
  onSeleccionar: (op: { id: number; nombre: string }) => void
  onCerrar: () => void
  placeholder: string
  borderColor?: string
  sinResultadosHint?: string
}) {
  const [abierto, setAbierto] = useState(false)

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return opciones
    return opciones.filter(o => o.nombre.toLowerCase().includes(q))
  }, [opciones, query])

  function cerrar() {
    setAbierto(false)
    onCerrar()
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={e => { onQueryChange(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') cerrar()
          if (e.key === 'Enter' && filtradas.length === 1) { e.preventDefault(); onSeleccionar(filtradas[0]); setAbierto(false) }
        }}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...inputStyle, borderColor: borderColor ?? '#e5e7eb' }}
      />
      {abierto && (
        <>
          <div onClick={cerrar} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 31,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
          }}>
            {filtradas.length === 0 ? (
              <p style={{ margin: 0, padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
                {sinResultadosHint ?? 'Sin coincidencias'}
              </p>
            ) : (
              filtradas.map(op => (
                <button key={op.id} type="button"
                  onMouseDown={e => { e.preventDefault(); onSeleccionar(op); setAbierto(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: '#111',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                  {op.nombre}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

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

  const hijoActual = useMemo(() => {
    const idNum = Number(value)
    if (!idNum || !padreActual) return null
    return padreActual.hijos.find(h => h.id === idNum) ?? null
  }, [padreActual, value])

  // Texto mostrado en cada combobox — se sincroniza con la selección real
  const [padreQuery, setPadreQuery] = useState(padreActual?.nombre ?? '')
  const [hijoQuery, setHijoQuery] = useState(hijoActual?.nombre ?? '')
  useEffect(() => { setPadreQuery(padreActual?.nombre ?? '') }, [padreActual])
  useEffect(() => { setHijoQuery(hijoActual?.nombre ?? '') }, [hijoActual])

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
            <ComboBox
              query={padreQuery}
              onQueryChange={setPadreQuery}
              opciones={arbol}
              onSeleccionar={op => onChange(String(op.id))}
              onCerrar={() => setPadreQuery(padreActual?.nombre ?? '')}
              placeholder="Escribe para buscar una categoría..."
              borderColor={error ? '#dc2626' : undefined}
              sinResultadosHint='No existe — usa "+ Nueva" para crearla'
            />
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
              <ComboBox
                query={hijoQuery}
                onQueryChange={setHijoQuery}
                opciones={[{ id: padreActual.id, nombre: '— Sin subcategoría —' }, ...padreActual.hijos]}
                onSeleccionar={op => onChange(op.id === padreActual.id ? String(padreActual.id) : String(op.id))}
                onCerrar={() => setHijoQuery(hijoActual?.nombre ?? '')}
                placeholder="Escribe para buscar una subcategoría..."
                sinResultadosHint='No existe — usa "+ Nueva" para crearla'
              />
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
