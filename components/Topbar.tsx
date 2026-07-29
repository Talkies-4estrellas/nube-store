'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'

type SearchResult = {
  tipo: 'producto' | 'cliente' | 'venta'
  id: string
  label: string
  sub: string
  href: string
}

type Notif = {
  id: string
  tipo: 'venta' | 'stock_bajo' | 'solicitud' | 'sugerencia'
  titulo: string
  subtitulo: string
  extra?: string
  at: string
  href: string
  icono: string
  color: string
}

export default function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user } = useAuth()
  const { isMobile, toggle, open } = useSidebar()

  // Avisos persistentes: stock bajo y solicitudes de proveedor pendientes
  // (estado actual del negocio, no solo eventos de esta sesión).
  useEffect(() => {
    async function cargarAvisos() {
      const [{ data: stockBajo }, { data: solicitudes }] = await Promise.all([
        supabase.from('productos').select('id, nombre, sku, stock').eq('activo', true).lte('stock', 5).order('stock').limit(5),
        supabase.from('solicitudes_productos').select('id, producto_nombre, proveedor_nombre, created_at').eq('estado', 'pendiente').order('created_at', { ascending: false }).limit(5),
      ])

      const avisos: Notif[] = []
      ;(stockBajo ?? []).forEach(p => avisos.push({
        id: `stock-${p.id}`, tipo: 'stock_bajo',
        titulo: p.stock === 0 ? `${p.nombre} sin stock` : `${p.nombre}: quedan ${p.stock}`,
        subtitulo: `SKU ${p.sku}`, at: new Date().toISOString(), href: '/productos',
        icono: '📦', color: p.stock === 0 ? '#dc2626' : '#d97706',
      }))
      ;(solicitudes ?? []).forEach(s => avisos.push({
        id: `sol-${s.id}`, tipo: 'solicitud',
        titulo: `Nueva solicitud: ${s.producto_nombre}`,
        subtitulo: s.proveedor_nombre, at: s.created_at, href: '/configuracion',
        icono: '📥', color: '#0049ff',
      }))
      setNotifs(prev => [...avisos, ...prev.filter(n => n.tipo === 'venta')])
    }
    cargarAvisos()
  }, [])

  // Realtime: nueva venta → badge + dropdown
  useEffect(() => {
    const channel = supabase
      .channel('topbar-ventas-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas' }, async payload => {
        const v = payload.new as { id: string; numero: number; total: number; created_at: string; cliente_id: string }
        const { data: cliente } = await supabase.from('clientes').select('nombre').eq('id', v.cliente_id).maybeSingle()
        setNotifs(prev => [{
          id: `venta-${v.id}`, tipo: 'venta' as const,
          titulo: `Venta #${v.numero}`,
          subtitulo: cliente?.nombre ?? 'Cliente',
          extra: `$${Number(v.total).toLocaleString('es-MX')}`,
          at: v.created_at, href: '/ventas', icono: '🛒', color: '#059669',
        }, ...prev].slice(0, 20))
        setUnread(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Realtime: nueva solicitud de proveedor pendiente → badge + dropdown
  // (antes solo se cargaba una vez al abrir la página, a diferencia de "venta nueva")
  useEffect(() => {
    const channel = supabase
      .channel('topbar-solicitudes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitudes_productos' }, payload => {
        const s = payload.new as { id: string; producto_nombre: string; proveedor_nombre: string; estado: string; created_at: string }
        if (s.estado !== 'pendiente') return
        setNotifs(prev => [{
          id: `sol-${s.id}`, tipo: 'solicitud' as const,
          titulo: `Nueva solicitud: ${s.producto_nombre}`,
          subtitulo: s.proveedor_nombre, at: s.created_at, href: '/configuracion',
          icono: '📥', color: '#0049ff',
        }, ...prev.filter(n => n.id !== `sol-${s.id}`)].slice(0, 20))
        setUnread(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [searchOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => buscar(query), 280)
    return () => clearTimeout(t)
  }, [query])

  async function buscar(q: string) {
    setSearching(true)
    const term = `%${q}%`
    const [{ data: prods }, { data: clientes }, { data: ventas }] = await Promise.all([
      supabase.from('productos').select('id, nombre, sku').or(`nombre.ilike.${term},sku.ilike.${term}`).limit(4),
      supabase.from('clientes').select('id, nombre, email').or(`nombre.ilike.${term},email.ilike.${term}`).limit(4),
      supabase.from('ventas').select('id, numero, total').limit(3),
    ])
    const res: SearchResult[] = [
      ...(prods ?? []).map(p => ({ tipo: 'producto' as const, id: p.id, label: p.nombre, sub: `SKU: ${p.sku}`, href: '/productos' })),
      ...(clientes ?? []).map(c => ({ tipo: 'cliente' as const, id: c.id, label: c.nombre, sub: c.email ?? '', href: '/clientes' })),
      ...(ventas ?? []).filter(v => String(v.numero).includes(q)).map(v => ({ tipo: 'venta' as const, id: v.id, label: `Venta #${v.numero}`, sub: `$${Number(v.total).toLocaleString()}`, href: '/ventas' })),
    ]
    setResults(res)
    setSearching(false)
  }

  const iconMap: Record<string, string> = { producto: 'box', cliente: 'users', venta: 'cart' }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: isMobile ? 0 : 240,
      right: 0,
      height: 56,
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: isMobile ? '0 12px' : '0 24px',
      zIndex: 100,
      gap: isMobile ? 8 : 12,
      transition: 'left 0.25s ease',
    }}>
      {/* Botón hamburguesa (solo mobile) */}
      {isMobile && (
        <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 'auto' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={open ? '#e7226d' : '#252855'} strokeWidth="2.5" strokeLinecap="round">
            {open
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      )}

      {/* Logo centrado (solo mobile — en escritorio ya vive en el Sidebar) */}
      {isMobile && (
        <img src="/storefront/monograma.svg" alt="OrderExpress"
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', height: 36, width: 'auto' }} />
      )}

      {/* Campana de notificaciones */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button onClick={() => { setShowNotif(v => !v); setUnread(0) }}
          style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <Icon name="bell" size={20} color={unread > 0 ? '#d97706' : '#9ca3af'} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 2, right: 2, background: '#e7226d', color: '#fff', fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {showNotif && (
          <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 300, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>Notificaciones</p>
              {notifs.length > 0 && (
                <button onClick={() => setNotifs([])} style={{ background: 'none', border: 'none', fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>Limpiar</button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin avisos ni sugerencias por ahora</p>
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifs.map(n => (
                  <button key={n.id} onClick={() => { router.push(n.href); setShowNotif(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f9fafb', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <div style={{ width: 36, height: 36, background: `${n.color}1a`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>{n.icono}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subtitulo}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {n.extra && <p style={{ fontSize: 13, fontWeight: 700, color: n.color, margin: '0 0 2px' }}>{n.extra}</p>}
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{new Date(n.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => { router.push('/dashboard'); setShowNotif(false) }}
                style={{ width: '100%', background: '#eff6ff', color: '#0049ff', border: 'none', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Ir al dashboard →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Buscador expandible */}
      {searchOpen ? (
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
            placeholder="Buscar productos, clientes, ventas..."
            style={{ width: '100%', padding: '8px 36px 8px 14px', border: '2px solid #0049ff', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={() => setSearchOpen(false)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af' }}>×</button>
          {(results.length > 0 || searching) && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 200 }}>
              {searching && <p style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>Buscando...</p>}
              {results.map(r => (
                <button key={r.id} onClick={() => { router.push(r.href); setSearchOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <Icon name={iconMap[r.tipo]} size={18} color="#6b7280" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{r.label}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{r.sub}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase' }}>{r.tipo}</span>
                </button>
              ))}
              {!searching && results.length === 0 && query && (
                <p style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>Sin resultados para "{query}"</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <Icon name="search" size={20} color="#6b7280" />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: isMobile ? 0 : 12, borderLeft: isMobile ? 'none' : '1px solid #e5e7eb' }}>
            <div title={user.nombre} style={{ width: 30, height: 30, background: '#252855', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, overflow: 'hidden' }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.nombre.charAt(0).toUpperCase()}
            </div>
            {!isMobile && (
              <div style={{ lineHeight: 1.2 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#111', margin: 0 }}>{user.nombre}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
