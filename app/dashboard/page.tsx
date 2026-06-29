'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/Icon'

type Venta = { id: string; numero: number; total: number; estado: string; created_at: string; clientes: { nombre: string } | null }
type ProductoBajo = { nombre: string; stock: number }
type Toast = { id: number; message: string; icon: string; color: string }

const statusColor: Record<string, string> = { Pagado: '#d1fae5', Enviado: '#dbeafe', Pendiente: '#fef3c7', Cancelado: '#fee2e2' }
const statusText:  Record<string, string> = { Pagado: '#065f46', Enviado: '#1e40af', Pendiente: '#92400e', Cancelado: '#991b1b' }

type Periodo = 'hoy' | 'semana' | 'mes'
const periodoLabel: Record<Periodo, string> = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }

function getPeriodoStart(periodo: Periodo): string {
  const now = new Date()
  if (periodo === 'hoy') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else if (periodo === 'semana') {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  } else {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
}

export default function DashboardPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasPeriodo, setVentasPeriodo] = useState<{ total: number; estado: string }[]>([])
  const [stockBajo, setStockBajo] = useState<ProductoBajo[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
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
        if (newStock === 0 && oldStock > 0) {
          addToast(`Sin stock: ${nombre}`, 'warning', '#dc2626')
        } else if (newStock <= 3 && (oldStock === undefined || oldStock > 3)) {
          addToast(`Stock bajo: ${nombre} (${newStock} restantes)`, 'warning', '#d97706')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }, { count }] = await Promise.all([
        supabase.from('ventas').select('*, clientes(nombre)').order('created_at', { ascending: false }).limit(5),
        supabase.from('productos').select('nombre, stock').lte('stock', 3).order('stock'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])
      if (v) setVentas(v)
      if (p) setStockBajo(p)
      setTotalClientes(count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    async function loadPeriodo() {
      setLoadingPeriodo(true)
      const { data } = await supabase
        .from('ventas')
        .select('total, estado')
        .gte('created_at', getPeriodoStart(periodo))
      setVentasPeriodo(data ?? [])
      setLoadingPeriodo(false)
    }
    loadPeriodo()
  }, [periodo])

  const totalPeriodo = ventasPeriodo.filter(v => v.estado === 'Pagado').reduce((s, v) => s + Number(v.total), 0)
  const pendientes = ventas.filter(v => v.estado === 'Pendiente').length

  const metrics = [
    { label: `Ventas (${periodoLabel[periodo].toLowerCase()})`, value: loadingPeriodo ? '...' : `$${totalPeriodo.toLocaleString()}`, icon: 'dollar', href: '/ventas', color: '#059669' },
    { label: 'Pedidos pendientes', value: pendientes, icon: 'clipboard', href: '/ventas', color: '#d97706' },
    { label: 'Clientes registrados', value: totalClientes, icon: 'users', href: '/clientes', color: '#0049ff' },
    { label: 'Productos sin stock', value: stockBajo.filter(p => p.stock === 0).length, icon: 'warning', href: '/productos', color: '#dc2626' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
          {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: periodo === p ? '#fff' : 'transparent', color: periodo === p ? '#111' : '#6b7280', boxShadow: periodo === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              {periodoLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {metrics.map(m => (
          <Link key={m.label} href={m.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon name={m.icon} size={22} color={m.color} />
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 4 }}>
                {loading ? '—' : m.value}
              </p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>{m.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Pedidos recientes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pedidos recientes</h2>
            <Link href="/ventas" style={{ fontSize: 13, color: '#0049ff', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
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
                    <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>#{v.numero}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#374151' }}>{v.clientes?.nombre ?? '—'}</td>
                    <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>${Number(v.total).toLocaleString()}</td>
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
            <Link href="/productos" style={{ fontSize: 13, color: '#0049ff', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
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
                <div key={p.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{p.nombre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.stock === 0 ? '#dc2626' : '#d97706', background: p.stock === 0 ? '#fee2e2' : '#fef3c7', padding: '2px 10px', borderRadius: 20 }}>
                    {p.stock === 0 ? 'Sin stock' : `${p.stock} left`}
                  </span>
                </div>
              ))}
              {stockBajo.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                    {stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''} necesitan atención.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toasts de stock */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 999 }}>
          {toasts.map(t => (
            <div key={t.id} style={{ background: '#fff', border: `1px solid ${t.color}30`, borderLeft: `4px solid ${t.color}`, borderRadius: 10, padding: '12px 16px', maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={t.icon} size={16} color={t.color} />
              <span style={{ fontSize: 13, color: '#111', fontWeight: 600, flex: 1 }}>{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
