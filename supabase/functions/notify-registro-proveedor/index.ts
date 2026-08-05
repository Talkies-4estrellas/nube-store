import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PASSWORD_CUENTA_DEFAULT = 'admin1234'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, nombre_contacto, estado, motivo } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

    const esAprobado = estado === 'aprobado'
    const asunto = esAprobado
      ? '✅ Tu solicitud para ser proveedor fue aprobada'
      : '❌ Tu solicitud para ser proveedor fue rechazada'

    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:900;margin-bottom:4px">
          Order<span style="color:#e7226d">Express</span>
        </h1>
        <p style="color:#6b7280;font-size:13px;margin-bottom:28px">Registro de proveedores</p>

        <div style="border-radius:12px;padding:20px 24px;background:${esAprobado ? '#d1fae5' : '#fee2e2'};margin-bottom:24px">
          <p style="font-size:16px;font-weight:700;color:${esAprobado ? '#065f46' : '#991b1b'};margin:0">
            ${esAprobado ? '✅ Solicitud aprobada' : '❌ Solicitud rechazada'}
          </p>
        </div>

        <p style="font-size:15px;color:#374151">Hola <strong>${nombre_contacto}</strong>,</p>

        ${esAprobado ? `
          <p style="font-size:14px;color:#374151;line-height:1.6">
            ¡Buenas noticias! Tu solicitud para vender en Order Express fue <strong>aprobada</strong>. Ya puedes entrar a tu panel de proveedor con estos datos:
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin:16px 0">
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">Email</p>
            <p style="font-size:14px;font-weight:700;color:#111;margin:0 0 14px;font-family:monospace">${email}</p>
            <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">Contraseña</p>
            <p style="font-size:14px;font-weight:700;color:#111;margin:0;font-family:monospace">${PASSWORD_CUENTA_DEFAULT}</p>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px">
            <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6">
              ⚠️ Por seguridad, <strong>cambia esta contraseña</strong> en cuanto inicies sesión. Ve a <strong>Panel de proveedor → Ajustes → Editar perfil</strong> y captura una nueva.
            </p>
          </div>
          <a href="https://nube-store-pi.vercel.app/login" style="display:inline-block;background:#252855;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
            Iniciar sesión
          </a>
        ` : `
          <p style="font-size:14px;color:#374151;line-height:1.6">
            Gracias por tu interés en vender en Order Express. Por ahora, tu solicitud fue <strong>rechazada</strong>.
          </p>
          ${motivo ? `
            <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;margin:16px 0">
              <p style="font-size:11px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 4px">Motivo</p>
              <p style="font-size:13px;color:#7f1d1d;margin:0">${motivo}</p>
            </div>
          ` : ''}
          <p style="font-size:13px;color:#6b7280;line-height:1.6">
            Puedes volver a postularte más adelante si la situación cambia.
          </p>
        `}

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
        from: 'Order Express <onboarding@resend.dev>',
        to: [email],
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
