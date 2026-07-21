'use client'

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { convertToWebp, captureFrameAsWebp, uploadToSupabase } from '@/lib/uploadWebp'
import { useSidebar } from '@/lib/sidebar-context'

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

const PALETA_COLORES = [
  { nombre: 'Negro',    hex: '#1a1a1a' },
  { nombre: 'Blanco',   hex: '#f5f5f5' },
  { nombre: 'Gris',     hex: '#9ca3af' },
  { nombre: 'Rojo',     hex: '#ef4444' },
  { nombre: 'Rosa',     hex: '#ec4899' },
  { nombre: 'Naranja',  hex: '#f97316' },
  { nombre: 'Amarillo', hex: '#eab308' },
  { nombre: 'Verde',    hex: '#22c55e' },
  { nombre: 'Azul',     hex: '#3b82f6' },
  { nombre: 'Morado',   hex: '#8b5cf6' },
  { nombre: 'Café',     hex: '#92400e' },
  { nombre: 'Beige',    hex: '#d2b48c' },
]

const DRAFT_KEY    = 'proveedor_draft_v1'
const EMAIL_KEY    = 'proveedor_email_saved'
const PERFIL_KEY   = 'proveedor_perfil_v1'

type Categoria = { id: number; nombre: string }

type MiSolicitud = {
  id: string
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  estado: string
  created_at: string
  imagen_url: string | null
}

type ProductoLocal = {
  nombre: string
  sku: string
  descripcion: string
  precio: string
  stock: string
  categoria_id: string
  imagenFile: File | null
  imagenPreview: string | null
  // Opcionales
  colores: string[]
  tallas: string[]
  variantes: Array<{ color: string; talla: string; stock: string }>
  peso: string
  largo: string
  ancho: string
  alto: string
  imagenesExtra: Array<{ file: File | null; preview: string | null }>
}

const emptyProducto = (): ProductoLocal => ({
  nombre: '', sku: '', descripcion: '', precio: '',
  stock: '', categoria_id: '', imagenFile: null, imagenPreview: null,
  colores: [], tallas: [], variantes: [],
  peso: '', largo: '', ancho: '', alto: '', imagenesExtra: [],
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
  const [tab, setTab] = useState<'registro' | 'historial' | 'misEnviados' | 'ajustes'>('registro')
  const { isMobile } = useSidebar()
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  // Mis solicitudes (historial)
  const [historialItems, setHistorialItems] = useState<{ id: string; producto_nombre: string; producto_sku: string; estado: string; created_at: string }[] | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Panel "Mis productos enviados" en tab registro
  const [showMisProductos, setShowMisProductos] = useState(false)
  const [misProductos, setMisProductos] = useState<MiSolicitud[]>([])
  const [loadingMisProductos, setLoadingMisProductos] = useState(false)

  // Tab Ajustes — perfil guardado del proveedor
  const [perfil, setPerfil] = useState({ nombre: '', empresa: '', email: '', telefono: '' })
  const [perfilGuardado, setPerfilGuardado] = useState(false)

  async function cargarMisProductos(email: string) {
    setLoadingMisProductos(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('id, producto_nombre, producto_sku, producto_precio, estado, created_at, imagen_url')
      .eq('proveedor_email', email)
      .eq('estado', 'aprobado')
      .order('created_at', { ascending: false })
    setMisProductos(data ?? [])
    setLoadingMisProductos(false)
  }

  async function cargarHistorial(email: string) {
    if (!email) return
    setLoadingHistorial(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('id, producto_nombre, producto_sku, estado, created_at')
      .eq('proveedor_email', email)
      .neq('estado', 'aprobado')
      .order('created_at', { ascending: false })
    setHistorialItems(data ?? [])
    setLoadingHistorial(false)
  }

  const [proveedor, setProveedor] = useState({
    nombre: '', empresa: '', email: '', telefono: '',
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const extraFileRef = useRef<HTMLInputElement>(null)
  const [extraSlotTarget, setExtraSlotTarget] = useState(-1)
  const [extraDragging, setExtraDragging] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Chips colores/tallas
  const [colorInput, setColorInput] = useState('')
  const [tallaInput, setTallaInput] = useState('')
  const [mostrarOpcionales, setMostrarOpcionales] = useState(false)

  function buildVariantes(
    colores: string[], tallas: string[],
    existing: Array<{ color: string; talla: string; stock: string }>
  ) {
    if (colores.length === 0 && tallas.length === 0) return []
    if (colores.length > 0 && tallas.length === 0)
      return colores.map(color => ({ color, talla: '', stock: existing.find(v => v.color === color && v.talla === '')?.stock ?? '' }))
    if (tallas.length > 0 && colores.length === 0)
      return tallas.map(talla => ({ color: '', talla, stock: existing.find(v => v.color === '' && v.talla === talla)?.stock ?? '' }))
    return colores.flatMap(color => tallas.map(talla => ({ color, talla, stock: existing.find(v => v.color === color && v.talla === talla)?.stock ?? '' })))
  }

  function addColor(val: string) {
    const v = val.trim()
    if (!v || prod.colores.includes(v)) { setColorInput(''); return }
    const newColores = [...prod.colores, v]
    setProd(p => ({ ...p, colores: newColores, variantes: buildVariantes(newColores, p.tallas, p.variantes) }))
    setColorInput('')
  }
  function removeColor(c: string) {
    const newColores = prod.colores.filter(x => x !== c)
    setProd(p => ({ ...p, colores: newColores, variantes: buildVariantes(newColores, p.tallas, p.variantes) }))
  }
  function addTalla(val: string) {
    const v = val.trim()
    if (!v || prod.tallas.includes(v)) { setTallaInput(''); return }
    const newTallas = [...prod.tallas, v]
    setProd(p => ({ ...p, tallas: newTallas, variantes: buildVariantes(p.colores, newTallas, p.variantes) }))
    setTallaInput('')
  }
  function removeTalla(t: string) {
    const newTallas = prod.tallas.filter(x => x !== t)
    setProd(p => ({ ...p, tallas: newTallas, variantes: buildVariantes(p.colores, newTallas, p.variantes) }))
  }
  function setVarianteStock(idx: number, stock: string) {
    setProd(p => {
      const v = [...p.variantes]
      v[idx] = { ...v[idx], stock }
      return { ...p, variantes: v }
    })
  }

  async function agregarImagenesExtra(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setConvirtiendo(true)
    try {
      const converted = await Promise.all(arr.map(async f => {
        const webp = await convertToWebp(f)
        return { file: webp, preview: URL.createObjectURL(webp) }
      }))
      setProd(p => ({ ...p, imagenesExtra: [...p.imagenesExtra, ...converted] }))
    } finally { setConvirtiendo(false) }
  }
  function onExtraFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) agregarImagenesExtra(e.target.files)
    e.target.value = ''
  }
  function onExtraDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setExtraDragging(false)
    if (e.dataTransfer.files?.length) agregarImagenesExtra(e.dataTransfer.files)
  }
  function removeExtraImagen(idx: number) {
    setProd(p => {
      const extras = [...p.imagenesExtra]
      extras.splice(idx, 1)
      return { ...p, imagenesExtra: extras }
    })
  }

  // Cámara
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [camaraError, setCamaraError] = useState('')

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function abrirCamara() {
    setCamaraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCamaraActiva(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
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
      setProd(p => ({ ...p, imagenFile: webp, imagenPreview: url }))
      cerrarCamara()
    } finally {
      setConvirtiendo(false)
    }
  }

  // Cargar borrador + email guardado al inicio
  useEffect(() => {
    // Cargar perfil guardado del proveedor
    try {
      const rawPerfil = localStorage.getItem(PERFIL_KEY)
      if (rawPerfil) {
        const p = JSON.parse(rawPerfil)
        setPerfil(p)
        // Pre-llenar el form de registro con el perfil
        setProveedor(p)
      }
    } catch { /* ignorar */ }

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
        setTab('historial')
        cargarHistorial(email)
        cargarMisProductos(email)
      }
    } catch { /* ignorar */ }
  }, [])

  // Realtime: cuando el admin cambia el estado de una solicitud → refrescar
  useEffect(() => {
    if (!savedEmail) return
    const channel = supabase
      .channel('proveedor-solicitudes-' + savedEmail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_productos' }, () => {
        cargarHistorial(savedEmail)
        cargarMisProductos(savedEmail)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [savedEmail])

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

      // Subir imágenes extra
      const imagenesExtraUrls: string[] = []
      for (const extra of p.imagenesExtra) {
        if (extra.file) {
          try {
            const path = `solicitudes/${Date.now()}-${p.sku}-extra${imagenesExtraUrls.length}.webp`
            const url = await uploadToSupabase(extra.file, supabase, 'productos', path)
            if (url) imagenesExtraUrls.push(url)
          } catch { /* ignorar */ }
        }
      }

      // Detalles opcionales
      const detalles: Record<string, unknown> = {}
      if (p.colores.length)    detalles.colores   = p.colores
      if (p.tallas.length)     detalles.tallas    = p.tallas
      if (p.variantes.length)  detalles.variantes = p.variantes
      if (p.peso)              detalles.peso_g    = Number(p.peso)
      if (p.largo || p.ancho || p.alto) detalles.dimensiones = { largo: Number(p.largo)||0, ancho: Number(p.ancho)||0, alto: Number(p.alto)||0 }
      if (imagenesExtraUrls.length) detalles.imagenes_extra = imagenesExtraUrls

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
        detalles:             Object.keys(detalles).length ? detalles : null,
      })
    }

    const { error } = await supabase.from('solicitudes_productos').insert(rows)

    if (error) {
      console.error('Error inserting solicitud:', error)
      if (error.code === '23505') {
        setErrorMsg('Uno o más SKUs ya existen en el sistema. Revisa los códigos.')
      } else if (error.code === 'PGRST204' || error.message?.includes('detalles')) {
        setErrorMsg('Error de base de datos: falta ejecutar la migración SQL. Contacta al administrador.')
      } else {
        setErrorMsg(`Error al enviar la solicitud: ${error.message || error.code || 'desconocido'}`)
      }
      setFormState('error')
      return
    }

    localStorage.removeItem(DRAFT_KEY)
    const emailGuardado = proveedor.email.trim().toLowerCase()
    try { localStorage.setItem(EMAIL_KEY, emailGuardado) } catch {}
    setSavedEmail(emailGuardado)
    // Recargar listas para que reflejen los nuevos envíos
    cargarMisProductos(emailGuardado)
    cargarHistorial(emailGuardado)
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

  const navItem = (id: 'registro' | 'historial' | 'misEnviados' | 'ajustes', label: string, emoji: string) => {
    const active = tab === id
    return (
      <button onClick={() => {
        setTab(id)
        if (id === 'misEnviados' && savedEmail) cargarMisProductos(savedEmail)
        if (id === 'historial' && savedEmail) cargarHistorial(savedEmail)
      }} style={{
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

      {/* Overlay mobile — se muestra cuando el drawer está abierto, independiente de JS isMobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} />
      )}

      {/* ---- Sidebar ---- */}
      <aside className={`prov-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 240, maxWidth: 280, height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        zIndex: 100, padding: '16px 12px 16px', transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}>

        {/* Logo + botón cerrar en mobile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#1b1f4b' }}>Order</span>
            <span style={{ color: PINK }}>Express</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', flexShrink: 0 }}>
              ×
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, minHeight: 0, background: '#f1f2f6', borderRadius: 22, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '12px 14px 6px', display: 'block' }}>PORTAL</span>
          {navItem('registro',  'Registrar producto', '📦')}
          {navItem('historial', 'Mis solicitudes',    '🔍')}
          {navItem('misEnviados', 'Mis enviados', '📋')}
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '20px 14px 6px', display: 'block' }}>ACCESO</span>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', color: NAVY, fontSize: 14, fontWeight: 700, borderRadius: 999, border: '2px solid transparent', textDecoration: 'none' }}>
            <span style={{ fontSize: 16 }}>🏠</span> Volver a la tienda
          </a>
          {navItem('ajustes', 'Ajustes', '⚙️')}
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
            <button type="button" onClick={() => { try { localStorage.removeItem(EMAIL_KEY) } catch {} setSavedEmail(''); setHistorialItems(null); setTab('registro') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: 'none', borderRadius: 999, background: 'rgba(231,34,109,0.10)', color: PINK, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              Cambiar cuenta
            </button>
          </div>
        )}
      </aside>

      {/* ---- Área principal ---- */}
      <div className="prov-main" style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header className="prov-header" style={{ height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
          <button className="prov-hamburger" onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'none', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={sidebarOpen ? PINK : NAVY} strokeWidth="2.5" strokeLinecap="round">
              {sidebarOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
          <h1 className="prov-title" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.01em' }}>
            {tab === 'registro' ? 'Registrar producto' : tab === 'historial' ? 'Mis solicitudes' : tab === 'misEnviados' ? 'Mis enviados' : 'Ajustes'}
          </h1>
          {tab === 'registro' && formState !== 'success' && (
            <div className="prov-steps" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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

        {/* Barra de tabs mobile */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f3f4f6', WebkitOverflowScrolling: 'touch' as any, flexShrink: 0 }}>
            {([
              { id: 'registro',    label: '📦 Registrar' },
              { id: 'historial',   label: '🔍 Solicitudes' },
              { id: 'misEnviados', label: '📋 Enviados' },
              { id: 'ajustes',     label: '⚙️ Ajustes' },
            ] as const).map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, background: tab === item.id ? NAVY : '#f3f4f6', color: tab === item.id ? '#fff' : '#374151' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '28px 32px 48px' }}>

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

            {/* Aviso si no hay perfil configurado */}
            {!proveedor.nombre && !proveedor.email && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚙️</span>
                <p style={{ fontSize: 13, color: '#1e40af', margin: 0, fontWeight: 600 }}>
                  Configura tus datos en{' '}
                  <button type="button" onClick={() => setTab('ajustes')}
                    style={{ background: 'none', border: 'none', color: '#1e40af', fontWeight: 800, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Ajustes
                  </button>
                  {' '}para no tener que llenarlos cada vez.
                </p>
              </div>
            )}

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

                {/* Encabezados de tabla + filas: scroll horizontal en mobile */}
                <div className="prov-table-scroll">
                <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 70px', gap: 0, padding: '8px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', minWidth: 520 }}>
                  {['#', '', 'Producto / SKU', 'Precio', 'Stock', 'Categoría', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 6px' }}>{h}</span>
                  ))}
                </div>

                {/* Filas */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 520 }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 70px', gap: 0,
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

                      {/* Editar / Eliminar */}
                      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <button type="button"
                          title="Editar producto"
                          onClick={() => {
                            setProd(productos[i])
                            eliminarProducto(i)
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                          }}
                          style={{ background: 'transparent', color: '#d1d5db', border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; (e.currentTarget as HTMLButtonElement).style.color = '#0049ff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db' }}>
                          ✏️
                        </button>
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
                </div>{/* /prov-table-scroll */}

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
              <div className="prov-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0 }}>

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
                  <div className="prov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <div className="prov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                  {/* Toggle campos opcionales */}
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 4 }}>
                    <button type="button" onClick={() => setMostrarOpcionales(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151', width: '100%' }}>
                      <span style={{ fontSize: 10, transform: mostrarOpcionales ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                      Datos adicionales
                      {(prod.colores.length > 0 || prod.tallas.length > 0 || prod.imagenesExtra.length > 0) ? (
                        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                          {prod.colores.length > 0 && <span style={{ background: `${NAVY}14`, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{prod.colores.length} color{prod.colores.length > 1 ? 'es' : ''}</span>}
                          {prod.tallas.length > 0 && <span style={{ background: `${PINK}14`, color: PINK, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{prod.tallas.length} talla{prod.tallas.length > 1 ? 's' : ''}</span>}
                          {prod.imagenesExtra.length > 0 && <span style={{ background: '#f0fdf4', color: '#059669', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{prod.imagenesExtra.length} foto{prod.imagenesExtra.length > 1 ? 's' : ''}</span>}
                        </div>
                      ) : (
                        <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 4 }}>colores, tallas, peso, fotos extra</span>
                      )}
                    </button>
                  </div>

                  {mostrarOpcionales && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                      {/* ---- Colores ---- */}
                      <div style={{ padding: '14px 0', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#374151' }}>🎨 Colores disponibles</p>
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af' }}>Selecciona los colores en que viene el producto</p>
                        {/* Paleta rápida */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {PALETA_COLORES.map(({ nombre, hex }) => {
                            const activo = prod.colores.includes(nombre)
                            return (
                              <button key={nombre} type="button" title={nombre}
                                onClick={() => activo ? removeColor(nombre) : addColor(nombre)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 6px', borderRadius: 20, border: `2px solid ${activo ? '#111' : 'transparent'}`, background: activo ? '#f3f4f6' : '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                                {nombre}
                                {activo && <span style={{ color: '#059669', fontSize: 11 }}>✓</span>}
                              </button>
                            )
                          })}
                        </div>
                        {/* Chips seleccionados */}
                        {prod.colores.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: '8px 10px', background: `${NAVY}06`, borderRadius: 8 }}>
                            {prod.colores.map(c => {
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
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input style={{ ...inputStyle, flex: 1, fontSize: 13 }} value={colorInput}
                            onChange={e => setColorInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(colorInput) } }}
                            placeholder="Color personalizado (Enter para agregar)" onFocus={focus} onBlur={blur} />
                          <button type="button" onClick={() => addColor(colorInput)}
                            style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                        </div>
                      </div>

                      {/* ---- Tallas ---- */}
                      <div style={{ padding: '14px 0', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#374151' }}>📏 Tallas / Tamaños</p>
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af' }}>Escribe cada talla o medida y presiona Enter</p>
                        {prod.tallas.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {prod.tallas.map(t => (
                              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: PINK, color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>
                                {t}
                                <button type="button" onClick={() => removeTalla(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input style={{ ...inputStyle, flex: 1, fontSize: 13 }} value={tallaInput}
                            onChange={e => setTallaInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTalla(tallaInput) } }}
                            placeholder="Ej: XS, S, M, L — o 38, 39, 40 — o Único" onFocus={focus} onBlur={blur} />
                          <button type="button" onClick={() => addTalla(tallaInput)}
                            style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                        </div>
                      </div>

                      {/* ---- Variantes con stock ---- */}
                      {prod.variantes.length > 0 && (
                        <div style={{ padding: '14px 0', borderTop: '1px solid #f3f4f6' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#374151' }}>📦 Stock por variante</p>
                          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af' }}>Indica las unidades disponibles por combinación</p>
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', background: '#f9fafb', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Variante</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Stock</span>
                            </div>
                            {prod.variantes.map((v, i) => (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 14px', borderBottom: i < prod.variantes.length - 1 ? '1px solid #f3f4f6' : 'none', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  {v.color && (() => { const hex = PALETA_COLORES.find(p => p.nombre === v.color)?.hex; return hex ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} /> : null })()}
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{[v.color, v.talla].filter(Boolean).join(' · ')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button type="button" onClick={() => setVarianteStock(i, String(Math.max(0, Number(v.stock || 0) - 1)))}
                                    style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>−</button>
                                  <input type="number" min="0"
                                    style={{ width: 56, padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, textAlign: 'center' as const, outline: 'none', background: '#fff' }}
                                    value={v.stock} onChange={e => setVarianteStock(i, e.target.value)} onFocus={focus} onBlur={blur} />
                                  <button type="button" onClick={() => setVarianteStock(i, String(Number(v.stock || 0) + 1))}
                                    style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>+</button>
                                </div>
                              </div>
                            ))}
                            <div style={{ background: '#f9fafb', padding: '8px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{prod.variantes.length} variante{prod.variantes.length > 1 ? 's' : ''}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Total: {prod.variantes.reduce((t, v) => t + (Number(v.stock) || 0), 0)} uds</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ---- Envío ---- */}
                      <div style={{ padding: '14px 0', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>🚚 Envío</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <label style={{ ...labelStyle, marginBottom: 6 }}>Peso <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>gramos</span></label>
                            <div style={{ position: 'relative' }}>
                              <input type="number" min="0" style={{ ...inputStyle, paddingRight: 36 }} value={prod.peso}
                                onChange={e => setProd(p => ({ ...p, peso: e.target.value }))}
                                placeholder="Ej: 850" onFocus={focus} onBlur={blur} />
                              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af', pointerEvents: 'none' as const }}>g</span>
                            </div>
                          </div>
                          <div>
                            <label style={{ ...labelStyle, marginBottom: 6 }}>Dimensiones <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>cm</span></label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                              {([['largo', 'Largo'], ['ancho', 'Ancho'], ['alto', 'Alto']] as const).map(([dim, label]) => (
                                <div key={dim} style={{ position: 'relative' }}>
                                  <input type="number" min="0"
                                    style={{ ...inputStyle, padding: '9px 8px', textAlign: 'center' as const, fontSize: 13 }}
                                    value={prod[dim]} onChange={e => setProd(p => ({ ...p, [dim]: e.target.value }))}
                                    placeholder={label[0]} onFocus={focus} onBlur={blur} />
                                  <span style={{ position: 'absolute', bottom: -16, left: 0, right: 0, textAlign: 'center' as const, fontSize: 10, color: '#9ca3af' }}>{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ---- Fotos adicionales ---- */}
                      <div style={{ padding: '14px 0 4px', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#374151' }}>🖼️ Fotos adicionales</p>
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af' }}>Imágenes extra del producto: ángulos, detalles o uso</p>
                        <div
                          onDragOver={e => { e.preventDefault(); setExtraDragging(true) }}
                          onDragLeave={() => setExtraDragging(false)}
                          onDrop={onExtraDrop}
                          style={{ border: `2px dashed ${extraDragging ? BLUE : '#d1d5db'}`, borderRadius: 12, background: extraDragging ? `${BLUE}06` : '#fafafa', transition: 'border-color 0.15s, background 0.15s', overflow: 'hidden' }}>
                          {prod.imagenesExtra.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 12 }}>
                              {prod.imagenesExtra.map((extra, i) => (
                                <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                                  <img src={extra.preview!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  <button type="button" onClick={() => removeExtraImagen(i)}
                                    style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div onClick={() => extraFileRef.current?.click()} style={{ cursor: 'pointer', padding: prod.imagenesExtra.length > 0 ? '10px 12px 14px' : '28px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: prod.imagenesExtra.length > 0 ? '1px dashed #e5e7eb' : 'none' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📎</div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                              {prod.imagenesExtra.length > 0 ? 'Agregar más fotos' : 'Arrastra fotos aquí o haz clic para seleccionar'}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Puedes seleccionar varias imágenes a la vez</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

                {/* Columna derecha: imagen */}
                <div style={{ borderLeft: '1px solid #f3f4f6', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0 }}>Imagen del producto</p>
                    {!camaraActiva && !prod.imagenPreview && (
                      <button type="button" onClick={abrirCamara}
                        style={{ background: '#f3f4f6', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        📷 Cámara
                      </button>
                    )}
                  </div>

                  <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
                  <input ref={extraFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onExtraFileChange} />

                  {/* Vista de cámara activa */}
                  {camaraActiva && (
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${NAVY}`, position: 'relative', background: '#000' }}>
                      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <button type="button" onClick={cerrarCamara}
                          style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                        <button type="button" onClick={tomarFoto} disabled={convirtiendo}
                          style={{ background: '#fff', color: '#111', border: 'none', padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          {convirtiendo ? '⏳ Procesando...' : '📸 Tomar foto'}
                        </button>
                      </div>
                    </div>
                  )}

                  {camaraError && (
                    <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, margin: 0 }}>⚠️ {camaraError}</p>
                  )}

                  {/* Preview de imagen */}
                  {!camaraActiva && prod.imagenPreview && (
                    <div style={{ position: 'relative' }}>
                      <img src={prod.imagenPreview} alt="preview"
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: '1px solid #e5e7eb', display: 'block' }} />
                      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 5 }}>
                        <button type="button" onClick={abrirCamara}
                          style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                          📷
                        </button>
                        <button type="button" onClick={() => fileRef.current?.click()}
                          style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                          🖼️
                        </button>
                        <button type="button" onClick={() => setProd(p => ({ ...p, imagenFile: null, imagenPreview: null }))}
                          style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ×
                        </button>
                      </div>
                      {prod.imagenFile && (
                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>
                          ✅ WebP · {(prod.imagenFile.size / 1024).toFixed(0)} KB
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zona drag & drop */}
                  {!camaraActiva && !prod.imagenPreview && (
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
                        <>
                          <span style={{ fontSize: 28 }}>⏳</span>
                          <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 600 }}>Convirtiendo a WebP...</p>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 32 }}>🖼️</span>
                          <p style={{ fontSize: 12, fontWeight: 600, color: dragging ? PINK : NAVY, margin: 0, lineHeight: 1.3 }}>
                            {dragging ? 'Suelta aquí' : 'Arrastra o toca para subir'}
                          </p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>PNG · JPG · WEBP · Se convierte a WebP</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mini preview card */}
                  {(prod.nombre || prod.precio) && !camaraActiva && (
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>Vista previa</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nombre || '—'}</p>
                      {prod.sku && <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', fontFamily: 'monospace' }}>{prod.sku}</p>}
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

        {/* ---- Tab: Mis enviados ---- */}
        {tab === 'misEnviados' && (
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>

            {loadingMisProductos ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cargando...</p>
              </div>
            ) : misProductos.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 40, margin: '0 0 12px' }}>⏳</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Aún no tienes productos aprobados</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cuando el equipo apruebe tus solicitudes, aparecerán aquí.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {misProductos.map((item, i) => {
                    const estadoMap: Record<string, { bg: string; text: string; label: string }> = {
                      pendiente: { bg: '#fef3c7', text: '#92400e', label: '⏳ Pendiente' },
                      aprobado:  { bg: '#d1fae5', text: '#065f46', label: '✅ Aprobado' },
                      rechazado: { bg: '#fee2e2', text: '#991b1b', label: '❌ Rechazado' },
                    }
                    const st = estadoMap[item.estado] ?? estadoMap.pendiente
                    return (
                      <div key={item.id} style={{
                        display: 'grid', gridTemplateColumns: '56px 1fr auto',
                        gap: 16, alignItems: 'center', padding: '14px 28px',
                        borderBottom: i < misProductos.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                      }}>
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #e5e7eb', flexShrink: 0 }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt={item.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '📦'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto_nombre}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</span>
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>
                              ${Number(item.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <span style={{ display: 'inline-flex', background: st.bg, color: st.text, fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '12px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{misProductos.length} producto{misProductos.length !== 1 ? 's' : ''} encontrado{misProductos.length !== 1 ? 's' : ''}</span>
                  <button type="button" onClick={() => { if (savedEmail) cargarMisProductos(savedEmail) }}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Actualizar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Tab: Ajustes ---- */}
        {tab === 'ajustes' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, background: `${NAVY}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>Datos del proveedor</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Se guardan en este navegador y se llenan automáticamente al registrar productos</p>
              </div>
            </div>

            {perfilGuardado && (
              <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#065f46', fontWeight: 600, marginBottom: 20 }}>
                ✓ Datos guardados correctamente
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: PINK }}>*</span></label>
                  <input style={inputStyle} value={perfil.nombre}
                    onChange={e => { setPerfil(p => ({ ...p, nombre: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="Tu nombre completo" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Empresa / Marca</label>
                  <input style={inputStyle} value={perfil.empresa}
                    onChange={e => { setPerfil(p => ({ ...p, empresa: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="Nombre de tu empresa (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Email de contacto <span style={{ color: PINK }}>*</span></label>
                  <input type="email" style={inputStyle} value={perfil.email}
                    onChange={e => { setPerfil(p => ({ ...p, email: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="proveedor@email.com" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" style={inputStyle} value={perfil.telefono}
                    onChange={e => { setPerfil(p => ({ ...p, telefono: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="+52 55 0000 0000 (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                disabled={!perfil.nombre.trim() || !perfil.email.trim()}
                onClick={() => {
                  try { localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil)) } catch {}
                  try { localStorage.setItem(EMAIL_KEY, perfil.email.trim().toLowerCase()) } catch {}
                  setSavedEmail(perfil.email.trim().toLowerCase())
                  setProveedor(perfil)
                  setPerfilGuardado(true)
                  setTimeout(() => setPerfilGuardado(false), 3000)
                }}
                style={{
                  flex: 1, background: (!perfil.nombre.trim() || !perfil.email.trim()) ? '#f3f4f6' : NAVY,
                  color: (!perfil.nombre.trim() || !perfil.email.trim()) ? '#9ca3af' : '#fff',
                  border: 'none', padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 15,
                  cursor: (!perfil.nombre.trim() || !perfil.email.trim()) ? 'not-allowed' : 'pointer',
                }}>
                Guardar datos
              </button>
              {perfil.nombre && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil({ nombre: '', empresa: '', email: '', telefono: '' })
                    try { localStorage.removeItem(PERFIL_KEY) } catch {}
                    try { localStorage.removeItem(EMAIL_KEY) } catch {}
                    setSavedEmail('')
                    setProveedor({ nombre: '', empresa: '', email: '', telefono: '' })
                    setPerfilGuardado(false)
                  }}
                  style={{ padding: '13px 20px', borderRadius: 12, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Limpiar
                </button>
              )}
            </div>

            <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 16 }}>
              💾 Los datos se almacenan solo en este navegador
            </p>
          </div>
        )}

        {/* ---- Tab: Mis solicitudes ---- */}
        {tab === 'historial' && (
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>

          {/* Sin datos aún */}
          {!historialItems && !loadingHistorial && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Configura tu email en Ajustes para ver tus solicitudes</p>
            </div>
          )}

          {/* Cargando */}
          {loadingHistorial && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cargando solicitudes...</p>
            </div>
          )}

          {/* Lista con resultados */}
          {historialItems && historialItems.length > 0 && (() => {
            const aprobados  = historialItems.filter(i => i.estado === 'aprobado')
            const pendientes = historialItems.filter(i => i.estado === 'pendiente')
            const rechazados = historialItems.filter(i => i.estado === 'rechazado')
            const estadoMap: Record<string, { bg: string; text: string; label: string; borderColor: string }> = {
              pendiente: { bg: '#fffbeb', text: '#92400e', label: '⏳ En revisión', borderColor: '#fde68a' },
              aprobado:  { bg: '#f0fdf4', text: '#065f46', label: '✅ Aprobado',    borderColor: '#86efac' },
              rechazado: { bg: '#fef2f2', text: '#991b1b', label: '❌ Rechazado',   borderColor: '#fca5a5' },
            }
            return (
              <>
                {/* Header con resumen */}
                <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Mis solicitudes</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{historialItems.length} producto{historialItems.length !== 1 ? 's' : ''} enviado{historialItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {aprobados.length > 0 && (
                      <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ✅ {aprobados.length} aprobado{aprobados.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {pendientes.length > 0 && (
                      <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ⏳ {pendientes.length} en revisión
                      </span>
                    )}
                    {rechazados.length > 0 && (
                      <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ❌ {rechazados.length} rechazado{rechazados.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filas de solicitudes */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historialItems.map((item, i) => {
                    const st = estadoMap[item.estado] ?? estadoMap.pendiente
                    return (
                      <div key={item.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        gap: 16, alignItems: 'center', padding: '14px 28px',
                        borderBottom: i < historialItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        borderLeft: `3px solid ${st.borderColor}`,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto_nombre}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</span>
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <span style={{ display: 'inline-flex', background: st.bg, color: st.text, fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => savedEmail && cargarHistorial(savedEmail)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Actualizar
                  </button>
                </div>
              </>
            )
          })()}
        </div>
        )}
        </main>
      </div>
    </div>
  )
}
