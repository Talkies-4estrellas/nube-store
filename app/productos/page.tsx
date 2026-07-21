'use client'

import { useState, useEffect } from 'react'
import ProductoModal from '@/components/ProductoModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import ImportCSVModal from '@/components/ImportCSVModal'
import { supabase } from '@/lib/supabase'
import { uploadToSupabase } from '@/lib/uploadWebp'
import { toCSV, downloadCSV } from '@/lib/csv'
import Icon from '@/components/Icon'
import { SkeletonCard, SkeletonTableBody } from '@/components/Skeleton'

const PAGE_SIZE = 12
const NAVY = '#252855'
const PINK  = '#e7226d'
const BLUE  = '#0049ff'

type DetallesSolicitud = {
  colores?: string[]
  tallas?: string[]
  variantes?: Array<{ color: string; talla: string; stock: number }>
  peso_g?: number
  dimensiones?: { largo: number; ancho: number; alto: number }
  imagenes_extra?: string[]
}

type Solicitud = {
  id: string
  proveedor_nombre: string
  proveedor_email: string
  proveedor_empresa: string | null
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  producto_stock: number
  categoria_id: number | null
  imagen_url: string | null
  created_at: string
  detalles?: DetallesSolicitud | null
}

type Product = {
  id: string
  nombre: string
  categoria: string
  precio: number
  stock: number
  estado: string
  sku: string
  imagen_url?: string | null
  origen?: string | null
  proveedor_nombre?: string | null
}

const estadoStyle: Record<string, { bg: string; text: string }> = {
  'Activo':     { bg: '#d1fae5', text: '#065f46' },
  'Stock bajo': { bg: '#fef3c7', text: '#92400e' },
  'Sin stock':  { bg: '#fee2e2', text: '#991b1b' },
}

const paletaColores = ['#818cf8', '#34d399', '#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf']

function colorCategoria(nombre: string, lista: string[]) {
  const idx = lista.indexOf(nombre)
  return paletaColores[idx % paletaColores.length] ?? '#e5e7eb'
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'nombre' | 'precio' | 'stock'>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [proveedorFiltro, setProveedorFiltro] = useState<string | null>(null)
  const [showSolicitudes, setShowSolicitudes] = useState(false)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loadingSol, setLoadingSol] = useState(false)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null)
  const [solicitudDetalle, setSolicitudDetalle] = useState<Solicitud | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [confirmExport, setConfirmExport] = useState(false)

  async function exportarCSV() {
    setExportando(true)
    const [prodRes, catRes] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('categorias').select('id, nombre'),
    ])
    setExportando(false)
    if (prodRes.error || !prodRes.data) { setToast({ msg: 'Error al exportar productos', color: PINK }); return }

    const mapaCat = new Map<number, string>((catRes.data ?? []).map(c => [c.id as number, c.nombre as string]))
    const v = (x: unknown) => x ?? ''
    const rows = prodRes.data.map((p: Record<string, unknown>) => ({
      sku: v(p.sku),
      nombre: v(p.nombre),
      precio: v(p.precio),
      precio_promocional: v(p.precio_promocional),
      costo: v(p.costo),
      stock: v(p.stock),
      categoria: p.categoria_id != null ? (mapaCat.get(p.categoria_id as number) ?? '') : '',
      marca: v(p.marca),
      codigo_barras: v(p.codigo_barras),
      mpn: v(p.mpn),
      descripcion: v(p.descripcion),
      imagen_url: v(p.imagen_url),
      slug: v(p.slug),
      tags: v(p.tags),
      seo_titulo: v(p.seo_titulo),
      seo_descripcion: v(p.seo_descripcion),
      peso_kg: v(p.peso_kg),
      alto_cm: v(p.alto_cm),
      ancho_cm: v(p.ancho_cm),
      profundidad_cm: v(p.profundidad_cm),
      ubicacion: v(p.ubicacion),
      proveedor: v(p.proveedor_nombre),
      activo: p.activo === false ? 'NO' : 'SI',
      envio_gratis: p.envio_gratis ? 'SI' : 'NO',
      detalles: p.detalles ? JSON.stringify(p.detalles) : '',
    }))
    const cols = [
      'sku', 'nombre', 'precio', 'precio_promocional', 'costo', 'stock', 'categoria',
      'marca', 'codigo_barras', 'mpn', 'descripcion', 'imagen_url', 'slug', 'tags',
      'seo_titulo', 'seo_descripcion', 'peso_kg', 'alto_cm', 'ancho_cm', 'profundidad_cm',
      'ubicacion', 'proveedor', 'activo', 'envio_gratis', 'detalles',
    ]
    const fecha = new Date().toISOString().slice(0, 10)
    downloadCSV(`productos-${fecha}.csv`, toCSV(rows, cols))
    setToast({ msg: `${rows.length} productos exportados`, color: BLUE })
  }

  async function fetchSolicitudes() {
    setLoadingSol(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('id, proveedor_nombre, proveedor_email, proveedor_empresa, producto_nombre, producto_sku, producto_precio, producto_stock, categoria_id, imagen_url, created_at, detalles')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    setSolicitudes(data ?? [])
    setLoadingSol(false)
  }

  async function notificarProveedor(sol: Solicitud, estado: 'aprobado' | 'rechazado') {
    try {
      await supabase.functions.invoke('notify-proveedor', {
        body: {
          proveedor_email: sol.proveedor_email,
          proveedor_nombre: sol.proveedor_nombre,
          producto_nombre: sol.producto_nombre,
          estado,
        }
      })
    } catch {}
  }

  async function cambiarEstadoSol(id: string, estado: 'aprobado' | 'rechazado') {
    setProcesando(id)
    const sol = solicitudes.find(s => s.id === id)
    if (estado === 'aprobado' && sol) {
      const { error: errIns } = await supabase.from('productos').upsert({
        nombre: sol.producto_nombre, sku: sol.producto_sku,
        precio: sol.producto_precio, stock: sol.producto_stock,
        imagen_url: sol.imagen_url, categoria_id: sol.categoria_id,
        origen: 'proveedor',
        proveedor_nombre: sol.proveedor_empresa || sol.proveedor_nombre,
      }, { onConflict: 'sku', ignoreDuplicates: true })
      if (errIns) console.error('Error al publicar producto:', errIns)
    }
    const { error: errUpd } = await supabase
      .from('solicitudes_productos').update({ estado }).eq('id', id)
    if (errUpd) {
      console.error('Error al actualizar estado:', errUpd)
      setToast({ msg: `Error: ${errUpd.message}`, color: '#dc2626' })
      setTimeout(() => setToast(null), 4000)
      setProcesando(null)
      return
    }
    if (sol) notificarProveedor(sol, estado)
    setSolicitudes(prev => prev.filter(s => s.id !== id))
    setProcesando(null)
    const msg = estado === 'aprobado' ? 'Producto aprobado y publicado' : 'Solicitud rechazada'
    const color = estado === 'aprobado' ? '#059669' : '#dc2626'
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
    if (estado === 'aprobado') fetchProducts()
  }

  async function aprobarTodos() {
    setProcesando('all')
    for (const sol of solicitudes) {
      await supabase.from('productos').insert({
        nombre: sol.producto_nombre, sku: sol.producto_sku,
        precio: sol.producto_precio, stock: sol.producto_stock,
        imagen_url: sol.imagen_url, categoria_id: sol.categoria_id, activo: true,
        origen: 'proveedor',
        proveedor_nombre: sol.proveedor_empresa || sol.proveedor_nombre,
      })
      await supabase.from('solicitudes_productos').update({ estado: 'aprobado' }).eq('id', sol.id)
    }
    const n = solicitudes.length
    setSolicitudes([])
    setProcesando(null)
    setToast({ msg: `${n} productos aprobados y publicados`, color: '#059669' })
    setTimeout(() => setToast(null), 3000)
    fetchProducts()
  }

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('nombre').order('nombre')
    if (data) setCategorias(data.map(c => c.nombre))
  }

  async function fetchProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('productos_con_estado')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCategorias()
    fetchProducts()
  }, [])

  async function handleSave(form: {
    nombre: string; sku: string; categoria: string; precio: string
    stock: string; descripcion: string; imagen: File | null; imagenPreview: string | null
    colores: string[]; tallas: string[]; variantes: Array<{ color: string; talla: string; stock: string }>
    peso: string; largo: string; ancho: string; alto: string
    imagenesExtra: Array<{ file: File | null; preview: string | null }>
  }) {
    let imagen_url: string | null = null

    if (form.imagen) {
      const safeSku = form.sku.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
      const path = `${Date.now()}-${safeSku || 'producto'}.webp`
      try {
        imagen_url = await uploadToSupabase(form.imagen, supabase, 'productos', path)
      } catch (e) {
        console.error('Error subiendo imagen:', e)
      }
    }

    // Subir imágenes adicionales
    const urlsExtra: string[] = []
    for (const extra of form.imagenesExtra) {
      if (!extra.file) continue
      try {
        const path = `extra-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        const url = await uploadToSupabase(extra.file, supabase, 'productos', path)
        urlsExtra.push(url)
      } catch (e) { console.error('Error subiendo imagen extra:', e) }
    }

    // Obtener o crear categoría
    let categoria_id: string | null = null
    const { data: catExistente } = await supabase
      .from('categorias')
      .select('id')
      .eq('nombre', form.categoria)
      .single()

    if (catExistente) {
      categoria_id = catExistente.id
    } else {
      const { data: catNueva } = await supabase
        .from('categorias')
        .insert({ nombre: form.categoria })
        .select('id')
        .single()
      if (catNueva) {
        categoria_id = catNueva.id
        await fetchCategorias()
      }
    }

    const tieneDetalles = form.colores.length > 0 || form.tallas.length > 0 || form.variantes.length > 0 || form.peso || form.largo || urlsExtra.length > 0
    const detalles = tieneDetalles ? {
      colores: form.colores,
      tallas: form.tallas,
      variantes: form.variantes.map(v => ({ ...v, stock: parseInt(v.stock) || 0 })),
      peso_g: form.peso ? parseInt(form.peso) : null,
      dimensiones: (form.largo || form.ancho || form.alto) ? { largo: form.largo, ancho: form.ancho, alto: form.alto } : null,
      imagenes_extra: urlsExtra,
    } : null

    const payload = {
      nombre: form.nombre,
      sku: form.sku,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      categoria_id,
      ...(imagen_url ? { imagen_url } : {}),
      detalles,
    }

    const { error } = editando
      ? await supabase.from('productos').update(payload).eq('id', editando.id)
      : await supabase.from('productos').insert(payload)

    if (!error) {
      await fetchProducts()
      setShowModal(false)
      setEditando(null)
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  async function handleDelete(product: Product) {
    setDeleting(product.id)
    if (product.imagen_url) {
      const path = product.imagen_url.split('/productos/')[1]
      if (path) await supabase.storage.from('productos').remove([path])
    }
    await supabase.from('productos').delete().eq('id', product.id)
    await fetchProducts()
    setDeleting(null)
    setConfirmDelete(null)
  }

  const categoriasConTodas = ['Todas', ...categorias]

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  const proveedores = [...new Set(
    products.filter(p => p.origen === 'proveedor' && p.proveedor_nombre).map(p => p.proveedor_nombre!)
  )]

  const filtered = products
    .filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoria === 'Todas' || p.categoria === categoria
      const matchProv = !proveedorFiltro || p.proveedor_nombre === proveedorFiltro
      return matchSearch && matchCat && matchProv
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'nombre') return mul * a.nombre.localeCompare(b.nombre)
      if (sortBy === 'precio') return mul * (a.precio - b.precio)
      return mul * (a.stock - b.stock)
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <span style={{ color: '#d1d5db', fontSize: 10, marginLeft: 4 }}>↕</span>
    return <span style={{ color: '#0049ff', fontSize: 10, marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Productos</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setConfirmExport(true)} disabled={exportando}
            style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: exportando ? 'wait' : 'pointer' }}>
            {exportando ? 'Exportando...' : '⬇ Exportar CSV'}
          </button>
          <button onClick={() => setShowImport(true)}
            style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            ⬆ Importar CSV
          </button>
          <button onClick={() => { if (!showSolicitudes) fetchSolicitudes(); setShowSolicitudes(v => !v) }}
            style={{ position: 'relative', background: showSolicitudes ? NAVY : '#f3f4f6', color: showSolicitudes ? '#fff' : '#374151', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Solicitudes
            {solicitudes.length > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: PINK, color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {solicitudes.length}
              </span>
            )}
          </button>
          <button onClick={() => { setEditando(null); setShowModal(true) }} style={{ background: BLUE, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + Agregar producto
          </button>
        </div>
      </div>

      {/* Panel solicitudes */}
      {showSolicitudes && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Solicitudes de proveedores</h2>
              {solicitudes.length > 0 && (
                <span style={{ background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20 }}>
                  {solicitudes.length} pendiente{solicitudes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {solicitudes.length > 1 && (
              <button onClick={aprobarTodos} disabled={procesando !== null}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: procesando !== null ? '#9ca3af' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: procesando !== null ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                {procesando === 'all' ? 'Aprobando...' : `Aprobar todos (${solicitudes.length})`}
              </button>
            )}
          </div>

          {loadingSol ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
          ) : solicitudes.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No hay solicitudes pendientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {solicitudes.map(sol => (
                <div key={sol.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'center', background: '#f9fafb', borderRadius: 12, padding: '14px 18px', border: '1px solid #f3f4f6' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #e5e7eb', flexShrink: 0 }}>
                    {sol.imagen_url ? <img src={sol.imagen_url} alt={sol.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>{sol.producto_nombre}</p>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{sol.producto_sku}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>${Number(sol.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      {sol.producto_stock > 0 && <span style={{ fontSize: 11, color: '#6b7280' }}>{sol.producto_stock} uds</span>}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      {sol.proveedor_nombre}{sol.proveedor_empresa ? ` · ${sol.proveedor_empresa}` : ''} · {new Date(sol.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setSolicitudDetalle(sol)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Ver
                    </button>
                    <button onClick={() => cambiarEstadoSol(sol.id, 'rechazado')} disabled={procesando === sol.id}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: procesando === sol.id ? 'default' : 'pointer', opacity: procesando === sol.id ? 0.5 : 1 }}>
                      Rechazar
                    </button>
                    <button onClick={() => cambiarEstadoSol(sol.id, 'aprobado')} disabled={procesando === sol.id}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: procesando === sol.id ? '#9ca3af' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: procesando === sol.id ? 'default' : 'pointer' }}>
                      {procesando === sol.id ? '...' : 'Aprobar y publicar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', border: `1px solid ${toast.color}30`, borderLeft: `4px solid ${toast.color}`, borderRadius: 10, padding: '12px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 13, fontWeight: 600, color: '#111', zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {/* Resumen */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total productos', value: products.length, color: '#111' },
          { label: 'Activos', value: products.filter(p => p.estado === 'Activo').length, color: '#059669' },
          { label: 'Stock bajo', value: products.filter(p => p.estado === 'Stock bajo').length, color: '#d97706' },
          { label: 'Sin stock', value: products.filter(p => p.estado === 'Sin stock').length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Filtros */}
        <div className="filter-row" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            style={{ padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', color: '#374151', cursor: 'pointer', minWidth: 160 }}>
            {categoriasConTodas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {proveedores.length > 0 && (
            <select
              value={proveedorFiltro ?? ''}
              onChange={e => { setProveedorFiltro(e.target.value || null); setPage(1) }}
              style={{ padding: '9px 14px', border: `1px solid ${proveedorFiltro ? NAVY : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', color: proveedorFiltro ? NAVY : '#374151', cursor: 'pointer', minWidth: 180, fontWeight: proveedorFiltro ? 700 : 400 }}>
              <option value="">📦 Proveedores</option>
              {proveedores.map(p => <option key={p} value={p}>📦 {p}</option>)}
            </select>
          )}
          {view === 'grid' && (
            <select value={`${sortBy}-${sortDir}`} onChange={e => {
              const [col, dir] = e.target.value.split('-')
              setSortBy(col as typeof sortBy); setSortDir(dir as 'asc' | 'desc'); setPage(1)
            }} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
              <option value="nombre-asc">Nombre A→Z</option>
              <option value="nombre-desc">Nombre Z→A</option>
              <option value="precio-asc">Menor precio</option>
              <option value="precio-desc">Mayor precio</option>
              <option value="stock-asc">Menos stock</option>
              <option value="stock-desc">Más stock</option>
            </select>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 12px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
                background: view === v ? '#0049ff' : '#f3f4f6',
                color: view === v ? '#fff' : '#374151', border: 'none',
              }}>{v === 'grid' ? '⊞' : '☰'}</button>
            ))}
          </div>
        </div>


        {/* Vista Grid */}
        {loading && view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} h={140} />)}
          </div>
        )}
        {!loading && view === 'grid' && (
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {paginated.map(p => (
              <div key={p.id} style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 140, background: colorCategoria(p.categoria, categorias), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="box" size={40} color="#fff" />
                  }
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{p.nombre}</p>
                    <span style={{ background: estadoStyle[p.estado]?.bg, color: estadoStyle[p.estado]?.text, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 6 }}>
                      {p.estado}
                    </span>
                  </div>
                  {p.origen === 'proveedor' && p.proveedor_nombre && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', display: 'inline-block', padding: '2px 8px', borderRadius: 20, marginBottom: 4 }}>
                      📦 {p.proveedor_nombre}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>SKU: {p.sku}</p>
                  <span style={{ display: 'inline-block', background: colorCategoria(p.categoria, categorias) + '22', color: colorCategoria(p.categoria, categorias), fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 8 }}>
                    {p.categoria}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0049ff' }}>${Number(p.precio).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Stock: {p.stock}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button onClick={() => { setEditando(p); setShowModal(true) }} style={{ flex: 1, background: '#f3f4f6', border: 'none', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      disabled={deleting === p.id}
                      style={{ flex: 1, background: '#fee2e2', border: 'none', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>
                      {deleting === p.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista Lista */}
        {loading && view === 'list' && (
          <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <tbody><SkeletonTableBody rows={8} cols={['50px','160px','80px','70px','70px','80px','100px']} /></tbody>
          </table>
          </div>
        )}
        {!loading && view === 'list' && (
          <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['SKU', 'Producto', 'Categoría'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
                {(['precio', 'stock'] as const).map(col => (
                  <th key={col} onClick={() => toggleSort(col)}
                    style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: sortBy === col ? '#0049ff' : '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    {col === 'precio' ? 'Precio' : 'Stock'}<SortIcon col={col} />
                  </th>
                ))}
                {['Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px 0', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.imagen_url
                        ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 6, background: colorCategoria(p.categoria, categorias), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="box" size={18} color="#fff" /></div>
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.nombre}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: colorCategoria(p.categoria, categorias) + '22', color: colorCategoria(p.categoria, categorias), fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {p.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 700, color: '#0049ff' }}>${Number(p.precio).toLocaleString()}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: p.stock <= 3 ? '#dc2626' : '#374151', fontWeight: p.stock <= 3 ? 700 : 400 }}>{p.stock}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: estadoStyle[p.estado]?.bg, color: estadoStyle[p.estado]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditando(p); setShowModal(true) }} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        disabled={deleting === p.id}
                        style={{ background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>
                        {deleting === p.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            <Icon name="box" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14 }}>No se encontraron productos</p>
          </div>
        )}

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} productos
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}>
                ← Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ padding: '6px 11px', borderRadius: 6, border: '1px solid #e5e7eb', background: page === n ? '#0049ff' : '#fff', color: page === n ? '#fff' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: page === n ? 700 : 400 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13 }}>
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle de solicitud */}
      {solicitudDetalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setSolicitudDetalle(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111' }}>{solicitudDetalle.producto_nombre}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                  SKU: <span style={{ fontFamily: 'monospace' }}>{solicitudDetalle.producto_sku}</span>
                  {' · '}{solicitudDetalle.proveedor_nombre}{solicitudDetalle.proveedor_empresa ? ` (${solicitudDetalle.proveedor_empresa})` : ''}
                </p>
              </div>
              <button onClick={() => setSolicitudDetalle(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 0 }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Imagen principal + precio/stock */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 100, height: 100, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid #e5e7eb' }}>
                  {solicitudDetalle.imagen_url
                    ? <img src={solicitudDetalle.imagen_url} alt={solicitudDetalle.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '📦'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: BLUE, margin: '0 0 6px' }}>${Number(solicitudDetalle.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>Stock: <strong>{solicitudDetalle.producto_stock}</strong> unidades</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{new Date(solicitudDetalle.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Colores */}
              {solicitudDetalle.detalles?.colores && solicitudDetalle.detalles.colores.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Colores disponibles</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {solicitudDetalle.detalles.colores.map(c => (
                      <span key={c} style={{ padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', fontSize: 13, fontWeight: 600, color: '#374151' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tallas */}
              {solicitudDetalle.detalles?.tallas && solicitudDetalle.detalles.tallas.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Tallas / Tamaños</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {solicitudDetalle.detalles.tallas.map(t => (
                      <span key={t} style={{ padding: '4px 14px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, fontWeight: 700, color: BLUE }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variantes */}
              {solicitudDetalle.detalles?.variantes && solicitudDetalle.detalles.variantes.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Stock por variante</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    {solicitudDetalle.detalles.variantes.map((v, i) => (
                      <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 2px' }}>{v.color} / {v.talla}</p>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#059669', margin: 0 }}>{v.stock} uds</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peso y dimensiones */}
              {(solicitudDetalle.detalles?.peso_g || solicitudDetalle.detalles?.dimensiones) && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Envío</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {solicitudDetalle.detalles.peso_g && (
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{solicitudDetalle.detalles.peso_g} g</p>
                      </div>
                    )}
                    {solicitudDetalle.detalles.dimensiones && (
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dimensiones</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>
                          {solicitudDetalle.detalles.dimensiones.largo} × {solicitudDetalle.detalles.dimensiones.ancho} × {solicitudDetalle.detalles.dimensiones.alto} cm
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Imágenes extra */}
              {solicitudDetalle.detalles?.imagenes_extra && solicitudDetalle.detalles.imagenes_extra.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Fotos adicionales</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {solicitudDetalle.detalles.imagenes_extra.map((url, i) => (
                      <img key={i} src={url} alt={`Extra ${i + 1}`} style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => { cambiarEstadoSol(solicitudDetalle.id, 'rechazado'); setSolicitudDetalle(null) }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Rechazar
                </button>
                <button onClick={() => { cambiarEstadoSol(solicitudDetalle.id, 'aprobado'); setSolicitudDetalle(null) }}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Aprobar y publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="¿Eliminar producto?"
          message={`"${confirmDelete.nombre}" se eliminará permanentemente junto con su imagen. Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando...' : 'Sí, eliminar'}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showModal && (
        <ProductoModal
          categoriasDisponibles={categorias}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSave={handleSave}
          onNuevaCategoria={async (nombre) => {
            // Insertar solo si no existe ya
            const { data: existe } = await supabase.from('categorias').select('id').eq('nombre', nombre).maybeSingle()
            if (!existe) {
              await supabase.from('categorias').insert({ nombre })
            }
            await fetchCategorias()
          }}
          inicial={editando ? {
            id: editando.id,
            nombre: editando.nombre,
            sku: editando.sku,
            categoria: editando.categoria,
            precio: String(editando.precio),
            stock: String(editando.stock),
            descripcion: '',
            imagen: null,
            imagenPreview: editando.imagen_url ?? null,
          } : undefined}
        />
      )}

      {showImport && (
        <ImportCSVModal
          existingSkus={new Set(products.map(p => p.sku))}
          onClose={() => setShowImport(false)}
          onDone={fetchProducts}
        />
      )}

      {confirmExport && (
        <ConfirmDialog
          danger={false}
          title="Exportar productos a CSV"
          message={`Se descargará un archivo con los ${products.length} productos del catálogo (SKU, nombre, precio, stock, categoría, descripción, imagen y detalles). Podrás editarlo en Excel y volver a importarlo.`}
          confirmLabel="Descargar CSV"
          onCancel={() => setConfirmExport(false)}
          onConfirm={() => { setConfirmExport(false); exportarCSV() }}
        />
      )}
    </div>
  )
}
