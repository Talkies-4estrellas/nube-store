import type { SupabaseClient } from '@supabase/supabase-js'

/** Devuelve el conjunto de emails de proveedores que están pausados ahora
 * mismo (suspendidos por el admin o en pausa por ellos mismos) — se usa
 * para ocultarles sus solicitudes en las listas del admin (los productos ya
 * se ocultan solos vía el trigger que apaga `activo`). */
export async function fetchEmailsProveedoresPausados(supabase: SupabaseClient): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('email, estado, pausado_por_titular')
      .eq('role', 'proveedor')
      .or('estado.eq.suspendido,pausado_por_titular.eq.true')
    return new Set((data ?? []).map(r => r.email))
  } catch {
    return new Set()
  }
}
