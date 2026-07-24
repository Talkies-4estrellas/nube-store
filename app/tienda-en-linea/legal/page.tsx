'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const ta: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
  resize: 'vertical', minHeight: 100,
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { politica_envio: string; politica_devolucion: string; terminos: string }
const DEFAULTS: Fields = { politica_envio: '', politica_devolucion: '', terminos: '' }

type PagosSecretos = {
  openpay_merchant_id: string; openpay_private_key: string; openpay_mode: 'sandbox' | 'live'
  paypal_client_id: string; paypal_client_secret: string; paypal_mode: 'sandbox' | 'live'
  mp_access_token: string
}
const PAGOS_DEFAULTS: PagosSecretos = {
  openpay_merchant_id: '', openpay_private_key: '', openpay_mode: 'sandbox',
  paypal_client_id: '', paypal_client_secret: '', paypal_mode: 'sandbox',
  mp_access_token: '',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inp, cursor: 'pointer' }

const secciones = [
  {
    key: 'politica_envio' as const,
    label: 'Política de envíos',
    icon: '🚚',
    placeholder: 'Ej: Los pedidos se procesan en 1-2 días hábiles. El envío estándar tarda de 3 a 5 días. Hacemos envíos a toda la república...',
    hint: 'Aparece en la sección Soporte de la tienda bajo "Envío y entrega".',
  },
  {
    key: 'politica_devolucion' as const,
    label: 'Política de devoluciones',
    icon: '↩️',
    placeholder: 'Ej: Aceptamos devoluciones dentro de los 30 días posteriores a la entrega. El producto debe estar en su empaque original...',
    hint: 'Aparece en la sección Soporte bajo "Cambios y devoluciones".',
  },
  {
    key: 'terminos' as const,
    label: 'Términos y condiciones',
    icon: '📄',
    placeholder: 'Ej: Al realizar una compra en nuestra tienda, aceptas los siguientes términos y condiciones de uso...',
    hint: 'Se muestra en el pie de página de la tienda.',
  },
]

export default function LegalPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [pagos, setPagos] = useState<PagosSecretos>(PAGOS_DEFAULTS)
  const [savingPagos, setSavingPagos] = useState(false)
  const [savedPagos, setSavedPagos] = useState(false)
  const [errorPagos, setErrorPagos] = useState('')

  useEffect(() => {
    supabase.from('config_storefront').select('politica_envio,politica_devolucion,terminos').eq('id', 1).single()
      .then(({ data }) => { if (data) setF({ ...DEFAULTS, ...data }) })
    supabase.from('config_pagos_secretos').select('*').eq('id', 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setErrorPagos('No se pudieron cargar las llaves: ' + error.message); return }
        if (data) setPagos({ ...PAGOS_DEFAULTS, ...data })
      })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }
  function setPago<K extends keyof PagosSecretos>(key: K, val: PagosSecretos[K]) { setPagos(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function guardarPagos() {
    setSavingPagos(true)
    setErrorPagos('')
    const { error } = await supabase.from('config_pagos_secretos').upsert({ id: 1, ...pagos, updated_at: new Date().toISOString() })
    setSavingPagos(false)
    if (error) { setErrorPagos('No se pudo guardar: ' + error.message); return }
    setSavedPagos(true)
    setTimeout(() => setSavedPagos(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Legal / Envíos</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Textos legales y políticas que aparecen en la sección de Soporte y el pie de la tienda.</p>

        {secciones.map(s => (
          <div key={s.key} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{s.hint}</p>
              </div>
              {f[s.key] && (
                <span style={{ marginLeft: 'auto', background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  Configurado
                </span>
              )}
            </div>
            <textarea style={ta} value={f[s.key]} onChange={e => set(s.key, e.target.value)} placeholder={s.placeholder} />
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={saving} style={{
            background: saved ? '#059669' : NAVY, color: '#fff', border: 'none',
            padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
          }}>
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>

        {/* ---- Claves de las pasarelas de pago ---- */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Claves de pago</p>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: '#9ca3af' }}>
            Credenciales de las pasarelas. Solo las puede ver y editar un administrador — no se exponen en la tienda pública.
          </p>

          {/* BBVA / OpenPay */}
          <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>BBVA (OpenPay)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Merchant ID</label>
              <input style={inp} value={pagos.openpay_merchant_id} onChange={e => setPago('openpay_merchant_id', e.target.value)} placeholder="mxxxxxxxxxxxx" />
            </div>
            <div>
              <label style={lbl}>Llave privada</label>
              <input type="password" style={inp} value={pagos.openpay_private_key} onChange={e => setPago('openpay_private_key', e.target.value)} placeholder="sk_xxxxxxxxxxxx" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Modo</label>
              <select style={selectStyle} value={pagos.openpay_mode} onChange={e => setPago('openpay_mode', e.target.value as 'sandbox' | 'live')}>
                <option value="sandbox">Pruebas (sandbox)</option>
                <option value="live">Producción (live)</option>
              </select>
            </div>
          </div>

          {/* PayPal */}
          <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>PayPal</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Client ID</label>
              <input style={inp} value={pagos.paypal_client_id} onChange={e => setPago('paypal_client_id', e.target.value)} placeholder="AeXXXXXXXXXXXXXXXXXXXXXX" />
            </div>
            <div>
              <label style={lbl}>Client Secret</label>
              <input type="password" style={inp} value={pagos.paypal_client_secret} onChange={e => setPago('paypal_client_secret', e.target.value)} placeholder="EXXXXXXXXXXXXXXXXXXXXXXX" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Modo</label>
              <select style={selectStyle} value={pagos.paypal_mode} onChange={e => setPago('paypal_mode', e.target.value as 'sandbox' | 'live')}>
                <option value="sandbox">Pruebas (sandbox)</option>
                <option value="live">Producción (live)</option>
              </select>
            </div>
          </div>

          {/* Mercado Pago */}
          <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Mercado Pago</p>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Access Token</label>
            <input type="password" style={inp} value={pagos.mp_access_token} onChange={e => setPago('mp_access_token', e.target.value)} placeholder="APP_USR-xxxx o TEST-xxxx" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Usa el token que empieza con TEST- para pruebas, o APP_USR- para producción.</p>
          </div>

          {errorPagos && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
              {errorPagos}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={guardarPagos} disabled={savingPagos} style={{
              background: savedPagos ? '#059669' : NAVY, color: '#fff', border: 'none',
              padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
            }}>
              {savingPagos ? 'Guardando...' : savedPagos ? '¡Guardado!' : 'Guardar claves'}
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>¿Dónde aparece?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {secciones.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: NAVY }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{s.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, margin: 0 }}>Estado actual</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {secciones.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#374151' }}>{s.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: f[s.key] ? '#d1fae5' : '#f3f4f6', color: f[s.key] ? '#065f46' : '#9ca3af' }}>
                  {f[s.key] ? 'OK' : 'Vacío'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          Abrir tienda ↗
        </a>
      </div>
    </div>
  )
}
