'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'

type Resultado = {
  tipo: 'producto' | 'venta' | 'cliente'
  id: string
  titulo: string
  subtitulo: string
  href: string
  icon: string
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Ctrl+K para abrir
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResultados([])
      setSelIdx(0)
    }
  }, [open])

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return }
    setLoading(true)

    const [{ data: prods }, { data: ventas }, { data: clientes }] = await Promise.all([
      supabase.from('productos').select('id, nombre, sku, precio').ilike('nombre', `%${q}%`).limit(4),
      supabase.from('ventas').select('id, numero, total, estado, clientes(nombre)').or(`numero.eq.${parseInt(q) || 0}`).limit(3),
      supabase.from('clientes').select('id, nombre, email').ilike('nombre', `%${q}%`).limit(3),
    ])

    const res: Resultado[] = []
    prods?.forEach(p => res.push({
      tipo: 'producto', id: p.id,
      titulo: p.nombre, subtitulo: `SKU: ${p.sku} · $${Number(p.precio).toLocaleString('es-MX')}`,
      href: '/productos', icon: '📦',
    }))
    ventas?.forEach(v => res.push({
      tipo: 'venta', id: v.id,
      titulo: `Venta #${v.numero}`, subtitulo: `${(v.clientes as any)?.nombre ?? '—'} · $${Number(v.total).toLocaleString('es-MX')} · ${v.estado}`,
      href: '/ventas', icon: '🛒',
    }))
    clientes?.forEach(c => res.push({
      tipo: 'cliente', id: c.id,
      titulo: c.nombre, subtitulo: c.email ?? '',
      href: '/clientes', icon: '👤',
    }))

    setResultados(res)
    setSelIdx(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 250)
    return () => clearTimeout(t)
  }, [query, buscar])

  function navegar(r: Resultado) {
    router.push(r.href)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, resultados.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && resultados[selIdx]) navegar(resultados[selIdx])
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
      onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

      {/* Modal */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar productos, ventas, clientes..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#111', background: 'transparent', fontFamily: 'inherit' }}
          />
          {loading && <span style={{ fontSize: 12, color: '#9ca3af' }}>Buscando...</span>}
          <kbd style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#6b7280', fontFamily: 'inherit' }}>Esc</kbd>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {resultados.map((r, i) => (
              <div key={r.id + r.tipo}
                onClick={() => navegar(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', cursor: 'pointer',
                  background: i === selIdx ? '#f0f5ff' : 'transparent',
                  borderLeft: `3px solid ${i === selIdx ? NAVY : 'transparent'}`,
                }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.titulo}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.subtitulo}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 20, flexShrink: 0, textTransform: 'uppercase' }}>
                  {r.tipo}
                </span>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && resultados.length === 0 && (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Sin resultados para &quot;{query}&quot;
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 16 }}>
          {[['↑↓', 'Navegar'], ['↵', 'Abrir'], ['Esc', 'Cerrar']].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit', fontSize: 11 }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
