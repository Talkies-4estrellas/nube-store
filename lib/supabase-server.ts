import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase para uso EXCLUSIVO en el servidor (Route Handlers).
 *
 * Usa la SERVICE ROLE KEY, que ignora RLS. Es indispensable para el webhook de
 * pagos: la política RLS de `ventas` solo permite UPDATE a admin/vendedor, y el
 * webhook de Mercado Pago llega sin sesión de usuario.
 *
 * ⚠️ NUNCA importar este archivo desde un componente cliente ('use client').
 * La service role key da acceso total a la base de datos.
 */
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
