'use client'

import { useState, useEffect, useCallback } from 'react'

const NAVY  = '#252855'
const BLUE  = '#0049ff'
const PINK  = '#e7226d'
const GREEN = '#059669'

type Slide = {
  id: string
  tag: string
  title: string
  body: string
  color: string
  icon: string
  features: { icon: string; label: string; desc: string }[]
  accent?: string
}

const slides: Slide[] = [
  {
    id: 'cover',
    tag: 'Sistema de gestión',
    title: 'Order Express',
    body: 'Plataforma todo-en-uno para administrar inventario, ventas, clientes y tienda en línea desde un solo panel.',
    color: NAVY,
    icon: '⚡',
    features: [
      { icon: '🗄️', label: 'Base de datos en tiempo real', desc: 'Supabase + PostgreSQL' },
      { icon: '🌐', label: 'Desplegado en la nube', desc: 'Next.js + Vercel' },
      { icon: '🔐', label: 'Roles y accesos', desc: 'Admin · Vendedor · Bodega' },
    ],
    accent: BLUE,
  },
  {
    id: 'dashboard',
    tag: 'Módulo 1',
    title: 'Dashboard',
    body: 'Vista central con métricas del negocio actualizadas en tiempo real: ventas del día, ingresos, tickets promedio y tendencias por semana.',
    color: BLUE,
    icon: '📊',
    features: [
      { icon: '💰', label: 'Ventas del día', desc: 'Total e ingresos en vivo' },
      { icon: '📈', label: 'Gráfica semanal', desc: 'Barras de ingresos por día' },
      { icon: '🏆', label: 'Top métricas', desc: 'Producto, categoría y cliente más activo' },
    ],
  },
  {
    id: 'pos',
    tag: 'Módulo 2',
    title: 'Punto de Venta',
    body: 'Caja rápida para cobrar presencialmente. Busca productos, arma el carrito, elige método de pago y registra la venta en segundos.',
    color: '#7c3aed',
    icon: '🧾',
    features: [
      { icon: '🔍', label: 'Búsqueda instantánea', desc: 'Por nombre o SKU' },
      { icon: '💳', label: 'Múltiples métodos de pago', desc: 'Efectivo · Tarjeta · Transferencia' },
      { icon: '✅', label: 'Validación de stock', desc: 'Verifica disponibilidad al cobrar' },
    ],
  },
  {
    id: 'productos',
    tag: 'Módulo 3',
    title: 'Productos',
    body: 'Gestión completa del catálogo: agrega, edita y controla el inventario con imágenes en WebP, categorías y estado de stock automático.',
    color: '#0891b2',
    icon: '📦',
    features: [
      { icon: '🖼️', label: 'Imágenes optimizadas', desc: 'Conversión automática a WebP' },
      { icon: '🏷️', label: 'Categorías y SKUs', desc: 'Organización por tipo de producto' },
      { icon: '🚦', label: 'Estados de stock', desc: 'Activo · Stock bajo · Sin stock' },
    ],
  },
  {
    id: 'ventas',
    tag: 'Módulo 4',
    title: 'Ventas',
    body: 'Historial completo de pedidos con detalle de artículos, estados de entrega, notas y opción de imprimir ticket por venta.',
    color: GREEN,
    icon: '🛒',
    features: [
      { icon: '🔄', label: 'Estados de pedido', desc: 'Pendiente · Pagado · Enviado · Cancelado' },
      { icon: '🖨️', label: 'Impresión de ticket', desc: 'Recibo con artículos y total' },
      { icon: '🔗', label: 'Vínculo a clientes', desc: 'Historial por cliente' },
    ],
  },
  {
    id: 'clientes',
    tag: 'Módulo 5',
    title: 'Clientes',
    body: 'CRM básico con perfil de cada cliente: total de pedidos, gasto acumulado, última compra y etiqueta automática según su actividad.',
    color: '#d97706',
    icon: '👥',
    features: [
      { icon: '🏅', label: 'Etiquetas automáticas', desc: 'Nuevo · Regular · VIP' },
      { icon: '📋', label: 'Historial de compras', desc: 'Por cliente con totales' },
      { icon: '🗑️', label: 'Eliminación segura', desc: 'Soft delete — datos preservados' },
    ],
  },
  {
    id: 'tienda',
    tag: 'Módulo 6',
    title: 'Tienda en línea',
    body: 'Storefront pública con catálogo de productos, buscador, filtros por categoría, páginas de producto individuales y checkout integrado.',
    color: PINK,
    icon: '🛍️',
    features: [
      { icon: '🎨', label: 'Editor de diseño', desc: 'Colores, textos y redes sociales' },
      { icon: '🛒', label: 'Carrito persistente', desc: 'Se mantiene entre visitas' },
      { icon: '📱', label: 'Páginas de producto', desc: 'URL propia por SKU' },
    ],
  },
  {
    id: 'proveedores',
    tag: 'Módulo 7',
    title: 'Portal de Proveedores',
    body: 'Acceso público para que proveedores registren nuevos productos con imágenes, precio y SKU. El admin aprueba o rechaza cada solicitud.',
    color: '#374151',
    icon: '🏭',
    features: [
      { icon: '📝', label: 'Formulario guiado', desc: 'Con indicador de progreso' },
      { icon: '📸', label: 'Carga de imágenes', desc: 'Almacenadas en Supabase Storage' },
      { icon: '🔎', label: 'Historial de solicitudes', desc: 'Consulta por email del proveedor' },
    ],
  },
  {
    id: 'robustez',
    tag: 'Infraestructura',
    title: 'Seguridad y robustez',
    body: 'El sistema incluye capas de validación, control de inventario en tiempo real y accesos por roles para proteger cada operación.',
    color: NAVY,
    icon: '🛡️',
    features: [
      { icon: '📧', label: 'Validación de email', desc: 'En formularios de checkout y registro' },
      { icon: '🔒', label: 'Roles de acceso', desc: 'Admin · Vendedor · Bodega · Público' },
      { icon: '⚙️', label: 'Triggers automáticos', desc: 'Stock y tags se actualizan en BD' },
    ],
  },
]

export default function PresentacionPage() {
  const [current, setCurrent] = useState(0)
  const [animDir, setAnimDir] = useState<'next' | 'prev' | null>(null)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((index: number) => {
    if (index === current) return
    const dir = index > current ? 'next' : 'prev'
    setVisible(false)
    setAnimDir(dir)
    setTimeout(() => {
      setCurrent(index)
      setVisible(true)
    }, 220)
  }, [current])

  const next = useCallback(() => goTo(Math.min(current + 1, slides.length - 1)), [current, goTo])
  const prev = useCallback(() => goTo(Math.max(current - 1, 0)), [current, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  const slide = slides[current]
  const isFirst = current === 0

  return (
    <div style={{
      minHeight: '100vh',
      background: slide.color,
      display: 'flex',
      flexDirection: 'column',
      transition: 'background 0.5s ease',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeUpFast { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .slide-in { animation: fadeUp 0.35s ease forwards; }
        .slide-in-delay { animation: fadeUp 0.35s ease 0.08s forwards; opacity:0; }
        .slide-in-delay2 { animation: fadeUp 0.35s ease 0.16s forwards; opacity:0; }
      `}</style>

      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }} />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 40px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.15)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>⚡</div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
            ORDER EXPRESS
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>
          {current + 1} / {slides.length}
        </span>
      </div>

      {/* Contenido principal */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 60px 40px', position: 'relative', zIndex: 10,
      }}>
        {visible && (
          <div style={{ maxWidth: 860, width: '100%' }}>
            {/* Tag */}
            <div className="slide-in" style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '5px 14px', borderRadius: 100,
              marginBottom: 24,
            }}>
              {slide.tag}
            </div>

            {/* Icono + Título */}
            <div className="slide-in" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{
                width: isFirst ? 80 : 64, height: isFirst ? 80 : 64,
                background: 'rgba(255,255,255,0.12)', borderRadius: isFirst ? 24 : 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isFirst ? 40 : 32, flexShrink: 0,
              }}>
                {slide.icon}
              </div>
              <h1 style={{
                fontSize: isFirst ? 56 : 48, fontWeight: 900,
                color: '#fff', lineHeight: 1.05, margin: 0,
                letterSpacing: '-0.02em',
              }}>
                {slide.title}
              </h1>
            </div>

            {/* Descripción */}
            <p className="slide-in-delay" style={{
              fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65,
              marginBottom: 48, maxWidth: 680, fontWeight: 400,
            }}>
              {slide.body}
            </p>

            {/* Features */}
            <div className="slide-in-delay2" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}>
              {slide.features.map((f, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.09)',
                  borderRadius: 16, padding: '20px 22px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{f.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: dots + flechas */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 40px 32px', position: 'relative', zIndex: 10,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: i === current ? 24 : 8,
              height: 8, borderRadius: 100,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Flechas */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={prev} disabled={current === 0} style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: current === 0 ? 'default' : 'pointer',
            opacity: current === 0 ? 0.3 : 1, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.2s',
          }}>←</button>
          <button onClick={next} disabled={current === slides.length - 1} style={{
            width: 44, height: 44, borderRadius: '50%',
            background: current === slides.length - 1 ? 'rgba(255,255,255,0.12)' : '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            color: current === slides.length - 1 ? '#fff' : slide.color,
            cursor: current === slides.length - 1 ? 'default' : 'pointer',
            opacity: current === slides.length - 1 ? 0.3 : 1, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', fontWeight: 700,
          }}>→</button>
        </div>
      </div>
    </div>
  )
}
