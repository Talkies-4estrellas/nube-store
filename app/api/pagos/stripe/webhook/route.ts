import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSupabase } from '@/lib/supabase-server'
import { getPagosConfig } from '@/lib/pagos-config'

export const runtime = 'nodejs'

/**
 * Webhook de Stripe.
 *
 * Stripe notifica aquí cuando cambia el estado de un Payment Intent. La
 * firma (`stripe-signature`) se valida con `stripeWebhookSecret` para
 * confirmar que la notificación viene de verdad de Stripe — sin eso,
 * cualquiera podría llamar a este endpoint y marcar ventas como pagadas.
 *
 * Si el pago está aprobado -> ventas.estado = 'Pagado', lo que dispara el
 * trigger `trg_descontar_stock` que descuenta inventario.
 *
 * Responder siempre 200 cuando la notificación se procesó (o se ignoró a
 * propósito): si devolvemos error, Stripe reintenta una y otra vez.
 */
export async function POST(req: Request) {
  const { stripeSecretKey, stripeWebhookSecret } = await getPagosConfig()
  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error('Webhook Stripe: falta configurar las llaves de Stripe')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    console.error('Webhook Stripe: falta SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()
  if (!signature) return NextResponse.json({ ok: true })

  const stripe = new Stripe(stripeSecretKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
  } catch (e) {
    console.error('Webhook Stripe: firma inválida', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      const ventaId = intent.metadata?.ventaId
      if (!ventaId) return NextResponse.json({ ok: true })

      const estado = event.type === 'payment_intent.succeeded' ? 'Pagado' : 'Cancelado'
      const { error } = await supabase
        .from('ventas')
        .update({ estado })
        .eq('id', ventaId)
        .neq('estado', 'Pagado') // no reprocesar una venta ya pagada
      if (error) console.error('Webhook Stripe: error actualizando venta', error)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook Stripe: error procesando evento', e)
    // 200 para que Stripe no entre en bucle de reintentos por un error nuestro
    return NextResponse.json({ ok: true })
  }
}
