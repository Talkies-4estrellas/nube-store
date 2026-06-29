'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLE_HOME } from '@/lib/auth-context'
import type { Role } from '@/lib/auth-context'

const NAVY = '#252855'
const PINK = '#e7226d'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirect ?? '/dashboard')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (authError || !data.session) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.session.user.id)
      .single()

    if (!roleData) {
      await supabase.auth.signOut()
      setError('Tu cuenta no tiene un rol asignado. Contacta al administrador.')
      setLoading(false)
      return
    }

    const home = ROLE_HOME[roleData.role as Role] ?? '/dashboard'
    router.replace(redirect ?? home)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: NAVY, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>OE</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>
              <span style={{ color: NAVY }}>Order</span>
              <span style={{ color: PINK }}>Express</span>
            </span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Panel administrativo</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 36px 32px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 6 }}>Iniciar sesión</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                disabled={loading}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa', transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = NAVY)}
                onBlur={e  => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa', transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = NAVY)}
                onBlur={e  => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? '#9ca3af' : NAVY, color: '#fff', border: 'none', padding: '13px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer', marginTop: 4, transition: 'background 0.15s', letterSpacing: '0.01em' }}
            >
              {loading ? 'Verificando...' : 'Entrar al panel'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
          ¿Sin acceso? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${NAVY}20`, borderTop: `3px solid ${NAVY}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
