'use client'

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { convertToWebp, captureFrameAsWebp, uploadToSupabase } from '@/lib/uploadWebp'
import { useSidebar } from '@/lib/sidebar-context'
import { useAuth } from '@/lib/auth-context'
import { construirArbolCategorias, crearCategoriaConPadre, type CategoriaPlana, type CamposExtraConfig } from '@/lib/categorias'
import CategoriaSelector from '@/components/CategoriaSelector'
import ChatPanel from '@/components/ChatPanel'
import type { Conversacion } from '@/lib/mensajeria'
import { fetchTransferenciasPendientes, aceptarTransferencia, rechazarTransferencia, type Transferencia } from '@/lib/transferencias'
import { fetchPaquetesPorVentaItems, guardarPaquete } from '@/lib/paquetes'
import SolicitudProductoModal, { type SolicitudProductoForm } from '@/components/SolicitudProductoModal'
import SolicitudCategoriaModal from '@/components/SolicitudCategoriaModal'

const NAVY = '#252855'
const PINK = '#e7226d'
const BLUE = '#0049ff'

const PALETA_COLORES = [
  { nombre: 'Negro',    hex: '#1a1a1a' },
  { nombre: 'Blanco',   hex: '#f5f5f5' },
  { nombre: 'Gris',     hex: '#9ca3af' },
  { nombre: 'Rojo',     hex: '#ef4444' },
  { nombre: 'Rosa',     hex: '#ec4899' },
  { nombre: 'Naranja',  hex: '#f97316' },
  { nombre: 'Amarillo', hex: '#eab308' },
  { nombre: 'Verde',    hex: '#22c55e' },
  { nombre: 'Azul',     hex: '#3b82f6' },
  { nombre: 'Morado',   hex: '#8b5cf6' },
  { nombre: 'Café',     hex: '#92400e' },
  { nombre: 'Beige',    hex: '#d2b48c' },
]


const UNIDADES_PESO = ['g', 'kg', 'ml', 'L'] as const
type UnidadPeso = typeof UNIDADES_PESO[number]
// Factor a gramos (ml/L se tratan como equivalente de peso 1:1 para estimar envío)
const FACTOR_A_GRAMOS: Record<UnidadPeso, number> = { g: 1, kg: 1000, ml: 1, L: 1000 }
function pesoAUnidadMasClara(gramos: number): { valor: string; unidad: UnidadPeso } {
  if (gramos <= 0) return { valor: '', unidad: 'g' }
  if (gramos % 1000 === 0 && gramos >= 1000) return { valor: String(gramos / 1000), unidad: 'kg' }
  return { valor: String(gramos), unidad: 'g' }
}

/** Devuelve true si una config de campos contextuales tiene algo que mostrar. */
function tieneContenido(c: CamposExtraConfig | null | undefined): c is CamposExtraConfig {
  return !!c && (c.tallas.length > 0 || c.grupos.length > 0)
}

/** Cuerpo de una tarjeta de campos contextuales (tallas + apartados) — se usa
 * tanto para los campos propios de la categoría elegida como para los del
 * padre cuando se activan aparte. */
function ProvContextualFieldsBody({ config, tallasSeleccionadas, onAddTalla, onRemoveTalla, camposExtra, onToggleExtra }: {
  config: CamposExtraConfig
  tallasSeleccionadas: string[]
  onAddTalla: (t: string) => void
  onRemoveTalla: (t: string) => void
  camposExtra: Record<string, string[]>
  onToggleExtra: (label: string, val: string) => void
}) {
  const [tallaInput, setTallaInput] = useState('')
  const [otroInput, setOtroInput] = useState('')

  return (
    <>
      {config.tallas.length > 0 && (
        <div style={{ marginBottom: config.grupos.length > 0 ? 14 : 0 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tallas</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {config.tallas.map(t => {
              const activo = tallasSeleccionadas.includes(t)
              return (
                <button key={t} type="button" onClick={() => activo ? onRemoveTalla(t) : onAddTalla(t)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `2px solid ${activo ? PINK : '#e5e7eb'}`, background: activo ? PINK : '#f9fafb', color: activo ? '#fff' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              )
            })}
          </div>
          {tallasSeleccionadas.filter(t => !config.tallas.includes(t)).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {tallasSeleccionadas.filter(t => !config.tallas.includes(t)).map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: PINK, color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>
                  {t}
                  <button type="button" onClick={() => onRemoveTalla(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1, fontSize: 13 }} value={tallaInput}
              onChange={e => setTallaInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAddTalla(tallaInput); setTallaInput('') } }}
              placeholder="Otra talla — Enter para agregar" onFocus={focus} onBlur={blur} />
            <button type="button" onClick={() => { onAddTalla(tallaInput); setTallaInput('') }}
              style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
          </div>
        </div>
      )}

      {config.grupos.map((grupo, i) => {
        const valores = camposExtra[grupo.label] ?? []
        return (
          <div key={grupo.label} style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginBottom: i < config.grupos.length - 1 ? 14 : 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{grupo.label}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: grupo.permitirOtro ? 8 : 0 }}>
              {grupo.opciones.map(op => {
                const activo = valores.includes(op)
                return (
                  <button key={op} type="button" onClick={() => onToggleExtra(grupo.label, op)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `2px solid ${activo ? PINK : '#e5e7eb'}`, background: activo ? PINK : '#f9fafb', color: activo ? '#fff' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {op}
                  </button>
                )
              })}
              {grupo.permitirOtro && valores.filter(v => !grupo.opciones.includes(v)).map(v => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: PINK, color: '#fff', fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>
                  {v}
                  <button type="button" onClick={() => onToggleExtra(grupo.label, v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                </span>
              ))}
            </div>
            {grupo.permitirOtro && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1, fontSize: 13 }} value={otroInput}
                  onChange={e => setOtroInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onToggleExtra(grupo.label, otroInput); setOtroInput('') } }}
                  placeholder={`Otro ${grupo.label.toLowerCase()} — Enter para agregar`} onFocus={focus} onBlur={blur} />
                <button type="button" onClick={() => { onToggleExtra(grupo.label, otroInput); setOtroInput('') }}
                  style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function ProvCard({ icon, title, hint, right, children }: { icon: string; title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY }}>{title}</p>
          {hint && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function ProvCollapsible({ icon, title, hint, abierto, onToggle, badges, children }: {
  icon: string; title: string; hint?: string; abierto: boolean; onToggle: () => void; badges: string[]; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 20, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>{title}</span>
          {hint && !abierto && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{hint}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {badges.map(b => <span key={b} style={{ background: `${NAVY}12`, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{b}</span>)}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
      </button>
      {abierto && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  )
}

const DRAFT_KEY    = 'proveedor_draft_v1'
const EMAIL_KEY    = 'proveedor_email_saved'
const PERFIL_KEY   = 'proveedor_perfil_v1'
const PESO_UNIDAD_KEY = 'proveedor_peso_unidad_v1'

type Categoria = CategoriaPlana

type MiSolicitud = {
  id: string
  producto_nombre: string
  producto_sku: string
  producto_precio: number
  estado: string
  created_at: string
  imagen_url: string | null
  producto_id: string | null
}

type HistorialItem = {
  id: string; producto_nombre: string; producto_sku: string; producto_precio: number; producto_stock: number
  producto_descripcion: string | null; imagen_url: string | null; categoria_id: number | null
  tipo: 'nuevo' | 'actualizacion'; producto_id: string | null
  estado: string; created_at: string; motivo_rechazo: string | null
}

type SeguimientoFila = {
  itemId: string
  productoNombre: string
  productoSku: string
  productoImagen: string | null
  costo: number | null
  cantidad: number
  subtotal: number
  ventaNumero: number
  ventaEstado: string
  ventaFecha: string
  paqueteria: string | null
  numeroGuia: string | null
  estadoEnvio: string | null
  fechaEnvio: string | null
  fechaEntrega: string | null
  altoCm: number | null
  anchoCm: number | null
  pesoKg: number | null
}

const TRACKING_URL_PROV: Record<string, (guia: string) => string> = {
  'DHL':          g => `https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=${g}`,
  'FedEx':        g => `https://www.fedex.com/apps/fedextrack/?trknbr=${g}`,
  'Estafeta':     g => `https://rastreo.estafeta.com/Index.aspx?internationalAirGuide=${g}`,
  'Redpack':      g => `https://www.redpack.com.mx/es/rastreo/?guias=${g}`,
  'J&T Express':  g => `https://www.jtexpress.mx/trajectoryQuery?expressList=${g}`,
  'Paquetexpress':g => `https://www.paquetexpress.com.mx/rastreo/?guide=${g}`,
}

type ProductoLocal = {
  nombre: string
  sku: string
  descripcion: string
  precio: string
  precioPromocion: string
  stock: string
  categoria_id: string
  imagenFile: File | null
  imagenPreview: string | null
  // Opcionales
  colores: string[]
  tallas: string[]
  camposExtra: Record<string, string[]>
  variantes: Array<{ color: string; talla: string; stock: string }>
  peso: string
  largo: string
  ancho: string
  alto: string
  imagenesExtra: Array<{ file: File | null; preview: string | null }>
}

const emptyProducto = (): ProductoLocal => ({
  nombre: '', sku: '', descripcion: '', precio: '', precioPromocion: '',
  stock: '', categoria_id: '', imagenFile: null, imagenPreview: null,
  colores: [], tallas: [], camposExtra: {}, variantes: [],
  peso: '', largo: '', ancho: '', alto: '', imagenesExtra: [],
})

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#fafafa', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6,
}

function focus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = NAVY
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e5e7eb'
}

export default function ProveedoresPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<'registro' | 'historial' | 'misEnviados' | 'seguimiento' | 'mensajes' | 'transferencias' | 'ajustes'>('registro')
  const { isMobile } = useSidebar()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Mensajería con clientes
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [cargandoConv, setCargandoConv] = useState(false)
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null)

  useEffect(() => {
    if (tab !== 'mensajes' || !user?.email) return
    setCargandoConv(true)
    supabase.from('conversaciones').select('*').eq('proveedor_email', user.email).order('updated_at', { ascending: false })
      .then(({ data }) => { setConversaciones(data ?? []); setCargandoConv(false) })
  }, [tab, user?.email])
  // Transferencias de productos (admin -> proveedor)
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [cargandoTransferencias, setCargandoTransferencias] = useState(false)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [toastTransferencia, setToastTransferencia] = useState<{ msg: string; color: string } | null>(null)

  async function cargarTransferencias() {
    if (!user?.email) return
    setCargandoTransferencias(true)
    setTransferencias(await fetchTransferenciasPendientes(user.email))
    setCargandoTransferencias(false)
  }

  useEffect(() => { if (user?.email) cargarTransferencias() }, [user?.email]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cierra el centro de notificaciones al hacer clic fuera de él
  useEffect(() => {
    if (!notifOpen) return
    function onClickFuera(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [notifOpen])

  async function responderTransferencia(t: Transferencia, aceptar: boolean) {
    setRespondiendo(t.id)
    const { error } = aceptar ? await aceptarTransferencia(t.id) : await rechazarTransferencia(t.id)
    setRespondiendo(null)
    if (error) { setToastTransferencia({ msg: 'Error: ' + error.message, color: PINK }); return }
    setToastTransferencia({ msg: aceptar ? `Aceptaste "${t.producto_nombre}" — ya es tuyo` : `Rechazaste "${t.producto_nombre}"`, color: aceptar ? BLUE : '#6b7280' })
    cargarTransferencias()
    setTimeout(() => setToastTransferencia(null), 3500)
  }

  const [savedEmail, setSavedEmail] = useState('')
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const arbolCategorias = construirArbolCategorias(categorias)
  const [dragging, setDragging] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)

  // Lista acumulada de productos
  const [productos, setProductos] = useState<ProductoLocal[]>([])
  // Producto que se está redactando
  const [prod, setProd] = useState<ProductoLocal>(emptyProducto())
  const [prodError, setProdError] = useState('')

  // Mis solicitudes (historial)
  const [historialItems, setHistorialItems] = useState<HistorialItem[] | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)

  // Editar una solicitud todavía pendiente (Mis solicitudes)
  const [editandoSolicitud, setEditandoSolicitud] = useState<HistorialItem | null>(null)

  // Panel "Mis productos enviados" en tab registro
  const [showMisProductos, setShowMisProductos] = useState(false)
  const [misProductos, setMisProductos] = useState<MiSolicitud[]>([])
  const [inventarioTotal, setInventarioTotal] = useState<number | null>(null)
  const [loadingMisProductos, setLoadingMisProductos] = useState(false)
  const [misProductosVista, setMisProductosVista] = useState<'grid' | 'list'>('list')

  // "Solicitar actualización" desde Mis productos: primero se elige cuál, luego se edita
  const [pickerActualizarAbierto, setPickerActualizarAbierto] = useState(false)
  const [buscarActualizar, setBuscarActualizar] = useState('')
  const [productoAActualizar, setProductoAActualizar] = useState<{
    id: string; nombre: string; sku: string; precio: string; stock: string; descripcion: string
    imagen_url: string | null; categoria_id: number | null
  } | null>(null)
  const [cargandoProductoActualizar, setCargandoProductoActualizar] = useState(false)

  // "Solicitar categoría" — pide una categoría/subcategoría nueva, el admin la aprueba
  const [mostrarSolicitudCategoria, setMostrarSolicitudCategoria] = useState(false)

  // Pausar/reactivar la propia cuenta de proveedor
  const [cambiandoPausa, setCambiandoPausa] = useState(false)

  // Ver detalle de un producto publicado (clic en la tarjeta, en Mis productos)
  const [productoDetalle, setProductoDetalle] = useState<{
    id: string; nombre: string; sku: string; precio: number; stock: number
    descripcion: string | null; imagen_url: string | null; categoria_id: number | null
    estado: string
  } | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Tab Ajustes — perfil guardado del proveedor (localStorage, para autollenar el formulario)
  const [perfil, setPerfil] = useState({ nombre: '', empresa: '', email: '', telefono: '' })
  const [perfilGuardado, setPerfilGuardado] = useState(false)

  // Tab Ajustes — Mi cuenta (perfil real de la sesión: foto, nombre, contraseña)
  const [cuentaNombre, setCuentaNombre] = useState('')
  const [cuentaAvatarPreview, setCuentaAvatarPreview] = useState<string | null>(null)
  const [cuentaAvatarFile, setCuentaAvatarFile] = useState<File | null>(null)
  const [cuentaPasswordNueva, setCuentaPasswordNueva] = useState('')
  const [cuentaPasswordConfirmar, setCuentaPasswordConfirmar] = useState('')
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)
  const [cuentaGuardada, setCuentaGuardada] = useState(false)
  const [cuentaError, setCuentaError] = useState('')
  const cuentaAvatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) { setCuentaNombre(user.nombre); setCuentaAvatarPreview(user.avatar_url) }
  }, [user])

  // Tab Ajustes — Perfil comercial (descripción, redes, métodos de envío, estado)
  const [perfilComercial, setPerfilComercial] = useState({ descripcion: '', instagram: '', facebook: '', whatsapp: '', metodosEnvio: '' })
  const [estadoCuenta, setEstadoCuenta] = useState<'pendiente' | 'activo' | 'suspendido' | 'en_revision'>('activo')
  const [guardandoComercial, setGuardandoComercial] = useState(false)
  const [comercialGuardado, setComercialGuardado] = useState(false)
  const [comercialError, setComercialError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    supabase.from('user_roles').select('descripcion, redes_sociales, metodos_envio, estado').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const redes = (data.redes_sociales ?? {}) as { instagram?: string; facebook?: string; whatsapp?: string }
        setPerfilComercial({
          descripcion: data.descripcion ?? '',
          instagram: redes.instagram ?? '',
          facebook: redes.facebook ?? '',
          whatsapp: redes.whatsapp ?? '',
          metodosEnvio: data.metodos_envio ?? '',
        })
        if (data.estado) setEstadoCuenta(data.estado as typeof estadoCuenta)
      })
  }, [user?.id])

  async function guardarPerfilComercial() {
    setGuardandoComercial(true)
    setComercialError('')
    const { error } = await supabase.rpc('actualizar_perfil_comercial_proveedor', {
      nueva_descripcion: perfilComercial.descripcion,
      nuevas_redes: { instagram: perfilComercial.instagram, facebook: perfilComercial.facebook, whatsapp: perfilComercial.whatsapp },
      nuevos_metodos_envio: perfilComercial.metodosEnvio,
    })
    setGuardandoComercial(false)
    if (error) { setComercialError('No se pudo guardar: ' + error.message); return }
    setComercialGuardado(true)
    setTimeout(() => setComercialGuardado(false), 2500)
  }

  function elegirCuentaAvatar(file: File | null) {
    if (!file) return
    setCuentaAvatarFile(file)
    setCuentaAvatarPreview(URL.createObjectURL(file))
  }

  async function guardarCuenta() {
    setCuentaError('')
    if (!cuentaNombre.trim()) { setCuentaError('El nombre no puede quedar vacío'); return }
    if (cuentaPasswordNueva && cuentaPasswordNueva.length < 6) { setCuentaError('La contraseña debe tener al menos 6 caracteres'); return }
    if (cuentaPasswordNueva && cuentaPasswordNueva !== cuentaPasswordConfirmar) { setCuentaError('Las contraseñas no coinciden'); return }
    if (!user) return

    setGuardandoCuenta(true)

    let avatarUrl: string | null = null
    if (cuentaAvatarFile) {
      try {
        const webp = await convertToWebp(cuentaAvatarFile)
        avatarUrl = await uploadToSupabase(webp, supabase, 'productos', `avatars/${user.id}.webp`)
      } catch (e) {
        setGuardandoCuenta(false)
        setCuentaError('No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido'))
        return
      }
    }

    const { error: errNombre } = await supabase.rpc('actualizar_mi_perfil', {
      nuevo_nombre: cuentaNombre.trim(),
      ...(avatarUrl ? { nuevo_avatar_url: avatarUrl } : {}),
    })
    if (errNombre) {
      setGuardandoCuenta(false)
      setCuentaError('No se pudo guardar el nombre: ' + errNombre.message)
      return
    }

    if (cuentaPasswordNueva) {
      const { error: errPass } = await supabase.auth.updateUser({ password: cuentaPasswordNueva })
      if (errPass) {
        setGuardandoCuenta(false)
        setCuentaError('El nombre se guardó, pero la contraseña no: ' + errPass.message)
        return
      }
    }

    setGuardandoCuenta(false)
    setCuentaAvatarFile(null)
    setCuentaPasswordNueva('')
    setCuentaPasswordConfirmar('')
    setCuentaGuardada(true)
    setTimeout(() => setCuentaGuardada(false), 2500)
    setTimeout(() => window.location.reload(), 900)
  }

  // Tab Seguimiento y pagos
  const [seguimiento, setSeguimiento] = useState<SeguimientoFila[]>([])
  const [loadingSeguimiento, setLoadingSeguimiento] = useState(false)

  // Medidas del paquete por línea de venta (edición inline)
  const [paqueteAbierto, setPaqueteAbierto] = useState<string | null>(null)
  const [paqueteForm, setPaqueteForm] = useState({ alto: '', ancho: '', peso: '' })
  const [guardandoPaquete, setGuardandoPaquete] = useState(false)

  function abrirPaquete(f: SeguimientoFila) {
    setPaqueteAbierto(f.itemId)
    setPaqueteForm({
      alto: f.altoCm != null ? String(f.altoCm) : '',
      ancho: f.anchoCm != null ? String(f.anchoCm) : '',
      peso: f.pesoKg != null ? String(f.pesoKg) : '',
    })
  }

  async function guardarPaqueteItem(itemId: string) {
    if (!user?.email) return
    setGuardandoPaquete(true)
    const { error } = await guardarPaquete(itemId, user.email, {
      alto_cm: paqueteForm.alto ? Number(paqueteForm.alto) : null,
      ancho_cm: paqueteForm.ancho ? Number(paqueteForm.ancho) : null,
      peso_kg: paqueteForm.peso ? Number(paqueteForm.peso) : null,
    })
    setGuardandoPaquete(false)
    if (error) return
    setSeguimiento(prev => prev.map(f => f.itemId === itemId
      ? { ...f, altoCm: paqueteForm.alto ? Number(paqueteForm.alto) : null, anchoCm: paqueteForm.ancho ? Number(paqueteForm.ancho) : null, pesoKg: paqueteForm.peso ? Number(paqueteForm.peso) : null }
      : f))
    setPaqueteAbierto(null)
  }

  async function cargarSeguimiento(email: string) {
    if (!email) return
    setLoadingSeguimiento(true)

    const { data: aprobadas } = await supabase
      .from('solicitudes_productos').select('producto_sku')
      .eq('proveedor_email', email).eq('estado', 'aprobado')

    const skus = [...new Set((aprobadas ?? []).map(s => s.producto_sku))]
    if (skus.length === 0) { setSeguimiento([]); setLoadingSeguimiento(false); return }

    const { data: productos } = await supabase
      .from('productos').select('id, nombre, sku, costo, imagen_url').in('sku', skus)
    const productoIds = (productos ?? []).map(p => p.id)
    if (productoIds.length === 0) { setSeguimiento([]); setLoadingSeguimiento(false); return }

    const { data: items } = await supabase
      .from('venta_items').select('id, venta_id, producto_id, cantidad, subtotal').in('producto_id', productoIds)
    if (!items || items.length === 0) { setSeguimiento([]); setLoadingSeguimiento(false); return }

    const ventaIds = [...new Set(items.map(i => i.venta_id))]
    const [{ data: ventas }, { data: envios }, paquetesPorItem] = await Promise.all([
      supabase.from('ventas').select('id, numero, estado, created_at').in('id', ventaIds),
      supabase.from('envios').select('venta_id, paqueteria, numero_guia, estado_envio, fecha_envio, fecha_entrega').in('venta_id', ventaIds),
      fetchPaquetesPorVentaItems(items.map(i => i.id)),
    ])

    const productoPorId = new Map((productos ?? []).map(p => [p.id, p]))
    const ventaPorId = new Map((ventas ?? []).map(v => [v.id, v]))
    const envioPorVenta = new Map((envios ?? []).map(e => [e.venta_id, e]))

    const filas: SeguimientoFila[] = items
      .map(item => {
        const producto = productoPorId.get(item.producto_id)
        const venta = ventaPorId.get(item.venta_id)
        const envio = envioPorVenta.get(item.venta_id)
        const paquete = paquetesPorItem.get(item.id)
        if (!producto || !venta) return null
        return {
          itemId: item.id,
          productoNombre: producto.nombre,
          productoSku: producto.sku,
          productoImagen: producto.imagen_url,
          costo: producto.costo,
          cantidad: item.cantidad,
          subtotal: Number(item.subtotal),
          ventaNumero: venta.numero,
          ventaEstado: venta.estado,
          ventaFecha: venta.created_at,
          paqueteria: envio?.paqueteria ?? null,
          numeroGuia: envio?.numero_guia ?? null,
          estadoEnvio: envio?.estado_envio ?? null,
          fechaEnvio: envio?.fecha_envio ?? null,
          fechaEntrega: envio?.fecha_entrega ?? null,
          altoCm: paquete?.alto_cm ?? null,
          anchoCm: paquete?.ancho_cm ?? null,
          pesoKg: paquete?.peso_kg ?? null,
        }
      })
      .filter((f): f is SeguimientoFila => f !== null)
      .sort((a, b) => new Date(b.ventaFecha).getTime() - new Date(a.ventaFecha).getTime())

    setSeguimiento(filas)
    setLoadingSeguimiento(false)
  }

  async function cargarMisProductos(email: string) {
    setLoadingMisProductos(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('id, producto_nombre, producto_sku, producto_precio, estado, created_at, imagen_url, producto_id')
      .eq('proveedor_email', email)
      .eq('estado', 'aprobado')
      .order('created_at', { ascending: false })
    setMisProductos(data ?? [])
    setLoadingMisProductos(false)
  }

  async function cargarHistorial(email: string) {
    if (!email) return
    setLoadingHistorial(true)
    const { data } = await supabase
      .from('solicitudes_productos')
      .select('id, producto_nombre, producto_sku, producto_precio, producto_stock, producto_descripcion, imagen_url, categoria_id, tipo, producto_id, estado, created_at, motivo_rechazo')
      .eq('proveedor_email', email)
      .neq('estado', 'aprobado')
      .order('created_at', { ascending: false })
    setHistorialItems(data ?? [])
    setLoadingHistorial(false)
  }

  async function reenviarARevision(id: string) {
    setReenviandoId(id)
    const { error } = await supabase.from('solicitudes_productos')
      .update({ estado: 'pendiente', motivo_rechazo: null })
      .eq('id', id)
    setReenviandoId(null)
    if (!error && savedEmail) cargarHistorial(savedEmail)
  }

  /** Guarda los cambios de una solicitud (pendiente o rechazada) — actualiza
   * la misma fila, no crea una nueva. Si estaba rechazada, corregirla la
   * reenvía a revisión de una vez (limpia el motivo y la pone pendiente). */
  async function guardarEdicionSolicitud(form: SolicitudProductoForm): Promise<string | void> {
    if (!editandoSolicitud) return 'No se encontró la solicitud'
    let imagen_url = editandoSolicitud.imagen_url
    if (form.imagenFile) {
      try {
        const path = `solicitudes/${Date.now()}-${form.sku}.webp`
        imagen_url = await uploadToSupabase(form.imagenFile, supabase, 'productos', path)
      } catch (e) {
        return 'No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido')
      }
    }
    const eraRechazada = editandoSolicitud.estado === 'rechazado'
    const { error } = await supabase.from('solicitudes_productos').update({
      producto_nombre: form.nombre.trim(),
      producto_precio: Number(form.precio),
      producto_stock: Number(form.stock) || 0,
      producto_descripcion: form.descripcion.trim() || null,
      imagen_url,
      ...(eraRechazada ? { estado: 'pendiente', motivo_rechazo: null } : {}),
    }).eq('id', editandoSolicitud.id)
    if (error) return 'No se pudo guardar: ' + error.message
  }

  /** Trae los datos actuales (en vivo) del producto elegido para pedir su
   * actualización — usa producto_id si ya está ligado, o el SKU como respaldo
   * para productos aprobados antes de que existiera ese enlace. */
  async function elegirProductoParaActualizar(item: MiSolicitud) {
    setCargandoProductoActualizar(true)
    setPickerActualizarAbierto(false)
    const query = supabase.from('productos').select('id, nombre, sku, precio, stock, descripcion, imagen_url, categoria_id')
    const { data } = item.producto_id
      ? await query.eq('id', item.producto_id).maybeSingle()
      : await query.eq('sku', item.producto_sku).maybeSingle()
    setCargandoProductoActualizar(false)
    if (!data) { alert('No se pudo encontrar el producto publicado.'); return }
    setProductoAActualizar({
      id: data.id, nombre: data.nombre, sku: data.sku,
      precio: String(data.precio ?? ''), stock: String(data.stock ?? 0),
      descripcion: data.descripcion ?? '', imagen_url: data.imagen_url, categoria_id: data.categoria_id,
    })
  }

  /** Muestra el detalle de un producto ya publicado — mismo respaldo por
   * SKU que "Solicitar actualización" para productos aprobados antes de que
   * existiera el enlace producto_id. */
  async function verDetalleProducto(item: MiSolicitud) {
    setCargandoDetalle(true)
    const query = supabase.from('productos').select('id, nombre, sku, precio, stock, descripcion, imagen_url, categoria_id')
    const { data } = item.producto_id
      ? await query.eq('id', item.producto_id).maybeSingle()
      : await query.eq('sku', item.producto_sku).maybeSingle()
    setCargandoDetalle(false)
    if (!data) { alert('No se pudo encontrar el producto publicado.'); return }
    setProductoDetalle({
      id: data.id, nombre: data.nombre, sku: data.sku,
      precio: Number(data.precio) || 0, stock: Number(data.stock) || 0,
      descripcion: data.descripcion, imagen_url: data.imagen_url, categoria_id: data.categoria_id,
      estado: item.estado,
    })
  }

  /** Envía la solicitud de actualización — no toca el producto publicado,
   * solo queda pendiente hasta que el admin la apruebe. */
  async function guardarSolicitudActualizacion(form: SolicitudProductoForm): Promise<string | void> {
    if (!productoAActualizar) return 'No se encontró el producto'
    let imagen_url = productoAActualizar.imagen_url
    if (form.imagenFile) {
      try {
        const path = `solicitudes/${Date.now()}-${form.sku}.webp`
        imagen_url = await uploadToSupabase(form.imagenFile, supabase, 'productos', path)
      } catch (e) {
        return 'No se pudo subir la imagen: ' + (e instanceof Error ? e.message : 'error desconocido')
      }
    }
    const nombreProveedor = perfil.nombre || proveedor.nombre || user?.email?.split('@')[0] || 'Proveedor'
    const emailProveedor = perfil.email || proveedor.email || user?.email || savedEmail
    const { error } = await supabase.from('solicitudes_productos').insert({
      proveedor_nombre: nombreProveedor,
      proveedor_empresa: perfil.empresa || proveedor.empresa || null,
      proveedor_email: emailProveedor,
      proveedor_telefono: perfil.telefono || proveedor.telefono || null,
      producto_nombre: form.nombre.trim(),
      producto_sku: form.sku,
      producto_precio: Number(form.precio),
      producto_stock: Number(form.stock) || 0,
      producto_descripcion: form.descripcion.trim() || null,
      categoria_id: productoAActualizar.categoria_id,
      imagen_url,
      estado: 'pendiente',
      tipo: 'actualizacion',
      producto_id: productoAActualizar.id,
    })
    if (error) return 'No se pudo enviar la solicitud: ' + error.message
  }

  /** Pide una categoría o subcategoría que todavía no existe — no se crea
   * sola, queda pendiente hasta que el admin la apruebe. */
  async function enviarSolicitudCategoria(data: { nombre: string; parentId: number | null }): Promise<string | void> {
    const nombreProveedor = perfil.nombre || proveedor.nombre || user?.email?.split('@')[0] || 'Proveedor'
    const emailProveedor = perfil.email || proveedor.email || user?.email || savedEmail
    const { error } = await supabase.from('solicitudes_categorias').insert({
      proveedor_nombre: nombreProveedor,
      proveedor_empresa: perfil.empresa || proveedor.empresa || null,
      proveedor_email: emailProveedor,
      nombre: data.nombre,
      parent_id: data.parentId,
      estado: 'pendiente',
    })
    if (error) return 'No se pudo enviar la solicitud: ' + error.message
  }

  async function pausarCuenta() {
    if (!user) return
    const ok = confirm('¿Pausar tu cuenta? Tus productos, solicitudes y demás dejarán de aparecer en la tienda y en el panel del admin hasta que la reactives tú mismo.')
    if (!ok) return
    setCambiandoPausa(true)
    const { error } = await supabase.from('user_roles').update({ pausado_por_titular: true }).eq('user_id', user.id)
    setCambiandoPausa(false)
    if (error) { alert('No se pudo pausar la cuenta: ' + error.message); return }
    window.location.reload()
  }

  async function reactivarCuenta() {
    if (!user) return
    const ok = confirm('¿Reactivar tu cuenta? Tus productos, solicitudes y demás volverán a aparecer como estaban.')
    if (!ok) return
    setCambiandoPausa(true)
    const { error } = await supabase.from('user_roles').update({ pausado_por_titular: false }).eq('user_id', user.id)
    setCambiandoPausa(false)
    if (error) { alert('No se pudo reactivar la cuenta: ' + error.message); return }
    window.location.reload()
  }

  const [proveedor, setProveedor] = useState({
    nombre: '', empresa: '', email: '', telefono: '',
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const extraFileRef = useRef<HTMLInputElement>(null)
  const [extraSlotTarget, setExtraSlotTarget] = useState(-1)
  const [extraDragging, setExtraDragging] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draftBanner, setDraftBanner] = useState(false)
  const draftPendiente = useRef<{ proveedor: typeof proveedor; prod: Partial<ProductoLocal> } | null>(null)

  // Chips colores/tallas
  const [colorInput, setColorInput] = useState('')
  const [mostrarColores, setMostrarColores] = useState(false)
  const [abiertoVariantes, setAbiertoVariantes] = useState(false)
  const [mostrarVariantes, setMostrarVariantes] = useState(false)
  const [abiertoEnvio, setAbiertoEnvio] = useState(false)
  const [abiertoContextual, setAbiertoContextual] = useState(false)
  const [mostrarPadreExtra, setMostrarPadreExtra] = useState(false)
  const [abiertoPadreExtra, setAbiertoPadreExtra] = useState(true)
  const dragImgIndex = useRef<number | null>(null)

  // Peso: unidad seleccionada en UI (el valor real de prod.peso siempre va en gramos)
  const [pesoValor, setPesoValor] = useState('')
  const [pesoUnidad, setPesoUnidad] = useState<UnidadPeso>('g')

  useEffect(() => {
    try {
      const u = localStorage.getItem(PESO_UNIDAD_KEY) as UnidadPeso | null
      if (u && UNIDADES_PESO.includes(u)) setPesoUnidad(u)
    } catch { /* ignorar */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(PESO_UNIDAD_KEY, pesoUnidad) } catch { /* ignorar */ }
  }, [pesoUnidad])
  useEffect(() => {
    setProd(p => ({ ...p, peso: pesoValor ? String(Math.round(Number(pesoValor) * FACTOR_A_GRAMOS[pesoUnidad])) : '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesoValor, pesoUnidad])

  function buildVariantes(
    colores: string[], tallas: string[],
    existing: Array<{ color: string; talla: string; stock: string }>
  ) {
    if (colores.length === 0 && tallas.length === 0) return []
    if (colores.length > 0 && tallas.length === 0)
      return colores.map(color => ({ color, talla: '', stock: existing.find(v => v.color === color && v.talla === '')?.stock ?? '' }))
    if (tallas.length > 0 && colores.length === 0)
      return tallas.map(talla => ({ color: '', talla, stock: existing.find(v => v.color === '' && v.talla === talla)?.stock ?? '' }))
    return colores.flatMap(color => tallas.map(talla => ({ color, talla, stock: existing.find(v => v.color === color && v.talla === talla)?.stock ?? '' })))
  }

  function addColor(val: string) {
    const v = val.trim()
    if (!v || prod.colores.includes(v)) { setColorInput(''); return }
    const newColores = [...prod.colores, v]
    setProd(p => ({ ...p, colores: newColores, variantes: buildVariantes(newColores, p.tallas, p.variantes) }))
    setColorInput('')
  }
  function removeColor(c: string) {
    const newColores = prod.colores.filter(x => x !== c)
    setProd(p => ({ ...p, colores: newColores, variantes: buildVariantes(newColores, p.tallas, p.variantes) }))
  }
  function addTalla(val: string) {
    const v = val.trim()
    if (!v || prod.tallas.includes(v)) return
    const newTallas = [...prod.tallas, v]
    setProd(p => ({ ...p, tallas: newTallas, variantes: buildVariantes(p.colores, newTallas, p.variantes) }))
  }
  function removeTalla(t: string) {
    const newTallas = prod.tallas.filter(x => x !== t)
    setProd(p => ({ ...p, tallas: newTallas, variantes: buildVariantes(p.colores, newTallas, p.variantes) }))
  }
  function toggleContextual(grupoLabel: string, val: string) {
    const v = val.trim()
    if (!v) return
    setProd(p => {
      const actuales = p.camposExtra[grupoLabel] ?? []
      const nuevos = actuales.includes(v) ? actuales.filter(x => x !== v) : [...actuales, v]
      return { ...p, camposExtra: { ...p.camposExtra, [grupoLabel]: nuevos } }
    })
  }
  function setVarianteStock(idx: number, stock: string) {
    setProd(p => {
      const v = [...p.variantes]
      v[idx] = { ...v[idx], stock }
      return { ...p, variantes: v }
    })
  }

  // ---- Galería unificada (principal + extra) ----
  type ImgItem = { file: File | null; preview: string | null }
  function getGaleria(): ImgItem[] {
    const list: ImgItem[] = []
    if (prod.imagenFile || prod.imagenPreview) list.push({ file: prod.imagenFile, preview: prod.imagenPreview })
    return [...list, ...prod.imagenesExtra]
  }
  function setGaleria(list: ImgItem[]) {
    const [principal, ...resto] = list
    setProd(p => ({ ...p, imagenFile: principal?.file ?? null, imagenPreview: principal?.preview ?? null, imagenesExtra: resto }))
  }
  async function agregarImagenesGaleria(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setConvirtiendo(true)
    try {
      const converted = await Promise.all(arr.map(async f => {
        const webp = await convertToWebp(f)
        return { file: webp, preview: URL.createObjectURL(webp) }
      }))
      setGaleria([...getGaleria(), ...converted])
    } finally { setConvirtiendo(false) }
  }
  function onGaleriaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) agregarImagenesGaleria(e.target.files)
    e.target.value = ''
  }
  function onGaleriaDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setExtraDragging(false)
    if (e.dataTransfer.files?.length) agregarImagenesGaleria(e.dataTransfer.files)
  }
  function removeImagenAt(i: number) {
    const list = getGaleria()
    list.splice(i, 1)
    setGaleria(list)
  }
  function usarComoPrincipal(i: number) {
    const list = getGaleria()
    const [item] = list.splice(i, 1)
    list.unshift(item)
    setGaleria(list)
  }
  function onImgDragStart(i: number) { dragImgIndex.current = i }
  function onImgDrop(i: number) {
    const from = dragImgIndex.current
    dragImgIndex.current = null
    if (from === null || from === i) return
    const list = getGaleria()
    const [moved] = list.splice(from, 1)
    list.splice(i, 0, moved)
    setGaleria(list)
  }

  // Cámara
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [camaraError, setCamaraError] = useState('')

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function abrirCamara() {
    setCamaraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCamaraActiva(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
    } catch {
      setCamaraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  function cerrarCamara() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamaraActiva(false)
    setCamaraError('')
  }

  async function tomarFoto() {
    if (!videoRef.current) return
    setConvirtiendo(true)
    try {
      const webp = await captureFrameAsWebp(videoRef.current)
      const url = URL.createObjectURL(webp)
      setProd(p => ({ ...p, imagenFile: webp, imagenPreview: url }))
      cerrarCamara()
    } finally {
      setConvirtiendo(false)
    }
  }

  // Protección por rol: solo proveedores (o admin) pueden entrar
  useEffect(() => {
    if (authLoading) return
    if (!user || (user.role !== 'proveedor' && user.role !== 'admin')) {
      router.replace('/login?redirect=/proveedores')
    }
  }, [authLoading, user, router])

  // Prellenar nombre/email con los de la cuenta logueada
  useEffect(() => {
    if (!user || user.role !== 'proveedor') return
    setProveedor(p => ({ ...p, nombre: p.nombre || user.nombre, email: user.email }))
  }, [user])

  // Cargar borrador + email guardado al inicio
  useEffect(() => {
    // Cargar perfil guardado del proveedor
    try {
      const rawPerfil = localStorage.getItem(PERFIL_KEY)
      if (rawPerfil) {
        const p = JSON.parse(rawPerfil)
        setPerfil(p)
        // Pre-llenar el form de registro con el perfil
        setProveedor(p)
      }
    } catch { /* ignorar */ }

    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const { proveedor: p, prod: pr } = JSON.parse(raw)
        // Solo hay algo que ofrecer restaurar si el producto en curso tenía datos reales —
        // si no, no tiene sentido mostrar el aviso.
        if (pr && (pr.nombre?.trim() || pr.sku?.trim() || pr.categoria_id)) {
          draftPendiente.current = { proveedor: p, prod: pr }
          setDraftBanner(true)
        } else if (p) {
          setProveedor(p)
        }
      }
    } catch { /* ignorar */ }

  }, [])

  function restaurarBorradorProducto() {
    const pendiente = draftPendiente.current
    if (!pendiente) return
    if (pendiente.proveedor) setProveedor(pendiente.proveedor)
    const pr = pendiente.prod
    setProd({ ...emptyProducto(), ...pr, imagenFile: null, imagenPreview: null })
    if (pr.peso) {
      const pesoUi = pesoAUnidadMasClara(Number(pr.peso) || 0)
      setPesoValor(pesoUi.valor)
      setPesoUnidad(pesoUi.unidad)
    }
    if (pr.colores?.length) setMostrarColores(true)
    if (pr.colores?.length || pr.tallas?.length) { setAbiertoVariantes(true); setMostrarVariantes(true) }
    if (pr.peso || pr.largo || pr.ancho || pr.alto) setAbiertoEnvio(true)
    setDraftBanner(false)
  }

  function descartarBorradorProducto() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignorar */ }
    draftPendiente.current = null
    setDraftBanner(false)
  }

  // Con sesión real, cargar el historial del email de la cuenta logueada
  useEffect(() => {
    if (!user?.email) return
    setSavedEmail(user.email)
    setTab('seguimiento')
    cargarHistorial(user.email)
    cargarMisProductos(user.email)
    cargarSeguimiento(user.email)
  }, [user?.email])

  // Inventario total: suma del stock real de los productos aprobados de este proveedor
  useEffect(() => {
    if (misProductos.length === 0) { setInventarioTotal(0); return }
    const skus = misProductos.map(p => p.producto_sku)
    supabase.from('productos').select('stock').in('sku', skus)
      .then(({ data }) => setInventarioTotal((data ?? []).reduce((t, p) => t + (p.stock ?? 0), 0)))
  }, [misProductos])

  // Realtime: cuando el admin cambia el estado de una solicitud → refrescar
  useEffect(() => {
    if (!savedEmail) return
    const channel = supabase
      .channel('proveedor-solicitudes-' + savedEmail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_productos' }, () => {
        cargarHistorial(savedEmail)
        cargarMisProductos(savedEmail)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [savedEmail])

  // Guardar borrador (debounced)
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      const { imagenFile: _f, imagenPreview: _p, ...safeP } = prod
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ proveedor, prod: safeP })) } catch { /* ignorar */ }
    }, 800)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  }, [proveedor, prod])

  useEffect(() => {
    supabase.from('categorias').select('id, nombre, parent_id, activo, campos_extra').order('nombre')
      .then(({ data }) => { if (data) setCategorias(data) })
  }, [])

  function setP(field: string, value: string) {
    setProveedor(prev => ({ ...prev, [field]: value }))
  }
  function setPR(field: keyof ProductoLocal, value: string) {
    setProd(prev => ({ ...prev, [field]: value }))
    setProdError('')
  }

  // ---- Imagen drag & drop ----
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setConvirtiendo(true)
    try {
      const webp = await convertToWebp(file)
      const url = URL.createObjectURL(webp)
      setProd(p => ({ ...p, imagenFile: webp, imagenPreview: url }))
    } finally {
      setConvirtiendo(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }


  // ---- Agregar producto a la lista ----
  function agregarProducto() {
    if (!prod.nombre.trim() || !prod.sku.trim()) {
      setProdError('Nombre y SKU son obligatorios.')
      return
    }
    if (!prod.precio || isNaN(Number(prod.precio)) || Number(prod.precio) <= 0) {
      setProdError('El precio debe ser un número mayor a 0.')
      return
    }
    if (prod.precioPromocion && Number(prod.precioPromocion) >= Number(prod.precio)) {
      setProdError('El precio de promoción debe ser menor al precio regular.')
      return
    }
    if (productos.some(p => p.sku.toUpperCase() === prod.sku.toUpperCase())) {
      setProdError('Ya agregaste un producto con ese SKU.')
      return
    }
    setProductos(prev => [...prev, { ...prod, sku: prod.sku.toUpperCase() }])
    // Recuerda la última categoría usada — la mayoría de las veces el siguiente producto es de la misma
    setProd({ ...emptyProducto(), categoria_id: prod.categoria_id })
    setPesoValor('')
    setMostrarColores(false)
    setAbiertoVariantes(false)
    setAbiertoEnvio(false)
    setProdError('')
  }

  function eliminarProducto(i: number) {
    setProductos(prev => prev.filter((_, idx) => idx !== i))
  }

  // ---- Enviar solicitud ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    // Debe haber al menos 1 producto
    const lista = [...productos]
    // Si hay datos en el formulario actual, los incluimos también
    if (prod.nombre.trim() && prod.sku.trim() && prod.precio) {
      if (isNaN(Number(prod.precio)) || Number(prod.precio) <= 0) {
        setErrorMsg('El precio del producto actual no es válido.')
        return
      }
      if (!lista.some(p => p.sku.toUpperCase() === prod.sku.toUpperCase())) {
        lista.push({ ...prod, sku: prod.sku.toUpperCase() })
      }
    }

    if (lista.length === 0) {
      setErrorMsg('Agrega al menos un producto antes de enviar.')
      return
    }
    if (!proveedor.nombre.trim() || !proveedor.email.trim()) {
      setErrorMsg('Nombre y email del proveedor son obligatorios.')
      return
    }

    setFormState('loading')

    // Subir imágenes y construir rows
    const rows = []
    for (const p of lista) {
      let imagen_url: string | null = null
      if (p.imagenFile) {
        try {
          const path = `solicitudes/${Date.now()}-${p.sku}.webp`
          imagen_url = await uploadToSupabase(p.imagenFile, supabase, 'productos', path)
        } catch { /* si falla el upload, se guarda sin imagen */ }
      }

      // Subir imágenes extra
      const imagenesExtraUrls: string[] = []
      for (const extra of p.imagenesExtra) {
        if (extra.file) {
          try {
            const path = `solicitudes/${Date.now()}-${p.sku}-extra${imagenesExtraUrls.length}.webp`
            const url = await uploadToSupabase(extra.file, supabase, 'productos', path)
            if (url) imagenesExtraUrls.push(url)
          } catch { /* ignorar */ }
        }
      }

      // Detalles opcionales
      const detalles: Record<string, unknown> = {}
      if (p.colores.length)    detalles.colores   = p.colores
      if (p.tallas.length)     detalles.tallas    = p.tallas
      const camposExtraConValores = Object.fromEntries(Object.entries(p.camposExtra).filter(([, v]) => v.length > 0))
      if (Object.keys(camposExtraConValores).length) detalles.campos_extra = camposExtraConValores
      if (p.variantes.length)  detalles.variantes = p.variantes
      if (p.peso)              detalles.peso_g    = Number(p.peso)
      if (p.largo || p.ancho || p.alto) detalles.dimensiones = { largo: Number(p.largo)||0, ancho: Number(p.ancho)||0, alto: Number(p.alto)||0 }
      if (imagenesExtraUrls.length) detalles.imagenes_extra = imagenesExtraUrls
      if (p.precioPromocion && Number(p.precioPromocion) > 0 && Number(p.precioPromocion) < Number(p.precio)) {
        detalles.precio_promocional = Number(p.precioPromocion)
      }

      rows.push({
        proveedor_nombre:     proveedor.nombre.trim(),
        proveedor_empresa:    proveedor.empresa.trim() || null,
        proveedor_email:      proveedor.email.trim().toLowerCase(),
        proveedor_telefono:   proveedor.telefono.trim() || null,
        producto_nombre:      p.nombre.trim(),
        producto_sku:         p.sku,
        producto_descripcion: p.descripcion.trim() || null,
        producto_precio:      Number(p.precio),
        producto_stock:       Number(p.stock) || 0,
        categoria_id:         p.categoria_id ? Number(p.categoria_id) : null,
        imagen_url,
        estado:               'pendiente',
        detalles:             Object.keys(detalles).length ? detalles : null,
      })
    }

    const { error } = await supabase.from('solicitudes_productos').insert(rows)

    if (error) {
      console.error('Error inserting solicitud:', error)
      if (error.code === '23505') {
        setErrorMsg('Uno o más SKUs ya existen en el sistema. Revisa los códigos.')
      } else if (error.code === 'PGRST204' || error.message?.includes('detalles')) {
        setErrorMsg('Error de base de datos: falta ejecutar la migración SQL. Contacta al administrador.')
      } else {
        setErrorMsg(`Error al enviar la solicitud: ${error.message || error.code || 'desconocido'}`)
      }
      setFormState('error')
      return
    }

    localStorage.removeItem(DRAFT_KEY)
    const emailGuardado = proveedor.email.trim().toLowerCase()
    try { localStorage.setItem(EMAIL_KEY, emailGuardado) } catch {}
    setSavedEmail(emailGuardado)
    // Recargar listas para que reflejen los nuevos envíos
    cargarMisProductos(emailGuardado)
    cargarHistorial(emailGuardado)
    setFormState('success')
  }

  function resetForm() {
    setProveedor({ nombre: '', empresa: '', email: '', telefono: '' })
    setProd(emptyProducto())
    setProductos([])
    setFormState('idle')
    setErrorMsg('')
    setProdError('')
  }

  const catNombre = (id: string) => categorias.find(c => String(c.id) === id)?.nombre ?? '—'

  /** Cada categoría (padre o subcategoría) puede tener su propia config de campos
   * contextuales. Si la seleccionada es una subcategoría, la del padre NO se
   * aplica automáticamente — queda disponible como "activable" aparte. */
  const catSeleccionada = (() => {
    const idNum = Number(prod.categoria_id)
    if (!idNum) return null
    const cat = categorias.find(c => c.id === idNum)
    if (!cat) return null
    if (cat.parent_id === null) return { propio: cat.campos_extra ?? null, padre: null as CamposExtraConfig | null, padreNombre: null as string | null }
    const padre = categorias.find(c => c.id === cat.parent_id)
    return { propio: cat.campos_extra ?? null, padre: padre?.campos_extra ?? null, padreNombre: padre?.nombre ?? null }
  })()
  const camposContextuales = tieneContenido(catSeleccionada?.propio) ? catSeleccionada!.propio : null
  const camposContextualesPadre = catSeleccionada?.padreNombre && tieneContenido(catSeleccionada.padre) ? catSeleccionada.padre : null

  const navItem = (id: 'registro' | 'historial' | 'misEnviados' | 'seguimiento' | 'mensajes' | 'transferencias' | 'ajustes', label: string, emoji: string, badge?: number) => {
    const active = tab === id
    return (
      <button onClick={() => {
        setTab(id)
        if (id === 'misEnviados' && savedEmail) cargarMisProductos(savedEmail)
        if (id === 'historial' && savedEmail) cargarHistorial(savedEmail)
      }} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', width: '100%',
        color: NAVY, fontSize: 14, fontWeight: active ? 800 : 700, borderRadius: 999,
        background: active ? '#fff' : 'transparent', cursor: 'pointer',
        border: active ? `2px solid ${NAVY}` : '2px solid transparent',
        boxShadow: active ? '0 6px 16px rgba(37,40,85,0.12)' : 'none',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {!!badge && (
          <span style={{ background: PINK, color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
            {badge}
          </span>
        )}
      </button>
    )
  }

  if (authLoading || !user || (user.role !== 'proveedor' && user.role !== 'admin')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8' }}>
        <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 600 }}>Verificando sesión...</p>
      </div>
    )
  }

  if (user.role === 'proveedor' && user.estado === 'suspendido') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, textAlign: 'center', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🚫</p>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>Cuenta suspendida</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
            Tu cuenta de proveedor fue suspendida por el equipo de Order Express. Si crees que es un error, contáctanos.
          </p>
          <button onClick={signOut}
            style={{ background: PINK, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // Centro de notificaciones: junta en un solo lugar todo lo pendiente que el
  // proveedor debería revisar, sin importar en qué pestaña esté parado.
  const notifPendientesProductos = (historialItems ?? []).filter(h => h.estado === 'pendiente').length
  const notifRechazados = (historialItems ?? []).filter(h => h.estado === 'rechazado').length
  const notifTransferencias = transferencias.length
  type NotifItem = { id: string; icon: string; texto: string; destino: typeof tab }
  const notificaciones: NotifItem[] = ([
    notifPendientesProductos > 0 && {
      id: 'pendientes', icon: '⏳', destino: 'historial',
      texto: `${notifPendientesProductos} producto${notifPendientesProductos !== 1 ? 's' : ''} en revisión`,
    },
    notifRechazados > 0 && {
      id: 'rechazados', icon: '❌', destino: 'historial',
      texto: `${notifRechazados} producto${notifRechazados !== 1 ? 's' : ''} rechazado${notifRechazados !== 1 ? 's' : ''}`,
    },
    notifTransferencias > 0 && {
      id: 'transferencias', icon: '🔁', destino: 'transferencias',
      texto: `${notifTransferencias} transferencia${notifTransferencias !== 1 ? 's' : ''} pendiente${notifTransferencias !== 1 ? 's' : ''}`,
    },
    user.pausadoPorTitular && {
      id: 'pausado', icon: '⏸️', destino: 'ajustes',
      texto: 'Tu cuenta está en pausa',
    },
  ] as (NotifItem | false)[]).filter((n): n is NotifItem => !!n)
  const totalNotificaciones = notificaciones.length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Overlay mobile — se muestra cuando el drawer está abierto, independiente de JS isMobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} />
      )}

      {/* ---- Sidebar ---- */}
      <aside className={`prov-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 240, maxWidth: 280, height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        zIndex: 100, padding: '16px 12px 16px', transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}>

        {/* Logo centrado (lleva a la tienda) + botón cerrar en mobile */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', marginBottom: 16 }}>
          <Link href="/" title="Ver tienda" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 44, width: 'auto' }} />
          </Link>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', flexShrink: 0 }}>
              ×
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, minHeight: 0, background: '#f1f2f6', borderRadius: 22, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '12px 14px 6px', display: 'block' }}>PORTAL</span>
          {navItem('seguimiento', 'Tablero', '🚚')}
          {navItem('registro',  'Registrar producto', '📦')}
          {navItem('historial', 'Mis solicitudes',    '🔍')}
          {navItem('misEnviados', 'Mis productos', '📋')}
          {navItem('transferencias', 'Transferencias', '🔁', transferencias.length)}
          {navItem('mensajes', 'Mensajes', '💬')}
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9aa0b4', letterSpacing: '0.08em', padding: '20px 14px 6px', display: 'block' }}>ACCESO</span>
          {navItem('ajustes', 'Ajustes', '⚙️')}
        </nav>

        {/* Footer: sesión real */}
        <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
            <div style={{ width: 34, height: 34, background: NAVY, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {user.email[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: 20 }}>
                {user.role === 'admin' ? 'Admin' : `Hola ${(user.nombre || '').trim() || user.email.split('@')[0]}`}
              </span>
            </div>
          </div>
          <button type="button" onClick={signOut}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', border: 'none', borderRadius: 999, background: 'rgba(231,34,109,0.10)', color: PINK, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---- Área principal ---- */}
      <div className="prov-main" style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header className="prov-header" style={{ height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
          <button className="prov-hamburger" onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'none', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={sidebarOpen ? PINK : NAVY} strokeWidth="2.5" strokeLinecap="round">
              {sidebarOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
          {isMobile && (
            <img src="/storefront/monograma.svg" alt="OrderExpress"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', height: 32, width: 'auto' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
            <h1 className="prov-title" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.01em' }}>
              {tab === 'registro' ? 'Registrar producto' : tab === 'historial' ? 'Mis solicitudes' : tab === 'misEnviados' ? 'Mis productos' : tab === 'seguimiento' ? `Hola ${(user.nombre || '').trim() || user.email.split('@')[0]}` : tab === 'mensajes' ? 'Mensajes' : tab === 'transferencias' ? 'Transferencias' : 'Ajustes'}
            </h1>
            {tab === 'registro' && formState !== 'success' && (
              <div className="prov-steps" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {[
                  { n: '1', label: 'Llena el formulario' },
                  { n: '2', label: 'Revisamos' },
                  { n: '3', label: 'Publicamos' },
                ].map((step, i) => (
                  <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, flexShrink: 0 }}>{step.n}</div>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
                    {i < 2 && <span style={{ color: '#d1d5db', marginLeft: 4 }}>→</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Centro de notificaciones — visible en todas las pestañas menos Ajustes.
              marginLeft:auto lo manda al extremo derecho sin pelearse con el
              justify-content:space-between (desktop) ni con el flex-start que
              impone el CSS de mobile. */}
          {tab !== 'ajustes' && (
            <div ref={notifRef} style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Notificaciones"
                aria-expanded={notifOpen}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                  background: notifOpen ? '#f1f2f6' : 'transparent', cursor: 'pointer', fontSize: 17,
                }}
              >
                🔔
                {totalNotificaciones > 0 && (
                  <span style={{
                    position: 'absolute', top: 1, right: 1, minWidth: 15, height: 15, padding: '0 4px',
                    borderRadius: 8, background: PINK, color: '#fff', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
                    lineHeight: 1,
                  }}>
                    {totalNotificaciones > 9 ? '9+' : totalNotificaciones}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300,
                  maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 14,
                  boxShadow: '0 12px 40px rgba(37,40,85,0.18)', border: '1px solid #f3f4f6',
                  zIndex: 250, overflow: 'hidden',
                }}>
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: NAVY }}>Notificaciones</p>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notificaciones.length === 0 ? (
                      <p style={{ margin: 0, padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                        Sin pendientes por ahora ✓
                      </p>
                    ) : notificaciones.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => { setTab(n.destino); setNotifOpen(false) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                          border: 'none', borderBottom: '1px solid #f9fafb', background: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{n.texto}</span>
                        <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 13, flexShrink: 0 }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {user.pausadoPorTitular && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 700 }}>⏸️ Tu cuenta está en pausa — tus productos y solicitudes están ocultos.</p>
            <button type="button" onClick={reactivarCuenta} disabled={cambiandoPausa}
              style={{ background: '#92400e', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: cambiandoPausa ? 'default' : 'pointer' }}>
              {cambiandoPausa ? 'Reactivando...' : 'Reactivar ahora'}
            </button>
          </div>
        )}

        {/* Contenido */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '28px 32px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {tab === 'registro' && formState === 'success' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Confirmación */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(37,40,85,0.10)' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: NAVY, marginBottom: 8 }}>¡Solicitud enviada!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Recibimos <strong>{productos.length} producto{productos.length !== 1 ? 's' : ''}</strong> de <strong>{proveedor.nombre}</strong>. Te contactaremos a <strong>{proveedor.email}</strong> en 24-48 horas hábiles.
              </p>
              <button onClick={resetForm}
                style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Enviar otra solicitud
              </button>
            </div>

            {/* Lista de productos enviados */}
            {productos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, background: `${NAVY}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>Productos registrados</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Pendientes de revisión por el equipo</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: PINK, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    {productos.length}
                  </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 28px', borderBottom: i < productos.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                      {/* Imagen o placeholder */}
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {p.imagenPreview
                          ? <img src={p.imagenPreview} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '📦'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>SKU: {p.sku || '—'} · Stock: {p.stock || 0}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#0049ff', margin: '0 0 2px' }}>${Number(p.precio || 0).toLocaleString('es-MX')}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>En revisión</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'registro' ? (
          <form onSubmit={handleSubmit}>

            {errorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 24 }}>
                {errorMsg}
              </div>
            )}

            {draftBanner && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 18px', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>📝 Tienes un producto sin terminar guardado en este navegador.</p>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={restaurarBorradorProducto}
                    style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Restaurar
                  </button>
                  <button type="button" onClick={descartarBorradorProducto}
                    style={{ background: 'none', color: '#6b7280', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {/* Aviso si no hay perfil configurado */}
            {!proveedor.nombre && !proveedor.email && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚙️</span>
                <p style={{ fontSize: 13, color: '#1e40af', margin: 0, fontWeight: 600 }}>
                  Configura tus datos en{' '}
                  <button type="button" onClick={() => setTab('ajustes')}
                    style={{ background: 'none', border: 'none', color: '#1e40af', fontWeight: 800, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Ajustes
                  </button>
                  {' '}para no tener que llenarlos cada vez.
                </p>
              </div>
            )}

            {/* ---- Lista de productos añadidos ---- */}
            {productos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 20, overflow: 'hidden' }}>

                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 32, height: 32, background: `${NAVY}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🗂️</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Productos en esta solicitud</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Revisa y edita antes de enviar</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: PINK, color: '#fff', fontSize: 12, fontWeight: 900, padding: '3px 12px', borderRadius: 20 }}>
                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                {/* Encabezados de tabla + filas: scroll horizontal en mobile */}
                <div className="prov-table-scroll">
                <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 70px', gap: 0, padding: '8px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', minWidth: 520 }}>
                  {['#', '', 'Producto / SKU', 'Precio', 'Stock', 'Categoría', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 6px' }}>{h}</span>
                  ))}
                </div>

                {/* Filas */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 520 }}>
                  {productos.map((p, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '32px 52px 1fr 90px 60px 120px 70px', gap: 0,
                      alignItems: 'center', padding: '10px 20px',
                      borderBottom: i < productos.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}>
                      {/* # */}
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, textAlign: 'center' }}>{i + 1}</span>

                      {/* Imagen */}
                      <div style={{ padding: '0 6px' }}>
                        {p.imagenPreview ? (
                          <img src={p.imagenPreview} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', display: 'block' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #e5e7eb' }}>📦</div>
                        )}
                      </div>

                      {/* Nombre + SKU */}
                      <div style={{ padding: '0 6px', minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.sku}</p>
                        {p.descripcion && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</p>
                        )}
                      </div>

                      {/* Precio */}
                      <div style={{ padding: '0 6px' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                          ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Stock */}
                      <div style={{ padding: '0 6px' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: Number(p.stock) === 0 ? '#9ca3af' : Number(p.stock) < 5 ? '#d97706' : '#374151',
                        }}>
                          {p.stock || '0'} uds
                        </span>
                      </div>

                      {/* Categoría */}
                      <div style={{ padding: '0 6px' }}>
                        {p.categoria_id ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: `${NAVY}10`, color: NAVY, padding: '3px 8px', borderRadius: 20, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {catNombre(p.categoria_id)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                        )}
                      </div>

                      {/* Editar / Eliminar */}
                      <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <button type="button"
                          title="Editar producto"
                          onClick={() => {
                            const p = productos[i]
                            setProd(p)
                            const pesoUi = pesoAUnidadMasClara(Number(p.peso) || 0)
                            setPesoValor(pesoUi.valor)
                            if (p.peso) setPesoUnidad(pesoUi.unidad)
                            setMostrarColores(p.colores.length > 0)
                            setAbiertoVariantes(p.colores.length > 0 || p.tallas.length > 0)
                            setAbiertoEnvio(!!(p.peso || p.largo || p.ancho || p.alto))
                            eliminarProducto(i)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          style={{ background: 'transparent', color: '#d1d5db', border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; (e.currentTarget as HTMLButtonElement).style.color = '#0049ff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db' }}>
                          ✏️
                        </button>
                        <button type="button" onClick={() => eliminarProducto(i)}
                          title="Eliminar producto"
                          style={{ background: 'transparent', color: '#d1d5db', border: 'none', width: 28, height: 28, borderRadius: 6, fontWeight: 900, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db' }}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>{/* /prov-table-scroll */}

                {/* Footer: resumen total */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: `${NAVY}06`, borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    {productos.reduce((s, p) => s + (Number(p.stock) || 0), 0)} unidades en total
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Valor total estimado:</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: NAVY }}>
                      ${productos.reduce((s, p) => s + Number(p.precio) * (Number(p.stock) || 1), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Sección: Agregar producto ---- */}
            {(() => {
              const galeria = getGaleria()
              const camposObligatorios = [
                { label: 'Nombre del producto', ok: !!prod.nombre.trim() },
                { label: 'SKU / código', ok: !!prod.sku.trim() },
                { label: 'Categoría', ok: !!prod.categoria_id },
                { label: 'Precio', ok: !!prod.precio && Number(prod.precio) > 0 },
              ]
              const camposRecomendados = [
                { label: 'Al menos una fotografía', ok: galeria.length > 0 },
                { label: 'Stock disponible', ok: !!prod.stock && Number(prod.stock) > 0 },
                { label: 'Descripción', ok: !!prod.descripcion.trim() },
              ]
              const totalCampos = camposObligatorios.length + camposRecomendados.length
              const hechos = [...camposObligatorios, ...camposRecomendados].filter(c => c.ok).length
              const pctCompletado = Math.round((hechos / totalCampos) * 100)
              const listoParaAgregar = camposObligatorios.every(c => c.ok)
              const pendientes = [...camposObligatorios, ...camposRecomendados].filter(c => !c.ok)

              return (
            <div>
              {prodError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                  {prodError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>
                  {productos.length === 0 ? 'Datos del producto' : `Producto ${productos.length + 1}`}
                </h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Completa los datos — puedes dejar en blanco lo que no necesites</p>
              </div>

              {/* Layout: columna de tarjetas | panel lateral fijo */}
              <div className="prov-registro-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

                {/* ==== Columna principal: tarjetas ==== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

                  {/* Fotografías */}
                  <ProvCard icon="🖼️" title="Fotografías" hint="La primera imagen es la principal — arrastra para reordenar"
                    right={!camaraActiva && (
                      <button type="button" onClick={abrirCamara}
                        style={{ background: '#f3f4f6', border: 'none', padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        📷 Cámara
                      </button>
                    )}>

                    {camaraError && <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, margin: '0 0 10px' }}>⚠️ {camaraError}</p>}

                    {camaraActiva ? (
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: `2px solid ${NAVY}`, position: 'relative', background: '#000' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
                          <button type="button" onClick={cerrarCamara}
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                          <button type="button" onClick={tomarFoto} disabled={convirtiendo}
                            style={{ background: '#fff', color: '#111', border: 'none', padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            {convirtiendo ? '⏳ Procesando...' : '📸 Tomar foto'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      galeria.length > 0 ? (
                        <div
                          onDragOver={e => { e.preventDefault(); setExtraDragging(true) }}
                          onDragLeave={() => setExtraDragging(false)}
                          onDrop={onGaleriaDrop}
                          style={{ border: `2px dashed ${extraDragging ? PINK : '#d1d5db'}`, borderRadius: 12, background: extraDragging ? `${PINK}08` : '#fafafa', transition: 'border-color .15s, background .15s', overflow: 'hidden' }}>
                          <div className="prov-img-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 12 }}>
                            {galeria.map((img, i) => (
                              <div key={i}
                                draggable
                                onDragStart={() => onImgDragStart(i)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => onImgDrop(i)}
                                style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', position: 'relative', boxShadow: i === 0 ? `0 0 0 2px ${PINK}` : '0 1px 4px rgba(0,0,0,0.12)', cursor: 'grab', background: '#fff' }}>
                                <img src={img.preview!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                                {i === 0 && (
                                  <span style={{ position: 'absolute', top: 5, left: 5, background: PINK, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>★ Principal</span>
                                )}
                                <button type="button" onClick={() => removeImagenAt(i)}
                                  style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>×</button>
                                {i !== 0 && (
                                  <button type="button" onClick={() => usarComoPrincipal(i)}
                                    title="Usar como imagen principal"
                                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', height: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>★ Hacer principal</button>
                                )}
                              </div>
                            ))}

                            {/* Recuadro de instrucción: siempre visible junto a las imágenes ya cargadas */}
                            <div onClick={() => extraFileRef.current?.click()}
                              style={{ aspectRatio: '1', borderRadius: 10, border: `2px dashed ${BLUE}`, background: `${BLUE}0d`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', padding: 6, transition: 'background .15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${BLUE}1a` }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${BLUE}0d` }}>
                              {convirtiendo ? (
                                <span style={{ fontSize: 18 }}>⏳</span>
                              ) : (
                                <>
                                  <span style={{ fontSize: 22, fontWeight: 900, color: BLUE, lineHeight: 1 }}>+</span>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: BLUE, lineHeight: 1.3 }}>Agregar más imágenes</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={e => { e.preventDefault(); setExtraDragging(true) }}
                          onDragLeave={() => setExtraDragging(false)}
                          onDrop={onGaleriaDrop}
                          onClick={() => extraFileRef.current?.click()}
                          style={{ border: `2px dashed ${extraDragging ? PINK : '#d1d5db'}`, borderRadius: 12, background: extraDragging ? `${PINK}08` : '#fafafa', transition: 'border-color .15s, background .15s', cursor: 'pointer', padding: '30px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          {convirtiendo ? (
                            <><span style={{ fontSize: 26 }}>⏳</span><p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 600 }}>Convirtiendo a WebP...</p></>
                          ) : (
                            <>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🖼️</div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151' }}>Arrastra imágenes aquí o toca para subir</p>
                              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>PNG, JPG, WEBP · Se convierten a WebP · Puedes elegir varias a la vez</p>
                            </>
                          )}
                        </div>
                      )
                    )}
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
                    <input ref={extraFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onGaleriaFileChange} />
                  </ProvCard>

                  {/* Información básica */}
                  <ProvCard icon="📦" title="Información básica">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="prov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Nombre del producto <span style={{ color: PINK }}>*</span></label>
                          <input style={inputStyle} value={prod.nombre} onChange={e => setPR('nombre', e.target.value)}
                            placeholder="Ej: Teclado mecánico TKL RGB" onFocus={focus} onBlur={blur} />
                        </div>
                        <div>
                          <label style={labelStyle}>
                            SKU / Código <span style={{ color: PINK }}>*</span>
                            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Único</span>
                          </label>
                          <input style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                            value={prod.sku} onChange={e => setPR('sku', e.target.value.toUpperCase())}
                            placeholder="TEC-001" onFocus={focus} onBlur={blur} />
                        </div>
                      </div>

                      <CategoriaSelector
                        arbol={arbolCategorias}
                        value={prod.categoria_id}
                        onChange={id => setPR('categoria_id', id)}
                        permitirCrear={false}
                        onCrear={async (nombre, parentId) => {
                          const nueva = await crearCategoriaConPadre(supabase, nombre, parentId)
                          const { data } = await supabase.from('categorias').select('id, nombre, parent_id, activo, campos_extra').order('nombre')
                          if (data) setCategorias(data)
                          return nueva
                        }}
                      />
                    </div>
                  </ProvCard>

                  {/* Precio e inventario */}
                  <ProvCard icon="💲" title="Precio e inventario">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="prov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Precio (MXN) <span style={{ color: PINK }}>*</span></label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', fontWeight: 700, pointerEvents: 'none' }}>$</span>
                            <input type="number" min="0" step="0.01" style={{ ...inputStyle, paddingLeft: 26 }}
                              value={prod.precio} onChange={e => setPR('precio', e.target.value)}
                              placeholder="0.00" onFocus={focus} onBlur={blur} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Stock disponible <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Unidades</span></label>
                          <input type="number" min="0" style={inputStyle} value={prod.stock}
                            onChange={e => setPR('stock', e.target.value)}
                            placeholder="0" onFocus={focus} onBlur={blur} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>
                          Precio de promoción (MXN)
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>Opcional, debe ser menor al precio regular</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', fontWeight: 700, pointerEvents: 'none' }}>$</span>
                          <input type="number" min="0" step="0.01" style={{ ...inputStyle, paddingLeft: 26 }}
                            value={prod.precioPromocion} onChange={e => setPR('precioPromocion', e.target.value)}
                            placeholder="Sin promoción" onFocus={focus} onBlur={blur} />
                        </div>
                        {prod.precioPromocion && prod.precio && Number(prod.precioPromocion) >= Number(prod.precio) && (
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: PINK, fontWeight: 600 }}>El precio de promoción debe ser menor al precio regular.</p>
                        )}
                      </div>
                    </div>
                  </ProvCard>

                  {/* Descripción */}
                  <ProvCard icon="📝" title="Descripción" hint="Opcional, pero ayuda a que el producto se venda mejor">
                    <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
                      value={prod.descripcion} onChange={e => setPR('descripcion', e.target.value)}
                      placeholder="Características, materiales, medidas, color..."
                      onFocus={focus} onBlur={blur} />
                  </ProvCard>

                  {camposContextualesPadre && (
                    mostrarPadreExtra ? (
                      <ProvCollapsible icon={camposContextualesPadre.icon}
                        title={camposContextualesPadre.titulo || `Detalles de ${catSeleccionada?.padreNombre}`}
                        hint={`De la categoría ${catSeleccionada?.padreNombre}`}
                        abierto={abiertoPadreExtra} onToggle={() => setAbiertoPadreExtra(v => !v)}
                        badges={(() => {
                          const total = prod.tallas.length + camposContextualesPadre.grupos.reduce((acc, g) => acc + (prod.camposExtra[g.label]?.length ?? 0), 0)
                          return total > 0 ? [`${total} detalle${total > 1 ? 's' : ''}`] : []
                        })()}>
                        <ProvContextualFieldsBody config={camposContextualesPadre}
                          tallasSeleccionadas={prod.tallas} onAddTalla={addTalla} onRemoveTalla={removeTalla}
                          camposExtra={prod.camposExtra} onToggleExtra={toggleContextual} />
                      </ProvCollapsible>
                    ) : (
                      <button type="button" onClick={() => setMostrarPadreExtra(true)}
                        style={{ background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {camposContextualesPadre.icon} Agregar {(camposContextualesPadre.titulo || `detalles de ${catSeleccionada?.padreNombre}`).toLowerCase()}
                      </button>
                    )
                  )}

                  {camposContextuales && (
                    <ProvCollapsible icon={camposContextuales.icon} title={camposContextuales.titulo} hint={camposContextuales.hint}
                      abierto={abiertoContextual} onToggle={() => setAbiertoContextual(v => !v)}
                      badges={(() => {
                        const total = prod.tallas.length + camposContextuales.grupos.reduce((acc, g) => acc + (prod.camposExtra[g.label]?.length ?? 0), 0)
                        return total > 0 ? [`${total} detalle${total > 1 ? 's' : ''}`] : []
                      })()}>
                      <ProvContextualFieldsBody config={camposContextuales}
                        tallasSeleccionadas={prod.tallas} onAddTalla={addTalla} onRemoveTalla={removeTalla}
                        camposExtra={prod.camposExtra} onToggleExtra={toggleContextual} />
                    </ProvCollapsible>
                  )}

                  {/* Variantes */}
                  {!mostrarVariantes ? (
                    <button type="button" onClick={() => setMostrarVariantes(true)}
                      style={{ background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🎨 Agregar variantes
                    </button>
                  ) : (
                  <ProvCollapsible icon="🎨" title="Variantes" hint="Colores y stock por combinación"
                    abierto={abiertoVariantes} onToggle={() => setAbiertoVariantes(v => !v)}
                    badges={[
                      prod.colores.length > 0 ? `${prod.colores.length} color${prod.colores.length > 1 ? 'es' : ''}` : null,
                      prod.tallas.length > 0 ? `${prod.tallas.length} talla${prod.tallas.length > 1 ? 's' : ''}` : null,
                    ].filter(Boolean) as string[]}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Colores */}
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Colores</p>
                        {!mostrarColores && prod.colores.length === 0 ? (
                          <button type="button" onClick={() => setMostrarColores(true)}
                            style={{ background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            🎨 Agregar colores
                          </button>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                              {PALETA_COLORES.map(({ nombre, hex }) => {
                                const activo = prod.colores.includes(nombre)
                                return (
                                  <button key={nombre} type="button" title={nombre}
                                    onClick={() => activo ? removeColor(nombre) : addColor(nombre)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 6px', borderRadius: 20, border: `2px solid ${activo ? '#111' : 'transparent'}`, background: activo ? '#f3f4f6' : '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                                    {nombre}
                                    {activo && <span style={{ color: '#059669', fontSize: 11 }}>✓</span>}
                                  </button>
                                )
                              })}
                            </div>
                            {prod.colores.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: '8px 10px', background: `${NAVY}06`, borderRadius: 8 }}>
                                {prod.colores.map(c => {
                                  const hex = PALETA_COLORES.find(p => p.nombre === c)?.hex
                                  return (
                                    <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: `1px solid ${NAVY}30`, color: NAVY, fontSize: 12, fontWeight: 700, padding: '3px 8px 3px 6px', borderRadius: 20 }}>
                                      {hex && <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)' }} />}
                                      {c}
                                      <button type="button" onClick={() => removeColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input style={{ ...inputStyle, flex: 1, fontSize: 13 }} value={colorInput}
                                onChange={e => setColorInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(colorInput) } }}
                                placeholder="Color personalizado — Enter para agregar" onFocus={focus} onBlur={blur} />
                              <button type="button" onClick={() => addColor(colorInput)}
                                style={{ background: NAVY, color: '#fff', border: 'none', padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+</button>
                            </div>
                          </>
                        )}
                      </div>


                      {/* Stock por variante */}
                      {prod.variantes.length > 0 && (
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock por variante</p>
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', background: '#f9fafb', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Variante</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Stock</span>
                            </div>
                            {prod.variantes.map((v, i) => (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 14px', borderBottom: i < prod.variantes.length - 1 ? '1px solid #f3f4f6' : 'none', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  {v.color && (() => { const hex = PALETA_COLORES.find(p => p.nombre === v.color)?.hex; return hex ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} /> : null })()}
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{[v.color, v.talla].filter(Boolean).join(' · ')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button type="button" onClick={() => setVarianteStock(i, String(Math.max(0, Number(v.stock || 0) - 1)))}
                                    style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>−</button>
                                  <input type="number" min="0"
                                    style={{ width: 56, padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, textAlign: 'center' as const, outline: 'none', background: '#fff' }}
                                    value={v.stock} onChange={e => setVarianteStock(i, e.target.value)} onFocus={focus} onBlur={blur} />
                                  <button type="button" onClick={() => setVarianteStock(i, String(Number(v.stock || 0) + 1))}
                                    style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>+</button>
                                </div>
                              </div>
                            ))}
                            <div style={{ background: '#f9fafb', padding: '8px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{prod.variantes.length} variante{prod.variantes.length > 1 ? 's' : ''}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Total: {prod.variantes.reduce((t, v) => t + (Number(v.stock) || 0), 0)} uds</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ProvCollapsible>
                  )}

                  {/* Información de envío */}
                  <ProvCollapsible icon="🚚" title="Información de envío" hint="Peso y dimensiones — solo si ya los conoces"
                    abierto={abiertoEnvio} onToggle={() => setAbiertoEnvio(v => !v)}
                    badges={(prod.peso || prod.largo || prod.ancho || prod.alto) ? ['Configurado'] : []}>
                    <div className="prov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peso</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="number" min="0" step="0.01" style={{ ...inputStyle, flex: 1 }} value={pesoValor}
                            onChange={e => setPesoValor(e.target.value)} placeholder="Ej: 0.5" onFocus={focus} onBlur={blur} />
                          <select value={pesoUnidad} onChange={e => setPesoUnidad(e.target.value as UnidadPeso)}
                            style={{ ...inputStyle, width: 80, cursor: 'pointer' }}>
                            {UNIDADES_PESO.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>
                          {pesoValor ? `Se guarda como ${Math.round(Number(pesoValor) * FACTOR_A_GRAMOS[pesoUnidad])} g` : 'Ej: 0.5 kg, 500 g, 2 L, 750 ml'}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dimensiones del paquete (cm)</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          {([['largo', 'Largo (cm)', '25'], ['ancho', 'Ancho (cm)', '18'], ['alto', 'Alto (cm)', '10']] as const).map(([dim, label, ejemplo]) => (
                            <div key={dim}>
                              <input type="number" min="0" style={{ ...inputStyle, textAlign: 'center' }}
                                value={prod[dim]} onChange={e => setProd(p => ({ ...p, [dim]: e.target.value }))}
                                placeholder={`Ej: ${ejemplo}`} onFocus={focus} onBlur={blur} />
                              <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ProvCollapsible>

                </div>

                {/* ==== Panel lateral: vista previa en vivo ==== */}
                <div className="prov-registro-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 72 }}>

                  <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
                    <div style={{ aspectRatio: '1', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {galeria[0]?.preview
                        ? <img src={galeria[0].preview!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 34 }}>📦</span>}
                    </div>
                    <div style={{ padding: 14 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nombre || 'Nombre del producto'}</p>
                      {prod.sku && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{prod.sku}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: PINK }}>
                          {prod.precio ? `$${Number(prod.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                        </span>
                        {prod.categoria_id && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: `${NAVY}10`, color: NAVY, padding: '3px 8px', borderRadius: 20, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {catNombre(prod.categoria_id)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                        <span>📦 Stock: {prod.stock || 0}</span>
                        <span>🖼️ {galeria.length} foto{galeria.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progreso */}
                  <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#374151' }}>Formulario completado</p>
                      <span style={{ fontSize: 12, fontWeight: 900, color: listoParaAgregar ? '#059669' : PINK }}>{pctCompletado}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${pctCompletado}%`, background: listoParaAgregar ? '#059669' : PINK, borderRadius: 3, transition: 'width 0.25s ease' }} />
                    </div>
                    {pendientes.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {pendientes.map(c => (
                          <p key={c.label} style={{ margin: 0, fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
                            {c.label}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: '#059669', fontWeight: 700 }}>✓ Todo listo</p>
                    )}
                  </div>

                  {/* Consejos rápidos */}
                  <div style={{ background: `${NAVY}05`, border: `1px solid ${NAVY}12`, borderRadius: 16, padding: 16 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: NAVY }}>💡 Consejo rápido</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
                      {galeria.length === 0
                        ? 'Los productos con fotos reales se aprueban y venden más rápido.'
                        : !prod.descripcion.trim()
                          ? 'Agrega una descripción con materiales y medidas — ayuda a que el comprador confíe más.'
                          : !prod.stock
                            ? 'No olvides indicar el stock disponible para evitar ventas sin inventario.'
                            : 'Tu producto se ve bien. Revisa los datos y agrégalo a la lista.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de acciones (sticky) */}
              <div style={{ position: 'sticky', bottom: 12, marginTop: 16, background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 8px 24px rgba(16,24,40,0.10)', flexWrap: 'wrap' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  {productos.length > 0 ? `Ya tienes ${productos.length} producto${productos.length > 1 ? 's' : ''} en la lista` : 'Agrega todos los productos que quieras enviar'}
                  <span style={{ display: 'block', fontSize: 10, color: '#c1c5cd', marginTop: 2 }}>💾 Tu borrador se guarda automáticamente en este navegador</span>
                </p>
                <button type="button" onClick={agregarProducto}
                  disabled={!listoParaAgregar}
                  style={{
                    background: !listoParaAgregar ? '#f3f4f6' : PINK,
                    color: !listoParaAgregar ? '#9ca3af' : '#fff',
                    border: 'none', padding: '12px 26px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                    cursor: !listoParaAgregar ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                    boxShadow: !listoParaAgregar ? 'none' : `0 4px 12px ${PINK}40`,
                    flexShrink: 0,
                  }}>
                  ＋ Agregar a la lista
                </button>
              </div>
            </div>
              )
            })()}

            {/* ---- Aviso legal ---- */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                <strong>Nota:</strong> Al enviar este formulario confirmas que eres el titular o representante autorizado del producto y que la información es verídica. Order Express revisará y validará cada solicitud antes de su publicación.
              </p>
            </div>

            {/* Borrador guardado */}
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
              💾 Tu borrador se guarda automáticamente en este navegador
            </p>

            {/* ---- Botón de envío ---- */}
            <button type="submit" disabled={formState === 'loading'}
              style={{ width: '100%', background: formState === 'loading' ? '#9ca3af' : PINK, color: '#fff', border: 'none', padding: '15px 0', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: formState === 'loading' ? 'default' : 'pointer', letterSpacing: '0.01em', boxShadow: formState === 'loading' ? 'none' : `0 4px 16px ${PINK}50` }}>
              {formState === 'loading'
                ? 'Enviando solicitud...'
                : productos.length > 0
                  ? `Enviar solicitud (${productos.length + (prod.nombre ? 1 : 0)} producto${productos.length + (prod.nombre ? 1 : 0) > 1 ? 's' : ''}) →`
                  : 'Enviar solicitud de producto →'}
            </button>
          </form>
        ) : null}

        {/* ---- Tab: Mis productos ---- */}
        {tab === 'misEnviados' && (() => {
          const estadoMap: Record<string, { bg: string; text: string; label: string }> = {
            pendiente: { bg: '#fef3c7', text: '#92400e', label: '⏳ Pendiente' },
            aprobado:  { bg: '#d1fae5', text: '#065f46', label: '✅ Aprobado' },
            rechazado: { bg: '#fee2e2', text: '#991b1b', label: '❌ Rechazado' },
          }
          return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {misProductos.length > 0 && (
                  <button type="button" onClick={() => { setBuscarActualizar(''); setPickerActualizarAbierto(true) }}
                    style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    🔄 Solicitar actualización
                  </button>
                )}
                <button type="button" onClick={() => setMostrarSolicitudCategoria(true)}
                  style={{ background: '#fdf2f6', color: PINK, border: 'none', padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  🏷️ Solicitar categoría
                </button>
              </div>
              {misProductos.length > 0 && (
                <div style={{ display: 'flex', gap: 4, background: '#f1f2f6', padding: 4, borderRadius: 10 }}>
                  {(['grid', 'list'] as const).map(v => (
                    <button key={v} onClick={() => setMisProductosVista(v)} style={{
                      padding: '7px 12px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
                      background: misProductosVista === v ? '#fff' : 'transparent',
                      color: misProductosVista === v ? NAVY : '#9aa0b4', border: 'none',
                      boxShadow: misProductosVista === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>{v === 'grid' ? '⊞' : '☰'}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>

            {loadingMisProductos ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cargando...</p>
              </div>
            ) : misProductos.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 40, margin: '0 0 12px' }}>⏳</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Aún no tienes productos aprobados</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cuando el equipo apruebe tus solicitudes, aparecerán aquí.</p>
              </div>
            ) : misProductosVista === 'grid' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: 24 }}>
                  {misProductos.map(item => {
                    const st = estadoMap[item.estado] ?? estadoMap.pendiente
                    return (
                      <div key={item.id} onClick={() => verDetalleProducto(item)}
                        style={{ border: '1px solid #f3f4f6', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ height: 120, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt={item.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 28 }}>📦</span>}
                        </div>
                        <div style={{ padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{item.producto_nombre}</p>
                          </div>
                          <span style={{ display: 'inline-flex', background: st.bg, color: st.text, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', marginBottom: 6 }}>
                            {st.label}
                          </span>
                          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>${Number(item.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '12px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{misProductos.length} producto{misProductos.length !== 1 ? 's' : ''} encontrado{misProductos.length !== 1 ? 's' : ''}</span>
                  <button type="button" onClick={() => { if (savedEmail) cargarMisProductos(savedEmail) }}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Actualizar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {misProductos.map((item, i) => {
                    const st = estadoMap[item.estado] ?? estadoMap.pendiente
                    return (
                      <div key={item.id} onClick={() => verDetalleProducto(item)} style={{
                        display: 'grid', gridTemplateColumns: '56px 1fr auto',
                        gap: 16, alignItems: 'center', padding: '14px 28px',
                        borderBottom: i < misProductos.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        cursor: 'pointer',
                      }}>
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #e5e7eb', flexShrink: 0 }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt={item.producto_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '📦'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto_nombre}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</span>
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>
                              ${Number(item.producto_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <span style={{ display: 'inline-flex', background: st.bg, color: st.text, fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '12px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{misProductos.length} producto{misProductos.length !== 1 ? 's' : ''} encontrado{misProductos.length !== 1 ? 's' : ''}</span>
                  <button type="button" onClick={() => { if (savedEmail) cargarMisProductos(savedEmail) }}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Actualizar
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
          )
        })()}

        {/* Picker: elegir cuál producto publicado se quiere actualizar */}
        {pickerActualizarAbierto && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
            onClick={e => e.target === e.currentTarget && setPickerActualizarAbierto(false)}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>¿Qué producto quieres actualizar?</h2>
                <button onClick={() => setPickerActualizarAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
              </div>
              <div style={{ padding: '14px 24px 0' }}>
                <input value={buscarActualizar} onChange={e => setBuscarActualizar(e.target.value)}
                  placeholder="Buscar por nombre o SKU..." style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
              </div>
              <div style={{ overflowY: 'auto', padding: '4px 12px 16px' }}>
                {misProductos
                  .filter(p => p.producto_nombre.toLowerCase().includes(buscarActualizar.toLowerCase()) || p.producto_sku.toLowerCase().includes(buscarActualizar.toLowerCase()))
                  .map(p => (
                    <button key={p.id} type="button" onClick={() => elegirProductoParaActualizar(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 10 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {p.imagen_url ? <img src={p.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto_nombre}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.producto_sku}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {cargandoProductoActualizar && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <p style={{ background: '#fff', padding: '14px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151' }}>Cargando producto...</p>
          </div>
        )}

        {productoAActualizar && (
          <SolicitudProductoModal
            titulo="Solicitar actualización"
            hint="Los cambios no se aplican de inmediato — quedan pendientes hasta que el admin los apruebe."
            inicial={{
              nombre: productoAActualizar.nombre, sku: productoAActualizar.sku,
              precio: productoAActualizar.precio, stock: productoAActualizar.stock,
              descripcion: productoAActualizar.descripcion,
              imagenFile: null, imagenPreview: productoAActualizar.imagen_url,
            }}
            onClose={() => setProductoAActualizar(null)}
            onGuardar={guardarSolicitudActualizacion}
            onSuccess={() => {
              setProductoAActualizar(null)
              if (savedEmail) cargarHistorial(savedEmail)
              setTab('historial')
            }}
          />
        )}

        {mostrarSolicitudCategoria && (
          <SolicitudCategoriaModal
            arbol={arbolCategorias}
            onClose={() => setMostrarSolicitudCategoria(false)}
            onEnviar={enviarSolicitudCategoria}
          />
        )}

        {cargandoDetalle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <p style={{ background: '#fff', padding: '14px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151' }}>Cargando producto...</p>
          </div>
        )}

        {productoDetalle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
            onClick={e => e.target === e.currentTarget && setProductoDetalle(null)}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Detalle del producto</h2>
                <button onClick={() => setProductoDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
              </div>

              <div style={{ width: '100%', height: 220, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {productoDetalle.imagen_url
                  ? <img src={productoDetalle.imagen_url} alt={productoDetalle.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 40 }}>📦</span>}
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>{productoDetalle.nombre}</h3>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                      background: productoDetalle.estado === 'aprobado' ? '#d1fae5' : productoDetalle.estado === 'rechazado' ? '#fee2e2' : '#fef3c7',
                      color: productoDetalle.estado === 'aprobado' ? '#065f46' : productoDetalle.estado === 'rechazado' ? '#991b1b' : '#92400e',
                    }}>
                      {productoDetalle.estado === 'aprobado' ? '✅ Aprobado' : productoDetalle.estado === 'rechazado' ? '❌ Rechazado' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', margin: 0 }}>{productoDetalle.sku}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Precio</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#059669' }}>${productoDetalle.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Stock</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#374151' }}>{productoDetalle.stock} uds</p>
                  </div>
                </div>

                {productoDetalle.categoria_id && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</p>
                    <span style={{ fontSize: 12, fontWeight: 700, background: `${NAVY}10`, color: NAVY, padding: '4px 12px', borderRadius: 20 }}>
                      {catNombre(String(productoDetalle.categoria_id))}
                    </span>
                  </div>
                )}

                {productoDetalle.descripcion && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{productoDetalle.descripcion}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                  <button type="button" onClick={() => setProductoDetalle(null)}
                    style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                  <button type="button" onClick={() => {
                    setProductoAActualizar({
                      id: productoDetalle.id, nombre: productoDetalle.nombre, sku: productoDetalle.sku,
                      precio: String(productoDetalle.precio), stock: String(productoDetalle.stock),
                      descripcion: productoDetalle.descripcion ?? '', imagen_url: productoDetalle.imagen_url, categoria_id: productoDetalle.categoria_id,
                    })
                    setProductoDetalle(null)
                  }}
                    style={{ flex: 1, background: '#eff6ff', color: '#0049ff', border: 'none', padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    🔄 Solicitar actualización
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Tab: Seguimiento y pagos (Dashboard del proveedor) ---- */}
        {tab === 'seguimiento' && (() => {
          // "Ya pagado" = llegó a Pagado o más adelante (Enviado/Entregado siguen siendo
          // ventas ya cobradas). Antes un pedido Entregado quedaba mal contado como
          // "en proceso" — mismo tipo de bug que se encontró hoy en el dashboard admin.
          const ESTADOS_PAGADOS = ['Pagado', 'Enviado', 'Entregado']
          const pagado = seguimiento.filter(f => ESTADOS_PAGADOS.includes(f.ventaEstado))
          const enProceso = seguimiento.filter(f => !ESTADOS_PAGADOS.includes(f.ventaEstado) && f.ventaEstado !== 'Cancelado')
          const totalAPagar = pagado.reduce((t, f) => t + (f.costo ?? 0) * f.cantidad, 0)
          const totalEnProceso = enProceso.reduce((t, f) => t + (f.costo ?? 0) * f.cantidad, 0)
          const piezasVendidas = seguimiento.reduce((t, f) => t + f.cantidad, 0)
          const pedidosActivos = new Set(seguimiento.filter(f => f.ventaEstado !== 'Cancelado' && f.ventaEstado !== 'Entregado').map(f => f.ventaNumero)).size
          const productosPublicados = misProductos.length
          const productosPendientes = (historialItems ?? []).filter(h => h.estado === 'pendiente').length
          const productosRechazados = (historialItems ?? []).filter(h => h.estado === 'rechazado').length

          const estadoVentaStyle: Record<string, { bg: string; text: string }> = {
            'Pendiente': { bg: '#fef3c7', text: '#92400e' },
            'En proceso': { bg: '#dbeafe', text: '#1e40af' },
            'Pagado': { bg: '#d1fae5', text: '#065f46' },
            'Enviado': { bg: '#e0e7ff', text: '#3730a3' },
            'Entregado': { bg: '#dcfce7', text: '#166534' },
            'Cancelado': { bg: '#fee2e2', text: '#991b1b' },
          }
          const estadoEnvioStyle: Record<string, { bg: string; text: string }> = {
            'Pendiente': { bg: '#fef3c7', text: '#92400e' },
            'En tránsito': { bg: '#dbeafe', text: '#1e40af' },
            'Entregado': { bg: '#d1fae5', text: '#065f46' },
            'Cancelado': { bg: '#fee2e2', text: '#991b1b' },
          }
          const badge = (label: string, map: Record<string, { bg: string; text: string }>) => {
            const s = map[label] ?? { bg: '#f3f4f6', text: '#374151' }
            return <span style={{ background: s.bg, color: s.text, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{label}</span>
          }

          return (
            <div>
              {/* Alertas */}
              {(productosPendientes > 0 || productosRechazados > 0) && (
                <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>⚠️ Alertas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {productosPendientes > 0 && (
                      <button type="button" onClick={() => setTab('historial')}
                        style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#92400e', backgroundColor: '#fef3c7' }}>
                        {productosPendientes} producto{productosPendientes !== 1 ? 's' : ''} en revisión →
                      </button>
                    )}
                    {productosRechazados > 0 && (
                      <button type="button" onClick={() => setTab('historial')}
                        style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2' }}>
                        {productosRechazados} producto{productosRechazados !== 1 ? 's' : ''} rechazado{productosRechazados !== 1 ? 's' : ''} →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Panel principal */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Publicados</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: NAVY, margin: 0 }}>{productosPublicados}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Pendientes</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#d97706', margin: 0 }}>{productosPendientes}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Rechazados</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', margin: 0 }}>{productosRechazados}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Inventario</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: NAVY, margin: 0 }}>{inventarioTotal ?? '—'}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Pedidos activos</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#0049ff', margin: 0 }}>{pedidosActivos}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Piezas vendidas</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: NAVY, margin: 0 }}>{piezasVendidas}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Por pagar</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#92400e', margin: 0 }}>${totalEnProceso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Ya pagado</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#059669', margin: 0 }}>${totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '-10px 0 20px' }}>
                Los montos se calculan sobre el costo registrado de cada producto × cantidad vendida. Es informativo — el pago real se coordina con el equipo de Order Express.
              </p>

              {/* Listado */}
              <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                {loadingSeguimiento ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cargando...</p>
                  </div>
                ) : seguimiento.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ fontSize: 40, margin: '0 0 12px' }}>🚚</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Todavía no se ha vendido ningún producto tuyo</p>
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>En cuanto se venda uno, vas a poder seguir aquí el envío y el pago.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {seguimiento.map((f, i) => {
                      const tracking = f.numeroGuia && f.paqueteria && TRACKING_URL_PROV[f.paqueteria]
                      const tienePaquete = f.altoCm != null || f.anchoCm != null || f.pesoKg != null
                      const editandoPaquete = paqueteAbierto === f.itemId
                      return (
                        <div key={f.itemId} style={{
                          borderBottom: i < seguimiento.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: i % 2 === 0 ? '#fff' : '#fafafa', padding: '16px 28px',
                        }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'center',
                        }}>
                          <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #e5e7eb', flexShrink: 0 }}>
                            {f.productoImagen ? <img src={f.productoImagen} alt={f.productoNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.productoNombre} <span style={{ fontWeight: 600, color: '#9ca3af' }}>×{f.cantidad}</span>
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: '#9ca3af' }}>
                              <span style={{ fontFamily: 'monospace' }}>{f.productoSku}</span>
                              <span>·</span>
                              <span>Pedido #{f.ventaNumero}</span>
                              <span>·</span>
                              <span>Vendido el {new Date(f.ventaFecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              {badge(f.ventaEstado, estadoVentaStyle)}
                              {f.estadoEnvio && badge(f.estadoEnvio, estadoEnvioStyle)}
                              {f.paqueteria && (
                                <span style={{ fontSize: 11, color: '#6b7280' }}>
                                  {f.paqueteria}{f.numeroGuia ? ` · Guía ${f.numeroGuia}` : ''}
                                </span>
                              )}
                              {tracking && (
                                <a href={TRACKING_URL_PROV[f.paqueteria!](f.numeroGuia!)} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 11, fontWeight: 700, color: '#0049ff', textDecoration: 'none' }}>
                                  Rastrear ↗
                                </a>
                              )}
                              {f.fechaEnvio && (
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>Salió: {new Date(f.fechaEnvio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                              )}
                              {f.fechaEntrega && (
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>Entregado: {new Date(f.fechaEntrega).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#059669', whiteSpace: 'nowrap' }}>
                            ${((f.costo ?? 0) * f.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Medidas del paquete */}
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                          {!editandoPaquete ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              {tienePaquete ? (
                                <span style={{ fontSize: 12, color: '#374151' }}>
                                  📐 {f.altoCm ?? '—'}×{f.anchoCm ?? '—'} cm · ⚖️ {f.pesoKg ?? '—'} kg
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>⚠️ Falta registrar el tamaño del paquete</span>
                              )}
                              <button type="button" onClick={() => abrirPaquete(f)}
                                style={{ fontSize: 11, fontWeight: 700, color: '#0049ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                {tienePaquete ? 'Editar' : 'Registrar paquete'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <label style={{ fontSize: 11, color: '#6b7280' }}>
                                Alto (cm)
                                <input type="number" min="0" step="0.1" value={paqueteForm.alto}
                                  onChange={e => setPaqueteForm(p => ({ ...p, alto: e.target.value }))}
                                  style={{ display: 'block', width: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, marginTop: 2 }} />
                              </label>
                              <label style={{ fontSize: 11, color: '#6b7280' }}>
                                Ancho (cm)
                                <input type="number" min="0" step="0.1" value={paqueteForm.ancho}
                                  onChange={e => setPaqueteForm(p => ({ ...p, ancho: e.target.value }))}
                                  style={{ display: 'block', width: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, marginTop: 2 }} />
                              </label>
                              <label style={{ fontSize: 11, color: '#6b7280' }}>
                                Peso (kg)
                                <input type="number" min="0" step="0.1" value={paqueteForm.peso}
                                  onChange={e => setPaqueteForm(p => ({ ...p, peso: e.target.value }))}
                                  style={{ display: 'block', width: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, marginTop: 2 }} />
                              </label>
                              <button type="button" onClick={() => guardarPaqueteItem(f.itemId)} disabled={guardandoPaquete}
                                style={{ alignSelf: 'flex-end', background: NAVY, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: guardandoPaquete ? 'wait' : 'pointer' }}>
                                {guardandoPaquete ? '...' : 'Guardar'}
                              </button>
                              <button type="button" onClick={() => setPaqueteAbierto(null)}
                                style={{ alignSelf: 'flex-end', background: '#f3f4f6', color: '#374151', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ---- Tab: Mensajes ---- */}
        {tab === 'mensajes' && user && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', overflow: 'hidden' }}>
              {cargandoConv ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Cargando conversaciones...</p>
              ) : conversaciones.length === 0 ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Todavía no tienes conversaciones. Cuando un cliente te escriba sobre uno de tus productos, aparecerá aquí.</p>
              ) : (
                conversaciones.map(c => {
                  const activa = conversacionActiva === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => setConversacionActiva(c.id)}
                      style={{ width: '100%', display: 'block', padding: '12px 18px', background: activa ? '#f1f5ff' : 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.producto_nombre || 'Producto'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 Cliente interesado</p>
                    </button>
                  )
                })
              )}
            </div>

            {conversacionActiva ? (() => {
              const c = conversaciones.find(x => x.id === conversacionActiva)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c && (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>Cliente</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>· pregunta por</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.producto_nombre || 'Producto'}</span>
                    </div>
                  )}
                  <ChatPanel supabase={supabase} conversacionId={conversacionActiva} remitenteTipo="proveedor" remitenteEmail={user.email} remitenteNombre={user.nombre} accent={NAVY} />
                </div>
              )
            })() : (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Selecciona una conversación para verla.
              </div>
            )}
          </div>
        )}

        {/* ---- Tab: Transferencias ---- */}
        {tab === 'transferencias' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
            {toastTransferencia && (
              <div style={{ background: toastTransferencia.color, color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                {toastTransferencia.msg}
              </div>
            )}
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Productos que el administrador quiere transferir a tu cuenta. Acéptalos para que pasen a tu catálogo, o recházalos si no te corresponden.
            </p>
            {cargandoTransferencias ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando...</p>
            ) : transferencias.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13, boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>
                No tienes transferencias pendientes.
              </div>
            ) : (
              transferencias.map(t => (
                <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 16px rgba(37,40,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>{t.producto_nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>SKU: {t.producto_sku} · {new Date(t.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => responderTransferencia(t, true)} disabled={respondiendo === t.id}
                      style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: respondiendo === t.id ? 'wait' : 'pointer' }}>
                      {respondiendo === t.id ? '...' : '✓ Aceptar'}
                    </button>
                    <button onClick={() => responderTransferencia(t, false)} disabled={respondiendo === t.id}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: respondiendo === t.id ? 'wait' : 'pointer' }}>
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---- Tab: Ajustes ---- */}
        {tab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Editar perfil (cuenta real de sesión) */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, background: `${NAVY}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>Editar perfil</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Foto, nombre y contraseña de tu cuenta</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
                {cuentaAvatarPreview
                  ? <img src={cuentaAvatarPreview} alt={cuentaNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (cuentaNombre.charAt(0).toUpperCase() || '?')}
              </div>
              <div>
                <input ref={cuentaAvatarInputRef} type="file" accept="image/*" hidden
                  onChange={e => elegirCuentaAvatar(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => cuentaAvatarInputRef.current?.click()}
                  style={{ background: '#eff6ff', color: '#0049ff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Cambiar foto
                </button>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>JPG o PNG</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input style={inputStyle} value={cuentaNombre} onChange={e => setCuentaNombre(e.target.value)} placeholder="Tu nombre" onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={{ ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} value={user?.email ?? ''} disabled readOnly />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <input type="password" style={inputStyle} value={cuentaPasswordNueva} onChange={e => setCuentaPasswordNueva(e.target.value)} placeholder="Dejar en blanco para no cambiarla" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar</label>
                  <input type="password" style={inputStyle} value={cuentaPasswordConfirmar} onChange={e => setCuentaPasswordConfirmar(e.target.value)} placeholder="••••••••" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            {cuentaError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 16 }}>
                {cuentaError}
              </div>
            )}

            <button type="button" onClick={guardarCuenta} disabled={guardandoCuenta}
              style={{ marginTop: 20, background: cuentaGuardada ? '#059669' : NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {guardandoCuenta ? 'Guardando...' : cuentaGuardada ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>

          {/* Perfil comercial (público) */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: `${NAVY}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>Perfil comercial</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Descripción, redes sociales y métodos de envío</p>
                </div>
              </div>
              {(() => {
                const estadoInfo: Record<string, { label: string; bg: string; color: string }> = {
                  activo: { label: '✓ Activo', bg: '#d1fae5', color: '#065f46' },
                  suspendido: { label: '⛔ Suspendido', bg: '#fee2e2', color: '#991b1b' },
                  pendiente: { label: '⏳ Pendiente', bg: '#fef3c7', color: '#92400e' },
                  en_revision: { label: '🔍 En revisión', bg: '#dbeafe', color: '#1e40af' },
                }
                const info = estadoInfo[estadoCuenta] ?? estadoInfo.activo
                return (
                  <span style={{ background: info.bg, color: info.color, fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {info.label}
                  </span>
                )
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Descripción de tu negocio</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  value={perfilComercial.descripcion}
                  onChange={e => setPerfilComercial(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Cuéntale a los clientes qué vendes y qué te hace diferente..."
                  onFocus={focus} onBlur={blur} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Instagram</label>
                  <input style={inputStyle} value={perfilComercial.instagram}
                    onChange={e => setPerfilComercial(p => ({ ...p, instagram: e.target.value }))}
                    placeholder="@tu_negocio" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Facebook</label>
                  <input style={inputStyle} value={perfilComercial.facebook}
                    onChange={e => setPerfilComercial(p => ({ ...p, facebook: e.target.value }))}
                    placeholder="facebook.com/tu_negocio" onFocus={focus} onBlur={blur} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input style={inputStyle} value={perfilComercial.whatsapp}
                  onChange={e => setPerfilComercial(p => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="55 1234 5678" onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Métodos de envío</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                  value={perfilComercial.metodosEnvio}
                  onChange={e => setPerfilComercial(p => ({ ...p, metodosEnvio: e.target.value }))}
                  placeholder="Ej: Envío nacional por DHL/Estafeta, entrega local en 24-48h..."
                  onFocus={focus} onBlur={blur} />
              </div>
            </div>

            {comercialError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 16 }}>
                {comercialError}
              </div>
            )}

            <button type="button" onClick={guardarPerfilComercial} disabled={guardandoComercial}
              style={{ marginTop: 20, background: comercialGuardado ? '#059669' : NAVY, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {guardandoComercial ? 'Guardando...' : comercialGuardado ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, background: `${NAVY}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>Datos del proveedor</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Se guardan en este navegador y se llenan automáticamente al registrar productos</p>
              </div>
            </div>

            {perfilGuardado && (
              <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#065f46', fontWeight: 600, marginBottom: 20 }}>
                ✓ Datos guardados correctamente
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: PINK }}>*</span></label>
                  <input style={inputStyle} value={perfil.nombre}
                    onChange={e => { setPerfil(p => ({ ...p, nombre: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="Tu nombre completo" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Empresa / Marca</label>
                  <input style={inputStyle} value={perfil.empresa}
                    onChange={e => { setPerfil(p => ({ ...p, empresa: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="Nombre de tu empresa (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Email de contacto <span style={{ color: PINK }}>*</span></label>
                  <input type="email" style={inputStyle} value={perfil.email}
                    onChange={e => { setPerfil(p => ({ ...p, email: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="proveedor@email.com" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" style={inputStyle} value={perfil.telefono}
                    onChange={e => { setPerfil(p => ({ ...p, telefono: e.target.value })); setPerfilGuardado(false) }}
                    placeholder="+52 55 0000 0000 (opcional)" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                disabled={!perfil.nombre.trim() || !perfil.email.trim()}
                onClick={() => {
                  try { localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil)) } catch {}
                  try { localStorage.setItem(EMAIL_KEY, perfil.email.trim().toLowerCase()) } catch {}
                  setSavedEmail(perfil.email.trim().toLowerCase())
                  setProveedor(perfil)
                  setPerfilGuardado(true)
                  setTimeout(() => setPerfilGuardado(false), 3000)
                }}
                style={{
                  flex: 1, background: (!perfil.nombre.trim() || !perfil.email.trim()) ? '#f3f4f6' : NAVY,
                  color: (!perfil.nombre.trim() || !perfil.email.trim()) ? '#9ca3af' : '#fff',
                  border: 'none', padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 15,
                  cursor: (!perfil.nombre.trim() || !perfil.email.trim()) ? 'not-allowed' : 'pointer',
                }}>
                Guardar datos
              </button>
              {perfil.nombre && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil({ nombre: '', empresa: '', email: '', telefono: '' })
                    try { localStorage.removeItem(PERFIL_KEY) } catch {}
                    try { localStorage.removeItem(EMAIL_KEY) } catch {}
                    setSavedEmail('')
                    setProveedor({ nombre: '', empresa: '', email: '', telefono: '' })
                    setPerfilGuardado(false)
                  }}
                  style={{ padding: '13px 20px', borderRadius: 12, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Limpiar
                </button>
              )}
            </div>

            <p style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 16 }}>
              💾 Los datos se almacenan solo en este navegador
            </p>
          </div>

          {/* Pausar/reactivar cuenta */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 2px 16px rgba(37,40,85,0.08)', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, background: user.pausadoPorTitular ? '#fef3c7' : `${NAVY}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {user.pausadoPorTitular ? '⏸️' : '🟢'}
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>Cuenta {user.pausadoPorTitular ? 'en pausa' : 'activa'}</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  {user.pausadoPorTitular
                    ? 'Tus productos, solicitudes y demás están ocultos mientras esté en pausa.'
                    : 'Pausa temporalmente tu cuenta si necesitas dejar de vender por un tiempo.'}
                </p>
              </div>
            </div>

            {user.pausadoPorTitular ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Mientras tu cuenta esté en pausa, tus productos no aparecen en la tienda ni en el catálogo del admin, y tus solicitudes pendientes quedan ocultas. Todo vuelve a aparecer tal como estaba en cuanto reactives.
                </p>
                <button type="button" onClick={reactivarCuenta} disabled={cambiandoPausa}
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: cambiandoPausa ? 'default' : 'pointer', opacity: cambiandoPausa ? 0.6 : 1 }}>
                  {cambiandoPausa ? 'Reactivando...' : '▶️ Reactivar mi cuenta'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={pausarCuenta} disabled={cambiandoPausa}
                style={{ background: '#fff', color: '#dc2626', border: '1.5px solid #fca5a5', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: cambiandoPausa ? 'default' : 'pointer', opacity: cambiandoPausa ? 0.6 : 1 }}>
                {cambiandoPausa ? 'Pausando...' : '⏸️ Pausar mi cuenta'}
              </button>
            )}
          </div>

          </div>
        )}

        {/* ---- Tab: Mis solicitudes ---- */}
        {tab === 'historial' && (
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(37,40,85,0.08)' }}>

          {/* Sin datos aún */}
          {!historialItems && !loadingHistorial && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Configura tu email en Ajustes para ver tus solicitudes</p>
            </div>
          )}

          {/* Cargando */}
          {loadingHistorial && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Cargando solicitudes...</p>
            </div>
          )}

          {/* Sin solicitudes todavía */}
          {historialItems && historialItems.length === 0 && !loadingHistorial && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>No hay productos</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Todavía no has enviado ninguna solicitud de producto.</p>
            </div>
          )}

          {/* Lista con resultados */}
          {historialItems && historialItems.length > 0 && (() => {
            const aprobados  = historialItems.filter(i => i.estado === 'aprobado')
            const pendientes = historialItems.filter(i => i.estado === 'pendiente')
            const rechazados = historialItems.filter(i => i.estado === 'rechazado')
            const estadoMap: Record<string, { bg: string; text: string; label: string; borderColor: string }> = {
              pendiente: { bg: '#fffbeb', text: '#92400e', label: '⏳ En revisión', borderColor: '#fde68a' },
              aprobado:  { bg: '#f0fdf4', text: '#065f46', label: '✅ Aprobado',    borderColor: '#86efac' },
              rechazado: { bg: '#fef2f2', text: '#991b1b', label: '❌ Rechazado',   borderColor: '#fca5a5' },
            }
            return (
              <>
                {/* Header con resumen */}
                <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Mis solicitudes</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{historialItems.length} producto{historialItems.length !== 1 ? 's' : ''} enviado{historialItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {aprobados.length > 0 && (
                      <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ✅ {aprobados.length} aprobado{aprobados.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {pendientes.length > 0 && (
                      <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ⏳ {pendientes.length} en revisión
                      </span>
                    )}
                    {rechazados.length > 0 && (
                      <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                        ❌ {rechazados.length} rechazado{rechazados.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filas de solicitudes */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historialItems.map((item, i) => {
                    const st = estadoMap[item.estado] ?? estadoMap.pendiente
                    return (
                      <div key={item.id} style={{
                        padding: '14px 28px',
                        borderBottom: i < historialItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        borderLeft: `3px solid ${st.borderColor}`,
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto_nombre}</p>
                              {item.tipo === 'actualizacion' && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#0049ff', background: '#eff6ff', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>🔄 Actualización</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{item.producto_sku}</span>
                              <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                {new Date(item.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {(item.estado === 'pendiente' || item.estado === 'rechazado') && (
                              <button type="button" onClick={() => setEditandoSolicitud(item)}
                                style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer' }}>
                                Editar
                              </button>
                            )}
                            <span style={{ display: 'inline-flex', background: st.bg, color: st.text, fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                        {item.estado === 'rechazado' && (
                          <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
                            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                              Motivo del rechazo: {item.motivo_rechazo || 'No se especificó un motivo.'}
                            </p>
                            <button type="button" onClick={() => reenviarARevision(item.id)} disabled={reenviandoId === item.id}
                              style={{ background: '#fff', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 6, cursor: reenviandoId === item.id ? 'default' : 'pointer', opacity: reenviandoId === item.id ? 0.6 : 1 }}>
                              {reenviandoId === item.id ? 'Reenviando…' : '↻ Reenviar a revisión'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => savedEmail && cargarHistorial(savedEmail)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Actualizar
                  </button>
                </div>
              </>
            )
          })()}
        </div>
        )}

        {editandoSolicitud && (
          <SolicitudProductoModal
            titulo="Editar solicitud"
            hint={editandoSolicitud.estado === 'rechazado'
              ? 'Corrige lo que haya marcado el admin — al guardar, se reenvía a revisión automáticamente.'
              : 'Todavía está pendiente de revisión — puedes corregir los datos antes de que el admin la vea.'}
            inicial={{
              nombre: editandoSolicitud.producto_nombre, sku: editandoSolicitud.producto_sku,
              precio: String(editandoSolicitud.producto_precio ?? ''), stock: String(editandoSolicitud.producto_stock ?? 0),
              descripcion: editandoSolicitud.producto_descripcion ?? '',
              imagenFile: null, imagenPreview: editandoSolicitud.imagen_url,
            }}
            onClose={() => setEditandoSolicitud(null)}
            onGuardar={guardarEdicionSolicitud}
            onSuccess={() => {
              setEditandoSolicitud(null)
              if (savedEmail) cargarHistorial(savedEmail)
            }}
          />
        )}
        </div>
        </main>
      </div>
    </div>
  )
}
