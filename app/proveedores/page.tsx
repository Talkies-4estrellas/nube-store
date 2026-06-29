'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const PINK = '#e7226d'

type FormState = 'idle' | 'loading' | 'success' | 'error'

type Categoria = { id: number; nombre: string }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#fafafa', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6,
}

export default function ProveedoresPage() {
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // Datos del proveedor
  const [proveedor, setProveedor] = useState({
    nombre: '', empresa: '', email: '', telefono: '',
  })

  // Datos del producto
  const [producto, setProducto] = useState({
    nombre: '', sku: '', descripcion: '', precio: '',
    stock: '', categoria_id: '', imagen_url: '',
  })

  useEffect(() => {
    supabase.from('categorias').select('id, nombre').order('nombre')
      .then(({ data }) => { if (data) setCategorias(data) })
  }, [])

  function setP(field: string, value: string) {
    setProveedor(prev => ({ ...prev, [field]: value }))
  }
  function setProd(field: string, value: string) {
    setProducto(prev => ({ ...prev, [field]: value }))
  }

  function focus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = NAVY
  }
  function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#e5e7eb'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!proveedor.nombre.trim() || !proveedor.email.trim()) {
      setErrorMsg('Nombre y email del proveedor son obligatorios.')
      return
    }
    if (!producto.nombre.trim() || !producto.sku.trim() || !producto.precio) {
      setErrorMsg('Nombre, SKU y precio del producto son obligatorios.')
      return
    }
    if (isNaN(Number(producto.precio)) || Number(producto.precio) <= 0) {
      setErrorMsg('El precio debe ser un número mayor a 0.')
      return
    }

    setFormState('loading')

    const { error } = await supabase.from('solicitudes_productos').insert({
      proveedor_nombre:  proveedor.nombre.trim(),
      proveedor_empresa: proveedor.empresa.trim() || null,
      proveedor_email:   proveedor.email.trim().toLowerCase(),
      proveedor_telefono: proveedor.telefono.trim() || null,
      producto_nombre:   producto.nombre.trim(),
      producto_sku:      producto.sku.trim().toUpperCase(),
      producto_descripcion: producto.descripcion.trim() || null,
      producto_precio:   Number(producto.precio),
      producto_stock:    Number(producto.stock) || 0,
      categoria_id:      producto.categoria_id ? Number(producto.categoria_id) : null,
      imagen_url:        producto.imagen_url.trim() || null,
      estado:            'pendiente',
    })

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Ya existe una solicitud con ese SKU. Usa un SKU diferente.')
      } else {
        setErrorMsg('Error al enviar la solicitud. Intenta de nuevo.')
      }
      setFormState('error')
      return
    }

    setFormState('success')
  }

  function resetForm() {
    setProveedor({ nombre: '', empresa: '', email: '', telefono: '' })
    setProducto({ nombre: '', sku: '', descripcion: '', precio: '', stock: '', categoria_id: '', imagen_url: '' })
    setFormState('idle')
    setErrorMsg('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: NAVY, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: PINK, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>OE</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#fff' }}>Order</span>
            <span style={{ color: PINK }}>Express</span>
          </span>
          <span style={{ color: '#ffffff60', fontSize: 13, marginLeft: 8 }}>/ Portal de Proveedores</span>
        </div>
        <a href="/" style={{ color: '#ffffff80', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Volver a la tienda</a>
      </header>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a1d4e 100%)`, padding: '48px 32px', textAlign: 'center' }}>
        <span style={{ background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Portal Proveedores
        </span>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '16px 0 8px', letterSpacing: '-0.02em' }}>
          Registra tu producto
        </h1>
        <p style={{ color: '#ffffff80', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
          Completa el formulario y nuestro equipo revisará tu solicitud. Te contactaremos en 24-48 horas hábiles.
        </p>

        {/* Pasos */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginTop: 36, flexWrap: 'wrap' }}>
          {[
            { n: '1', label: 'Llena el formulario' },
            { n: '2', label: 'Revisamos tu solicitud' },
            { n: '3', label: 'Publicamos tu producto' },
          ].map((step, i) => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 24px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{step.n}</div>
                <span style={{ color: '#ffffff90', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 1, background: '#ffffff30', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 60px' }}>

        {formState === 'success' ? (
          /* ---- Pantalla de éxito ---- */
          <div style={{ background: '#fff', borderRadius: 20, padding: '56px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
            <div style={{ width: 72, height: 72, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✓</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: NAVY, marginBottom: 10 }}>¡Solicitud enviada!</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Recibimos tu producto. Nuestro equipo lo revisará y te contactaremos a <strong>{proveedor.email}</strong> en 24-48 horas hábiles.
            </p>
            <div style={{ display: 'inline-block', background: '#f0f2f8', borderRadius: 12, padding: '14px 24px', marginBottom: 32, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Producto enviado</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: NAVY }}>{producto.nombre}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>SKU: {producto.sku.toUpperCase()} · ${Number(producto.precio).toLocaleString('es-MX')}</p>
            </div>
            <br />
            <button onClick={resetForm}
              style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Enviar otro producto
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Error global */}
            {errorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 24 }}>
                {errorMsg}
              </div>
            )}

            {/* ---- Sección: Datos del proveedor ---- */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, background: `${NAVY}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>👤</div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Datos del proveedor</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Tu información de contacto</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: PINK }}>*</span></label>
                  <input style={inputStyle} value={proveedor.nombre} onChange={e => setP('nombre', e.target.value)}
                    placeholder="Tu nombre" required onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Empresa / Marca</label>
                  <input style={inputStyle} value={proveedor.empresa} onChange={e => setP('empresa', e.target.value)}
                    placeholder="Nombre de tu empresa (opcional)" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Email de contacto <span style={{ color: PINK }}>*</span></label>
                  <input type="email" style={inputStyle} value={proveedor.email} onChange={e => setP('email', e.target.value)}
                    placeholder="proveedor@email.com" required onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" style={inputStyle} value={proveedor.telefono} onChange={e => setP('telefono', e.target.value)}
                    placeholder="+52 55 0000 0000 (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            {/* ---- Sección: Datos del producto ---- */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, background: `${PINK}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📦</div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Datos del producto</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Información del artículo a publicar</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Nombre del producto <span style={{ color: PINK }}>*</span></label>
                    <input style={inputStyle} value={producto.nombre} onChange={e => setProd('nombre', e.target.value)}
                      placeholder="Ej: Teclado mecánico TKL RGB" required onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>SKU / Código <span style={{ color: PINK }}>*</span></label>
                    <input style={inputStyle} value={producto.sku} onChange={e => setProd('sku', e.target.value)}
                      placeholder="Ej: TEC-001" required onFocus={focus} onBlur={blur} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Descripción</label>
                  <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' } as React.CSSProperties}
                    value={producto.descripcion} onChange={e => setProd('descripcion', e.target.value)}
                    placeholder="Describe el producto: características, materiales, dimensiones, etc."
                    onFocus={focus} onBlur={blur} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Precio (MXN) <span style={{ color: PINK }}>*</span></label>
                    <input type="number" min="0" step="0.01" style={inputStyle} value={producto.precio}
                      onChange={e => setProd('precio', e.target.value)}
                      placeholder="0.00" required onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stock disponible</label>
                    <input type="number" min="0" style={inputStyle} value={producto.stock}
                      onChange={e => setProd('stock', e.target.value)}
                      placeholder="0" onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={producto.categoria_id}
                      onChange={e => setProd('categoria_id', e.target.value)}
                      onFocus={focus} onBlur={blur}>
                      <option value="">Sin categoría</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>URL de imagen</label>
                  <input type="url" style={inputStyle} value={producto.imagen_url}
                    onChange={e => setProd('imagen_url', e.target.value)}
                    placeholder="https://... (enlace directo a la imagen del producto)"
                    onFocus={focus} onBlur={blur} />
                  {producto.imagen_url && (
                    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', width: 100, height: 100, border: '1px solid #e5e7eb' }}>
                      <img src={producto.imagen_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Aviso legal ---- */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                <strong>Nota:</strong> Al enviar este formulario confirmas que eres el titular o representante autorizado del producto y que la información proporcionada es verídica. El equipo de Order Express revisará y validará cada solicitud antes de su publicación.
              </p>
            </div>

            {/* ---- Botón de envío ---- */}
            <button type="submit" disabled={formState === 'loading'}
              style={{ width: '100%', background: formState === 'loading' ? '#9ca3af' : PINK, color: '#fff', border: 'none', padding: '15px 0', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: formState === 'loading' ? 'default' : 'pointer', letterSpacing: '0.01em', boxShadow: formState === 'loading' ? 'none' : `0 4px 16px ${PINK}50` }}>
              {formState === 'loading' ? 'Enviando solicitud...' : 'Enviar solicitud de producto →'}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: NAVY, padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ color: '#ffffff50', fontSize: 12, margin: 0 }}>
          © 2026 OrderExpress · ¿Dudas? Escríbenos a soporte@orderexpress.mx
        </p>
      </div>
    </div>
  )
}
