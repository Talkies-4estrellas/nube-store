'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import VentaModal from '@/components/VentaModal'
import Icon from '@/components/Icon'
import { SkeletonTableBody } from '@/components/Skeleton'

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
  Pendiente:   { bg: '#fef3c7', text: '#92400e'  },
  'En proceso':{ bg: '#ede9fe', text: '#6d28d9'  },
  Pagado:      { bg: '#d1fae5', text: '#065f46'  },
  Enviado:     { bg: '#dbeafe', text: '#1e40af'  },
  Cancelado:   { bg: '#fee2e2', text: '#991b1b'  },
}

const estadosSig: Record<string, string[]> = {
  Pendiente:  ['Pagado', 'Cancelado'],
  Pagado:     ['Enviado', 'Cancelado'],
  Enviado:    [],
  Cancelado:  [],
}

const PIPELINE = ['Pendiente', 'Pagado', 'Enviado']

const statuses = ['Todos', 'Pendiente', 'Pagado', 'Enviado', 'Cancelado']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function imprimirVenta(venta: Venta, items: VentaItem[]) {
  const w = window.open('', '_blank', 'width=600,height=700')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Venta #${venta.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', sans-serif; color: #111; padding: 40px; font-size: 14px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 4px; }
    .logo span { color: #e7226d; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #111; }
    .numero { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .info-block p:first-child { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 4px; }
    .info-block p:last-child { font-size: 14px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; padding: 0 0 10px; border-bottom: 1px solid #e5e7eb; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tbody td:last-child { text-align: right; font-weight: 700; color: #0049ff; }
    .subtotal-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #6b7280; }
    .total-row { display: flex; justify-content: space-between; padding: 14px 0; font-size: 18px; font-weight: 900; border-top: 2px solid #111; margin-top: 4px; }
    .total-row span:last-child { color: #0049ff; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <div class="header">
    <div>
      <div class="logo">Order<span>Express</span></div>
      <div class="numero">Comprobante de venta</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:900;color:#0049ff">#${venta.numero}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${formatDate(venta.created_at)}</div>
      <div style="margin-top:6px"><span class="badge">${venta.estado}</span></div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-block"><p>Cliente</p><p>${venta.clientes?.nombre ?? '—'}</p></div>
    <div class="info-block"><p>Email</p><p>${venta.clientes?.email ?? '—'}</p></div>
    ${venta.notas ? `<div class="info-block" style="grid-column:1/-1"><p>Notas</p><p>${venta.notas}</p></div>` : ''}
  </div>
  <p class="section-title">Productos</p>
  <table>
    <thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
    <tbody>
      ${items.map(it => `<tr>
        <td><strong>${it.nombre}</strong></td>
        <td style="color:#6b7280">${it.cantidad}</td>
        <td style="color:#6b7280">$${Number(it.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        <td>$${Number(it.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div style="max-width:260px;margin-left:auto">
    <div class="subtotal-row"><span>Subtotal</span><span>$${Number(venta.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row"><span>Total</span><span>$${Number(venta.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
  </div>
  <div class="footer">Order Express · Gracias por tu compra · orderexpress.mx</div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`)
  w.document.close()
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

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['#', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableBody rows={8} cols={['40px','140px','80px','80px','80px','80px']} />
                ) : paginated.map(v => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: statusStyle[detalle.estado]?.bg, color: statusStyle[detalle.estado]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                {detalle.estado}
              </span>
              <button
                onClick={() => imprimirVenta(detalle, items)}
                disabled={loadingItems}
                title="Imprimir comprobante"
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: loadingItems ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                🖨️
              </button>
            </div>
          </div>

          {/* Stepper de estado */}
          {detalle.estado !== 'Cancelado' && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {PIPELINE.map((step, i) => {
                  const stepIdx    = PIPELINE.indexOf(step)
                  const currentIdx = PIPELINE.indexOf(detalle.estado)
                  const done       = stepIdx < currentIdx
                  const active     = stepIdx === currentIdx
                  return (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE.length - 1 ? 1 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                          background: done ? '#059669' : active ? '#252855' : '#f3f4f6',
                          color: done || active ? '#fff' : '#9ca3af',
                          border: active ? '2px solid #252855' : '2px solid transparent',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: active ? '#252855' : done ? '#059669' : '#9ca3af', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>
                          {step}
                        </span>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: done ? '#059669' : '#f3f4f6', margin: '0 4px', marginBottom: 20 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
