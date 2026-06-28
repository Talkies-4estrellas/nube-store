'use client'

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { convertToWebp, captureFrameAsWebp } from '@/lib/uploadWebp'

type Producto = {
  nombre: string
  sku: string
  categoria: string
  precio: string
  stock: string
  descripcion: string
  imagen: File | null
  imagenPreview: string | null
}

const empty: Producto = { nombre: '', sku: '', categoria: '', precio: '', stock: '', descripcion: '', imagen: null, imagenPreview: null }

type Props = {
  onClose: () => void
  onSave: (p: Producto) => void
  inicial?: Partial<Producto> & { id?: string }
  categoriasDisponibles: string[]
}

export default function ProductoModal({ onClose, onSave, inicial, categoriasDisponibles }: Props) {
  const [form, setForm] = useState<Producto>({ ...empty, ...inicial })
  const [errors, setErrors] = useState<Partial<Record<keyof Producto, string>>>({})
  const [dragging, setDragging] = useState(false)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [camaraError, setCamaraError] = useState('')
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [catQuery, setCatQuery] = useState('')
  const [nuevaCatMode, setNuevaCatMode] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

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
    } finally {
      setConvirtiendo(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function abrirCamara() {
    setCamaraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCamaraActiva(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 50)
    } catch {
      setCamaraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  function cerrarCamara() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamaraActiva(false)
    setCamaraError('')
  }

  async function tomarFoto() {
    if (!videoRef.current) return
    setConvirtiendo(true)
    try {
      const webp = await captureFrameAsWebp(videoRef.current)
      const url = URL.createObjectURL(webp)
      setForm(f => ({ ...f, imagen: webp, imagenPreview: url }))
      setErrors(e => ({ ...e, imagen: '' }))
      cerrarCamara()
    } finally {
      setConvirtiendo(false)
    }
  }

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{inicial?.id ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Imagen */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={labelStyle}>Imagen del producto</label>
              {!camaraActiva && !form.imagenPreview && (
                <button onClick={abrirCamara} style={{ background: '#f3f4f6', border: 'none', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  📷 Usar cámara
                </button>
              )}
            </div>

            {camaraActiva && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid #0049ff', position: 'relative', background: '#000' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button onClick={cerrarCamara} style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={tomarFoto} disabled={convirtiendo} style={{ background: '#fff', color: '#111', border: 'none', padding: '8px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {convirtiendo ? '⏳ Procesando...' : '📸 Tomar foto'}
                  </button>
                </div>
              </div>
            )}

            {camaraError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>⚠️ {camaraError}</p>
              </div>
            )}

            {!camaraActiva && form.imagenPreview && (
              <div style={{ position: 'relative' }}>
                <img src={form.imagenPreview} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <button onClick={abrirCamara} style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                    📷 Cámara
                  </button>
                  <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                    🖼️ Archivo
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, imagen: null, imagenPreview: null }))} style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
                {form.imagen && (
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>
                    ✅ WebP · {(form.imagen.size / 1024).toFixed(0)} KB
                  </div>
                )}
              </div>
            )}

            {!camaraActiva && !form.imagenPreview && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#0049ff' : errors.imagen ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                  background: dragging ? '#eff6ff' : '#fafafa', transition: 'all 0.2s',
                }}>
                {convirtiendo ? (
                  <>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Convirtiendo a WebP...</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>🖼️</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      {dragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                    </p>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>PNG, JPG, WEBP, AVIF · Se convierte a WebP automáticamente</p>
                  </>
                )}
                {errors.imagen && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8, fontWeight: 600 }}>{errors.imagen}</p>}
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
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
                <select
                  value={form.categoria}
                  onChange={e => { seleccionarCategoria(e.target.value) }}
                  style={{ ...inputStyle(!!errors.categoria), flex: 1, cursor: 'pointer' }}>
                  <option value="">Selecciona una categoría</option>
                  {categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button onClick={() => setNuevaCatMode(true)}
                  style={{ padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151' }}>
                  + Nueva
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={catQuery}
                  onChange={e => { setCatQuery(e.target.value); setForm(f => ({ ...f, categoria: e.target.value })) }}
                  onKeyDown={e => { if (e.key === 'Enter' && catQuery.trim()) { seleccionarCategoria(catQuery.trim()); setNuevaCatMode(false) } if (e.key === 'Escape') setNuevaCatMode(false) }}
                  placeholder="Nombre de la nueva categoría..."
                  style={{ ...inputStyle(!!errors.categoria), flex: 1 }}
                />
                <button onClick={() => { if (catQuery.trim()) { seleccionarCategoria(catQuery.trim()) } setNuevaCatMode(false) }}
                  style={{ padding: '9px 14px', border: 'none', borderRadius: 8, background: '#0049ff', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Guardar
                </button>
                <button onClick={() => { setNuevaCatMode(false); setCatQuery('') }}
                  style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                  ×
                </button>
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
              rows={4} style={{ ...inputStyle(false), resize: 'vertical' }} />
          </Field>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
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
