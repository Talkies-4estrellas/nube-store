import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Duplicado a propósito de `ROLE_ROUTES`/`ROLE_HOME` en `lib/auth-context.tsx`
 * (mismo patrón que ya usa `AppChrome.tsx`): ese archivo es 'use client' y este
 * middleware corre en Edge runtime, así que se mantiene una copia plana aquí
 * en vez de importarlo cruzado.
 */
const ROLE_ROUTES: Record<string, string[]> = {
  admin:     ['/dashboard', '/ventas', '/productos', '/clientes', '/envio-nube', '/tienda-en-linea', '/punto-de-venta', '/configuracion'],
  vendedor:  ['/dashboard', '/ventas', '/clientes'],
  bodega:    ['/productos', '/envio-nube'],
  proveedor: ['/proveedores'],
  basico:    ['/mi-cuenta'],
}
const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard', vendedor: '/dashboard', bodega: '/productos', proveedor: '/proveedores', basico: '/mi-cuenta',
}
const PROTECTED = Array.from(new Set(Object.values(ROLE_ROUTES).flat()))

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión si el token expiró
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))

  if (isProtected) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // No basta con tener sesión: el rol debe tener permiso sobre esta ruta
    // específica (ej. un 'basico' no debe poder entrar a /dashboard aunque
    // esté logueado). Antes esta verificación solo vivía en el cliente
    // (AppChrome → canAccess), que sí renderiza "Acceso restringido" pero no
    // evita que el HTML/datos de la página protegida lleguen a cargarse.
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    const role = roleRow?.role as string | undefined
    const permitido = role ? (ROLE_ROUTES[role] ?? []).some(r => pathname.startsWith(r)) : false

    if (!permitido) {
      const destino = role ? (ROLE_HOME[role] ?? '/login') : '/login'
      return NextResponse.redirect(new URL(destino, request.url))
    }
  }

  // Con sesión en /login → a su panel según su rol real. Si no tiene fila en
  // user_roles se deja pasar a la página de login: ahí mismo el cliente
  // detecta la falta de rol, cierra la sesión y muestra el error — si
  // redirigiéramos igual caeríamos en un loop contra la protección de arriba.
  if (pathname === '/login' && user) {
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    const role = roleRow?.role as string | undefined
    if (role && ROLE_HOME[role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|storefront|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)'],
}
