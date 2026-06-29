import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
export const supabase: SupabaseClient =
  url && key
    ? createBrowserClient(url, key)
    : (createMockClient() as unknown as SupabaseClient)
