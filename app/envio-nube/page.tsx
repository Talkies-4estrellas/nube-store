'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/Icon'
import { fetchPaquetesPorVentaItems } from '@/lib/paquetes'

const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'Redpack', 'J&T Express', 'Paquetexpress']

const TRACKING_URL: Record<string, (guia: string) => string> = {
  'DHL':          g => `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${g}`,
  'FedEx':        g => `https://www.fedex.com/apps/fedextrack/?trknbr=${g}`,
  'Estafeta':     g => `https://rastreo.estafeta.com/Index.aspx?internationalAirGuide=${g}`,
  'Redpack':      g => `https://www.redpack.com.mx/es/rastreo/?guias=${g}`,
  'J&T Express':  g => `https://www.jtexpress.mx/trajectoryQuery?expressList=${g}`,
  'Paquetexpress':g => `https://www.paquetexpress.com.mx/rastreo/?guide=${g}`,
}

const estadoStyle: Record<string, { bg: string; text: string }> = {
  'Pendiente':    { bg: '#fef3c7', text: '#92400e' },
  'En tránsito': { bg: '#dbeafe', text: '#1e40af' },
  'Entregado':   { bg: '#d1fae5', text: '#065f46' },
  'Cancelado':   { bg: '#fee2e2', text: '#991b1b' },
}

const estadosSig: Record<string, string[]> = {
  'Pendiente':    ['En tránsito', 'Cancelado'],
  'En tránsito': ['Entregado', 'Cancelado'],
  'Entregado':   [],
  'Cancelado':   [],
}

type Envio = {
  id: string
  venta_id: string
  paqueteria: string
  numero_guia: string | null
  estado_envio: string
  costo_envio: number | null
  created_at: string
  ventas: { numero: number; total: number; clientes: { nombre: string } | null } | null
}

type VentaPagada = {
  id: string
  numero: number
  total: number
  created_at: string
  clientes: { nombre: string } | null
}

type PaqueteFila = {
  itemId: string
  productoNombre: string
  productoSku: string
  proveedorNombre: string
  proveedorEmail: string
  ventaNumero: number
  ventaFecha: string
  cantidad: number
  altoCm: number | null
  anchoCm: number | null
  pesoKg: number | null
  actualizado: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EnvioNubePage() {
  const [tab, setTab] = useState<'pendientes' | 'activos' | 'paquetes'>('pendientes')
  const [envios, setEnvios] = useState<Envio[]>([])
  const [ventasPagadas, setVentasPagadas] = useState<VentaPagada[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)

  // Tab: Paquetes por proveedor
  const [paquetes, setPaquetes] = useState<PaqueteFila[]>([])
  const [loadingPaquetes, setLoadingPaquetes] = useState(false)
  const [proveedorFiltroPaquetes, setProveedorFiltroPaquetes] = useState('')

  async function fetchPaquetes() {
    setLoadingPaquetes(true)
    const { data: aprobadas } = await supabase
      .from('solicitudes_productos').select('producto_sku, proveedor_email, proveedor_nombre, proveedor_empresa')
      .eq('estado', 'aprobado')
    const proveedorPorSku = new Map(
      (aprobadas ?? []).map(s => [s.producto_sku, { email: s.proveedor_email, nombre: s.proveedor_empresa || s.proveedor_nombre }])
    )
    const skus = [...proveedorPorSku.keys()]
    if (skus.length === 0) { setPaquetes([]); setLoadingPaquetes(false); return }

    const { data: productos } = await supabase.from('productos').select('id, nombre, sku').in('sku', skus)
    const productoPorId = new Map((productos ?? []).map(p => [p.id, p]))
    const productoIds = (productos ?? []).map(p => p.id)
    if (productoIds.length === 0) { setPaquetes([]); setLoadingPaquetes(false); return }

    const { data: items } = await supabase
      .from('venta_items').select('id, venta_id, producto_id, cantidad').in('producto_id', productoIds)
    if (!items || items.length === 0) { setPaquetes([]); setLoadingPaquetes(false); return }

    const ventaIds = [...new Set(items.map(i => i.venta_id))]
    const [{ data: ventas }, paquetesPorItem] = await Promise.all([
      supabase.from('ventas').select('id, numero, created_at').in('id', ventaIds),
      fetchPaquetesPorVentaItems(items.map(i => i.id)),
    ])
    const ventaPorId = new Map((ventas ?? []).map(v => [v.id, v]))

    const filas: PaqueteFila[] = items
      .map(item => {
        const producto = productoPorId.get(item.producto_id)
        const venta = ventaPorId.get(item.venta_id)
        const proveedor = producto ? proveedorPorSku.get(producto.sku) : null
        const paquete = paquetesPorItem.get(item.id)
        if (!producto || !venta || !proveedor) return null
        return {
          itemId: item.id,
          productoNombre: producto.nombre,
          productoSku: producto.sku,
          proveedorNombre: proveedor.nombre,
          proveedorEmail: proveedor.email,
          ventaNumero: venta.numero,
          ventaFecha: venta.created_at,
          cantidad: item.cantidad,
          altoCm: paquete?.alto_cm ?? null,
          anchoCm: paquete?.ancho_cm ?? null,
          pesoKg: paquete?.peso_kg ?? null,
          actualizado: paquete?.updated_at ?? null,
        }
      })
      .filter((f): f is PaqueteFila => f !== null)
      .sort((a, b) => new Date(b.ventaFecha).getTime() - new Date(a.ventaFecha).getTime())

    setPaquetes(filas)
    setLoadingPaquetes(false)
  }

  // Modal nuevo envío
  const [modalVenta, setModalVenta] = useState<VentaPagada | null>(null)
  const [form, setForm] = useState({ paqueteria: 'DHL', numero_guia: '', costo_envio: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function fetchData() {
    setLoading(true)
    const [{ data: env }, { data: ventas }] = await Promise.all([
      supabase
        .from('envios')
        .select('*, ventas(numero, total, clientes(nombre))')
        .order('created_at', { ascending: false }),
      supabase
        .from('ventas')
        .select('id, numero, total, created_at, clientes(nombre)')
        .eq('estado', 'Pagado')
        .order('created_at', { ascending: false }),
    ])
    const enviados = new Set((env ?? []).map((e: Envio) => e.venta_id))
    setEnvios((env ?? []) as unknown as Envio[])
    setVentasPagadas(((ventas ?? []) as unknown as VentaPagada[]).filter(v => !enviados.has(v.id)))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (tab === 'paquetes' && paquetes.length === 0) fetchPaquetes() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const proveedoresPaquetes = [...new Set(paquetes.map(p => p.proveedorNombre))].sort()
  const paquetesFiltrados = proveedorFiltroPaquetes
    ? paquetes.filter(p => p.proveedorNombre === proveedorFiltroPaquetes)
    : paquetes

  async function crearEnvio() {
    if (!modalVenta) return
    if (!form.numero_guia.trim()) { setFormError('El número de guía es obligatorio'); return }
    setSaving(true)
    setFormError('')
    const { error } = await supabase.from('envios').insert({
      venta_id: modalVenta.id,
      paqueteria: form.paqueteria,
      numero_guia: form.numero_guia.trim(),
      costo_envio: form.costo_envio ? Number(form.costo_envio) : null,
      estado_envio: 'Pendiente',
    })
    setSaving(false)
    if (error) { setFormError('Error: ' + error.message); return }
    setModalVenta(null)
    setForm({ paqueteria: 'DHL', numero_guia: '', costo_envio: '' })
    fetchData()
  }

  async function actualizarEstado(envio: Envio, nuevoEstado: string) {
    setActualizando(envio.id)
    await supabase.from('envios').update({ estado_envio: nuevoEstado }).eq('id', envio.id)
    setActualizando(null)
    fetchData()
  }

  const pendientesCount = ventasPagadas.length
  const activosCount = envios.filter(e => e.estado_envio !== 'Entregado' && e.estado_envio !== 'Cancelado').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Envíos</h1>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
          {([['pendientes', `Por enviar (${pendientesCount})`], ['activos', `Envíos (${envios.length})`], ['paquetes', 'Paquetes por proveedor']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#111' : '#6b7280', boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Por enviar', value: pendientesCount, color: '#d97706' },
          { label: 'En tránsito', value: activosCount, color: '#0049ff' },
          { label: 'Entregados', value: envios.filter(e => e.estado_envio === 'Entregado').length, color: '#059669' },
          { label: 'Total envíos', value: envios.length, color: '#6b7280' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{loading ? '—' : m.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tab: Por enviar */}
      {tab === 'pendientes' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Icon name="truck" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>Cargando...</p>
            </div>
          ) : ventasPagadas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Icon name="check" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Todo al día</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No hay ventas pagadas pendientes de envío</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['#', 'Cliente', 'Fecha', 'Total', 'Acción'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '14px 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventasPagadas.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{v.numero}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#111' }}>{v.clientes?.nombre ?? '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#9ca3af' }}>{formatDate(v.created_at)}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#111' }}>${Number(v.total).toLocaleString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <button onClick={() => { setModalVenta(v); setFormError('') }}
                        style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="truck" size={13} color="#fff" /> Asignar envío
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Envíos activos */}
      {tab === 'activos' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 14 }}>Cargando...</p>
            </div>
          ) : envios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Icon name="box" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>Aún no hay envíos registrados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Venta', 'Cliente', 'Paquetería', 'Guía', 'Costo', 'Estado', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '14px 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envios.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{e.ventas?.numero}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#111', fontWeight: 600 }}>{e.ventas?.clientes?.nombre ?? '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{e.paqueteria}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {e.numero_guia
                        ? TRACKING_URL[e.paqueteria]
                          ? <a href={TRACKING_URL[e.paqueteria](e.numero_guia)} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, color: '#0049ff', fontFamily: 'monospace', fontWeight: 600, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {e.numero_guia} ↗
                            </a>
                          : <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{e.numero_guia}</span>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{e.costo_envio ? `$${Number(e.costo_envio).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: estadoStyle[e.estado_envio]?.bg, color: estadoStyle[e.estado_envio]?.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {e.estado_envio}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {estadosSig[e.estado_envio]?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {estadosSig[e.estado_envio].map(sig => (
                            <button key={sig} onClick={() => actualizarEstado(e, sig)}
                              disabled={actualizando === e.id}
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: sig === 'Cancelado' ? '#fee2e2' : '#eff6ff', color: sig === 'Cancelado' ? '#dc2626' : '#0049ff' }}>
                              {actualizando === e.id ? '...' : `→ ${sig}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Paquetes por proveedor */}
      {tab === 'paquetes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <select value={proveedorFiltroPaquetes} onChange={e => setProveedorFiltroPaquetes(e.target.value)}
              style={{ padding: '9px 14px', border: `1px solid ${proveedorFiltroPaquetes ? '#252855' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', color: proveedorFiltroPaquetes ? '#252855' : '#374151', cursor: 'pointer', minWidth: 220, fontWeight: proveedorFiltroPaquetes ? 700 : 400 }}>
              <option value="">📦 Todos los proveedores</option>
              {proveedoresPaquetes.map(p => <option key={p} value={p}>📦 {p}</option>)}
            </select>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {loadingPaquetes ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                <p style={{ fontSize: 14 }}>Cargando...</p>
              </div>
            ) : paquetesFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                <Icon name="box" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>No hay productos de proveedores vendidos todavía</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Producto', 'Proveedor', 'Pedido', 'Alto', 'Ancho', 'Peso', 'Actualizado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '14px 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paquetesFiltrados.map(p => {
                    const registrado = p.altoCm != null || p.anchoCm != null || p.pesoKg != null
                    return (
                      <tr key={p.itemId} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111' }}>{p.productoNombre} <span style={{ color: '#9ca3af', fontWeight: 400 }}>×{p.cantidad}</span></p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.productoSku}</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>📦 {p.proveedorNombre}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{p.ventaNumero}</td>
                        {registrado ? (
                          <>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{p.altoCm != null ? `${p.altoCm} cm` : '—'}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{p.anchoCm != null ? `${p.anchoCm} cm` : '—'}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{p.pesoKg != null ? `${p.pesoKg} kg` : '—'}</td>
                            <td style={{ padding: '14px 20px', fontSize: 12, color: '#9ca3af' }}>{p.actualizado ? formatDate(p.actualizado) : '—'}</td>
                          </>
                        ) : (
                          <td colSpan={4} style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>⚠️ El proveedor todavía no registró el paquete</span>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal nuevo envío */}
      {modalVenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModalVenta(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Asignar envío</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Venta #{modalVenta.numero} — {modalVenta.clientes?.nombre}</p>
              </div>
              <button onClick={() => setModalVenta(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Paquetería</label>
                <select value={form.paqueteria} onChange={e => setForm(f => ({ ...f, paqueteria: e.target.value }))} style={inp}>
                  {PAQUETERIAS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Número de guía *</label>
                <input value={form.numero_guia} onChange={e => setForm(f => ({ ...f, numero_guia: e.target.value }))}
                  placeholder="Ej. 1234567890" style={inp} />
              </div>
              <div>
                <label style={lbl}>Costo de envío (opcional)</label>
                <input type="number" min={0} value={form.costo_envio}
                  onChange={e => setForm(f => ({ ...f, costo_envio: e.target.value }))}
                  placeholder="$0" style={inp} />
              </div>

              {formError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={() => setModalVenta(null)}
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={crearEnvio} disabled={saving}
                  style={{ background: saving ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {saving ? 'Guardando...' : 'Registrar envío'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }
