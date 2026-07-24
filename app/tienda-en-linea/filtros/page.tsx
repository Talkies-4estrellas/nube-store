'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'
const PINK = '#e7226d'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

type Fields = { topbar_btn1: string; topbar_btn2: string; topbar_btn1_activo: boolean; topbar_btn2_activo: boolean }
const DEFAULTS: Fields = { topbar_btn1: 'Nuevo', topbar_btn2: 'Ofertas', topbar_btn1_activo: true, topbar_btn2_activo: true }

type Categoria = { id: number; nombre: string; activo: boolean }

type BotonFiltro = { id: string; label: string; view: string; activo: boolean }
const VISTAS_DISPONIBLES = [
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'novedades', label: 'Novedades' },
  { value: 'favoritos', label: 'Favoritos' },
  { value: 'ofertas', label: 'Ofertas' },
  { value: 'carrito', label: 'Carrito' },
  { value: 'soporte', label: 'Soporte' },
]

export default function FiltrosPage() {
  const [f, setF] = useState<Fields>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [botones, setBotones] = useState<BotonFiltro[]>([])

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCategoria, setErrorCategoria] = useState('')
  const [paginaCategorias, setPaginaCategorias] = useState(1)
  const POR_PAGINA = 10

  useEffect(() => {
    supabase.from('config_storefront').select('topbar_btn1,topbar_btn2,topbar_btn1_activo,topbar_btn2_activo,filtros_extra').eq('id', 1).single()
      .then(({ data }) => {
        if (data) setF({ ...DEFAULTS, ...data })
        if (data?.filtros_extra) setBotones(data.filtros_extra)
      })
    cargarCategorias()
  }, [])

  function agregarBoton() {
    setBotones(prev => [...prev, { id: crypto.randomUUID(), label: '', view: 'catalogo', activo: true }])
  }
  function actualizarBoton(id: string, campo: keyof BotonFiltro, valor: string | boolean) {
    setBotones(prev => prev.map(b => b.id === id ? { ...b, [campo]: valor } : b))
  }
  function eliminarBoton(id: string) {
    setBotones(prev => prev.filter(b => b.id !== id))
  }

  function cargarCategorias() {
    setCargandoCategorias(true)
    supabase.from('categorias').select('id, nombre, activo').order('nombre')
      .then(({ data }) => { setCategorias(data || []); setCargandoCategorias(false) })
  }

  const totalPaginasCategorias = Math.max(1, Math.ceil(categorias.length / POR_PAGINA))
  const categoriasPagina = categorias.slice((paginaCategorias - 1) * POR_PAGINA, paginaCategorias * POR_PAGINA)

  function set<K extends keyof Fields>(key: K, val: Fields[K]) { setF(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setSaving(true)
    await supabase.from('config_storefront').upsert({ id: 1, ...f, filtros_extra: botones, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function crearCategoria(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevaCategoria.trim().replace(/\s+/g, ' ')
    if (!nombre) return
    setErrorCategoria('')
    if (categorias.some(c => c.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setErrorCategoria('Esa categoría ya existe.')
      return
    }
    setCreando(true)
    const { error } = await supabase.from('categorias').insert({ nombre })
    setCreando(false)
    if (error) {
      setErrorCategoria(error.code === '23505' ? 'Esa categoría ya existe.' : 'Error al crear la categoría.')
      return
    }
    setNuevaCategoria('')
    setPaginaCategorias(1)
    cargarCategorias()
  }

  async function alternarActivo(cat: Categoria) {
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activo: !c.activo } : c))
    await supabase.from('categorias').update({ activo: !cat.activo }).eq('id', cat.id)
  }

  async function eliminarCategoria(cat: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Los productos que la usan quedarán sin categoría.`)) return
    setCategorias(prev => {
      const restantes = prev.filter(c => c.id !== cat.id)
      const ultimaPagina = Math.max(1, Math.ceil(restantes.length / POR_PAGINA))
      setPaginaCategorias(p => Math.min(p, ultimaPagina))
      return restantes
    })
    await supabase.from('categorias').delete().eq('id', cat.id)
  }

  return (
    <div className="te-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Filtros</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Los dos botones de acceso rápido que aparecen en el topbar de la tienda junto al buscador.</p>

        {/* Preview topbar */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Vista previa del topbar</p>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {f.topbar_btn1_activo && (
              <div style={{ background: PINK, color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{f.topbar_btn1 || 'Nuevo'}</div>
            )}
            {f.topbar_btn2_activo && (
              <div style={{ background: '#fff', color: NAVY, border: `1.5px solid ${NAVY}`, padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{f.topbar_btn2 || 'Ofertas'}</div>
            )}
            {!f.topbar_btn1_activo && !f.topbar_btn2_activo && botones.filter(b => b.activo && b.label.trim()).length === 0 && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Sin botones activos</span>
            )}
            {botones.filter(b => b.activo && b.label.trim()).map(b => (
              <div key={b.id} style={{ background: '#fff', color: NAVY, border: `1.5px solid ${NAVY}`, padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.label}</div>
            ))}
            <div style={{ flex: 1, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔍 Buscar productos
            </div>
          </div>
        </div>

        {/* Editor */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Etiquetas de los botones</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ opacity: f.topbar_btn1_activo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Botón 1 → lleva a Novedades</label>
                <button type="button" onClick={() => set('topbar_btn1_activo', !f.topbar_btn1_activo)} style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: f.topbar_btn1_activo ? '#0049ff' : '#d1d5db', position: 'relative', flexShrink: 0,
                }}>
                  <span style={{ position: 'absolute', top: 2, left: f.topbar_btn1_activo ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              <input style={inp} value={f.topbar_btn1} onChange={e => set('topbar_btn1', e.target.value)} placeholder="Nuevo" disabled={!f.topbar_btn1_activo} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Se muestra resaltado en color de acento</p>
            </div>
            <div style={{ opacity: f.topbar_btn2_activo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Botón 2 → lleva a Ofertas</label>
                <button type="button" onClick={() => set('topbar_btn2_activo', !f.topbar_btn2_activo)} style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: f.topbar_btn2_activo ? '#0049ff' : '#d1d5db', position: 'relative', flexShrink: 0,
                }}>
                  <span style={{ position: 'absolute', top: 2, left: f.topbar_btn2_activo ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              <input style={inp} value={f.topbar_btn2} onChange={e => set('topbar_btn2', e.target.value)} placeholder="Ofertas" disabled={!f.topbar_btn2_activo} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Se muestra con borde, sin relleno</p>
            </div>
          </div>
        </div>

        {/* Botones extra */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Botones extra</p>
            <button type="button" onClick={agregarBoton}
              style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Agregar botón
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 16px' }}>
            Además de "Nuevo" y "Ofertas", agrega los que necesites — cada uno se puede activar/desactivar sin perderlo.
          </p>

          {botones.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Todavía no agregaste ningún botón extra.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {botones.map(b => (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center', padding: '10px', border: '1px solid #f3f4f6', borderRadius: 10, opacity: b.activo ? 1 : 0.6 }}>
                  <input style={inp} value={b.label} onChange={e => actualizarBoton(b.id, 'label', e.target.value)} placeholder="Nombre del botón" />
                  <select style={{ ...inp, cursor: 'pointer' }} value={b.view} onChange={e => actualizarBoton(b.id, 'view', e.target.value)}>
                    {VISTAS_DISPONIBLES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <button type="button" onClick={() => actualizarBoton(b.id, 'activo', !b.activo)} style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: b.activo ? '#0049ff' : '#d1d5db', position: 'relative', flexShrink: 0,
                  }}>
                    <span style={{ position: 'absolute', top: 3, left: b.activo ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                  <button type="button" onClick={() => eliminarBoton(b.id)}
                    style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
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

        {/* Categorías */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Categorías</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
            Las categorías inactivas dejan de aparecer en el filtro de la tienda, pero sus productos y el historial no se ven afectados.
          </p>

          <form onSubmit={crearCategoria} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input style={{ ...inp, flex: 1 }} value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)}
              placeholder="Nombre de la nueva categoría" disabled={creando} />
            <button type="submit" disabled={creando || !nuevaCategoria.trim()} style={{
              background: NAVY, color: '#fff', border: 'none', padding: '0 20px', borderRadius: 8,
              fontWeight: 700, fontSize: 14, cursor: creando ? 'default' : 'pointer', whiteSpace: 'nowrap',
              opacity: creando || !nuevaCategoria.trim() ? 0.6 : 1,
            }}>
              {creando ? 'Creando...' : '+ Agregar'}
            </button>
          </form>
          {errorCategoria && (
            <p style={{ fontSize: 12, color: '#dc2626', margin: '-8px 0 16px', fontWeight: 600 }}>{errorCategoria}</p>
          )}

          {cargandoCategorias ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando categorías...</p>
          ) : categorias.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No hay categorías todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categoriasPagina.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  background: cat.activo ? '#fff' : '#f9fafb',
                }}>
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 600,
                    color: cat.activo ? '#111' : '#9ca3af',
                    textDecoration: cat.activo ? 'none' : 'line-through',
                  }}>
                    {cat.nombre}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: cat.activo ? '#d1fae5' : '#f3f4f6',
                    color: cat.activo ? '#065f46' : '#6b7280',
                  }}>
                    {cat.activo ? 'Activa' : 'Inactiva'}
                  </span>
                  <button type="button" onClick={() => alternarActivo(cat)} style={{
                    background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                    padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                    {cat.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" onClick={() => eliminarCategoria(cat)} style={{
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                    Eliminar
                  </button>
                </div>
              ))}

              {totalPaginasCategorias > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {(paginaCategorias - 1) * POR_PAGINA + 1}–{Math.min(paginaCategorias * POR_PAGINA, categorias.length)} de {categorias.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => setPaginaCategorias(p => Math.max(1, p - 1))} disabled={paginaCategorias === 1}
                      style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: paginaCategorias === 1 ? 'default' : 'pointer', opacity: paginaCategorias === 1 ? 0.5 : 1 }}>
                      ← Anterior
                    </button>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Página {paginaCategorias} de {totalPaginasCategorias}</span>
                    <button type="button" onClick={() => setPaginaCategorias(p => Math.min(totalPaginasCategorias, p + 1))} disabled={paginaCategorias === totalPaginasCategorias}
                      style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: paginaCategorias === totalPaginasCategorias ? 'default' : 'pointer', opacity: paginaCategorias === totalPaginasCategorias ? 0.5 : 1 }}>
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
