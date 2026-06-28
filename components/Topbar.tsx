'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  tipo: 'producto' | 'cliente' | 'venta'
  id: string
  label: string
  sub: string
  href: string
}

export default function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const iconMap = { producto: '📦', cliente: '👤', venta: '🛒' }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 240,
      right: 0,
      height: 56,
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      zIndex: 99,
      gap: 12,
    }}>

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
                  <span style={{ fontSize: 18 }}>{iconMap[r.tipo]}</span>
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
        <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6 }}>🔍</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, background: '#0049ff', color: '#fff',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>OE</div>
        <Image
          src="/imagenes/logo-oe_1-png-300x49.avif"
          alt="Order Express"
          width={110}
          height={18}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </header>
  )
}
