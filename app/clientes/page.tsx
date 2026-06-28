'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ClienteModal from '@/components/ClienteModal'

type Cliente = {
  id: string
  nombre: string
  email: string
  telefono: string | null
  ciudad: string | null
  tag: string
  created_at: string
  total_pedidos?: number
  total_gastado?: number
}

const tagStyle: Record<string, { bg: string; text: string }> = {
  VIP:     { bg: '#fdf4ff', text: '#7e22ce' },
  Regular: { bg: '#dbeafe', text: '#1e40af' },
  Nuevo:   { bg: '#d1fae5', text: '#065f46' },
}

const tags = ['Todos', 'VIP', 'Regular', 'Nuevo']

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('Todos')
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<(Cliente & { id: string }) | null>(null)

  async function fetchClientes() {
      setLoading(true)
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        // Enriquecer con conteo de ventas
        const enriched = await Promise.all(data.map(async (c) => {
          const { data: ventas } = await supabase
            .from('ventas')
            .select('total')
            .eq('cliente_id', c.id)
            .eq('estado', 'Pagado')
          const total_pedidos = ventas?.length ?? 0
          const total_gastado = ventas?.reduce((s, v) => s + Number(v.total), 0) ?? 0
          return { ...c, total_pedidos, total_gastado }
        }))
        setClientes(enriched)
      }
      setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  const filtered = clientes.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.ciudad ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTag = tagFilter === 'Todos' || c.tag === tagFilter
    return matchSearch && matchTag
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Clientes</h1>
        <button onClick={() => { setEditando(null); setShowModal(true) }} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Agregar cliente
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total clientes', value: clientes.length, color: '#111' },
          { label: 'VIP', value: clientes.filter(c => c.tag === 'VIP').length, color: '#7e22ce' },
          { label: 'Regulares', value: clientes.filter(c => c.tag === 'Regular').length, color: '#1e40af' },
          { label: 'Nuevos', value: clientes.filter(c => c.tag === 'Nuevo').length, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20 }}>
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
                  color: tagFilter === t ? '#fff' : '#374151', border: 'none',
                }}>{t}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
              <p>Cargando clientes...</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Cliente', 'Ciudad', 'Pedidos', 'Total gastado', 'Tipo', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c === selected ? null : c)}
                    style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: selected?.id === c.id ? '#eff6ff' : 'transparent' }}>
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
                    <td style={{ padding: '13px 0', fontSize: 13, color: '#6b7280' }}>{c.ciudad ?? '—'}</td>
                    <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 600 }}>{c.total_pedidos ?? 0}</td>
                    <td style={{ padding: '13px 0', fontSize: 14, fontWeight: 700, color: '#111' }}>${(c.total_gastado ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '13px 0' }}>
                      <span style={{ background: tagStyle[c.tag]?.bg, color: tagStyle[c.tag]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {c.tag}
                      </span>
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <button onClick={() => { setEditando(c); setShowModal(true) }} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
              <p style={{ fontSize: 14 }}>No se encontraron clientes</p>
            </div>
          )}
        </div>

        {/* Panel detalle */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Detalle del cliente</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, background: '#0049ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, margin: '0 auto 10px' }}>
                {selected.nombre[0]}
              </div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{selected.nombre}</p>
              <span style={{ background: tagStyle[selected.tag]?.bg, color: tagStyle[selected.tag]?.text, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                {selected.tag}
              </span>
            </div>
            {[
              { label: 'Email', value: selected.email },
              { label: 'Teléfono', value: selected.telefono ?? '—' },
              { label: 'Ciudad', value: selected.ciudad ?? '—' },
              { label: 'Pedidos pagados', value: String(selected.total_pedidos ?? 0) },
              { label: 'Total gastado', value: `$${(selected.total_gastado ?? 0).toLocaleString()}` },
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

      {showModal && (
        <ClienteModal
          inicial={editando ? { id: editando.id, nombre: editando.nombre, email: editando.email, telefono: editando.telefono ?? '', ciudad: editando.ciudad ?? '', tag: editando.tag as 'Nuevo' | 'Regular' | 'VIP' } : undefined}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSave={() => { setShowModal(false); setEditando(null); fetchClientes() }}
        />
      )}
    </div>
  )
}
