import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Crea una preferencia de pago de Mercado Pago (Checkout Pro) para una venta.
 *
 * Recibe: { ventaId }
 * Devuelve: { url } -> punto de inicio del checkout al que se redirige al comprador.
 *
 * Los importes SIEMPRE se recalculan aquí leyendo `venta_items` desde la base de
 * datos. Nunca se confía en precios enviados por el navegador.
 */
export async function POST(req: Request) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'Falta configurar MP_ACCESS_TOKEN' }, { status: 500 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  let ventaId: string
  try {
    const body = await req.json()
    ventaId = String(body.ventaId || '')
    if (!ventaId) throw new Error('sin ventaId')
  } catch {
    return NextResponse.json({ error: 'Petición inválida: falta ventaId' }, { status: 400 })
  }

  // 1. Leer la venta y sus items desde la BD (fuente de verdad de los precios)
  const { data: venta, error: ventaErr } = await supabase
    .from('ventas')
    .select('id, numero, estado, cliente_id')
    .eq('id', ventaId)
    .single()

  if (ventaErr || !venta) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }
  if (venta.estado === 'Pagado') {
    return NextResponse.json({ error: 'Esta venta ya fue pagada' }, { status: 409 })
  }

  const { data: items, error: itemsErr } = await supabase
    .from('venta_items')
    .select('nombre, precio, cantidad')
    .eq('venta_id', ventaId)

  if (itemsErr || !items || items.length === 0) {
    return NextResponse.json({ error: 'La venta no tiene productos' }, { status: 400 })
  }

  // Email del cliente (opcional, mejora la experiencia en el checkout)
  let payerEmail: string | undefined
  if (venta.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes').select('email').eq('id', venta.cliente_id).single()
    payerEmail = cliente?.email ?? undefined
  }

  // 2. Construir la preferencia
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })
  const preference = new Preference(client)

  try {
    const res = await preference.create({
      body: {
        items: items.map((it, i) => ({
          id: String(i),
          title: it.nombre,
          quantity: Number(it.cantidad),
          unit_price: Number(it.precio),
          currency_id: 'MXN',
        })),
        payer: payerEmail ? { email: payerEmail } : undefined,
        // Identifica la venta cuando llegue la notificación del webhook
        external_reference: ventaId,
        back_urls: {
          success: `${origin}/?pago=exito&venta=${venta.numero}`,
          failure: `${origin}/?pago=fallido`,
          pending: `${origin}/?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/pagos/webhook`,
      },
    })

    // sandbox_init_point se usa con credenciales de prueba
    const url = res.sandbox_init_point || res.init_point
    if (!url) {
      return NextResponse.json({ error: 'Mercado Pago no devolvió URL de pago' }, { status: 502 })
    }
    return NextResponse.json({ url })
  } catch (e) {
    console.error('Error creando preferencia MP:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al crear el pago: ${msg}` }, { status: 502 })
  }
}
