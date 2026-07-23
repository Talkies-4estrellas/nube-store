import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Crea una orden de PayPal (Checkout) para una venta, usando la REST API v2
 * directamente (sin SDK): https://developer.paypal.com/docs/api/orders/v2/
 *
 * Recibe: { ventaId }
 * Devuelve: { url } -> link de aprobación al que se redirige al comprador.
 *
 * Los importes SIEMPRE se recalculan aquí leyendo `venta_items` desde la base
 * de datos. Nunca se confía en precios enviados por el navegador.
 */

function paypalBase() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

async function obtenerAccessToken(clientId: string, secret: string) {
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('No se pudo autenticar con PayPal')
  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: Request) {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) {
    return NextResponse.json({ error: 'Falta configurar PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET' }, { status: 500 })
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

  const { data: venta, error: ventaErr } = await supabase
    .from('ventas')
    .select('id, numero, estado, total')
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

  const total = items.reduce((t, it) => t + Number(it.precio) * Number(it.cantidad), 0)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  try {
    const accessToken = await obtenerAccessToken(clientId, secret)

    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: ventaId,
          amount: { currency_code: 'MXN', value: total.toFixed(2) },
          items: items.map(it => ({
            name: it.nombre.slice(0, 127),
            quantity: String(it.cantidad),
            unit_amount: { currency_code: 'MXN', value: Number(it.precio).toFixed(2) },
          })),
        }],
        application_context: {
          return_url: `${origin}/api/pagos/paypal/capturar?venta=${venta.numero}&ventaId=${ventaId}`,
          cancel_url: `${origin}/?pago=fallido`,
          user_action: 'PAY_NOW',
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Error creando orden PayPal:', data)
      return NextResponse.json({ error: 'Error al crear el pago con PayPal' }, { status: 502 })
    }

    const link = (data.links || []).find((l: { rel: string; href: string }) => l.rel === 'approve')?.href
    if (!link) {
      return NextResponse.json({ error: 'PayPal no devolvió URL de aprobación' }, { status: 502 })
    }
    return NextResponse.json({ url: link })
  } catch (e) {
    console.error('Error creando orden PayPal:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al crear el pago: ${msg}` }, { status: 502 })
  }
}
