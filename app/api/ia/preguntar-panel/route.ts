import { NextResponse } from 'next/server'
import { PREGUNTAS } from '@/lib/preguntasFrecuentes'

export const runtime = 'nodejs'

const MODELO = 'gemini-flash-latest'

/**
 * Responde una pregunta libre sobre el uso del panel administrativo,
 * usando como contexto las preguntas frecuentes ya redactadas a mano
 * (components/AyudaPanel.tsx / lib/preguntasFrecuentes.ts) — así la IA
 * responde con información real de CÓMO FUNCIONA ESTE panel específico,
 * no con generalidades inventadas.
 *
 * Solo se llama cuando el usuario lo pide explícitamente (botón aparte en
 * el panel de ayuda), nunca automáticamente mientras escribe, para no
 * gastar cuota gratuita de Gemini en preguntas a medio terminar.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta configurar GEMINI_API_KEY' }, { status: 500 })
  }

  let pregunta: string
  try {
    const body = await req.json()
    pregunta = String(body.pregunta || '').trim()
    if (!pregunta) throw new Error('sin pregunta')
  } catch {
    return NextResponse.json({ error: 'Petición inválida: falta la pregunta' }, { status: 400 })
  }

  const contexto = PREGUNTAS.map(p =>
    `Categoría: ${p.categoria}\nPregunta: ${p.pregunta}\nExplicación: ${p.explicacion}\nConfusión común: ${p.confusion}\nTutorial: ${p.tutorial.join(' → ')}`
  ).join('\n\n')

  const prompt =
    'Eres el asistente de ayuda del panel administrativo de "Order Express", una tienda en línea. ' +
    'Responde la pregunta del administrador usando SOLO la información de las preguntas frecuentes de abajo como referencia de cómo funciona el panel. ' +
    'Si la pregunta no se puede responder con esa información, dilo claramente en vez de inventar — no supongas funciones que no aparecen ahí. ' +
    'Responde en español, corto y directo (máximo 4-5 líneas), en tono práctico como las respuestas de ejemplo.\n\n' +
    `--- PREGUNTAS FRECUENTES DEL PANEL ---\n${contexto}\n--- FIN ---\n\n` +
    `Pregunta del administrador: ${pregunta}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )

    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini respondió ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!respuesta) {
      return NextResponse.json({ error: 'Gemini no devolvió una respuesta' }, { status: 502 })
    }

    return NextResponse.json({ respuesta })
  } catch (e) {
    console.error('Error preguntando a Gemini:', e)
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `Error al consultar la IA: ${msg}` }, { status: 502 })
  }
}
