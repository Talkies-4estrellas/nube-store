import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Webhook de OpenPay (BBVA). OpenPay notifica aquí cuando el estado de un
 * cargo cambia (ej. la transferencia SPEI fue recibida).
 *
 * Igual que el webhook de Mercado Pago: no confiamos en el cuerpo de la
 * notificación más que para identificar la venta (order_id = ventaId) y el
 * estado del cargo.
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase()
  if (!supabase) {
    console.error('Webhook BBVA/OpenPay: falta SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  try {
    const body = await req.json().catch(() => null)
    const charge = body?.transaction
    const ventaId: string | undefined = charge?.order_id
    const status: string | undefined = charge?.status

    if (!ventaId || !status) return NextResponse.json({ ok: true })

    let estado: string | null = null
    if (status === 'completed') estado = 'Pagado'
    else if (status === 'cancelled' || status === 'failed') estado = 'Cancelado'

    if (estado) {
      const { error } = await supabase
        .from('ventas')
        .update({ estado })
        .eq('id', ventaId)
        .neq('estado', 'Pagado')
      if (error) console.error('Webhook BBVA/OpenPay: error actualizando venta', error)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook BBVA/OpenPay: error procesando notificación', e)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
