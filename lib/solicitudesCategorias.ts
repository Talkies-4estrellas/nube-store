import type { SupabaseClient } from '@supabase/supabase-js'
import { crearCategoriaConPadre } from './categorias'

export type SolicitudCategoria = {
  id: string
  proveedor_nombre: string
  proveedor_email: string
  proveedor_empresa: string | null
  nombre: string
  parent_id: number | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivo_rechazo: string | null
  categoria_creada_id: number | null
  created_at: string
}

/** Aprueba una solicitud de categoría: crea la categoría real (o reutiliza
 * una existente con el mismo nombre) y liga su id a la solicitud. */
export async function aprobarSolicitudCategoria(supabase: SupabaseClient, sol: SolicitudCategoria, revisadoPor: string | undefined) {
  const nueva = await crearCategoriaConPadre(supabase, sol.nombre, sol.parent_id)
  if (!nueva) return { error: new Error('No se pudo crear la categoría') }

  return supabase.from('solicitudes_categorias')
    .update({ estado: 'aprobado', categoria_creada_id: nueva.id, revisado_por: revisadoPor ?? null, motivo_rechazo: null, updated_at: new Date().toISOString() })
    .eq('id', sol.id)
}

/** Rechaza una solicitud de categoría, con motivo opcional. */
export async function rechazarSolicitudCategoria(supabase: SupabaseClient, id: string, motivo: string | null, revisadoPor: string | undefined) {
  return supabase.from('solicitudes_categorias')
    .update({ estado: 'rechazado', motivo_rechazo: motivo, revisado_por: revisadoPor ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
}
