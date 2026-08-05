'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ClienteModal from '@/components/ClienteModal'
import ProveedorModal from '@/components/ProveedorModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import MotivoRechazoDialog from '@/components/MotivoRechazoDialog'
import Icon from '@/components/Icon'
import { SkeletonTableBody } from '@/components/Skeleton'
import { paginasVisibles } from '@/lib/pagination'
import { useAuth } from '@/lib/auth-context'
import { registrarAuditoria } from '@/lib/bitacora'
import { aprobarRegistroProveedor, rechazarRegistroProveedor } from '@/lib/registroProveedores'
import { PASSWORD_CUENTA_DEFAULT } from '@/lib/cuentas'

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

type Proveedor = {
  id: string
  nombre: string
  email: string
  empresa: string | null
  telefono: string | null
  created_at: string
  productos_aprobados?: number
  estado?: 'activo' | 'suspendido'
}

type SolicitudRegistroProveedor = {
  id: string
  nombre_contacto: string
  email: string
  telefono: string | null
  nombre_negocio: string | null
  descripcion: string | null
  categoria_interes: string | null
  sitio_o_redes: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivo_rechazo: string | null
  created_at: string
}

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
  const { user: authUser } = useAuth()
  const [seccion, setSeccion] = useState<'clientes' | 'proveedores'>('clientes')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loadingProveedores, setLoadingProveedores] = useState(true)
  const [searchProv, setSearchProv] = useState('')
  const [filtroEstadoProv, setFiltroEstadoProv] = useState<'todos' | 'activo' | 'suspendido'>('todos')
  const [confirmSuspender, setConfirmSuspender] = useState<Proveedor | null>(null)

  // Solicitudes de REGISTRO de nuevos proveedores (cuestionario público /registro-proveedor)
  const [showSolicitudesRegistro, setShowSolicitudesRegistro] = useState(false)
  const [formularioActivo,      setFormularioActivo]      = useState(false)
  const [guardandoFormulario,   setGuardandoFormulario]   = useState(false)
  const [solicitudesRegistro,   setSolicitudesRegistro]   = useState<SolicitudRegistroProveedor[]>([])
  const [loadingSolReg,         setLoadingSolReg]         = useState(false)
  const [filtroEstadoReg,       setFiltroEstadoReg]       = useState<'todas' | 'pendiente' | 'aprobado' | 'rechazado'>('pendiente')
  const [updatingRegId,         setUpdatingRegId]         = useState<string | null>(null)
  const [rechazandoRegId,       setRechazandoRegId]       = useState<string | null>(null)
  const [expandedRegId,         setExpandedRegId]         = useState<string | null>(null)
  const [linkCopiado,           setLinkCopiado]           = useState(false)
  const [cuentaCreada,          setCuentaCreada]          = useState<{ email: string; nombre: string } | null>(null)
  const [errorRegId,            setErrorRegId]            = useState<{ id: string; mensaje: string } | null>(null)
  const [copiadoCredenciales,   setCopiadoCredenciales]   = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('Todos')
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showProveedorModal, setShowProveedorModal] = useState(false)
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

  async function fetchProveedores() {
    setLoadingProveedores(true)
    // select('*') a propósito: así no truena si `estado` todavía no existe
    // en esta base (migration_estado_proveedores.sql pendiente de correr).
    const [{ data }, { data: solicitudes }] = await Promise.all([
      supabase.from('user_roles').select('*').eq('role', 'proveedor').order('created_at', { ascending: false }),
      supabase.from('solicitudes_productos').select('proveedor_email').eq('estado', 'aprobado'),
    ])
    if (data) {
      const conteo: Record<string, number> = {}
      for (const s of (solicitudes ?? [])) conteo[s.proveedor_email] = (conteo[s.proveedor_email] ?? 0) + 1
      setProveedores(data.map(p => ({ ...p, estado: p.estado ?? 'activo', productos_aprobados: conteo[p.email] ?? 0 })))
    }
    setLoadingProveedores(false)
  }

  async function cambiarEstadoProveedor(p: Proveedor) {
    const nuevo = p.estado === 'suspendido' ? 'activo' : 'suspendido'
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, estado: nuevo } : x))
    const { error } = await supabase.from('user_roles').update({ estado: nuevo }).eq('id', p.id)
    if (error) { setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, estado: p.estado } : x)); return }
    registrarAuditoria(supabase, {
      usuarioId: authUser?.id, accion: nuevo === 'suspendido' ? 'suspender_proveedor' : 'reactivar_proveedor',
      tabla: 'user_roles', registroId: p.id, valorAnterior: p.estado ?? 'activo', valorNuevo: nuevo,
    })
  }

  useEffect(() => { if (seccion === 'proveedores' && proveedores.length === 0) fetchProveedores() }, [seccion]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFormularioActivo() {
    const { data } = await supabase.from('config_storefront').select('registro_proveedor_activo').eq('id', 1).single()
    setFormularioActivo(!!data?.registro_proveedor_activo)
  }

  async function toggleFormularioActivo(v: boolean) {
    setGuardandoFormulario(true)
    setFormularioActivo(v)
    await supabase.from('config_storefront').update({ registro_proveedor_activo: v }).eq('id', 1)
    setGuardandoFormulario(false)
  }

  async function fetchSolicitudesRegistro() {
    setLoadingSolReg(true)
    const { data } = await supabase.from('solicitudes_registro_proveedor').select('*').order('created_at', { ascending: false })
    setSolicitudesRegistro((data ?? []) as SolicitudRegistroProveedor[])
    setLoadingSolReg(false)
  }

  // Se carga en cuanto se entra a "Proveedores" (no solo al abrir el panel) para
  // que el badge de pendientes ya se vea sin tener que abrir nada.
  useEffect(() => {
    if (seccion === 'proveedores') { fetchSolicitudesRegistro() }
  }, [seccion])

  useEffect(() => {
    if (showSolicitudesRegistro) fetchFormularioActivo()
  }, [showSolicitudesRegistro])

  async function aprobarRegistro(sol: SolicitudRegistroProveedor) {
    setUpdatingRegId(sol.id)
    setErrorRegId(null)
    const { error } = await aprobarRegistroProveedor(supabase, sol, authUser?.id)
    setUpdatingRegId(null)
    if (error) { setErrorRegId({ id: sol.id, mensaje: error }); return }
    setSolicitudesRegistro(prev => prev.map(s => s.id === sol.id ? { ...s, estado: 'aprobado', motivo_rechazo: null } : s))
    setCuentaCreada({ email: sol.email, nombre: sol.nombre_contacto })
    fetchProveedores()
  }

  async function confirmarRechazoRegistro(motivo: string) {
    if (!rechazandoRegId) return
    const sol = solicitudesRegistro.find(s => s.id === rechazandoRegId)
    if (!sol) return
    setUpdatingRegId(rechazandoRegId)
    await rechazarRegistroProveedor(supabase, sol, motivo)
    // No se conserva el registro tras rechazarlo — se le notifica y se borra.
    setSolicitudesRegistro(prev => prev.filter(s => s.id !== rechazandoRegId))
    setUpdatingRegId(null)
    setRechazandoRegId(null)
  }

  const filteredProveedores = proveedores.filter(p =>
    (filtroEstadoProv === 'todos' || (p.estado ?? 'activo') === filtroEstadoProv) &&
    (p.nombre.toLowerCase().includes(searchProv.toLowerCase()) ||
      p.email.toLowerCase().includes(searchProv.toLowerCase()) ||
      (p.empresa ?? '').toLowerCase().includes(searchProv.toLowerCase()))
  )

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Clientes</h1>
        {seccion === 'clientes' ? (
          <button onClick={() => { setEditando(null); setShowModal(true) }} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + Agregar cliente
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowSolicitudesRegistro(v => !v)} style={{
              position: 'relative', background: showSolicitudesRegistro ? '#252855' : '#f3f4f6', color: showSolicitudesRegistro ? '#fff' : '#374151',
              border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              🆕 Nuevos proveedores
              {solicitudesRegistro.filter(s => s.estado === 'pendiente').length > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#e7226d', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {solicitudesRegistro.filter(s => s.estado === 'pendiente').length}
                </span>
              )}
            </button>
            <button onClick={() => setShowProveedorModal(true)} style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              + Agregar proveedor
            </button>
          </div>
        )}
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSeccion('clientes')} style={{
          padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          background: seccion === 'clientes' ? '#0049ff' : '#f3f4f6', color: seccion === 'clientes' ? '#fff' : '#374151', border: 'none',
        }}>👤 Clientes</button>
        <button onClick={() => setSeccion('proveedores')} style={{
          padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          background: seccion === 'proveedores' ? '#0049ff' : '#f3f4f6', color: seccion === 'proveedores' ? '#fff' : '#374151', border: 'none',
        }}>📦 Proveedores{proveedores.length > 0 ? ` (${proveedores.length})` : ''}</button>
      </div>

      {seccion === 'proveedores' && showSolicitudesRegistro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {/* Interruptor de la campaña */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>Formulario de registro de proveedores</p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Mientras esté activado, cualquiera con el link puede llenar el cuestionario para postularse como proveedor.</p>
              </div>
              <button onClick={() => toggleFormularioActivo(!formularioActivo)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: formularioActivo ? '#0049ff' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: formularioActivo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            {guardandoFormulario && <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>Guardando...</p>}

            {formularioActivo && (
              <div style={{ marginTop: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/registro-proveedor` : '/registro-proveedor'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/registro-proveedor`)
                    setLinkCopiado(true)
                    setTimeout(() => setLinkCopiado(false), 2000)
                  }}
                  style={{ marginLeft: 'auto', background: linkCopiado ? '#dcfce7' : '#eff6ff', color: linkCopiado ? '#166534' : '#0049ff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {linkCopiado ? '✓ Copiado' : 'Copiar link'}
                </button>
              </div>
            )}
          </div>

          {/* Lista de solicitudes de registro */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Solicitudes de registro</h2>
              <button onClick={fetchSolicitudesRegistro} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                ↻ Actualizar
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['todas', 'pendiente', 'aprobado', 'rechazado'] as const).map(f => (
                <button key={f} onClick={() => setFiltroEstadoReg(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: filtroEstadoReg === f ? '#252855' : '#f3f4f6',
                    color: filtroEstadoReg === f ? '#fff' : '#374151',
                  }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'todas' && (
                    <span style={{ marginLeft: 6, background: filtroEstadoReg === f ? '#ffffff30' : '#e5e7eb', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                      {solicitudesRegistro.filter(s => s.estado === f).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loadingSolReg ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Cargando solicitudes...</p>
            ) : (() => {
              const lista = filtroEstadoReg === 'todas' ? solicitudesRegistro : solicitudesRegistro.filter(s => s.estado === filtroEstadoReg)
              if (lista.length === 0) return (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>No hay solicitudes {filtroEstadoReg !== 'todas' ? `con estado "${filtroEstadoReg}"` : ''}</p>
                </div>
              )
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lista.map(s => {
                    const isExpanded = expandedRegId === s.id
                    const estadoColor = { pendiente: { bg: '#fef3c7', color: '#92400e' }, aprobado: { bg: '#dcfce7', color: '#166534' }, rechazado: { bg: '#fee2e2', color: '#991b1b' } }[s.estado]
                    return (
                      <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? '#f9fafb' : '#fff' }}
                          onClick={() => setExpandedRegId(isExpanded ? null : s.id)}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#252855', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                            {s.nombre_contacto.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre_contacto}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: estadoColor.bg, color: estadoColor.color, flexShrink: 0 }}>
                                {s.estado.toUpperCase()}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.email}
                              {s.nombre_negocio && ` · ${s.nombre_negocio}`}
                              {s.categoria_interes && ` · ${s.categoria_interes}`}
                            </p>
                          </div>
                          <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{new Date(s.created_at).toLocaleDateString('es-MX')}</span>
                          <span style={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', background: '#fafafa' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 8px' }}>Contacto</p>
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>{s.nombre_contacto}</strong></p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
                                  <a href={`mailto:${s.email}`} style={{ fontSize: 13, color: '#0049ff', fontWeight: 600 }}>📧 {s.email}</a>
                                  <button onClick={() => navigator.clipboard.writeText(s.email)}
                                    style={{ fontSize: 10, background: '#f3f4f6', border: 'none', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}>
                                    Copiar
                                  </button>
                                </div>
                                {s.telefono && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>📞 {s.telefono}</p>}
                              </div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 8px' }}>Negocio</p>
                                {s.nombre_negocio && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>{s.nombre_negocio}</strong></p>}
                                {s.categoria_interes && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>Productos: {s.categoria_interes}</p>}
                                {s.sitio_o_redes && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>🔗 {s.sitio_o_redes}</p>}
                                {s.descripcion && <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{s.descripcion}</p>}
                              </div>
                            </div>

                            {errorRegId?.id === s.id && (
                              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                                <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>{errorRegId.mensaje}</p>
                              </div>
                            )}

                            {s.estado === 'pendiente' && (
                              <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => aprobarRegistro(s)} disabled={updatingRegId === s.id}
                                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: updatingRegId === s.id ? 0.6 : 1 }}>
                                  {updatingRegId === s.id ? 'Creando cuenta...' : '✓ Aprobar y crear cuenta'}
                                </button>
                                <button onClick={() => setRechazandoRegId(s.id)} disabled={updatingRegId === s.id}
                                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: updatingRegId === s.id ? 0.6 : 1 }}>
                                  ✕ Rechazar
                                </button>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>Al aprobar se crea su cuenta y se le notifica por correo. Al rechazar, se le notifica el motivo y no se guarda su información.</span>
                              </div>
                            )}
                            {s.estado === 'aprobado' && (
                              <div style={{ paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                                <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 600 }}>✓ Cuenta creada y proveedor notificado por correo.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {seccion === 'proveedores' ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={searchProv}
              onChange={e => setSearchProv(e.target.value)}
              placeholder="Buscar por nombre, email o empresa..."
              style={{ flex: 1, minWidth: 240, maxWidth: 360, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
              {([['todos', 'Todos'], ['activo', 'Activos'], ['suspendido', 'Suspendidos']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setFiltroEstadoProv(v)} style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: filtroEstadoProv === v ? '#fff' : 'transparent', color: filtroEstadoProv === v ? '#111' : '#6b7280',
                  boxShadow: filtroEstadoProv === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>{label}</button>
              ))}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['Proveedor', 'Empresa', 'Teléfono', 'Productos aprobados', 'Estado', 'Registrado', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingProveedores ? (
                <SkeletonTableBody rows={5} cols={['180px', '140px', '110px', '80px', '70px', '90px', '80px']} />
              ) : filteredProveedores.map(p => {
                const suspendido = p.estado === 'suspendido'
                return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '13px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: avatarColor(p.nombre), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {initials(p.nombre)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 0', fontSize: 13, color: '#6b7280' }}>{p.empresa ?? '—'}</td>
                  <td style={{ padding: '13px 0', fontSize: 13, color: '#6b7280' }}>{p.telefono ?? '—'}</td>
                  <td style={{ padding: '13px 0', fontSize: 13, fontWeight: 600 }}>{p.productos_aprobados ?? 0}</td>
                  <td style={{ padding: '13px 0' }}>
                    <span style={{ background: suspendido ? '#fee2e2' : '#d1fae5', color: suspendido ? '#991b1b' : '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {suspendido ? 'Suspendido' : 'Activo'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 0', fontSize: 12, color: '#6b7280' }}>
                    {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '13px 0' }}>
                    <button onClick={() => setConfirmSuspender(p)}
                      style={{ background: suspendido ? '#d1fae5' : '#fee2e2', color: suspendido ? '#065f46' : '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {suspendido ? 'Reactivar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          {!loadingProveedores && filteredProveedores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <Icon name="users" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No se encontraron proveedores</p>
            </div>
          )}
        </div>
      ) : (
      <>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '100%' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: page===1?'#f9fafb':'#fff', color: page===1?'#d1d5db':'#374151', cursor: page===1?'default':'pointer', fontSize: 13 }}>← Anterior</button>
                {paginasVisibles(page, totalPages).map((n, i) =>
                  n === '...' ? (
                    <span key={`e${i}`} style={{ padding: '6px 4px', fontSize: 13, color: '#9ca3af' }}>…</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n)}
                      style={{ padding: '6px 11px', borderRadius: 6, border: '1px solid #e5e7eb', background: page===n?'#0049ff':'#fff', color: page===n?'#fff':'#374151', cursor: 'pointer', fontSize: 13, fontWeight: page===n?700:400 }}>{n}</button>
                  )
                )}
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
      </>
      )}

      {confirmSuspender && (
        <ConfirmDialog
          danger={confirmSuspender.estado !== 'suspendido'}
          title={confirmSuspender.estado === 'suspendido' ? '¿Reactivar proveedor?' : '¿Suspender proveedor?'}
          message={confirmSuspender.estado === 'suspendido'
            ? `"${confirmSuspender.nombre}" va a poder volver a acceder a su portal y gestionar sus productos.`
            : `"${confirmSuspender.nombre}" no va a poder iniciar sesión en su portal hasta que lo reactives. Sus productos ya publicados NO se ocultan del catálogo.`}
          confirmLabel={confirmSuspender.estado === 'suspendido' ? 'Sí, reactivar' : 'Sí, suspender'}
          onConfirm={() => { cambiarEstadoProveedor(confirmSuspender); setConfirmSuspender(null) }}
          onCancel={() => setConfirmSuspender(null)}
        />
      )}

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
          onSave={fetchClientes}
        />
      )}

      {showProveedorModal && (
        <ProveedorModal
          onClose={() => setShowProveedorModal(false)}
          onSave={fetchProveedores}
        />
      )}

      {rechazandoRegId && (
        <MotivoRechazoDialog
          enviando={updatingRegId === rechazandoRegId}
          onCancel={() => setRechazandoRegId(null)}
          onConfirm={confirmarRechazoRegistro}
        />
      )}

      {cuentaCreada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setCuentaCreada(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: '32px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 6 }}>Proveedor aprobado</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Se creó la cuenta de <strong>{cuentaCreada.nombre}</strong> y ya se le envió por correo su acceso con recordatorio de cambiar la contraseña.
            </p>

            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', textAlign: 'left', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Email</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{cuentaCreada.email}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Contraseña</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0, fontFamily: 'monospace' }}>{PASSWORD_CUENTA_DEFAULT}</p>
            </div>

            <button type="button" onClick={() => {
              navigator.clipboard.writeText(`Email: ${cuentaCreada.email}\nContraseña: ${PASSWORD_CUENTA_DEFAULT}`)
              setCopiadoCredenciales(true)
              setTimeout(() => setCopiadoCredenciales(false), 2000)
            }}
              style={{ width: '100%', background: copiadoCredenciales ? '#d1fae5' : '#eff6ff', color: copiadoCredenciales ? '#065f46' : '#0049ff', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
              {copiadoCredenciales ? '✓ Copiado' : '📋 Copiar email y contraseña'}
            </button>

            <button type="button" onClick={() => setCuentaCreada(null)}
              style={{ width: '100%', background: '#0049ff', color: '#fff', border: 'none', padding: '11px 0', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
