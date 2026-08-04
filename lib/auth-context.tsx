'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'admin' | 'vendedor' | 'bodega' | 'proveedor' | 'basico'

export type AuthUser = {
  id: string
  email: string
  nombre: string
  role: Role
  avatar_url: string | null
  estado: 'activo' | 'suspendido'
  /** Pausa que el propio proveedor activó (distinta de una suspensión del
   * admin) — mientras está en true, puede seguir entrando a su portal para
   * reactivarse él mismo. */
  pausadoPorTitular: boolean
}

// Rutas que cada rol puede ver
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin:     ['/dashboard', '/ventas', '/productos', '/clientes', '/envio-nube', '/tienda-en-linea', '/punto-de-venta', '/configuracion'],
  vendedor:  ['/dashboard', '/ventas', '/clientes'],
  bodega:    ['/productos', '/envio-nube'],
  proveedor: ['/proveedores'],
  basico:    ['/mi-cuenta'],
}

// Página de inicio por rol (post-login)
export const ROLE_HOME: Record<Role, string> = {
  admin:     '/dashboard',
  vendedor:  '/dashboard',
  bodega:    '/productos',
  proveedor: '/proveedores',
  basico:    '/mi-cuenta',
}

export function canAccess(role: Role | undefined, pathname: string): boolean {
  if (!role) return false
  return ROLE_ROUTES[role].some(r => pathname.startsWith(r))
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async (session: Session | null) => {
    if (!session?.user) { setUser(null); setLoading(false); return }

    const { data } = await supabase
      .from('user_roles')
      .select('role, nombre, avatar_url')
      .eq('user_id', session.user.id)
      .single()

    if (data) {
      // `estado`/`pausado_por_titular` se consultan aparte y con fallback
      // silencioso: si las migraciones todavía no corrieron en esta base,
      // esas columnas no existen — no debe tumbar el login de nadie por eso.
      let estado: 'activo' | 'suspendido' = 'activo'
      let pausadoPorTitular = false
      try {
        const { data: estadoRow } = await supabase
          .from('user_roles').select('estado, pausado_por_titular').eq('user_id', session.user.id).single()
        if (estadoRow?.estado === 'suspendido') estado = 'suspendido'
        if (estadoRow?.pausado_por_titular) pausadoPorTitular = true
      } catch { /* columnas aún no existen — se asume activo y sin pausa */ }
      setUser({ id: session.user.id, email: session.user.email ?? '', nombre: data.nombre, role: data.role as Role, avatar_url: data.avatar_url ?? null, estado, pausadoPorTitular })
    } else {
      // Autenticado pero sin rol asignado — logout automático
      await supabase.auth.signOut()
      setUser(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadUser(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session)
    })
    return () => subscription.unsubscribe()
  }, [loadUser])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
