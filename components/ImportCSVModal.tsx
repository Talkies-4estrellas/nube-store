'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV } from '@/lib/csv'

const NAVY = '#252855'
const BLUE = '#0049ff'
const GREEN = '#059669'
const RED = '#dc2626'
const AMBER = '#d97706'

type Props = {
  onClose: () => void
  onDone: () => void
  existingSkus: Set<string>
}

type Fila = {
  sku: string
  nombre: string
  precio: string
  stock: string
  categoria: string
  descripcion: string
  imagen_url: string
  detalles: string
  // análisis
  valido: boolean
  motivo: string
  accion: 'nuevo' | 'actualizar'
}

// Lee un valor de una fila sin importar mayúsculas/espacios en el encabezado
function val(row: Record<string, string>, key: string): string {
  const found = Object.keys(row).find(k => k.trim().toLowerCase() === key)
  return (found ? row[found] : '').trim()
}

export default function ImportCSVModal({ onClose, onDone, existingSkus }: Props) {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; errores: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function analizar(rows: Record<string, string>[]): Fila[] {
    return rows.map(r => {
      const sku = val(r, 'sku')
      const nombre = val(r, 'nombre')
      const precio = val(r, 'precio')
      const precioNum = parseFloat(precio.replace(',', '.'))

      const faltantes: string[] = []
      if (!sku) faltantes.push('SKU')
      if (!nombre) faltantes.push('nombre')
      if (!precio || isNaN(precioNum) || precioNum < 0) faltantes.push('precio')

      return {
        sku, nombre, precio,
        stock: val(r, 'stock'),
        categoria: val(r, 'categoria'),
        descripcion: val(r, 'descripcion'),
        imagen_url: val(r, 'imagen_url'),
        detalles: val(r, 'detalles'),
        valido: faltantes.length === 0,
        motivo: faltantes.length ? `Falta: ${faltantes.join(', ')}` : '',
        accion: existingSkus.has(sku) ? 'actualizar' : 'nuevo',
      }
    })
  }

  function onFile(file: File) {
    setErrorMsg(''); setResultado(null)
    setNombreArchivo(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result))
        if (rows.length === 0) { setErrorMsg('El archivo no tiene filas de datos.'); setFilas(null); return }
        setFilas(analizar(rows))
      } catch {
        setErrorMsg('No se pudo leer el archivo. Verifica que sea un CSV válido.')
        setFilas(null)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function importar() {
    if (!filas) return
    const validas = filas.filter(f => f.valido)
    if (validas.length === 0) return
    setImportando(true)
    setErrorMsg('')

    try {
      // 1. Buscar o crear categorías por nombre
      const nombresCat = Array.from(new Set(validas.map(f => f.categoria).filter(Boolean)))
      const mapaCat = new Map<string, number>()
      if (nombresCat.length) {
        const { data: existentes } = await supabase.from('categorias').select('id, nombre').in('nombre', nombresCat)
        existentes?.forEach(c => mapaCat.set(c.nombre, c.id))
        const faltan = nombresCat.filter(n => !mapaCat.has(n))
        if (faltan.length) {
          const { data: nuevas } = await supabase
            .from('categorias')
            .insert(faltan.map(nombre => ({ nombre })))
            .select('id, nombre')
          nuevas?.forEach(c => mapaCat.set(c.nombre, c.id))
        }
      }

      // 2. Construir payloads
      const payloads = validas.map(f => {
        const p: Record<string, unknown> = {
          sku: f.sku,
          nombre: f.nombre,
          precio: parseFloat(f.precio.replace(',', '.')),
          stock: f.stock ? parseInt(f.stock) || 0 : 0,
          categoria_id: f.categoria ? (mapaCat.get(f.categoria) ?? null) : null,
          descripcion: f.descripcion || null,
        }
        if (f.imagen_url) p.imagen_url = f.imagen_url
        if (f.detalles) {
          try { p.detalles = JSON.parse(f.detalles) } catch { /* ignorar detalles inválidos */ }
        }
        return p
      })

      // 3. Upsert por SKU (crea nuevos, actualiza existentes)
      const { error } = await supabase.from('productos').upsert(payloads, { onConflict: 'sku' })
      if (error) { setErrorMsg(`Error al importar: ${error.message}`); setImportando(false); return }

      const actualizados = validas.filter(f => f.accion === 'actualizar').length
      setResultado({
        creados: validas.length - actualizados,
        actualizados,
        errores: filas.length - validas.length,
      })
      onDone()
    } catch (e) {
      setErrorMsg(`Error inesperado: ${e instanceof Error ? e.message : 'desconocido'}`)
    } finally {
      setImportando(false)
    }
  }

  const validas = filas?.filter(f => f.valido).length ?? 0
  const invalidas = filas ? filas.length - validas : 0
  const nuevos = filas?.filter(f => f.valido && f.accion === 'nuevo').length ?? 0
  const actualizar = filas?.filter(f => f.valido && f.accion === 'actualizar').length ?? 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Importar productos desde CSV</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          {resultado ? (
            /* ---- Resultado final ---- */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 60, height: 60, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Importación completada</h3>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <span style={{ background: '#dcfce7', color: GREEN, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.creados} creados</span>
                <span style={{ background: '#dbeafe', color: BLUE, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.actualizados} actualizados</span>
                {resultado.errores > 0 && (
                  <span style={{ background: '#fef3c7', color: AMBER, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.errores} omitidos</span>
                )}
              </div>
              <button onClick={onClose} style={{ marginTop: 24, background: NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
            </div>
          ) : !filas ? (
            /* ---- Selección de archivo ---- */
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: NAVY }}>Selecciona un archivo CSV</p>
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Debe incluir al menos las columnas: <strong>sku, nombre, precio</strong></p>
              </div>
              <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#1e40af' }}>
                💡 Tip: usa <strong>Exportar CSV</strong> primero para obtener la plantilla con el formato exacto, edítala en Excel y vuelve a importarla.
              </div>
              {errorMsg && <p style={{ marginTop: 12, color: RED, fontSize: 13, fontWeight: 600 }}>{errorMsg}</p>}
            </>
          ) : (
            /* ---- Vista previa + validación ---- */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>📄 {nombreArchivo}</span>
                <span style={{ marginLeft: 'auto', background: '#dcfce7', color: GREEN, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{nuevos} nuevos</span>
                <span style={{ background: '#dbeafe', color: BLUE, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{actualizar} actualizar</span>
                {invalidas > 0 && <span style={{ background: '#fef3c7', color: AMBER, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{invalidas} con problemas</span>}
              </div>

              {invalidas > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 14 }}>
                  ⚠️ {invalidas} fila{invalidas > 1 ? 's serán omitidas' : ' será omitida'} por falta de datos requeridos (SKU, nombre o precio). El resto se importará normalmente.
                </div>
              )}

              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#6b7280' }}>SKU</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#6b7280' }}>Nombre</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, color: '#6b7280' }}>Precio</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, color: '#6b7280' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 100).map((f, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: f.valido ? '#fff' : '#fffbeb' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#374151' }}>{f.sku || '—'}</td>
                        <td style={{ padding: '7px 12px', color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre || '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#374151' }}>{f.precio || '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          {!f.valido
                            ? <span title={f.motivo} style={{ color: AMBER, fontWeight: 700 }}>⚠️ {f.motivo}</span>
                            : f.accion === 'nuevo'
                              ? <span style={{ color: GREEN, fontWeight: 700 }}>Nuevo</span>
                              : <span style={{ color: BLUE, fontWeight: 700 }}>Actualizar</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filas.length > 100 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Mostrando las primeras 100 de {filas.length} filas. Se importarán todas las válidas.</p>}
              {errorMsg && <p style={{ marginTop: 12, color: RED, fontSize: 13, fontWeight: 600 }}>{errorMsg}</p>}
            </>
          )}
        </div>

        {/* Acciones */}
        {filas && !resultado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
            <button onClick={() => { setFilas(null); setNombreArchivo('') }} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Elegir otro archivo</button>
            <button onClick={importar} disabled={importando || validas === 0}
              style={{ background: validas === 0 ? '#93c5fd' : BLUE, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: importando || validas === 0 ? 'not-allowed' : 'pointer' }}>
              {importando ? 'Importando...' : `Importar ${validas} producto${validas !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
