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
      setUser({ id: session.user.id, email: session.user.email ?? '', nombre: data.nombre, role: data.role as Role, avatar_url: data.avatar_url ?? null })
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
