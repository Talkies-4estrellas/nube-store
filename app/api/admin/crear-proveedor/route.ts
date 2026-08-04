import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'
import { isValidEmail } from '@/lib/validation'
import { PASSWORD_CUENTA_DEFAULT } from '@/lib/cuentas'

export const runtime = 'nodejs'

/**
 * Crea una cuenta de proveedor desde el panel admin (sin pasar por /registro).
 * Usa auth.admin.createUser con email_confirm:true para que quede activa de
 * inmediato — el mismo trigger que crea la fila en `user_roles` para el
 * alta normal de /registro se dispara igual aquí, porque le pasamos los
 * mismos datos en user_metadata (role, nombre, empresa, telefono).
 *
 * Recibe: { nombre, email, empresa?, telefono? } — la contraseña siempre es
 * PASSWORD_CUENTA_DEFAULT, no se pide en el formulario.
 * Requiere: sesión de admin (verificada con el access_token del header).
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user: caller } } = await supabase.auth.getUser(token)
  if (!caller) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { data: callerRole } = await supabase.from('user_roles').select('role').eq('user_id', caller.id).maybeSingle()
  if (callerRole?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo un administrador puede crear proveedores' }, { status: 403 })
  }

  let nombre: string, email: string, empresa: string | null, telefono: string | null
  try {
    const body = await req.json()
    nombre = String(body.nombre || '').trim()
    email = String(body.email || '').trim()
    empresa = body.empresa ? String(body.empresa).trim() : null
    telefono = body.telefono ? String(body.telefono).trim() : null
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  if (!nombre) return NextResponse.json({ error: 'Falta el nombre' }, { status: 422 })
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 422 })

  const { data: nuevo, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD_CUENTA_DEFAULT,
    email_confirm: true,
    user_metadata: { role: 'proveedor', nombre, empresa, telefono },
  })

  if (error) {
    const yaExiste = error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')
    return NextResponse.json({ error: yaExiste ? 'Ya existe una cuenta con ese email.' : error.message }, { status: 422 })
  }

  return NextResponse.json({ id: nuevo.user.id })
}
