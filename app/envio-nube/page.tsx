'use client'

const tarifas = [
  { destino: 'CDMX', precio: '$109', paqueteria: 'Estafeta' },
  { destino: 'Guadalajara', precio: '$118', paqueteria: 'Estafeta' },
  { destino: 'Monterrey', precio: '$118', paqueteria: 'Estafeta' },
]

const paqueterias = ['DHL', 'FedEx', 'Estafeta', 'Redpack', 'J&T Express', 'Paquetexpress']

export default function EnvioNubePage() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '40px 48px',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        marginBottom: 32,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          flexShrink: 0,
          width: 200,
          height: 160,
          background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 52 }}>📦</span>
          <span style={{ fontSize: 36 }}>🚚</span>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            LOGÍSTICA
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 12 }}>
            Envío Nube: la solución logística más fácil y económica para tu tienda
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Envía con tarifas exclusivas y ten acceso a paqueterías integradas como DHL, FedEx. Todo en un sólo lugar y al mejor precio.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Activar Envío Nube
            </button>
            <button style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Ver más
            </button>
          </div>
        </div>
      </div>

      {/* Tarifas */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 16 }}>Ahorra con Envío Nube</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {tarifas.map((t) => (
          <div key={t.destino} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 12 }}>CDMX → {t.destino}</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>📦 1kg · Envío estándar</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>desde</span>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#111' }}>{t.precio}</span>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Con Envío Nube · {t.paqueteria}</p>
          </div>
        ))}
      </div>

      {/* Paqueterías */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 16 }}>Paqueterías disponibles</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {paqueterias.map((p) => (
          <div key={p} style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '16px 12px',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 13,
            color: '#374151',
          }}>{p}</div>
        ))}
      </div>
    </div>
  )
}
