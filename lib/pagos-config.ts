import { getServerSupabase } from './supabase-server'

/**
 * Credenciales de las pasarelas de pago: primero intenta leerlas de
 * `config_pagos_secretos` (configurables desde el panel, sin redeploy —
 * funciona igual con llaves de prueba o de producción, tal como se diseñó),
 * y si no hay valor, cae a las variables de entorno (.env.local / Vercel).
 *
 * La protección contra accesos indebidos vive en la política de RLS de
 * `config_pagos_secretos` (solo admin puede leer/escribir esa tabla) — ver
 * Doc/database/migration_seguridad_claves_pago.sql — no en este archivo.
 */
export async function getPagosConfig() {
  const supabase = getServerSupabase()
  const { data } = supabase
    ? await supabase.from('config_pagos_secretos').select('*').eq('id', 1).maybeSingle()
    : { data: null }

  return {
    mpAccessToken: data?.mp_access_token || process.env.MP_ACCESS_TOKEN || null,

    paypalClientId: data?.paypal_client_id || process.env.PAYPAL_CLIENT_ID || null,
    paypalClientSecret: data?.paypal_client_secret || process.env.PAYPAL_CLIENT_SECRET || null,
    paypalMode: data?.paypal_mode || process.env.PAYPAL_MODE || 'sandbox',

    openpayMerchantId: data?.openpay_merchant_id || process.env.OPENPAY_MERCHANT_ID || null,
    openpayPrivateKey: data?.openpay_private_key || process.env.OPENPAY_PRIVATE_KEY || null,
    openpayMode: data?.openpay_mode || process.env.OPENPAY_MODE || 'sandbox',
  }
}
