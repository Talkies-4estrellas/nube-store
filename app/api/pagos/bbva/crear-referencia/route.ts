import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Genera una referencia de transferencia bancaria (SPEI) vía OpenPay, la
 * pasarela de pagos propiedad de BBVA para negocios en México:
 * https://www.openpay.mx/docs/api/#cargos-por-transferencia-spei
 *
 * A diferencia de Mercado Pago / PayPal (redirección a un checkout externo),
 * aquí se devuelve directamente una CLABE y referencia para que el cliente
 * pague desde su banca (incluida la app BBVA).
 *
 * Recibe: { ventaId }
 * Devuelve: { clabe, referencia, banco }
 */
export async function POST(req: Request) {
  const merchantId = process.env.OPENPAY_MERCHANT_ID
  const privateKey = process.env.OPENPAY_PRIVATE_KEY
  if (!merchantId || !privateKey) {
    return NextResponse.json({ error: 'Falta configurar OPENPAY_MERCHANT_ID / OPENPAY_PRIVATE_KEY' }, { status: 500 })
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
    .select('precio, cantidad')
    .eq('venta_id', ventaId)

  if (itemsErr || !items || items.length === 0) {
    return NextResponse.json({ error: 'La venta no tiene productos' }, { status: 400 })
  }

  let nombre = 'Cliente'
  let email = 'cliente@ordenexpress.com'
  if (venta.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes').select('nombre, email').eq('id', venta.cliente_id).single()
    if (cliente) { nombre = cliente.nombre || nombre; email = cliente.email || email }
  }

  const total = items.reduce((t, it) => t + Number(it.precio) * Number(it.cantidad), 0)
  const base = process.env.OPENPAY_MODE === 'live'
    ? `https://api.openpay.mx/v1/${merchantId}`
    : `https://sandbox-api.openpay.mx/v1/${merchantId}`

  try {
    const res = await fetch(`${base}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'bank_account',
        amount: Number(total.toFixed(2)),
        description: `Venta #${venta.numero} - Order Express`,
        order_id: venta.id,
        customer: { name: nombre, email },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Error creando referencia OpenPay/BBVA:', data)
      return NextResponse.json({ error: data.description || 'Error al generar la referencia de pago' }, { status: 502 })
    }

    return NextResponse.json({
      clabe: data.payment_method?.clabe,
      referencia: data.payment_method?.reference,
      banco: data.payment_method?.bank,
      chargeId: data.id,
    })
  } catch (e) {
    console.error('Error generando referencia BBVA/OpenPay:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al generar la referencia: ${msg}` }, { status: 502 })
  }
}
