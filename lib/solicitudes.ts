import type { SupabaseClient } from '@supabase/supabase-js'

export type SolicitudProducto = {
  id: string
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  producto_stock: number
  producto_imagen_url?: string | null
  imagen_url?: string | null
  categoria_id: number | string | null
  proveedor_nombre: string
  proveedor_email: string
  proveedor_empresa?: string | null
  detalles?: Record<string, unknown> | null
}

async function notificarProveedor(supabase: SupabaseClient, sol: SolicitudProducto, estado: 'aprobado' | 'rechazado', motivo?: string) {
  try {
    await supabase.functions.invoke('notify-proveedor', {
      body: {
        proveedor_email: sol.proveedor_email,
        proveedor_nombre: sol.proveedor_nombre,
        producto_nombre: sol.producto_nombre,
        estado,
        ...(motivo ? { motivo } : {}),
      },
    })
  } catch { /* la notificación es best-effort — no debe bloquear el flujo de aprobación */ }
}

/** Aprueba una solicitud: crea el producto en el catálogo, marca la solicitud como aprobada (con auditoría de quién y cuándo) y notifica al proveedor. */
export async function aprobarSolicitud(supabase: SupabaseClient, sol: SolicitudProducto, revisadoPor: string | undefined) {
  const detalles = sol.detalles ?? null
  const precioPromocional = detalles && typeof detalles.precio_promocional === 'number' ? detalles.precio_promocional : null

  const { error: errInsert } = await supabase.from('productos').insert({
    nombre: sol.producto_nombre,
    sku: sol.producto_sku,
    precio: sol.producto_precio,
    precio_promocional: precioPromocional,
    stock: sol.producto_stock,
    imagen_url: sol.imagen_url ?? sol.producto_imagen_url ?? null,
    categoria_id: sol.categoria_id,
    activo: true,
    origen: 'proveedor',
    proveedor_nombre: sol.proveedor_empresa || sol.proveedor_nombre,
    detalles,
  })
  if (errInsert) return { error: errInsert }

  const result = await supabase.from('solicitudes_productos')
    .update({ estado: 'aprobado', revisado_por: revisadoPor ?? null, motivo_rechazo: null })
    .eq('id', sol.id)
  if (!result.error) notificarProveedor(supabase, sol, 'aprobado')
  return result
}

/** Rechaza una solicitud con motivo obligatorio, deja auditoría de quién/cuándo y notifica al proveedor. */
export async function rechazarSolicitud(supabase: SupabaseClient, sol: SolicitudProducto, motivo: string, revisadoPor: string | undefined) {
  const result = await supabase.from('solicitudes_productos')
    .update({ estado: 'rechazado', motivo_rechazo: motivo, revisado_por: revisadoPor ?? null })
    .eq('id', sol.id)
  if (!result.error) notificarProveedor(supabase, sol, 'rechazado', motivo)
  return result
}
