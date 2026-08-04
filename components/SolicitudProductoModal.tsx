'use client'

import { useState } from 'react'
import { convertToWebp } from '@/lib/uploadWebp'

const NAVY = '#252855'
const PINK = '#e7226d'

export type SolicitudProductoForm = {
  nombre: string
  sku: string
  precio: string
  stock: string
  descripcion: string
  imagenFile: File | null
  imagenPreview: string | null
}

type Props = {
  titulo: string
  hint: string
  inicial: SolicitudProductoForm
  onClose: () => void
  onSuccess: () => void
  /** Hace el guardado real (subir imagen si cambió, insertar o actualizar la
   * solicitud). Devuelve un mensaje de error, o nada si todo salió bien. */
  onGuardar: (form: SolicitudProductoForm) => Promise<string | void>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

export default function SolicitudProductoModal({ titulo, hint, inicial, onClose, onSuccess, onGuardar }: Props) {
  const [form, setForm] = useState<SolicitudProductoForm>(inicial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)

  function set<K extends keyof SolicitudProductoForm>(key: K, value: SolicitudProductoForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
  }

  async function elegirImagen(file: File | null) {
    if (!file) return
    setConvirtiendo(true)
    try {
      const webp = await convertToWebp(file)
      set('imagenFile', webp)
      set('imagenPreview', URL.createObjectURL(webp))
    } catch {
      setError('No se pudo procesar la imagen')
    }
    setConvirtiendo(false)
  }

  async function handleSubmit() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!form.precio || Number(form.precio) <= 0) { setError('El precio debe ser mayor a $0'); return }
    setSaving(true)
    const err = await onGuardar(form)
    setSaving(false)
    if (err) { setError(err); return }
    onSuccess()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{titulo}</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>Imagen</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1.5px dashed #d1d5db', flexShrink: 0 }}>
                {form.imagenPreview ? <img src={form.imagenPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
              </div>
              <span style={{ fontSize: 12, color: NAVY, fontWeight: 700 }}>{convirtiendo ? 'Procesando...' : 'Cambiar imagen'}</span>
              <input type="file" accept="image/*" hidden onChange={e => elegirImagen(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div>
            <label style={labelStyle}>Nombre del producto</label>
            <input style={inputStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>SKU <span style={{ fontWeight: 400, color: '#9ca3af' }}>(no se puede cambiar)</span></label>
            <input style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af' }} value={form.sku} disabled />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Precio (MXN)</label>
              <input type="number" min="0" step="0.01" style={inputStyle} value={form.precio} onChange={e => set('precio', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Stock disponible</label>
              <input type="number" min="0" style={inputStyle} value={form.stock} onChange={e => set('stock', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? '#f472b6' : PINK, color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
