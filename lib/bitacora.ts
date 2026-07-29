import type { SupabaseClient } from '@supabase/supabase-js'

export type EntradaBitacora = {
  id: string
  usuario_id: string | null
  accion: string
  tabla: string
  registro_id: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

/** Registra una acción sensible de control de acceso (rol, suspensión, eliminación de usuario). Best-effort: nunca bloquea la acción real si falla. */
export async function registrarAuditoria(
  supabase: SupabaseClient,
  params: { usuarioId: string | undefined; accion: string; tabla: string; registroId: string; valorAnterior?: string | null; valorNuevo?: string | null },
) {
  try {
    await supabase.from('bitacora_admin').insert({
      usuario_id: params.usuarioId ?? null,
      accion: params.accion,
      tabla: params.tabla,
      registro_id: params.registroId,
      valor_anterior: params.valorAnterior ?? null,
      valor_nuevo: params.valorNuevo ?? null,
    })
  } catch { /* auditoría best-effort — no debe bloquear la acción real */ }
}

export async function fetchBitacora(supabase: SupabaseClient, limite = 30): Promise<EntradaBitacora[]> {
  const { data } = await supabase
    .from('bitacora_admin')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)
  return (data ?? []) as EntradaBitacora[]
}
