import type { SupabaseClient } from '@supabase/supabase-js'

export type MovimientoVenta = {
  id: string
  venta_id: string
  estado_anterior: string | null
  estado_nuevo: string
  usuario_id: string | null
  comentario: string | null
  created_at: string
}

/** Registra un cambio de estado de pedido con auditoría (quién, cuándo, comentario opcional). Best-effort: si la tabla aún no existe, no bloquea el cambio de estado. */
export async function registrarMovimiento(
  supabase: SupabaseClient,
  ventaId: string,
  estadoAnterior: string,
  estadoNuevo: string,
  usuarioId: string | undefined,
  comentario?: string,
) {
  try {
    await supabase.from('ventas_historial').insert({
      venta_id: ventaId,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      usuario_id: usuarioId ?? null,
      comentario: comentario ?? null,
    })
  } catch { /* la tabla puede no existir todavía si la migración no corrió — no bloquea el flujo */ }
}

export async function fetchHistorial(supabase: SupabaseClient, ventaId: string): Promise<MovimientoVenta[]> {
  const { data } = await supabase
    .from('ventas_historial')
    .select('*')
    .eq('venta_id', ventaId)
    .order('created_at', { ascending: false })
  return (data ?? []) as MovimientoVenta[]
}
