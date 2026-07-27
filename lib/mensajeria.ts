import type { SupabaseClient } from '@supabase/supabase-js'

export type TipoConversacion = 'cliente_proveedor' | 'cliente_admin'
export type TipoRemitente = 'cliente' | 'proveedor' | 'admin'

export type Conversacion = {
  id: string
  tipo: TipoConversacion
  cliente_email: string
  cliente_nombre: string | null
  proveedor_email: string | null
  venta_id: string | null
  venta_item_id: string | null
  producto_nombre: string | null
  created_at: string
  updated_at: string
}

export type Mensaje = {
  id: string
  conversacion_id: string
  remitente_tipo: TipoRemitente
  remitente_email: string | null
  remitente_nombre: string | null
  texto: string
  leido: boolean
  created_at: string
}

/**
 * A partir de una línea de pedido (venta_item), busca qué proveedor mandó ese
 * producto — el vínculo es por SKU contra solicitudes_productos aprobadas,
 * porque `productos` no guarda el email del proveedor directamente (mismo
 * mecanismo que ya usa la pestaña "Administración" del portal proveedores).
 */
export async function resolverProveedorDeVentaItem(
  supabase: SupabaseClient,
  ventaItemId: string,
): Promise<{ email: string; nombre: string } | null> {
  const { data: item } = await supabase
    .from('venta_items')
    .select('producto_id')
    .eq('id', ventaItemId)
    .maybeSingle()
  if (!item?.producto_id) return null

  const { data: producto } = await supabase
    .from('productos')
    .select('sku')
    .eq('id', item.producto_id)
    .maybeSingle()
  if (!producto?.sku) return null

  const { data: solicitud } = await supabase
    .from('solicitudes_productos')
    .select('proveedor_email, proveedor_nombre')
    .eq('producto_sku', producto.sku)
    .eq('estado', 'aprobado')
    .maybeSingle()
  if (!solicitud?.proveedor_email) return null

  return { email: solicitud.proveedor_email, nombre: solicitud.proveedor_nombre ?? solicitud.proveedor_email }
}

/** Busca la conversación cliente↔proveedor de un producto/pedido puntual, o la crea si no existe. */
export async function obtenerOcrearConversacionProveedor(
  supabase: SupabaseClient,
  params: { clienteEmail: string; clienteNombre: string; proveedorEmail: string; ventaId: string; ventaItemId: string; productoNombre: string },
): Promise<string | null> {
  const { data: existente } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('tipo', 'cliente_proveedor')
    .eq('cliente_email', params.clienteEmail)
    .eq('proveedor_email', params.proveedorEmail)
    .eq('venta_item_id', params.ventaItemId)
    .maybeSingle()
  if (existente) return existente.id

  const { data: nueva, error } = await supabase
    .from('conversaciones')
    .insert({
      tipo: 'cliente_proveedor',
      cliente_email: params.clienteEmail,
      cliente_nombre: params.clienteNombre,
      proveedor_email: params.proveedorEmail,
      venta_id: params.ventaId,
      venta_item_id: params.ventaItemId,
      producto_nombre: params.productoNombre,
    })
    .select('id')
    .single()
  if (error) return null
  return nueva.id
}

/** Hilo único cliente↔admin: lo busca o lo crea si es la primera vez que el cliente escribe. */
export async function obtenerOcrearConversacionAdmin(
  supabase: SupabaseClient,
  params: { clienteEmail: string; clienteNombre: string },
): Promise<string | null> {
  const { data: existente } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('tipo', 'cliente_admin')
    .eq('cliente_email', params.clienteEmail)
    .maybeSingle()
  if (existente) return existente.id

  const { data: nueva, error } = await supabase
    .from('conversaciones')
    .insert({ tipo: 'cliente_admin', cliente_email: params.clienteEmail, cliente_nombre: params.clienteNombre })
    .select('id')
    .single()
  if (error) return null
  return nueva.id
}

export async function enviarMensaje(
  supabase: SupabaseClient,
  params: { conversacionId: string; remitenteTipo: TipoRemitente; remitenteEmail: string; remitenteNombre: string; texto: string },
): Promise<boolean> {
  const { error } = await supabase.from('mensajes').insert({
    conversacion_id: params.conversacionId,
    remitente_tipo: params.remitenteTipo,
    remitente_email: params.remitenteEmail,
    remitente_nombre: params.remitenteNombre,
    texto: params.texto.trim(),
  })
  return !error
}

export async function marcarLeidos(
  supabase: SupabaseClient,
  conversacionId: string,
  exceptoTipo: TipoRemitente,
): Promise<void> {
  await supabase.from('mensajes').update({ leido: true })
    .eq('conversacion_id', conversacionId)
    .eq('leido', false)
    .neq('remitente_tipo', exceptoTipo)
}
