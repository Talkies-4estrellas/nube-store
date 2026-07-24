'use client'

import { useState, useRef, type DragEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV, readFileSmart, cleanNumber, stripHtml } from '@/lib/csv'
import { mapearCategorias, mapearSubcategorias } from '@/lib/categorias'

const NAVY = '#252855'
const BLUE = '#0049ff'
const GREEN = '#059669'
const RED = '#dc2626'
const AMBER = '#d97706'

/** Forma mínima de un producto ya guardado, tal como llega de `productos_con_estado`. */
export type ProductoExistente = {
  sku: string
  nombre?: string; descripcion?: string | null; categoria?: string | null
  precio?: number | string; stock?: number | string
  precio_promocional?: number | string | null; costo?: number | string | null
  marca?: string | null; codigo_barras?: string | null; mpn?: string | null
  slug?: string | null; tags?: string | null; seo_titulo?: string | null; seo_descripcion?: string | null
  peso_kg?: number | string | null; alto_cm?: number | string | null
  ancho_cm?: number | string | null; profundidad_cm?: number | string | null
  ubicacion?: string | null; activo?: boolean; envio_gratis?: boolean
  detalles?: unknown
}

type Props = {
  onClose: () => void
  onDone: () => void
  existingProducts: ProductoExistente[]
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

/**
 * Compara una fila del CSV contra el producto ya guardado con el mismo SKU.
 * Solo considera campos que el CSV realmente escribiría (los opcionales solo
 * cuentan si vienen no-vacíos, igual que hace el armado del payload). No
 * compara imagen_url: al descargar la imagen siempre se genera una URL de
 * Storage nueva, así que compararla siempre marcaría "cambio" aunque la foto
 * sea la misma.
 */
function sinCambiosReales(f: Omit<Fila, 'valido' | 'motivo' | 'accion' | 'sinCambios'>, ex: ProductoExistente): boolean {
  const numsIguales =
    numOrNull(f.precio) === numOrNull(ex.precio) &&
    f.stock === (numOrNull(ex.stock) ?? 0) &&
    (f.precio_promocional === null || numOrNull(f.precio_promocional) === numOrNull(ex.precio_promocional)) &&
    (f.costo === null || numOrNull(f.costo) === numOrNull(ex.costo)) &&
    (f.peso_kg === null || numOrNull(f.peso_kg) === numOrNull(ex.peso_kg)) &&
    (f.alto_cm === null || numOrNull(f.alto_cm) === numOrNull(ex.alto_cm)) &&
    (f.ancho_cm === null || numOrNull(f.ancho_cm) === numOrNull(ex.ancho_cm)) &&
    (f.profundidad_cm === null || numOrNull(f.profundidad_cm) === numOrNull(ex.profundidad_cm))

  const opcionalIgual = (valor: string, existente: string | null | undefined) =>
    !valor || valor === String(existente ?? '')

  const textosIguales =
    f.nombre.trim() === String(ex.nombre ?? '').trim() &&
    f.descripcion.trim() === String(ex.descripcion ?? '').trim() &&
    f.categoria === String(ex.categoria ?? '') &&
    opcionalIgual(f.marca, ex.marca) &&
    opcionalIgual(f.codigo_barras, ex.codigo_barras) &&
    opcionalIgual(f.mpn, ex.mpn) &&
    opcionalIgual(f.slug, ex.slug) &&
    opcionalIgual(f.tags, ex.tags) &&
    opcionalIgual(f.seo_titulo, ex.seo_titulo) &&
    opcionalIgual(f.seo_descripcion, ex.seo_descripcion) &&
    opcionalIgual(f.ubicacion, ex.ubicacion)

  const boolsIguales = f.activo === Boolean(ex.activo ?? true) && f.envio_gratis === Boolean(ex.envio_gratis ?? false)

  let detallesIguales = true
  if (f.detalles) {
    try { detallesIguales = JSON.stringify(JSON.parse(f.detalles)) === JSON.stringify(ex.detalles ?? null) }
    catch { detallesIguales = true } // JSON invalido: no se escribe, no cuenta como cambio
  }

  return numsIguales && textosIguales && boolsIguales && detallesIguales
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

  // Campos históricos del control Excel 2023 — tienen su propia columna en
  // `productos`, pero no se muestran en la vista previa de importación
  // (son datos congelados de referencia, no información que se administre
  // desde el panel).
  proveedor_contacto:                ['proveedor_contacto'],
  proveedor_telefono:                ['proveedor_telefono'],
  id_articulo_original:              ['id_articulo_original'],
  calcula_id_original:               ['calcula_id_original'],
  numero_control_excel:              ['numero_control_excel'],
  precio_compra_con_iva:             ['precio_compra_con_iva'],
  iva_compra:                        ['iva_compra'],
  porcentaje_a_ganar:                ['porcentaje_a_ganar'],
  utilidad_excel:                    ['utilidad_excel'],
  es_compra_interna:                 ['es_compra_interna'],
  openpay_comision:                  ['openpay_comision'],
  openpay_iva:                       ['openpay_iva'],
  comision_tienda_nube:              ['comision_tienda_nube'],
  total_comisiones:                  ['total_comisiones'],
  descuento_pago_transferencia_pct:  ['descuento_pago_transferencia_pct'],
  iva_venta_desglosar:               ['iva_venta_desglosar'],
  precio_venta_sin_iva:              ['precio_venta_sin_iva'],
  ganancia_real_excel:               ['ganancia_real_excel'],
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

/** "Papel Picado > Pelota Inflable" o "Belleza / Fragancias" -> { padre: "Papel Picado", hijo: "Pelota Inflable" } */
function parsearCategoria(raw: string): { padre: string; hijo: string } {
  if (!raw) return { padre: '', hijo: '' }
  const sep = raw.includes('>') ? '>' : raw.includes('/') ? '/' : ''
  if (!sep) return { padre: raw.trim(), hijo: '' }
  const partes = raw.split(sep).map(p => p.trim()).filter(Boolean)
  if (partes.length <= 1) return { padre: partes[0] ?? '', hijo: '' }
  return { padre: partes[0], hijo: partes.slice(1).join(` ${sep} `) }
}

function esVerdadero(raw: string, porDefecto: boolean): boolean {
  if (!raw) return porDefecto
  return /^(s[ií]|si|yes|true|1|x)$/i.test(raw.trim())
}

type Fila = {
  sku: string; nombre: string; precio: number | null
  precio_promocional: number | null; costo: number | null; stock: number
  categoria: string; categoria_padre: string; categoria_hijo: string; marca: string; codigo_barras: string; mpn: string
  descripcion: string; imagen_url: string; slug: string; tags: string
  seo_titulo: string; seo_descripcion: string
  peso_kg: number | null; alto_cm: number | null; ancho_cm: number | null; profundidad_cm: number | null
  ubicacion: string; proveedor: string; activo: boolean; envio_gratis: boolean
  detalles: string
  // Históricos del control Excel 2023 (ver comentario en SINONIMOS)
  proveedor_contacto: string; proveedor_telefono: string
  id_articulo_original: string; calcula_id_original: string; numero_control_excel: string
  precio_compra_con_iva: number | null; iva_compra: number | null
  porcentaje_a_ganar: number | null; utilidad_excel: number | null; es_compra_interna: string
  openpay_comision: number | null; openpay_iva: number | null
  comision_tienda_nube: number | null; total_comisiones: number | null
  descuento_pago_transferencia_pct: number | null; iva_venta_desglosar: number | null
  precio_venta_sin_iva: number | null; ganancia_real_excel: number | null
  valido: boolean; motivo: string; accion: 'nuevo' | 'actualizar'; sinCambios: boolean
}

export default function ImportCSVModal({ onClose, onDone, existingProducts }: Props) {
  const mapaExistente = new Map(existingProducts.map(p => [String(p.sku), p]))
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [bajarImagenes, setBajarImagenes] = useState(true)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState<{ fase: string; hecho: number; total: number } | null>(null)
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; sinCambios: number; errores: number; imgFallidas: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function analizar(rows: Record<string, string>[]): Fila[] {
    return rows.map(r => {
      const { padre: categoria_padre, hijo: categoria_hijo } = parsearCategoria(pick(r, 'categoria'))
      const campos = {
        sku: pick(r, 'sku'),
        nombre: pick(r, 'nombre'),
        precio: cleanNumber(pick(r, 'precio')),
        precio_promocional: cleanNumber(pick(r, 'precio_promocional')),
        costo: cleanNumber(pick(r, 'costo')),
        stock: Math.max(0, Math.round(cleanNumber(pick(r, 'stock')) ?? 0)),
        categoria_padre,
        categoria_hijo,
        categoria: categoria_hijo || categoria_padre,
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
        proveedor_contacto: pick(r, 'proveedor_contacto'),
        proveedor_telefono: pick(r, 'proveedor_telefono'),
        id_articulo_original: pick(r, 'id_articulo_original'),
        calcula_id_original: pick(r, 'calcula_id_original'),
        numero_control_excel: pick(r, 'numero_control_excel'),
        precio_compra_con_iva: cleanNumber(pick(r, 'precio_compra_con_iva')),
        iva_compra: cleanNumber(pick(r, 'iva_compra')),
        porcentaje_a_ganar: cleanNumber(pick(r, 'porcentaje_a_ganar')),
        utilidad_excel: cleanNumber(pick(r, 'utilidad_excel')),
        es_compra_interna: pick(r, 'es_compra_interna'),
        openpay_comision: cleanNumber(pick(r, 'openpay_comision')),
        openpay_iva: cleanNumber(pick(r, 'openpay_iva')),
        comision_tienda_nube: cleanNumber(pick(r, 'comision_tienda_nube')),
        total_comisiones: cleanNumber(pick(r, 'total_comisiones')),
        descuento_pago_transferencia_pct: cleanNumber(pick(r, 'descuento_pago_transferencia_pct')),
        iva_venta_desglosar: cleanNumber(pick(r, 'iva_venta_desglosar')),
        precio_venta_sin_iva: cleanNumber(pick(r, 'precio_venta_sin_iva')),
        ganancia_real_excel: cleanNumber(pick(r, 'ganancia_real_excel')),
      }

      const faltantes: string[] = []
      if (!campos.sku) faltantes.push('SKU')
      if (!campos.nombre) faltantes.push('nombre')
      if (campos.precio === null || campos.precio < 0) faltantes.push('precio')

      const existente = mapaExistente.get(campos.sku)
      const accion: 'nuevo' | 'actualizar' = existente ? 'actualizar' : 'nuevo'
      const sinCambios = existente ? sinCambiosReales(campos, existente) : false

      return {
        ...campos,
        valido: faltantes.length === 0,
        motivo: faltantes.length ? `Falta: ${faltantes.join(', ')}` : '',
        accion, sinCambios,
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

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setArrastrando(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setErrorMsg('Arrastra un archivo .csv — ese no lo es.')
      return
    }
    onFile(file)
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
    // Las filas "sin cambios" no se escriben: nada en la fila difiere de
    // lo que ya está guardado, así que no vale la pena tocar la BD ni
    // gastar tiempo descargando su imagen otra vez.
    const aEscribir = validas.filter(f => !f.sinCambios)
    if (aEscribir.length === 0) return
    setImportando(true)
    setErrorMsg('')

    try {
      // 1. Categorías: buscar o crear, respetando la jerarquía padre/subcategoría
      //    (sin duplicar por mayúsculas/espacios, y una subcategoría con el mismo
      //    nombre bajo dos padres distintos no se confunde entre sí).
      setProgreso({ fase: 'Preparando categorías', hecho: 0, total: 1 })
      const nombresPadre = Array.from(new Set(aEscribir.map(f => f.categoria_padre).filter(Boolean)))
      const mapaPadres = await mapearCategorias(supabase, nombresPadre)

      const paresHijo = aEscribir
        .filter(f => f.categoria_padre && f.categoria_hijo)
        .map(f => ({ padreId: mapaPadres.get(f.categoria_padre), hijo: f.categoria_hijo }))
        .filter((p): p is { padreId: number; hijo: string } => p.padreId != null)
      const mapaHijos = await mapearSubcategorias(supabase, paresHijo)

      function categoriaIdDe(f: Fila): number | null {
        if (!f.categoria_padre) return null
        const padreId = mapaPadres.get(f.categoria_padre) ?? null
        if (!padreId) return null
        if (!f.categoria_hijo) return padreId
        return mapaHijos.get(`${padreId}:::${f.categoria_hijo}`) ?? padreId
      }

      // 2. Imágenes: descargar y alojar en nuestro Storage
      let mapaImg = new Map<string, string>()
      let imgFallidas = 0
      if (bajarImagenes) {
        const r = await resolverImagenes(aEscribir)
        mapaImg = r.mapa
        imgFallidas = r.fallidas
      }

      // 3. Construir payloads
      setProgreso({ fase: 'Guardando productos', hecho: 0, total: aEscribir.length })
      const payloads = aEscribir.map(f => {
        const p: Record<string, unknown> = {
          sku: f.sku,
          nombre: f.nombre,
          precio: f.precio,
          stock: f.stock,
          categoria_id: categoriaIdDe(f),
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

        // Históricos del control Excel 2023: columna propia, sin pasar por `detalles`
        if (f.proveedor_contacto) p.proveedor_contacto = f.proveedor_contacto
        if (f.proveedor_telefono) p.proveedor_telefono = f.proveedor_telefono
        if (f.id_articulo_original) p.id_articulo_original = f.id_articulo_original
        if (f.calcula_id_original) p.calcula_id_original = f.calcula_id_original
        if (f.numero_control_excel) p.numero_control_excel = f.numero_control_excel
        if (f.precio_compra_con_iva !== null) p.precio_compra_con_iva = f.precio_compra_con_iva
        if (f.iva_compra !== null) p.iva_compra = f.iva_compra
        if (f.porcentaje_a_ganar !== null) p.porcentaje_a_ganar = f.porcentaje_a_ganar
        if (f.utilidad_excel !== null) p.utilidad_excel = f.utilidad_excel
        if (f.es_compra_interna) p.es_compra_interna = f.es_compra_interna
        if (f.openpay_comision !== null) p.openpay_comision = f.openpay_comision
        if (f.openpay_iva !== null) p.openpay_iva = f.openpay_iva
        if (f.comision_tienda_nube !== null) p.comision_tienda_nube = f.comision_tienda_nube
        if (f.total_comisiones !== null) p.total_comisiones = f.total_comisiones
        if (f.descuento_pago_transferencia_pct !== null) p.descuento_pago_transferencia_pct = f.descuento_pago_transferencia_pct
        if (f.iva_venta_desglosar !== null) p.iva_venta_desglosar = f.iva_venta_desglosar
        if (f.precio_venta_sin_iva !== null) p.precio_venta_sin_iva = f.precio_venta_sin_iva
        if (f.ganancia_real_excel !== null) p.ganancia_real_excel = f.ganancia_real_excel

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

      const actualizados = aEscribir.filter(f => f.accion === 'actualizar').length
      setResultado({
        creados: aEscribir.length - actualizados,
        actualizados,
        sinCambios: validas.length - aEscribir.length,
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
  const actualizar = filas?.filter(f => f.valido && f.accion === 'actualizar' && !f.sinCambios).length ?? 0
  const sinCambiosCount = filas?.filter(f => f.valido && f.sinCambios).length ?? 0
  const aEscribirCount = nuevos + actualizar
  const conImagen = filas?.filter(f => f.valido && !f.sinCambios && /^https?:\/\//i.test(f.imagen_url)).length ?? 0

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
                {resultado.sinCambios > 0 && <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{resultado.sinCambios} sin cambios</span>}
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
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${arrastrando ? BLUE : '#d1d5db'}`, borderRadius: 12, padding: '40px 20px',
                  textAlign: 'center', cursor: 'pointer', background: arrastrando ? `${BLUE}0d` : '#fafafa',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{arrastrando ? '📥' : '📄'}</div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: arrastrando ? BLUE : NAVY }}>
                  {arrastrando ? 'Suelta el archivo aquí' : 'Arrastra un archivo CSV o haz clic para elegirlo'}
                </p>
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
                {sinCambiosCount > 0 && <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{sinCambiosCount} sin cambios</span>}
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
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: !f.valido ? '#fffbeb' : f.sinCambios ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#374151' }}>{f.sku || '—'}</td>
                        <td style={{ padding: '7px 12px', color: '#374151', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre || '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#374151' }}>{f.precio !== null ? `$${f.precio}` : '—'}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#374151' }}>{f.stock}</td>
                        <td style={{ padding: '7px 12px', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.categoria_padre && f.categoria_hijo ? `${f.categoria_padre} / ${f.categoria_hijo}` : f.categoria}>
                          {f.categoria_padre && f.categoria_hijo ? `${f.categoria_padre} / ${f.categoria_hijo}` : (f.categoria || '—')}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {!f.valido
                            ? <span style={{ color: AMBER, fontWeight: 700 }}>⚠️ {f.motivo}</span>
                            : f.sinCambios
                              ? <span style={{ color: '#9ca3af', fontWeight: 700 }} title="Idéntico a lo ya guardado, no se escribe">Sin cambios</span>
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
            <button onClick={importar} disabled={importando || aEscribirCount === 0}
              style={{ background: aEscribirCount === 0 ? '#93c5fd' : BLUE, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: importando || aEscribirCount === 0 ? 'not-allowed' : 'pointer' }}>
              {importando
                ? 'Importando...'
                : aEscribirCount === 0
                  ? (validas > 0 ? 'Nada que actualizar' : 'Sin filas válidas')
                  : `Importar ${aEscribirCount} producto${aEscribirCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
