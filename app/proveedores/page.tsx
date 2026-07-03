'use client'

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { convertToWebp, uploadToSupabase } from '@/lib/uploadWebp'

const NAVY = '#252855'
const PINK = '#e7226d'
const DRAFT_KEY    = 'proveedor_draft_v1'
const EMAIL_KEY    = 'proveedor_email_saved'

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
  const [tab, setTab] = useState<'registro' | 'historial'>('registro')
  const [savedEmail, setSavedEmail] = useState('')
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

  // Consulta historial por email
  const [historialEmail, setHistorialEmail] = useState('')
  const [historialItems, setHistorialItems] = useState<{ id: string; producto_nombre: string; producto_sku: string; estado: string; created_at: string }[] | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialError, setHistorialError] = useState('')

  async function consultarHistorial() {
    const email = historialEmail.trim().toLowerCase()
    if (!email) return
    setLoadingHistorial(true)
    setHistorialError('')
    setHistorialItems(null)
    const { data, error } = await supabase
      .from('solicitudes_productos')
      .select('id, producto_nombre, producto_sku, estado, created_at')
      .eq('proveedor_email', email)
      .order('created_at', { ascending: false })
    setLoadingHistorial(false)
    if (error) { setHistorialError('Error al consultar. Intenta de nuevo.'); return }
    if (!data || data.length === 0) { setHistorialError('No encontramos solicitudes con ese email.'); return }
    setHistorialItems(data)
  }

  const [proveedor, setProveedor] = useState({
    nombre: '', empresa: '', email: '', telefono: '',
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar borrador + email guardado al inicio
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const { proveedor: p, prod: pr } = JSON.parse(raw)
        if (p) setProveedor(p)
        if (pr) setProd({ ...emptyProducto(), ...pr, imagenFile: null, imagenPreview: null })
      }
    } catch { /* ignorar */ }

    // Si ya envió antes, auto-cargar su historial
    try {
      const email = localStorage.getItem(EMAIL_KEY)
      if (email) {
        setSavedEmail(email)
        setHistorialEmail(email)
        setTab('historial')
        supabase
          .from('solicitudes_productos')
          .select('id, producto_nombre, producto_sku, estado, created_at')
          .eq('proveedor_email', email)
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data && data.length > 0) setHistorialItems(data) })
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
    try { localStorage.setItem(EMAIL_KEY, proveedor.email.trim().toLowerCase()) } catch {}
    setSavedEmail(proveedor.email.trim().toLowerCase())
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

  const navItem = (id: 'registro' | 'historial', label: string, emoji: string) => {
    const active = tab === id
    return (
      <button onClick={() => setTab(id)} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', width: '100%',
        color: NAVY, fontSize: 14, fontWeight: active ? 800 : 700, borderRadius: 999,
        background: active ? '#fff' : 'transparent', cursor: 'pointer',
        border: active ? `2px solid ${NAVY}` : '2px solid transparent',
        boxShadow: active ? '0 6px 16px rgba(37,40,85,0.12)' : 'none',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ flex: 1 }}>{label}</span>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ---- Sidebar (igual al admin) ---- */}
      <aside style={{ width: 240, height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100, padding: '20px 14px 16px' }}>

        {/* Logo */}
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', padding: '0 8px', marginBottom: 16 }}>
          <span style={{ color: '#1b1f4b' }}>Order</span>
          <span style={{ color: PINK }}>Express</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, minHeight: 0, background: '#f1f2f6', borderRadius: 22, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '12px 14px 6px', display: 'block' }}>PORTAL</span>
          {navItem('registro',  'Registrar producto', '📦')}
          {navItem('historial', 'Mis solicitudes',    '🔍')}
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '20px 14px 6px', display: 'block' }}>ACCESO</span>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', color: NAVY, fontSize: 14, fontWeight: 700, borderRadius: 999, border: '2px solid transparent', textDecoration: 'none' }}>
            <span style={{ fontSize: 16 }}>🏠</span> Volver a la tienda
          </a>
        </nav>

        {/* Footer: email guardado */}
        {savedEmail && (
          <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
              <div style={{ width: 34, height: 34, background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {savedEmail[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{savedEmail}</p>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: 20 }}>Proveedor</span>
              </div>
            </div>
            <button type="button" onClick={() => { try { localStorage.removeItem(EMAIL_KEY) } catch {} setSavedEmail(''); setHistorialEmail(''); setHistorialItems(null); setTab('registro') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: 'none', borderRadius: 999, background: 'rgba(231,34,109,0.10)', color: PINK, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              Cambiar cuenta
            </button>
          </div>
        )}
      </aside>

      {/* ---- Área principal ---- */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.01em' }}>
            {tab === 'registro' ? 'Registrar producto' : 'Mis solicitudes'}
          </h1>
          {tab === 'registro' && formState !== 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {[
                { n: '1', label: 'Llena el formulario' },
                { n: '2', label: 'Revisamos' },
                { n: '3', label: 'Publicamos' },
              ].map((step, i) => (
                <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, flexShrink: 0 }}>{step.n}</div>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
                  {i < 2 && <span style={{ color: '#d1d5db', marginLeft: 4 }}>→</span>}
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Contenido */}
        <main style={{ flex: 1, padding: '28px 32px 48px' }}>

        {tab === 'registro' && formState === 'success' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Confirmación */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: NAVY, marginBottom: 8 }}>¡Solicitud enviada!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Recibimos <strong>{productos.length} producto{productos.length !== 1 ? 's' : ''}</strong> de <strong>{proveedor.nombre}</strong>. Te contactaremos a <strong>{proveedor.email}</strong> en 24-48 horas hábiles.
              </p>
              <button onClick={resetForm}
                style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Enviar otra solicitud
              </button>
            </div>

            {/* Lista de productos enviados */}
            {productos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, background: `${NAVY}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>Productos registrados</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Pendientes de revisión por el equipo</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    {productos.length}
                  </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 28px', borderBottom: i < productos.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                      {/* Imagen o placeholder */}
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {p.imagenPreview
                          ? <img src={p.imagenPreview} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '📦'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>SKU: {p.sku || '—'} · Stock: {p.stock || 0}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#0049ff', margin: '0 0 2px' }}>${Number(p.precio || 0).toLocaleString('es-MX')}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>En revisión</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'registro' ? (
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
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20, overflow: 'hidden' }}>

                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 32, height: 32, background: `${NAVY}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🗂️</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Productos en esta solicitud</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Revisa y edita antes de enviar</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: PINK, color: '#fff', fontSize: 12, fontWeight: 900, padding: '3px 12px', borderRadius: 20 }}>
                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                {/* Encabezados de tabla */}
                <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 40px', gap: 0, padding: '8px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['#', '', 'Producto / SKU', 'Precio', 'Stock', 'Categoría', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 6px' }}>{h}</span>
                  ))}
                </div>

                {/* Filas */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 40px', gap: 0,
                      alignItems: 'center', padding: '10px 20px',
                      borderBottom: i < productos.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}>
                      {/* # */}
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, textAlign: 'center' }}>{i + 1}</span>

                      {/* Imagen */}
                      <div style={{ padding: '0 6px' }}>
                        {p.imagenPreview ? (
                          <img src={p.imagenPreview} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', display: 'block' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #e5e7eb' }}>📦</div>
                        )}
                      </div>

                      {/* Nombre + SKU */}
                      <div style={{ padding: '0 6px', minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.sku}</p>
                        {p.descripcion && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</p>
                        )}
                      </div>

                      {/* Precio */}
                      <div style={{ padding: '0 6px' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                          ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Stock */}
                      <div style={{ padding: '0 6px' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: Number(p.stock) === 0 ? '#9ca3af' : Number(p.stock) < 5 ? '#d97706' : '#374151',
                        }}>
                          {p.stock || '0'} uds
                        </span>
                      </div>

                      {/* Categoría */}
                      <div style={{ padding: '0 6px' }}>
                        {p.categoria_id ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: `${NAVY}10`, color: NAVY, padding: '3px 8px', borderRadius: 20, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {catNombre(p.categoria_id)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                        )}
                      </div>

                      {/* Eliminar */}
                      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'center' }}>
                        <button type="button" onClick={() => eliminarProducto(i)}
                          title="Eliminar producto"
                          style={{ background: 'transparent', color: '#d1d5db', border: 'none', width: 28, height: 28, borderRadius: 6, fontWeight: 900, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db' }}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: resumen total */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: `${NAVY}06`, borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    {productos.reduce((s, p) => s + (Number(p.stock) || 0), 0)} unidades en total
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Valor total estimado:</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: NAVY }}>
                      ${productos.reduce((s, p) => s + Number(p.precio) * (Number(p.stock) || 1), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Sección: Agregar producto ---- */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20, overflow: 'hidden' }}>

              {/* Cabecera de sección */}
              <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: `${PINK}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📦</div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>
                    {productos.length === 0 ? 'Datos del producto' : `Agregar producto ${productos.length + 1}`}
                  </h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Completa los campos y agrégalo a tu lista</p>
                </div>

                {/* Indicador de campos completados */}
                {(() => {
                  const filled = [prod.nombre, prod.sku, prod.precio].filter(v => v.trim()).length
                  const total = 3
                  return (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: total }).map((_, i) => (
                          <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: i < filled ? PINK : '#e5e7eb', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: filled === total ? PINK : '#9ca3af', fontWeight: 700 }}>
                        {filled === total ? 'Listo para agregar' : `${filled}/${total} campos`}
                      </span>
                    </div>
                  )
                })()}
              </div>

              {prodError && (
                <div style={{ margin: '0 28px', marginTop: 16, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  {prodError}
                </div>
              )}

              {/* Layout 2 columnas: formulario | preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0 }}>

                {/* Columna izquierda: campos */}
                <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Nombre */}
                  <div>
                    <label style={labelStyle}>
                      Nombre del producto <span style={{ color: PINK }}>*</span>
                    </label>
                    <input style={inputStyle} value={prod.nombre} onChange={e => setPR('nombre', e.target.value)}
                      placeholder="Ej: Teclado mecánico TKL RGB" onFocus={focus} onBlur={blur} />
                  </div>

                  {/* SKU + Categoría en fila */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>
                        SKU / Código <span style={{ color: PINK }}>*</span>
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Identificador único</span>
                      </label>
                      <input style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                        value={prod.sku} onChange={e => setPR('sku', e.target.value.toUpperCase())}
                        placeholder="TEC-001" onFocus={focus} onBlur={blur} />
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
                          <option value="__nueva__">➕ Nueva categoría...</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input style={{ ...inputStyle, flex: 1 }} value={nuevaCatNombre}
                            onChange={e => setNuevaCatNombre(e.target.value)}
                            placeholder="Nombre"
                            onFocus={focus} onBlur={blur}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarNuevaCat() } }} />
                          <button type="button" onClick={guardarNuevaCat} disabled={savingCat}
                            style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 10px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                            {savingCat ? '...' : '✓'}
                          </button>
                          <button type="button" onClick={() => setNuevaCatMode(false)}
                            style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0 8px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Precio + Stock en fila */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Precio (MXN) <span style={{ color: PINK }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', fontWeight: 700, pointerEvents: 'none' }}>$</span>
                        <input type="number" min="0" step="0.01"
                          style={{ ...inputStyle, paddingLeft: 26 }}
                          value={prod.precio} onChange={e => setPR('precio', e.target.value)}
                          placeholder="0.00" onFocus={focus} onBlur={blur} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Stock disponible
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Unidades</span>
                      </label>
                      <input type="number" min="0" style={inputStyle} value={prod.stock}
                        onChange={e => setPR('stock', e.target.value)}
                        placeholder="0" onFocus={focus} onBlur={blur} />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label style={labelStyle}>
                      Descripción
                      <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Opcional</span>
                    </label>
                    <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' } as React.CSSProperties}
                      value={prod.descripcion} onChange={e => setPR('descripcion', e.target.value)}
                      placeholder="Características, materiales, dimensiones, color..."
                      onFocus={focus} onBlur={blur} />
                  </div>

                </div>

                {/* Columna derecha: imagen + preview card */}
                <div style={{ borderLeft: '1px solid #f3f4f6', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: '#fafafa' }}>

                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0, textAlign: 'center' }}>Imagen del producto</p>

                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

                  {/* Zona imagen */}
                  {prod.imagenPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={prod.imagenPreview} alt="preview"
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: '2px solid #e5e7eb', display: 'block' }} />
                      <button type="button" onClick={() => setProd(p => ({ ...p, imagenFile: null, imagenPreview: null }))}
                        title="Quitar imagen"
                        style={{ position: 'absolute', top: 6, right: 6, background: '#000000aa', color: '#fff', border: 'none', width: 26, height: 26, borderRadius: '50%', fontWeight: 900, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                      <p style={{ textAlign: 'center', fontSize: 11, color: '#059669', fontWeight: 700, margin: '6px 0 0' }}>✓ WebP listo</p>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragging ? PINK : '#d1d5db'}`,
                        borderRadius: 12, padding: '20px 12px', textAlign: 'center',
                        cursor: 'pointer', background: dragging ? `${PINK}08` : '#fff',
                        transition: 'all 0.2s', aspectRatio: '1', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      {convirtiendo ? (
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Procesando...</p>
                      ) : (
                        <>
                          <span style={{ fontSize: 32 }}>📷</span>
                          <p style={{ fontSize: 12, fontWeight: 600, color: dragging ? PINK : NAVY, margin: 0, lineHeight: 1.3 }}>
                            {dragging ? 'Suelta aquí' : 'Arrastra o toca para subir'}
                          </p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>JPG · PNG · WEBP</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mini preview card */}
                  {(prod.nombre || prod.precio) && (
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '10px 12px', marginTop: 4 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Vista previa</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.nombre || '—'}
                      </p>
                      {prod.sku && <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', fontFamily: 'monospace' }}>{prod.sku}</p>}
                      {prod.precio && (
                        <p style={{ fontSize: 13, fontWeight: 900, color: '#059669', margin: 0 }}>
                          ${Number(prod.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón agregar producto */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  {productos.length > 0 ? `Ya tienes ${productos.length} producto${productos.length > 1 ? 's' : ''} en la lista` : 'Agrega todos los productos que quieras enviar'}
                </p>
                <button type="button" onClick={agregarProducto}
                  disabled={!prod.nombre.trim() || !prod.sku.trim() || !prod.precio}
                  style={{
                    background: (!prod.nombre.trim() || !prod.sku.trim() || !prod.precio) ? '#f3f4f6' : PINK,
                    color: (!prod.nombre.trim() || !prod.sku.trim() || !prod.precio) ? '#9ca3af' : '#fff',
                    border: 'none', padding: '11px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                    cursor: (!prod.nombre.trim() || !prod.sku.trim() || !prod.precio) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                    boxShadow: (!prod.nombre.trim() || !prod.sku.trim() || !prod.precio) ? 'none' : `0 4px 12px ${PINK}40`,
                  }}>
                  ＋ Agregar a la lista
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
        ) : null}

        {/* ---- Tab: Mis solicitudes ---- */}
        {tab === 'historial' && (
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
          <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: `${NAVY}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🔍</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Consultar mis solicitudes</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Ingresa tu email para ver el estado de tus productos enviados</p>
            </div>
          </div>

          <div style={{ padding: '20px 28px' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email"
                value={historialEmail}
                onChange={e => { setHistorialEmail(e.target.value); setHistorialItems(null); setHistorialError('') }}
                onKeyDown={e => e.key === 'Enter' && consultarHistorial()}
                placeholder="tu@email.com"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={focus} onBlur={blur}
              />
              <button
                type="button"
                onClick={consultarHistorial}
                disabled={loadingHistorial || !historialEmail.trim()}
                style={{ background: !historialEmail.trim() ? '#f3f4f6' : NAVY, color: !historialEmail.trim() ? '#9ca3af' : '#fff', border: 'none', padding: '0 24px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: !historialEmail.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {loadingHistorial ? 'Buscando...' : 'Consultar'}
              </button>
            </div>

            {historialError && (
              <div style={{ marginTop: 14, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                {historialError}
              </div>
            )}

            {historialItems && historialItems.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                  {historialItems.length} solicitud{historialItems.length > 1 ? 'es' : ''} encontrada{historialItems.length > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historialItems.map(item => {
                    const estadoStyle: Record<string, { bg: string; text: string; icon: string }> = {
                      pendiente:  { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
                      aprobado:   { bg: '#d1fae5', text: '#065f46', icon: '✅' },
                      rechazado:  { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
                    }
                    const st = estadoStyle[item.estado] ?? estadoStyle.pendiente
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{st.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto_nombre}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'inline-block', background: st.bg, color: st.text, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                            {item.estado}
                          </span>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                            {new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
        </main>
      </div>
    </div>
  )
}
