'use client'

const features = [
  { icon: '🛒', title: 'Registra ventas en persona', desc: 'Cobra rápido con efectivo, tarjeta o transferencia desde cualquier dispositivo.' },
  { icon: '📦', title: 'Control de inventario', desc: 'Tu stock se actualiza automáticamente con cada venta en línea o en tienda.' },
  { icon: '📊', title: 'Reportes unificados', desc: 'Ve todas tus ventas, online y físicas, en un solo panel de estadísticas.' },
  { icon: '🧾', title: 'Tickets y recibos', desc: 'Genera e imprime tickets o envíalos por email a tus clientes al instante.' },
]

export default function PuntoDeVentaPage() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '60px 48px',
        display: 'flex',
        alignItems: 'center',
        gap: 60,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        {/* Ilustración */}
        <div style={{ flexShrink: 0, width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            {/* Toldo */}
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 6 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ width: 26, height: 26, background: i % 2 === 0 ? '#93c5fd' : '#3b82f6', borderRadius: '0 0 13px 13px' }} />
              ))}
            </div>
            {/* Cuerpo tienda */}
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <div>
                <div style={{ width: 30, height: 30, background: '#60a5fa', borderRadius: '50%', marginBottom: 4 }} />
                <div style={{ width: 38, height: 50, background: '#3b82f6', borderRadius: '8px 8px 0 0' }} />
              </div>
              <div style={{ width: 62, height: 46, background: '#1e40af', borderRadius: 6 }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            PUNTO DE VENTA
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 12 }}>
            Tu aliado para vender en persona
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Accede al Punto de Venta para registrar tus ventas físicas y gestionar todo tu negocio en un solo lugar.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Agregar productos
            </button>
            <button style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Ir a Punto de Venta
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, textDecoration: 'none', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 20, background: '#fff' }}>
          ❓ Más sobre Punto de Venta ↗
        </a>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 16 }}>¿Qué puedes hacer con Punto de Venta?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {features.map((f) => (
          <div key={f.title} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{f.icon}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#111' }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
