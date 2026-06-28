'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ClienteForm = {
  nombre: string
  email: string
  telefono: string
  ciudad: string
  tag: 'Nuevo' | 'Regular' | 'VIP'
}

type Props = {
  inicial?: ClienteForm & { id?: string }
  onClose: () => void
  onSave: () => void
}

const empty: ClienteForm = { nombre: '', email: '', telefono: '', ciudad: '', tag: 'Nuevo' }

export default function ClienteModal({ inicial, onClose, onSave }: Props) {
  const [form, setForm] = useState<ClienteForm>(inicial ?? empty)
  const [errors, setErrors] = useState<Partial<ClienteForm>>({})
  const [saving, setSaving] = useState(false)
  const esEdicion = !!inicial?.id

  useEffect(() => { setForm(inicial ?? empty) }, [inicial])

  function set(key: keyof ClienteForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const errs: Partial<ClienteForm> = {}
    if (!form.nombre.trim()) errs.nombre = 'Requerido'
    if (!form.email.trim()) errs.email = 'Requerido'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)

    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim() || null,
      ciudad: form.ciudad.trim() || null,
      tag: form.tag,
    }

    const { error } = esEdicion
      ? await supabase.from('clientes').update(payload).eq('id', inicial!.id!)
      : await supabase.from('clientes').insert(payload)

    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{esEdicion ? 'Editar cliente' : 'Agregar cliente'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Nombre completo *" error={errors.nombre}>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Ana García" style={input(!!errors.nombre)} />
          </Field>

          <Field label="Email *" error={errors.email}>
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" type="email" style={input(!!errors.email)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Teléfono">
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+52 55 0000 0000" style={input(false)} />
            </Field>
            <Field label="Ciudad">
              <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="CDMX" style={input(false)} />
            </Field>
          </div>

          <Field label="Tipo de cliente">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Nuevo', 'Regular', 'VIP'] as const).map(t => (
                <button key={t} onClick={() => set('tag', t)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '2px solid',
                  borderColor: form.tag === t ? '#0049ff' : '#e5e7eb',
                  background: form.tag === t ? '#eff6ff' : '#fff',
                  color: form.tag === t ? '#0049ff' : '#374151',
                }}>{t}</button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Guardar cliente'}
            </button>
          </div>
        </div>
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
