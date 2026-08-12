import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabase } from '@/lib/supabase-server'
import { getPagosConfig } from '@/lib/pagos-config'

export const runtime = 'nodejs'

/**
 * Crea un Payment Intent de Stripe para una venta (formulario de tarjeta
 * propio con Stripe Elements — el cliente nunca sale del sitio).
 *
 * Recibe: { ventaId }
 * Devuelve: { clientSecret, publishableKey }
 *
 * El importe SIEMPRE se recalcula aquí leyendo `venta_items` desde la base
 * de datos. Nunca se confía en precios enviados por el navegador.
 */
export async function POST(req: Request) {
  const { stripeSecretKey, stripePublishableKey } = await getPagosConfig()
  if (!stripeSecretKey || !stripePublishableKey) {
    return NextResponse.json({ error: 'Falta configurar las llaves de Stripe' }, { status: 500 })
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
    .select('id, numero, estado')
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
    .select('precio, cantidad')
    .eq('venta_id', ventaId)

  if (itemsErr || !items || items.length === 0) {
    return NextResponse.json({ error: 'La venta no tiene productos' }, { status: 400 })
  }

  const total = items.reduce((s, it) => s + Number(it.precio) * Number(it.cantidad), 0)
  // Stripe espera el importe en la unidad más pequeña de la moneda (centavos)
  const amountInCents = Math.round(total * 100)

  const stripe = new Stripe(stripeSecretKey)

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn',
      // Identifica la venta cuando llegue la notificación del webhook
      metadata: { ventaId },
      automatic_payment_methods: { enabled: true },
    })

    if (!intent.client_secret) {
      return NextResponse.json({ error: 'Stripe no devolvió client_secret' }, { status: 502 })
    }
    return NextResponse.json({ clientSecret: intent.client_secret, publishableKey: stripePublishableKey })
  } catch (e) {
    console.error('Error creando Payment Intent de Stripe:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al crear el pago: ${msg}` }, { status: 502 })
  }
}
