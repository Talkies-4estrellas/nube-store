'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SubNav from '../_subnav'

const NAVY = '#252855'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { whatsapp: string; email_contacto: string; instagram: string; telefono: string; facebook: string }
const DEFAULTS: Fields = { whatsapp: '', email_contacto: '', instagram: '', telefono: '', facebook: '' }

export default function RedesSocialesPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('whatsapp,email_contacto,instagram,telefono,facebook').eq('id', 1).single()
      .then(({ data }) => { if (data) setF({ ...DEFAULTS, ...data }) })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const contactItems = [
    { key: 'whatsapp'       as const, label: 'WhatsApp',        icon: '💬', placeholder: '+52 55 0000 0000',   hint: 'Se usa para el botón de contacto directo en soporte' },
    { key: 'telefono'       as const, label: 'Teléfono',         icon: '📞', placeholder: '+52 55 0000 0001',   hint: 'Teléfono de atención al cliente' },
    { key: 'email_contacto' as const, label: 'Email de contacto',icon: '✉️', placeholder: 'hola@tienda.com',    hint: 'Email visible en la sección de soporte' },
    { key: 'instagram'      as const, label: 'Instagram',         icon: '📸', placeholder: '@tutienda',          hint: 'Incluye el @' },
    { key: 'facebook'       as const, label: 'Facebook',          icon: '👍', placeholder: 'facebook.com/tutienda', hint: 'URL completa o nombre de página' },
  ]

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SubNav />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Redes sociales y contacto</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Información de contacto que aparece en la sección de Soporte de la tienda.</p>

        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {contactItems.map(item => (
              <div key={item.key}>
                <label style={lbl}>
                  <span style={{ marginRight: 6 }}>{item.icon}</span>{item.label}
                </label>
                <input style={inp} value={f[item.key]} onChange={e => set(item.key, e.target.value)} placeholder={item.placeholder} />
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={saving} style={{
            background: saved ? '#059669' : NAVY, color: '#fff', border: 'none',
            padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
          }}>
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa</h3>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>Los cambios se reflejan en la tienda al guardar.</p>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
            Abrir tienda ↗
          </a>
        </div>

        {/* Mini resumen */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '0 0 10px' }}>Configurado</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contactItems.map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: f[item.key] ? '#374151' : '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f[item.key] || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
