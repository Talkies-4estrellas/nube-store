'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV, readFileSmart, cleanNumber, stripHtml } from '@/lib/csv'

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

/**
 * Nombres alternos aceptados por columna, en orden de prioridad.
 * Permite importar exports de Tiendanube o el control 2023 sin renombrar nada.
 */
const SINONIMOS: Record<string, string[]> = {
  sku:                ['sku', 'id articulo', 'id artículo'],
  nombre:             ['nombre', 'nombre del articulo', 'nombre del artículo'],
  precio:             ['precio', 'precio de venta con iva', 'precio de venta'],
  precio_promocional: ['precio_promocional', 'precio promocional'],
  costo:              ['costo', 'precio compra sin iva', 'precio de compra sin iva'],
  stock:              ['stock', 'existencia', 'existencias'],
  categoria:          ['categoria', 'categoría', 'categorias', 'categorías'],
  marca:              ['marca'],
  codigo_barras:      ['codigo_barras', 'código de barras', 'codigo de barras'],
  mpn:                ['mpn', 'mpn (número de pieza del fabricante)', 'codigo fabricante', 'código fabricante'],
  descripcion:        ['descripcion', 'descripción'],
  imagen_url:         ['imagen_url', 'imagen', 'url de imagen', 'foto'],
  slug:               ['slug', 'identificador de url'],
  tags:               ['tags', 'etiquetas'],
  seo_titulo:         ['seo_titulo', 'título para seo', 'titulo para seo'],
  seo_descripcion:    ['seo_descripcion', 'descripción para seo', 'descripcion para seo'],
  peso_kg:            ['peso_kg', 'peso (kg)', 'peso'],
  alto_cm:            ['alto_cm', 'alto (cm)', 'alto'],
  ancho_cm:           ['ancho_cm', 'ancho (cm)', 'ancho'],
  profundidad_cm:     ['profundidad_cm', 'profundidad (cm)', 'profundidad'],
  ubicacion:          ['ubicacion', 'ubicación'],
  proveedor:          ['proveedor'],
  activo:             ['activo', 'mostrar en mi tienda en línea', 'mostrar en mi tienda en linea'],
  envio_gratis:       ['envio_gratis', 'envío sin cargo', 'envio sin cargo'],
  detalles:           ['detalles'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Busca el valor de un campo probando todos sus nombres alternos. */
function pick(row: Record<string, string>, campo: string): string {
  const claves = SINONIMOS[campo] ?? [campo]
  const headers = Object.keys(row)
  for (const clave of claves) {
    const found = headers.find(h => norm(h) === clave)
    if (found && row[found]?.trim()) return row[found].trim()
  }
  return ''
}

/** "Papel Picado > Pelota Inflable" -> "Pelota Inflable" */
function categoriaFinal(raw: string): string {
  if (!raw) return ''
  return raw.split('>').pop()!.trim()
}

function esVerdadero(raw: string, porDefecto: boolean): boolean {
  if (!raw) return porDefecto
  return /^(s[ií]|si|yes|true|1|x)$/i.test(raw.trim())
}

type Fila = {
  sku: string; nombre: string; precio: number | null
  precio_promocional: number | null; costo: number | null; stock: number
  categoria: string; marca: string; codigo_barras: string; mpn: string
  descripcion: string; imagen_url: string; slug: string; tags: string
  seo_titulo: string; seo_descripcion: string
  peso_kg: number | null; alto_cm: number | null; ancho_cm: number | null; profundidad_cm: number | null
  ubicacion: string; proveedor: string; activo: boolean; envio_gratis: boolean
  detalles: string
  valido: boolean; motivo: string; accion: 'nuevo' | 'actualizar'
}

export default function ImportCSVModal({ onClose, onDone, existingSkus }: Props) {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [bajarImagenes, setBajarImagenes] = useState(true)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState<{ fase: string; hecho: number; total: number } | null>(null)
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; errores: number; imgFallidas: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function analizar(rows: Record<string, string>[]): Fila[] {
    return rows.map(r => {
      const sku = pick(r, 'sku')
      const nombre = pick(r, 'nombre')
      const precio = cleanNumber(pick(r, 'precio'))

      const faltantes: string[] = []
      if (!sku) faltantes.push('SKU')
      if (!nombre) faltantes.push('nombre')
      if (precio === null || precio < 0) faltantes.push('precio')

      return {
        sku, nombre, precio,
        precio_promocional: cleanNumber(pick(r, 'precio_promocional')),
        costo: cleanNumber(pick(r, 'costo')),
        stock: Math.max(0, Math.round(cleanNumber(pick(r, 'stock')) ?? 0)),
        categoria: categoriaFinal(pick(r, 'categoria')),
        marca: pick(r, 'marca'),
        codigo_barras: pick(r, 'codigo_barras'),
        mpn: pick(r, 'mpn'),
        descripcion: stripHtml(pick(r, 'descripcion')),
        imagen_url: pick(r, 'imagen_url'),
        slug: pick(r, 'slug'),
        tags: pick(r, 'tags'),
        seo_titulo: pick(r, 'seo_titulo'),
        seo_descripcion: pick(r, 'seo_descripcion'),
        peso_kg: cleanNumber(pick(r, 'peso_kg')),
        alto_cm: cleanNumber(pick(r, 'alto_cm')),
        ancho_cm: cleanNumber(pick(r, 'ancho_cm')),
        profundidad_cm: cleanNumber(pick(r, 'profundidad_cm')),
        ubicacion: pick(r, 'ubicacion'),
        proveedor: pick(r, 'proveedor'),
        activo: esVerdadero(pick(r, 'activo'), true),
        envio_gratis: esVerdadero(pick(r, 'envio_gratis'), false),
        detalles: pick(r, 'detalles'),
        valido: faltantes.length === 0,
        motivo: faltantes.length ? `Falta: ${faltantes.join(', ')}` : '',
        accion: existingSkus.has(sku) ? 'actualizar' : 'nuevo',
      }
    })
  }

  async function onFile(file: File) {
    setErrorMsg(''); setResultado(null)
    setNombreArchivo(file.name)
    try {
      const texto = await readFileSmart(file)
      const rows = parseCSV(texto)
      if (rows.length === 0) { setErrorMsg('El archivo no tiene filas de datos.'); setFilas(null); return }
      setFilas(analizar(rows))
    } catch {
      setErrorMsg('No se pudo leer el archivo. Verifica que sea un CSV válido.')
      setFilas(null)
    }
  }

  /** Descarga imágenes por lotes para no saturar el navegador ni el servidor. */
  async function resolverImagenes(validas: Fila[]): Promise<{ mapa: Map<string, string>; fallidas: number }> {
    const conImagen = validas.filter(f => /^https?:\/\//i.test(f.imagen_url))
    const mapa = new Map<string, string>()
    let fallidas = 0
    if (conImagen.length === 0) return { mapa, fallidas }

    const LOTE = 4
    for (let i = 0; i < conImagen.length; i += LOTE) {
      const lote = conImagen.slice(i, i + LOTE)
      await Promise.all(lote.map(async f => {
        try {
          const res = await fetch('/api/productos/importar-imagen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: f.imagen_url, sku: f.sku }),
          })
          const data = await res.json()
          if (res.ok && data.url) mapa.set(f.sku, data.url)
          else fallidas++
        } catch { fallidas++ }
      }))
      setProgreso({ fase: 'Descargando imágenes', hecho: Math.min(i + LOTE, conImagen.length), total: conImagen.length })
    }
    return { mapa, fallidas }
  }

  async function importar() {
    if (!filas) return
    const validas = filas.filter(f => f.valido)
    if (validas.length === 0) return
    setImportando(true)
    setErrorMsg('')

    try {
      // 1. Categorías: buscar o crear
      setProgreso({ fase: 'Preparando categorías', hecho: 0, total: 1 })
      const nombresCat = Array.from(new Set(validas.map(f => f.categoria).filter(Boolean)))
      const mapaCat = new Map<string, number>()
      if (nombresCat.length) {
        const { data: existentes } = await supabase.from('categorias').select('id, nombre').in('nombre', nombresCat)
        existentes?.forEach(c => mapaCat.set(c.nombre, c.id))
        const faltan = nombresCat.filter(n => !mapaCat.has(n))
        if (faltan.length) {
          const { data: nuevas } = await supabase
            .from('categorias').insert(faltan.map(nombre => ({ nombre }))).select('id, nombre')
          nuevas?.forEach(c => mapaCat.set(c.nombre, c.id))
        }
      }

      // 2. Imágenes: descargar y alojar en nuestro Storage
      let mapaImg = new Map<string, string>()
      let imgFallidas = 0
      if (bajarImagenes) {
        const r = await resolverImagenes(validas)
        mapaImg = r.mapa
        imgFallidas = r.fallidas
      }

      // 3. Construir payloads
      setProgreso({ fase: 'Guardando productos', hecho: 0, total: validas.length })
      const payloads = validas.map(f => {
        const p: Record<string, unknown> = {
          sku: f.sku,
          nombre: f.nombre,
          precio: f.precio,
          stock: f.stock,
          categoria_id: f.categoria ? (mapaCat.get(f.categoria) ?? null) : null,
          descripcion: f.descripcion || null,
          activo: f.activo,
          envio_gratis: f.envio_gratis,
        }
        if (f.precio_promocional !== null) p.precio_promocional = f.precio_promocional
        if (f.costo !== null) p.costo = f.costo
        if (f.marca) p.marca = f.marca
        if (f.codigo_barras) p.codigo_barras = f.codigo_barras
        if (f.mpn) p.mpn = f.mpn
        if (f.slug) p.slug = f.slug
        if (f.tags) p.tags = f.tags
        if (f.seo_titulo) p.seo_titulo = f.seo_titulo
        if (f.seo_descripcion) p.seo_descripcion = f.seo_descripcion
        if (f.peso_kg !== null) p.peso_kg = f.peso_kg
        if (f.alto_cm !== null) p.alto_cm = f.alto_cm
        if (f.ancho_cm !== null) p.ancho_cm = f.ancho_cm
        if (f.profundidad_cm !== null) p.profundidad_cm = f.profundidad_cm
        if (f.ubicacion) p.ubicacion = f.ubicacion
        if (f.proveedor) { p.proveedor_nombre = f.proveedor; p.origen = 'proveedor' }

        const img = mapaImg.get(f.sku) || (!bajarImagenes ? f.imagen_url : '')
        if (img) p.imagen_url = img

        if (f.detalles) {
          try { p.detalles = JSON.parse(f.detalles) } catch { /* detalles inválidos: se ignoran */ }
        }
        return p
      })

      // 4. Upsert por SKU en lotes (evita payloads gigantes)
      const LOTE = 200
      for (let i = 0; i < payloads.length; i += LOTE) {
        const { error } = await supabase.from('productos').upsert(payloads.slice(i, i + LOTE), { onConflict: 'sku' })
        if (error) {
          setErrorMsg(`Error al importar: ${error.message}`)
          setImportando(false); setProgreso(null)
          return
        }
        setProgreso({ fase: 'Guardando productos', hecho: Math.min(i + LOTE, payloads.length), total: payloads.length })
      }

      const actualizados = validas.filter(f => f.accion === 'actualizar').length
      setResultado({
        creados: validas.length - actualizados,
        actualizados,
        errores: filas.length - validas.length,
        imgFallidas,
      })
      onDone()
    } catch (e) {
      setErrorMsg(`Error inesperado: ${e instanceof Error ? e.message : 'desconocido'}`)
    } finally {
      setImportando(false)
      setProgreso(null)
    }
  }

  const validas = filas?.filter(f => f.valido).length ?? 0
  const invalidas = filas ? filas.length - validas : 0
  const nuevos = filas?.filter(f => f.valido && f.accion === 'nuevo').length ?? 0
  const actualizar = filas?.filter(f => f.valido && f.accion === 'actualizar').length ?? 0
  const conImagen = filas?.filter(f => f.valido && /^https?:\/\//i.test(f.imagen_url)).length ?? 0

  return (
    <div onClick={() => !importando && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Importar productos desde CSV</h2>
          {!importando && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>}
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          {resultado ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 60, height: 60, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Importación completada</h3>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <span style={{ background: '#dcfce7', color: GREEN, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.creados} creados</span>
                <span style={{ background: '#dbeafe', color: BLUE, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.actualizados} actualizados</span>
                {resultado.errores > 0 && <span style={{ background: '#fef3c7', color: AMBER, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.errores} omitidos</span>}
                {resultado.imgFallidas > 0 && <span style={{ background: '#fef3c7', color: AMBER, padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.imgFallidas} imágenes fallaron</span>}
              </div>
              {resultado.imgFallidas > 0 && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>Los productos se importaron igual; puedes subir esas imágenes desde el admin.</p>
              )}
              <button onClick={onClose} style={{ marginTop: 24, background: NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
            </div>
          ) : !filas ? (
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: NAVY }}>Selecciona un archivo CSV</p>
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Debe incluir al menos: <strong>sku, nombre, precio</strong></p>
              </div>
              <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                Detecta automáticamente separador <code>,</code> o <code>;</code>, codificación Latin-1, precios con <code>$</code> o comas, descripciones con HTML y categorías tipo <code>Padre &gt; Hijo</code>.
                <br />También acepta encabezados de <strong>Tiendanube</strong> sin renombrar nada.
              </div>
              {errorMsg && <p style={{ marginTop: 12, color: RED, fontSize: 13, fontWeight: 600 }}>{errorMsg}</p>}
            </>
          ) : (
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

              {conImagen > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '11px 14px', marginBottom: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={bajarImagenes} onChange={e => setBajarImagenes(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    <strong>Descargar las {conImagen} imágenes</strong> y guardarlas en tu Storage
                    <span style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>Así no dependes de que el enlace externo siga activo. Tarda más.</span>
                  </span>
                </label>
              )}

              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                      {['SKU', 'Nombre', 'Precio', 'Stock', 'Categoría', 'Estado'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Precio' || h === 'Stock' ? 'right' : 'left', padding: '8px 12px', fontWeight: 700, color: '#6b7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 100).map((f, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: f.valido ? '#fff' : '#fffbeb' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#374151' }}>{f.sku || '—'}</td>
                        <td style={{ padding: '7px 12px', color: '#374151', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre || '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#374151' }}>{f.precio !== null ? `$${f.precio}` : '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#374151' }}>{f.stock}</td>
                        <td style={{ padding: '7px 12px', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.categoria || '—'}</td>
                        <td style={{ padding: '7px 12px' }}>
                          {!f.valido
                            ? <span style={{ color: AMBER, fontWeight: 700 }}>⚠️ {f.motivo}</span>
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

              {progreso && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 5 }}>
                    <span>{progreso.fase}...</span>
                    <span>{progreso.hecho} / {progreso.total}</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(progreso.hecho / Math.max(1, progreso.total)) * 100}%`, background: BLUE, transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
              {errorMsg && <p style={{ marginTop: 12, color: RED, fontSize: 13, fontWeight: 600 }}>{errorMsg}</p>}
            </>
          )}
        </div>

        {filas && !resultado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
            <button onClick={() => { setFilas(null); setNombreArchivo('') }} disabled={importando}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: importando ? 'not-allowed' : 'pointer' }}>← Elegir otro archivo</button>
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
