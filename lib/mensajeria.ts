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
 * Detecta datos de contacto (teléfonos, correos, redes, links externos) que
 * permitirían saltarse el chat interno y contactar fuera de la plataforma.
 * Se aplica antes de insertar el mensaje — protección de datos entre cliente
 * y proveedor pedida explícitamente: el chat es el único canal permitido.
 */
export function detectarDatoDeContacto(texto: string): string | null {
  // Teléfonos / códigos numéricos: se quitan los separadores que alguien
  // podría meter para partir un número y colarlo (espacios, guiones, puntos,
  // paréntesis, diagonales) y se busca una racha de 6+ dígitos seguidos.
  // Antes solo toleraba esos separadores DENTRO del conteo de repeticiones,
  // así que "3211/212" (con "/") o cualquier número de 6 dígitos exacto
  // se colaban — ya no.
  const soloNumeros = texto.replace(/[\s\-.()/]/g, '')
  if (/\d{6,}/.test(soloNumeros)) {
    return 'No se permite compartir números de teléfono u otros datos numéricos de contacto en el chat.'
  }
  // Correos electrónicos
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(texto)) {
    return 'No se permite compartir correos electrónicos en el chat.'
  }
  // Redes sociales / apps de mensajería / links externos
  if (/(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?:\/\/|www\.)/i.test(texto)) {
    return 'No se permite compartir redes sociales ni enlaces externos en el chat.'
  }
  return null
}

export async function enviarMensaje(
  supabase: SupabaseClient,
  params: { conversacionId: string; remitenteTipo: TipoRemitente; remitenteEmail: string; remitenteNombre: string; texto: string },
): Promise<{ ok: boolean; error?: string }> {
  const texto = params.texto.trim()
  const motivoBloqueo = detectarDatoDeContacto(texto)
  if (motivoBloqueo) return { ok: false, error: motivoBloqueo }

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
