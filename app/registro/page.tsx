'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLE_HOME } from '@/lib/auth-context'
import type { Role } from '@/lib/auth-context'
import { isValidEmail } from '@/lib/validation'

const NAVY = '#252855'

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rolInicial = searchParams.get('rol') === 'proveedor' ? 'proveedor' : 'basico'

  const [rol, setRol] = useState<'proveedor' | 'basico'>(rolInicial)
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState<'sesion' | 'confirmar' | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    if (!isValidEmail(email)) { setError('El email no es válido'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: rol,
          nombre: nombre.trim(),
          empresa: rol === 'proveedor' ? empresa.trim() || null : null,
          telefono: telefono.trim() || null,
        },
      },
    })

    if (authError) {
      setError(authError.message.includes('already registered') || authError.message.includes('already exists')
        ? 'Ya existe una cuenta con ese email.'
        : 'No se pudo crear la cuenta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    if (data.session) {
      router.replace(ROLE_HOME[rol as Role])
    } else {
      // El proyecto tiene confirmación de email activada: no hay sesión todavía
      setExito('confirmar')
      setLoading(false)
    }
  }

  if (exito === 'confirmar') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '36px 36px 32px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Cuenta creada</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>Revisa tu correo <strong>{email}</strong> para confirmar tu cuenta antes de iniciar sesión.</p>
          <a href="/login" style={{ display: 'inline-block', marginTop: 20, background: NAVY, color: '#fff', padding: '11px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Ir a iniciar sesión</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>
          ← Volver a la tienda
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 60, width: 'auto', marginBottom: 8 }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Crear una cuenta</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '32px 32px 28px', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
            <button type="button" onClick={() => setRol('basico')}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${rol === 'basico' ? NAVY : '#e5e7eb'}`, background: rol === 'basico' ? NAVY : '#fff', color: rol === 'basico' ? '#fff' : '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              🛍️ Cliente
            </button>
            <button type="button" onClick={() => setRol('proveedor')}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${rol === 'proveedor' ? NAVY : '#e5e7eb'}`, background: rol === 'proveedor' ? NAVY : '#fff', color: rol === 'proveedor' ? '#fff' : '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              📦 Proveedor
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Nombre completo</label>
              <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" disabled={loading} />
            </div>

            {rol === 'proveedor' && (
              <div>
                <label style={lbl}>Empresa (opcional)</label>
                <input style={inp} value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nombre de tu empresa" disabled={loading} />
              </div>
            )}

            <div>
              <label style={lbl}>Teléfono (opcional)</label>
              <input style={inp} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="55 1234 5678" disabled={loading} />
            </div>

            <div>
              <label style={lbl}>Email</label>
              <input type="email" style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" disabled={loading} autoComplete="email" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Contraseña</label>
                <input type="password" style={inp} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
              </div>
              <div>
                <label style={lbl}>Confirmar</label>
                <input type="password" style={inp} value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: loading ? '#9ca3af' : NAVY, color: '#fff', border: 'none', padding: '13px 0', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer', marginTop: 4 }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 20 }}>
          ¿Ya tienes cuenta? <a href="/login" style={{ color: NAVY, fontWeight: 700, textDecoration: 'none' }}>Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${NAVY}20`, borderTop: `3px solid ${NAVY}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <RegistroForm />
    </Suspense>
  )
}
