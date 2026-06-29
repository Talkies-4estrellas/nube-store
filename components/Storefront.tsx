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

function loadCartFromStorage(): CartEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/* ---- Componente principal ---- */
export default function Storefront() {
  const router = useRouter()
  const [view, setView] = useState('inicio')
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [topPeriod, setTopPeriod] = useState<'nuevo' | 'ofertas'>('nuevo')
  const [searchValue, setSearchValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailTitle, setDetailTitle] = useState('')
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [qaAnswers, setQaAnswers] = useState<Record<number, string[]>>({})
  const [qaInputs, setQaInputs] = useState<Record<number, string>>({})

  // Carrito persistente en localStorage
  const [cart, setCart] = useState<CartEntry[]>(loadCartFromStorage)

  // Productos y categorías desde Supabase
  const [dbProducts, setDbProducts] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [activeCat, setActiveCat] = useState('Todo')
  const [loadingProducts, setLoadingProducts] = useState(true)

  const gridRef = useRef<HTMLElement>(null)
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0)

  /* ---- Persistir carrito en localStorage ---- */
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart])

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
        supabase.from('categorias').select('nombre').order('nombre'),
      ])
      if (prods) setDbProducts((prods as unknown as SupabaseProduct[]).map(toProduct))
      if (cats) setCategorias(cats.map((c: { nombre: string }) => c.nombre))
      setLoadingProducts(false)
    }
    fetchData()
  }, [])

  /* ---- Carrusel con autoplay (5200ms) ---- */
  const startCarousel = () => {
    if (slideTimer.current) clearInterval(slideTimer.current)
    slideTimer.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slides.length)
    }, 5200)
  }
  useEffect(() => {
    startCarousel()
    return () => { if (slideTimer.current) clearInterval(slideTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const moveCarousel = (index: number) => {
    setCurrentSlide(((index % slides.length) + slides.length) % slides.length)
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
    if (next === 'novedades') setTopPeriod('nuevo')
    if (next === 'ofertas') setTopPeriod('ofertas')
  }

  const addToCart = (title: string) => {
    const product = findProduct(title)
    if (!product) return
    setCart((prev) => {
      const current = prev.find((i) => i.product[0] === title)
      if (current) return prev.map((i) => (i.product[0] === title ? { ...i, quantity: i.quantity + 1 } : i))
      return [...prev, { product, quantity: 1 }]
    })
  }

  const openDetail = (title: string) => {
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

  const toggleBrand = (e: React.MouseEvent) => {
    e.preventDefault()
    setNavCollapsed((c) => !c)
  }

  const activateInGroup = (e: React.MouseEvent<HTMLButtonElement>, selector: string) => {
    const btn = e.currentTarget
    btn.parentElement?.querySelectorAll(selector).forEach((n) => n.classList.remove('active'))
    btn.classList.add('active')
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchValue)
    setView('busqueda')
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

  /* ---- Preview header ---- */
  const preview = (() => {
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

  const ProductCard = ([title, text, price, image, category]: Product) => (
    <article key={title} className="store-product" data-detail-title={title} onClick={(e) => onCardClick(e, title)}>
      <div className="store-product-media">
        <img src={image} alt={title} />
        <button className="icon-button" type="button" aria-label="Guardar"><Ic n="heart" /></button>
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
        key={title}
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
        <aside className="filter-panel">
          <h3>Filtros</h3>
          <button
            className={`category${activeCat === 'Todo' ? ' active' : ''}`}
            type="button"
            onClick={() => setActiveCat('Todo')}
          >
            <Ic n="grid-2x2" /><span>Todo</span><b>{dbProducts.length}</b>
          </button>
          {categorias.map(cat => (
            <button
              key={cat}
              className={`category${activeCat === cat ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveCat(cat)}
            >
              <Ic n="shopping-bag" /><span>{cat}</span><b>{catCounts[cat] ?? 0}</b>
            </button>
          ))}
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

  const renderFavorites = () =>
    dbProducts.slice(0, 4).map(([title, text, price, image, category]) => (
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
          <img src={hero?.[3] ?? slides[0].img} alt="Promo" />
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
          <button className="period-button active" type="button">Continuar pago</button>
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
    const cards: [string, string, string][] = [
      ['message-circle', 'Chat de compra', 'Resuelve dudas sobre productos antes de comprar.'],
      ['truck', 'Envios y rastreo', 'Consulta estados simulados de entrega y tiempos.'],
      ['shield-check', 'Garantias', 'Cambios, devoluciones y cobertura de accesorios.'],
      ['sparkles', 'Asesoria', 'Recomendaciones para elegir tu setup ideal.'],
    ]
    return cards.map(([icon, title, text]) => (
      <article key={title} className="support-card">
        <Ic n={icon} />
        <h3>{title}</h3>
        <p>{text}</p>
        <button className="round-button dark" type="button" aria-label={title}><Ic n="arrow-right" /></button>
      </article>
    ))
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
            <button className="period-button" type="button">Preguntar</button>
          </div>
          <div className="question-list">
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
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="sidebar-head">
          <a className="brand" href="#" aria-label={navCollapsed ? 'Desplegar navegacion' : 'Contraer navegacion'} aria-expanded={!navCollapsed} onClick={toggleBrand}>
            <img className="brand-logo full" src="/storefront/logo.svg" alt="OrderExpress" />
            <img className="brand-logo mark" src="/storefront/monograma.svg" alt="OrderExpress" />
          </a>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
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
              <p className="eyebrow">Ecommerce preview</p>
              <h1>Compra tech con estilo express.</h1>
            </div>

            <div className="top-actions" aria-label="Acciones superiores">
              <button className={`period-button${topPeriod === 'nuevo' ? ' active' : ''}`} type="button" onClick={() => goView('novedades')}>Nuevo</button>
              <button className={`period-button${topPeriod === 'ofertas' ? ' active' : ''}`} type="button" onClick={() => goView('ofertas')}>Ofertas</button>
              <form className="search-box" onSubmit={onSearchSubmit} role="search">
                <Ic n="search" />
                <input type="search" placeholder="Buscar productos" aria-label="Buscar productos" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
                <button type="submit" aria-label="Buscar"><Ic n="arrow-right" /></button>
              </form>
              <button className="icon-button dark" type="button" aria-label="Carrito" onClick={openCart}><Ic n="shopping-cart" /><span>{cartCount}</span></button>
              <button className="login-button" type="button" aria-label="Iniciar sesion" onClick={() => router.push('/dashboard')}><Ic n="log-in" /><span>Iniciar sesion</span></button>
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
              {slides.map((slide, i) => (
                <article key={i} className={`carousel-slide${i === currentSlide ? ' active' : ''}`}>
                  <img src={slide.img} alt={slide.alt} />
                  <div className="carousel-caption">
                    <span>{slide.kicker}</span>
                    <h2>{slide.title}</h2>
                  </div>
                </article>
              ))}
            </div>

            <div className="carousel-controls">
              <div className="carousel-dots" aria-label="Seleccionar foto">
                {slides.map((_, i) => (
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
              <a className="text-link" href="#" onClick={(e) => { e.preventDefault(); goView('catalogo') }}>Ver catalogo <Ic n="arrow-right" /></a>
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
    </div>
  )
}
