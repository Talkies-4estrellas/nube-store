'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PASSWORD_CUENTA_DEFAULT } from '@/lib/cuentas'

type ProveedorForm = {
  nombre: string
  empresa: string
  telefono: string
  email: string
}

type Props = {
  onClose: () => void
  onSave: () => void
}

const empty: ProveedorForm = { nombre: '', empresa: '', telefono: '', email: '' }

export default function ProveedorModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState<ProveedorForm>(empty)
  const [errors, setErrors] = useState<Partial<ProveedorForm>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const [creado, setCreado] = useState<{ email: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  function set(key: keyof ProveedorForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
    setServerError('')
  }

  function validate() {
    const errs: Partial<ProveedorForm> = {}
    if (!form.nombre.trim()) errs.nombre = 'Requerido'
    if (!form.email.trim()) errs.email = 'Requerido'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    setServerError('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/crear-proveedor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        empresa: form.empresa.trim() || null,
        telefono: form.telefono.trim() || null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) { setServerError(data.error || 'No se pudo crear el proveedor'); return }
    setCreado({ email: form.email.trim() })
    onSave()
  }

  function copiarCredenciales() {
    const texto = `Email: ${creado?.email}\nContraseña: ${PASSWORD_CUENTA_DEFAULT}`
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {creado ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 6 }}>Proveedor creado con éxito</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Comparte estos datos con la persona que va a usar la cuenta.
            </p>

            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', textAlign: 'left', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Email</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{creado.email}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Contraseña</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0, fontFamily: 'monospace' }}>{PASSWORD_CUENTA_DEFAULT}</p>
            </div>

            <button type="button" onClick={copiarCredenciales}
              style={{ width: '100%', background: copiado ? '#d1fae5' : '#eff6ff', color: copiado ? '#065f46' : '#0049ff', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
              {copiado ? '✓ Copiado' : '📋 Copiar email y contraseña'}
            </button>

            <button type="button" onClick={onClose}
              style={{ width: '100%', background: '#0049ff', color: '#fff', border: 'none', padding: '11px 0', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Listo
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Agregar proveedor</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {serverError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  {serverError}
                </div>
              )}

              <Field label="Nombre completo *" error={errors.nombre}>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Carlos Ramírez" style={input(!!errors.nombre)} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Empresa">
                  <input value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Nombre comercial" style={input(false)} />
                </Field>
                <Field label="Teléfono">
                  <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+52 55 0000 0000" style={input(false)} />
                </Field>
              </div>

              <Field label="Email *" error={errors.email}>
                <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" type="email" style={input(!!errors.email)} />
              </Field>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🔑</span>
                <p style={{ fontSize: 12, color: '#1e40af', margin: 0, fontWeight: 600 }}>
                  No se pide contraseña — la cuenta se crea con la contraseña predeterminada <strong style={{ fontFamily: 'monospace' }}>{PASSWORD_CUENTA_DEFAULT}</strong>. Al guardar podrás copiarla para pasársela al proveedor.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {saving ? 'Creando...' : 'Guardar proveedor'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

function input(hasError: boolean): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
}
