'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import VentaModal from '@/components/VentaModal'
import Icon from '@/components/Icon'

const PAGE_SIZE = 15

type VentaItem = {
  id: string
  nombre: string
  cantidad: number
  precio: number
  subtotal: number
}

type Venta = {
  id: string
  numero: number
  estado: string
  total: number
  notas: string | null
  created_at: string
  clientes: { nombre: string; email: string } | null
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  Pagado:    { bg: '#d1fae5', text: '#065f46' },
  Enviado:   { bg: '#dbeafe', text: '#1e40af' },
  Pendiente: { bg: '#fef3c7', text: '#92400e' },
  Cancelado: { bg: '#fee2e2', text: '#991b1b' },
}

const estadosSig: Record<string, string[]> = {
  Pendiente: ['Pagado', 'Cancelado'],
  Pagado:    ['Enviado', 'Cancelado'],
  Enviado:   [],
  Cancelado: [],
}

const statuses = ['Todos', 'Pagado', 'Enviado', 'Pendiente', 'Cancelado']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [detalle, setDetalle] = useState<Venta | null>(null)
  const [items, setItems] = useState<VentaItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  async function fetchVentas() {
    setLoading(true)
    const { data } = await supabase
      .from('ventas')
      .select('*, clientes(nombre, email)')
      .order('created_at', { ascending: false })
    if (data) setVentas(data)
    setLoading(false)
  }

  useEffect(() => { fetchVentas() }, [])

  async function abrirDetalle(v: Venta) {
    setDetalle(v)
    setLoadingItems(true)
    const { data } = await supabase
      .from('venta_items')
      .select('*')
      .eq('venta_id', v.id)
      .order('created_at', { ascending: true })
    setItems(data ?? [])
    setLoadingItems(false)
  }

  async function cambiarEstado(venta: Venta, nuevoEstado: string) {
    setCambiandoEstado(venta.id)
    await supabase.from('ventas').update({ estado: nuevoEstado }).eq('id', venta.id)
    await fetchVentas()
    if (detalle?.id === venta.id) setDetalle(v => v ? { ...v, estado: nuevoEstado } : v)
    setCambiandoEstado(null)
  }

  const filtered = ventas.filter(v => {
    const nombre = v.clientes?.nombre ?? ''
    const matchSearch = nombre.toLowerCase().includes(search.toLowerCase()) ||
      String(v.numero).includes(search)
    const matchStatus = statusFilter === 'Todos' || v.estado === statusFilter
    return matchSearch && matchStatus
  })

  const total = filtered.reduce((sum, v) => sum + Number(v.total), 0)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* Columna principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Ventas</h1>
          <button onClick={() => setShowModal(true)} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + Nueva venta
          </button>
        </div>

        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total pedidos', value: ventas.length },
            { label: 'Pagados', value: ventas.filter(v => v.estado === 'Pagado').length },
            { label: 'Pendientes', value: ventas.filter(v => v.estado === 'Pendiente').length },
            { label: 'Enviados', value: ventas.filter(v => v.estado === 'Enviado').length },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente o número..."
              style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {statuses.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: statusFilter === s ? '#0049ff' : '#f3f4f6',
                  color: statusFilter === s ? '#fff' : '#374151', border: 'none',
                }}>{s}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Icon name="cart" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p>Cargando ventas...</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['#', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f9fafb', background: detalle?.id === v.id ? '#f0f5ff' : 'transparent' }}>
                    <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{v.numero}</td>
                    <td style={{ padding: '13px 0' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v.clientes?.nombre ?? '—'}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>{v.clientes?.email ?? ''}</p>
                    </td>
                    <td style={{ padding: '13px 0', fontSize: 12, color: '#9ca3af' }}>{formatDate(v.created_at)}</td>
                    <td style={{ padding: '13px 0', fontSize: 14, fontWeight: 700, color: '#111' }}>${Number(v.total).toLocaleString()}</td>
                    <td style={{ padding: '13px 0' }}>
                      <select
                        value={v.estado}
                        disabled={cambiandoEstado === v.id || estadosSig[v.estado]?.length === 0}
                        onChange={e => cambiarEstado(v, e.target.value)}
                        style={{
                          background: statusStyle[v.estado]?.bg,
                          color: statusStyle[v.estado]?.text,
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 20,
                          cursor: estadosSig[v.estado]?.length === 0 ? 'default' : 'pointer',
                          outline: 'none',
                        }}>
                        <option value={v.estado}>{v.estado}</option>
                        {estadosSig[v.estado]?.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <button
                        onClick={() => detalle?.id === v.id ? setDetalle(null) : abrirDetalle(v)}
                        style={{ background: detalle?.id === v.id ? '#0049ff' : 'none', color: detalle?.id === v.id ? '#fff' : '#374151', border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        {detalle?.id === v.id ? 'Cerrar' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <Icon name="search" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No se encontraron pedidos</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{filtered.length} pedidos encontrados</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Total: ${total.toLocaleString()}</p>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12 }}>
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
          )}
        </div>
      </div>

      {/* Panel detalle lateral */}
      {detalle && (
        <div style={{ width: 320, flexShrink: 0, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', position: 'sticky', top: 80 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Venta #{detalle.numero}</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(detalle.created_at)}</p>
            </div>
            <span style={{ background: statusStyle[detalle.estado]?.bg, color: statusStyle[detalle.estado]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
              {detalle.estado}
            </span>
          </div>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cliente</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{detalle.clientes?.nombre ?? '—'}</p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>{detalle.clientes?.email ?? ''}</p>
          </div>

          <div style={{ padding: '14px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Productos</p>
            {loadingItems ? (
              <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Cargando...</p>
            ) : items.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin items registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.nombre}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>x{item.cantidad} · ${Number(item.precio).toLocaleString()} c/u</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0049ff' }}>${Number(item.subtotal).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {detalle.notas && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>NOTAS</p>
                <p style={{ fontSize: 12, color: '#374151' }}>{detalle.notas}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '2px solid #f3f4f6' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Total</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0049ff' }}>${Number(detalle.total).toLocaleString()}</p>
            </div>
          </div>

          {/* Cambiar estado desde detalle */}
          {estadosSig[detalle.estado]?.length > 0 && (
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
              {estadosSig[detalle.estado].map(s => (
                <button key={s} onClick={() => cambiarEstado(detalle, s)}
                  disabled={cambiandoEstado === detalle.id}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: s === 'Cancelado' ? '#fee2e2' : '#0049ff', color: s === 'Cancelado' ? '#dc2626' : '#fff' }}>
                  {cambiandoEstado === detalle.id ? '...' : `→ ${s}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && <VentaModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchVentas() }} />}
    </div>
  )
}
