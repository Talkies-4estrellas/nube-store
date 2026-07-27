import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '')
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '')

/**
 * Valida que la URL sea utilizable antes de pasarla al cliente de Supabase.
 * Sin esto, un valor mal configurado (con comillas, sin protocolo o con el
 * nombre de la variable incluido) revienta el build de Next.js al prerenderizar.
 */
function urlValida(u: string | undefined): u is string {
  if (!u) return false
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const url = urlValida(rawUrl) ? rawUrl : undefined

if (rawUrl && !url) {
  console.error(
    `[Supabase] NEXT_PUBLIC_SUPABASE_URL tiene un valor inválido: "${rawUrl}"\n` +
    '  Debe ser la Project URL completa, por ejemplo: https://tuproyecto.supabase.co\n' +
    '  Sin comillas, sin el nombre de la variable y sin /rest/v1/ al final.\n' +
    '  La app seguirá con datos vacíos hasta que se corrija.'
  )
}

// Mock para builds sin vars de entorno
function createMockClient() {
  const emptyList   = { data: [], error: null, count: 0 }
  const emptySingle = { data: null, error: null, count: 0 }
  const q = (): Record<string, unknown> => ({
    select: () => q(), insert: () => q(), update: () => q(), delete: () => q(),
    upsert: () => q(), eq: () => q(), neq: () => q(), gt: () => q(), gte: () => q(),
    lt: () => q(), lte: () => q(), or: () => q(), ilike: () => q(), filter: () => q(),
    order: () => q(), limit: () => q(), range: () => q(),
    single:      () => Promise.resolve(emptySingle),
    maybeSingle: () => Promise.resolve(emptySingle),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(emptyList).then(resolve),
  })
  return {
    from: () => q(),
    auth: {
      getUser:     () => Promise.resolve({ data: { user: null }, error: null }),
      getSession:  () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signInWithOAuth:    () => Promise.resolve({ data: { provider: '', url: null }, error: null }),
      signOut:     () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: {
      from: () => ({
        upload:       () => Promise.resolve({ data: null, error: null }),
        remove:       () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: p } }),
      }),
    },
    channel: () => ({
      on:        function(this: unknown) { return this },
      subscribe: () => {},
    }),
    removeChannel: () => {},
  }
}

// createBrowserClient almacena la sesión en cookies además de localStorage,
// lo que permite que el middleware de Next.js pueda leerla sin DB extra.
const conectado = Boolean(url && key)

if (!conectado) {
  console.error(
    '[Supabase] Cliente NO conectado — la app devolverá listas vacías.\n' +
    `  NEXT_PUBLIC_SUPABASE_URL: ${url ? 'OK' : 'FALTA o inválida'}\n` +
    `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? 'OK' : 'FALTA'}\n` +
    '  Recuerda: las variables NEXT_PUBLIC_* se incrustan al hacer el BUILD.\n' +
    '  Tras configurarlas en Vercel hay que volver a desplegar.'
  )
}

export const supabase: SupabaseClient =
  conectado
    ? createBrowserClient(url!, key!)
    : (createMockClient() as unknown as SupabaseClient)

/** Permite avisar en la interfaz cuando la base de datos no está configurada. */
export const supabaseConectado = conectado
