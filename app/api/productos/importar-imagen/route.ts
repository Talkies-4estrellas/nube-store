import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB por imagen

const EXT_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

/**
 * Descarga una imagen desde una URL externa y la guarda en Supabase Storage.
 *
 * Se hace en el servidor porque el navegador no puede descargar imágenes de
 * otros dominios (CORS). Así la tienda deja de depender de que el enlace
 * externo siga vivo.
 *
 * Recibe: { url, sku }
 * Devuelve: { url } -> URL pública ya alojada en nuestro Storage
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  let origen: string
  let sku: string
  try {
    const body = await req.json()
    origen = String(body.url || '')
    sku = String(body.sku || 'producto')
    if (!/^https?:\/\//i.test(origen)) throw new Error('URL inválida')
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  try {
    const resp = await fetch(origen, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
    if (!resp.ok) {
      return NextResponse.json({ error: `El enlace respondió ${resp.status}` }, { status: 422 })
    }

    const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!tipo.startsWith('image/')) {
      return NextResponse.json({ error: 'El enlace no apunta a una imagen' }, { status: 422 })
    }

    const buf = Buffer.from(await resp.arrayBuffer())
    if (buf.byteLength === 0) {
      return NextResponse.json({ error: 'La imagen está vacía' }, { status: 422 })
    }
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen supera los 8 MB' }, { status: 422 })
    }

    const ext = EXT_POR_TIPO[tipo] ?? 'jpg'
    const safeSku = sku.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 40) || 'producto'
    const path = `importados/${Date.now()}-${safeSku}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('productos')
      .upload(path, buf, { contentType: tipo, upsert: false })

    if (upErr) {
      return NextResponse.json({ error: `Error al guardar: ${upErr.message}` }, { status: 502 })
    }

    const { data } = supabase.storage.from('productos').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `No se pudo descargar la imagen: ${msg}` }, { status: 502 })
  }
}
