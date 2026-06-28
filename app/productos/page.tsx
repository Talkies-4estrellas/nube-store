'use client'

import { useState, useEffect } from 'react'
import ProductoModal from '@/components/ProductoModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { uploadToSupabase } from '@/lib/uploadWebp'
import Icon from '@/components/Icon'

const PAGE_SIZE = 12

type Product = {
  id: string
  nombre: string
  categoria: string
  precio: number
  stock: number
  estado: string
  sku: string
  imagen_url?: string | null
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
  }) {
    let imagen_url: string | null = null

    if (form.imagen) {
      const path = `${Date.now()}-${form.sku}.webp`
      try {
        imagen_url = await uploadToSupabase(form.imagen, supabase, 'productos', path)
      } catch (e) {
        console.error('Error subiendo imagen:', e)
      }
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

    const payload = {
      nombre: form.nombre,
      sku: form.sku,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      categoria_id,
      ...(imagen_url ? { imagen_url } : {}),
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

  const filtered = products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoria === 'Todas' || p.categoria === categoria
    return matchSearch && matchCat
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Productos</h1>
        <button onClick={() => { setEditando(null); setShowModal(true) }} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Agregar producto
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
            <Icon name="box" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14 }}>Cargando productos...</p>
          </div>
        )}

        {/* Vista Grid */}
        {!loading && view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
        {!loading && view === 'list' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['SKU', 'Producto', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acciones'].map(h => (
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
    </div>
  )
}
