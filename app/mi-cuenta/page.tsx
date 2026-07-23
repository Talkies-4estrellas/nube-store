'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, ROLE_HOME } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

const TRACKING_URL: Record<string, (guia: string) => string> = {
  'DHL':          g => `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${g}`,
  'FedEx':        g => `https://www.fedex.com/apps/fedextrack/?trknbr=${g}`,
  'Estafeta':     g => `https://rastreo.estafeta.com/Index.aspx?internationalAirGuide=${g}`,
  'Redpack':      g => `https://www.redpack.com.mx/es/rastreo/?guias=${g}`,
  'J&T Express':  g => `https://www.jtexpress.mx/trajectoryQuery?expressList=${g}`,
  'Paquetexpress':g => `https://www.paquetexpress.com.mx/rastreo/?guide=${g}`,
}

const ESTADO_VENTA_STYLE: Record<string, { bg: string; text: string }> = {
  'Pendiente':  { bg: '#fef3c7', text: '#92400e' },
  'En proceso': { bg: '#dbeafe', text: '#1e40af' },
  'Pagado':     { bg: '#d1fae5', text: '#065f46' },
  'Enviado':    { bg: '#e0e7ff', text: '#3730a3' },
  'Cancelado':  { bg: '#fee2e2', text: '#991b1b' },
}

const ESTADO_ENVIO_STYLE: Record<string, { bg: string; text: string }> = {
  'Pendiente':    { bg: '#fef3c7', text: '#92400e' },
  'En tránsito':  { bg: '#dbeafe', text: '#1e40af' },
  'En camino':    { bg: '#dbeafe', text: '#1e40af' },
  'Entregado':    { bg: '#d1fae5', text: '#065f46' },
  'Devuelto':     { bg: '#fee2e2', text: '#991b1b' },
  'Cancelado':    { bg: '#fee2e2', text: '#991b1b' },
}

function badge(label: string, map: Record<string, { bg: string; text: string }>) {
  const s = map[label] ?? { bg: '#f3f4f6', text: '#374151' }
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 5 }

const formatPrice = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

type Cliente = {
  id: string; nombre: string; email: string; telefono: string | null
  direccion: string | null; ciudad: string | null; codigo_postal: string | null
  estado_region: string | null; pais: string | null
}
type VentaItem = { id: string; nombre: string; precio: number; cantidad: number; subtotal: number }
type Envio = { id: string; paqueteria: string; numero_guia: string | null; estado_envio: string }
type Venta = { id: string; numero: number; estado: string; total: number; notas: string | null; created_at: string; items: VentaItem[]; envio: Envio | null }

export default function MiCuentaPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'pedidos' | 'datos'>('pedidos')
  const [cargando, setCargando] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventaAbierta, setVentaAbierta] = useState<string | null>(null)

  const [form, setForm] = useState({ telefono: '', direccion: '', ciudad: '', codigo_postal: '', estado_region: '', pais: 'México' })
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login?redirect=/mi-cuenta'); return }
    if (user.role !== 'basico' && user.role !== 'admin') router.replace(ROLE_HOME[user.role])
  }, [loading, user, router])

  useEffect(() => {
    if (!user?.email) return
    let cancelado = false

    async function cargar() {
      setCargando(true)
      const { data: cli } = await supabase.from('clientes').select('*').eq('email', user!.email).maybeSingle()
      if (cancelado) return

      if (cli) {
        setCliente(cli)
        setForm({
          telefono: cli.telefono ?? '', direccion: cli.direccion ?? '', ciudad: cli.ciudad ?? '',
          codigo_postal: cli.codigo_postal ?? '', estado_region: cli.estado_region ?? '', pais: cli.pais ?? 'México',
        })

        const { data: vts } = await supabase
          .from('ventas').select('id, numero, estado, total, notas, created_at')
          .eq('cliente_id', cli.id).order('created_at', { ascending: false })

        if (vts && vts.length > 0) {
          const ids = vts.map(v => v.id)
          const [{ data: items }, { data: envios }] = await Promise.all([
            supabase.from('venta_items').select('id, venta_id, nombre, precio, cantidad, subtotal').in('venta_id', ids),
            supabase.from('envios').select('id, venta_id, paqueteria, numero_guia, estado_envio').in('venta_id', ids),
          ])
          if (!cancelado) {
            setVentas(vts.map(v => ({
              ...v,
              items: (items ?? []).filter(it => it.venta_id === v.id),
              envio: (envios ?? []).find(e => e.venta_id === v.id) ?? null,
            })))
          }
        } else if (!cancelado) {
          setVentas([])
        }
      }
      if (!cancelado) setCargando(false)
    }
    cargar()
    return () => { cancelado = true }
  }, [user?.email])

  async function guardarDatos() {
    if (!user?.email) return
    setGuardando(true)
    const payload = { email: user.email, nombre: cliente?.nombre ?? user.nombre, ...form }
    const { data, error } = await supabase.from('clientes').upsert(payload, { onConflict: 'email' }).select().single()
    setGuardando(false)
    if (!error && data) { setCliente(data); setGuardado(true); setTimeout(() => setGuardado(false), 2500) }
  }

  if (loading || !user || (user.role !== 'basico' && user.role !== 'admin')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8' }}>
        <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 600 }}>Verificando sesión...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 20px 60px' }}>
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>

        {/* Perfil */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>{user.nombre}</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{user.email}</p>
          </div>
          <a href="/" style={{ background: '#f3f4f6', color: '#374151', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ir a la tienda</a>
          <button onClick={signOut} style={{ background: PINK, color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cerrar sesión</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab('pedidos')} style={{
            flex: 1, padding: '11px 0', borderRadius: 10, border: `2px solid ${tab === 'pedidos' ? NAVY : '#e5e7eb'}`,
            background: tab === 'pedidos' ? NAVY : '#fff', color: tab === 'pedidos' ? '#fff' : '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            📦 Mis pedidos {ventas.length > 0 && `(${ventas.length})`}
          </button>
          <button onClick={() => setTab('datos')} style={{
            flex: 1, padding: '11px 0', borderRadius: 10, border: `2px solid ${tab === 'datos' ? NAVY : '#e5e7eb'}`,
            background: tab === 'datos' ? NAVY : '#fff', color: tab === 'datos' ? '#fff' : '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🧾 Datos de facturación y envío
          </button>
        </div>

        {tab === 'pedidos' && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {cargando ? (
              <p style={{ padding: 24, fontSize: 13, color: '#9ca3af' }}>Cargando tus pedidos...</p>
            ) : !cliente ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🛍️</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Todavía no tienes compras</p>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Cuando hagas tu primer pedido en la tienda usando <strong>{user.email}</strong>, va a aparecer aquí.</p>
                <a href="/" style={{ display: 'inline-block', background: NAVY, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ir a comprar</a>
              </div>
            ) : ventas.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🛍️</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Todavía no tienes pedidos</p>
                <a href="/" style={{ display: 'inline-block', marginTop: 12, background: NAVY, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ir a comprar</a>
              </div>
            ) : (
              ventas.map(v => {
                const abierta = ventaAbierta === v.id
                const tracking = v.envio?.numero_guia && TRACKING_URL[v.envio.paqueteria]
                return (
                  <div key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <button onClick={() => setVentaAbierta(abierta ? null : v.id)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>Pedido #{v.numero}</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{new Date(v.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      {badge(v.estado, ESTADO_VENTA_STYLE)}
                      <span style={{ fontSize: 14, fontWeight: 800, color: BLUE, minWidth: 80, textAlign: 'right' }}>{formatPrice(v.total)}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', transform: abierta ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </button>

                    {abierta && (
                      <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: v.envio ? 10 : 0 }}>
                          {v.items.map(it => (
                            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '3px 0' }}>
                              <span>{it.nombre} ×{it.cantidad}</span>
                              <span style={{ fontWeight: 600 }}>{formatPrice(it.subtotal)}</span>
                            </div>
                          ))}
                          {v.notas && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>{v.notas}</p>}
                        </div>

                        {v.envio && (
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>📍 Seguimiento de envío</span>
                              {badge(v.envio.estado_envio, ESTADO_ENVIO_STYLE)}
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                              {v.envio.paqueteria}{v.envio.numero_guia ? ` · Guía ${v.envio.numero_guia}` : ' · Sin número de guía todavía'}
                            </p>
                            {tracking && (
                              <a href={TRACKING_URL[v.envio.paqueteria](v.envio.numero_guia!)} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>
                                Rastrear paquete ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'datos' && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Datos de facturación y envío
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '-10px 0 16px' }}>
              Se usan para agilizar tus próximas compras. Order Express no emite factura fiscal (CFDI) todavía — si la necesitas, contáctanos directamente.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Teléfono</label>
                <input style={inp} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="55 1234 5678" />
              </div>
              <div>
                <label style={lbl}>Ciudad</label>
                <input style={inp} value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Dirección</label>
              <input style={inp} value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Calle, número, colonia" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Código postal</label>
                <input style={inp} value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <input style={inp} value={form.estado_region} onChange={e => setForm(f => ({ ...f, estado_region: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>País</label>
                <input style={inp} value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
              </div>
            </div>
            <button onClick={guardarDatos} disabled={guardando}
              style={{ background: guardado ? '#059669' : NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : guardado ? '¡Guardado!' : 'Guardar datos'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
