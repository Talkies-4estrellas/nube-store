'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, ROLE_HOME } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'
import { supabase } from '@/lib/supabase'
import { convertToWebp, uploadToSupabase } from '@/lib/uploadWebp'
import ChatPanel from '@/components/ChatPanel'
import { resolverProveedorDeVentaItem, obtenerOcrearConversacionProveedor, obtenerOcrearConversacionAdmin, type Conversacion } from '@/lib/mensajeria'

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

const PASOS_RASTREO = [
  { key: 'Pendiente',   label: 'Pedido recibido', icon: '🧾' },
  { key: 'En tránsito', label: 'En camino',        icon: '🚚' },
  { key: 'Entregado',   label: 'Entregado',        icon: '📦' },
] as const

function pasoActual(estado: string) {
  if (estado === 'En camino') return 1
  const idx = PASOS_RASTREO.findIndex(p => p.key === estado)
  return idx === -1 ? 0 : idx
}

// Mapa de rastreo — vista de prueba con mapa real (OpenStreetMap, sin
// API key). El origen/destino son coordenadas de ejemplo (CDMX); el
// marcador se mueve entre ambos puntos según el progreso del envío —
// todavía no está conectado al GPS real del transportista.
// Origen: centro de Maravatío, Michoacán (sede de Order Express)
const MAPA_ORIGEN = { lat: 19.8926, lon: -100.4433 }
const MAPA_DESTINO = { lat: 19.9200, lon: -100.4100 }

function MapaRastreo({ progreso }: { progreso: number }) {
  const lat = MAPA_ORIGEN.lat + (MAPA_DESTINO.lat - MAPA_ORIGEN.lat) * progreso
  const lon = MAPA_ORIGEN.lon + (MAPA_DESTINO.lon - MAPA_ORIGEN.lon) * progreso
  const pad = 0.02
  const minLat = Math.min(MAPA_ORIGEN.lat, MAPA_DESTINO.lat) - pad
  const maxLat = Math.max(MAPA_ORIGEN.lat, MAPA_DESTINO.lat) + pad
  const minLon = Math.min(MAPA_ORIGEN.lon, MAPA_DESTINO.lon) - pad
  const maxLon = Math.max(MAPA_ORIGEN.lon, MAPA_DESTINO.lon) + pad
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`

  return (
    <div style={{ marginTop: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid #bfdbfe' }}>
      <iframe
        title="Mapa de rastreo"
        src={src}
        style={{ width: '100%', height: 220, border: 'none', display: 'block' }}
        loading="lazy"
      />
      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, padding: '6px 10px', background: '#fff', borderTop: '1px solid #eef2ff' }}>
        Vista de prueba (OpenStreetMap) — la ubicación es de ejemplo, todavía no está conectada al GPS real del transportista.
      </p>
    </div>
  )
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
type VentaItem = { id: string; producto_id: string | null; nombre: string; precio: number; cantidad: number; subtotal: number }
type Envio = { id: string; paqueteria: string; numero_guia: string | null; estado_envio: string; fecha_envio: string | null; fecha_entrega: string | null }
type Venta = { id: string; numero: number; estado: string; total: number; notas: string | null; created_at: string; items: VentaItem[]; envio: Envio | null }

export default function MiCuentaPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [tab, setTab] = useState<'pedidos' | 'datos' | 'mensajes' | 'perfil'>('pedidos')
  const [cargando, setCargando] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventaAbierta, setVentaAbierta] = useState<string | null>(null)

  const [form, setForm] = useState({ telefono: '', direccion: '', ciudad: '', codigo_postal: '', estado_region: '', pais: 'México' })
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  // Configuración de perfil (foto + nombre + contraseña)
  const [perfilNombre, setPerfilNombre] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [perfilGuardado, setPerfilGuardado] = useState(false)
  const [perfilError, setPerfilError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Mensajería (con proveedores por producto/pedido, y un hilo con soporte)
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [cargandoConv, setCargandoConv] = useState(false)
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null)
  const [contactando, setContactando] = useState<string | null>(null)
  const [soporteAbierto, setSoporteAbierto] = useState(false)

  const conversacionesProveedor = conversaciones.filter(c => c.tipo === 'cliente_proveedor')
  const conversacionSoporte = conversaciones.find(c => c.tipo === 'cliente_admin') ?? null

  useEffect(() => {
    if (user) { setPerfilNombre(user.nombre); setAvatarPreview(user.avatar_url) }
  }, [user])

  async function cargarConversaciones() {
    if (!user?.email) return
    setCargandoConv(true)
    const { data } = await supabase.from('conversaciones').select('*').eq('cliente_email', user.email).order('updated_at', { ascending: false })
    setConversaciones(data ?? [])
    setCargandoConv(false)
  }

  useEffect(() => {
    if (tab === 'mensajes' || tab === 'perfil') cargarConversaciones()
  }, [tab, user?.email])

  async function contactarProveedor(item: VentaItem, ventaId: string) {
    if (!user?.email || !item.producto_id) return
    setContactando(item.id)
    const proveedor = await resolverProveedorDeVentaItem(supabase, item.id)
    if (!proveedor) {
      setContactando(null)
      alert('No se pudo identificar al proveedor de este producto.')
      return
    }
    const convId = await obtenerOcrearConversacionProveedor(supabase, {
      clienteEmail: user.email, clienteNombre: user.nombre,
      proveedorEmail: proveedor.email, ventaId, ventaItemId: item.id, productoNombre: item.nombre,
    })
    setContactando(null)
    if (!convId) { alert('No se pudo iniciar la conversación.'); return }
    setTab('mensajes')
    await cargarConversaciones()
    setConversacionActiva(convId)
  }

  async function contactarSoporte() {
    if (!user?.email) return
    if (!conversacionSoporte) {
      const convId = await obtenerOcrearConversacionAdmin(supabase, { clienteEmail: user.email, clienteNombre: user.nombre })
      if (!convId) return
      await cargarConversaciones()
    }
    setSoporteAbierto(true)
  }

  function elegirAvatar(file: File | null) {
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function guardarPerfil() {
    setPerfilError('')
    if (!perfilNombre.trim()) { setPerfilError('El nombre no puede quedar vacío'); return }
    if (passwordNueva && passwordNueva.length < 6) { setPerfilError('La contraseña debe tener al menos 6 caracteres'); return }
    if (passwordNueva && passwordNueva !== passwordConfirmar) { setPerfilError('Las contraseñas no coinciden'); return }
    if (!user) return

    setGuardandoPerfil(true)

    let avatarUrl: string | null = null
    if (avatarFile) {
      try {
        const webp = await convertToWebp(avatarFile)
        avatarUrl = await uploadToSupabase(webp, supabase, 'productos', `avatars/${user.id}.webp`)
      } catch (e) {
        setGuardandoPerfil(false)
        setPerfilError('No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido'))
        return
      }
    }

    const { error: errNombre } = await supabase.rpc('actualizar_mi_perfil', {
      nuevo_nombre: perfilNombre.trim(),
      ...(avatarUrl ? { nuevo_avatar_url: avatarUrl } : {}),
    })
    if (errNombre) {
      setGuardandoPerfil(false)
      setPerfilError('No se pudo guardar el nombre: ' + errNombre.message)
      return
    }

    if (passwordNueva) {
      const { error: errPass } = await supabase.auth.updateUser({ password: passwordNueva })
      if (errPass) {
        setGuardandoPerfil(false)
        setPerfilError('El nombre se guardó, pero la contraseña no: ' + errPass.message)
        return
      }
    }

    setGuardandoPerfil(false)
    setAvatarFile(null)
    setPasswordNueva('')
    setPasswordConfirmar('')
    setPerfilGuardado(true)
    setTimeout(() => setPerfilGuardado(false), 2500)
    // El nombre en la sesión (sidebar, etc.) se recarga desde user_roles al refrescar
    setTimeout(() => window.location.reload(), 900)
  }

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
            supabase.from('venta_items').select('id, venta_id, producto_id, nombre, precio, cantidad, subtotal').in('venta_id', ids),
            supabase.from('envios').select('id, venta_id, paqueteria, numero_guia, estado_envio, fecha_envio, fecha_entrega').in('venta_id', ids),
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

  const navItem = (id: 'pedidos' | 'datos' | 'mensajes' | 'perfil', label: string, emoji: string) => {
    const active = tab === id
    return (
      <button onClick={() => setTab(id)} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', width: '100%',
        color: NAVY, fontSize: 14, fontWeight: active ? 800 : 700, borderRadius: 999,
        background: active ? '#fff' : 'transparent', cursor: 'pointer',
        border: active ? `2px solid ${NAVY}` : '2px solid transparent',
        boxShadow: active ? '0 6px 16px rgba(37,40,85,0.12)' : 'none',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ flex: 1 }}>{label}</span>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Overlay mobile — mismo patrón que proveedores */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} />
      )}

      {/* ---- Sidebar (mismo patrón que proveedores) ---- */}
      <aside className={`prov-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 240, maxWidth: 280, height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        zIndex: 100, padding: '16px 12px 16px', transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', marginBottom: 16 }}>
          <Link href="/" title="Ver tienda" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 44, width: 'auto' }} />
          </Link>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', flexShrink: 0 }}>
              ×
            </button>
          )}
        </div>

        <nav style={{ flex: 1, minHeight: 0, background: '#f1f2f6', borderRadius: 22, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '12px 14px 6px', display: 'block' }}>CUENTA</span>
          {navItem('pedidos', 'Mis pedidos', '📦')}
          {navItem('datos', 'Datos de facturación', '🧾')}
          {navItem('mensajes', 'Mensajes', '💬')}
          {navItem('perfil', 'Configuración', '⚙️')}
        </nav>

        <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
            <div style={{ width: 34, height: 34, background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre}</p>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#374151', padding: '1px 7px', borderRadius: 20 }}>Cliente</span>
            </div>
          </div>
          <button type="button" onClick={signOut}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: 'none', borderRadius: 999, background: 'rgba(231,34,109,0.10)', color: PINK, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---- Área principal ---- */}
      <div className="prov-main" style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="prov-header" style={{ height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
          <button className="prov-hamburger" onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'none', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={sidebarOpen ? PINK : NAVY} strokeWidth="2.5" strokeLinecap="round">
              {sidebarOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
          {isMobile && (
            <img src="/storefront/monograma.svg" alt="OrderExpress"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', height: 32, width: 'auto' }} />
          )}
          <h1 className="prov-title" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.01em' }}>
            {tab === 'pedidos' ? 'Mis pedidos' : tab === 'datos' ? 'Datos de facturación' : tab === 'mensajes' ? 'Mensajes' : 'Configuración'}
          </h1>
        </header>

        <main style={{ flex: 1, padding: isMobile ? '16px' : '32px 32px 60px' }}>

        {tab === 'pedidos' && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', overflow: 'hidden' }}>
            {cargando ? (
              <p style={{ padding: 24, fontSize: 13, color: '#9ca3af' }}>Cargando tus pedidos...</p>
            ) : !cliente ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🛍️</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Todavía no tienes compras</p>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Cuando hagas tu primer pedido en la tienda usando <strong>{user.email}</strong>, va a aparecer aquí.</p>
                <a href="/" style={{ display: 'inline-block', background: NAVY, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ir a comprar</a>
              </div>
            ) : ventas.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🛍️</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Todavía no tienes pedidos</p>
                <a href="/" style={{ display: 'inline-block', marginTop: 12, background: NAVY, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ir a comprar</a>
              </div>
            ) : (
              ventas.map((v, i) => {
                const abierta = ventaAbierta === v.id
                return (
                  <div key={v.id} style={{ borderBottom: i < ventas.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <button onClick={() => setVentaAbierta(abierta ? null : v.id)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>Pedido #{v.numero}</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{new Date(v.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      {badge(v.estado, ESTADO_VENTA_STYLE)}
                      <span style={{ fontSize: 14, fontWeight: 800, color: BLUE, minWidth: 80, textAlign: 'right' }}>{formatPrice(v.total)}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', transform: abierta ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </button>

                    {abierta && (
                      <div style={{ padding: '0 24px 20px' }}>
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: v.envio ? 10 : 0 }}>
                          {v.items.map(it => (
                            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#374151', padding: '3px 0', gap: 8 }}>
                              <span style={{ flex: 1 }}>{it.nombre} ×{it.cantidad}</span>
                              {it.producto_id && (
                                <button type="button" onClick={() => contactarProveedor(it, v.id)} disabled={contactando === it.id}
                                  style={{ background: 'none', border: 'none', color: BLUE, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}>
                                  {contactando === it.id ? 'Buscando proveedor...' : '💬 Contactar al proveedor'}
                                </button>
                              )}
                              <span style={{ fontWeight: 600 }}>{formatPrice(it.subtotal)}</span>
                            </div>
                          ))}
                          {v.notas && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>{v.notas}</p>}
                        </div>

                        {v.envio && (
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>📍 Seguimiento de envío</span>
                              {badge(v.envio.estado_envio, ESTADO_ENVIO_STYLE)}
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 12px' }}>
                              {v.envio.paqueteria}{v.envio.numero_guia ? ` · Guía ${v.envio.numero_guia}` : ' · Sin número de guía todavía'}
                            </p>

                            {v.envio.estado_envio === 'Cancelado' || v.envio.estado_envio === 'Devuelto' ? (
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', margin: 0 }}>
                                {v.envio.estado_envio === 'Cancelado' ? '❌ El envío fue cancelado.' : '↩️ El paquete fue devuelto.'}
                              </p>
                            ) : (
                              <div style={{ display: 'flex' }}>
                                {PASOS_RASTREO.map((paso, idx) => {
                                  const actual = pasoActual(v.envio!.estado_envio)
                                  const completado = idx <= actual
                                  const fecha = idx === 1 ? v.envio!.fecha_envio : idx === 2 ? v.envio!.fecha_entrega : v.created_at
                                  return (
                                    <div key={paso.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                                      {idx > 0 && (
                                        <div style={{ position: 'absolute', top: 15, left: '-50%', width: '100%', height: 2, background: idx <= actual ? BLUE : '#dbeafe', zIndex: 0 }} />
                                      )}
                                      <div style={{
                                        width: 30, height: 30, borderRadius: '50%', margin: '0 auto', position: 'relative', zIndex: 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                        background: completado ? BLUE : '#fff', border: `2px solid ${completado ? BLUE : '#bfdbfe'}`,
                                      }}>
                                        <span style={{ filter: completado ? 'grayscale(0)' : 'grayscale(1) opacity(0.6)' }}>{paso.icon}</span>
                                      </div>
                                      <p style={{ fontSize: 10, fontWeight: 700, color: completado ? NAVY : '#9ca3af', margin: '6px 0 0' }}>{paso.label}</p>
                                      {completado && fecha && (
                                        <p style={{ fontSize: 9, color: '#9ca3af', margin: '1px 0 0' }}>
                                          {new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {v.envio.estado_envio !== 'Cancelado' && v.envio.estado_envio !== 'Devuelto' && (
                              <MapaRastreo progreso={pasoActual(v.envio.estado_envio) / (PASOS_RASTREO.length - 1)} />
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
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', padding: '24px 28px', maxWidth: 620 }}>
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

        {tab === 'mensajes' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', overflow: 'hidden' }}>
              {cargandoConv ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Cargando conversaciones...</p>
              ) : conversacionesProveedor.length === 0 ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Todavía no tienes conversaciones con proveedores. Contacta a uno desde "Mis pedidos".</p>
              ) : (
                conversacionesProveedor.map(c => {
                  const activa = conversacionActiva === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => setConversacionActiva(c.id)}
                      style={{ width: '100%', display: 'block', padding: '12px 18px', background: activa ? '#f1f5ff' : 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.producto_nombre || 'Producto'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>Proveedor</p>
                    </button>
                  )
                })
              )}
            </div>

            {conversacionActiva ? (() => {
              const c = conversaciones.find(x => x.id === conversacionActiva)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c && (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>
                        {c.tipo === 'cliente_admin' ? 'Soporte Order Express' : 'Proveedor'}
                      </span>
                      {c.tipo === 'cliente_proveedor' && (
                        <>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>· sobre</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.producto_nombre || 'Producto'}</span>
                        </>
                      )}
                    </div>
                  )}
                  <ChatPanel supabase={supabase} conversacionId={conversacionActiva} remitenteTipo="cliente" remitenteEmail={user.email} remitenteNombre={user.nombre} accent={NAVY} />
                </div>
              )
            })() : (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Selecciona una conversación para verla.
              </div>
            )}
          </div>
        )}

        {tab === 'perfil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Perfil
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt={perfilNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (perfilNombre.charAt(0).toUpperCase() || '?')}
              </div>
              <div>
                <input ref={avatarInputRef} type="file" accept="image/*" hidden
                  onChange={e => elegirAvatar(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => avatarInputRef.current?.click()}
                  style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Cambiar foto
                </button>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>JPG o PNG</p>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nombre completo</label>
              <input style={inp} value={perfilNombre} onChange={e => setPerfilNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Email</label>
              <input style={{ ...inp, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} value={user.email} disabled readOnly />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Para cambiar tu email contacta al soporte.</p>
            </div>

            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Cambiar contraseña
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Nueva contraseña</label>
                <input type="password" style={inp} value={passwordNueva} onChange={e => setPasswordNueva(e.target.value)} placeholder="Dejar en blanco para no cambiarla" />
              </div>
              <div>
                <label style={lbl}>Confirmar</label>
                <input type="password" style={inp} value={passwordConfirmar} onChange={e => setPasswordConfirmar(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            {perfilError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                {perfilError}
              </div>
            )}

            <button onClick={guardarPerfil} disabled={guardandoPerfil}
              style={{ background: perfilGuardado ? '#059669' : NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {guardandoPerfil ? 'Guardando...' : perfilGuardado ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>

          {/* Soporte — hilo único con el administrador */}
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Soporte
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
              ¿Alguna duda o comentario para el equipo de Order Express? Escríbenos directo.
            </p>

            {!soporteAbierto ? (
              <button type="button" onClick={contactarSoporte}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', color: BLUE, border: 'none', padding: '11px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                🎧 {conversacionSoporte ? 'Ver conversación con soporte' : 'Contactar a soporte'}
              </button>
            ) : conversacionSoporte ? (
              <ChatPanel supabase={supabase} conversacionId={conversacionSoporte.id} remitenteTipo="cliente" remitenteEmail={user.email} remitenteNombre={user.nombre} accent={BLUE} />
            ) : (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando...</p>
            )}
          </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}
