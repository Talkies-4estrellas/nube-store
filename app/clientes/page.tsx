'use client'

import { useState } from 'react'

const allClients = [
  { id: 1, nombre: 'Ana García', email: 'ana@mail.com', telefono: '+52 55 1234 5678', ciudad: 'CDMX', pedidos: 8, total: '$7,240', ultimo: '28 Jun 2026', tag: 'VIP' },
  { id: 2, nombre: 'Luis Torres', email: 'luis@mail.com', telefono: '+52 33 8765 4321', ciudad: 'Guadalajara', pedidos: 4, total: '$3,120', ultimo: '28 Jun 2026', tag: 'Regular' },
  { id: 3, nombre: 'María López', email: 'maria@mail.com', telefono: '+52 81 2345 6789', ciudad: 'Monterrey', pedidos: 12, total: '$14,800', ultimo: '27 Jun 2026', tag: 'VIP' },
  { id: 4, nombre: 'Carlos Ruiz', email: 'carlos@mail.com', telefono: '+52 55 9876 5432', ciudad: 'CDMX', pedidos: 2, total: '$1,720', ultimo: '27 Jun 2026', tag: 'Nuevo' },
  { id: 5, nombre: 'Sofia Méndez', email: 'sofia@mail.com', telefono: '+52 55 4567 8901', ciudad: 'CDMX', pedidos: 6, total: '$9,600', ultimo: '26 Jun 2026', tag: 'VIP' },
  { id: 6, nombre: 'Pedro Vega', email: 'pedro@mail.com', telefono: '+52 33 3456 7890', ciudad: 'Guadalajara', pedidos: 1, total: '$890', ultimo: '26 Jun 2026', tag: 'Nuevo' },
  { id: 7, nombre: 'Laura Ríos', email: 'laura@mail.com', telefono: '+52 81 5678 9012', ciudad: 'Monterrey', pedidos: 3, total: '$2,340', ultimo: '25 Jun 2026', tag: 'Regular' },
  { id: 8, nombre: 'Miguel Soto', email: 'miguel@mail.com', telefono: '+52 55 6789 0123', ciudad: 'CDMX', pedidos: 5, total: '$4,600', ultimo: '25 Jun 2026', tag: 'Regular' },
]

const tagStyle: Record<string, { bg: string; text: string }> = {
  VIP:     { bg: '#fdf4ff', text: '#7e22ce' },
  Regular: { bg: '#dbeafe', text: '#1e40af' },
  Nuevo:   { bg: '#d1fae5', text: '#065f46' },
}

const tags = ['Todos', 'VIP', 'Regular', 'Nuevo']

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('Todos')
  const [selected, setSelected] = useState<(typeof allClients)[0] | null>(null)

  const filtered = allClients.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.ciudad.toLowerCase().includes(search.toLowerCase())
    const matchTag = tagFilter === 'Todos' || c.tag === tagFilter
    return matchSearch && matchTag
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Clientes</h1>
        <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Agregar cliente
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total clientes', value: allClients.length, color: '#111' },
          { label: 'VIP', value: allClients.filter(c => c.tag === 'VIP').length, color: '#7e22ce' },
          { label: 'Regulares', value: allClients.filter(c => c.tag === 'Regular').length, color: '#1e40af' },
          { label: 'Nuevos', value: allClients.filter(c => c.tag === 'Nuevo').length, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20 }}>
        {/* Tabla */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o ciudad..."
              style={{ flex: 1, minWidth: 200, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {tags.map(t => (
                <button key={t} onClick={() => setTagFilter(t)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: tagFilter === t ? '#0049ff' : '#f3f4f6',
                  color: tagFilter === t ? '#fff' : '#374151',
                  border: 'none',
                }}>{t}</button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['Cliente', 'Ciudad', 'Pedidos', 'Total gastado', 'Último pedido', 'Tipo', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setSelected(c === selected ? null : c)} style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: selected?.id === c.id ? '#eff6ff' : 'transparent' }}>
                  <td style={{ padding: '13px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: '#0049ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.nombre[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{c.nombre}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 0', fontSize: 13, color: '#6b7280' }}>{c.ciudad}</td>
                  <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.pedidos}</td>
                  <td style={{ padding: '13px 0', fontSize: 14, fontWeight: 700, color: '#111' }}>{c.total}</td>
                  <td style={{ padding: '13px 0', fontSize: 12, color: '#9ca3af' }}>{c.ultimo}</td>
                  <td style={{ padding: '13px 0' }}>
                    <span style={{ background: tagStyle[c.tag].bg, color: tagStyle[c.tag].text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {c.tag}
                    </span>
                  </td>
                  <td style={{ padding: '13px 0' }}>
                    <button style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
              <p style={{ fontSize: 14 }}>No se encontraron clientes</p>
            </div>
          )}
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Detalle del cliente</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, background: '#0049ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, margin: '0 auto 10px' }}>
                {selected.nombre[0]}
              </div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{selected.nombre}</p>
              <span style={{ background: tagStyle[selected.tag].bg, color: tagStyle[selected.tag].text, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                {selected.tag}
              </span>
            </div>
            {[
              { label: 'Email', value: selected.email },
              { label: 'Teléfono', value: selected.telefono },
              { label: 'Ciudad', value: selected.ciudad },
              { label: 'Total pedidos', value: String(selected.pedidos) },
              { label: 'Total gastado', value: selected.total },
              { label: 'Último pedido', value: selected.ultimo },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: '#111', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            <button style={{ width: '100%', marginTop: 16, background: '#0049ff', color: '#fff', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Ver historial de pedidos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
