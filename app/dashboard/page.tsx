'use client'

import Link from 'next/link'

const metrics = [
  { label: 'Ventas hoy', value: '$12,480', change: '+18%', up: true, icon: '💰', href: '/ventas' },
  { label: 'Pedidos pendientes', value: '24', change: '6 urgentes', up: false, icon: '📋', href: '/ventas' },
  { label: 'Productos activos', value: '148', change: '3 sin stock', up: false, icon: '📦', href: '/productos' },
  { label: 'Clientes nuevos', value: '31', change: '+12% este mes', up: true, icon: '👥', href: '/clientes' },
]

const recentOrders = [
  { id: '#1042', cliente: 'Ana García', producto: 'Bolso Morelia', monto: '$890', estado: 'Pagado' },
  { id: '#1041', cliente: 'Luis Torres', producto: 'Cinturón Premium', monto: '$450', estado: 'Enviado' },
  { id: '#1040', cliente: 'María López', producto: 'Billetera Slim', monto: '$320', estado: 'Pendiente' },
  { id: '#1039', cliente: 'Carlos Ruiz', producto: 'Estuche Ejecutivo', monto: '$1,200', estado: 'Pagado' },
  { id: '#1038', cliente: 'Sofia Méndez', producto: 'Reloj Clásico', monto: '$2,800', estado: 'Enviado' },
]

const lowStock = [
  { nombre: 'Bolso Morelia Negro', stock: 2 },
  { nombre: 'Cinturón Trenzado 34"', stock: 1 },
  { nombre: 'Billetera Slim Café', stock: 3 },
]

const statusColor: Record<string, string> = {
  Pagado: '#d1fae5',
  Enviado: '#dbeafe',
  Pendiente: '#fef3c7',
}
const statusText: Record<string, string> = {
  Pagado: '#065f46',
  Enviado: '#1e40af',
  Pendiente: '#92400e',
}

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 24 }}>Dashboard</h1>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.up ? '#059669' : '#dc2626', background: m.up ? '#d1fae5' : '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>
                  {m.change}
                </span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 4 }}>{m.value}</p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>{m.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Pedidos recientes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pedidos recientes</h2>
            <Link href="/ventas" style={{ fontSize: 13, color: '#0049ff', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['ID', 'Cliente', 'Producto', 'Monto', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af', padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#0049ff' }}>{o.id}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: '#374151' }}>{o.cliente}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: '#6b7280' }}>{o.producto}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>{o.monto}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: statusColor[o.estado], color: statusText[o.estado], fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {o.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock bajo */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>⚠️ Stock bajo</h2>
            <Link href="/productos" style={{ fontSize: 13, color: '#0049ff', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          {lowStock.map((p) => (
            <div key={p.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{p.nombre}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 10px', borderRadius: 20 }}>
                {p.stock} left
              </span>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: 16, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>3 productos necesitan reabastecimiento pronto.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
