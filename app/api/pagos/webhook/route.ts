import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { getServerSupabase } from '@/lib/supabase-server'
import { getPagosConfig } from '@/lib/pagos-config'

export const runtime = 'nodejs'

/**
 * Webhook de Mercado Pago.
 *
 * MP notifica aquí cuando cambia el estado de un pago. NUNCA confiamos en el
 * cuerpo de la notificación: solo tomamos el id del pago y volvemos a
 * consultarlo contra la API de MP para conocer su estado real.
 *
 * Si el pago está aprobado -> ventas.estado = 'Pagado', lo que dispara el
 * trigger `trg_descontar_stock` que descuenta inventario.
 *
 * Responder siempre 200 cuando la notificación se procesó (o se ignoró a
 * propósito): si devolvemos error, MP reintenta una y otra vez.
 */
export async function POST(req: Request) {
  const { mpAccessToken: accessToken } = await getPagosConfig()
  if (!accessToken) {
    console.error('Webhook MP: falta configurar el access token de Mercado Pago')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  // El id del pago puede venir en el body o en el query string, según el tipo
  // de notificación (webhook nuevo vs IPN antiguo).
  let paymentId: string | null = null
  let tipo: string | null = null
  try {
    const body = await req.json().catch(() => null)
    const url = new URL(req.url)
    tipo = body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
    paymentId = body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? null
  } catch {
    return NextResponse.json({ ok: true })
  }

  // Solo nos interesan las notificaciones de pagos
  if (tipo !== 'payment' || !paymentId) {
    return NextResponse.json({ ok: true })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    console.error('Webhook MP: falta SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  try {
    // Consultar el pago real contra la API de Mercado Pago
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })
    const pago = await new Payment(client).get({ id: paymentId })

    const ventaId = pago.external_reference
    if (!ventaId) return NextResponse.json({ ok: true })

    // Mapear estado de MP -> estado interno de la venta
    let estado: string | null = null
    if (pago.status === 'approved') estado = 'Pagado'
    else if (pago.status === 'rejected' || pago.status === 'cancelled') estado = 'Cancelado'
    // 'pending' / 'in_process' se dejan como están (la venta ya nace 'Pendiente')

    if (estado) {
      const { error } = await supabase
        .from('ventas')
        .update({ estado })
        .eq('id', ventaId)
        .neq('estado', 'Pagado') // no reprocesar una venta ya pagada
      if (error) console.error('Webhook MP: error actualizando venta', error)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook MP: error procesando pago', e)
    // 200 para que MP no entre en bucle de reintentos por un error nuestro
    return NextResponse.json({ ok: true })
  }
}

// MP a veces valida el endpoint con GET
export async function GET() {
  return NextResponse.json({ ok: true })
}
