'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Cliente = { id: string; nombre: string; email: string }
type Producto = { id: string; nombre: string; precio: number; stock: number }
type LineaItem = { producto_id: string; nombre: string; precio: number; cantidad: number }

type Props = { onClose: () => void; onSave: () => void }

export default function VentaModal({ onClose, onSave }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [estado, setEstado] = useState<'Pendiente' | 'Pagado' | 'Enviado' | 'Cancelado'>('Pendiente')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<LineaItem[]>([])
  const [productoSel, setProductoSel] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('clientes').select('id, nombre, email').order('nombre'),
        supabase.from('productos').select('id, nombre, precio, stock').gt('stock', 0).order('nombre'),
      ])
      if (c) setClientes(c)
      if (p) setProductos(p)
    }
    load()
  }, [])

  function agregarItem() {
    const prod = productos.find(p => p.id === productoSel)
    if (!prod) return
    const existe = items.find(i => i.producto_id === productoSel)
    if (existe) {
      setItems(prev => prev.map(i => i.producto_id === productoSel ? { ...i, cantidad: i.cantidad + cantidad } : i))
    } else {
      setItems(prev => [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad }])
    }
    setProductoSel('')
    setCantidad(1)
  }

  function quitarItem(id: string) {
    setItems(prev => prev.filter(i => i.producto_id !== id))
  }

  function cambiarCantidad(id: string, val: number) {
    if (val < 1) return
    setItems(prev => prev.map(i => i.producto_id === id ? { ...i, cantidad: val } : i))
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)

  function validate() {
    const errs: Record<string, string> = {}
    if (!clienteId) errs.cliente = 'Selecciona un cliente'
    if (items.length === 0) errs.items = 'Agrega al menos un producto'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)

    const { data: venta, error: ventaErr } = await supabase
      .from('ventas')
      .insert({ cliente_id: clienteId, estado, notas: notas || null, total })
      .select('id')
      .single()

    if (ventaErr || !venta) { alert('Error al crear venta: ' + ventaErr?.message); setSaving(false); return }

    const ventaItems = items.map(i => ({
      venta_id: venta.id,
      producto_id: i.producto_id,
      nombre: i.nombre,
      precio: i.precio,
      cantidad: i.cantidad,
    }))

    const { error: itemsErr } = await supabase.from('venta_items').insert(ventaItems)
    if (itemsErr) { alert('Error al guardar items: ' + itemsErr.message); setSaving(false); return }

    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nueva venta</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Cliente */}
          <div>
            <label style={lbl}>Cliente *</label>
            <select value={clienteId} onChange={e => { setClienteId(e.target.value); setErrors(v => ({ ...v, cliente: '' })) }}
              style={inp(!!errors.cliente)}>
              <option value="">Selecciona un cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.email}</option>)}
            </select>
            {errors.cliente && <span style={errStyle}>{errors.cliente}</span>}
          </div>

          {/* Estado */}
          <div>
            <label style={lbl}>Estado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Pendiente', 'Pagado', 'Enviado', 'Cancelado'] as const).map(s => (
                <button key={s} onClick={() => setEstado(s)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '2px solid', borderColor: estado === s ? '#0049ff' : '#e5e7eb',
                  background: estado === s ? '#eff6ff' : '#fff',
                  color: estado === s ? '#0049ff' : '#374151',
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Agregar productos */}
          <div>
            <label style={lbl}>Productos *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={productoSel} onChange={e => setProductoSel(e.target.value)} style={{ ...inp(false), flex: 1 }}>
                <option value="">Selecciona un producto</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toLocaleString()} (stock: {p.stock})</option>
                ))}
              </select>
              <input type="number" min={1} value={cantidad} onChange={e => setCantidad(Number(e.target.value))}
                style={{ ...inp(false), width: 72 }} />
              <button onClick={agregarItem} disabled={!productoSel}
                style={{ background: productoSel ? '#0049ff' : '#e5e7eb', color: productoSel ? '#fff' : '#9ca3af', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, cursor: productoSel ? 'pointer' : 'default', fontSize: 20 }}>
                +
              </button>
            </div>

            {errors.items && <span style={errStyle}>{errors.items}</span>}

            {items.length > 0 && (
              <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Producto', 'Precio', 'Cantidad', 'Subtotal', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '10px 12px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.producto_id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#111' }}>{i.nombre}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>${Number(i.precio).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <input type="number" min={1} value={i.cantidad}
                            onChange={e => cambiarCantidad(i.producto_id, Number(e.target.value))}
                            style={{ width: 60, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#0049ff' }}>
                          ${(i.precio * i.cantidad).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => quitarItem(i.producto_id)}
                            style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Total: ${total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label style={lbl}>Notas (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Instrucciones de entrega, referencias, etc."
              style={{ ...inp(false), resize: 'vertical' }} />
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Guardando...' : `Crear venta · $${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }
const errStyle: React.CSSProperties = { fontSize: 12, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'block' }
function inp(hasError: boolean): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }
}
