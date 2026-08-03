'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { construirArbolCategorias, type CamposExtraConfig, type GrupoContextual } from '@/lib/categorias'

const NAVY = '#252855'
const PINK = '#e7226d'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

/** Fusiona con los valores por defecto sin dejar pasar `null` — columnas que
 * nunca se llenaron vienen `null` desde Supabase, y un `<input>` controlado
 * no acepta `value={null}` (React se queja en consola). */
function conDefaults<T extends object>(defaults: T, data: Partial<Record<keyof T, unknown>>): T {
  const resultado = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const val = data[key]
    if (val !== null && val !== undefined) resultado[key] = val as T[keyof T]
  }
  return resultado
}

type Fields = { topbar_btn1: string; topbar_btn2: string; topbar_btn1_activo: boolean; topbar_btn2_activo: boolean }
const DEFAULTS: Fields = { topbar_btn1: 'Nuevo', topbar_btn2: 'Ofertas', topbar_btn1_activo: true, topbar_btn2_activo: true }

type Categoria = { id: number; nombre: string; activo: boolean; parent_id: number | null; campos_extra?: CamposExtraConfig | null }

const CONFIG_VACIA = (): CamposExtraConfig => ({ icon: '🏷️', titulo: '', hint: '', tallas: [], grupos: [] })

/** Editor genérico de una lista de texto libre (chips + input) — reutilizado para
 * tallas y para las opciones de cada apartado. Los chips ya creados se pueden
 * editar haciendo clic sobre su texto, no solo borrarlos. */
function ChipListEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [editInput, setEditInput] = useState('')

  function add() {
    const v = input.trim()
    if (!v || values.includes(v)) { setInput(''); return }
    onChange([...values, v])
    setInput('')
  }
  function remove(v: string) { onChange(values.filter(x => x !== v)) }
  function empezarEdicion(i: number) { setEditando(i); setEditInput(values[i]) }
  function guardarEdicion() {
    if (editando === null) return
    const v = editInput.trim()
    if (v && !values.some((x, idx) => idx !== editando && x === v)) {
      onChange(values.map((x, idx) => idx === editando ? v : x))
    }
    setEditando(null)
  }

  return (
    <div>
      {values.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {values.map((v, i) => (
            editando === i ? (
              <input key={i} autoFocus value={editInput} onChange={e => setEditInput(e.target.value)}
                onBlur={guardarEdicion}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarEdicion() } if (e.key === 'Escape') setEditando(null) }}
                style={{ border: '1.5px solid #0049ff', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 600, outline: 'none', width: Math.max(70, editInput.length * 8 + 28) }} />
            ) : (
              <span key={i} onClick={() => empezarEdicion(i)} title="Clic para editar"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}>
                {v}
                <button type="button" onClick={e => { e.stopPropagation(); remove(v) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
              </span>
            )
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inp, fontSize: 13 }} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder={placeholder} />
        <button type="button" onClick={add}
          style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  )
}

/** Combobox de categorías (padres y subcategorías) — funciona como cuadro de
 * texto: escribe para filtrar y hace clic en una sugerencia para seleccionarla. */
function CategoriaComboBox({ categorias, value, onChange }: { categorias: Categoria[]; value: string; onChange: (id: string) => void }) {
  const seleccionada = categorias.find(c => String(c.id) === value)
  const [query, setQuery] = useState(seleccionada?.nombre ?? '')
  const [abierto, setAbierto] = useState(false)

  useEffect(() => { setQuery(seleccionada?.nombre ?? '') }, [seleccionada])

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categorias
    return categorias.filter(c => c.nombre.toLowerCase().includes(q))
  }, [categorias, query])

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setAbierto(false)
          if (e.key === 'Enter' && filtradas.length === 1) { e.preventDefault(); onChange(String(filtradas[0].id)); setAbierto(false) }
        }}
        placeholder="Escribe para buscar una categoría..."
        autoComplete="off"
        style={inp}
      />
      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 21,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
          }}>
            {filtradas.length === 0 ? (
              <p style={{ margin: 0, padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>Sin coincidencias</p>
            ) : (
              filtradas.map(c => (
                <button key={c.id} type="button"
                  onMouseDown={e => { e.preventDefault(); onChange(String(c.id)); setAbierto(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: c.parent_id ? '#4b5563' : '#111', fontWeight: c.parent_id ? 400 : 600 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                  {c.parent_id ? '↳ ' : ''}{c.nombre}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function GrupoEditor({ grupo, onChange, onDelete }: { grupo: GrupoContextual; onChange: (g: GrupoContextual) => void; onDelete: () => void }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input style={{ ...inp, flex: 1 }} value={grupo.label} onChange={e => onChange({ ...grupo, label: e.target.value })}
          placeholder="Nombre del apartado, ej: Género" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!grupo.permitirOtro} onChange={e => onChange({ ...grupo, permitirOtro: e.target.checked })} />
          Permitir &quot;otro&quot;
        </label>
        <button type="button" onClick={onDelete}
          style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
          🗑
        </button>
      </div>
      <ChipListEditor values={grupo.opciones} onChange={opciones => onChange({ ...grupo, opciones })} placeholder="Agregar opción — Enter para agregar" />
    </div>
  )
}

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
  const [nuevaCategoriaPadre, setNuevaCategoriaPadre] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCategoria, setErrorCategoria] = useState('')
  const [editandoCatId, setEditandoCatId] = useState<number | null>(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [errorRenombrar, setErrorRenombrar] = useState('')
  const [paginaCategorias, setPaginaCategorias] = useState(1)
  const POR_PAGINA = 10

  const [catConfigId, setCatConfigId] = useState('')
  const [draftConfig, setDraftConfig] = useState<CamposExtraConfig | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedConfig, setSavedConfig] = useState(false)

  const arbolCategorias = useMemo(() => construirArbolCategorias(categorias), [categorias])

  // Lista ordenada: cada padre seguido de sus hijos, para paginar sin romper la jerarquía visual.
  const categoriasOrdenadas = useMemo(() => {
    const porId = new Map(categorias.map(c => [c.id, c]))
    const out: Categoria[] = []
    arbolCategorias.forEach(p => {
      const padre = porId.get(p.id)
      if (padre) out.push(padre)
      p.hijos.forEach(h => { const hijo = porId.get(h.id); if (hijo) out.push(hijo) })
    })
    return out
  }, [categorias, arbolCategorias])

  useEffect(() => {
    supabase.from('config_storefront').select('topbar_btn1,topbar_btn2,topbar_btn1_activo,topbar_btn2_activo,filtros_extra').eq('id', 1).single()
      .then(({ data }) => {
        if (data) setF(conDefaults(DEFAULTS, data))
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
    supabase.from('categorias').select('id, nombre, activo, parent_id, campos_extra').order('nombre')
      .then(({ data }) => { setCategorias(data || []); setCargandoCategorias(false) })
  }

  useEffect(() => {
    if (!catConfigId) { setDraftConfig(null); return }
    const cat = categorias.find(c => String(c.id) === catConfigId)
    setDraftConfig(cat?.campos_extra ?? CONFIG_VACIA())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catConfigId])

  async function guardarConfigContextual() {
    if (!catConfigId || !draftConfig) return
    setSavingConfig(true)
    const limpio: CamposExtraConfig = { ...draftConfig, grupos: draftConfig.grupos.filter(g => g.label.trim() && g.opciones.length > 0) }
    const debeGuardar = !!limpio.titulo.trim() || limpio.tallas.length > 0 || limpio.grupos.length > 0
    const valor = debeGuardar ? limpio : null
    await supabase.from('categorias').update({ campos_extra: valor }).eq('id', Number(catConfigId))
    setCategorias(prev => prev.map(c => c.id === Number(catConfigId) ? { ...c, campos_extra: valor } : c))
    setSavingConfig(false); setSavedConfig(true)
    setTimeout(() => setSavedConfig(false), 2500)
  }

  async function quitarConfigContextual() {
    if (!catConfigId) return
    if (!confirm('¿Quitar los campos contextuales configurados para esta categoría?')) return
    await supabase.from('categorias').update({ campos_extra: null }).eq('id', Number(catConfigId))
    setCategorias(prev => prev.map(c => c.id === Number(catConfigId) ? { ...c, campos_extra: null } : c))
    setDraftConfig(CONFIG_VACIA())
  }

  const totalPaginasCategorias = Math.max(1, Math.ceil(categoriasOrdenadas.length / POR_PAGINA))
  const categoriasPagina = categoriasOrdenadas.slice((paginaCategorias - 1) * POR_PAGINA, paginaCategorias * POR_PAGINA)

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
    const parentId = nuevaCategoriaPadre ? Number(nuevaCategoriaPadre) : null
    if (categorias.some(c => c.parent_id === parentId && c.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setErrorCategoria(parentId ? 'Esa subcategoría ya existe en ese padre.' : 'Esa categoría ya existe.')
      return
    }
    setCreando(true)
    const { error } = await supabase.from('categorias').insert({ nombre, parent_id: parentId })
    setCreando(false)
    if (error) {
      setErrorCategoria(error.code === '23505' ? 'Esa categoría ya existe.' : 'Error al crear la categoría.')
      return
    }
    setNuevaCategoria('')
    setNuevaCategoriaPadre('')
    setPaginaCategorias(1)
    cargarCategorias()
  }

  async function alternarActivo(cat: Categoria) {
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activo: !c.activo } : c))
    await supabase.from('categorias').update({ activo: !cat.activo }).eq('id', cat.id)
  }

  function empezarEdicionCategoria(cat: Categoria) {
    setEditandoCatId(cat.id)
    setEditandoNombre(cat.nombre)
    setErrorRenombrar('')
  }
  function cancelarEdicionCategoria() {
    setEditandoCatId(null)
    setEditandoNombre('')
    setErrorRenombrar('')
  }
  async function guardarEdicionCategoria(cat: Categoria) {
    const nombre = editandoNombre.trim().replace(/\s+/g, ' ')
    if (!nombre || nombre === cat.nombre) { cancelarEdicionCategoria(); return }
    if (categorias.some(c => c.id !== cat.id && c.parent_id === cat.parent_id && c.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setErrorRenombrar(cat.parent_id ? 'Esa subcategoría ya existe en ese padre.' : 'Esa categoría ya existe.')
      return
    }
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, nombre } : c))
    setEditandoCatId(null)
    setErrorRenombrar('')
    await supabase.from('categorias').update({ nombre }).eq('id', cat.id)
  }

  async function eliminarCategoria(cat: Categoria) {
    const tieneHijos = categorias.some(c => c.parent_id === cat.id)
    const advertencia = tieneHijos
      ? `¿Eliminar la categoría "${cat.nombre}"? Sus subcategorías pasarán a ser categorías principales, y los productos que la usan quedarán sin categoría.`
      : `¿Eliminar la categoría "${cat.nombre}"? Los productos que la usan quedarán sin categoría.`
    if (!confirm(advertencia)) return
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

          <form onSubmit={crearCategoria} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: '1 1 200px' }} value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)}
              placeholder="Nombre de la nueva categoría" disabled={creando} />
            <select style={{ ...inp, flex: '0 1 220px', cursor: 'pointer' }} value={nuevaCategoriaPadre}
              onChange={e => setNuevaCategoriaPadre(e.target.value)} disabled={creando}>
              <option value="">— Categoría padre (ninguna) —</option>
              {arbolCategorias.map(p => <option key={p.id} value={p.id}>Subcategoría de: {p.nombre}</option>)}
            </select>
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
                <div key={cat.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    marginLeft: cat.parent_id ? 24 : 0,
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    background: cat.activo ? '#fff' : '#f9fafb',
                  }}>
                    {editandoCatId === cat.id ? (
                      <input autoFocus value={editandoNombre} onChange={e => setEditandoNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarEdicionCategoria(cat) } if (e.key === 'Escape') cancelarEdicionCategoria() }}
                        onBlur={() => guardarEdicionCategoria(cat)}
                        style={{ ...inp, flex: 1, padding: '6px 10px' }} />
                    ) : (
                      <span onClick={() => empezarEdicionCategoria(cat)} title="Clic para renombrar" style={{
                        flex: 1, fontSize: 14, fontWeight: cat.parent_id ? 500 : 600, cursor: 'pointer',
                        color: cat.activo ? '#111' : '#9ca3af',
                        textDecoration: cat.activo ? 'none' : 'line-through',
                      }}>
                        {cat.parent_id ? '↳ ' : ''}{cat.nombre}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: cat.activo ? '#d1fae5' : '#f3f4f6',
                      color: cat.activo ? '#065f46' : '#6b7280',
                    }}>
                      {cat.activo ? 'Activa' : 'Inactiva'}
                    </span>
                    <button type="button" onClick={() => empezarEdicionCategoria(cat)} title="Renombrar" style={{
                      background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                      width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0,
                    }}>
                      ✏️
                    </button>
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
                  {editandoCatId === cat.id && errorRenombrar && (
                    <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0 14px', fontWeight: 600 }}>{errorRenombrar}</p>
                  )}
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

        {/* Campos contextuales por categoría (fase 2) */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Campos contextuales por categoría</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
            Define apartados opcionales extra (tallas, género, material y lo que necesites) que aparecen en el formulario de productos según la categoría elegida — sin tocar código.
            Tanto las categorías principales como las subcategorías pueden tener su propia configuración; si una subcategoría no tiene la suya, los campos del padre quedan disponibles como un botón "Agregar..." en vez de aparecer solos.
          </p>

          <label style={lbl}>Categoría a configurar</label>
          <div style={{ marginBottom: 20 }}>
            <CategoriaComboBox categorias={categoriasOrdenadas} value={catConfigId} onChange={setCatConfigId} />
          </div>

          {catConfigId && draftConfig && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Ícono</label>
                  <input style={{ ...inp, textAlign: 'center', fontSize: 18 }} value={draftConfig.icon}
                    onChange={e => setDraftConfig(d => d && { ...d, icon: e.target.value })} placeholder="🏷️" maxLength={4} />
                </div>
                <div>
                  <label style={lbl}>Título de la tarjeta</label>
                  <input style={inp} value={draftConfig.titulo}
                    onChange={e => setDraftConfig(d => d && { ...d, titulo: e.target.value })} placeholder="Ej: Detalles de ropa" />
                </div>
              </div>

              <div>
                <label style={lbl}>Texto de ayuda</label>
                <input style={inp} value={draftConfig.hint}
                  onChange={e => setDraftConfig(d => d && { ...d, hint: e.target.value })} placeholder="Ej: Tallas, género, material y más — todo opcional" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Tallas <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional — deja vacío si no aplica)</span></label>
                  {draftConfig.tallas.length > 0 && (
                    <button type="button" onClick={() => setDraftConfig(d => d && { ...d, tallas: [] })} title="Quitar todas las tallas"
                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                      🗑
                    </button>
                  )}
                </div>
                <ChipListEditor values={draftConfig.tallas} onChange={tallas => setDraftConfig(d => d && { ...d, tallas })} placeholder="Agregar talla — Enter para agregar" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Apartados</label>
                  <button type="button" onClick={() => setDraftConfig(d => d && { ...d, grupos: [...d.grupos, { label: '', opciones: [], permitirOtro: false }] })}
                    style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    + Agregar apartado
                  </button>
                </div>
                {draftConfig.grupos.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin apartados extra todavía.</p>
                ) : (
                  draftConfig.grupos.map((grupo, i) => (
                    <GrupoEditor key={i} grupo={grupo}
                      onChange={g => setDraftConfig(d => d && { ...d, grupos: d.grupos.map((x, idx) => idx === i ? g : x) })}
                      onDelete={() => setDraftConfig(d => d && { ...d, grupos: d.grupos.filter((_, idx) => idx !== i) })} />
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                <button type="button" onClick={quitarConfigContextual}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Quitar configuración
                </button>
                <button type="button" onClick={guardarConfigContextual} disabled={savingConfig} style={{
                  background: savedConfig ? '#059669' : NAVY, color: '#fff', border: 'none',
                  padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  {savingConfig ? 'Guardando...' : savedConfig ? '¡Guardado!' : 'Guardar apartado'}
                </button>
              </div>
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
