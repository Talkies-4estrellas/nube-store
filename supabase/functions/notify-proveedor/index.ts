import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { proveedor_email, proveedor_nombre, producto_nombre, estado } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

    const esAprobado = estado === 'aprobado'
    const asunto = esAprobado
      ? `✅ Tu producto "${producto_nombre}" fue aprobado`
      : `❌ Tu solicitud para "${producto_nombre}" fue rechazada`

    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:900;margin-bottom:4px">
          Order<span style="color:#e7226d">Express</span>
        </h1>
        <p style="color:#6b7280;font-size:13px;margin-bottom:28px">Notificación de solicitud</p>

        <div style="border-radius:12px;padding:20px 24px;background:${esAprobado ? '#d1fae5' : '#fee2e2'};margin-bottom:24px">
          <p style="font-size:16px;font-weight:700;color:${esAprobado ? '#065f46' : '#991b1b'};margin:0">
            ${esAprobado ? '✅ Producto aprobado' : '❌ Solicitud rechazada'}
          </p>
        </div>

        <p style="font-size:15px;color:#374151">Hola <strong>${proveedor_nombre}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6">
          ${esAprobado
            ? `Tu producto <strong>"${producto_nombre}"</strong> ha sido <strong>aprobado</strong> y ya está disponible en el catálogo de la tienda.`
            : `Tu solicitud para el producto <strong>"${producto_nombre}"</strong> ha sido <strong>rechazada</strong>. Puedes enviar una nueva solicitud corrigiendo los datos.`
          }
        </p>

        <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
          Order Express · Este es un mensaje automático, no responder.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Order Express <notificaciones@orderexpress.mx>',
        to: [proveedor_email],
        subject: asunto,
        html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Resend error: ${error}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
