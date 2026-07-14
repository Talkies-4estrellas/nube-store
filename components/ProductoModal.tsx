'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { convertToWebp } from '@/lib/uploadWebp'

const NAVY = '#252855'
const PINK = '#e7226d'

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
  function onExtraFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || extraSlotTarget < 0) return
    setConvirtiendo(true)
    convertToWebp(file).then(webp => {
      const url = URL.createObjectURL(webp)
      setForm(f => {
        const extras = [...f.imagenesExtra]
        extras[extraSlotTarget] = { file: webp, preview: url }
        return { ...f, imagenesExtra: extras }
      })
      setConvirtiendo(false)
      e.target.value = ''
    }).catch(() => setConvirtiendo(false))
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
              <div style={{ position: 'relative', marginTop: 8 }}>
                <img src={form.imagenPreview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb', display: 'block' }} />
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
            <input ref={extraFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onExtraFileChange} />
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6b7280', width: '100%' }}>
              <span style={{ fontSize: 10, transform: mostrarOpcionales ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
              Datos adicionales
              <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>— colores, tallas, variantes, peso, dimensiones, fotos extra</span>
              {(form.colores.length > 0 || form.tallas.length > 0 || form.peso || form.imagenesExtra.length > 0) && (
                <span style={{ background: PINK, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 'auto' }}>
                  {[form.colores.length > 0 && `${form.colores.length} color${form.colores.length > 1 ? 'es' : ''}`, form.tallas.length > 0 && `${form.tallas.length} talla${form.tallas.length > 1 ? 's' : ''}`, form.imagenesExtra.length > 0 && `${form.imagenesExtra.length} foto${form.imagenesExtra.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          </div>

          {mostrarOpcionales && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 0 8px' }}>

              {/* Colores */}
              <div>
                <label style={labelStyle}>Colores disponibles</label>
                {form.colores.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                    {form.colores.map(c => chip(c, () => removeColor(c), NAVY))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input style={{ ...inputStyle(false), flex: 1 }} value={colorInput} onChange={e => setColorInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(colorInput) } }}
                    placeholder="Ej: Rojo, Negro, Blanco..." />
                  <button type="button" onClick={() => addColor(colorInput)} style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
                </div>
              </div>

              {/* Tallas */}
              <div>
                <label style={labelStyle}>Tallas / Tamaños</label>
                {form.tallas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                    {form.tallas.map(t => chip(t, () => removeTalla(t), PINK))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input style={{ ...inputStyle(false), flex: 1 }} value={tallaInput} onChange={e => setTallaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTalla(tallaInput) } }}
                    placeholder="Ej: XS, S, M, L, XL o 38, 40, 42..." />
                  <button type="button" onClick={() => addTalla(tallaInput)} style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
                </div>
              </div>

              {/* Variantes */}
              {form.variantes.length > 0 && (
                <div>
                  <label style={labelStyle}>Stock por variante</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginTop: 8 }}>
                    {form.variantes.map((v, i) => (
                      <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: NAVY, margin: '0 0 5px' }}>{[v.color, v.talla].filter(Boolean).join(' · ')}</p>
                        <input type="number" min="0" style={{ ...inputStyle(false), padding: '6px 10px', fontSize: 13 }}
                          value={v.stock} onChange={e => setVarianteStock(i, e.target.value)} placeholder="0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peso y Dimensiones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Peso <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>gramos</span></label>
                  <input type="number" min="0" style={inputStyle(false)} value={form.peso}
                    onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} placeholder="Ej: 250" />
                </div>
                <div>
                  <label style={labelStyle}>Dimensiones <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>cm</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['largo', 'ancho', 'alto'] as const).map(dim => (
                      <input key={dim} type="number" min="0"
                        style={{ ...inputStyle(false), flex: 1, padding: '9px 8px', textAlign: 'center' }}
                        value={form[dim]} onChange={e => setForm(f => ({ ...f, [dim]: e.target.value }))}
                        placeholder={dim === 'largo' ? 'L' : dim === 'ancho' ? 'A' : 'A'} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Fotos adicionales */}
              <div>
                <label style={labelStyle}>Fotos adicionales <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>Hasta 4</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => {
                    const extra = form.imagenesExtra[i]
                    return (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: `2px dashed ${extra?.preview ? NAVY : '#d1d5db'}`, background: extra?.preview ? 'transparent' : '#fafafa', position: 'relative', cursor: extra?.preview ? 'default' : 'pointer' }}
                        onClick={() => { if (!extra?.preview) { setExtraSlotTarget(i); extraFileRef.current?.click() } }}>
                        {extra?.preview ? (
                          <>
                            <img src={extra.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <button type="button" onClick={e => { e.stopPropagation(); removeExtraImagen(i) }}
                              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: 22, opacity: 0.3 }}>+</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
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
