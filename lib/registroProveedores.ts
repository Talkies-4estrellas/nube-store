import type { SupabaseClient } from '@supabase/supabase-js'

export type SolicitudRegistroProveedor = {
  id: string
  nombre_contacto: string
  email: string
  telefono: string | null
  nombre_negocio: string | null
}

async function notificar(supabase: SupabaseClient, sol: { email: string; nombre_contacto: string }, estado: 'aprobado' | 'rechazado', motivo?: string) {
  try {
    await supabase.functions.invoke('notify-registro-proveedor', {
      body: { email: sol.email, nombre_contacto: sol.nombre_contacto, estado, ...(motivo ? { motivo } : {}) },
    })
  } catch { /* la notificación es best-effort — no debe bloquear el flujo de aprobación/rechazo */ }
}

/**
 * Aprueba una solicitud de registro: crea la cuenta real del proveedor
 * (reutiliza /api/admin/crear-proveedor, la misma ruta que usa el alta manual
 * desde "Usuarios y roles" — mismo email + PASSWORD_CUENTA_DEFAULT), marca la
 * solicitud como aprobada y le notifica por correo sus credenciales.
 */
export async function aprobarRegistroProveedor(
  supabase: SupabaseClient,
  sol: SolicitudRegistroProveedor,
  revisadoPor: string | undefined,
): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/crear-proveedor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({
      nombre: sol.nombre_contacto,
      email: sol.email,
      empresa: sol.nombre_negocio,
      telefono: sol.telefono,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { error: data.error || 'No se pudo crear la cuenta del proveedor' }

  const { error: updateError } = await supabase.from('solicitudes_registro_proveedor')
    .update({ estado: 'aprobado', revisado_por: revisadoPor ?? null })
    .eq('id', sol.id)
  if (updateError) return { error: 'La cuenta se creó, pero no se pudo actualizar la solicitud.' }

  notificar(supabase, sol, 'aprobado')
  return {}
}

/**
 * Rechaza una solicitud de registro: notifica al solicitante el motivo y
 * BORRA el registro — a diferencia de las solicitudes de productos, aquí no
 * se conserva la información de alguien a quien no se le dio de alta.
 */
export async function rechazarRegistroProveedor(
  supabase: SupabaseClient,
  sol: { id: string; email: string; nombre_contacto: string },
  motivo: string,
): Promise<void> {
  notificar(supabase, sol, 'rechazado', motivo)
  await supabase.from('solicitudes_registro_proveedor').delete().eq('id', sol.id)
}
