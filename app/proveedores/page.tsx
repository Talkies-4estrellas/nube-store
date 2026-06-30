'use client'

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { convertToWebp, uploadToSupabase } from '@/lib/uploadWebp'

const NAVY = '#252855'
const PINK = '#e7226d'
const DRAFT_KEY = 'proveedor_draft_v1'

type Categoria = { id: number; nombre: string }

type ProductoLocal = {
  nombre: string
  sku: string
  descripcion: string
  precio: string
  stock: string
  categoria_id: string
  imagenFile: File | null
  imagenPreview: string | null
}

const emptyProducto = (): ProductoLocal => ({
  nombre: '', sku: '', descripcion: '', precio: '',
  stock: '', categoria_id: '', imagenFile: null, imagenPreview: null,
})

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#fafafa', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6,
}

function focus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = NAVY
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e5e7eb'
}

export default function ProveedoresPage() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [dragging, setDragging] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [nuevaCatMode, setNuevaCatMode] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Lista acumulada de productos
  const [productos, setProductos] = useState<ProductoLocal[]>([])
  // Producto que se está redactando
  const [prod, setProd] = useState<ProductoLocal>(emptyProducto())
  const [prodError, setProdError] = useState('')

  const [proveedor, setProveedor] = useState({
    nombre: '', empresa: '', email: '', telefono: '',
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar borrador al inicio
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const { proveedor: p, prod: pr } = JSON.parse(raw)
        if (p) setProveedor(p)
        if (pr) setProd({ ...emptyProducto(), ...pr, imagenFile: null, imagenPreview: null })
      }
    } catch { /* ignorar */ }
  }, [])

  // Guardar borrador (debounced)
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      const { imagenFile: _f, imagenPreview: _p, ...safeP } = prod
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ proveedor, prod: safeP })) } catch { /* ignorar */ }
    }, 800)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  }, [proveedor, prod])

  useEffect(() => {
    supabase.from('categorias').select('id, nombre').order('nombre')
      .then(({ data }) => { if (data) setCategorias(data) })
  }, [])

  function setP(field: string, value: string) {
    setProveedor(prev => ({ ...prev, [field]: value }))
  }
  function setPR(field: keyof ProductoLocal, value: string) {
    setProd(prev => ({ ...prev, [field]: value }))
    setProdError('')
  }

  // ---- Imagen drag & drop ----
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setConvirtiendo(true)
    try {
      const webp = await convertToWebp(file)
      const url = URL.createObjectURL(webp)
      setProd(p => ({ ...p, imagenFile: webp, imagenPreview: url }))
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

  // ---- Nueva categoría ----
  async function guardarNuevaCat() {
    if (!nuevaCatNombre.trim()) return
    setSavingCat(true)
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre: nuevaCatNombre.trim() })
      .select('id, nombre')
      .single()
    setSavingCat(false)
    if (error || !data) { alert('Error al crear la categoría'); return }
    setCategorias(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setProd(p => ({ ...p, categoria_id: String(data.id) }))
    setNuevaCatNombre('')
    setNuevaCatMode(false)
  }

  // ---- Agregar producto a la lista ----
  function agregarProducto() {
    if (!prod.nombre.trim() || !prod.sku.trim()) {
      setProdError('Nombre y SKU son obligatorios.')
      return
    }
    if (!prod.precio || isNaN(Number(prod.precio)) || Number(prod.precio) <= 0) {
      setProdError('El precio debe ser un número mayor a 0.')
      return
    }
    if (productos.some(p => p.sku.toUpperCase() === prod.sku.toUpperCase())) {
      setProdError('Ya agregaste un producto con ese SKU.')
      return
    }
    setProductos(prev => [...prev, { ...prod, sku: prod.sku.toUpperCase() }])
    setProd(emptyProducto())
    setProdError('')
  }

  function eliminarProducto(i: number) {
    setProductos(prev => prev.filter((_, idx) => idx !== i))
  }

  // ---- Enviar solicitud ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    // Debe haber al menos 1 producto
    const lista = [...productos]
    // Si hay datos en el formulario actual, los incluimos también
    if (prod.nombre.trim() && prod.sku.trim() && prod.precio) {
      if (isNaN(Number(prod.precio)) || Number(prod.precio) <= 0) {
        setErrorMsg('El precio del producto actual no es válido.')
        return
      }
      if (!lista.some(p => p.sku.toUpperCase() === prod.sku.toUpperCase())) {
        lista.push({ ...prod, sku: prod.sku.toUpperCase() })
      }
    }

    if (lista.length === 0) {
      setErrorMsg('Agrega al menos un producto antes de enviar.')
      return
    }
    if (!proveedor.nombre.trim() || !proveedor.email.trim()) {
      setErrorMsg('Nombre y email del proveedor son obligatorios.')
      return
    }

    setFormState('loading')

    // Subir imágenes y construir rows
    const rows = []
    for (const p of lista) {
      let imagen_url: string | null = null
      if (p.imagenFile) {
        try {
          const path = `solicitudes/${Date.now()}-${p.sku}.webp`
          imagen_url = await uploadToSupabase(p.imagenFile, supabase, 'productos', path)
        } catch { /* si falla el upload, se guarda sin imagen */ }
      }
      rows.push({
        proveedor_nombre:     proveedor.nombre.trim(),
        proveedor_empresa:    proveedor.empresa.trim() || null,
        proveedor_email:      proveedor.email.trim().toLowerCase(),
        proveedor_telefono:   proveedor.telefono.trim() || null,
        producto_nombre:      p.nombre.trim(),
        producto_sku:         p.sku,
        producto_descripcion: p.descripcion.trim() || null,
        producto_precio:      Number(p.precio),
        producto_stock:       Number(p.stock) || 0,
        categoria_id:         p.categoria_id ? Number(p.categoria_id) : null,
        imagen_url,
        estado:               'pendiente',
      })
    }

    const { error } = await supabase.from('solicitudes_productos').insert(rows)

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Uno o más SKUs ya existen en el sistema. Revisa los códigos.')
      } else {
        setErrorMsg('Error al enviar la solicitud. Intenta de nuevo.')
      }
      setFormState('error')
      return
    }

    localStorage.removeItem(DRAFT_KEY)
    setFormState('success')
  }

  function resetForm() {
    setProveedor({ nombre: '', empresa: '', email: '', telefono: '' })
    setProd(emptyProducto())
    setProductos([])
    setFormState('idle')
    setErrorMsg('')
    setProdError('')
  }

  const catNombre = (id: string) => categorias.find(c => String(c.id) === id)?.nombre ?? '—'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: NAVY, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: PINK, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>OE</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#fff' }}>Order</span>
            <span style={{ color: PINK }}>Express</span>
          </span>
          <span style={{ color: '#ffffff60', fontSize: 13, marginLeft: 8 }}>/ Portal de Proveedores</span>
        </div>
        <a href="/" style={{ color: '#ffffff80', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Volver a la tienda</a>
      </header>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a1d4e 100%)`, padding: '48px 32px', textAlign: 'center' }}>
        <span style={{ background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Portal Proveedores
        </span>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '16px 0 8px', letterSpacing: '-0.02em' }}>
          Registra tus productos
        </h1>
        <p style={{ color: '#ffffff80', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
          Agrega uno o varios productos en una sola solicitud. Nuestro equipo los revisará y te contactará en 24-48 horas hábiles.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginTop: 36, flexWrap: 'wrap' }}>
          {[
            { n: '1', label: 'Llena el formulario' },
            { n: '2', label: 'Revisamos tu solicitud' },
            { n: '3', label: 'Publicamos tu producto' },
          ].map((step, i) => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 24px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{step.n}</div>
                <span style={{ color: '#ffffff90', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 1, background: '#ffffff30', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px 60px' }}>

        {formState === 'success' ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '56px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
            <div style={{ width: 72, height: 72, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✓</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: NAVY, marginBottom: 10 }}>¡Solicitud enviada!</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Recibimos tu solicitud con <strong>{productos.length + (prod.nombre ? 1 : 0)} producto(s)</strong>. Te contactaremos a <strong>{proveedor.email}</strong> en 24-48 horas hábiles.
            </p>
            <button onClick={resetForm}
              style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Enviar otra solicitud
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {errorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 24 }}>
                {errorMsg}
              </div>
            )}

            {/* ---- Sección: Datos del proveedor ---- */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, background: `${NAVY}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>👤</div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Datos del proveedor</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Tu información de contacto</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: PINK }}>*</span></label>
                  <input style={inputStyle} value={proveedor.nombre} onChange={e => setP('nombre', e.target.value)}
                    placeholder="Tu nombre" required onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Empresa / Marca</label>
                  <input style={inputStyle} value={proveedor.empresa} onChange={e => setP('empresa', e.target.value)}
                    placeholder="Nombre de tu empresa (opcional)" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Email de contacto <span style={{ color: PINK }}>*</span></label>
                  <input type="email" style={inputStyle} value={proveedor.email} onChange={e => setP('email', e.target.value)}
                    placeholder="proveedor@email.com" required onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" style={inputStyle} value={proveedor.telefono} onChange={e => setP('telefono', e.target.value)}
                    placeholder="+52 55 0000 0000 (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            {/* ---- Lista de productos añadidos ---- */}
            {productos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, padding: '20px 28px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 15 }}>🗂️</span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>
                    Productos en esta solicitud
                  </h3>
                  <span style={{ marginLeft: 'auto', background: PINK, color: '#fff', fontSize: 12, fontWeight: 800, padding: '2px 10px', borderRadius: 20 }}>
                    {productos.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', borderRadius: 12, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                      {p.imagenPreview && (
                        <img src={p.imagenPreview} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} />
                      )}
                      {!p.imagenPreview && (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                          SKU: {p.sku} · ${Number(p.precio).toLocaleString('es-MX')}
                          {p.categoria_id && ` · ${catNombre(p.categoria_id)}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => eliminarProducto(i)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: 30, height: 30, borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Sección: Agregar producto ---- */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, background: `${PINK}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📦</div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>
                    {productos.length === 0 ? 'Datos del producto' : 'Agregar otro producto'}
                  </h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Puedes añadir varios productos en una sola solicitud</p>
                </div>
              </div>

              {prodError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                  {prodError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Nombre del producto <span style={{ color: PINK }}>*</span></label>
                    <input style={inputStyle} value={prod.nombre} onChange={e => setPR('nombre', e.target.value)}
                      placeholder="Ej: Teclado mecánico TKL RGB" onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>SKU / Código <span style={{ color: PINK }}>*</span></label>
                    <input style={{ ...inputStyle, textTransform: 'uppercase' }} value={prod.sku}
                      onChange={e => setPR('sku', e.target.value.toUpperCase())}
                      placeholder="Ej: TEC-001" onFocus={focus} onBlur={blur} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Descripción</label>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
                    value={prod.descripcion} onChange={e => setPR('descripcion', e.target.value)}
                    placeholder="Características, materiales, dimensiones..."
                    onFocus={focus} onBlur={blur} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Precio (MXN) <span style={{ color: PINK }}>*</span></label>
                    <input type="number" min="0" step="0.01" style={inputStyle} value={prod.precio}
                      onChange={e => setPR('precio', e.target.value)}
                      placeholder="0.00" onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stock disponible</label>
                    <input type="number" min="0" style={inputStyle} value={prod.stock}
                      onChange={e => setPR('stock', e.target.value)}
                      placeholder="0" onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría</label>
                    {!nuevaCatMode ? (
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={prod.categoria_id}
                        onChange={e => {
                          if (e.target.value === '__nueva__') { setNuevaCatMode(true) }
                          else { setPR('categoria_id', e.target.value) }
                        }}
                        onFocus={focus} onBlur={blur}>
                        <option value="">Sin categoría</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                        <option value="__nueva__">➕ Crear nueva categoría...</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input style={{ ...inputStyle, flex: 1 }} value={nuevaCatNombre}
                          onChange={e => setNuevaCatNombre(e.target.value)}
                          placeholder="Nombre de la categoría"
                          onFocus={focus} onBlur={blur}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarNuevaCat() } }} />
                        <button type="button" onClick={guardarNuevaCat} disabled={savingCat}
                          style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 12px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {savingCat ? '...' : '✓ Guardar'}
                        </button>
                        <button type="button" onClick={() => setNuevaCatMode(false)}
                          style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0 10px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ---- Zona de imagen drag & drop ---- */}
                <div>
                  <label style={labelStyle}>Imagen del producto</label>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

                  {prod.imagenPreview ? (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb', flexShrink: 0 }}>
                        <img src={prod.imagenPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: NAVY }}>Imagen seleccionada ✓</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Se convertirá automáticamente a WebP</p>
                        <button type="button" onClick={() => setProd(p => ({ ...p, imagenFile: null, imagenPreview: null }))}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragging ? PINK : '#d1d5db'}`,
                        borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                        cursor: 'pointer', background: dragging ? `${PINK}08` : '#fafafa',
                        transition: 'all 0.2s',
                      }}>
                      {convirtiendo ? (
                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Procesando imagen...</p>
                      ) : (
                        <>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>
                            Arrastra una imagen o <span style={{ color: PINK, textDecoration: 'underline' }}>haz clic para elegir</span>
                          </p>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>JPG, PNG, WEBP · Máx. 10 MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Botón agregar producto */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={agregarProducto}
                  style={{ background: `${NAVY}15`, color: NAVY, border: `1.5px solid ${NAVY}30`, padding: '10px 22px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ＋ Agregar producto a la lista
                </button>
              </div>
            </div>

            {/* ---- Aviso legal ---- */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                <strong>Nota:</strong> Al enviar este formulario confirmas que eres el titular o representante autorizado del producto y que la información es verídica. Order Express revisará y validará cada solicitud antes de su publicación.
              </p>
            </div>

            {/* Borrador guardado */}
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
              💾 Tu borrador se guarda automáticamente en este navegador
            </p>

            {/* ---- Botón de envío ---- */}
            <button type="submit" disabled={formState === 'loading'}
              style={{ width: '100%', background: formState === 'loading' ? '#9ca3af' : PINK, color: '#fff', border: 'none', padding: '15px 0', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: formState === 'loading' ? 'default' : 'pointer', letterSpacing: '0.01em', boxShadow: formState === 'loading' ? 'none' : `0 4px 16px ${PINK}50` }}>
              {formState === 'loading'
                ? 'Enviando solicitud...'
                : productos.length > 0
                  ? `Enviar solicitud (${productos.length + (prod.nombre ? 1 : 0)} producto${productos.length + (prod.nombre ? 1 : 0) > 1 ? 's' : ''}) →`
                  : 'Enviar solicitud de producto →'}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: NAVY, padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ color: '#ffffff50', fontSize: 12, margin: 0 }}>
          © 2026 OrderExpress · ¿Dudas? Escríbenos a soporte@orderexpress.mx
        </p>
      </div>
    </div>
  )
}
