'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Home, Search, Truck, UserCircle2, ShoppingBag, Sparkles, Heart, BadgePercent,
  ShoppingCart, Headphones, LifeBuoy, MessageCircle, LogIn, Check, ShieldCheck,
  PackageCheck, Send, Grid2x2, type LucideIcon,
} from 'lucide-react'

const NAVY = '#252855'
const PINK = '#e7226d'

const ICONOS: Record<string, LucideIcon> = {
  home: Home, search: Search, truck: Truck, 'user-circle': UserCircle2,
  'shopping-bag': ShoppingBag, sparkles: Sparkles, heart: Heart, 'badge-percent': BadgePercent,
  'shopping-cart': ShoppingCart, headphones: Headphones, 'life-buoy': LifeBuoy,
  'message-circle': MessageCircle, 'log-in': LogIn, check: Check, 'shield-check': ShieldCheck,
  'package-check': PackageCheck, send: Send, 'grid-2x2': Grid2x2,
}
const ICONO_KEYS = Object.keys(ICONOS)

type NavItem = { label: string; icon: string }
type BotonExtra = { id: string; label: string; icon: string; url: string; nueva_pestana: boolean }
type NavMovilConfig = { inicio?: NavItem; buscar?: NavItem; rastreo?: NavItem; perfil?: NavItem; extra?: BotonExtra[] }

const FIJOS_DEFAULT: Record<'inicio' | 'buscar' | 'rastreo' | 'perfil', NavItem & { desc: string }> = {
  inicio:  { label: 'Inicio',  icon: 'home',        desc: 'Vuelve a la página principal de la tienda' },
  buscar:  { label: 'Buscar',  icon: 'search',       desc: 'Abre el buscador de productos' },
  rastreo: { label: 'Rastreo', icon: 'truck',        desc: 'Lleva a "Mis pedidos" (o a iniciar sesión)' },
  perfil:  { label: 'Perfil',  icon: 'user-circle',  desc: 'Lleva al panel de la cuenta (o a iniciar sesión)' },
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const Sel = ICONOS[value] ?? Home
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAbierto(v => !v)}
        style={{ width: 40, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY }}>
        <Sel size={18} />
      </button>
      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{ position: 'absolute', top: 46, left: 0, zIndex: 21, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, width: 216 }}>
            {ICONO_KEYS.map(key => {
              const C = ICONOS[key]
              const activo = key === value
              return (
                <button key={key} type="button" title={key} onClick={() => { onChange(key); setAbierto(false) }}
                  style={{ width: 32, height: 32, border: activo ? `2px solid ${PINK}` : '1px solid transparent', borderRadius: 6, background: activo ? `${PINK}10` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activo ? PINK : '#374151' }}>
                  <C size={16} />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function NavegacionMovilPage() {
  const [fijos, setFijos] = useState<Record<'inicio' | 'buscar' | 'rastreo' | 'perfil', NavItem>>({
    inicio: FIJOS_DEFAULT.inicio, buscar: FIJOS_DEFAULT.buscar, rastreo: FIJOS_DEFAULT.rastreo, perfil: FIJOS_DEFAULT.perfil,
  })
  const [extra, setExtra] = useState<BotonExtra[]>([])
  const [fondoAzul, setFondoAzul] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('config_storefront').select('nav_movil, fondo_logo').eq('id', 1).single()
      .then(({ data, error }) => {
        if (error) { setError('No se pudo cargar la configuración: ' + error.message); return }
        setFondoAzul(data?.fondo_logo === 'azul')
        const cfg = data?.nav_movil as NavMovilConfig | null
        if (cfg) {
          setFijos({
            inicio: cfg.inicio ?? FIJOS_DEFAULT.inicio,
            buscar: cfg.buscar ?? FIJOS_DEFAULT.buscar,
            rastreo: cfg.rastreo ?? FIJOS_DEFAULT.rastreo,
            perfil: cfg.perfil ?? FIJOS_DEFAULT.perfil,
          })
          setExtra(Array.isArray(cfg.extra) ? cfg.extra : [])
        }
      })
  }, [])

  function setFijo(key: keyof typeof fijos, campo: keyof NavItem, valor: string) {
    setFijos(prev => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }))
  }
  function agregarBoton() {
    setExtra(prev => [...prev, { id: crypto.randomUUID(), label: '', icon: 'grid-2x2', url: '', nueva_pestana: true }])
  }
  function actualizarBoton(id: string, campo: keyof BotonExtra, valor: string | boolean) {
    setExtra(prev => prev.map(b => b.id === id ? { ...b, [campo]: valor } : b))
  }
  function eliminarBoton(id: string) {
    setExtra(prev => prev.filter(b => b.id !== id))
  }

  async function guardar() {
    setSaving(true)
    setError('')
    const nav_movil: NavMovilConfig = { ...fijos, extra }
    const { error } = await supabase.from('config_storefront').upsert({ id: 1, nav_movil, updated_at: new Date().toISOString() })
    setSaving(false)
    if (error) { setError('No se pudo guardar: ' + error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalBotones = 4 + extra.filter(b => b.label.trim() && b.url.trim()).length

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Navegación móvil</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Edita la barra inferior que ven los clientes en la tienda desde el celular: nombre, ícono y botones adicionales.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Botones fijos */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Botones fijos</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Puedes cambiar el nombre y el ícono — el destino de cada uno no se puede cambiar</p>
          </div>
          {(Object.keys(FIJOS_DEFAULT) as (keyof typeof FIJOS_DEFAULT)[]).map((key, i, arr) => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14, alignItems: 'center', padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <IconPicker value={fijos[key].icon} onChange={v => setFijo(key, 'icon', v)} />
              <div>
                <input style={{ ...inp, fontWeight: 700, marginBottom: 4 }} value={fijos[key].label}
                  onChange={e => setFijo(key, 'label', e.target.value)} placeholder={FIJOS_DEFAULT[key].label} maxLength={12} />
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{FIJOS_DEFAULT[key].desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Botones personalizados */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Botones adicionales</p>
            <button type="button" onClick={agregarBoton}
              style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Agregar botón
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
            Se agregan al final de la barra inferior — por ejemplo un enlace a WhatsApp o a tus redes sociales.
          </p>

          {extra.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Todavía no agregaste ningún botón.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {extra.map(btn => (
                <div key={btn.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'center', padding: 10, border: '1px solid #f3f4f6', borderRadius: 10 }}>
                  <IconPicker value={btn.icon} onChange={v => actualizarBoton(btn.id, 'icon', v)} />
                  <input style={inp} value={btn.label}
                    onChange={e => actualizarBoton(btn.id, 'label', e.target.value)} placeholder="Nombre del botón" maxLength={12} />
                  <input style={inp} value={btn.url}
                    onChange={e => actualizarBoton(btn.id, 'url', e.target.value)} placeholder="https://..." />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      <input type="checkbox" checked={btn.nueva_pestana} onChange={e => actualizarBoton(btn.id, 'nueva_pestana', e.target.checked)} />
                      Pestaña nueva
                    </label>
                    <button type="button" onClick={() => eliminarBoton(btn.id)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalBotones > 5 && (
            <p style={{ fontSize: 11, color: '#d97706', marginTop: 12 }}>
              ⚠️ Con {totalBotones} botones la barra se verá muy apretada en pantallas pequeñas — se recomiendan 5 como máximo.
            </p>
          )}
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

      {/* Panel derecho: vista previa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Vista previa</h3>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 14 }}>
            El fondo sigue lo elegido en <strong>Diseño → Fondo del logo</strong>.
          </p>
          <div style={{
            display: 'flex', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden',
            background: fondoAzul ? NAVY : '#fff', padding: '8px 4px',
          }}>
            {(Object.keys(FIJOS_DEFAULT) as (keyof typeof FIJOS_DEFAULT)[]).map(key => {
              const C = ICONOS[fijos[key].icon] ?? Home
              return (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: fondoAzul ? 'rgba(255,255,255,0.75)' : '#9aa0b4' }}>
                  <C size={18} />
                  <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{fijos[key].label || FIJOS_DEFAULT[key].label}</span>
                </div>
              )
            })}
            {extra.filter(b => b.label.trim()).map(b => {
              const C = ICONOS[b.icon] ?? Grid2x2
              return (
                <div key={b.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: fondoAzul ? 'rgba(255,255,255,0.75)' : '#9aa0b4' }}>
                  <C size={18} />
                  <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{b.label}</span>
                </div>
              )
            })}
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
