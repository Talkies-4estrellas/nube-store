import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createMockSupabaseClient() {
  const emptyListResult = { data: [], error: null, count: 0 }
  const emptySingleResult = { data: null, error: null, count: 0 }

  const createQuery = (result = emptyListResult) => {
    const query = {
      select: () => query,
      insert: () => query,
      update: () => query,
      delete: () => query,
      eq: () => query,
      gt: () => query,
      lte: () => query,
      or: () => query,
      order: () => query,
      limit: () => query,
      single: () => Promise.resolve(emptySingleResult),
      maybeSingle: () => Promise.resolve(emptySingleResult),
      then: Promise.resolve(result).then.bind(Promise.resolve(result)),
    }

    return query
  }

  return {
    from: () => createQuery(),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
  }
}

export const supabase: SupabaseClient =
  url && key ? createClient(url, key) : createMockSupabaseClient() as unknown as SupabaseClient
