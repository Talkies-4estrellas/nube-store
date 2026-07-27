import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Punto de retorno del login OAuth (Google/Facebook). Supabase redirige aquí
 * con un `code` en la URL; se intercambia por una sesión real y se guarda en
 * cookies (mismo mecanismo que usa middleware.ts) antes de mandar al usuario
 * a su destino final.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  // Se manda de vuelta a /login: su propio efecto de sesión ya sabe cómo
  // resolver el rol y mandar a cada quien a su panel — evita duplicar esa
  // lógica aquí en el servidor.
  const destino = next ? `/login?redirect=${encodeURIComponent(next)}` : '/login'
  const response = NextResponse.redirect(`${origin}${destino}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  return response
}
