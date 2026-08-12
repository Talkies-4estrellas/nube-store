import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const MODELO = 'gemini-2.5-flash-image'
const LIMITE_DIARIO_GRATIS = 500

// Prompt fijo — a propósito no es editable desde el panel. Insiste en NO
// alterar el producto: el riesgo real de un modelo generativo es que
// "mejore" de más y termine cambiando algo del producto real.
const PROMPT_MEJORA =
  'Mejora la iluminación, el contraste y la nitidez de esta foto de producto ' +
  'para el catálogo de una tienda en línea. No cambies el producto, su forma, ' +
  'color ni ningún detalle real. No agregues ni quites elementos ni cambies el ' +
  'fondo — solo mejora la calidad de la imagen tal cual es.'

/**
 * Mejora una foto de producto con IA (Gemini 2.5 Flash Image / "nano banana").
 *
 * Recibe: { image: base64 sin prefijo, mimeType }
 * Devuelve: { image: base64, mimeType, usoHoy, avisoLimite? }
 *
 * La llave de Gemini vive SOLO en variable de entorno (GEMINI_API_KEY) — a
 * diferencia de las pasarelas de pago, no es editable desde el panel (así se
 * decidió para esta primera prueba, solo disponible en el panel admin).
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta configurar GEMINI_API_KEY' }, { status: 500 })
  }

  let image: string, mimeType: string
  try {
    const body = await req.json()
    image = String(body.image || '')
    mimeType = String(body.mimeType || 'image/webp')
    if (!image) throw new Error('sin imagen')
  } catch {
    return NextResponse.json({ error: 'Petición inválida: falta la imagen' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT_MEJORA },
              { inline_data: { mime_type: mimeType, data: image } },
            ],
          }],
        }),
      },
    )

    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini respondió ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const partes = data?.candidates?.[0]?.content?.parts ?? []
    const imgPart = partes.find((p: { inline_data?: { data?: string } }) => p.inline_data?.data)
    if (!imgPart) {
      return NextResponse.json({ error: 'Gemini no devolvió una imagen' }, { status: 502 })
    }

    // Contador de uso diario (no bloquea, solo avisa si se acerca al límite gratuito)
    let usoHoy = 0
    const supabase = getServerSupabase()
    if (supabase) {
      const hoy = new Date().toISOString().slice(0, 10)
      const { data: fila } = await supabase.from('ia_uso_imagenes').select('contador').eq('fecha', hoy).maybeSingle()
      usoHoy = (fila?.contador ?? 0) + 1
      await supabase.from('ia_uso_imagenes').upsert({ fecha: hoy, contador: usoHoy })
    }

    return NextResponse.json({
      image: imgPart.inline_data.data,
      mimeType: imgPart.inline_data.mime_type || 'image/png',
      usoHoy,
      avisoLimite: usoHoy >= LIMITE_DIARIO_GRATIS * 0.9,
    })
  } catch (e) {
    console.error('Error mejorando imagen con Gemini:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al mejorar la imagen: ${msg}` }, { status: 502 })
  }
}
