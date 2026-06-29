'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

type Section = 'negocio' | 'contacto' | 'pagos' | 'notificaciones'

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: 'negocio', label: 'Datos del negocio', icon: 'store' },
  { id: 'contacto', label: 'Contacto', icon: 'users' },
  { id: 'pagos', label: 'Métodos de pago', icon: 'creditcard' },
  { id: 'notificaciones', label: 'Notificaciones', icon: 'warning' },
]

const monedas = ['MXN — Peso mexicano', 'USD — Dólar estadounidense', 'ARS — Peso argentino', 'COP — Peso colombiano', 'CLP — Peso chileno']

export default function ConfiguracionPage() {
  const [section, setSection] = useState<Section>('negocio')
  const [saved, setSaved] = useState(false)

  const [negocio, setNegocio] = useState({ nombre: 'Order Express', moneda: 'MXN — Peso mexicano', zona: 'America/Mexico_City', idioma: 'Español (México)' })
  const [contacto, setContacto] = useState({ email: '', telefono: '', whatsapp: '', direccion: '', ciudad: '', pais: 'México' })
  const [pagos, setPagos] = useState({ efectivo: true, transferencia: true, tarjeta: false, mercadopago: false })
  const [notif, setNotif] = useState({ stock_bajo: true, nueva_venta: true, email_resumen: false })

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Sub-nav */}
      <aside style={{ background: '#fff', borderRadius: 12, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '10px 16px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuración</p>
        {navItems.map(item => {
          const active = section === item.id
          return (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
              fontSize: 13, color: active ? '#0049ff' : '#374151', fontWeight: active ? 700 : 400,
              background: active ? '#eff6ff' : 'transparent',
              borderLeft: `3px solid ${active ? '#0049ff' : 'transparent'}`,
              border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
              borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: active ? '#0049ff' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <Icon name={item.icon} size={16} color={active ? '#0049ff' : '#9ca3af'} />
              {item.label}
            </button>
          )
        })}
      </aside>

      {/* Contenido */}
      <div>
        {section === 'negocio' && (
          <Card title="Datos del negocio">
            <Field label="Nombre del negocio">
              <input value={negocio.nombre} onChange={e => setNegocio(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Moneda">
              <select value={negocio.moneda} onChange={e => setNegocio(p => ({ ...p, moneda: e.target.value }))} style={inputStyle}>
                {monedas.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Zona horaria">
              <select value={negocio.zona} onChange={e => setNegocio(p => ({ ...p, zona: e.target.value }))} style={inputStyle}>
                {['America/Mexico_City', 'America/Bogota', 'America/Santiago', 'America/Buenos_Aires', 'America/Lima'].map(z => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Idioma">
              <select value={negocio.idioma} onChange={e => setNegocio(p => ({ ...p, idioma: e.target.value }))} style={inputStyle}>
                {['Español (México)', 'Español (Argentina)', 'Español (Colombia)', 'Inglés'].map(i => <option key={i}>{i}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'contacto' && (
          <Card title="Información de contacto">
            <Field label="Email de contacto">
              <input type="email" placeholder="hola@tunegocio.com" value={contacto.email} onChange={e => setContacto(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Teléfono">
              <input placeholder="+52 55 0000 0000" value={contacto.telefono} onChange={e => setContacto(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="WhatsApp">
              <input placeholder="+52 55 0000 0000" value={contacto.whatsapp} onChange={e => setContacto(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input placeholder="Calle y número" value={contacto.direccion} onChange={e => setContacto(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Ciudad">
              <input placeholder="Ciudad de México" value={contacto.ciudad} onChange={e => setContacto(p => ({ ...p, ciudad: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="País">
              <select value={contacto.pais} onChange={e => setContacto(p => ({ ...p, pais: e.target.value }))} style={inputStyle}>
                {['México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'España'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'pagos' && (
          <Card title="Métodos de pago aceptados">
            <Toggle label="Efectivo" desc="Acepta pagos en efectivo en tu punto de venta" value={pagos.efectivo} onChange={v => setPagos(p => ({ ...p, efectivo: v }))} />
            <Toggle label="Transferencia bancaria" desc="SPEI, depósito o transferencia directa" value={pagos.transferencia} onChange={v => setPagos(p => ({ ...p, transferencia: v }))} />
            <Toggle label="Tarjeta de crédito / débito" desc="Requiere terminal bancaria o lector conectado" value={pagos.tarjeta} onChange={v => setPagos(p => ({ ...p, tarjeta: v }))} />
            <Toggle label="Mercado Pago" desc="Link de pago o QR — requiere cuenta activa" value={pagos.mercadopago} onChange={v => setPagos(p => ({ ...p, mercadopago: v }))} />
          </Card>
        )}

        {section === 'notificaciones' && (
          <Card title="Notificaciones">
            <Toggle label="Alerta de stock bajo" desc="Notificación cuando un producto tiene 3 unidades o menos" value={notif.stock_bajo} onChange={v => setNotif(p => ({ ...p, stock_bajo: v }))} />
            <Toggle label="Nueva venta" desc="Notificación al registrar un pedido nuevo" value={notif.nueva_venta} onChange={v => setNotif(p => ({ ...p, nueva_venta: v }))} />
            <Toggle label="Resumen diario por email" desc="Recibe un resumen de ventas cada día al cierre" value={notif.email_resumen} onChange={v => setNotif(p => ({ ...p, email_resumen: v }))} />
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={handleSave} style={{ background: saved ? '#059669' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 20 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: value ? '#0049ff' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box',
}
