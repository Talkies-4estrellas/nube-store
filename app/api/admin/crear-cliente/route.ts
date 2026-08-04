import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-server'
import { isValidEmail } from '@/lib/validation'
import { PASSWORD_CUENTA_DEFAULT } from '@/lib/cuentas'

export const runtime = 'nodejs'

/**
 * Crea una cuenta de cliente (rol básico) desde el panel admin, igual que
 * /api/admin/crear-proveedor pero para el rol 'basico' — y además guarda la
 * fila en `clientes` (la tabla CRM que lee la lista de /clientes, separada
 * de user_roles) con los mismos datos, para que aparezca de inmediato.
 *
 * Recibe: { nombre, email, telefono?, ciudad?, direccion?, codigo_postal?,
 * estado_region?, pais?, tag? } — la contraseña siempre es
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
    return NextResponse.json({ error: 'Solo un administrador puede crear clientes' }, { status: 403 })
  }

  let nombre: string, email: string, telefono: string | null,
    ciudad: string | null, direccion: string | null, codigo_postal: string | null,
    estado_region: string | null, pais: string, tag: string
  try {
    const body = await req.json()
    nombre = String(body.nombre || '').trim()
    email = String(body.email || '').trim()
    telefono = body.telefono ? String(body.telefono).trim() : null
    ciudad = body.ciudad ? String(body.ciudad).trim() : null
    direccion = body.direccion ? String(body.direccion).trim() : null
    codigo_postal = body.codigo_postal ? String(body.codigo_postal).trim() : null
    estado_region = body.estado_region ? String(body.estado_region).trim() : null
    pais = body.pais ? String(body.pais).trim() : 'México'
    tag = body.tag ? String(body.tag).trim() : 'Nuevo'
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  if (!nombre) return NextResponse.json({ error: 'Falta el nombre' }, { status: 422 })
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 422 })

  const { data: nuevo, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD_CUENTA_DEFAULT,
    email_confirm: true,
    user_metadata: { role: 'basico', nombre, telefono },
  })

  if (error) {
    const yaExiste = error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')
    return NextResponse.json({ error: yaExiste ? 'Ya existe una cuenta con ese email.' : error.message }, { status: 422 })
  }

  const { error: errCrm } = await supabase.from('clientes').insert({
    nombre, email, telefono, ciudad, direccion, codigo_postal, estado_region, pais, tag,
  })
  if (errCrm) {
    return NextResponse.json({ error: `La cuenta se creó, pero no se pudo guardar en Clientes: ${errCrm.message}` }, { status: 422 })
  }

  return NextResponse.json({ id: nuevo.user.id })
}
