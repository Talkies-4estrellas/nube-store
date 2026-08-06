'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import ChatPanel from '@/components/ChatPanel'
import type { Conversacion } from '@/lib/mensajeria'

const NAVY = '#252855'

/**
 * Mensajes de clientes sobre un PRODUCTO puntual — llegan aquí cuando el
 * producto no tiene proveedor real vinculado y el cliente usa "Contactar a
 * soporte" desde la ficha del producto en vez de "Contactar al proveedor".
 * Separado a propósito del soporte general/técnico/empresa, que sigue en
 * Configuración → Comentarios (ver Doc/database/migration_separar_mensajes_producto.sql).
 */
export default function MensajesPage() {
  const { user } = useAuth()
  const [mensajes, setMensajes] = useState<Conversacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [activa, setActiva] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('tipo', 'cliente_admin')
      .not('producto_id', 'is', null)
      .order('updated_at', { ascending: false })
    setMensajes(data ?? [])
    setCargando(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>Mensajes</h1>
        <button onClick={cargar} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
          ↻ Actualizar
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: -10, marginBottom: 20 }}>
        Preguntas de clientes sobre productos sin proveedor vinculado. El soporte técnico o de empresa se atiende aparte, en Configuración → Comentarios.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Cargando...</p>
          ) : mensajes.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Ningún cliente te ha escrito sobre un producto todavía.</p>
          ) : (
            mensajes.map(m => {
              const activo = activa === m.id
              return (
                <button key={m.id} type="button" onClick={() => setActiva(m.id)}
                  style={{ width: '100%', display: 'block', padding: '12px 18px', background: activo ? '#eff6ff' : 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.producto_nombre || 'Producto'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.cliente_nombre || m.cliente_email}
                  </p>
                </button>
              )
            })
          )}
        </div>

        {activa && user ? (() => {
          const c = mensajes.find(m => m.id === activa)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c && (
                <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.producto_nombre || 'Producto'}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>· pregunta</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{c.cliente_nombre || c.cliente_email}</span>
                </div>
              )}
              <ChatPanel supabase={supabase} conversacionId={activa} remitenteTipo="admin" remitenteEmail={user.email} remitenteNombre={user.nombre} accent="#0049ff" />
            </div>
          )
        })() : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Selecciona una conversación para verla.
          </div>
        )}
      </div>
    </div>
  )
}
