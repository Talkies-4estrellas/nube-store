import type { SupabaseClient } from '@supabase/supabase-js'

/** Limpia espacios sobrantes; la comparación real (mayúsculas/minúsculas) se hace aparte. */
export function normalizarCategoria(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ')
}

/** Primera letra en mayúscula, el resto en minúsculas — sin importar cómo se haya escrito. */
function capitalizarCategoria(nombre: string): string {
  const limpio = normalizarCategoria(nombre)
  if (!limpio) return limpio
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase()
}

/**
 * Busca una categoría por nombre sin distinguir mayúsculas/minúsculas ni espacios
 * sobrantes; si no existe, la crea. Pensado para altas sueltas (un producto a la vez).
 */
export async function obtenerOcrearCategoriaId(
  supabase: SupabaseClient,
  nombreCrudo: string,
): Promise<number | null> {
  const nombre = normalizarCategoria(nombreCrudo)
  if (!nombre) return null

  const { data: existentes } = await supabase.from('categorias').select('id, nombre')
  const match = existentes?.find(c => c.nombre.trim().toLowerCase() === nombre.toLowerCase())
  if (match) return match.id

  const { data: nueva, error } = await supabase.from('categorias').insert({ nombre }).select('id').single()
  if (!error && nueva) return nueva.id

  // Alguien más pudo haber creado la misma categoría al mismo tiempo (choque de unicidad) —
  // se reintenta la búsqueda antes de rendirse.
  const { data: retry } = await supabase.from('categorias').select('id').ilike('nombre', nombre).maybeSingle()
  return retry?.id ?? null
}

/**
 * Versión en lote: recibe muchos nombres crudos (por ejemplo, de un CSV) y devuelve
 * un mapa nombre-original -> id de categoría, creando solo las que de verdad faltan
 * y sin duplicar por diferencias de mayúsculas/espacios entre filas.
 * Solo busca/crea categorías de nivel superior (sin padre) — para subcategorías
 * usa `mapearSubcategorias`.
 */
export async function mapearCategorias(
  supabase: SupabaseClient,
  nombresCrudos: string[],
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>()
  const limpiosUnicos = Array.from(new Set(nombresCrudos.map(normalizarCategoria).filter(Boolean)))
  if (limpiosUnicos.length === 0) return resultado

  const { data: existentes } = await supabase.from('categorias').select('id, nombre').is('parent_id', null)
  const porClave = new Map<string, number>()
  existentes?.forEach(c => porClave.set(c.nombre.trim().toLowerCase(), c.id))

  const faltan = limpiosUnicos.filter(n => !porClave.has(n.toLowerCase()))
  if (faltan.length) {
    // Se insertan una por una: si una fila choca con una categoría creada en paralelo
    // (mismo nombre, otra mayúscula), no debe tumbar la creación de las demás.
    for (const nombre of faltan) {
      const { data, error } = await supabase.from('categorias').insert({ nombre }).select('id').single()
      if (!error && data) { porClave.set(nombre.toLowerCase(), data.id); continue }
      const { data: retry } = await supabase.from('categorias').select('id').is('parent_id', null).ilike('nombre', nombre).maybeSingle()
      if (retry) porClave.set(nombre.toLowerCase(), retry.id)
    }
  }

  for (const original of nombresCrudos) {
    const limpio = normalizarCategoria(original)
    const id = limpio ? porClave.get(limpio.toLowerCase()) : undefined
    if (id) resultado.set(original, id)
  }
  return resultado
}

/**
 * Igual que `mapearCategorias` pero para subcategorías: cada par trae el id de su
 * padre ya resuelto, y la búsqueda/creación queda acotada a ese padre — así dos
 * padres distintos pueden tener cada uno una subcategoría con el mismo nombre.
 * Devuelve un mapa `padreId:::hijo` (nombre original) -> id de la subcategoría.
 */
export async function mapearSubcategorias(
  supabase: SupabaseClient,
  pares: Array<{ padreId: number; hijo: string }>,
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>()
  const limpios = pares
    .map(p => ({ padreId: p.padreId, hijoOriginal: p.hijo, hijo: normalizarCategoria(p.hijo) }))
    .filter(p => p.hijo)
  if (limpios.length === 0) return resultado

  const padresIds = Array.from(new Set(limpios.map(p => p.padreId)))
  const { data: existentes } = await supabase.from('categorias').select('id, nombre, parent_id').in('parent_id', padresIds)
  const porClave = new Map<string, number>()
  existentes?.forEach(c => { if (c.parent_id != null) porClave.set(`${c.parent_id}:::${c.nombre.trim().toLowerCase()}`, c.id) })

  const paresUnicos = Array.from(new Set(limpios.map(p => `${p.padreId}:::${p.hijo}`)))
  for (const clave of paresUnicos) {
    const sep = clave.indexOf(':::')
    const padreId = Number(clave.slice(0, sep))
    const hijo = clave.slice(sep + 3)
    const claveBusqueda = `${padreId}:::${hijo.toLowerCase()}`
    if (porClave.has(claveBusqueda)) continue
    const { data, error } = await supabase.from('categorias').insert({ nombre: hijo, parent_id: padreId }).select('id').single()
    if (!error && data) { porClave.set(claveBusqueda, data.id); continue }
    const { data: retry } = await supabase.from('categorias').select('id').eq('parent_id', padreId).ilike('nombre', hijo).maybeSingle()
    if (retry) porClave.set(claveBusqueda, retry.id)
  }

  for (const p of limpios) {
    const id = porClave.get(`${p.padreId}:::${p.hijo.toLowerCase()}`)
    if (id) resultado.set(`${p.padreId}:::${p.hijoOriginal}`, id)
  }
  return resultado
}

/* ---- Jerarquía padre/hijo (2 niveles) ---- */

/** Campos adicionales configurables (fase 2) que un admin define para una
 * categoría padre desde Tienda en línea > Filtros — sin tocar código. */
export type GrupoContextual = { label: string; opciones: string[]; permitirOtro?: boolean }
export type CamposExtraConfig = { icon: string; titulo: string; hint: string; tallas: string[]; grupos: GrupoContextual[] }

export type CategoriaPlana = { id: number; nombre: string; parent_id: number | null; activo?: boolean; campos_extra?: CamposExtraConfig | null }
export type CategoriaHijo = { id: number; nombre: string }
export type CategoriaConHijos = { id: number; nombre: string; hijos: CategoriaHijo[]; campos_extra?: CamposExtraConfig | null }

/** Agrupa la lista plana (como viene de Supabase) en padres con su array de hijos. */
export function construirArbolCategorias(planas: CategoriaPlana[]): CategoriaConHijos[] {
  const padres = planas.filter(c => c.parent_id === null)
  return padres
    .map(p => ({
      id: p.id,
      nombre: p.nombre,
      campos_extra: p.campos_extra ?? null,
      hijos: planas
        .filter(c => c.parent_id === p.id)
        .map(h => ({ id: h.id, nombre: h.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Crea una categoría (padre si parentId es null, subcategoría si no) y la devuelve. */
export async function crearCategoriaConPadre(
  supabase: SupabaseClient,
  nombreCrudo: string,
  parentId: number | null,
): Promise<{ id: number; nombre: string } | null> {
  const nombre = capitalizarCategoria(nombreCrudo)
  if (!nombre) return null

  // Si ya existe (sin distinguir mayúsculas) bajo el mismo padre, se reutiliza en vez de duplicar
  const busqueda = parentId === null
    ? supabase.from('categorias').select('id, nombre').is('parent_id', null).ilike('nombre', nombre)
    : supabase.from('categorias').select('id, nombre').eq('parent_id', parentId).ilike('nombre', nombre)
  const { data: existente } = await busqueda.maybeSingle()
  if (existente) return existente

  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre, parent_id: parentId })
    .select('id, nombre')
    .single()
  if (error || !data) return null
  return data
}
