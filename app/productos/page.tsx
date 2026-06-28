'use client'

import { useState } from 'react'
import ProductoModal from '@/components/ProductoModal'

const initialProducts = [
  { id: 1, nombre: 'Bolso Morelia Negro', categoria: 'Bolsos', precio: '$890', stock: 12, estado: 'Activo', sku: 'BOL-001' },
  { id: 2, nombre: 'Bolso Ejecutivo Café', categoria: 'Bolsos', precio: '$1,200', stock: 2, estado: 'Stock bajo', sku: 'BOL-002' },
  { id: 3, nombre: 'Cinturón Premium 32"', categoria: 'Cinturones', precio: '$450', stock: 24, estado: 'Activo', sku: 'CIN-001' },
  { id: 4, nombre: 'Cinturón Trenzado 34"', categoria: 'Cinturones', precio: '$380', stock: 1, estado: 'Stock bajo', sku: 'CIN-002' },
  { id: 5, nombre: 'Billetera Slim Café', categoria: 'Billeteras', precio: '$320', stock: 3, estado: 'Stock bajo', sku: 'BIL-001' },
  { id: 6, nombre: 'Billetera Ejecutiva Negra', categoria: 'Billeteras', precio: '$520', stock: 18, estado: 'Activo', sku: 'BIL-002' },
  { id: 7, nombre: 'Estuche Ejecutivo', categoria: 'Estuches', precio: '$1,200', stock: 9, estado: 'Activo', sku: 'EST-001' },
  { id: 8, nombre: 'Reloj Clásico Piel', categoria: 'Relojes', precio: '$2,800', stock: 0, estado: 'Sin stock', sku: 'REL-001' },
  { id: 9, nombre: 'Reloj Sport Marrón', categoria: 'Relojes', precio: '$3,200', stock: 5, estado: 'Activo', sku: 'REL-002' },
]

const categorias = ['Todas', 'Bolsos', 'Cinturones', 'Billeteras', 'Estuches', 'Relojes']

const estadoStyle: Record<string, { bg: string; text: string }> = {
  'Activo':     { bg: '#d1fae5', text: '#065f46' },
  'Stock bajo': { bg: '#fef3c7', text: '#92400e' },
  'Sin stock':  { bg: '#fee2e2', text: '#991b1b' },
}

const categoryColors: Record<string, string> = {
  Bolsos: '#818cf8', Cinturones: '#34d399', Billeteras: '#f59e0b', Estuches: '#60a5fa', Relojes: '#f472b6',
}

type Product = { id: number; nombre: string; categoria: string; precio: string; stock: number; estado: string; sku: string; imagenPreview?: string | null }

function getEstado(stock: number) {
  if (stock === 0) return 'Sin stock'
  if (stock <= 3) return 'Stock bajo'
  return 'Activo'
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)

  function handleSave(form: { nombre: string; sku: string; categoria: string; precio: string; stock: string; descripcion: string; imagen: File | null; imagenPreview: string | null }) {
    const stock = parseInt(form.stock)
    const newProduct: Product = {
      id: Date.now(),
      nombre: form.nombre,
      sku: form.sku,
      categoria: form.categoria,
      precio: `$${parseFloat(form.precio).toLocaleString()}`,
      stock,
      estado: getEstado(stock),
      imagenPreview: form.imagenPreview,
    }
    setProducts(prev => [newProduct, ...prev])
    setShowModal(false)
  }

  const filtered = products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
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
          { label: 'Total productos', value: initialProducts.length, color: '#111' },
          { label: 'Activos', value: initialProducts.filter(p => p.estado === 'Activo').length, color: '#059669' },
          { label: 'Stock bajo', value: initialProducts.filter(p => p.estado === 'Stock bajo').length, color: '#d97706' },
          { label: 'Sin stock', value: initialProducts.filter(p => p.estado === 'Sin stock').length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros y vista */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
                color: categoria === c ? '#fff' : '#374151',
                border: 'none',
              }}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 12px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
                background: view === v ? '#0049ff' : '#f3f4f6',
                color: view === v ? '#fff' : '#374151',
                border: 'none',
              }}>{v === 'grid' ? '⊞' : '☰'}</button>
            ))}
          </div>
        </div>

        {/* Vista Grid */}
        {view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map(p => (
              <div key={p.id} style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 140, background: categoryColors[p.categoria] ?? '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.imagenPreview
                    ? <img src={p.imagenPreview} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 40 }}>{p.categoria === 'Bolsos' ? '👜' : p.categoria === 'Cinturones' ? '👔' : p.categoria === 'Billeteras' ? '👛' : p.categoria === 'Relojes' ? '⌚' : '🗂️'}</span>
                  }
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{p.nombre}</p>
                    <span style={{ background: estadoStyle[p.estado].bg, color: estadoStyle[p.estado].text, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 6 }}>
                      {p.estado}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>SKU: {p.sku}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0049ff' }}>{p.precio}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Stock: {p.stock}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button style={{ flex: 1, background: '#f3f4f6', border: 'none', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                    <button style={{ flex: 1, background: '#0049ff', color: '#fff', border: 'none', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ver</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista Lista */}
        {view === 'list' && (
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
                  <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>{p.nombre}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: '#6b7280' }}>{p.categoria}</td>
                  <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 700, color: '#0049ff' }}>{p.precio}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: p.stock <= 3 ? '#dc2626' : '#374151', fontWeight: p.stock <= 3 ? 700 : 400 }}>{p.stock}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: estadoStyle[p.estado].bg, color: estadoStyle[p.estado].text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                      <button style={{ background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filtered.length === 0 && (
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
