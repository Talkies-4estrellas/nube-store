'use client'

import { useState } from 'react'

const allOrders = [
  { id: '#1042', cliente: 'Ana García', email: 'ana@mail.com', producto: 'Bolso Morelia', monto: '$890', estado: 'Pagado', fecha: '28 Jun 2026' },
  { id: '#1041', cliente: 'Luis Torres', email: 'luis@mail.com', producto: 'Cinturón Premium', monto: '$450', estado: 'Enviado', fecha: '28 Jun 2026' },
  { id: '#1040', cliente: 'María López', email: 'maria@mail.com', producto: 'Billetera Slim', monto: '$320', estado: 'Pendiente', fecha: '27 Jun 2026' },
  { id: '#1039', cliente: 'Carlos Ruiz', email: 'carlos@mail.com', producto: 'Estuche Ejecutivo', monto: '$1,200', estado: 'Pagado', fecha: '27 Jun 2026' },
  { id: '#1038', cliente: 'Sofia Méndez', email: 'sofia@mail.com', producto: 'Reloj Clásico', monto: '$2,800', estado: 'Enviado', fecha: '26 Jun 2026' },
  { id: '#1037', cliente: 'Pedro Vega', email: 'pedro@mail.com', producto: 'Bolso Ejecutivo', monto: '$1,500', estado: 'Cancelado', fecha: '26 Jun 2026' },
  { id: '#1036', cliente: 'Laura Ríos', email: 'laura@mail.com', producto: 'Cinturón Trenzado', monto: '$380', estado: 'Pendiente', fecha: '25 Jun 2026' },
  { id: '#1035', cliente: 'Miguel Soto', email: 'miguel@mail.com', producto: 'Billetera Ejecutiva', monto: '$520', estado: 'Pagado', fecha: '25 Jun 2026' },
]

const statusStyle: Record<string, { bg: string; text: string }> = {
  Pagado:    { bg: '#d1fae5', text: '#065f46' },
  Enviado:   { bg: '#dbeafe', text: '#1e40af' },
  Pendiente: { bg: '#fef3c7', text: '#92400e' },
  Cancelado: { bg: '#fee2e2', text: '#991b1b' },
}

const statuses = ['Todos', 'Pagado', 'Enviado', 'Pendiente', 'Cancelado']

export default function VentasPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const filtered = allOrders.filter(o => {
    const matchSearch = o.cliente.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.producto.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Todos' || o.estado === statusFilter
    return matchSearch && matchStatus
  })

  const total = filtered.reduce((sum, o) => sum + parseFloat(o.monto.replace(/[$,]/g, '')), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Ventas</h1>
        <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Nueva venta
        </button>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total pedidos', value: allOrders.length },
          { label: 'Pagados', value: allOrders.filter(o => o.estado === 'Pagado').length },
          { label: 'Pendientes', value: allOrders.filter(o => o.estado === 'Pendiente').length },
          { label: 'Enviados', value: allOrders.filter(o => o.estado === 'Enviado').length },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, ID o producto..."
            style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === s ? '#0049ff' : '#f3f4f6',
                color: statusFilter === s ? '#fff' : '#374151',
                border: 'none',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['ID', 'Cliente', 'Producto', 'Fecha', 'Monto', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>{o.id}</td>
                <td style={{ padding: '13px 0' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{o.cliente}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>{o.email}</p>
                </td>
                <td style={{ padding: '13px 0', fontSize: 13, color: '#374151' }}>{o.producto}</td>
                <td style={{ padding: '13px 0', fontSize: 12, color: '#9ca3af' }}>{o.fecha}</td>
                <td style={{ padding: '13px 0', fontSize: 14, fontWeight: 700, color: '#111' }}>{o.monto}</td>
                <td style={{ padding: '13px 0' }}>
                  <span style={{ background: statusStyle[o.estado].bg, color: statusStyle[o.estado].text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                    {o.estado}
                  </span>
                </td>
                <td style={{ padding: '13px 0' }}>
                  <button style={{ background: 'none', border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151' }}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
            <p style={{ fontSize: 14 }}>No se encontraron pedidos</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: 13, color: '#6b7280' }}>{filtered.length} pedidos encontrados</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Total: ${total.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
