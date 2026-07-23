import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * PayPal redirige aquí (GET) tras la aprobación del comprador, con ?token=<orderId>.
 * Capturamos la orden (efectúa el cobro real) y marcamos la venta como Pagada.
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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get('token')
  const ventaId = url.searchParams.get('ventaId')
  const numero = url.searchParams.get('venta')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin

  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!orderId || !ventaId || !clientId || !secret) {
    return NextResponse.redirect(`${origin}/?pago=fallido`)
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.redirect(`${origin}/?pago=fallido`)
  }

  try {
    const accessToken = await obtenerAccessToken(clientId, secret)
    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()

    if (res.ok && data.status === 'COMPLETED') {
      await supabase.from('ventas').update({ estado: 'Pagado' }).eq('id', ventaId).neq('estado', 'Pagado')
      return NextResponse.redirect(`${origin}/?pago=exito&venta=${numero ?? ''}`)
    }

    console.error('Captura PayPal no completada:', data)
    return NextResponse.redirect(`${origin}/?pago=pendiente`)
  } catch (e) {
    console.error('Error capturando orden PayPal:', e)
    return NextResponse.redirect(`${origin}/?pago=fallido`)
  }
}
