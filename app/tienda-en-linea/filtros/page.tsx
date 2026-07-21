'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SubNav from '../_subnav'

const NAVY = '#252855'
const PINK = '#e7226d'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { topbar_btn1: string; topbar_btn2: string }
const DEFAULTS: Fields = { topbar_btn1: 'Nuevo', topbar_btn2: 'Ofertas' }

export default function FiltrosPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('config_storefront').select('topbar_btn1,topbar_btn2').eq('id', 1).single()
      .then(({ data }) => { if (data) setF({ ...DEFAULTS, ...data }) })
  }, [])

  function set(key: keyof Fields, val: string) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SubNav />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Filtros</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Los dos botones de acceso rápido que aparecen en el topbar de la tienda junto al buscador.</p>

        {/* Preview topbar */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Vista previa del topbar</p>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: PINK, color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{f.topbar_btn1 || 'Nuevo'}</div>
            <div style={{ background: '#fff', color: NAVY, border: `1.5px solid ${NAVY}`, padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{f.topbar_btn2 || 'Ofertas'}</div>
            <div style={{ flex: 1, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔍 Buscar productos
            </div>
          </div>
        </div>

        {/* Editor */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Etiquetas de los botones</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={lbl}>Botón 1 → lleva a Novedades</label>
              <input style={inp} value={f.topbar_btn1} onChange={e => set('topbar_btn1', e.target.value)} placeholder="Nuevo" />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Se muestra resaltado en color de acento</p>
            </div>
            <div>
              <label style={lbl}>Botón 2 → lleva a Ofertas</label>
              <input style={inp} value={f.topbar_btn2} onChange={e => set('topbar_btn2', e.target.value)} placeholder="Ofertas" />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Se muestra con borde, sin relleno</p>
            </div>
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
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa</h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>Los cambios se reflejan en la tienda al guardar.</p>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', background: '#eff6ff', color: '#0049ff', border: '1px solid #bfdbfe', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          Abrir tienda ↗
        </a>
      </div>
    </div>
  )
}
