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
  producto_id: string | null
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

  // Puede haber más de una solicitud aprobada para el mismo SKU (reenvíos,
  // pruebas, etc.) — .maybeSingle() truena si hay más de una fila, así que
  // se pide la más reciente en vez de asumir que el SKU es único aquí.
  const { data: solicitudes } = await supabase
    .from('solicitudes_productos')
    .select('proveedor_email, proveedor_nombre')
    .eq('producto_sku', producto.sku)
    .eq('estado', 'aprobado')
    .order('created_at', { ascending: false })
    .limit(1)
  const solicitud = solicitudes?.[0]
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

/**
 * A partir de un producto (sin depender de un pedido ya hecho — ej. desde la
 * ficha pública del producto), busca qué proveedor lo subió, mismo mecanismo
 * de `resolverProveedorDeVentaItem` pero arrancando directo del SKU.
 */
export async function resolverProveedorDeProducto(
  supabase: SupabaseClient,
  sku: string,
): Promise<{ email: string; nombre: string } | null> {
  // Mismo caso: puede haber más de una solicitud aprobada para el mismo SKU
  // (reenvíos, pruebas, etc.) — se toma la más reciente en vez de asumir
  // que el SKU es único, para no tronar con .maybeSingle().
  const { data: solicitudes } = await supabase
    .from('solicitudes_productos')
    .select('proveedor_email, proveedor_nombre')
    .eq('producto_sku', sku)
    .eq('estado', 'aprobado')
    .order('created_at', { ascending: false })
    .limit(1)
  const solicitud = solicitudes?.[0]
  if (!solicitud?.proveedor_email) return null
  return { email: solicitud.proveedor_email, nombre: solicitud.proveedor_nombre ?? solicitud.proveedor_email }
}

/** Igual que `obtenerOcrearConversacionProveedor`, pero arrancando desde un producto suelto (sin pedido de por medio). */
export async function obtenerOcrearConversacionProveedorProducto(
  supabase: SupabaseClient,
  params: { clienteEmail: string; clienteNombre: string; proveedorEmail: string; productoId: string; productoNombre: string },
): Promise<string | null> {
  const { data: existente } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('tipo', 'cliente_proveedor')
    .eq('cliente_email', params.clienteEmail)
    .eq('proveedor_email', params.proveedorEmail)
    .eq('producto_id', params.productoId)
    .is('venta_item_id', null)
    .maybeSingle()
  if (existente) return existente.id

  const { data: nueva, error } = await supabase
    .from('conversaciones')
    .insert({
      tipo: 'cliente_proveedor',
      cliente_email: params.clienteEmail,
      cliente_nombre: params.clienteNombre,
      proveedor_email: params.proveedorEmail,
      producto_id: params.productoId,
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

/**
 * Censura números de teléfono / códigos numéricos en vez de bloquear todo
 * el mensaje — así el resto de lo que la persona escribió sí llega, y el
 * número nunca queda visible en el chat. Dos pasadas:
 *  1. Rachas de 6+ dígitos, tolerando también el punto como separador
 *     (para números tipo "44.71.72.21.46").
 *  2. Rachas de 4-5 dígitos, SIN tolerar el punto — así no se come los
 *     centavos de un precio como "$1,400.00" (que solo llega a agrupar
 *     5 dígitos con la primera pasada, nunca 6).
 */
export function censurarNumeros(texto: string): string {
  const OCULTO = '[número oculto]'
  let resultado = texto.replace(/\d(?:[\s\-.()/]*\d){5,}/g, OCULTO)
  resultado = resultado.replace(/\d(?:[\s\-()/]*\d){3,}/g, OCULTO)
  return resultado
}

/**
 * Detecta correos y links/redes que permitirían saltarse el chat interno y
 * contactar fuera de la plataforma — estos sí se bloquean por completo (a
 * diferencia de los números, no tiene sentido "censurar" un link a medias).
 */
export function detectarDatoDeContacto(texto: string): string | null {
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(texto)) {
    return 'No se permite compartir correos electrónicos en el chat.'
  }
  if (/(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?:\/\/|www\.)/i.test(texto)) {
    return 'No se permite compartir redes sociales ni enlaces externos en el chat.'
  }
  return null
}

export async function enviarMensaje(
  supabase: SupabaseClient,
  params: { conversacionId: string; remitenteTipo: TipoRemitente; remitenteEmail: string; remitenteNombre: string; texto: string },
): Promise<{ ok: boolean; error?: string }> {
  const original = params.texto.trim()
  const motivoBloqueo = detectarDatoDeContacto(original)
  if (motivoBloqueo) return { ok: false, error: motivoBloqueo }
  const texto = censurarNumeros(original)

  const { error } = await supabase.from('mensajes').insert({
    conversacion_id: params.conversacionId,
    remitente_tipo: params.remitenteTipo,
    remitente_email: params.remitenteEmail,
    remitente_nombre: params.remitenteNombre,
    texto,
  })
  if (!error) return { ok: true }
  // El trigger de la base de datos (respaldo del filtro de arriba) lanza el
  // mismo texto de motivo vía RAISE EXCEPTION — se lo mostramos tal cual al usuario.
  const esBloqueoDeDatos = error.message?.includes('No se permite compartir')
  return { ok: false, error: esBloqueoDeDatos ? error.message : 'No se pudo enviar el mensaje.' }
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
