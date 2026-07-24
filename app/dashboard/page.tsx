'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/Icon'
import { useSidebar } from '@/lib/sidebar-context'

type Venta = { id: string; numero: number; total: number; estado: string; created_at: string; clientes: { nombre: string } | null }
type VentaGrafica = { total: number; estado: string; created_at: string }
type ProductoBajo = { id: string; nombre: string; stock: number }
type Toast = { id: number; message: string; icon: string; color: string }
type TopMetric = { label: string; value: string; sub: string; icon: string; color: string }
type Solicitud = {
  id: string
  proveedor_nombre: string
  proveedor_email: string
  proveedor_empresa: string | null
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  producto_stock: number
  categoria_id: number | null
  imagen_url: string | null
  estado: string
  created_at: string
}

const statusColor: Record<string, string> = { Pagado: '#d1fae5', Enviado: '#dbeafe', Pendiente: '#fef3c7', Cancelado: '#fee2e2', 'En proceso': '#ede9fe' }
const statusText:  Record<string, string> = { Pagado: '#065f46', Enviado: '#1e40af', Pendiente: '#92400e', Cancelado: '#991b1b', 'En proceso': '#6d28d9' }

type Periodo = 'hoy' | 'semana' | 'mes'
const periodoLabel: Record<Periodo, string> = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

function getPeriodoStart(periodo: Periodo): string {
  const now = new Date()
  if (periodo === 'hoy') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else if (periodo === 'semana') {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0)
    return d.toISOString()
  } else {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
}

function buildChartData(ventas: VentaGrafica[], periodo: Periodo): { label: string; total: number }[] {
  const pagados = ventas.filter(v => v.estado === 'Pagado')
  if (periodo === 'hoy') {
    const slots = ['0-4h', '4-8h', '8-12h', '12-16h', '16-20h', '20-24h']
    const totals = [0, 0, 0, 0, 0, 0]
    pagados.forEach(v => {
      const h = new Date(v.created_at).getHours()
      totals[Math.floor(h / 4)] += Number(v.total)
    })
    return slots.map((label, i) => ({ label, total: totals[i] }))
  } else if (periodo === 'semana') {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const totals: number[] = [0, 0, 0, 0, 0, 0, 0]
    pagados.forEach(v => { totals[new Date(v.created_at).getDay()] += Number(v.total) })
    return days.map((label, i) => ({ label, total: totals[i] }))
  } else {
    const byWeek: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    pagados.forEach(v => {
      const d = new Date(v.created_at).getDate()
      const w = Math.ceil(d / 7)
      byWeek[w] = (byWeek[w] || 0) + Number(v.total)
    })
    return Object.entries(byWeek).map(([w, total]) => ({ label: `Sem ${w}`, total }))
  }
}

function GraficaBarras({ data }: { data: { label: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const W = 520, H = 140, pad = 32, barW = Math.floor((W - pad * 2) / data.length) - 6

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 28}`} style={{ overflow: 'visible' }}>
      {/* Líneas de guía */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pad} y1={H - H * f} x2={W - pad} y2={H - H * f}
          stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const x = pad + i * ((W - pad * 2) / data.length) + 3
        const barH = maxVal > 0 ? Math.max((d.total / maxVal) * H, d.total > 0 ? 4 : 0) : 0
        const isHover = hover === i
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <rect x={x} y={H - barH} width={barW} height={barH}
              rx={4} fill={isHover ? PINK : BLUE}
              style={{ transition: 'fill 0.15s' }} />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle"
              fill="#9ca3af" fontSize={10} fontFamily="inherit">{d.label}</text>
            {isHover && d.total > 0 && (
              <g>
                <rect x={x + barW / 2 - 36} y={H - barH - 28} width={72} height={22} rx={6} fill={NAVY} />
                <text x={x + barW / 2} y={H - barH - 13} textAnchor="middle"
                  fill="#fff" fontSize={11} fontWeight="700" fontFamily="inherit">
                  ${d.total.toLocaleString('es-MX')}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const { isMobile } = useSidebar()
  const [ventas, setVentas]             = useState<Venta[]>([])
  const [ventasPeriodo, setVentasPeriodo] = useState<VentaGrafica[]>([])
  const [stockBajo, setStockBajo]       = useState<ProductoBajo[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [totalProveedores, setTotalProveedores] = useState(0)
  const [totalSinStock, setTotalSinStock] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [periodo, setPeriodo]           = useState<Periodo>('semana')
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)
  const [toasts, setToasts]             = useState<Toast[]>([])
  const [topMetrics, setTopMetrics]     = useState<TopMetric[]>([])
  const [solicitudes, setSolicitudes]   = useState<Solicitud[]>([])
  const [procesando, setProcesando]     = useState<string | null>(null)
  const toastId = useRef(0)

  function addToast(message: string, icon: string, color: string) {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, icon, color }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-stock-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos' }, payload => {
        const newStock = payload.new.stock as number
        const oldStock = payload.old?.stock as number
        const nombre = payload.new.nombre as string
        if (newStock === 0 && oldStock > 0) addToast(`Sin stock: ${nombre}`, 'warning', '#dc2626')
        else if (newStock <= 3 && (oldStock === undefined || oldStock > 3)) addToast(`Stock bajo: ${nombre} (${newStock} restantes)`, 'warning', '#d97706')
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }, { count }, { data: items }, { data: clientesGasto }, { data: sols }, { count: countProveedores }, { count: countSinStock }] = await Promise.all([
        supabase.from('ventas').select('*, clientes(nombre)').order('created_at', { ascending: false }).limit(5),
        supabase.from('productos').select('id, nombre, stock').lte('stock', 3).order('stock').limit(50),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('venta_items').select('nombre, cantidad, productos(categorias(nombre))'),
        supabase.from('ventas').select('cliente_id, total, clientes(nombre)').eq('estado', 'Pagado'),
        supabase.from('solicitudes_productos').select('*').eq('estado', 'pendiente').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'proveedor'),
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('stock', 0),
      ])
      if (v) setVentas(v)
      if (p) setStockBajo(p)
      if (sols) setSolicitudes(sols)
      setTotalClientes(count ?? 0)
      setTotalProveedores(countProveedores ?? 0)
      setTotalSinStock(countSinStock ?? 0)

      // Calcular top metrics
      const tops: TopMetric[] = []

      // Producto más vendido
      if (items && items.length > 0) {
        const prodCount: Record<string, number> = {}
        items.forEach((i) => {
          prodCount[i.nombre] = (prodCount[i.nombre] ?? 0) + i.cantidad
        })
        const topProd = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0]
        if (topProd) tops.push({ label: 'Producto más vendido', value: topProd[0], sub: `${topProd[1]} unidades vendidas`, icon: '📦', color: '#7c3aed' })

        // Categoría más popular
        const catCount: Record<string, number> = {}
        items.forEach((i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prod = i.productos as unknown as { categorias: { nombre: string } | null } | null
          const cat = prod?.categorias?.nombre ?? 'Sin categoría'
          catCount[cat] = (catCount[cat] ?? 0) + (i.cantidad as number)
        })
        const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]
        if (topCat) tops.push({ label: 'Categoría top', value: topCat[0], sub: `${topCat[1]} unidades`, icon: '🏷️', color: '#0891b2' })
      }

      // Cliente más activo
      if (clientesGasto && clientesGasto.length > 0) {
        const clienteGasto: Record<string, { nombre: string; total: number }> = {}
        clientesGasto.forEach((v) => {
          if (!v.cliente_id) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nombre = (v.clientes as unknown as { nombre: string } | null)?.nombre ?? 'Desconocido'
          if (!clienteGasto[v.cliente_id]) clienteGasto[v.cliente_id] = { nombre, total: 0 }
          clienteGasto[v.cliente_id].total += Number(v.total)
        })
        const topCliente = Object.values(clienteGasto).sort((a, b) => b.total - a.total)[0]
        if (topCliente) tops.push({ label: 'Cliente más activo', value: topCliente.nombre, sub: `$${topCliente.total.toLocaleString('es-MX')} en compras`, icon: '👑', color: '#d97706' })
      }

      setTopMetrics(tops)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    async function loadPeriodo() {
      setLoadingPeriodo(true)
      const { data } = await supabase
        .from('ventas')
        .select('total, estado, created_at')
        .gte('created_at', getPeriodoStart(periodo))
      setVentasPeriodo(data ?? [])
      setLoadingPeriodo(false)
    }
    loadPeriodo()
  }, [periodo])

  async function cambiarEstado(id: string, estado: 'aprobado' | 'rechazado') {
    setProcesando(id)
    if (estado === 'aprobado') {
      const sol = solicitudes.find(s => s.id === id)
      if (sol) {
        await supabase.from('productos').insert({
          nombre: sol.producto_nombre,
          sku: sol.producto_sku,
          precio: sol.producto_precio,
          stock: sol.producto_stock,
          imagen_url: sol.imagen_url,
          categoria_id: sol.categoria_id,
          activo: true,
          origen: 'proveedor',
          proveedor_nombre: sol.proveedor_empresa || sol.proveedor_nombre,
        })
      }
    }
    await supabase.from('solicitudes_productos').update({ estado }).eq('id', id)
    setSolicitudes(prev => prev.filter(s => s.id !== id))
    addToast(
      estado === 'aprobado' ? 'Producto aprobado y publicado en el catálogo' : 'Solicitud rechazada',
      estado === 'aprobado' ? 'check' : 'warning',
      estado === 'aprobado' ? '#059669' : '#dc2626',
    )
    setProcesando(null)
  }

  const totalPeriodo = ventasPeriodo.filter(v => v.estado === 'Pagado').reduce((s, v) => s + Number(v.total), 0)
  const pendientes   = ventas.filter(v => v.estado === 'Pendiente').length
  const chartData    = buildChartData(ventasPeriodo, periodo)
  const hayDatosGrafica = chartData.some(d => d.total > 0)

  const metrics = [
    { label: `Ventas (${periodoLabel[periodo].toLowerCase()})`, value: loadingPeriodo ? '...' : `$${totalPeriodo.toLocaleString('es-MX')}`, icon: 'dollar', href: '/ventas', color: '#059669' },
    { label: 'Pedidos pendientes', value: pendientes, icon: 'clipboard', href: '/ventas', color: '#d97706' },
    { label: 'Clientes registrados', value: totalClientes, icon: 'users', href: '/clientes', color: BLUE },
    { label: 'Proveedores registrados', value: totalProveedores, icon: 'users', href: '/configuracion', color: '#7c3aed' },
    { label: 'Productos sin stock', value: totalSinStock, icon: 'warning', href: '/productos', color: '#dc2626' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#111', margin: 0 }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isMobile && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              <kbd style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>Ctrl+K</kbd> Búsqueda global
            </span>
          )}
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
            {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                style={{ padding: isMobile ? '6px 10px' : '6px 14px', borderRadius: 7, border: 'none', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', background: periodo === p ? '#fff' : 'transparent', color: periodo === p ? '#111' : '#6b7280', boxShadow: periodo === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {isMobile ? { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' }[p] : periodoLabel[p]}
              </button>
            ))}

          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {metrics.map(m => (
          <Link key={m.label} href={m.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '14px 16px' : 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'box-shadow 0.15s', display: isMobile ? 'flex' : 'block', alignItems: 'center', gap: isMobile ? 12 : 0 }}>
              <div style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 10, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? 0 : 14, flexShrink: 0 }}>
                <Icon name={m.icon} size={isMobile ? 18 : 22} color={m.color} />
              </div>
              <div>
                <p style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#111', marginBottom: 2 }}>{loading ? '—' : m.value}</p>
                <p style={{ fontSize: isMobile ? 11 : 13, color: '#6b7280', margin: 0 }}>{m.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Top métricas: producto, categoría, cliente */}
      {topMetrics.length > 0 && (
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${topMetrics.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
          {topMetrics.map(m => (
            <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: m.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {m.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{m.label}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</p>
                <p style={{ fontSize: 12, color: m.color, fontWeight: 600, margin: 0 }}>{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gráfica de ventas */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Ventas pagadas</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{periodoLabel[periodo]}</p>
          </div>
          {!loadingPeriodo && (
            <p style={{ fontSize: 22, fontWeight: 800, color: BLUE }}>
              ${totalPeriodo.toLocaleString('es-MX')}
            </p>
          )}
        </div>
        {loadingPeriodo ? (
          <div style={{ height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Cargando datos...</p>
          </div>
        ) : !hayDatosGrafica ? (
          <div style={{ height: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📊</span>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Sin ventas pagadas en este período</p>
          </div>
        ) : (
          <GraficaBarras data={chartData} />
        )}
      </div>

      <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Pedidos recientes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pedidos recientes</h2>
            <Link href="/ventas" style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          {loading ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
          ) : ventas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <Icon name="clipboard" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>Aún no hay pedidos</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['#', 'Cliente', 'Monto', 'Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 700, color: BLUE }}>#{v.numero}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#374151' }}>{v.clientes?.nombre ?? '—'}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>${Number(v.total).toLocaleString('es-MX')}</td>
                    <td style={{ padding: '12px 0' }}>
                      <span style={{ background: statusColor[v.estado], color: statusText[v.estado], fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stock bajo */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="warning" size={16} color="#d97706" /> Stock bajo
            </h2>
            <Link href="/productos" style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          {loading ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
          ) : stockBajo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <Icon name="check" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>Todo el stock está bien</p>
            </div>
          ) : (
            <>
              {stockBajo.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{p.nombre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.stock === 0 ? '#dc2626' : '#d97706', background: p.stock === 0 ? '#fee2e2' : '#fef3c7', padding: '2px 10px', borderRadius: 20 }}>
                    {p.stock === 0 ? 'Sin stock' : `${p.stock} unid.`}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 14, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                  {stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''} necesitan atención.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Solicitudes de proveedores */}
      {(solicitudes.length > 0 || loading) && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>Solicitudes de proveedores</h2>
              {solicitudes.length > 0 && (
                <span style={{ background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20 }}>
                  {solicitudes.length} pendiente{solicitudes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {solicitudes.length > 1 && (
                <button
                  onClick={async () => {
                    setProcesando('all')
                    for (const sol of solicitudes) {
                      await supabase.from('productos').insert({
                        nombre: sol.producto_nombre, sku: sol.producto_sku,
                        precio: sol.producto_precio, stock: sol.producto_stock,
                        imagen_url: sol.imagen_url, categoria_id: sol.categoria_id, activo: true,
                        origen: 'proveedor',
                        proveedor_nombre: sol.proveedor_empresa || sol.proveedor_nombre,
                      })
                      await supabase.from('solicitudes_productos').update({ estado: 'aprobado' }).eq('id', sol.id)
                    }
                    setSolicitudes([])
                    addToast(`${solicitudes.length} productos aprobados y publicados`, 'check', '#059669')
                    setProcesando(null)
                  }}
                  disabled={procesando !== null}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: procesando !== null ? '#9ca3af' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: procesando !== null ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                  {procesando === 'all' ? 'Aprobando...' : `Aprobar todos (${solicitudes.length})`}
                </button>
              )}
              <Link href="/configuracion" style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 600 }}>Ver configuración →</Link>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {solicitudes.map(sol => (
                <div key={sol.id} className="sol-card" style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'center', background: '#f9fafb', borderRadius: 12, padding: '14px 18px', border: '1px solid #f3f4f6' }}>
                  {/* Imagen */}
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #e5e7eb', flexShrink: 0 }}>
                    {sol.imagen_url
                      ? <img src={sol.imagen_url} alt={sol.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '📦'}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>{sol.producto_nombre}</p>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{sol.producto_sku}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                        ${Number(sol.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      {sol.producto_stock > 0 && (
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{sol.producto_stock} uds</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {sol.proveedor_nombre}{sol.proveedor_empresa ? ` · ${sol.proveedor_empresa}` : ''}
                      </span>
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                      <a href={`mailto:${sol.proveedor_email}`} style={{ fontSize: 11, color: BLUE, textDecoration: 'none' }}>{sol.proveedor_email}</a>
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {new Date(sol.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="sol-card-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => cambiarEstado(sol.id, 'rechazado')}
                      disabled={procesando === sol.id}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: procesando === sol.id ? 'default' : 'pointer', opacity: procesando === sol.id ? 0.5 : 1 }}>
                      Rechazar
                    </button>
                    <button
                      onClick={() => cambiarEstado(sol.id, 'aprobado')}
                      disabled={procesando === sol.id}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: procesando === sol.id ? '#9ca3af' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: procesando === sol.id ? 'default' : 'pointer' }}>
                      {procesando === sol.id ? '...' : 'Aprobar y publicar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 999 }}>
          {toasts.map(t => (
            <div key={t.id} style={{ background: '#fff', border: `1px solid ${t.color}30`, borderLeft: `4px solid ${t.color}`, borderRadius: 10, padding: '12px 16px', maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={t.icon} size={16} color={t.color} />
              <span style={{ fontSize: 13, color: '#111', fontWeight: 600, flex: 1 }}>{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
