'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Venta = {
  id: string
  numero: number
  estado: string
  total: number
  created_at: string
  clientes: { nombre: string; email: string } | null
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  Pagado:    { bg: '#d1fae5', text: '#065f46' },
  Enviado:   { bg: '#dbeafe', text: '#1e40af' },
  Pendiente: { bg: '#fef3c7', text: '#92400e' },
  Cancelado: { bg: '#fee2e2', text: '#991b1b' },
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

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data } = await supabase
        .from('ventas')
        .select('*, clientes(nombre, email)')
        .order('created_at', { ascending: false })
      if (data) setVentas(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = ventas.filter(v => {
    const nombre = v.clientes?.nombre ?? ''
    const matchSearch = nombre.toLowerCase().includes(search.toLowerCase()) ||
      String(v.numero).includes(search)
    const matchStatus = statusFilter === 'Todos' || v.estado === statusFilter
    return matchSearch && matchStatus
  })

  const total = filtered.reduce((sum, v) => sum + Number(v.total), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Ventas</h1>
        <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
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
            <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
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
              {filtered.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{v.numero}</td>
                  <td style={{ padding: '13px 0' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v.clientes?.nombre ?? '—'}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{v.clientes?.email ?? ''}</p>
                  </td>
                  <td style={{ padding: '13px 0', fontSize: 12, color: '#9ca3af' }}>{formatDate(v.created_at)}</td>
                  <td style={{ padding: '13px 0', fontSize: 14, fontWeight: 700, color: '#111' }}>${Number(v.total).toLocaleString()}</td>
                  <td style={{ padding: '13px 0' }}>
                    <span style={{ background: statusStyle[v.estado]?.bg, color: statusStyle[v.estado]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {v.estado}
                    </span>
                  </td>
                  <td style={{ padding: '13px 0' }}>
                    <button style={{ background: 'none', border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length === 0 && (
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
