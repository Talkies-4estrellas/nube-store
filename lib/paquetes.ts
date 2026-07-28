import { supabase } from './supabase'

export type PaqueteEnvio = {
  venta_item_id: string
  proveedor_email: string
  alto_cm: number | null
  ancho_cm: number | null
  peso_kg: number | null
  updated_at: string
}

export async function fetchPaquetesPorVentaItems(ventaItemIds: string[]) {
  if (ventaItemIds.length === 0) return new Map<string, PaqueteEnvio>()
  const { data } = await supabase
    .from('paquetes_envio')
    .select('venta_item_id, proveedor_email, alto_cm, ancho_cm, peso_kg, updated_at')
    .in('venta_item_id', ventaItemIds)
  return new Map((data ?? []).map(p => [p.venta_item_id as string, p as PaqueteEnvio]))
}

export async function guardarPaquete(
  ventaItemId: string,
  proveedorEmail: string,
  medidas: { alto_cm: number | null; ancho_cm: number | null; peso_kg: number | null },
) {
  return supabase
    .from('paquetes_envio')
    .upsert(
      { venta_item_id: ventaItemId, proveedor_email: proveedorEmail, ...medidas },
      { onConflict: 'venta_item_id' },
    )
}
