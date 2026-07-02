'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { use } from 'react'

const NAVY = '#252855'
const PINK = '#e7226d'
const CART_KEY = 'oe_cart'
const FALLBACK = 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=700&q=80'

type Producto = {
  id: string
  nombre: string
  sku: string
  precio: number
  stock: number
  imagen_url: string | null
  categorias: { nombre: string } | null
}

function SkeletonBox({ w, h, r = 8 }: { w: string; h: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
  )
}

export default function TiendaProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const sku = slug.toUpperCase()

  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [added, setAdded] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    supabase
      .from('productos')
      .select('id, nombre, sku, precio, stock, imagen_url, categorias(nombre)')
      .eq('sku', sku)
      .eq('activo', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true) } else { setProducto(data as unknown as Producto) }
        setLoading(false)
      })
  }, [sku])

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
      setCartCount(cart.reduce((t: number, i: { quantity: number }) => t + i.quantity, 0))
    } catch {}
  }, [])

  function addToCart() {
    try {
      const cart: { product: [string, string, string, string, string]; quantity: number }[] = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
      const p = producto!
      const priceStr = `$${Number(p.precio).toLocaleString('es-MX')}`
      const img = p.imagen_url ?? FALLBACK
      const cat = p.categorias?.nombre ?? 'General'
      const desc = `${cat} — SKU ${p.sku}`
      const existing = cart.find(i => i.product[0] === p.nombre)
      if (existing) {
        existing.quantity += 1
      } else {
        cart.push({ product: [p.nombre, desc, priceStr, img, cat], quantity: 1 })
      }
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
      setCartCount(cart.reduce((t, i) => t + i.quantity, 0))
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>

      {/* Topbar */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: NAVY, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>OE</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.02em' }}>
            <span style={{ color: NAVY }}>Order</span><span style={{ color: PINK }}>Express</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/#catalogo" style={{ fontSize: 13, color: '#374151', fontWeight: 600, textDecoration: 'none' }}>← Catálogo</Link>
          <Link href="/" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: NAVY, color: '#fff', fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 20, textDecoration: 'none' }}>
            🛒 Carrito
            {cartCount > 0 && (
              <span style={{ background: PINK, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>{cartCount}</span>
            )}
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 13, color: '#9ca3af' }}>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Inicio</Link>
          <span>›</span>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Catálogo</Link>
          {producto && <><span>›</span><span style={{ color: '#374151', fontWeight: 600 }}>{producto.nombre}</span></>}
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <SkeletonBox w="100%" h={380} r={16} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SkeletonBox w="60%" h={16} />
              <SkeletonBox w="90%" h={32} />
              <SkeletonBox w="40%" h={40} />
              <SkeletonBox w="100%" h={80} />
              <SkeletonBox w="100%" h={48} r={10} />
            </div>
          </div>
        )}

        {notFound && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 }}>Producto no encontrado</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>El producto con SKU <strong>{sku}</strong> no está disponible.</p>
            <Link href="/" style={{ background: NAVY, color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Ver catálogo
            </Link>
          </div>
        )}

        {producto && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>

            {/* Imagen */}
            <div>
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e7eb', aspectRatio: '1', background: '#f9fafb' }}>
                <img
                  src={producto.imagen_url ?? FALLBACK}
                  alt={producto.nombre}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Categoría + SKU */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {producto.categorias && (
                  <span style={{ background: `${NAVY}12`, color: NAVY, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {producto.categorias.nombre}
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>SKU: {producto.sku}</span>
              </div>

              {/* Nombre */}
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.02em' }}>
                {producto.nombre}
              </h1>

              {/* Precio */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: NAVY }}>
                  ${Number(producto.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 8 }}>MXN</span>
              </div>

              {/* Stock */}
              <div style={{ marginBottom: 24 }}>
                {producto.stock === 0 ? (
                  <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>Sin stock</span>
                ) : producto.stock <= 5 ? (
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>⚡ Solo {producto.stock} disponibles</span>
                ) : (
                  <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>✓ En stock ({producto.stock} uds)</span>
                )}
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <button
                  onClick={addToCart}
                  disabled={producto.stock === 0}
                  style={{
                    background: added ? '#059669' : producto.stock === 0 ? '#e5e7eb' : PINK,
                    color: producto.stock === 0 ? '#9ca3af' : '#fff',
                    border: 'none', padding: '14px 0', borderRadius: 12, fontWeight: 800, fontSize: 16,
                    cursor: producto.stock === 0 ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: producto.stock > 0 ? `0 4px 16px ${PINK}40` : 'none',
                  }}>
                  {added ? '✓ Agregado al carrito' : '🛒 Agregar al carrito'}
                </button>
                <Link href="/"
                  style={{ display: 'block', textAlign: 'center', background: `${NAVY}10`, color: NAVY, border: `1.5px solid ${NAVY}20`, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                  Ver más productos
                </Link>
              </div>

              {/* Garantías */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['✓', 'Garantía de 12 meses'],
                  ['📦', 'Envío en 2-5 días hábiles'],
                  ['🔒', 'Compra segura y protegida'],
                  ['↩️', 'Devoluciones en 30 días'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sección inferior */}
        {producto && (
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Descripción */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Sobre este producto</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
                {producto.categorias?.nombre ?? 'Producto'} de alta calidad. SKU <strong>{producto.sku}</strong>. Disponible con entrega a todo México. Revisado y empacado antes del envío para garantizar tu satisfacción.
              </p>
            </div>
            {/* Características */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Especificaciones</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Nombre', producto.nombre],
                  ['SKU', producto.sku],
                  ['Categoría', producto.categorias?.nombre ?? '—'],
                  ['Precio', `$${Number(producto.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`],
                  ['Disponibilidad', producto.stock > 0 ? `${producto.stock} unidades` : 'Sin stock'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#9ca3af', fontWeight: 600 }}>{k}</span>
                    <span style={{ color: '#111', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: NAVY, padding: '20px 32px', textAlign: 'center', marginTop: 60 }}>
        <p style={{ color: '#ffffff50', fontSize: 12, margin: 0 }}>© 2026 OrderExpress · Todos los derechos reservados</p>
      </footer>
    </div>
  )
}
