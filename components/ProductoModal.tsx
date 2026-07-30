'use client'

import { useEffect, useRef, useState, DragEvent, ChangeEvent } from 'react'
import { convertToWebp } from '@/lib/uploadWebp'
import CategoriaSelector, { type CategoriaConHijos } from '@/components/CategoriaSelector'

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

const PALETA_COLORES = [
  { nombre: 'Negro',     hex: '#1a1a1a' },
  { nombre: 'Blanco',    hex: '#f5f5f5' },
  { nombre: 'Gris',      hex: '#9ca3af' },
  { nombre: 'Rojo',      hex: '#ef4444' },
  { nombre: 'Rosa',      hex: '#ec4899' },
  { nombre: 'Naranja',   hex: '#f97316' },
  { nombre: 'Amarillo',  hex: '#eab308' },
  { nombre: 'Verde',     hex: '#22c55e' },
  { nombre: 'Azul',      hex: '#3b82f6' },
  { nombre: 'Morado',    hex: '#8b5cf6' },
  { nombre: 'Café',      hex: '#92400e' },
  { nombre: 'Beige',     hex: '#d2b48c' },
]

const GRUPOS_TALLAS = [
  { nombre: 'Ropa',    valores: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { nombre: 'Calzado', valores: ['22', '23', '24', '25', '26', '27', '28', '38', '39', '40', '41', '42'] },
  { nombre: 'Otro',    valores: ['Único'] },
]

const UNIDADES_PESO = ['g', 'kg', 'ml', 'L'] as const
type UnidadPeso = typeof UNIDADES_PESO[number]
// Factor a gramos (ml/L se tratan como equivalente de peso 1:1 para estimar envío)
const FACTOR_A_GRAMOS: Record<UnidadPeso, number> = { g: 1, kg: 1000, ml: 1, L: 1000 }

function pesoAUnidadMasClara(gramos: number): { valor: string; unidad: UnidadPeso } {
  if (gramos <= 0) return { valor: '', unidad: 'g' }
  if (gramos % 1000 === 0 && gramos >= 1000) return { valor: String(gramos / 1000), unidad: 'kg' }
  return { valor: String(gramos), unidad: 'g' }
}

export type ProductoExtra = {
  colores: string[]
  tallas: string[]
  variantes: Array<{ color: string; talla: string; stock: string }>
  peso: string
  largo: string
  ancho: string
  alto: string
  imagenesExtra: Array<{ file: File | null; preview: string | null }>
}

type Producto = {
  nombre: string
  sku: string
  categoria_id: string
  precio: string
  stock: string
  descripcion: string
  imagen: File | null
  imagenPreview: string | null
  activo: boolean
} & ProductoExtra

const emptyExtra = (): ProductoExtra => ({
  colores: [], tallas: [], variantes: [],
  peso: '', largo: '', ancho: '', alto: '', imagenesExtra: [],
})

const empty: Producto = { nombre: '', sku: '', categoria_id: '', precio: '', stock: '', descripcion: '', imagen: null, imagenPreview: null, activo: true, ...emptyExtra() }

type SaveOpts = { continuar?: boolean }

type Props = {
  onClose: () => void
  onSave: (p: Producto, opts?: SaveOpts) => void
  inicial?: Partial<Producto> & { id?: string }
  arbolCategorias: CategoriaConHijos[]
  onCrearCategoria: (nombre: string, parentId: number | null) => Promise<{ id: number; nombre: string } | null>
  serverError?: string
  guardando?: boolean
}

const MAX_IMAGEN_MB = 8
const DRAFT_KEY = 'admin_producto_draft_v1'

type DraftGuardable = Omit<Producto, 'imagen' | 'imagenPreview' | 'imagenesExtra'>

function buildVariantes(
  colores: string[], tallas: string[],
  existing: Array<{ color: string; talla: string; stock: string }>
) {
  if (colores.length === 0 && tallas.length === 0) return []
  if (colores.length > 0 && tallas.length === 0)
    return colores.map(c => ({ color: c, talla: '', stock: existing.find(v => v.color === c && v.talla === '')?.stock ?? '' }))
  if (tallas.length > 0 && colores.length === 0)
    return tallas.map(t => ({ color: '', talla: t, stock: existing.find(v => v.color === '' && v.talla === t)?.stock ?? '' }))
  return colores.flatMap(c => tallas.map(t => ({ color: c, talla: t, stock: existing.find(v => v.color === c && v.talla === t)?.stock ?? '' })))
}

export default function ProductoModal({ onClose, onSave, inicial, arbolCategorias, onCrearCategoria, serverError, guardando }: Props) {
  const esEdicion = !!inicial?.id
  const [form, setForm] = useState<Producto>({ ...empty, ...emptyExtra(), ...inicial })
  const [errors, setErrors] = useState<Partial<Record<keyof Producto, string>>>({})
  const [imagenError, setImagenError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [colorInput, setColorInput] = useState('')
  const [tallaInput, setTallaInput] = useState('')
  const [extraDragging, setExtraDragging] = useState(false)
  const [draftBanner, setDraftBanner] = useState(false)
  const [draftMsg, setDraftMsg] = useState('')

  const [abiertoVariantes, setAbiertoVariantes] = useState(!!(inicial?.colores?.length || inicial?.tallas?.length))
  const [abiertoEnvio, setAbiertoEnvio] = useState(!!(inicial?.peso || inicial?.largo || inicial?.ancho || inicial?.alto))

  // Estado de UI del peso (unidad seleccionada), el valor real siempre se exporta en gramos
  const pesoInicial = inicial?.peso ? pesoAUnidadMasClara(Number(inicial.peso)) : { valor: '', unidad: 'g' as UnidadPeso }
  const [pesoValor, setPesoValor] = useState(pesoInicial.valor)
  const [pesoUnidad, setPesoUnidad] = useState<UnidadPeso>(pesoInicial.unidad)

  const fileRef = useRef<HTMLInputElement>(null)
  const dragImgIndex = useRef<number | null>(null)

  useEffect(() => {
    if (esEdicion) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setDraftBanner(true)
    } catch { /* localStorage no disponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setForm(f => ({ ...f, peso: pesoValor ? String(Math.round(Number(pesoValor) * FACTOR_A_GRAMOS[pesoUnidad])) : '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesoValor, pesoUnidad])

  /* ---- Colores / Tallas ---- */
  function addColor(val: string) {
    const v = val.trim()
    if (!v || form.colores.includes(v)) { setColorInput(''); return }
    const newC = [...form.colores, v]
    setForm(f => ({ ...f, colores: newC, variantes: buildVariantes(newC, f.tallas, f.variantes) }))
    setColorInput('')
  }
  function removeColor(c: string) {
    const newC = form.colores.filter(x => x !== c)
    setForm(f => ({ ...f, colores: newC, variantes: buildVariantes(newC, f.tallas, f.variantes) }))
  }
  function addTalla(val: string) {
    const v = val.trim()
    if (!v || form.tallas.includes(v)) { setTallaInput(''); return }
    const newT = [...form.tallas, v]
    setForm(f => ({ ...f, tallas: newT, variantes: buildVariantes(f.colores, newT, f.variantes) }))
    setTallaInput('')
  }
  function removeTalla(t: string) {
    const newT = form.tallas.filter(x => x !== t)
    setForm(f => ({ ...f, tallas: newT, variantes: buildVariantes(f.colores, newT, f.variantes) }))
  }
  function setVarianteStock(i: number, stock: string) {
    setForm(f => { const v = [...f.variantes]; v[i] = { ...v[i], stock }; return { ...f, variantes: v } })
  }

  /* ---- Galería unificada (principal + extra) ---- */
  type ImgItem = { file: File | null; preview: string | null }
  function getGaleria(): ImgItem[] {
    const list: ImgItem[] = []
    if (form.imagen || form.imagenPreview) list.push({ file: form.imagen, preview: form.imagenPreview })
    return [...list, ...form.imagenesExtra]
  }
  function setGaleria(list: ImgItem[]) {
    const [principal, ...resto] = list
    setForm(f => ({ ...f, imagen: principal?.file ?? null, imagenPreview: principal?.preview ?? null, imagenesExtra: resto }))
    if (principal) setErrors(e => ({ ...e, imagen: '' }))
  }
  async function agregarImagenes(files: FileList | File[]) {
    const todas = Array.from(files).filter(f => f.type.startsWith('image/'))
    const pesadas = todas.filter(f => f.size > MAX_IMAGEN_MB * 1024 * 1024)
    const arr = todas.filter(f => f.size <= MAX_IMAGEN_MB * 1024 * 1024)
    setImagenError(pesadas.length > 0 ? `${pesadas.length} imagen(es) superan ${MAX_IMAGEN_MB}MB y no se agregaron` : '')
    if (!arr.length) return
    setConvirtiendo(true)
    try {
      const converted = await Promise.all(arr.map(async f => {
        const webp = await convertToWebp(f)
        return { file: webp, preview: URL.createObjectURL(webp) }
      }))
      setGaleria([...getGaleria(), ...converted])
    } finally { setConvirtiendo(false) }
  }
  function removeImagenAt(i: number) {
    const list = getGaleria()
    list.splice(i, 1)
    setGaleria(list)
  }
  function usarComoPrincipal(i: number) {
    const list = getGaleria()
    const [item] = list.splice(i, 1)
    list.unshift(item)
    setGaleria(list)
  }
  function onImgDragStart(i: number) { dragImgIndex.current = i }
  function onImgDrop(i: number) {
    const from = dragImgIndex.current
    dragImgIndex.current = null
    if (from === null || from === i) return
    const list = getGaleria()
    const [moved] = list.splice(from, 1)
    list.splice(i, 0, moved)
    setGaleria(list)
  }
  function onGaleriaDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setExtraDragging(false)
    if (e.dataTransfer.files?.length) agregarImagenes(e.dataTransfer.files)
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) agregarImagenes(e.target.files)
    e.target.value = ''
  }

  /* ---- Campos simples ---- */
  function set(key: keyof Producto, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  /* ---- Borrador ---- */
  function guardarBorrador() {
    try {
      const { imagen: _imagen, imagenPreview: _imagenPreview, imagenesExtra: _imagenesExtra, ...guardable } = form
      void _imagen; void _imagenPreview; void _imagenesExtra
      localStorage.setItem(DRAFT_KEY, JSON.stringify(guardable satisfies DraftGuardable))
      setDraftMsg('💾 Borrador guardado (las imágenes no se incluyen en el borrador)')
      setTimeout(() => setDraftMsg(''), 3000)
    } catch { setDraftMsg('No se pudo guardar el borrador en este navegador') }
  }
  function restaurarBorrador() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as DraftGuardable
      setForm(f => ({ ...f, ...data }))
      if (data.peso) { const p = pesoAUnidadMasClara(Number(data.peso)); setPesoValor(p.valor); setPesoUnidad(p.unidad) }
      if (data.colores?.length || data.tallas?.length) setAbiertoVariantes(true)
      if (data.peso || data.largo || data.ancho || data.alto) setAbiertoEnvio(true)
    } catch { /* borrador corrupto, se ignora */ }
    setDraftBanner(false)
  }
  function descartarBorrador() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    setDraftBanner(false)
  }

  /* ---- Validación y submit ---- */
  function validate() {
    const errs: typeof errors = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.sku.trim()) errs.sku = 'El SKU es requerido'
    if (!form.categoria_id) errs.categoria_id = 'Selecciona una categoría'
    if (!form.precio || isNaN(Number(form.precio)) || Number(form.precio) <= 0) errs.precio = 'El precio debe ser mayor a $0'
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0) errs.stock = 'El stock no puede ser negativo'
    if (!form.imagen && !inicial?.imagenPreview) errs.imagen = 'Sube una imagen del producto'
    return errs
  }
  function handleSubmit(opts?: SaveOpts) {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    onSave(form, opts)
  }

  const galeria = getGaleria()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#f6f7f9', borderRadius: 16, width: '100%', maxWidth: 940, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>{esEdicion ? 'Editar producto' : 'Agregar producto'}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{esEdicion ? 'Actualiza la información del producto' : 'Completa los datos para publicarlo en el catálogo'}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {serverError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {serverError}
            </div>
          )}

          {draftBanner && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>📝 Tienes un borrador guardado de un producto sin terminar.</p>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={restaurarBorrador} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Restaurar</button>
                <button type="button" onClick={descartarBorrador} style={{ background: 'none', color: '#6b7280', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Descartar</button>
              </div>
            </div>
          )}

          {/* Layout principal: columna + barra lateral */}
          <div className="prodmodal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

            {/* ==== Columna principal ==== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

              {/* 📷 Imágenes */}
              <Card icon="📷" title="Imágenes">
                {imagenError && <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, margin: '0 0 8px' }}>{imagenError}</p>}
                {errors.imagen && <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, margin: '0 0 8px' }}>{errors.imagen}</p>}
                <div
                  onDragOver={e => { e.preventDefault(); setExtraDragging(true) }}
                  onDragLeave={() => setExtraDragging(false)}
                  onDrop={onGaleriaDrop}
                  style={{ border: `2px dashed ${extraDragging ? BLUE : errors.imagen ? '#fca5a5' : '#d1d5db'}`, borderRadius: 12, background: extraDragging ? `${BLUE}08` : '#fafafa', transition: 'border-color .15s, background .15s', overflow: 'hidden' }}>

                  {galeria.length > 0 && (
                    <div className="prodmodal-img-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, padding: 12 }}>
                      {galeria.map((img, i) => (
                        <div key={i}
                          draggable
                          onDragStart={() => onImgDragStart(i)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => onImgDrop(i)}
                          style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', position: 'relative', boxShadow: i === 0 ? `0 0 0 2px ${BLUE}` : '0 1px 4px rgba(0,0,0,0.12)', cursor: 'grab', background: '#fff' }}>
                          <img src={img.preview!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                          {i === 0 && (
                            <span style={{ position: 'absolute', top: 5, left: 5, background: BLUE, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>★ Principal</span>
                          )}
                          <button type="button" onClick={() => removeImagenAt(i)}
                            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>×</button>
                          {i !== 0 && (
                            <button type="button" onClick={() => usarComoPrincipal(i)}
                              title="Usar como imagen principal"
                              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', height: 22, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>★ Hacer principal</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', padding: galeria.length > 0 ? '10px 12px 14px' : '36px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: galeria.length > 0 ? '1px dashed #e5e7eb' : 'none' }}>
                    {convirtiendo ? (
                      <><p style={{ fontSize: 28, margin: 0 }}>⏳</p><p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Convirtiendo a WebP...</p></>
                    ) : (
                      <>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖼️</div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                          {galeria.length > 0 ? 'Agregar más fotos' : 'Arrastra imágenes aquí o haz clic para seleccionar'}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                          {galeria.length > 0 ? 'Arrastra una foto para reordenar — la primera es la principal' : 'PNG, JPG, WEBP · Se convierten a WebP automáticamente · Puedes seleccionar varias'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFileChange} />
              </Card>

              {/* 📦 Información básica */}
              <Card icon="📦" title="Información básica">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="prodmodal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Nombre del producto" error={errors.nombre}>
                      <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Bolso Morelia Negro" style={inputStyle(!!errors.nombre)} />
                    </Field>
                    <Field label="SKU" error={errors.sku}>
                      <input value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="Ej: BOL-001" style={inputStyle(!!errors.sku)} />
                    </Field>
                  </div>
                  <CategoriaSelector
                    arbol={arbolCategorias}
                    value={form.categoria_id}
                    onChange={id => set('categoria_id', id)}
                    onCrear={onCrearCategoria}
                    error={errors.categoria_id}
                  />
                  <Field label="Descripción">
                    <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                      placeholder="Describe el producto: materiales, medidas, características..."
                      rows={3} style={{ ...inputStyle(false), resize: 'vertical' }} />
                  </Field>
                </div>
              </Card>

              {/* 💲 Inventario y precio */}
              <Card icon="💲" title="Inventario y precio">
                <div className="prodmodal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Precio (MXN)" error={errors.precio}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontWeight: 600 }}>$</span>
                      <input value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" type="number" min="0" style={{ ...inputStyle(!!errors.precio), paddingLeft: 28 }} />
                    </div>
                  </Field>
                  <Field label="Stock disponible" error={errors.stock}>
                    <input value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" type="number" min="0" style={inputStyle(!!errors.stock)} />
                  </Field>
                </div>
              </Card>

              {/* 🎨 Variantes */}
              <CollapsibleCard icon="🎨" title="Variantes" hint="Colores, tallas y stock por combinación"
                abierto={abiertoVariantes} onToggle={() => setAbiertoVariantes(v => !v)}
                badges={[
                  form.colores.length > 0 ? `${form.colores.length} color${form.colores.length > 1 ? 'es' : ''}` : null,
                  form.tallas.length > 0 ? `${form.tallas.length} talla${form.tallas.length > 1 ? 's' : ''}` : null,
                ].filter(Boolean) as string[]}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Colores */}
                  <div>
                    <p style={subLabelStyle}>Colores disponibles</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {PALETA_COLORES.map(({ nombre, hex }) => {
                        const activo = form.colores.includes(nombre)
                        return (
                          <button key={nombre} type="button" title={nombre}
                            onClick={() => activo ? removeColor(nombre) : addColor(nombre)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 6px', borderRadius: 20, border: `2px solid ${activo ? '#111' : 'transparent'}`, background: activo ? '#f3f4f6' : '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'border-color 0.15s' }}>
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                            {nombre}
                            {activo && <span style={{ color: '#059669', fontSize: 11 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                    {form.colores.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: '8px 10px', background: `${NAVY}06`, borderRadius: 8 }}>
                        {form.colores.map(c => {
                          const hex = PALETA_COLORES.find(p => p.nombre === c)?.hex
                          return (
                            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: `1px solid ${NAVY}30`, color: NAVY, fontSize: 12, fontWeight: 700, padding: '3px 8px 3px 6px', borderRadius: 20 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex ?? '#e5e7eb', border: '1px solid rgba(0,0,0,0.12)' }} />
                              {c}
                              <button type="button" onClick={() => removeColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...inputStyle(false), flex: 1, fontSize: 13 }} value={colorInput}
                        onChange={e => setColorInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(colorInput) } }}
                        placeholder="Color personalizado — Enter para agregar" />
                      <button type="button" onClick={() => addColor(colorInput)}
                        style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* Tallas */}
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                    <p style={subLabelStyle}>Tallas / tamaños</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {GRUPOS_TALLAS.flatMap(g => g.valores).map(t => {
                        const activo = form.tallas.includes(t)
                        return (
                          <button key={t} type="button" onClick={() => activo ? removeTalla(t) : addTalla(t)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: `2px solid ${activo ? PINK : '#e5e7eb'}`, background: activo ? PINK : '#f9fafb', color: activo ? '#fff' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {t}
                          </button>
                        )
                      })}
                    </div>
                    {form.tallas.filter(t => !GRUPOS_TALLAS.some(g => g.valores.includes(t))).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {form.tallas.filter(t => !GRUPOS_TALLAS.some(g => g.valores.includes(t))).map(t => (
                          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: PINK, color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>
                            {t}
                            <button type="button" onClick={() => removeTalla(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...inputStyle(false), flex: 1, fontSize: 13 }} value={tallaInput}
                        onChange={e => setTallaInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTalla(tallaInput) } }}
                        placeholder="Otra talla o medida — Enter para agregar" />
                      <button type="button" onClick={() => addTalla(tallaInput)}
                        style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* Stock por variante */}
                  {form.variantes.length > 0 && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                      <p style={subLabelStyle}>Stock por variante</p>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', background: '#f9fafb', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Variante</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock</span>
                        </div>
                        {form.variantes.map((v, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 14px', borderBottom: i < form.variantes.length - 1 ? '1px solid #f3f4f6' : 'none', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {v.color && (() => { const hex = PALETA_COLORES.find(p => p.nombre === v.color)?.hex; return hex ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} /> : null })()}
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{[v.color, v.talla].filter(Boolean).join(' · ')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button type="button" onClick={() => setVarianteStock(i, String(Math.max(0, Number(v.stock || 0) - 1)))}
                                style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>−</button>
                              <input type="number" min="0"
                                style={{ width: 56, padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, textAlign: 'center', outline: 'none', background: '#fff' }}
                                value={v.stock} onChange={e => setVarianteStock(i, e.target.value)} />
                              <button type="button" onClick={() => setVarianteStock(i, String(Number(v.stock || 0) + 1))}
                                style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>+</button>
                            </div>
                          </div>
                        ))}
                        <div style={{ background: '#f9fafb', padding: '8px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{form.variantes.length} variante{form.variantes.length > 1 ? 's' : ''}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Total: {form.variantes.reduce((t, v) => t + (Number(v.stock) || 0), 0)} uds</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleCard>

              {/* 🚚 Envío */}
              <CollapsibleCard icon="🚚" title="Envío" hint="Peso y dimensiones para calcular el costo de envío"
                abierto={abiertoEnvio} onToggle={() => setAbiertoEnvio(v => !v)}
                badges={(form.peso || form.largo || form.ancho || form.alto) ? ['Configurado'] : []}>
                <div className="prodmodal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
                  <div>
                    <p style={subLabelStyle}>Peso</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" min="0" step="0.01" style={{ ...inputStyle(false), flex: 1 }} value={pesoValor}
                        onChange={e => setPesoValor(e.target.value)} placeholder="Ej: 0.5" />
                      <select value={pesoUnidad} onChange={e => setPesoUnidad(e.target.value as UnidadPeso)}
                        style={{ ...inputStyle(false), width: 76, cursor: 'pointer' }}>
                        {UNIDADES_PESO.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      {pesoValor ? `Se guarda como ${Math.round(Number(pesoValor) * FACTOR_A_GRAMOS[pesoUnidad])} g` : 'Ej: 0.5 kg, 500 g, 2 L, 750 ml'}
                    </p>
                  </div>
                  <div>
                    <p style={subLabelStyle}>Dimensiones del paquete (cm)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {([['largo', 'Largo (cm)', '30'], ['ancho', 'Ancho (cm)', '20'], ['alto', 'Alto (cm)', '10']] as const).map(([dim, label, ejemplo]) => (
                        <div key={dim}>
                          <input type="number" min="0"
                            style={{ ...inputStyle(false), textAlign: 'center' }}
                            value={form[dim]} onChange={e => setForm(f => ({ ...f, [dim]: e.target.value }))}
                            placeholder={`Ej: ${ejemplo}`} />
                          <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleCard>

            </div>

            {/* ==== Barra lateral ==== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

              {/* ⚙ Información adicional */}
              <Card icon="⚙️" title="Información adicional">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>Producto visible</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>Si lo desactivas, no se muestra en la tienda aunque tenga stock</p>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: form.activo ? BLUE : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, left: form.activo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              </Card>

              {/* Resumen rápido */}
              {(form.nombre || form.precio) && (
                <Card icon="👁️" title="Vista previa">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {form.imagenPreview
                      ? <img src={form.imagenPreview} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.nombre || 'Nombre del producto'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: BLUE }}>{form.precio ? `$${Number(form.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {draftMsg && (
            <p style={{ margin: 0, fontSize: 12, color: '#059669', fontWeight: 600, textAlign: 'right' }}>{draftMsg}</p>
          )}
        </div>

        {/* Acciones (sticky) */}
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '14px 28px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginRight: 'auto' }}>Cancelar</button>
          {!esEdicion && (
            <button onClick={guardarBorrador} style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>💾 Guardar borrador</button>
          )}
          {!esEdicion && (
            <button onClick={() => handleSubmit({ continuar: true })} disabled={convirtiendo || guardando}
              style={{ background: '#fff', color: NAVY, border: `1px solid ${NAVY}40`, padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: convirtiendo || guardando ? 'default' : 'pointer', opacity: convirtiendo || guardando ? 0.6 : 1 }}>
              + Guardar y agregar otro
            </button>
          )}
          <button onClick={() => handleSubmit()} disabled={convirtiendo || guardando} style={{ background: convirtiendo || guardando ? '#93c5fd' : BLUE, color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: convirtiendo || guardando ? 'default' : 'pointer' }}>
            {guardando ? 'Guardando...' : esEdicion ? 'Actualizar producto' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

function CollapsibleCard({ icon, title, hint, abierto, onToggle, badges, children }: {
  icon: string; title: string; hint?: string; abierto: boolean; onToggle: () => void; badges: string[]; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 18, cursor: 'pointer', textAlign: 'left' }}>
        <span>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{title}</span>
          {hint && !abierto && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{hint}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
          {badges.map(b => <span key={b} style={{ background: `${NAVY}14`, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{b}</span>)}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
      </button>
      {abierto && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151' }
const subLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }
function inputStyle(hasError: boolean): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', color: '#111', boxSizing: 'border-box' }
}
