'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLE_HOME } from '@/lib/auth-context'
import type { Role } from '@/lib/auth-context'

const NAVY = '#252855'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [oauthError, setOauthError] = useState(searchParams.get('error') === 'oauth')

  async function irSegunRol(userId: string) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) irSegunRol(session.user.id)
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

    await irSegunRol(data.session.user.id)
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setOauthError(false)
    const params = redirect ? `?next=${encodeURIComponent(redirect)}` : ''
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback${params}` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>
          ← Volver a la tienda
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 60, width: 'auto' }} />
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

          {oauthError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 16 }}>
              No se pudo iniciar sesión con ese proveedor. Intenta de nuevo.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>o continúa con</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
              Continuar con Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.5 3.4-3.5.98 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.42V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9z"/></svg>
              Continuar con Facebook
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 20 }}>
          ¿Eres cliente o proveedor? <a href="/registro" style={{ color: NAVY, fontWeight: 700, textDecoration: 'none' }}>Crea una cuenta</a>
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
