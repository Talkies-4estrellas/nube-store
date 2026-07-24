import type { SupabaseClient } from '@supabase/supabase-js'

/** Limpia espacios sobrantes; la comparación real (mayúsculas/minúsculas) se hace aparte. */
export function normalizarCategoria(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ')
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
 */
export async function mapearCategorias(
  supabase: SupabaseClient,
  nombresCrudos: string[],
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>()
  const limpiosUnicos = Array.from(new Set(nombresCrudos.map(normalizarCategoria).filter(Boolean)))
  if (limpiosUnicos.length === 0) return resultado

  const { data: existentes } = await supabase.from('categorias').select('id, nombre')
  const porClave = new Map<string, number>()
  existentes?.forEach(c => porClave.set(c.nombre.trim().toLowerCase(), c.id))

  const faltan = limpiosUnicos.filter(n => !porClave.has(n.toLowerCase()))
  if (faltan.length) {
    // Se insertan una por una: si una fila choca con una categoría creada en paralelo
    // (mismo nombre, otra mayúscula), no debe tumbar la creación de las demás.
    for (const nombre of faltan) {
      const { data, error } = await supabase.from('categorias').insert({ nombre }).select('id').single()
      if (!error && data) { porClave.set(nombre.toLowerCase(), data.id); continue }
      const { data: retry } = await supabase.from('categorias').select('id').ilike('nombre', nombre).maybeSingle()
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
