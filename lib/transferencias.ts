import { supabase } from './supabase'

export type Transferencia = {
  id: string
  lote_id: string
  producto_id: string
  producto_nombre: string
  producto_sku: string
  proveedor_email: string
  proveedor_nombre: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  created_at: string
  respondida_at: string | null
}

export async function crearTransferencias(
  productos: { id: string; nombre: string; sku: string }[],
  proveedor: { email: string; nombre: string },
  creadoPor: string | undefined,
) {
  const loteId = crypto.randomUUID()
  const filas = productos.map(p => ({
    lote_id: loteId,
    producto_id: p.id,
    producto_nombre: p.nombre,
    producto_sku: p.sku,
    proveedor_email: proveedor.email,
    proveedor_nombre: proveedor.nombre,
    creado_por: creadoPor ?? null,
  }))
  return supabase.from('transferencias_productos').insert(filas)
}

export async function fetchTransferenciasPendientes(proveedorEmail: string) {
  const { data } = await supabase
    .from('transferencias_productos')
    .select('*')
    .eq('proveedor_email', proveedorEmail)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  return (data ?? []) as Transferencia[]
}

export async function aceptarTransferencia(id: string) {
  return supabase.rpc('aceptar_transferencia', { transferencia_id: id })
}

export async function rechazarTransferencia(id: string) {
  return supabase.rpc('rechazar_transferencia', { transferencia_id: id })
}
