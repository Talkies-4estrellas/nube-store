'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/Icon'

type Producto = { id: string; nombre: string; sku: string; precio: number; stock: number; imagen_url: string | null; categoria: string }
type ItemCarrito = { producto: Producto; cantidad: number }
type MetodoPago = 'Efectivo' | 'Tarjeta' | 'Transferencia'
type Pantalla = 'caja' | 'exito'

const NAVY = '#252855'
const BLUE = '#0049ff'
const PINK = '#e7226d'
const GREEN = '#059669'

const METODOS: { id: MetodoPago; icon: string }[] = [
  { id: 'Efectivo',      icon: '💵' },
  { id: 'Tarjeta',       icon: '💳' },
  { id: 'Transferencia', icon: '🏦' },
]

const paletaColores = ['#818cf8','#34d399','#f59e0b','#60a5fa','#f472b6','#a78bfa','#fb923c','#2dd4bf']
function colorCat(nombre: string, lista: string[]) {
  return paletaColores[lista.indexOf(nombre) % paletaColores.length] ?? '#e5e7eb'
}

export default function PuntoDeVentaPage() {
  const [productos,   setProductos]   = useState<Producto[]>([])
  const [categorias,  setCategorias]  = useState<string[]>([])
  const [carrito,     setCarrito]     = useState<ItemCarrito[]>([])
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('Todas')
  const [metodo,      setMetodo]      = useState<MetodoPago>('Efectivo')
  const [efectivo,    setEfectivo]    = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [procesando,  setProcesando]  = useState(false)
  const [pantalla,    setPantalla]    = useState<Pantalla>('caja')
  const [ventaExito,  setVentaExito]  = useState<{ numero: number; total: number } | null>(null)
  const [error,       setError]       = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('productos_con_estado').select('*').neq('estado', 'Sin stock').order('nombre'),
        supabase.from('categorias').select('nombre').order('nombre'),
      ])
      setProductos(prods ?? [])
      setCategorias((cats ?? []).map(c => c.nombre))
      setLoading(false)
    }
    load()
  }, [])

  function agregarAlCarrito(p: Producto) {
    setCarrito(prev => {
      const existing = prev.find(i => i.producto.id === p.id)
      if (existing) {
        if (existing.cantidad >= p.stock) return prev
        return prev.map(i => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito(prev => prev
      .map(i => i.producto.id === id ? { ...i, cantidad: Math.max(1, Math.min(i.producto.stock, i.cantidad + delta)) } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  function quitarItem(id: string) {
    setCarrito(prev => prev.filter(i => i.producto.id !== id))
  }

  const subtotal  = carrito.reduce((s, i) => s + i.producto.precio * i.cantidad, 0)
  const cambio    = metodo === 'Efectivo' && efectivo ? Math.max(0, Number(efectivo) - subtotal) : 0
  const efectivoN = Number(efectivo)
  const puedeCobar = carrito.length > 0 && (metodo !== 'Efectivo' || efectivoN >= subtotal)

  async function cobrar() {
    if (!puedeCobar) return
    setProcesando(true)
    setError('')

    // Verificar stock actual antes de procesar
    const ids = carrito.map(i => i.producto.id)
    const { data: stockActual } = await supabase
      .from('productos')
      .select('id, stock, nombre')
      .in('id', ids)
    if (stockActual) {
      for (const item of carrito) {
        const real = stockActual.find(p => p.id === item.producto.id)
        if (!real || real.stock < item.cantidad) {
          setError(`Stock insuficiente para "${item.producto.nombre}". Disponible: ${real?.stock ?? 0}`)
          setProcesando(false)
          return
        }
      }
    }

    // Crear o buscar cliente
    let clienteId: string | null = null
    const nombreCliente = clienteNombre.trim() || 'Público en general'
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .ilike('nombre', nombreCliente)
      .limit(1)
      .single()

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const { data: nuevoCliente } = await supabase
        .from('clientes')
        .insert({ nombre: nombreCliente, email: `${Date.now()}@pos.local`, tag: 'Nuevo' })
        .select('id')
        .single()
      clienteId = nuevoCliente?.id ?? null
    }

    // Crear venta
    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({ cliente_id: clienteId, total: subtotal, estado: 'Pagado', notas: `POS · ${metodo}` })
      .select('id, numero')
      .single()

    if (errorVenta || !venta) {
      setError('Error al crear la venta: ' + errorVenta?.message)
      setProcesando(false)
      return
    }

    // Crear items
    const items = carrito.map(i => ({
      venta_id:  venta.id,
      producto_id: i.producto.id,
      nombre:    i.producto.nombre,
      cantidad:  i.cantidad,
      precio:    i.producto.precio,
      subtotal:  i.producto.precio * i.cantidad,
    }))

    const { error: errorItems } = await supabase.from('venta_items').insert(items)
    if (errorItems) {
      setError('Error al guardar los items: ' + errorItems.message)
      setProcesando(false)
      return
    }

    // Decrementar stock
    for (const i of carrito) {
      await supabase
        .from('productos')
        .update({ stock: i.producto.stock - i.cantidad })
        .eq('id', i.producto.id)
    }

    setVentaExito({ numero: venta.numero, total: subtotal })
    setPantalla('exito')
    setProcesando(false)
  }

  function nuevaVenta() {
    setCarrito([])
    setClienteNombre('')
    setEfectivo('')
    setMetodo('Efectivo')
    setPantalla('caja')
    setVentaExito(null)
    setError('')
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  const filtrados = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'Todas' || p.categoria === catFilter
    return matchSearch && matchCat
  })

  // ---- Pantalla de éxito ----
  if (pantalla === 'exito' && ventaExito) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '56px 48px', textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <div style={{ width: 72, height: 72, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✓</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: NAVY, marginBottom: 8 }}>¡Venta registrada!</h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>Venta <strong>#{ventaExito.numero}</strong></p>
          <div style={{ background: '#f0f2f8', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px' }}>Total cobrado</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: NAVY, margin: 0 }}>${ventaExito.total.toLocaleString('es-MX')}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '6px 0 0' }}>{metodo}</p>
            {metodo === 'Efectivo' && cambio > 0 && (
              <p style={{ fontSize: 15, fontWeight: 700, color: GREEN, margin: '8px 0 0' }}>Cambio: ${cambio.toLocaleString('es-MX')}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={nuevaVenta} style={{ flex: 1, background: NAVY, color: '#fff', border: 'none', padding: '14px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              ＋ Nueva venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Pantalla principal de caja ----
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, height: 'calc(100vh - 120px)', alignItems: 'start' }}>

      {/* ---- Catálogo ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Punto de Venta</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{carrito.length} producto{carrito.length !== 1 ? 's' : ''} en carrito</span>
          </div>
        </div>

        {/* Buscador + categorías */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto o SKU..."
            autoFocus
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none' }}
          />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' }}>
            <option value="Todas">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Grid de productos */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p>Cargando productos...</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <span style={{ fontSize: 36 }}>🔍</span>
              <p style={{ marginTop: 12 }}>Sin productos para &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {filtrados.map(p => {
                const enCarrito = carrito.find(i => i.producto.id === p.id)
                return (
                  <button key={p.id} onClick={() => agregarAlCarrito(p)}
                    style={{
                      border: enCarrito ? `2px solid ${BLUE}` : '2px solid #f3f4f6',
                      borderRadius: 12, padding: 0, cursor: 'pointer', background: '#fff',
                      overflow: 'hidden', textAlign: 'left', position: 'relative',
                      boxShadow: enCarrito ? `0 0 0 3px ${BLUE}20` : '0 1px 3px rgba(0,0,0,0.07)',
                      transition: 'all 0.15s',
                    }}>
                    {/* Imagen */}
                    <div style={{ height: 90, background: colorCat(p.categoria, categorias), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {p.imagen_url
                        ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Icon name="box" size={32} color="#fff" />
                      }
                    </div>
                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.nombre}</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: BLUE }}>${p.precio.toLocaleString('es-MX')}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Stock: {p.stock}</p>
                    </div>
                    {/* Badge cantidad */}
                    {enCarrito && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: BLUE, color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {enCarrito.cantidad}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---- Panel de caja ---- */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(37,40,85,0.10)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

        {/* Carrito */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Carrito</p>
          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#d1d5db' }}>
              <Icon name="cart" size={40} color="#e5e7eb" />
              <p style={{ fontSize: 13, marginTop: 10, color: '#9ca3af' }}>Haz clic en un producto para agregarlo</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {carrito.map(item => (
                <div key={item.producto.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: '#f9fafb', borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.producto.nombre}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>${item.producto.precio.toLocaleString('es-MX')} c/u</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => cambiarCantidad(item.producto.id, -1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.producto.id, 1)}
                      disabled={item.cantidad >= item.producto.stock}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.cantidad >= item.producto.stock ? 0.3 : 1 }}>＋</button>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, minWidth: 60, textAlign: 'right' }}>${(item.producto.precio * item.cantidad).toLocaleString('es-MX')}</p>
                  <button onClick={() => quitarItem(item.producto.id)}
                    style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer de cobro */}
        <div style={{ padding: 20, borderTop: '1px solid #f3f4f6' }}>
          {/* Cliente */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Cliente (opcional)</label>
            <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
              placeholder="Público en general"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Método de pago */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {METODOS.map(m => (
                <button key={m.id} onClick={() => setMetodo(m.id)}
                  style={{ padding: '10px 6px', borderRadius: 8, border: `2px solid ${metodo === m.id ? NAVY : '#e5e7eb'}`, background: metodo === m.id ? `${NAVY}08` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: metodo === m.id ? NAVY : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 18 }}>{m.icon}</span>
                  {m.id}
                </button>
              ))}
            </div>
          </div>

          {/* Efectivo recibido */}
          {metodo === 'Efectivo' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Efectivo recibido</label>
              <input type="number" min={0} value={efectivo} onChange={e => setEfectivo(e.target.value)}
                placeholder={`Mínimo $${subtotal.toLocaleString('es-MX')}`}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${efectivoN > 0 && efectivoN < subtotal ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              {efectivoN >= subtotal && efectivoN > 0 && (
                <p style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 6 }}>Cambio: ${cambio.toLocaleString('es-MX')}</p>
              )}
              {efectivoN > 0 && efectivoN < subtotal && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Faltan ${(subtotal - efectivoN).toLocaleString('es-MX')}</p>
              )}
            </div>
          )}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '2px solid #f3f4f6', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Total</span>
            <span style={{ fontSize: 26, fontWeight: 900, color: NAVY }}>${subtotal.toLocaleString('es-MX')}</span>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>{error}</div>
          )}

          <button onClick={cobrar} disabled={!puedeCobar || procesando}
            style={{ width: '100%', background: puedeCobar && !procesando ? PINK : '#d1d5db', color: '#fff', border: 'none', padding: '15px 0', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: puedeCobar && !procesando ? 'pointer' : 'default', letterSpacing: '0.01em', boxShadow: puedeCobar ? `0 4px 14px ${PINK}50` : 'none', transition: 'all 0.2s' }}>
            {procesando ? 'Procesando...' : carrito.length === 0 ? 'Agrega productos' : `Cobrar $${subtotal.toLocaleString('es-MX')} →`}
          </button>
        </div>
      </div>
    </div>
  )
}
