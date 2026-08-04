import type { SupabaseClient } from '@supabase/supabase-js'

export type SolicitudProducto = {
  id: string
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  producto_stock: number
  producto_descripcion?: string | null
  producto_imagen_url?: string | null
  imagen_url?: string | null
  categoria_id: number | string | null
  proveedor_nombre: string
  proveedor_email: string
  proveedor_empresa?: string | null
  detalles?: Record<string, unknown> | null
  /** 'actualizacion' = pide modificar un producto ya publicado (producto_id),
   * en vez de dar de alta uno nuevo. No se aplica al catálogo hasta aprobarse. */
  tipo?: 'nuevo' | 'actualizacion'
  producto_id?: string | null
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

/** Aprueba una solicitud. Si es de tipo 'actualizacion' (producto ya publicado),
 * actualiza ese producto en vez de crear uno nuevo. Marca la solicitud como
 * aprobada (con auditoría de quién y cuándo) y notifica al proveedor. */
export async function aprobarSolicitud(supabase: SupabaseClient, sol: SolicitudProducto, revisadoPor: string | undefined) {
  const detalles = sol.detalles ?? null
  const precioPromocional = detalles && typeof detalles.precio_promocional === 'number' ? detalles.precio_promocional : null

  let productoId = sol.producto_id ?? null

  if (sol.tipo === 'actualizacion' && sol.producto_id) {
    const { error: errUpdate } = await supabase.from('productos').update({
      nombre: sol.producto_nombre,
      precio: sol.producto_precio,
      precio_promocional: precioPromocional,
      stock: sol.producto_stock,
      descripcion: sol.producto_descripcion ?? null,
      imagen_url: sol.imagen_url ?? sol.producto_imagen_url ?? undefined,
      detalles,
    }).eq('id', sol.producto_id)
    if (errUpdate) return { error: errUpdate }
  } else {
    const { data: nuevoProducto, error: errInsert } = await supabase.from('productos').insert({
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
    }).select('id').single()
    if (errInsert) return { error: errInsert }
    // Se guarda el id del producto recién creado en la solicitud — así una
    // futura "solicitud de actualización" sobre este mismo producto sabe a
    // cuál fila de `productos` debe apuntar.
    productoId = nuevoProducto?.id ?? null
  }

  const result = await supabase.from('solicitudes_productos')
    .update({ estado: 'aprobado', revisado_por: revisadoPor ?? null, motivo_rechazo: null, producto_id: productoId })
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
