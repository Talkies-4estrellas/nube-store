'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import './storefront.css'
import {
  Home, ShoppingBag, Sparkles, Heart, BadgePercent, ShoppingCart, Headphones,
  Search, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Plus, SlidersHorizontal,
  Keyboard, Gamepad2, Speaker, Watch, Check, PackageCheck, ShieldCheck, Truck, Send,
  Grid2x2, SearchX, MessageCircle, LogIn, type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validation'
import { useAuth, ROLE_HOME } from '@/lib/auth-context'

type CheckoutState = 'form' | 'loading' | 'success' | 'error'

const ICONS: Record<string, LucideIcon> = {
  home: Home, 'shopping-bag': ShoppingBag, sparkles: Sparkles, heart: Heart,
  'badge-percent': BadgePercent, 'shopping-cart': ShoppingCart, headphones: Headphones,
  search: Search, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, plus: Plus,
  'sliders-horizontal': SlidersHorizontal, keyboard: Keyboard, 'gamepad-2': Gamepad2,
  speaker: Speaker, watch: Watch, check: Check, 'package-check': PackageCheck,
  'shield-check': ShieldCheck, truck: Truck, send: Send, 'grid-2x2': Grid2x2,
  'search-x': SearchX, 'message-circle': MessageCircle, 'log-in': LogIn,
}
function Ic({ n }: { n: string }) {
  const C = ICONS[n]
  return C ? <C /> : null
}

/* ---- Fallback images ---- */
const productImage = {
  keyboard: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=700&q=80',
  console: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=700&q=80',
  display: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=700&q=80',
  audio: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80',
  charger: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=700&q=80',
  gamepad: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=700&q=80',
}
const FALLBACK_IMG = productImage.keyboard

/* ---- Types ---- */
// [nombre, descripcion, precio_str, imagen_url, categoria_nombre]
type Product = [string, string, string, string, string]

type SupabaseProduct = {
  id: string
  nombre: string
  sku: string
  precio: number
  stock: number
  imagen_url: string | null
  activo: boolean
  categorias: { nombre: string } | null
}

function toProduct(p: SupabaseProduct): Product {
  return [
    p.nombre,
    `${p.categorias?.nombre ?? 'Producto'} — SKU ${p.sku}`,
    `$${Number(p.precio).toLocaleString('es-MX')}`,
    p.imagen_url ?? FALLBACK_IMG,
    p.categorias?.nombre ?? 'General',
  ]
}

/* ---- Datos estáticos de reseñas, preguntas, slides ---- */
const reviewSamples: [string, string, string][] = [
  ['Mariana R.', 'Lo compre para mi escritorio y se siente mucho mas premium de lo que esperaba. La entrega fue rapida y el empaque llego impecable.', '5.0'],
  ['Carlos M.', 'Buen balance entre diseno y utilidad. Me gusto que no se siente fragil y que los controles son faciles de entender.', '4.8'],
  ['Andrea S.', 'Lo uso diario y hasta ahora todo perfecto. La descripcion coincide con lo que recibi.', '4.9'],
]

const questionSamples: [string, string][] = [
  ['Incluye garantia?', 'Si, incluye garantia de 12 meses contra defectos de fabrica.'],
  ['Cuanto tarda el envio?', 'El envio estimado es de 2 a 5 dias habiles dependiendo de la ciudad.'],
  ['Se puede pagar a meses?', 'En esta tienda se acepta pago en una sola exhibicion. Contacta soporte para mas opciones.'],
]

const views: Record<string, { kicker: string; title: string; text: string; chips: string[] }> = {
  inicio: { kicker: 'Inicio', title: 'Seleccion curada para tu setup.', text: 'Explora productos destacados, categorias populares y accesorios listos para comprar.', chips: ['Entrega rapida', 'Stock limitado', 'Garantia incluida'] },
  catalogo: { kicker: 'Catalogo', title: 'Tienda en linea con productos, precios y filtros.', text: 'Productos reales desde el panel admin con categorias y busqueda.', chips: ['Productos reales', 'Filtros', 'Grid ecommerce'] },
  novedades: { kicker: 'Novedades', title: 'Lanzamientos con formato editorial.', text: 'Una seccion mas aspiracional para mostrar drops recientes, preventas y productos limitados.', chips: ['Nuevo drop', 'Edicion limitada', 'Preventa'] },
  favoritos: { kicker: 'Favoritos', title: 'Wishlist con comparacion rapida.', text: 'Los productos guardados aparecen como una lista compacta con estado, precio y boton de compra.', chips: ['Guardados', 'Comparar', 'Disponible'] },
  ofertas: { kicker: 'Ofertas', title: 'Promos con impacto visual de campana.', text: 'Bloques de descuento, bundles y piezas limitadas para que se sienta como una pagina comercial.', chips: ['Hasta 35%', 'Envio gratis', 'Ultimas piezas'] },
  carrito: { kicker: 'Carrito', title: 'Resumen de compra listo para pagar.', text: 'Una vista de checkout simulada con articulos, subtotal, envio y total.', chips: ['Articulos', 'Total', 'Checkout'] },
  soporte: { kicker: 'Soporte', title: 'Centro de ayuda visual y directo.', text: 'Tarjetas de asistencia para envio, cambios, garantia y asesoria de compra.', chips: ['Chat', 'Garantias', 'Rastreo'] },
}

const navItems = [
  { view: 'inicio', icon: 'home', label: 'Inicio' },
  { view: 'catalogo', icon: 'shopping-bag', label: 'Catalogo' },
  { view: 'novedades', icon: 'sparkles', label: 'Novedades' },
  { view: 'favoritos', icon: 'heart', label: 'Favoritos' },
  { view: 'ofertas', icon: 'badge-percent', label: 'Ofertas' },
  { view: 'carrito', icon: 'shopping-cart', label: 'Carrito' },
  { view: 'soporte', icon: 'headphones', label: 'Soporte' },
]

const slides = [
  { img: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1400&q=80', alt: 'Teclado mecanico iluminado', kicker: 'Setup destacado', title: 'Teclados compactos para crear y jugar.' },
  { img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1400&q=80', alt: 'Consola portatil en escritorio', kicker: 'Gaming portatil', title: 'Control total en cualquier lugar.' },
  { img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1400&q=80', alt: 'Audifonos premium sobre fondo oscuro', kicker: 'Audio premium', title: 'Sonido claro para concentrarte mas.' },
]

/* ---- Helpers ---- */
const priceValue = (price: string) => Number(price.replace(/[$,]/g, '')) || 0
const formatPrice = (value: number) => `$${value.toLocaleString('en-US')}`
const bump = (el: Element) =>
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
    { duration: 220, easing: 'ease-out' },
  )

type CartEntry = { product: Product; quantity: number }

const CART_KEY = 'oe_cart'
const FAVORITOS_KEY = 'oe_favoritos'

function loadCartFromStorage(): CartEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadFavoritosFromStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/* ---- Componente principal ---- */
export default function Storefront() {
  const router = useRouter()
  const { user: panelUser } = useAuth()
  const [view, setView] = useState('inicio')
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [topPeriod, setTopPeriod] = useState<'nuevo' | 'ofertas'>('nuevo')
  const [searchValue, setSearchValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailTitle, setDetailTitle] = useState('')
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [qaAnswers, setQaAnswers] = useState<Record<number, string[]>>({})
  const [qaInputs, setQaInputs] = useState<Record<number, string>>({})
  const [preguntasUsuario, setPreguntasUsuario] = useState<string[]>([])
  const [mostrarFormPregunta, setMostrarFormPregunta] = useState(false)
  const [nuevaPregunta, setNuevaPregunta] = useState('')

  function enviarPregunta() {
    const texto = nuevaPregunta.trim()
    if (!texto) return
    setPreguntasUsuario(prev => [...prev, texto])
    setNuevaPregunta('')
    setMostrarFormPregunta(false)
  }

  // Carrito persistente en localStorage
  const [cart, setCart] = useState<CartEntry[]>(loadCartFromStorage)

  // Favoritos persistentes en localStorage (lista de títulos de producto)
  const [favoritos, setFavoritos] = useState<string[]>(loadFavoritosFromStorage)

  // Productos y categorías desde Supabase
  const [dbProducts, setDbProducts] = useState<Product[]>([])
  const [productIdMap, setProductIdMap] = useState<Record<string, string>>({})
  const [productSkuMap, setProductSkuMap] = useState<Record<string, string>>({})
  const [productStockMap, setProductStockMap] = useState<Record<string, number>>({})
  const [categorias, setCategorias] = useState<string[]>([])
  const [activeCat, setActiveCat] = useState('Todo')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Checkout
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('form')
  const [checkoutForm, setCheckoutForm] = useState({ nombre: '', email: '' })
  const [checkoutError, setCheckoutError] = useState('')
  const [ventaNumero, setVentaNumero] = useState<number | null>(null)
  const [metodosPago, setMetodosPago] = useState({ efectivo: true, transferencia: true, tarjeta: false, mercadopago: false, paypal: false, bbva: false })
  const [metodoPago, setMetodoPago] = useState('')
  const [referenciaBBVA, setReferenciaBBVA] = useState<{ clabe: string; referencia: string; banco: string } | null>(null)

  /* ---- Cargar métodos de pago habilitados ---- */
  useEffect(() => {
    supabase.from('config_metodos_pago').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setMetodosPago(prev => ({ ...prev, ...data })) })
  }, [])

  const metodosDisponibles = [
    { key: 'efectivo', label: 'Efectivo' },
    { key: 'transferencia', label: 'Transferencia' },
    { key: 'tarjeta', label: 'Tarjeta' },
    { key: 'mercadopago', label: 'Mercado Pago' },
    { key: 'paypal', label: 'PayPal' },
    { key: 'bbva', label: 'BBVA' },
  ].filter(m => metodosPago[m.key as keyof typeof metodosPago])

  useEffect(() => {
    if (!metodoPago && metodosDisponibles.length > 0) setMetodoPago(metodosDisponibles[0].key)
  }, [metodosPago]) // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir una vista específica al llegar por link externo, ej. ?view=carrito
  // (icono de carrito de la ficha de producto) o ?buscar=texto (buscador ahí)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const buscar = params.get('buscar')
    const vistaInicial = params.get('view')
    if (buscar) {
      setSearchValue(buscar)
      setSearchQuery(buscar)
      setView('busqueda')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (vistaInicial) {
      goView(vistaInicial)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Regreso desde el checkout de Mercado Pago (?pago=exito|fallido|pendiente)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pago = params.get('pago')
    if (!pago) return

    if (pago === 'exito') {
      const numero = params.get('venta')
      if (numero) setVentaNumero(Number(numero))
      setCart([])
      try { localStorage.removeItem(CART_KEY) } catch { /* ignorar */ }
      setCheckoutState('success')
      setShowCheckout(true)
    } else {
      setCheckoutError(pago === 'pendiente'
        ? 'Tu pago quedó pendiente de confirmación. Te avisaremos en cuanto se acredite.'
        : 'El pago no se completó. Puedes intentarlo de nuevo.')
      setCheckoutState('error')
      setShowCheckout(true)
    }
    // Limpiar la query para que no se repita al recargar
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  // Login modal (storefront — sin roles, solo sesión de cliente)
  const [showLogin, setShowLogin] = useState(false)
  const [loginTab, setLoginTab] = useState<'login' | 'register'>('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ nombre: '', email: '', password: '', confirm: '' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginSuccess, setLoginSuccess] = useState('')
  const [storefrontUser, setStorefrontUser] = useState<{ email: string; nombre: string } | null>(null)

  const gridRef = useRef<HTMLElement>(null)
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0)

  // Config de la tienda desde Supabase
  const [storeConfig, setStoreConfig] = useState({
    nombre_tienda: 'OrderExpress',
    hero_titulo: 'Compra tech con estilo express.',
    hero_subtitulo: 'Los mejores accesorios, periféricos y gadgets.',
    hero_cta: 'Ver productos',
    color_acento: '#e7226d',
    whatsapp: '',
    email_contacto: '',
    instagram: '',
    hero_tag1: 'Entrega rapida',
    hero_tag2: 'Stock limitado',
    hero_tag3: 'Garantia incluida',
    nav_ocultar: '',
    topbar_btn1: 'Nuevo',
    topbar_btn2: 'Ofertas',
    carrusel: null as { img: string; kicker: string; title: string }[] | null,
    politica_devolucion: '',
    fondo_logo: 'blanco' as 'blanco' | 'azul',
  })
  const [mostrarGarantias, setMostrarGarantias] = useState(false)

  /* ---- Persistir carrito en localStorage ---- */
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart])

  /* ---- Persistir favoritos en localStorage ---- */
  useEffect(() => {
    try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(favoritos)) } catch {}
  }, [favoritos])

  function toggleFavorito(title: string) {
    setFavoritos(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])
  }

  /* ---- Cargar config de tienda desde Supabase + realtime ---- */
  useEffect(() => {
    supabase.from('config_storefront').select('*').eq('id', 1).single()
      .then(({ data }) => {
        if (data) {
          setStoreConfig(prev => ({ ...prev, ...data }))
          if (data.meta_titulo) document.title = data.meta_titulo
        }
      })

    const ch = supabase.channel('storefront-config-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config_storefront', filter: 'id=eq.1' }, ({ new: data }) => {
        setStoreConfig(prev => ({ ...prev, ...data }))
        if (data.meta_titulo) document.title = data.meta_titulo
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  /* ---- Cargar productos y categorías desde Supabase ---- */
  useEffect(() => {
    async function fetchData() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre, sku, precio, stock, imagen_url, activo, categorias(nombre)')
          .eq('activo', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false }),
        supabase.from('categorias').select('nombre').eq('activo', true).order('nombre'),
      ])
      if (prods) {
        const typed = prods as unknown as SupabaseProduct[]
        setDbProducts(typed.map(toProduct))
        const idMap: Record<string, string> = {}
        const skuMap: Record<string, string> = {}
        const stockMap: Record<string, number> = {}
        typed.forEach(p => { idMap[p.nombre] = p.id; skuMap[p.nombre] = p.sku; stockMap[p.nombre] = p.stock })
        setProductIdMap(idMap)
        setProductSkuMap(skuMap)
        setProductStockMap(stockMap)
      }
      if (cats) setCategorias(cats.map((c: { nombre: string }) => c.nombre))
      setLoadingProducts(false)
    }
    fetchData()
  }, [])

  /* ---- Slides activos: config DB o fallback hardcoded ---- */
  const activeSlides = (storeConfig.carrusel && storeConfig.carrusel.length > 0)
    ? storeConfig.carrusel.map(s => ({ ...s, alt: s.kicker }))
    : slides

  /* ---- Nav items filtrados según nav_ocultar ---- */
  const hiddenViews = new Set(
    (storeConfig.nav_ocultar || '').split(',').map(s => s.trim()).filter(Boolean)
  )
  const activeNavItems = navItems.filter(item => item.view === 'inicio' || !hiddenViews.has(item.view))

  /* ---- Carrusel con autoplay (5200ms) ---- */
  const startCarousel = () => {
    if (slideTimer.current) clearInterval(slideTimer.current)
    slideTimer.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % activeSlides.length)
    }, 5200)
  }
  useEffect(() => {
    startCarousel()
    return () => { if (slideTimer.current) clearInterval(slideTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const moveCarousel = (index: number) => {
    setCurrentSlide(((index % activeSlides.length) + activeSlides.length) % activeSlides.length)
    startCarousel()
  }

  /* ---- Productos filtrados por categoría ---- */
  const filteredProducts = activeCat === 'Todo'
    ? dbProducts
    : dbProducts.filter(p => p[4] === activeCat)

  const findProduct = (title: string) => dbProducts.find(p => p[0] === title)

  /* ---- Navegación / acciones ---- */
  const scrollGrid = () => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const goView = (next: string) => {
    setView(next)
    setMobileNavOpen(false)
    if (next === 'novedades') setTopPeriod('nuevo')
    if (next === 'ofertas') setTopPeriod('ofertas')
  }

  // Ocultar la barra móvil al bajar y mostrarla al subir
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (mobileNavOpen) { lastY = y; return }
      if (y < 80) setHeaderHidden(false)          // cerca del tope: siempre visible
      else if (y > lastY + 6) setHeaderHidden(true)   // bajando: ocultar hacia arriba
      else if (y < lastY - 6) setHeaderHidden(false)  // subiendo: mostrar
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mobileNavOpen])

  const addToCart = (title: string) => {
    const product = findProduct(title)
    if (!product) return
    const maxStock = productStockMap[title] ?? 0
    setCart((prev) => {
      const current = prev.find((i) => i.product[0] === title)
      if (current) {
        if (current.quantity >= maxStock) return prev
        return prev.map((i) => (i.product[0] === title ? { ...i, quantity: i.quantity + 1 } : i))
      }
      if (maxStock < 1) return prev
      return [...prev, { product, quantity: 1 }]
    })
  }

  const openDetail = (title: string) => {
    const sku = productSkuMap[title]
    if (sku) {
      router.push(`/tienda/${sku.toLowerCase()}`)
      return
    }
    if (!findProduct(title)) return
    setDetailTitle(title)
    setGalleryIndex(0)
    setQaAnswers({})
    setQaInputs({})
    setView('producto')
    requestAnimationFrame(scrollGrid)
  }

  const buyNow = (title: string) => {
    addToCart(title)
    setView('carrito')
    requestAnimationFrame(scrollGrid)
  }

  const openCart = () => {
    setView('carrito')
    requestAnimationFrame(scrollGrid)
  }

  async function handleCheckout() {
    const nombre = checkoutForm.nombre.trim()
    const email = checkoutForm.email.trim().toLowerCase()
    if (!nombre || !email) { setCheckoutError('Nombre y email son obligatorios'); return }
    if (!isValidEmail(email)) { setCheckoutError('El email no es válido'); return }
    if (cart.length === 0) { setCheckoutError('El carrito está vacío'); return }
    if (!metodoPago) { setCheckoutError('Selecciona un método de pago'); return }
    setCheckoutState('loading')
    setCheckoutError('')

    // Buscar o crear cliente
    let clienteId: string
    const { data: existing } = await supabase.from('clientes').select('id').eq('email', email).maybeSingle()
    if (existing) {
      clienteId = existing.id
    } else {
      const { data: nuevo, error: clienteErr } = await supabase
        .from('clientes').insert({ nombre, email, tag: 'Nuevo' }).select('id').single()
      if (clienteErr || !nuevo) { setCheckoutError('Error al registrar cliente'); setCheckoutState('error'); return }
      clienteId = nuevo.id
    }

    // Calcular total
    const total = cart.reduce((t, i) => t + priceValue(i.product[2]) * i.quantity, 0)

    // Crear venta
    const etiquetaMetodo = metodosDisponibles.find(m => m.key === metodoPago)?.label || metodoPago
    const { data: venta, error: ventaErr } = await supabase
      .from('ventas')
      .insert({ cliente_id: clienteId, estado: 'Pendiente', total, notas: `Pedido desde tienda web · Método: ${etiquetaMetodo}` })
      .select('id, numero').single()
    if (ventaErr || !venta) { setCheckoutError('Error al crear el pedido'); setCheckoutState('error'); return }

    // Crear items (solo los que tienen ID en Supabase)
    const ventaItems = cart
      .filter(i => productIdMap[i.product[0]])
      .map(i => ({
        venta_id: venta.id,
        producto_id: productIdMap[i.product[0]],
        nombre: i.product[0],
        precio: priceValue(i.product[2]),
        cantidad: i.quantity,
      }))

    if (ventaItems.length > 0) {
      const { error: itemsErr } = await supabase.from('venta_items').insert(ventaItems)
      if (itemsErr) { setCheckoutError('Error al guardar productos'); setCheckoutState('error'); return }
    }

    // Si eligió una pasarela con redirección (Mercado Pago o PayPal), iniciar el pago
    const endpointRedireccion: Record<string, string> = {
      mercadopago: '/api/pagos/crear-preferencia',
      paypal: '/api/pagos/paypal/crear-orden',
    }
    if (endpointRedireccion[metodoPago]) {
      try {
        const res = await fetch(endpointRedireccion[metodoPago], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ventaId: venta.id }),
        })
        const data = await res.json()
        if (res.ok && data.url) {
          setCart([])
          try { localStorage.removeItem(CART_KEY) } catch {}
          window.location.href = data.url   // redirige al checkout externo
          return
        }
        console.warn('Pasarela de pago no disponible:', data.error)
      } catch (e) {
        console.warn('No se pudo iniciar el pago:', e)
      }
    }

    // BBVA: genera una referencia SPEI y la muestra en el propio modal (sin redirección)
    if (metodoPago === 'bbva') {
      try {
        const res = await fetch('/api/pagos/bbva/crear-referencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ventaId: venta.id }),
        })
        const data = await res.json()
        if (res.ok && data.clabe) {
          setReferenciaBBVA({ clabe: data.clabe, referencia: data.referencia, banco: data.banco })
          setVentaNumero(venta.numero)
          setCart([])
          try { localStorage.removeItem(CART_KEY) } catch {}
          setCheckoutState('success')
          return
        }
        console.warn('Referencia BBVA no disponible:', data.error)
      } catch (e) {
        console.warn('No se pudo generar la referencia BBVA:', e)
      }
    }

    // Sin pasarela configurada (o no disponible aún): el pedido queda registrado como Pendiente
    setVentaNumero(venta.numero)
    setCart([])
    try { localStorage.removeItem(CART_KEY) } catch {}
    setCheckoutState('success')
  }

  const toggleBrand = (e: React.MouseEvent) => {
    e.preventDefault()
    setNavCollapsed((c) => !c)
  }

  const openLoginModal = (tab: 'login' | 'register' = 'login') => {
    setLoginTab(tab)
    setLoginForm({ email: '', password: '' })
    setRegisterForm({ nombre: '', email: '', password: '', confirm: '' })
    setLoginError('')
    setLoginSuccess('')
    setShowLogin(true)
  }

  const closeLoginModal = () => {
    setShowLogin(false)
    setLoginError('')
    setLoginSuccess('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    const { data, error } = await supabase
      .from('registros')
      .select('nombre, email, activo')
      .eq('email', loginForm.email.trim().toLowerCase())
      .eq('password', loginForm.password)
      .maybeSingle()

    if (error || !data) {
      setLoginError('Email o contraseña incorrectos')
      setLoginLoading(false)
      return
    }
    if (!data.activo) {
      setLoginError('Tu cuenta aún no ha sido activada. Espera la confirmación del administrador.')
      setLoginLoading(false)
      return
    }
    setStorefrontUser({ email: data.email, nombre: data.nombre })
    setShowLogin(false)
    setLoginLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginSuccess('')
    const { nombre, email, password, confirm } = registerForm
    if (!nombre.trim()) { setLoginError('El nombre es obligatorio'); return }
    if (!isValidEmail(email)) { setLoginError('El email no es válido'); return }
    if (password.length < 6) { setLoginError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setLoginError('Las contraseñas no coinciden'); return }
    setLoginLoading(true)

    const { error } = await supabase.from('registros').insert({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password,
      activo: false,
    })

    if (error) {
      if (error.code === '23505') {
        setLoginError('Este email ya está registrado. Inicia sesión.')
      } else {
        setLoginError('Error al guardar los datos. Intenta de nuevo.')
      }
      setLoginLoading(false)
      return
    }

    setLoginSuccess('¡Registro exitoso! Tu cuenta está pendiente de activación por el administrador.')
    setLoginLoading(false)
  }

  function handleLogout() {
    supabase.auth.signOut()
    setStorefrontUser(null)
  }

  const activateInGroup = (e: React.MouseEvent<HTMLButtonElement>, selector: string) => {
    const btn = e.currentTarget
    btn.parentElement?.querySelectorAll(selector).forEach((n) => n.classList.remove('active'))
    btn.classList.add('active')
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    setSearchQuery(searchValue)
    setView('busqueda')
  }

  const onSearchChange = (val: string) => {
    setSearchValue(val)
    if (val.trim().length > 1) {
      const q = val.toLowerCase()
      const sugs = dbProducts.filter(([t, , , , c]) =>
        t.toLowerCase().includes(q) || c.toLowerCase().includes(q)
      ).slice(0, 5)
      setSearchSuggestions(sugs)
      setShowSuggestions(sugs.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const onCardClick = (e: React.MouseEvent, title: string) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    openDetail(title)
  }

  const submitAnswer = (idx: number) => {
    const val = (qaInputs[idx] || '').trim()
    if (!val) return
    setQaAnswers((p) => ({ ...p, [idx]: [...(p[idx] || []), val] }))
    setQaInputs((p) => ({ ...p, [idx]: '' }))
  }

  /* ---- Inyectar color de acento como CSS variable ---- */
  useEffect(() => {
    document.documentElement.style.setProperty('--store-accent', storeConfig.color_acento || '#e7226d')
  }, [storeConfig.color_acento])

  /* ---- Preview header ---- */
  const preview = (() => {
    if (view === 'inicio') {
      return {
        kicker: 'Inicio',
        title: 'Seleccion curada para tu setup.',
        text: storeConfig.hero_subtitulo || 'Los mejores accesorios, periféricos y gadgets.',
        chips: [storeConfig.hero_tag1, storeConfig.hero_tag2, storeConfig.hero_tag3].filter(Boolean),
      }
    }
    if (view === 'producto') {
      const product = findProduct(detailTitle)
      return {
        kicker: product ? product[4] : 'Producto',
        title: detailTitle,
        text: product ? product[1] : '',
        chips: ['Detalle', 'Galeria', 'Antes de comprar'],
      }
    }
    if (view === 'busqueda') {
      const q = searchQuery.trim()
      const nq = q.toLowerCase()
      const results = dbProducts.filter(([t, x, , , c]) => [t, x, c].some((v) => v.toLowerCase().includes(nq)))
      return {
        kicker: 'Busqueda',
        title: nq ? `Resultados para "${q}".` : 'Busca productos por nombre o categoria.',
        text: results.length ? `Se encontraron ${results.length} productos.` : 'No hay coincidencias.',
        chips: ['Productos', 'Precios', 'Agregar al carrito'],
      }
    }
    if (view === 'carrito') {
      const subtotal = cart.reduce((t, i) => t + priceValue(i.product[2]) * i.quantity, 0)
      const discount = subtotal > 3000 ? 320 : 0
      const total = subtotal - discount
      const itemCount = cart.reduce((c, i) => c + i.quantity, 0)
      return {
        kicker: views.carrito.kicker,
        title: views.carrito.title,
        text: views.carrito.text,
        chips: [`${itemCount} articulos`, `Total ${formatPrice(total)}`, 'Checkout'],
      }
    }
    return views[view] || views.inicio
  })()

  /* ---- Botón agregar reutilizable ---- */
  const AddButton = ({ title, dark, icon = 'plus', label = 'Agregar producto' }: { title: string; dark?: boolean; icon?: string; label?: string }) => (
    <button
      className={`round-button${dark ? ' dark' : ''}`}
      type="button"
      aria-label={label}
      onClick={(e) => { addToCart(title); bump(e.currentTarget) }}
    >
      <Ic n={icon} />
    </button>
  )

  const ProductCard = ([title, text, price, image, category]: Product) => {
    const guardado = favoritos.includes(title)
    return (
    <article key={title} className="store-product" data-detail-title={title} onClick={(e) => onCardClick(e, title)}>
      <div className="store-product-media">
        <img src={image} alt={title} />
        <button
          className={`icon-button${guardado ? ' saved' : ''}`}
          type="button"
          aria-label={guardado ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          aria-pressed={guardado}
          onClick={(e) => { e.stopPropagation(); toggleFavorito(title) }}
        >
          <Ic n="heart" />
        </button>
      </div>
      <span>{category}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="price-row">
        <strong>{price}</strong>
        <AddButton title={title} dark />
      </div>
    </article>
    )
  }

  const gridClass: Record<string, string> = {
    inicio: 'content-grid',
    catalogo: 'shop-layout',
    novedades: 'drop-layout',
    favoritos: 'wishlist-layout',
    ofertas: 'deals-layout',
    carrito: 'cart-layout',
    soporte: 'support-layout',
    producto: 'product-detail-layout',
    busqueda: 'shop-layout',
  }

  /* ---- Vistas ---- */
  const renderHome = () => {
    const featured = dbProducts.slice(0, 3)
    if (loadingProducts || featured.length === 0) {
      return (
        <article className="product-card tall" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Cargando productos...</p>
        </article>
      )
    }
    return featured.map(([title, text, price, image, category], index) => (
      <article
        key={`${title}-${index}`}
        className={`product-card ${index === 1 ? 'wide' : index === 2 ? 'compact' : 'tall'}`}
        data-detail-title={title}
        onClick={(e) => onCardClick(e, title)}
      >
        {index === 1 ? (
          <>
            <div>
              <span className="pill">Destacado</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className="price-row">
                <strong>{price}</strong>
                <AddButton title={title} dark />
              </div>
            </div>
            <img src={image} alt={title} />
          </>
        ) : (
          <>
            <img src={image} alt={title} />
            <div>
              <span className="pill">{index === 2 ? 'Recomendado' : category}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className="price-row">
                <strong>{price}</strong>
                <AddButton title={title} />
              </div>
            </div>
          </>
        )}
      </article>
    ))
  }

  const renderCatalog = () => {
    const catCounts: Record<string, number> = {}
    dbProducts.forEach(p => { catCounts[p[4]] = (catCounts[p[4]] ?? 0) + 1 })

    return (
      <>
        {/* Panel de filtros lateral */}
        <aside className="filter-panel">
          <h3>Filtros</h3>

          {/* Select rápido de categoría */}
          <div style={{ position: 'relative' }}>
            <select
              value={activeCat}
              onChange={e => setActiveCat(e.target.value)}
              style={{
                width: '100%', padding: '9px 32px 9px 12px', borderRadius: 8,
                border: '1.5px solid #e3e8f0', fontSize: 12, fontWeight: 700,
                color: '#202763', background: '#fff', cursor: 'pointer',
                outline: 'none', appearance: 'none', WebkitAppearance: 'none',
                fontFamily: 'inherit',
              }}
            >
              <option value="Todo">Todo ({dbProducts.length})</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat} ({catCounts[cat] ?? 0})</option>
              ))}
            </select>
            <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 14, height: 14 }}
              viewBox="0 0 24 24" fill="none" stroke="#202763" strokeWidth="2.5" strokeLinecap="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {/* Lista larga de categorías: en móvil el <select> de arriba ya
              cubre la misma función en mucho menos espacio, así que esta
              lista se oculta ahí (ver .category-buttons en storefront.css). */}
          <div className="category-buttons">
            <button
              className={`category cat-sm${activeCat === 'Todo' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveCat('Todo')}
            >
              <Ic n="grid-2x2" /><span>Todo</span><b>{dbProducts.length}</b>
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                className={`category cat-sm${activeCat === cat ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveCat(cat)}
              >
                <Ic n="shopping-bag" /><span>{cat}</span><b>{catCounts[cat] ?? 0}</b>
              </button>
            ))}
          </div>
          <div className="range-card">
            <span>Rango de precio</span>
            <strong>
              {dbProducts.length > 0
                ? `${formatPrice(Math.min(...dbProducts.map(p => priceValue(p[2]))))} - ${formatPrice(Math.max(...dbProducts.map(p => priceValue(p[2]))))}`
                : '—'}
            </strong>
            <div></div>
          </div>
        </aside>

        <div className="store-grid">
          {loadingProducts ? (
            <article className="empty-state">
              <p>Cargando productos...</p>
            </article>
          ) : filteredProducts.length === 0 ? (
            <article className="empty-state">
              <Ic n="search-x" />
              <h3>Sin productos</h3>
              <p>No hay productos en esta categoría todavía.</p>
            </article>
          ) : (
            filteredProducts.map(ProductCard)
          )}
        </div>
      </>
    )
  }

  const renderDrops = () => {
    const featured = dbProducts[0]
    return (
      <>
        {featured ? (
          <article className="drop-feature" data-detail-title={featured[0]} onClick={(e) => onCardClick(e, featured[0])}>
            <img src={featured[3]} alt={featured[0]} />
            <div>
              <span className="pill live"><Ic n="sparkles" /> Nuevo lanzamiento</span>
              <h3>{featured[0].toUpperCase()}</h3>
              <p>{featured[1]}</p>
              <div className="price-row">
                <strong>{featured[2]}</strong>
                <AddButton title={featured[0]} dark label="Agregar lanzamiento" />
              </div>
            </div>
          </article>
        ) : null}
        {dbProducts.slice(1, 4).map((p, i) => (
          <article key={p[0]} className="release-card"><span>0{i + 1}</span><h3>{p[0].toUpperCase()}</h3><p>{p[4]}</p></article>
        ))}
      </>
    )
  }

  const renderFavorites = () => {
    const guardados = dbProducts.filter(([title]) => favoritos.includes(title))
    if (guardados.length === 0) {
      return (
        <article className="empty-state">
          <Ic n="heart" />
          <h3>Sin favoritos todavía</h3>
          <p>Toca el corazón en cualquier producto del catálogo para guardarlo aquí.</p>
        </article>
      )
    }
    return guardados.map(([title, text, price, image, category]) => (
      <article key={title} className="wishlist-item" data-detail-title={title} onClick={(e) => onCardClick(e, title)}>
        <img src={image} alt={title} />
        <div>
          <span>{category}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
        <strong>{price}</strong>
        <AddButton title={title} icon="shopping-cart" label="Agregar favorito" />
      </article>
    ))
  }

  const renderDeals = () => {
    const dealProds = dbProducts.slice(0, 3)
    const hero = dbProducts[0]
    return (
      <>
        <article className="deal-hero">
          <div>
            <span className="pill live"><Ic n="sparkles" /> Flash sale</span>
            <h3>DESCUENTOS ESPECIALES.</h3>
            <p>Productos seleccionados con precio especial por tiempo limitado.</p>
          </div>
          <img src={hero?.[3] ?? activeSlides[0].img} alt="Promo" />
        </article>
        {dealProds.map(([title, , price, image]) => {
          const original = Math.round(priceValue(price) * 1.22)
          return (
            <article key={title} className="deal-card" data-detail-title={title} onClick={(e) => onCardClick(e, title)}>
              <img src={image} alt={title} />
              <h3>{title}</h3>
              <p><s>{formatPrice(original)}</s> <strong>{price}</strong></p>
              <button className="period-button active" type="button" onClick={(e) => { addToCart(title); bump(e.currentTarget) }}>Agregar oferta</button>
            </article>
          )
        })}
      </>
    )
  }

  const renderCart = () => {
    const subtotal = cart.reduce((t, i) => t + priceValue(i.product[2]) * i.quantity, 0)
    const discount = subtotal > 3000 ? 320 : 0
    const total = subtotal - discount
    const itemCount = cart.reduce((c, i) => c + i.quantity, 0)
    return (
      <>
        <section className="mini-cart">
          <div className="mini-cart-head">
            <div>
              <span>Tu carrito</span>
              <h3>Lista de agregados</h3>
            </div>
            <strong>{itemCount}</strong>
          </div>
          <div className="cart-list">
            {cart.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>El carrito está vacío</p>
            ) : cart.map(({ product, quantity }) => {
              const [title, , price, image, category] = product
              return (
                <article key={title} className="cart-item">
                  <img src={image} alt={title} />
                  <div>
                    <span>{category}</span>
                    <h3>{title}</h3>
                    <p>Cantidad {quantity} x {price}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <strong>{formatPrice(priceValue(price) * quantity)}</strong>
                    <button
                      type="button"
                      style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setCart(prev => prev.filter(i => i.product[0] !== title))}
                    >Quitar</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
        <aside className="checkout-panel">
          <h3>Resumen</h3>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <p><span>Envio</span><strong>Gratis</strong></p>
          <p><span>Descuento</span><strong>-{formatPrice(discount)}</strong></p>
          <div><span>Total</span><strong>{formatPrice(total)}</strong></div>
          <button className="period-button active" type="button" onClick={() => { setCheckoutForm({ nombre: '', email: '' }); setCheckoutState('form'); setCheckoutError(''); setReferenciaBBVA(null); setShowCheckout(true) }}>Continuar pago</button>
          {cart.length > 0 && (
            <button
              className="period-button"
              type="button"
              style={{ marginTop: 8 }}
              onClick={() => { setCart([]); try { localStorage.removeItem(CART_KEY) } catch {} }}
            >Vaciar carrito</button>
          )}
        </aside>
      </>
    )
  }

  const renderSupport = () => {
    const cards: [string, string, string, string | null][] = [
      ['message-circle', 'Chat de compra', 'Resuelve dudas sobre productos antes de comprar.', storeConfig.whatsapp ? `https://wa.me/${storeConfig.whatsapp.replace(/\D/g, '')}` : null],
      ['truck', 'Envios y rastreo', 'Consulta estados y tiempos de entrega con el equipo.', storeConfig.email_contacto ? `mailto:${storeConfig.email_contacto}` : null],
      ['shield-check', 'Garantias', 'Cambios, devoluciones y cobertura de accesorios.', 'GARANTIAS'],
      ['sparkles', 'Asesoria', 'Recomendaciones para elegir tu setup ideal.', storeConfig.instagram ? `https://instagram.com/${storeConfig.instagram.replace('@', '')}` : null],
    ]
    return (
      <>
        {cards.map(([icon, title, text, href]) => (
          <article key={title} className="support-card">
            <Ic n={icon} />
            <h3>{title}</h3>
            <p>{text}</p>
            {href === 'GARANTIAS'
              ? <button className="round-button dark" type="button" aria-label={title} onClick={() => setMostrarGarantias(true)}><Ic n="arrow-right" /></button>
              : href
                ? <a href={href} target="_blank" rel="noopener noreferrer" className="round-button dark" aria-label={title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: '#111', color: '#fff', textDecoration: 'none' }}><Ic n="arrow-right" /></a>
                : <button className="round-button dark" type="button" aria-label={title} disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}><Ic n="arrow-right" /></button>
            }
          </article>
        ))}
        {(storeConfig.whatsapp || storeConfig.instagram || storeConfig.email_contacto) && (
          <article className="support-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3>Contáctanos directamente</h3>
              <p>Estamos disponibles para ayudarte en cualquier momento.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {storeConfig.whatsapp && (
                <a href={`https://wa.me/${storeConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#25d366', color: '#fff', borderRadius: 99, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  💬 WhatsApp
                </a>
              )}
              {storeConfig.instagram && (
                <a href={`https://instagram.com/${storeConfig.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#e1306c', color: '#fff', borderRadius: 99, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  📷 Instagram
                </a>
              )}
              {storeConfig.email_contacto && (
                <a href={`mailto:${storeConfig.email_contacto}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#252855', color: '#fff', borderRadius: 99, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  ✉️ Email
                </a>
              )}
            </div>
          </article>
        )}
      </>
    )
  }

  const renderSearch = () => {
    const q = searchQuery.trim()
    const nq = q.toLowerCase()
    const label = q || 'Todo'
    const results = dbProducts.filter(([t, x, , , c]) => [t, x, c].some((v) => v.toLowerCase().includes(nq)))
    const suggestions = categorias.slice(0, 3).join(', ') || 'productos disponibles'
    return (
      <>
        <aside className="filter-panel">
          <h3>Busqueda</h3>
          <button className="category active" type="button"><Ic n="search" /><span>{label}</span><b>{results.length}</b></button>
          <div className="range-card">
            <span>Sugerencias</span>
            <strong>{suggestions}</strong>
            <div></div>
          </div>
        </aside>
        <div className="store-grid">
          {results.length ? (
            results.map(ProductCard)
          ) : (
            <article className="empty-state">
              <Ic n="search-x" />
              <h3>Sin resultados</h3>
              <p>No encontramos productos con ese termino.</p>
            </article>
          )}
        </div>
      </>
    )
  }

  const renderDetail = () => {
    const product = findProduct(detailTitle)
    if (!product) return null
    const [title, text, price, image, category] = product
    const gallery = [image]
    return (
      <>
        <section className="product-gallery">
          <img className="product-gallery-main" src={gallery[galleryIndex] || gallery[0]} alt={title} />
          <div className="product-thumbs" aria-label="Imagenes del producto">
            {gallery.map((item, index) => (
              <button
                key={item + index}
                className={index === galleryIndex ? 'active' : ''}
                type="button"
                aria-label={`Ver imagen ${index + 1}`}
                onClick={() => setGalleryIndex(index)}
              >
                <img src={item} alt={`${title} vista ${index + 1}`} />
              </button>
            ))}
          </div>
        </section>

        <aside className="product-buy-panel">
          <button className="text-link product-back" type="button" onClick={() => { setView('catalogo'); requestAnimationFrame(scrollGrid) }}>
            <Ic n="arrow-left" /> Volver al catalogo
          </button>
          <span className="pill">{category}</span>
          <h3>{title}</h3>
          <p>{text}</p>
          <strong className="detail-price">{price}</strong>

          <div className="detail-actions">
            <button className="period-button active" type="button" onClick={(e) => { addToCart(title); bump(e.currentTarget) }}>Agregar al carrito</button>
            <button className="period-button" type="button" onClick={() => buyNow(title)}>Comprar ahora</button>
          </div>

          <div className="product-specs">
            {['Disponible', 'Garantia incluida', 'Envio rapido', 'Compra segura'].map((spec) => (
              <span key={spec}><Ic n="check" />{spec}</span>
            ))}
          </div>
        </aside>

        <section className="detail-section product-story">
          <span>Descripcion completa</span>
          <h3>Todo lo que debes saber antes de comprar.</h3>
          <p>{text}</p>
          <div className="story-highlights">
            <span><Ic n="package-check" /> Producto revisado antes de envio</span>
            <span><Ic n="shield-check" /> Compra protegida y garantia incluida</span>
            <span><Ic n="truck" /> Envio con seguimiento</span>
          </div>
        </section>

        <section className="detail-section product-reviews">
          <div className="section-head">
            <div>
              <span>Comentarios</span>
              <h3>Opiniones de compradores.</h3>
            </div>
            <strong>4.9</strong>
          </div>
          <div className="review-list">
            {reviewSamples.map(([name, comment, rating]) => (
              <article key={name} className="review-card">
                <div>
                  <b>{name}</b>
                  <span>{rating} / 5</span>
                </div>
                <p>{comment}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-section product-questions">
          <div className="section-head">
            <div>
              <span>Preguntas y respuestas</span>
              <h3>Resuelve dudas del producto.</h3>
            </div>
            <button className="period-button" type="button" onClick={() => setMostrarFormPregunta(v => !v)}>Preguntar</button>
          </div>
          {mostrarFormPregunta && (
            <div className="answer-box" style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Escribe tu pregunta sobre este producto"
                aria-label="Nueva pregunta"
                value={nuevaPregunta}
                autoFocus
                onChange={(e) => setNuevaPregunta(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') enviarPregunta() }}
              />
              <button className="round-button dark" type="button" aria-label="Enviar pregunta" onClick={enviarPregunta}><Ic n="send" /></button>
            </div>
          )}
          <div className="question-list">
            {preguntasUsuario.map((question, i) => (
              <article key={`nueva-${i}`} className="question-card">
                <h4>{question}</h4>
                <p>Gracias por tu pregunta — nuestro equipo te responderá pronto.</p>
              </article>
            ))}
            {questionSamples.map(([question, answer], index) => (
              <article key={question} className="question-card">
                <h4>{question}</h4>
                <p>{answer}</p>
                {(qaAnswers[index] || []).map((ans, i) => (
                  <p key={i} className="user-answer">{ans}</p>
                ))}
                <div className="answer-box">
                  <input
                    type="text"
                    placeholder="Escribe una respuesta"
                    aria-label="Responder pregunta"
                    value={qaInputs[index] || ''}
                    onChange={(e) => setQaInputs((p) => ({ ...p, [index]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(index) }}
                  />
                  <button className="round-button dark" type="button" aria-label="Enviar respuesta" onClick={() => submitAnswer(index)}><Ic n="send" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    )
  }

  const renderContent = () => {
    switch (view) {
      case 'catalogo': return renderCatalog()
      case 'novedades': return renderDrops()
      case 'favoritos': return renderFavorites()
      case 'ofertas': return renderDeals()
      case 'carrito': return renderCart()
      case 'soporte': return renderSupport()
      case 'producto': return renderDetail()
      case 'busqueda': return renderSearch()
      default: return renderHome()
    }
  }

  return (
    <div className={`oe-store${navCollapsed ? ' nav-collapsed' : ''}`} data-view={view}>
      <aside className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}${headerHidden ? ' nav-hidden' : ''}`} aria-label="Navegacion principal">
        <div className="sidebar-head" style={{ background: storeConfig.fondo_logo === 'azul' ? '#252855' : '#fff' }}>
          <button
            type="button"
            className="nav-burger"
            aria-label={mobileNavOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>

          <a className="brand" href="#" aria-label={navCollapsed ? 'Desplegar navegacion' : 'Contraer navegacion'} aria-expanded={!navCollapsed} onClick={toggleBrand}>
            <img className="brand-logo full" src="/storefront/logo.svg" alt="OrderExpress" />
            <img className="brand-logo mark" src="/storefront/monograma.svg" alt="OrderExpress" />
          </a>

          {/* Acciones de la barra — solo visibles en móvil (ver storefront.css).
              El buscador se colapsa en una lupa para no comerse el logo. */}
          <button type="button" className="head-action head-search" aria-label="Buscar"
            onClick={() => setMobileSearchOpen(true)}>
            <Ic n="search" />
          </button>

          <button type="button" className="head-action head-cart" aria-label="Carrito" onClick={openCart}>
            <Ic n="shopping-cart" />
            {cartCount > 0 && <span className="head-cart-badge">{cartCount}</span>}
          </button>

          {/* Buscador desplegado: ocupa toda la barra */}
          {mobileSearchOpen && (
            <form className="head-search-bar" role="search"
              onSubmit={(e) => { onSearchSubmit(e); setMobileSearchOpen(false) }}>
              <Ic n="search" />
              <input
                type="search"
                autoFocus
                placeholder="Buscar productos"
                aria-label="Buscar productos"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => searchValue.length > 1 && setShowSuggestions(searchSuggestions.length > 0)}
                autoComplete="off"
              />
              <button type="button" aria-label="Cerrar busqueda"
                onClick={() => { setMobileSearchOpen(false); onSearchChange('') }}>×</button>

              {showSuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, marginTop: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  {searchSuggestions.map(([title, , price, image, category]) => (
                    <button
                      key={title}
                      type="button"
                      onMouseDown={() => { openDetail(title); setShowSuggestions(false); setSearchValue(''); setMobileSearchOpen(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}
                    >
                      <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{category}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0049ff', flexShrink: 0 }}>{price}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={(e) => { onSearchSubmit(e as unknown as React.FormEvent); setMobileSearchOpen(false) }}
                    style={{ width: '100%', padding: '10px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 600, textAlign: 'center' }}
                  >
                    Ver todos los resultados para "{searchValue}" →
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <nav className="nav-list">
          {activeNavItems.map((item) => (
            <a
              key={item.view}
              className={`nav-item${view === item.view ? ' active' : ''}`}
              href="#"
              onClick={(e) => { e.preventDefault(); goView(item.view) }}
            >
              <Ic n={item.icon} /><span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="profile-card">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="Cliente" />
          <div>
            <span>Cuenta demo</span>
            <strong>Premium</strong>
          </div>
        </div>
      </aside>

      <main className="page-shell">
        <section className="home-immersive">
          <header className="topbar">
            <div>
              <p className="eyebrow">{storeConfig.nombre_tienda}</p>
              <h1>{storeConfig.hero_titulo}</h1>
            </div>

            <div className="top-actions" aria-label="Acciones superiores">
              <button className={`period-button${topPeriod === 'nuevo' ? ' active' : ''}`} type="button" onClick={() => goView('novedades')}>{storeConfig.topbar_btn1 || 'Nuevo'}</button>
              <button className={`period-button${topPeriod === 'ofertas' ? ' active' : ''}`} type="button" onClick={() => goView('ofertas')}>{storeConfig.topbar_btn2 || 'Ofertas'}</button>
              <div style={{ position: 'relative' }}>
                <form className="search-box" onSubmit={onSearchSubmit} role="search">
                  <Ic n="search" />
                  <input
                    type="search"
                    placeholder="Buscar productos"
                    aria-label="Buscar productos"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => searchValue.length > 1 && setShowSuggestions(searchSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  <button type="submit" aria-label="Buscar"><Ic n="arrow-right" /></button>
                </form>
                {showSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    {searchSuggestions.map(([title, , price, image, category]) => (
                      <button
                        key={title}
                        type="button"
                        onMouseDown={() => { openDetail(title); setShowSuggestions(false); setSearchValue('') }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{category}</p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0049ff', flexShrink: 0 }}>{price}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={onSearchSubmit as unknown as React.MouseEventHandler}
                      style={{ width: '100%', padding: '10px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 600, textAlign: 'center' }}
                    >
                      Ver todos los resultados para "{searchValue}" →
                    </button>
                  </div>
                )}
              </div>
              <button className="icon-button dark" type="button" aria-label="Carrito" onClick={openCart}><Ic n="shopping-cart" /><span>{cartCount}</span></button>

              {/* Sesión: si no hay cuenta logueada, solo "Iniciar sesión".
                  Si hay sesión activa, ícono de perfil que lleva al panel de su rol. */}
              {panelUser ? (
                <a href={ROLE_HOME[panelUser.role]} title={panelUser.nombre} className="icon-button"
                  style={{ borderRadius: '50%', background: storeConfig.color_acento || '#e7226d', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', border: 'none' }}>
                  {panelUser.nombre.charAt(0).toUpperCase()}
                </a>
              ) : (
                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, background: storeConfig.color_acento || '#e7226d', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 99, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  → Iniciar sesión
                </a>
              )}
            </div>
          </header>

          <section className="view-preview" aria-live="polite">
            <div>
              <span className="preview-kicker">{preview.kicker}</span>
              <h2>{preview.title}</h2>
              <p>{preview.text}</p>
            </div>
            <div className="preview-chips">
              {preview.chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
          </section>

          <section className="photo-carousel" aria-label="Carrusel de productos destacados">
            <div className="carousel-track">
              {activeSlides.map((slide, i) => (
                <article key={i} className={`carousel-slide${i === currentSlide ? ' active' : ''}`}>
                  <img src={slide.img} alt={slide.alt ?? slide.kicker} />
                  <div className="carousel-caption">
                    <span>{slide.kicker}</span>
                    <h2>{slide.title}</h2>
                  </div>
                </article>
              ))}
            </div>

            <div className="carousel-controls">
              <div className="carousel-dots" aria-label="Seleccionar foto">
                {activeSlides.map((_, i) => (
                  <button key={i} className={i === currentSlide ? 'active' : ''} type="button" aria-label={`Ver foto ${i + 1}`} onClick={() => moveCarousel(i)} />
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="hero-grid" aria-label="Productos destacados">
          <article className="hero-card featured">
            <div className="hero-copy">
              <span className="pill live"><Ic n="sparkles" /> Nuevo drop</span>
              <h2>TYPE SMARTER.<br />PLAY LONGER.</h2>
              <p>Teclados, consolas y accesorios seleccionados para setups compactos con mucha personalidad.</p>
              <a className="text-link" href="#" onClick={(e) => { e.preventDefault(); goView('catalogo') }}>{storeConfig.hero_cta || 'Ver catalogo'} <Ic n="arrow-right" /></a>
            </div>
            <img src="https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80" alt="Teclado mecanico verde" />
          </article>

          <article className="hero-card console">
            <div className="hero-copy">
              <h2>POCKET-SIZE<br />NOSTALGIA.</h2>
              <p>Juega clasicos con diseno moderno.</p>
              <a className="text-link gold" href="#" onClick={(e) => { e.preventDefault(); goView('catalogo') }}>Conocer <Ic n="arrow-right" /></a>
            </div>
            <img src="https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=700&q=80" alt="Control de videojuego retro" />
          </article>
        </section>

        <section className={gridClass[view] || 'content-grid'} ref={gridRef} aria-label="Catalogo simulado">
          {renderContent()}
        </section>
      </main>
      {/* Modal de checkout */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget && checkoutState !== 'loading') setShowCheckout(false) }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

            {checkoutState === 'success' ? (
              <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>¡Pedido recibido!</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, marginBottom: 6 }}>
                  Tu pedido <strong style={{ color: '#0049ff' }}>#{ventaNumero}</strong> fue registrado con éxito.
                </p>
                {referenciaBBVA ? (
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', textAlign: 'left', margin: '16px 0' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Paga por transferencia SPEI (BBVA)</p>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Banco: <strong style={{ color: '#111' }}>{referenciaBBVA.banco}</strong></p>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>CLABE: <strong style={{ color: '#111' }}>{referenciaBBVA.clabe}</strong></p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>Referencia: <strong style={{ color: '#111' }}>{referenciaBBVA.referencia}</strong></p>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Te contactaremos pronto para coordinar el pago y entrega.</p>
                )}
                <button onClick={() => { setShowCheckout(false); setReferenciaBBVA(null); goView('catalogo') }}
                  style={{ background: '#0049ff', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Seguir comprando
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Finalizar pedido</h3>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{cart.reduce((t, i) => t + i.quantity, 0)} artículos · {formatPrice(cart.reduce((t, i) => t + priceValue(i.product[2]) * i.quantity, 0))}</p>
                  </div>
                  <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre completo</label>
                    <input value={checkoutForm.nombre} onChange={e => setCheckoutForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Tu nombre" disabled={checkoutState === 'loading'}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
                    <input type="email" value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="tu@email.com" disabled={checkoutState === 'loading'}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Método de pago</label>
                    {metodosDisponibles.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#9ca3af' }}>No hay métodos de pago configurados todavía.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {metodosDisponibles.map(m => (
                          <label key={m.key}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${metodoPago === m.key ? '#0049ff' : '#e5e7eb'}`, background: metodoPago === m.key ? '#eff4ff' : '#fff', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                            <input type="radio" name="metodoPago" value={m.key} checked={metodoPago === m.key}
                              onChange={() => setMetodoPago(m.key)} disabled={checkoutState === 'loading'} />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {checkoutError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                      {checkoutError}
                    </div>
                  )}

                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    {cart.map(({ product, quantity }) => (
                      <div key={product[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '3px 0' }}>
                        <span>{product[0]} ×{quantity}</span>
                        <span style={{ fontWeight: 600 }}>{formatPrice(priceValue(product[2]) * quantity)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#111', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                      <span>Total</span>
                      <span style={{ color: '#0049ff' }}>{formatPrice(cart.reduce((t, i) => t + priceValue(i.product[2]) * i.quantity, 0))}</span>
                    </div>
                  </div>

                  <button onClick={handleCheckout} disabled={checkoutState === 'loading'}
                    style={{ background: checkoutState === 'loading' ? '#93c5fd' : '#0049ff', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: checkoutState === 'loading' ? 'default' : 'pointer', width: '100%', marginTop: 4 }}>
                    {checkoutState === 'loading' ? 'Procesando...' : 'Confirmar pedido'}
                  </button>
                  <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>Tu pedido quedará en estado "Pendiente" hasta confirmar el pago</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Modal de Garantías / devoluciones ---- */}
      {mostrarGarantias && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setMostrarGarantias(false) }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Garantías y devoluciones</h3>
              <button onClick={() => setMostrarGarantias(false)} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {storeConfig.politica_devolucion ? (
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{storeConfig.politica_devolucion}</p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 12px' }}>
                    Todos nuestros productos cuentan con garantía contra defectos de fábrica. Si algo no está en orden, contáctanos y lo resolvemos.
                  </p>
                  {storeConfig.whatsapp && (
                    <a href={`https://wa.me/${storeConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#25d366', color: '#fff', borderRadius: 99, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                      💬 Hablar por WhatsApp
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Modal de inicio de sesión / registro (storefront) ---- */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeLoginModal() }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: '32px 32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', zIndex: 1 }}>

            {/* Cerrar */}
            <button onClick={closeLoginModal} style={{ position: 'absolute', top: 14, right: 14, background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#6b7280', lineHeight: 1 }}>×</button>

            {/* Logo */}
            <div style={{ marginBottom: 20 }}>
              <img src="/storefront/logo.svg" alt="OrderExpress" style={{ height: 40, width: 'auto' }} />
            </div>

            {/* Pestañas */}
            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
              {(['login', 'register'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => { setLoginTab(tab); setLoginError(''); setLoginSuccess('') }}
                  style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    background: loginTab === tab ? '#fff' : 'transparent',
                    color: loginTab === tab ? '#252855' : '#6b7280',
                    boxShadow: loginTab === tab ? '0 2px 8px rgba(37,40,85,0.12)' : 'none',
                  }}>
                  {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            {/* Mensajes globales */}
            {loginError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                {loginError}
              </div>
            )}
            {loginSuccess && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 16 }}>
                {loginSuccess}
              </div>
            )}

            {/* ---- TAB: Login ---- */}
            {loginTab === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
                  <input type="email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="tu@email.com" required autoComplete="email" disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Contraseña</label>
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••" required autoComplete="current-password" disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <button type="submit" disabled={loginLoading}
                  style={{ background: loginLoading ? '#9ca3af' : '#252855', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: loginLoading ? 'default' : 'pointer', marginTop: 2, letterSpacing: '0.01em' }}>
                  {loginLoading ? 'Verificando...' : 'Entrar'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  ¿Sin cuenta?{' '}
                  <button type="button" onClick={() => { setLoginTab('register'); setLoginError('') }}
                    style={{ background: 'none', border: 'none', color: '#e7226d', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Crear una gratis
                  </button>
                </p>
              </form>
            )}

            {/* ---- TAB: Registro ---- */}
            {loginTab === 'register' && !loginSuccess && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Nombre completo</label>
                  <input type="text" value={registerForm.nombre} onChange={e => setRegisterForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Tu nombre" required disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
                  <input type="email" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="tu@email.com" required autoComplete="email" disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Contraseña</label>
                  <input type="password" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres" required disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Confirmar contraseña</label>
                  <input type="password" value={registerForm.confirm} onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repite la contraseña" required disabled={loginLoading}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#252855')} onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
                <button type="submit" disabled={loginLoading}
                  style={{ background: loginLoading ? '#9ca3af' : '#e7226d', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: loginLoading ? 'default' : 'pointer', marginTop: 2, letterSpacing: '0.01em' }}>
                  {loginLoading ? 'Creando cuenta...' : 'Crear mi cuenta'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                  Tu cuenta quedará pendiente hasta que un administrador la active.
                </p>
              </form>
            )}

            {/* Estado post-registro exitoso */}
            {loginTab === 'register' && loginSuccess && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: 52, height: 52, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                <button type="button" onClick={() => { setLoginTab('login'); setLoginSuccess('') }}
                  style={{ background: '#252855', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
                  Ir a iniciar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
