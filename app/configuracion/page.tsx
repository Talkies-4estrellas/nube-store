'use client'

import { useState, useEffect, useRef } from 'react'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { convertToWebp, uploadToSupabase } from '@/lib/uploadWebp'
import ChatPanel from '@/components/ChatPanel'
import type { Conversacion } from '@/lib/mensajeria'
import { registrarAuditoria, fetchBitacora, type EntradaBitacora } from '@/lib/bitacora'

type Section = 'perfil' | 'negocio' | 'contacto' | 'pagos' | 'notificaciones' | 'usuarios' | 'comentarios'

type UserRow = { id: string; user_id: string; nombre: string; role: string; created_at: string; email?: string }

type PagosSecretos = {
  openpay_merchant_id: string; openpay_private_key: string; openpay_mode: 'sandbox' | 'live'
  paypal_client_id: string; paypal_client_secret: string; paypal_mode: 'sandbox' | 'live'
  mp_access_token: string
  stripe_publishable_key: string; stripe_secret_key: string; stripe_webhook_secret: string; stripe_mode: 'sandbox' | 'live'
}
const PAGOS_SECRETOS_DEFAULTS: PagosSecretos = {
  openpay_merchant_id: '', openpay_private_key: '', openpay_mode: 'sandbox',
  paypal_client_id: '', paypal_client_secret: '', paypal_mode: 'sandbox',
  mp_access_token: '',
  stripe_publishable_key: '', stripe_secret_key: '', stripe_webhook_secret: '', stripe_mode: 'sandbox',
}

/** Fusiona con los valores por defecto sin dejar pasar `null` — las columnas
 * opcionales que nunca se llenaron vienen `null` desde Supabase, y un
 * `<input>` controlado no acepta `value={null}` (React se queja en consola). */
function conDefaults<T extends object>(defaults: T, data: Partial<Record<keyof T, unknown>>): T {
  const resultado = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const val = data[key]
    if (val !== null && val !== undefined) resultado[key] = val as T[keyof T]
  }
  return resultado
}

const ALL_NAV: { id: Section; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'perfil',         label: 'Editar perfil',        icon: 'users'      },
  { id: 'negocio',        label: 'Datos del negocio',    icon: 'store'      },
  { id: 'contacto',       label: 'Contacto',              icon: 'users'      },
  { id: 'pagos',          label: 'Métodos de pago',       icon: 'creditcard' },
  { id: 'notificaciones', label: 'Notificaciones',         icon: 'warning'    },
  { id: 'usuarios',       label: 'Usuarios y roles',       icon: 'settings',  adminOnly: true },
  { id: 'comentarios',    label: 'Comentarios',            icon: 'clipboard', adminOnly: true },
]

const monedas = ['MXN — Peso mexicano', 'USD — Dólar estadounidense', 'ARS — Peso argentino', 'COP — Peso colombiano', 'CLP — Peso chileno']

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:    { bg: '#ede9fe', color: '#6d28d9' },
  vendedor: { bg: '#dbeafe', color: '#1e40af' },
  bodega:   { bg: '#d1fae5', color: '#065f46' },
}

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const [section, setSection] = useState<Section>('perfil')
  const [saved,   setSaved]   = useState(false)

  // Estado para sección usuarios
  const [usuarios,        setUsuarios]        = useState<UserRow[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [bitacora, setBitacora] = useState<EntradaBitacora[]>([])
  const [loadingBitacora, setLoadingBitacora] = useState(false)

  const navItems = ALL_NAV.filter(n => !n.adminOnly || user?.role === 'admin')

  // Estado para sección "Editar perfil"
  const [perfilNombre,       setPerfilNombre]       = useState('')
  const [avatarPreview,      setAvatarPreview]      = useState<string | null>(null)
  const [avatarFile,         setAvatarFile]         = useState<File | null>(null)
  const [passwordNueva,      setPasswordNueva]      = useState('')
  const [passwordConfirmar,  setPasswordConfirmar]  = useState('')
  const [guardandoPerfil,    setGuardandoPerfil]    = useState(false)
  const [perfilGuardado,     setPerfilGuardado]     = useState(false)
  const [perfilError,        setPerfilError]        = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) { setPerfilNombre(user.nombre); setAvatarPreview(user.avatar_url) }
  }, [user])

  function elegirAvatar(file: File | null) {
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function guardarPerfil() {
    setPerfilError('')
    if (!perfilNombre.trim()) { setPerfilError('El nombre no puede quedar vacío'); return }
    if (passwordNueva && passwordNueva.length < 6) { setPerfilError('La contraseña debe tener al menos 6 caracteres'); return }
    if (passwordNueva && passwordNueva !== passwordConfirmar) { setPerfilError('Las contraseñas no coinciden'); return }
    if (!user) return

    setGuardandoPerfil(true)

    let avatarUrl: string | null = null
    if (avatarFile) {
      try {
        const webp = await convertToWebp(avatarFile)
        avatarUrl = await uploadToSupabase(webp, supabase, 'productos', `avatars/${user.id}.webp`)
      } catch (e) {
        setGuardandoPerfil(false)
        setPerfilError('No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido'))
        return
      }
    }

    const { error: errPerfil } = await supabase.rpc('actualizar_mi_perfil', {
      nuevo_nombre: perfilNombre.trim(),
      ...(avatarUrl ? { nuevo_avatar_url: avatarUrl } : {}),
    })
    if (errPerfil) {
      setGuardandoPerfil(false)
      setPerfilError('No se pudo guardar el perfil: ' + errPerfil.message)
      return
    }

    if (passwordNueva) {
      const { error: errPass } = await supabase.auth.updateUser({ password: passwordNueva })
      if (errPass) {
        setGuardandoPerfil(false)
        setPerfilError('El perfil se guardó, pero la contraseña no: ' + errPass.message)
        return
      }
    }

    setGuardandoPerfil(false)
    setAvatarFile(null)
    setPasswordNueva('')
    setPasswordConfirmar('')
    setPerfilGuardado(true)
    setTimeout(() => setPerfilGuardado(false), 2500)
    setTimeout(() => window.location.reload(), 900)
  }

  useEffect(() => {
    if (section === 'usuarios') {
      fetchUsuarios()
      setLoadingBitacora(true)
      fetchBitacora(supabase).then(rows => { setBitacora(rows); setLoadingBitacora(false) })
    }
    if (section === 'comentarios') fetchComentarios()
  }, [section])

  // ---- Comentarios (mensajería cliente ↔ admin) ----
  const [comentarios, setComentarios] = useState<Conversacion[]>([])
  const [cargandoComentarios, setCargandoComentarios] = useState(false)
  const [comentarioActivo, setComentarioActivo] = useState<string | null>(null)

  async function fetchComentarios() {
    setCargandoComentarios(true)
    // Solo soporte general/técnico/empresa — lo que sea sobre un producto
    // puntual vive aparte, en Clientes → Mensajes.
    const { data } = await supabase.from('conversaciones').select('*').eq('tipo', 'cliente_admin').is('producto_id', null).order('updated_at', { ascending: false })
    setComentarios(data ?? [])
    setCargandoComentarios(false)
  }

  async function fetchUsuarios() {
    setLoadingUsuarios(true)
    const { data } = await supabase.from('user_roles').select('*').order('created_at')
    setUsuarios((data ?? []) as UserRow[])
    setLoadingUsuarios(false)
  }


  async function deleteUser(u: UserRow) {
    if (!confirm(`¿Eliminar acceso de ${u.nombre}? El usuario de Supabase Auth no se elimina.`)) return
    await supabase.from('user_roles').delete().eq('id', u.id)
    registrarAuditoria(supabase, {
      usuarioId: user?.id, accion: 'eliminar_acceso', tabla: 'user_roles', registroId: u.id,
      valorAnterior: u.role, valorNuevo: null,
    })
    fetchUsuarios()
    fetchBitacora(supabase).then(setBitacora)
  }

  const [negocio, setNegocio] = useState({ nombre: 'Order Express', moneda: 'MXN — Peso mexicano', zona: 'America/Mexico_City', idioma: 'Español (México)' })
  const [contacto, setContacto] = useState({ email: '', telefono: '', whatsapp: '', instagram: '', facebook: '', direccion: '', ciudad: '', pais: 'México' })
  const [pagos, setPagos] = useState({ efectivo: true, transferencia: true, tarjeta: false, mercadopago: false, paypal: false, bbva: false, stripe: false })
  const [notif, setNotif] = useState({ stock_bajo: true, nueva_venta: true, email_resumen: false })
  const [heroTitulo, setHeroTitulo] = useState('')
  const [heroSubtitulo, setHeroSubtitulo] = useState('')
  const [heroCta, setHeroCta] = useState('')

  // Claves de las pasarelas de pago (antes vivían en Tienda en línea → Legal)
  const [pagosSecretos,       setPagosSecretos]       = useState<PagosSecretos>(PAGOS_SECRETOS_DEFAULTS)
  const [savingPagosSecretos, setSavingPagosSecretos] = useState(false)
  const [savedPagosSecretos,  setSavedPagosSecretos]  = useState(false)
  const [errorPagosSecretos,  setErrorPagosSecretos]  = useState('')
  function setPagoSecreto<K extends keyof PagosSecretos>(key: K, val: PagosSecretos[K]) { setPagosSecretos(p => ({ ...p, [key]: val })) }

  // Campos verdaderamente secretos (no IDs/merchant públicos): nunca se cargan
  // con su valor real en el navegador — solo se sabe que "ya hay una guardada"
  // y el campo permite escribir una nueva para reemplazarla. Así, aunque
  // alguien vea la pantalla o intercepte una respuesta, no se lleva la clave.
  const CAMPOS_SECRETOS = ['openpay_private_key', 'paypal_client_secret', 'mp_access_token', 'stripe_secret_key', 'stripe_webhook_secret'] as const
  const [clavesGuardadas, setClavesGuardadas] = useState<Record<typeof CAMPOS_SECRETOS[number], boolean>>({
    openpay_private_key: false, paypal_client_secret: false, mp_access_token: false,
    stripe_secret_key: false, stripe_webhook_secret: false,
  })

  useEffect(() => {
    // Cargar config_storefront
    supabase.from('config_storefront').select('*').eq('id', 1).single()
      .then(({ data }) => {
        if (!data) return
        setNegocio(prev => ({ ...prev, nombre: data.nombre_tienda ?? prev.nombre }))
        setContacto(prev => ({ ...prev, email: data.email_contacto ?? '', telefono: data.telefono ?? '', whatsapp: data.whatsapp ?? '', instagram: data.instagram ?? '', facebook: data.facebook ?? '' }))
        setHeroTitulo(data.hero_titulo ?? '')
        setHeroSubtitulo(data.hero_subtitulo ?? '')
        setHeroCta(data.hero_cta ?? '')
      })
    // Cargar métodos de pago
    supabase.from('config_metodos_pago').select('*').eq('id', 1).single()
      .then(({ data }) => {
        if (!data) return
        setPagos({ efectivo: data.efectivo, transferencia: data.transferencia, tarjeta: data.tarjeta, mercadopago: data.mercadopago, paypal: data.paypal ?? false, bbva: data.bbva ?? false, stripe: data.stripe ?? false })
      })
    // Cargar preferencias de notificación del usuario actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('config_notificaciones').select('*').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (!data) return
          setNotif({ stock_bajo: data.stock_bajo, nueva_venta: data.nueva_venta, email_resumen: data.email_resumen })
        })
    })
    // Cargar claves de las pasarelas de pago — los campos secretos NUNCA se
    // cargan con su valor real, solo se marca que "ya hay una guardada".
    supabase.from('config_pagos_secretos').select('*').eq('id', 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setErrorPagosSecretos('No se pudieron cargar las llaves: ' + error.message); return }
        if (!data) return
        const conValores = conDefaults(PAGOS_SECRETOS_DEFAULTS, data)
        setClavesGuardadas({
          openpay_private_key: !!data.openpay_private_key,
          paypal_client_secret: !!data.paypal_client_secret,
          mp_access_token: !!data.mp_access_token,
          stripe_secret_key: !!data.stripe_secret_key,
          stripe_webhook_secret: !!data.stripe_webhook_secret,
        })
        setPagosSecretos({ ...conValores, openpay_private_key: '', paypal_client_secret: '', mp_access_token: '', stripe_secret_key: '', stripe_webhook_secret: '' })
      })
  }, [])

  async function guardarPagosSecretos() {
    setSavingPagosSecretos(true)
    setErrorPagosSecretos('')

    // Los campos secretos solo se mandan si el admin escribió un valor nuevo —
    // si se dejan vacíos, NO se sobreescribe lo que ya había guardado.
    const payload: Record<string, unknown> = {
      id: 1,
      openpay_merchant_id: pagosSecretos.openpay_merchant_id,
      openpay_mode: pagosSecretos.openpay_mode,
      paypal_client_id: pagosSecretos.paypal_client_id,
      paypal_mode: pagosSecretos.paypal_mode,
      stripe_publishable_key: pagosSecretos.stripe_publishable_key,
      stripe_mode: pagosSecretos.stripe_mode,
      updated_at: new Date().toISOString(),
    }
    const camposModificados: string[] = []
    for (const campo of CAMPOS_SECRETOS) {
      if (pagosSecretos[campo]) { payload[campo] = pagosSecretos[campo]; camposModificados.push(campo) }
    }

    const { error } = await supabase.from('config_pagos_secretos').upsert(payload)
    setSavingPagosSecretos(false)
    if (error) { setErrorPagosSecretos('No se pudo guardar: ' + error.message); return }

    if (camposModificados.length > 0) {
      setClavesGuardadas(prev => {
        const next = { ...prev }
        for (const campo of camposModificados) next[campo as typeof CAMPOS_SECRETOS[number]] = true
        return next
      })
      // Se re-vacían de inmediato — no dejamos la clave recién escrita
      // sentada en el campo una vez que ya se guardó.
      setPagosSecretos(prev => ({ ...prev, openpay_private_key: '', paypal_client_secret: '', mp_access_token: '', stripe_secret_key: '', stripe_webhook_secret: '' }))
      registrarAuditoria(supabase, {
        usuarioId: user?.id, accion: 'editar_claves_pago', tabla: 'config_pagos_secretos', registroId: '1',
        valorNuevo: camposModificados.join(', '),
      })
    }

    setSavedPagosSecretos(true)
    setTimeout(() => setSavedPagosSecretos(false), 2500)
  }

  async function handleSave() {
    await Promise.all([
      // Guardar config_storefront
      supabase.from('config_storefront').update({
        nombre_tienda:  negocio.nombre,
        hero_titulo:    heroTitulo,
        hero_subtitulo: heroSubtitulo,
        hero_cta:       heroCta,
        email_contacto: contacto.email,
        telefono:       contacto.telefono,
        whatsapp:       contacto.whatsapp,
        instagram:      contacto.instagram,
        facebook:       contacto.facebook,
      }).eq('id', 1),
      // Guardar métodos de pago
      supabase.from('config_metodos_pago').upsert({ id: 1, ...pagos }).eq('id', 1),
    ])
    // Guardar notificaciones del usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('config_notificaciones').upsert({ user_id: user.id, ...notif })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="config-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Sub-nav */}
      <aside style={{ background: '#fff', borderRadius: 12, padding: '8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '10px 16px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuración</p>
        {navItems.map(item => {
          const active = section === item.id
          return (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
              fontSize: 13, color: active ? '#0049ff' : '#374151', fontWeight: active ? 700 : 400,
              background: active ? '#eff6ff' : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${active ? '#0049ff' : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <Icon name={item.icon} size={16} color={active ? '#0049ff' : '#9ca3af'} />
              {item.label}
            </button>
          )
        })}
      </aside>

      {/* Contenido */}
      <div>
        {section === 'perfil' && (
          <Card title="Editar perfil">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', background: '#252855', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, flexShrink: 0 }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt={perfilNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (perfilNombre.charAt(0).toUpperCase() || '?')}
              </div>
              <div>
                <input ref={avatarInputRef} type="file" accept="image/*" hidden
                  onChange={e => elegirAvatar(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => avatarInputRef.current?.click()}
                  style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Cambiar foto
                </button>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>JPG o PNG. Se guarda al hacer clic en "Guardar cambios".</p>
              </div>
            </div>

            <Field label="Nombre completo">
              <input value={perfilNombre} onChange={e => setPerfilNombre(e.target.value)} style={inputStyle} placeholder="Tu nombre" />
            </Field>
            <Field label="Email">
              <input value={user?.email ?? ''} disabled readOnly style={{ ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} />
            </Field>
            <Field label="Rol">
              <input value={ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? ''} disabled readOnly style={{ ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} />
            </Field>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 18, marginTop: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 14 }}>Cambiar contraseña</p>
              <Field label="Nueva contraseña">
                <input type="password" value={passwordNueva} onChange={e => setPasswordNueva(e.target.value)} style={inputStyle} placeholder="Dejar en blanco para no cambiarla" />
              </Field>
              <Field label="Confirmar">
                <input type="password" value={passwordConfirmar} onChange={e => setPasswordConfirmar(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </Field>
            </div>

            {perfilError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                {perfilError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={guardarPerfil} disabled={guardandoPerfil}
                style={{ background: perfilGuardado ? '#059669' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {guardandoPerfil ? 'Guardando...' : perfilGuardado ? '¡Guardado!' : 'Guardar cambios'}
              </button>
            </div>
          </Card>
        )}

        {section === 'negocio' && (
          <Card title="Datos del negocio">
            <Field label="Nombre del negocio">
              <input value={negocio.nombre} onChange={e => setNegocio(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Moneda">
              <select value={negocio.moneda} onChange={e => setNegocio(p => ({ ...p, moneda: e.target.value }))} style={inputStyle}>
                {monedas.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Zona horaria">
              <select value={negocio.zona} onChange={e => setNegocio(p => ({ ...p, zona: e.target.value }))} style={inputStyle}>
                {['America/Mexico_City', 'America/Bogota', 'America/Santiago', 'America/Buenos_Aires', 'America/Lima'].map(z => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Idioma">
              <select value={negocio.idioma} onChange={e => setNegocio(p => ({ ...p, idioma: e.target.value }))} style={inputStyle}>
                {['Español (México)', 'Español (Argentina)', 'Español (Colombia)', 'Inglés'].map(i => <option key={i}>{i}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'contacto' && (
          <Card title="Información de contacto">
            <Field label="Email de contacto">
              <input type="email" placeholder="hola@tunegocio.com" value={contacto.email} onChange={e => setContacto(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Teléfono">
              <input placeholder="+52 55 0000 0000" value={contacto.telefono} onChange={e => setContacto(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="WhatsApp">
              <input placeholder="+52 55 0000 0000" value={contacto.whatsapp} onChange={e => setContacto(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input placeholder="Calle y número" value={contacto.direccion} onChange={e => setContacto(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Ciudad">
              <input placeholder="Ciudad de México" value={contacto.ciudad} onChange={e => setContacto(p => ({ ...p, ciudad: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="País">
              <select value={contacto.pais} onChange={e => setContacto(p => ({ ...p, pais: e.target.value }))} style={inputStyle}>
                {['México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'España'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {section === 'pagos' && (
          <Card title="Métodos de pago aceptados">
            <Toggle label="Efectivo" desc="Acepta pagos en efectivo en tu punto de venta" value={pagos.efectivo} onChange={v => setPagos(p => ({ ...p, efectivo: v }))} />
            <Toggle label="Transferencia bancaria" desc="SPEI, depósito o transferencia directa" value={pagos.transferencia} onChange={v => setPagos(p => ({ ...p, transferencia: v }))} />
            <Toggle label="Tarjeta de crédito / débito" desc="Requiere terminal bancaria o lector conectado" value={pagos.tarjeta} onChange={v => setPagos(p => ({ ...p, tarjeta: v }))} />
            <Toggle label="Mercado Pago" desc="Link de pago o QR — requiere cuenta activa" value={pagos.mercadopago} onChange={v => setPagos(p => ({ ...p, mercadopago: v }))} />
            <Toggle label="PayPal" desc="Checkout con cuenta PayPal o tarjeta — requiere cuenta de negocio" value={pagos.paypal} onChange={v => setPagos(p => ({ ...p, paypal: v }))} />
            <Toggle label="BBVA (OpenPay)" desc="Transferencia SPEI con referencia — requiere cuenta OpenPay/BBVA" value={pagos.bbva} onChange={v => setPagos(p => ({ ...p, bbva: v }))} />
            <Toggle label="Tarjeta (Stripe)" desc="Formulario de tarjeta propio, sin salir del sitio — requiere cuenta de Stripe" value={pagos.stripe} onChange={v => setPagos(p => ({ ...p, stripe: v }))} />
          </Card>
        )}

        {section === 'pagos' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🔑</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>Claves de pago</p>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 11, color: '#9ca3af' }}>
              Credenciales de las pasarelas. Solo las puede ver y editar un administrador — no se exponen en la tienda pública.
            </p>

            {/* BBVA / OpenPay */}
            <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>BBVA (OpenPay)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Merchant ID</label>
                <input style={inputStyle} value={pagosSecretos.openpay_merchant_id} onChange={e => setPagoSecreto('openpay_merchant_id', e.target.value)} placeholder="mxxxxxxxxxxxx" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Llave privada</label>
                <input type="password" style={inputStyle} value={pagosSecretos.openpay_private_key} onChange={e => setPagoSecreto('openpay_private_key', e.target.value)}
                  placeholder={clavesGuardadas.openpay_private_key ? '•••••••• (ya configurada — escribe para reemplazar)' : 'sk_xxxxxxxxxxxx'} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Modo</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={pagosSecretos.openpay_mode} onChange={e => setPagoSecreto('openpay_mode', e.target.value as 'sandbox' | 'live')}>
                  <option value="sandbox">Pruebas (sandbox)</option>
                  <option value="live">Producción (live)</option>
                </select>
              </div>
            </div>

            {/* PayPal */}
            <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>PayPal</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Client ID</label>
                <input style={inputStyle} value={pagosSecretos.paypal_client_id} onChange={e => setPagoSecreto('paypal_client_id', e.target.value)} placeholder="AeXXXXXXXXXXXXXXXXXXXXXX" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Client Secret</label>
                <input type="password" style={inputStyle} value={pagosSecretos.paypal_client_secret} onChange={e => setPagoSecreto('paypal_client_secret', e.target.value)}
                  placeholder={clavesGuardadas.paypal_client_secret ? '•••••••• (ya configurada — escribe para reemplazar)' : 'EXXXXXXXXXXXXXXXXXXXXXXX'} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Modo</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={pagosSecretos.paypal_mode} onChange={e => setPagoSecreto('paypal_mode', e.target.value as 'sandbox' | 'live')}>
                  <option value="sandbox">Pruebas (sandbox)</option>
                  <option value="live">Producción (live)</option>
                </select>
              </div>
            </div>

            {/* Mercado Pago */}
            <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Mercado Pago</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Access Token</label>
              <input type="password" style={inputStyle} value={pagosSecretos.mp_access_token} onChange={e => setPagoSecreto('mp_access_token', e.target.value)}
                placeholder={clavesGuardadas.mp_access_token ? '•••••••• (ya configurada — escribe para reemplazar)' : 'APP_USR-xxxx o TEST-xxxx'} />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Usa el token que empieza con TEST- para pruebas, o APP_USR- para producción.</p>
            </div>

            {/* Stripe */}
            <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Stripe</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Publishable key</label>
                <input style={inputStyle} value={pagosSecretos.stripe_publishable_key} onChange={e => setPagoSecreto('stripe_publishable_key', e.target.value)} placeholder="pk_test_xxxx o pk_live_xxxx" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Secret key</label>
                <input type="password" style={inputStyle} value={pagosSecretos.stripe_secret_key} onChange={e => setPagoSecreto('stripe_secret_key', e.target.value)}
                  placeholder={clavesGuardadas.stripe_secret_key ? '•••••••• (ya configurada — escribe para reemplazar)' : 'sk_test_xxxx o sk_live_xxxx'} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Webhook secret</label>
                <input type="password" style={inputStyle} value={pagosSecretos.stripe_webhook_secret} onChange={e => setPagoSecreto('stripe_webhook_secret', e.target.value)}
                  placeholder={clavesGuardadas.stripe_webhook_secret ? '•••••••• (ya configurada — escribe para reemplazar)' : 'whsec_xxxx'} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Modo</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={pagosSecretos.stripe_mode} onChange={e => setPagoSecreto('stripe_mode', e.target.value as 'sandbox' | 'live')}>
                  <option value="sandbox">Pruebas (sandbox)</option>
                  <option value="live">Producción (live)</option>
                </select>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, gridColumn: '1 / -1' }}>El webhook secret se obtiene al crear el endpoint {'{tu dominio}'}/api/pagos/stripe/webhook en el Dashboard de Stripe → Developers → Webhooks.</p>
            </div>

            {errorPagosSecretos && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                {errorPagosSecretos}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={guardarPagosSecretos} disabled={savingPagosSecretos} style={{
                background: savedPagosSecretos ? '#059669' : '#0049ff', color: '#fff', border: 'none',
                padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s',
              }}>
                {savingPagosSecretos ? 'Guardando...' : savedPagosSecretos ? '¡Guardado!' : 'Guardar claves'}
              </button>
            </div>
          </div>
        )}

        {section === 'notificaciones' && (
          <Card title="Notificaciones">
            <Toggle label="Alerta de stock bajo" desc="Notificación cuando un producto tiene 3 unidades o menos" value={notif.stock_bajo} onChange={v => setNotif(p => ({ ...p, stock_bajo: v }))} />
            <Toggle label="Nueva venta" desc="Notificación al registrar un pedido nuevo" value={notif.nueva_venta} onChange={v => setNotif(p => ({ ...p, nueva_venta: v }))} />
            <Toggle label="Resumen diario por email" desc="Recibe un resumen de ventas cada día al cierre" value={notif.email_resumen} onChange={v => setNotif(p => ({ ...p, email_resumen: v }))} />
          </Card>
        )}

        {section === 'usuarios' && (
          <Card title="Usuarios y roles">
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              Para crear un usuario nuevo ve a <strong>Supabase → Authentication → Users → Add user</strong>, luego agrega su UUID en la tabla <code>user_roles</code> con el rol correspondiente.
            </p>
            {loadingUsuarios ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Cargando...</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Nombre', 'Rol actual', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#111' }}>
                        {u.nombre}
                        {u.user_id === user?.id && <span style={{ fontSize: 10, marginLeft: 6, background: '#eff6ff', color: '#0049ff', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>Tú</span>}
                      </td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: ROLE_BADGE[u.role]?.bg, color: ROLE_BADGE[u.role]?.color }}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>
                        {u.user_id !== user?.id && (
                          <button onClick={() => deleteUser(u)}
                            style={{ background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>
                            Quitar acceso
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {section === 'usuarios' && (
          <Card title="🔒 Actividad reciente (seguridad)">
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: -10, marginBottom: 4 }}>
              Cambios de rol y de acceso — quién, cuándo y qué valor tenía antes.
            </p>
            {loadingBitacora ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Cargando...</p>
            ) : bitacora.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Todavía no hay movimientos registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bitacora.map(b => {
                  const usuarioNombre = usuarios.find(u => u.user_id === b.usuario_id)?.nombre ?? 'Alguien'
                  const accionLabel: Record<string, string> = {
                    cambio_rol: 'cambió el rol', eliminar_acceso: 'quitó el acceso',
                    suspender_proveedor: 'suspendió a un proveedor', reactivar_proveedor: 'reactivó a un proveedor',
                    editar_claves_pago: 'editó las claves de pago',
                  }
                  return (
                    <div key={b.id} style={{ fontSize: 12, color: '#374151', paddingLeft: 12, borderLeft: '2px solid #e5e7eb' }}>
                      <p style={{ margin: 0 }}>
                        <strong>{usuarioNombre}</strong> {accionLabel[b.accion] ?? b.accion}
                        {b.accion === 'cambio_rol' && b.valor_anterior && b.valor_nuevo && ` de "${ROLE_LABEL[b.valor_anterior] ?? b.valor_anterior}" a "${ROLE_LABEL[b.valor_nuevo] ?? b.valor_nuevo}"`}
                        {b.accion === 'cambio_rol' && b.valor_anterior && !b.valor_nuevo && ` (tenía rol "${ROLE_LABEL[b.valor_anterior] ?? b.valor_anterior}")`}
                        {b.accion === 'editar_claves_pago' && b.valor_nuevo && ` (${b.valor_nuevo})`}
                      </p>
                      <p style={{ margin: '2px 0 0', color: '#9ca3af' }}>
                        {new Date(b.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {section === 'comentarios' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {cargandoComentarios ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Cargando...</p>
              ) : comentarios.length === 0 ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Ningún cliente te ha escrito todavía.</p>
              ) : (
                comentarios.map(c => {
                  const activo = comentarioActivo === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => setComentarioActivo(c.id)}
                      style={{ width: '100%', display: 'block', padding: '12px 18px', background: activo ? '#eff6ff' : 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente_nombre || c.cliente_email}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente_email}</p>
                    </button>
                  )
                })
              )}
            </div>

            {comentarioActivo && user ? (
              <ChatPanel supabase={supabase} conversacionId={comentarioActivo} remitenteTipo="admin" remitenteEmail={user.email} remitenteNombre={user.nombre} accent="#0049ff" />
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Selecciona una conversación para verla.
              </div>
            )}
          </div>
        )}

        {section !== 'usuarios' && section !== 'perfil' && section !== 'comentarios' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={handleSave} style={{ background: saved ? '#059669' : '#0049ff', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 20 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: value ? '#0049ff' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box',
}
