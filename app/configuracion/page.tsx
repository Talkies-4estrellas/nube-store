'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Section = 'negocio' | 'contacto' | 'pagos' | 'notificaciones' | 'usuarios' | 'solicitudes'

type UserRow = { id: string; user_id: string; nombre: string; role: string; created_at: string; email?: string }
type Solicitud = {
  id: string
  proveedor_nombre: string
  proveedor_empresa: string | null
  proveedor_email: string
  proveedor_telefono: string | null
  producto_nombre: string
  producto_sku: string
  producto_descripcion: string | null
  producto_precio: number
  producto_stock: number
  categoria_id: number | null
  imagen_url: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  categorias?: { nombre: string } | null
}

const ALL_NAV: { id: Section; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'negocio',        label: 'Datos del negocio',    icon: 'store'      },
  { id: 'contacto',       label: 'Contacto',              icon: 'users'      },
  { id: 'pagos',          label: 'Métodos de pago',       icon: 'creditcard' },
  { id: 'notificaciones', label: 'Notificaciones',         icon: 'warning'    },
  { id: 'solicitudes',    label: 'Solicitudes proveedor',  icon: 'box',       adminOnly: true },
  { id: 'usuarios',       label: 'Usuarios y roles',       icon: 'settings',  adminOnly: true },
]

const monedas = ['MXN — Peso mexicano', 'USD — Dólar estadounidense', 'ARS — Peso argentino', 'COP — Peso colombiano', 'CLP — Peso chileno']

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:    { bg: '#ede9fe', color: '#6d28d9' },
  vendedor: { bg: '#dbeafe', color: '#1e40af' },
  bodega:   { bg: '#d1fae5', color: '#065f46' },
}

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const [section, setSection] = useState<Section>('negocio')
  const [saved,   setSaved]   = useState(false)

  // Estado para sección usuarios
  const [usuarios,        setUsuarios]        = useState<UserRow[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [editingRole,     setEditingRole]     = useState<{ id: string; role: string } | null>(null)
  const [savingRole,      setSavingRole]      = useState(false)

  // Estado para solicitudes de proveedores
  const [solicitudes,        setSolicitudes]        = useState<Solicitud[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [filtroEstado,       setFiltroEstado]       = useState<'todas' | 'pendiente' | 'aprobado' | 'rechazado'>('pendiente')
  const [updatingId,         setUpdatingId]         = useState<string | null>(null)
  const [expandedId,         setExpandedId]         = useState<string | null>(null)

  const navItems = ALL_NAV.filter(n => !n.adminOnly || user?.role === 'admin')

  useEffect(() => {
    if (section === 'usuarios') fetchUsuarios()
    if (section === 'solicitudes') fetchSolicitudes()
  }, [section])

  async function fetchUsuarios() {
    setLoadingUsuarios(true)
    const { data } = await supabase.from('user_roles').select('*').order('created_at')
    setUsuarios((data ?? []) as UserRow[])
    setLoadingUsuarios(false)
  }

  async function saveRole() {
    if (!editingRole) return
    setSavingRole(true)
    await supabase.from('user_roles').update({ role: editingRole.role }).eq('id', editingRole.id)
    setSavingRole(false)
    setEditingRole(null)
    fetchUsuarios()
  }

  async function fetchSolicitudes() {
    setLoadingSolicitudes(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('*, categorias(nombre)')
      .order('created_at', { ascending: false })
    setSolicitudes((data ?? []) as Solicitud[])
    setLoadingSolicitudes(false)
  }

  async function cambiarEstado(id: string, estado: 'aprobado' | 'rechazado' | 'pendiente') {
    setUpdatingId(id)
    await supabase.from('solicitudes_productos').update({ estado }).eq('id', id)
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado } : s))
    setUpdatingId(null)
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`¿Eliminar acceso de ${u.nombre}? El usuario de Supabase Auth no se elimina.`)) return
    await supabase.from('user_roles').delete().eq('id', u.id)
    fetchUsuarios()
  }

  const [negocio, setNegocio] = useState({ nombre: 'Order Express', moneda: 'MXN — Peso mexicano', zona: 'America/Mexico_City', idioma: 'Español (México)' })
  const [contacto, setContacto] = useState({ email: '', telefono: '', whatsapp: '', direccion: '', ciudad: '', pais: 'México' })
  const [pagos, setPagos] = useState({ efectivo: true, transferencia: true, tarjeta: false, mercadopago: false })
  const [notif, setNotif] = useState({ stock_bajo: true, nueva_venta: true, email_resumen: false })
  const [heroTitulo, setHeroTitulo] = useState('')
  const [heroSubtitulo, setHeroSubtitulo] = useState('')
  const [heroCta, setHeroCta] = useState('')

  useEffect(() => {
    supabase.from('config_storefront').select('*').eq('id', 1).single()
      .then(({ data }) => {
        if (!data) return
        setNegocio(prev => ({ ...prev, nombre: data.nombre_tienda ?? prev.nombre }))
        setContacto(prev => ({ ...prev, email: data.email_contacto ?? '', whatsapp: data.whatsapp ?? '' }))
        setHeroTitulo(data.hero_titulo ?? '')
        setHeroSubtitulo(data.hero_subtitulo ?? '')
        setHeroCta(data.hero_cta ?? '')
      })
  }, [])

  async function handleSave() {
    await supabase.from('config_storefront').update({
      nombre_tienda:   negocio.nombre,
      hero_titulo:     heroTitulo,
      hero_subtitulo:  heroSubtitulo,
      hero_cta:        heroCta,
      email_contacto:  contacto.email,
      whatsapp:        contacto.whatsapp,
    }).eq('id', 1)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Sub-nav */}
      <aside style={{ background: '#fff', borderRadius: 12, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '10px 16px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuración</p>
        {navItems.map(item => {
          const active = section === item.id
          return (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
              fontSize: 13, color: active ? '#0049ff' : '#374151', fontWeight: active ? 700 : 400,
              background: active ? '#eff6ff' : 'transparent',
              borderLeft: `3px solid ${active ? '#0049ff' : 'transparent'}`,
              border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
              borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: active ? '#0049ff' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <Icon name={item.icon} size={16} color={active ? '#0049ff' : '#9ca3af'} />
              {item.label}
            </button>
          )
        })}
      </aside>

      {/* Contenido */}
      <div>
        {section === 'negocio' && (
          <Card title="Datos del negocio">
            <Field label="Nombre del negocio">
              <input value={negocio.nombre} onChange={e => setNegocio(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Moneda">
              <select value={negocio.moneda} onChange={e => setNegocio(p => ({ ...p, moneda: e.target.value }))} style={inputStyle}>
                {monedas.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Zona horaria">
              <select value={negocio.zona} onChange={e => setNegocio(p => ({ ...p, zona: e.target.value }))} style={inputStyle}>
                {['America/Mexico_City', 'America/Bogota', 'America/Santiago', 'America/Buenos_Aires', 'America/Lima'].map(z => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Idioma">
              <select value={negocio.idioma} onChange={e => setNegocio(p => ({ ...p, idioma: e.target.value }))} style={inputStyle}>
                {['Español (México)', 'Español (Argentina)', 'Español (Colombia)', 'Inglés'].map(i => <option key={i}>{i}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'contacto' && (
          <Card title="Información de contacto">
            <Field label="Email de contacto">
              <input type="email" placeholder="hola@tunegocio.com" value={contacto.email} onChange={e => setContacto(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Teléfono">
              <input placeholder="+52 55 0000 0000" value={contacto.telefono} onChange={e => setContacto(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="WhatsApp">
              <input placeholder="+52 55 0000 0000" value={contacto.whatsapp} onChange={e => setContacto(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input placeholder="Calle y número" value={contacto.direccion} onChange={e => setContacto(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Ciudad">
              <input placeholder="Ciudad de México" value={contacto.ciudad} onChange={e => setContacto(p => ({ ...p, ciudad: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="País">
              <select value={contacto.pais} onChange={e => setContacto(p => ({ ...p, pais: e.target.value }))} style={inputStyle}>
                {['México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'España'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'pagos' && (
          <Card title="Métodos de pago aceptados">
            <Toggle label="Efectivo" desc="Acepta pagos en efectivo en tu punto de venta" value={pagos.efectivo} onChange={v => setPagos(p => ({ ...p, efectivo: v }))} />
            <Toggle label="Transferencia bancaria" desc="SPEI, depósito o transferencia directa" value={pagos.transferencia} onChange={v => setPagos(p => ({ ...p, transferencia: v }))} />
            <Toggle label="Tarjeta de crédito / débito" desc="Requiere terminal bancaria o lector conectado" value={pagos.tarjeta} onChange={v => setPagos(p => ({ ...p, tarjeta: v }))} />
            <Toggle label="Mercado Pago" desc="Link de pago o QR — requiere cuenta activa" value={pagos.mercadopago} onChange={v => setPagos(p => ({ ...p, mercadopago: v }))} />
          </Card>
        )}

        {section === 'notificaciones' && (
          <Card title="Notificaciones">
            <Toggle label="Alerta de stock bajo" desc="Notificación cuando un producto tiene 3 unidades o menos" value={notif.stock_bajo} onChange={v => setNotif(p => ({ ...p, stock_bajo: v }))} />
            <Toggle label="Nueva venta" desc="Notificación al registrar un pedido nuevo" value={notif.nueva_venta} onChange={v => setNotif(p => ({ ...p, nueva_venta: v }))} />
            <Toggle label="Resumen diario por email" desc="Recibe un resumen de ventas cada día al cierre" value={notif.email_resumen} onChange={v => setNotif(p => ({ ...p, email_resumen: v }))} />
          </Card>
        )}

        {section === 'solicitudes' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Solicitudes de proveedores</h2>
              <button onClick={fetchSolicitudes} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                ↻ Actualizar
              </button>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['todas', 'pendiente', 'aprobado', 'rechazado'] as const).map(f => (
                <button key={f} onClick={() => setFiltroEstado(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: filtroEstado === f ? '#252855' : '#f3f4f6',
                    color: filtroEstado === f ? '#fff' : '#374151',
                  }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'todas' && (
                    <span style={{ marginLeft: 6, background: filtroEstado === f ? '#ffffff30' : '#e5e7eb', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                      {solicitudes.filter(s => s.estado === f).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loadingSolicitudes ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Cargando solicitudes...</p>
            ) : (() => {
              const lista = filtroEstado === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado)
              if (lista.length === 0) return (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>No hay solicitudes {filtroEstado !== 'todas' ? `con estado "${filtroEstado}"` : ''}</p>
                </div>
              )
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lista.map(s => {
                    const isExpanded = expandedId === s.id
                    const estadoColor = { pendiente: { bg: '#fef3c7', color: '#92400e' }, aprobado: { bg: '#dcfce7', color: '#166534' }, rechazado: { bg: '#fee2e2', color: '#991b1b' } }[s.estado]
                    return (
                      <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Fila principal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? '#f9fafb' : '#fff' }}
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                          {s.imagen_url ? (
                            <img src={s.imagen_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.producto_nombre}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: estadoColor.bg, color: estadoColor.color, flexShrink: 0 }}>
                                {s.estado.toUpperCase()}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                              SKU: {s.producto_sku} · ${s.producto_precio.toLocaleString('es-MX')}
                              {s.categorias?.nombre && ` · ${s.categorias.nombre}`}
                              {' · '}<strong>{s.proveedor_nombre}</strong>
                              {s.proveedor_empresa && ` (${s.proveedor_empresa})`}
                            </p>
                          </div>
                          <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{new Date(s.created_at).toLocaleDateString('es-MX')}</span>
                          <span style={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {/* Detalle expandible */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', background: '#fafafa' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 8px' }}>Proveedor</p>
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>{s.proveedor_nombre}</strong></p>
                                {s.proveedor_empresa && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>{s.proveedor_empresa}</p>}
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>📧 {s.proveedor_email}</p>
                                {s.proveedor_telefono && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>📞 {s.proveedor_telefono}</p>}
                              </div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 8px' }}>Producto</p>
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>{s.producto_nombre}</strong></p>
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>SKU: {s.producto_sku}</p>
                                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>Precio: ${s.producto_precio.toLocaleString('es-MX')} · Stock: {s.producto_stock}</p>
                                {s.producto_descripcion && <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{s.producto_descripcion}</p>}
                              </div>
                            </div>

                            {/* Acciones */}
                            {s.estado === 'pendiente' && (
                              <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => cambiarEstado(s.id, 'aprobado')} disabled={updatingId === s.id}
                                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: updatingId === s.id ? 0.6 : 1 }}>
                                  {updatingId === s.id ? '...' : '✓ Aprobar'}
                                </button>
                                <button onClick={() => cambiarEstado(s.id, 'rechazado')} disabled={updatingId === s.id}
                                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: updatingId === s.id ? 0.6 : 1 }}>
                                  ✕ Rechazar
                                </button>
                              </div>
                            )}
                            {s.estado !== 'pendiente' && (
                              <div style={{ paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => cambiarEstado(s.id, 'pendiente')} disabled={updatingId === s.id}
                                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                  Volver a pendiente
                                </button>
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
        )}

        {section === 'usuarios' && (
          <Card title="Usuarios y roles">
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              Para crear un usuario nuevo ve a <strong>Supabase → Authentication → Users → Add user</strong>, luego agrega su UUID en la tabla <code>user_roles</code> con el rol correspondiente.
            </p>
            {loadingUsuarios ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Cargando...</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Nombre', 'Rol actual', 'Cambiar rol', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>
                        {u.nombre}
                        {u.user_id === user?.id && <span style={{ fontSize: 10, marginLeft: 6, background: '#eff6ff', color: '#0049ff', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Tú</span>}
                      </td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: ROLE_BADGE[u.role]?.bg, color: ROLE_BADGE[u.role]?.color }}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0' }}>
                        {editingRole?.id === u.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select value={editingRole.role} onChange={e => setEditingRole({ ...editingRole, role: e.target.value })}
                              style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }}>
                              {['admin', 'vendedor', 'bodega'].map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                            </select>
                            <button onClick={saveRole} disabled={savingRole}
                              style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              {savingRole ? '...' : 'OK'}
                            </button>
                            <button onClick={() => setEditingRole(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>×</button>
                          </div>
                        ) : (
                          u.user_id !== user?.id && (
                            <button onClick={() => setEditingRole({ id: u.id, role: u.role })}
                              style={{ background: 'none', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#374151' }}>
                              Editar
                            </button>
                          )
                        )}
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>
                        {u.user_id !== user?.id && (
                          <button onClick={() => deleteUser(u)}
                            style={{ background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>
                            Quitar acceso
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {section !== 'usuarios' && section !== 'solicitudes' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={handleSave} style={{ background: saved ? '#059669' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 20 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: value ? '#0049ff' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box',
}
