'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAVY = '#252855'

export default function TerminosPage() {
  const [texto, setTexto] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('config_storefront').select('terminos').eq('id', 1).single()
      .then(({ data }) => setTexto(data?.terminos ?? ''))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
          ← Volver a la tienda
        </a>

        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 20 }}>Términos y condiciones</h1>

          {texto === null ? (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Cargando...</p>
          ) : texto.trim() ? (
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{texto}</p>
          ) : (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Todavía no hay términos y condiciones publicados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
