'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ClienteModal from '@/components/ClienteModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import Icon from '@/components/Icon'
import { SkeletonTableBody } from '@/components/Skeleton'

const PAGE_SIZE = 15

type Cliente = {
  id: string
  nombre: string
  email: string
  telefono: string | null
  ciudad: string | null
  direccion: string | null
  codigo_postal: string | null
  estado_region: string | null
  pais: string | null
  tag: string
  created_at: string
  total_pedidos?: number
  total_gastado?: number
  ultima_compra?: string | null
}

const tagStyle: Record<string, { bg: string; text: string }> = {
  VIP:     { bg: '#fdf4ff', text: '#7e22ce' },
  Regular: { bg: '#dbeafe', text: '#1e40af' },
  Nuevo:   { bg: '#d1fae5', text: '#065f46' },
}

const tags = ['Todos', 'VIP', 'Regular', 'Nuevo']

const AVATAR_COLORS = ['#0049ff','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2','#374151']
function avatarColor(nombre: string) {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase()
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('Todos')
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<(Cliente & { id: string }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'nombre' | 'total_gastado' | 'total_pedidos' | 'ultima_compra'>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [historial, setHistorial] = useState<{ id: string; numero: number; total: number; estado: string; created_at: string }[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)

  async function fetchHistorial(clienteId: string) {
    setLoadingHistorial(true)
    setShowHistorial(true)
    const { data } = await supabase
      .from('ventas')
      .select('id, numero, total, estado, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    setHistorial(data ?? [])
    setLoadingHistorial(false)
  }

  async function fetchClientes() {
    setLoading(true)
    const [{ data }, { data: todasVentas }] = await Promise.all([
      supabase.from('clientes').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('ventas').select('cliente_id, total, created_at').eq('estado', 'Pagado'),
    ])

    if (data) {
      const ventaMap: Record<string, { total: number; created_at: string }[]> = {}
      for (const v of (todasVentas ?? [])) {
        if (!ventaMap[v.cliente_id]) ventaMap[v.cliente_id] = []
        ventaMap[v.cliente_id].push(v)
      }
      const enriched = data.map(c => {
        const ventas = (ventaMap[c.id] ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return {
          ...c,
          total_pedidos: ventas.length,
          total_gastado: ventas.reduce((s, v) => s + Number(v.total), 0),
          ultima_compra: ventas[0]?.created_at ?? null,
        }
      })
      setClientes(enriched)
    }
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  async function handleDelete(c: Cliente) {
    setDeleting(true)
    await supabase.from('clientes').update({ deleted_at: new Date().toISOString() }).eq('id', c.id)
    if (selected?.id === c.id) setSelected(null)
    await fetchClientes()
    setDeleting(false)
    setConfirmDelete(null)
  }

  const filtered = clientes
    .filter(c => {
      const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.ciudad ?? '').toLowerCase().includes(search.toLowerCase())
      const matchTag = tagFilter === 'Todos' || c.tag === tagFilter
      return matchSearch && matchTag
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'nombre')        return mul * a.nombre.localeCompare(b.nombre)
      if (sortBy === 'total_gastado') return mul * ((a.total_gastado ?? 0) - (b.total_gastado ?? 0))
      if (sortBy === 'total_pedidos') return mul * ((a.total_pedidos ?? 0) - (b.total_pedidos ?? 0))
      if (sortBy === 'ultima_compra') {
        const da = a.ultima_compra ? new Date(a.ultima_compra).getTime() : 0
        const db = b.ultima_compra ? new Date(b.ultima_compra).getTime() : 0
        return mul * (da - db)
      }
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
            <select value={`${sortBy}-${sortDir}`} onChange={e => {
              const [col, dir] = e.target.value.split('-')
              setSortBy(col as typeof sortBy); setSortDir(dir as 'asc' | 'desc'); setPage(1)
            }} style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
              <option value="nombre-asc">Nombre A→Z</option>
              <option value="nombre-desc">Nombre Z→A</option>
              <option value="total_gastado-desc">Mayor gasto</option>
              <option value="total_gastado-asc">Menor gasto</option>
              <option value="total_pedidos-desc">Más pedidos</option>
              <option value="ultima_compra-desc">Más recientes</option>
            </select>
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

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Cliente', 'Ciudad', 'Pedidos', 'Total gastado', 'Última compra', 'Tipo', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableBody rows={8} cols={['180px','80px','50px','90px','90px','60px','110px']} />
                ) : paginated.map(c => (
                  <tr key={c.id} onClick={() => { if (c === selected) { setSelected(null) } else { setSelected(c); setShowHistorial(false); setHistorial([]) } }}
                    style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: selected?.id === c.id ? '#eff6ff' : 'transparent' }}>
                    <td style={{ padding: '13px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: avatarColor(c.nombre), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                          {initials(c.nombre)}
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
                    <td style={{ padding: '13px 0', fontSize: 12, color: '#6b7280' }}>
                      {c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <span style={{ background: tagStyle[c.tag]?.bg, color: tagStyle[c.tag]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {c.tag}
                      </span>
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => { e.stopPropagation(); setEditando(c); setShowModal(true) }} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(c) }} style={{ background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <Icon name="users" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No se encontraron clientes</p>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 13, color: '#6b7280' }}>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}</p>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: page===1?'#f9fafb':'#fff', color: page===1?'#d1d5db':'#374151', cursor: page===1?'default':'pointer', fontSize: 13 }}>← Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ padding: '6px 11px', borderRadius: 6, border: '1px solid #e5e7eb', background: page===n?'#0049ff':'#fff', color: page===n?'#fff':'#374151', cursor: 'pointer', fontSize: 13, fontWeight: page===n?700:400 }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: page===totalPages?'#f9fafb':'#fff', color: page===totalPages?'#d1d5db':'#374151', cursor: page===totalPages?'default':'pointer', fontSize: 13 }}>Siguiente →</button>
              </div>
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
              <div style={{ width: 60, height: 60, background: avatarColor(selected.nombre), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, margin: '0 auto 10px', letterSpacing: '0.02em' }}>
                {initials(selected.nombre)}
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
              { label: 'Última compra', value: selected.ultima_compra ? new Date(selected.ultima_compra).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: '#111', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            {!showHistorial ? (
              <button onClick={() => fetchHistorial(selected.id)} style={{ width: '100%', marginTop: 16, background: '#0049ff', color: '#fff', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Ver historial de pedidos
              </button>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>Historial de pedidos</p>
                  <button onClick={() => setShowHistorial(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>Ocultar</button>
                </div>
                {loadingHistorial ? (
                  <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Cargando...</p>
                ) : historial.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Sin pedidos registrados</p>
                ) : (
                  historial.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{v.numero}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(v.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>${Number(v.total).toLocaleString()}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: v.estado === 'Pagado' ? '#d1fae5' : v.estado === 'Enviado' ? '#dbeafe' : v.estado === 'Cancelado' ? '#fee2e2' : '#fef3c7', color: v.estado === 'Pagado' ? '#065f46' : v.estado === 'Enviado' ? '#1e40af' : v.estado === 'Cancelado' ? '#991b1b' : '#92400e' }}>{v.estado}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="¿Eliminar cliente?"
          message={`"${confirmDelete.nombre}" y todos sus datos se eliminarán permanentemente. Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando...' : 'Sí, eliminar'}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showModal && (
        <ClienteModal
          inicial={editando ? {
            id: editando.id,
            nombre: editando.nombre,
            email: editando.email,
            telefono: editando.telefono ?? '',
            ciudad: editando.ciudad ?? '',
            direccion: editando.direccion ?? '',
            codigo_postal: editando.codigo_postal ?? '',
            estado_region: editando.estado_region ?? '',
            pais: editando.pais ?? 'México',
            tag: editando.tag as 'Nuevo' | 'Regular' | 'VIP',
          } : undefined}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSave={() => { setShowModal(false); setEditando(null); fetchClientes() }}
        />
      )}
    </div>
  )
}
