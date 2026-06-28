'use client'

import { useState, useEffect } from 'react'
import ProductoModal from '@/components/ProductoModal'
import { supabase } from '@/lib/supabase'

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

const categorias = ['Todas', 'Bolsos', 'Cinturones', 'Billeteras', 'Estuches', 'Relojes']

const estadoStyle: Record<string, { bg: string; text: string }> = {
  'Activo':     { bg: '#d1fae5', text: '#065f46' },
  'Stock bajo': { bg: '#fef3c7', text: '#92400e' },
  'Sin stock':  { bg: '#fee2e2', text: '#991b1b' },
}

const categoryColors: Record<string, string> = {
  Bolsos: '#818cf8', Cinturones: '#34d399', Billeteras: '#f59e0b', Estuches: '#60a5fa', Relojes: '#f472b6',
}

const categoryIcon: Record<string, string> = {
  Bolsos: '👜', Cinturones: '👔', Billeteras: '👛', Relojes: '⌚', Estuches: '🗂️',
}

function getEstado(stock: number) {
  if (stock === 0) return 'Sin stock'
  if (stock <= 3) return 'Stock bajo'
  return 'Activo'
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function fetchProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('productos_con_estado')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  async function handleSave(form: {
    nombre: string; sku: string; categoria: string; precio: string
    stock: string; descripcion: string; imagen: File | null; imagenPreview: string | null
  }) {
    let imagen_url: string | null = null

    // 1. Subir imagen a Storage
    if (form.imagen) {
      const ext = form.imagen.name.split('.').pop()
      const path = `${Date.now()}-${form.sku}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(path, form.imagen, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('productos').getPublicUrl(path)
        imagen_url = urlData.publicUrl
      }
    }

    // 2. Obtener categoria_id
    const { data: catData } = await supabase
      .from('categorias')
      .select('id')
      .eq('nombre', form.categoria)
      .single()

    // 3. Insertar producto
    const { error } = await supabase.from('productos').insert({
      nombre: form.nombre,
      sku: form.sku,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      categoria_id: catData?.id ?? null,
      imagen_url,
    })

    if (!error) {
      await fetchProducts()
      setShowModal(false)
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  async function handleDelete(id: string, imagen_url?: string | null) {
    setDeleting(id)
    if (imagen_url) {
      const path = imagen_url.split('/productos/')[1]
      if (path) await supabase.storage.from('productos').remove([path])
    }
    await supabase.from('productos').delete().eq('id', id)
    await fetchProducts()
    setDeleting(null)
  }

  const filtered = products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoria === 'Todas' || p.categoria === categoria
    return matchSearch && matchCat
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Productos</h1>
        <button onClick={() => setShowModal(true)} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categorias.map(c => (
              <button key={c} onClick={() => setCategoria(c)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: categoria === c ? '#0049ff' : '#f3f4f6',
                color: categoria === c ? '#fff' : '#374151', border: 'none',
              }}>{c}</button>
            ))}
          </div>
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
            <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
            <p style={{ fontSize: 14 }}>Cargando productos...</p>
          </div>
        )}

        {/* Vista Grid */}
        {!loading && view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map(p => (
              <div key={p.id} style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 140, background: categoryColors[p.categoria] ?? '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 40 }}>{categoryIcon[p.categoria] ?? '📦'}</span>
                  }
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{p.nombre}</p>
                    <span style={{ background: estadoStyle[p.estado]?.bg, color: estadoStyle[p.estado]?.text, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 6 }}>
                      {p.estado}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>SKU: {p.sku}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0049ff' }}>${Number(p.precio).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Stock: {p.stock}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button style={{ flex: 1, background: '#f3f4f6', border: 'none', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                    <button
                      onClick={() => handleDelete(p.id, p.imagen_url)}
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
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px 0', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.imagen_url
                        ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 6, background: categoryColors[p.categoria] ?? '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{categoryIcon[p.categoria] ?? '📦'}</div>
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.nombre}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: '#6b7280' }}>{p.categoria}</td>
                  <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 700, color: '#0049ff' }}>${Number(p.precio).toLocaleString()}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: p.stock <= 3 ? '#dc2626' : '#374151', fontWeight: p.stock <= 3 ? 700 : 400 }}>{p.stock}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: estadoStyle[p.estado]?.bg, color: estadoStyle[p.estado]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                      <button
                        onClick={() => handleDelete(p.id, p.imagen_url)}
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
            <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
            <p style={{ fontSize: 14 }}>No se encontraron productos</p>
          </div>
        )}
      </div>

      {showModal && <ProductoModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}
