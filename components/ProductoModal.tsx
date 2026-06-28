'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'

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

const categorias = ['Bolsos', 'Cinturones', 'Billeteras', 'Estuches', 'Relojes']

const empty: Producto = {
  nombre: '', sku: '', categoria: '', precio: '', stock: '', descripcion: '', imagen: null, imagenPreview: null,
}

type Props = { onClose: () => void; onSave: (p: Producto) => void; inicial?: Partial<Producto> & { id?: string } }

export default function ProductoModal({ onClose, onSave, inicial }: Props) {
  const [form, setForm] = useState<Producto>({ ...empty, ...inicial })
  const [errors, setErrors] = useState<Partial<Record<keyof Producto, string>>>({})
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(key: keyof Producto, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setForm(f => ({ ...f, imagen: file, imagenPreview: url }))
    setErrors(e => ({ ...e, imagen: '' }))
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

  function validate() {
    const errs: typeof errors = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.sku.trim()) errs.sku = 'El SKU es requerido'
    if (!form.categoria) errs.categoria = 'Selecciona una categoría'
    if (!form.precio || isNaN(Number(form.precio))) errs.precio = 'Precio inválido'
    if (!form.stock || isNaN(Number(form.stock))) errs.stock = 'Stock inválido'
    if (!form.imagen) errs.imagen = 'Sube una imagen del producto'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave(form)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{inicial?.id ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Imagen */}
          <div>
            <label style={labelStyle}>Imagen del producto</label>
            {form.imagenPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={form.imagenPreview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }} />
                <button
                  onClick={() => setForm(f => ({ ...f, imagen: null, imagenPreview: null }))}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  Cambiar
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#0049ff' : errors.imagen ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: 10,
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragging ? '#eff6ff' : '#fafafa',
                  transition: 'all 0.2s',
                }}>
                <p style={{ fontSize: 36, marginBottom: 8 }}>🖼️</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  {dragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>PNG, JPG, WEBP · Máximo 5MB</p>
                {errors.imagen && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8, fontWeight: 600 }}>{errors.imagen}</p>}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
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
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={inputStyle(!!errors.categoria)}>
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Precio y Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Precio (MXN)" error={errors.precio}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontWeight: 600 }}>$</span>
                <input
                  value={form.precio}
                  onChange={e => set('precio', e.target.value)}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  style={{ ...inputStyle(!!errors.precio), paddingLeft: 28 }}
                />
              </div>
            </Field>
            <Field label="Stock disponible" error={errors.stock}>
              <input value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" type="number" min="0" style={inputStyle(!!errors.stock)} />
            </Field>
          </div>

          {/* Descripción */}
          <Field label="Descripción" error={errors.descripcion}>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe el producto: materiales, medidas, características..."
              rows={4}
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </Field>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
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
  return {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    color: '#111',
    boxSizing: 'border-box',
  }
}
