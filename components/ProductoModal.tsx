'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { convertToWebp } from '@/lib/uploadWebp'

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
  { nombre: 'Ropa adulto', valores: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { nombre: 'Infantil',    valores: ['2', '4', '6', '8', '10', '12', '14'] },
  { nombre: 'Zapato MX',   valores: ['22', '23', '24', '25', '26', '27', '28'] },
  { nombre: 'Zapato EU',   valores: ['36', '37', '38', '39', '40', '41', '42'] },
]

function SeccionAdicional({ titulo, hint, children }: { titulo: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 0', borderTop: '1px solid #f3f4f6' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>{titulo}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
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
  categoria: string
  precio: string
  stock: string
  descripcion: string
  imagen: File | null
  imagenPreview: string | null
} & ProductoExtra

const emptyExtra = (): ProductoExtra => ({
  colores: [], tallas: [], variantes: [],
  peso: '', largo: '', ancho: '', alto: '', imagenesExtra: [],
})

const empty: Producto = { nombre: '', sku: '', categoria: '', precio: '', stock: '', descripcion: '', imagen: null, imagenPreview: null, ...emptyExtra() }

type Props = {
  onClose: () => void
  onSave: (p: Producto) => void
  inicial?: Partial<Producto> & { id?: string }
  categoriasDisponibles: string[]
  onNuevaCategoria?: (nombre: string) => Promise<void>
}

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

export default function ProductoModal({ onClose, onSave, inicial, categoriasDisponibles, onNuevaCategoria }: Props) {
  const [form, setForm] = useState<Producto>({ ...empty, ...emptyExtra(), ...inicial })
  const [errors, setErrors] = useState<Partial<Record<keyof Producto, string>>>({})
  const [dragging, setDragging] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [catQuery, setCatQuery] = useState('')
  const [nuevaCatMode, setNuevaCatMode] = useState(false)
  const [mostrarOpcionales, setMostrarOpcionales] = useState(false)
  const [colorInput, setColorInput] = useState('')
  const [tallaInput, setTallaInput] = useState('')
  const [extraSlotTarget, setExtraSlotTarget] = useState(-1)
  const [extraDragging, setExtraDragging] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const extraFileRef = useRef<HTMLInputElement>(null)

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

  /* ---- Imagen extra ---- */
  async function agregarImagenesExtra(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setConvirtiendo(true)
    try {
      const converted = await Promise.all(arr.map(async f => {
        const webp = await convertToWebp(f)
        return { file: webp, preview: URL.createObjectURL(webp) }
      }))
      setForm(f => ({ ...f, imagenesExtra: [...f.imagenesExtra, ...converted] }))
    } finally { setConvirtiendo(false) }
  }
  function onExtraFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) agregarImagenesExtra(e.target.files)
    e.target.value = ''
  }
  function onExtraDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setExtraDragging(false)
    if (e.dataTransfer.files?.length) agregarImagenesExtra(e.dataTransfer.files)
  }
  function removeExtraImagen(i: number) {
    setForm(f => { const extras = [...f.imagenesExtra]; extras.splice(i, 1); return { ...f, imagenesExtra: extras } })
  }

  /* ---- Imagen principal ---- */
  function seleccionarCategoria(cat: string) {
    setForm(f => ({ ...f, categoria: cat }))
    setErrors(e => ({ ...e, categoria: '' }))
  }
  function set(key: keyof Producto, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setConvirtiendo(true)
    try {
      const webp = await convertToWebp(file)
      const url = URL.createObjectURL(webp)
      setForm(f => ({ ...f, imagen: webp, imagenPreview: url }))
      setErrors(e => ({ ...e, imagen: '' }))
    } finally { setConvirtiendo(false) }
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  /* ---- Validación y submit ---- */
  function validate() {
    const errs: typeof errors = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.sku.trim()) errs.sku = 'El SKU es requerido'
    if (!form.categoria?.trim()) errs.categoria = 'Escribe o selecciona una categoría'
    if (!form.precio || isNaN(Number(form.precio))) errs.precio = 'Precio inválido'
    if (!form.stock || isNaN(Number(form.stock))) errs.stock = 'Stock inválido'
    if (!form.imagen && !inicial?.imagenPreview) errs.imagen = 'Sube una imagen del producto'
    return errs
  }
  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave(form)
  }

  const chip = (label: string, onRemove: () => void, color = NAVY) => (
    <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${color}14`, color, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
      {label}
      <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
    </span>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{inicial?.id ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Imagen principal */}
          <div>
            <label style={labelStyle}>Imagen del producto</label>
            {form.imagenPreview ? (
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                style={{ position: 'relative', marginTop: 8, borderRadius: 10, outline: dragging ? '2px dashed #0049ff' : 'none', outlineOffset: 2, transition: 'outline 0.15s' }}>
                <img src={form.imagenPreview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb', display: 'block', opacity: dragging ? 0.5 : 1 }} />
                {dragging && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,246,255,0.85)', borderRadius: 10, pointerEvents: 'none' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0049ff' }}>Suelta la imagen aquí</p>
                  </div>
                )}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>🖼️ Cambiar</button>
                  <button onClick={() => setForm(f => ({ ...f, imagen: null, imagenPreview: null }))} style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                {form.imagen && <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>✅ WebP · {(form.imagen.size / 1024).toFixed(0)} KB</div>}
              </div>
            ) : (
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => fileRef.current?.click()}
                style={{ marginTop: 8, border: `2px dashed ${dragging ? '#0049ff' : errors.imagen ? '#dc2626' : '#d1d5db'}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#eff6ff' : '#fafafa', transition: 'all 0.2s' }}>
                {convirtiendo
                  ? <><p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p><p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Convirtiendo a WebP...</p></>
                  : <><p style={{ fontSize: 32, marginBottom: 8 }}>🖼️</p><p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{dragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}</p><p style={{ fontSize: 12, color: '#9ca3af' }}>PNG, JPG, WEBP, AVIF · Se convierte a WebP automáticamente</p></>}
                {errors.imagen && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8, fontWeight: 600 }}>{errors.imagen}</p>}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
            <input ref={extraFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onExtraFileChange} />
          </div>

          {/* Nombre y SKU */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Nombre del producto" error={errors.nombre}>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Bolso Morelia Negro" style={inputStyle(!!errors.nombre)} />
            </Field>
            <Field label="SKU" error={errors.sku}>
              <input value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="Ej: BOL-001" style={inputStyle(!!errors.sku)} />
            </Field>
          </div>

          {/* Categoría */}
          <Field label="Categoría" error={errors.categoria}>
            {!nuevaCatMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.categoria} onChange={e => seleccionarCategoria(e.target.value)} style={{ ...inputStyle(!!errors.categoria), flex: 1, cursor: 'pointer' }}>
                  <option value="">Selecciona una categoría</option>
                  {categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button onClick={() => setNuevaCatMode(true)} style={{ padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151' }}>+ Nueva</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={catQuery} onChange={e => { setCatQuery(e.target.value); setForm(f => ({ ...f, categoria: e.target.value })) }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && catQuery.trim()) { if (onNuevaCategoria) await onNuevaCategoria(catQuery.trim()); seleccionarCategoria(catQuery.trim()); setNuevaCatMode(false); setCatQuery('') }
                    if (e.key === 'Escape') setNuevaCatMode(false)
                  }}
                  placeholder="Nombre de la nueva categoría..." style={{ ...inputStyle(!!errors.categoria), flex: 1 }} />
                <button onClick={async () => { const n = catQuery.trim(); if (n) { if (onNuevaCategoria) await onNuevaCategoria(n); seleccionarCategoria(n) } setNuevaCatMode(false); setCatQuery('') }}
                  style={{ padding: '9px 14px', border: 'none', borderRadius: 8, background: '#0049ff', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
                <button onClick={() => { setNuevaCatMode(false); setCatQuery('') }} style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6', fontSize: 13, cursor: 'pointer', color: '#374151' }}>×</button>
              </div>
            )}
          </Field>

          {/* Precio y Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

          {/* Descripción */}
          <Field label="Descripción" error={errors.descripcion}>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe el producto: materiales, medidas, características..."
              rows={3} style={{ ...inputStyle(false), resize: 'vertical' }} />
          </Field>

          {/* ---- Datos adicionales ---- */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 4 }}>
            <button type="button" onClick={() => setMostrarOpcionales(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151', width: '100%' }}>
              <span style={{ fontSize: 10, transform: mostrarOpcionales ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
              Datos adicionales
              {(form.colores.length > 0 || form.tallas.length > 0 || form.peso || form.imagenesExtra.length > 0) ? (
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  {form.colores.length > 0 && <span style={{ background: `${NAVY}14`, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{form.colores.length} color{form.colores.length > 1 ? 'es' : ''}</span>}
                  {form.tallas.length > 0 && <span style={{ background: `${PINK}14`, color: PINK, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{form.tallas.length} talla{form.tallas.length > 1 ? 's' : ''}</span>}
                  {form.imagenesExtra.length > 0 && <span style={{ background: '#f0fdf4', color: '#059669', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{form.imagenesExtra.length} foto{form.imagenesExtra.length > 1 ? 's' : ''}</span>}
                </div>
              ) : (
                <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 4 }}>colores, tallas, peso, fotos extra</span>
              )}
            </button>
          </div>

          {mostrarOpcionales && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ---- Colores ---- */}
              <SeccionAdicional titulo="🎨 Colores disponibles" hint="Agrega los colores en que viene el producto">
                {/* Paleta rápida */}
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
                {/* Chips seleccionados */}
                {form.colores.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: '8px 10px', background: `${NAVY}06`, borderRadius: 8 }}>
                    {form.colores.map(c => {
                      const hex = PALETA_COLORES.find(p => p.nombre === c)?.hex
                      return (
                        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: `1px solid ${NAVY}30`, color: NAVY, fontSize: 12, fontWeight: 700, padding: '3px 8px 3px 6px', borderRadius: 20 }}>
                          {hex && <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)' }} />}
                          {c}
                          <button type="button" onClick={() => removeColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      )
                    })}
                  </div>
                )}
                {/* Input custom */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle(false), flex: 1, fontSize: 13 }} value={colorInput}
                    onChange={e => setColorInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(colorInput) } }}
                    placeholder="Color personalizado (Enter para agregar)" />
                  <button type="button" onClick={() => addColor(colorInput)}
                    style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                </div>
              </SeccionAdicional>

              {/* ---- Tallas ---- */}
              <SeccionAdicional titulo="📏 Tallas / Tamaños" hint="Escribe cada talla o medida y presiona Enter para agregarla">
                {form.tallas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {form.tallas.map(t => (
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
                    placeholder="Ej: XS, S, M, L, XL — o 38, 39, 40 — o Único" />
                  <button type="button" onClick={() => addTalla(tallaInput)}
                    style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                </div>
              </SeccionAdicional>

              {/* ---- Variantes con stock ---- */}
              {form.variantes.length > 0 && (
                <SeccionAdicional titulo="📦 Stock por variante" hint="Indica las unidades disponibles por combinación">
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
                </SeccionAdicional>
              )}

              {/* ---- Envío / Peso y dimensiones ---- */}
              <SeccionAdicional titulo="🚚 Envío" hint="Datos para calcular el costo de envío">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6, display: 'block' }}>Peso <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>gramos</span></label>
                    <div style={{ position: 'relative' }}>
                      <input type="number" min="0" style={{ ...inputStyle(false), paddingRight: 36 }} value={form.peso}
                        onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} placeholder="Ej: 850" />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af', pointerEvents: 'none' }}>g</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6, display: 'block' }}>Dimensiones <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>cm</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {([['largo', 'Largo'], ['ancho', 'Ancho'], ['alto', 'Alto']] as const).map(([dim, label]) => (
                        <div key={dim} style={{ position: 'relative' }}>
                          <input type="number" min="0"
                            style={{ ...inputStyle(false), padding: '9px 8px 9px 8px', textAlign: 'center', fontSize: 13 }}
                            value={form[dim]} onChange={e => setForm(f => ({ ...f, [dim]: e.target.value }))}
                            placeholder={label[0]} />
                          <span style={{ position: 'absolute', bottom: -16, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SeccionAdicional>

              {/* ---- Fotos adicionales ---- */}
              <SeccionAdicional titulo="🖼️ Fotos adicionales" hint="Imágenes extra del producto: ángulos, detalles o uso">
                <div
                  onDragOver={e => { e.preventDefault(); setExtraDragging(true) }}
                  onDragLeave={() => setExtraDragging(false)}
                  onDrop={onExtraDrop}
                  style={{ border: `2px dashed ${extraDragging ? BLUE : '#d1d5db'}`, borderRadius: 12, background: extraDragging ? `${BLUE}06` : '#fafafa', transition: 'border-color 0.15s, background 0.15s', overflow: 'hidden' }}>

                  {/* Grid de imágenes ya cargadas */}
                  {form.imagenesExtra.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 12 }}>
                      {form.imagenesExtra.map((extra, i) => (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                          <img src={extra.preview!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <button type="button" onClick={() => removeExtraImagen(i)}
                            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1, backdropFilter: 'blur(2px)' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Zona de drop / botón agregar */}
                  <div onClick={() => extraFileRef.current?.click()} style={{ cursor: 'pointer', padding: form.imagenesExtra.length > 0 ? '10px 12px 14px' : '32px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: form.imagenesExtra.length > 0 ? '1px dashed #e5e7eb' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📎</div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {form.imagenesExtra.length > 0 ? 'Agregar más fotos' : 'Arrastra fotos aquí o haz clic para seleccionar'}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Puedes seleccionar varias imágenes a la vez</p>
                  </div>
                </div>
              </SeccionAdicional>

            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={convirtiendo} style={{ background: convirtiendo ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {inicial?.id ? 'Actualizar producto' : 'Guardar producto'}
            </button>
          </div>
        </div>
      </div>
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
function inputStyle(hasError: boolean): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', color: '#111', boxSizing: 'border-box' }
}
