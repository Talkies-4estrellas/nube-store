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

/* ----------------------------------------------------------------------------
   Iconos lucide (reemplaza los <i data-lucide="..."> del diseño original)
---------------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------------
   Datos (portados tal cual desde Diseño/script.js)
---------------------------------------------------------------------------- */
const productImage = {
  keyboard: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=700&q=80',
  console: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=700&q=80',
  display: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=700&q=80',
  audio: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80',
  charger: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=700&q=80',
  gamepad: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=700&q=80',
}

type Product = [string, string, string, string, string]

const products: Product[] = [
  ['MECHANICAL GREEN KEYS.', 'Teclado compacto RGB con switches tactiles.', '$1,980', productImage.keyboard, 'Keyboards'],
  ['CONTROL EVERY MOVE.', 'Consola portatil con pantalla amplia.', '$2,890', productImage.console, 'Gaming'],
  ['SMART LIVING DISPLAY.', 'Mini display para calendario y musica.', '$1,650', productImage.display, 'Smart'],
  ['SOUND WITHOUT LIMITS.', 'Audifonos premium con cancelacion.', '$1,240', productImage.audio, 'Audio'],
  ['FAST POWER KIT.', 'Cargador rapido con cable reforzado.', '$540', productImage.charger, 'Accesorios'],
  ['RETRO GAMEPAD.', 'Control inalambrico inspirado en clasicos.', '$890', productImage.gamepad, 'Gaming'],
  ['DESK POWER MINI.', 'Hub compacto para escritorio y consola.', '$720', productImage.charger, 'Accesorios'],
  ['LOW PROFILE KEYS.', 'Teclado silencioso para trabajo y juego.', '$1,430', productImage.keyboard, 'Keyboards'],
]

type Detail = { summary: string; longDescription: string; specs: string[]; gallery: string[] }

const productDetails: Record<string, Detail> = {
  'MECHANICAL GREEN KEYS.': {
    summary: 'Un teclado mecanico compacto para setups limpios, con respuesta tactil, iluminacion RGB y cuerpo firme para sesiones largas.',
    longDescription: 'Pensado para escritorios compactos, este teclado combina una escritura precisa con un formato que deja mas espacio para mouse, libreta o accesorios. La iluminacion por tecla ayuda a ubicar comandos rapidamente, mientras que el cuerpo rigido mantiene una sensacion estable tanto para trabajar como para jugar. Es una buena opcion si quieres mejorar tu setup sin ocupar toda la mesa.',
    specs: ['Switches tactiles', 'Formato 75%', 'RGB por tecla', 'Cable USB-C'],
    gallery: [
      productImage.keyboard,
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'CONTROL EVERY MOVE.': {
    summary: 'Consola portatil con controles responsivos, pantalla amplia y agarre comodo para jugar en escritorio, sofa o viaje.',
    longDescription: 'Esta consola esta pensada para sesiones casuales y partidas largas sin depender de un monitor. Su pantalla amplia facilita leer menus y detalles del juego, mientras que los controles integrados reducen el tiempo de preparacion. Funciona bien como dispositivo principal para juegos ligeros o como companera de viaje para mantener tu biblioteca cerca.',
    specs: ['Pantalla amplia', 'Controles responsivos', 'Bateria extendida', 'Modo portatil'],
    gallery: [
      productImage.console,
      productImage.gamepad,
      'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'SMART LIVING DISPLAY.': {
    summary: 'Mini display inteligente para calendario, musica, recordatorios y notificaciones rapidas sin llenar tu escritorio.',
    longDescription: 'Un accesorio pequeno para ordenar tu dia desde el escritorio. Sirve como punto rapido para ver recordatorios, controlar musica y consultar informacion importante sin abrir otra pantalla grande. Su formato compacto lo hace facil de colocar junto al teclado, en una repisa o cerca de la zona de carga.',
    specs: ['Pantalla compacta', 'Control tactil', 'Audio integrado', 'Modo escritorio'],
    gallery: [
      productImage.display,
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'SOUND WITHOUT LIMITS.': {
    summary: 'Audifonos premium con cancelacion, estuche magnetico y sonido definido para trabajo, musica y llamadas.',
    longDescription: 'Disenados para moverte entre musica, llamadas y concentracion sin cambiar de equipo. La cancelacion ayuda en espacios con ruido, y el estuche magnetico mantiene todo protegido cuando no los usas. Son una opcion equilibrada para quien quiere audio claro, buen microfono y carga rapida en un paquete compacto.',
    specs: ['Cancelacion activa', 'Estuche magnetico', 'Microfono integrado', 'Carga rapida'],
    gallery: [
      productImage.audio,
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'FAST POWER KIT.': {
    summary: 'Kit de carga rapida con cable reforzado para mantener tu consola, telefono y accesorios listos todo el dia.',
    longDescription: 'Este kit cubre el punto mas practico del setup: energia confiable. El cable reforzado soporta uso diario y la carga rapida reduce tiempos muertos entre sesiones. Es ideal para tenerlo fijo en el escritorio o llevarlo en mochila como respaldo para telefono, consola y audifonos.',
    specs: ['Carga rapida', 'Cable reforzado', 'USB-C', 'Proteccion termica'],
    gallery: [
      productImage.charger,
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'RETRO GAMEPAD.': {
    summary: 'Control inalambrico inspirado en clasicos, con formato compacto y botones suaves para partidas casuales.',
    longDescription: 'Un control para quienes quieren una sensacion retro sin renunciar a conexion moderna. Su formato compacto es comodo para juegos clasicos, plataformas y partidas casuales. La bateria recargable evita depender de pilas, y los botones suaves ayudan a mantener una respuesta agradable durante mas tiempo.',
    specs: ['Conexion inalambrica', 'Bateria recargable', 'Botones suaves', 'Diseno retro'],
    gallery: [
      productImage.gamepad,
      'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'DESK POWER MINI.': {
    summary: 'Hub compacto para escritorio con puertos esenciales, ideal para conectar accesorios sin saturar tu espacio.',
    longDescription: 'Una solucion discreta para ampliar conexiones sin llenar el escritorio de cables. El formato compacto facilita colocarlo cerca de la laptop o consola, y la base antideslizante ayuda a mantenerlo fijo. Es util para usuarios que conectan teclado, audio, almacenamiento o cargadores durante el dia.',
    specs: ['Multipuerto', 'Formato compacto', 'USB-C', 'Base antideslizante'],
    gallery: [
      productImage.charger,
      'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80',
    ],
  },
  'LOW PROFILE KEYS.': {
    summary: 'Teclado de perfil bajo y escritura silenciosa para cambiar entre productividad y juego sin cansancio.',
    longDescription: 'Una opcion ligera para quienes prefieren una escritura mas baja y silenciosa. El recorrido corto ayuda a escribir rapido durante trabajo, clases o chat, y su conexion estable mantiene una respuesta consistente. Combina bien con setups minimalistas donde importa tanto la comodidad como el espacio disponible.',
    specs: ['Perfil bajo', 'Switches silenciosos', 'Conexion estable', 'Teclas suaves'],
    gallery: [
      productImage.keyboard,
      'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
    ],
  },
}

const reviewSamples: [string, string, string][] = [
  ['Mariana R.', 'Lo compre para mi escritorio y se siente mucho mas premium de lo que esperaba. La entrega fue rapida y el empaque llego impecable.', '5.0'],
  ['Carlos M.', 'Buen balance entre diseno y utilidad. Me gusto que no se siente fragil y que los controles son faciles de entender.', '4.8'],
  ['Andrea S.', 'Lo uso diario y hasta ahora todo perfecto. La descripcion coincide con lo que recibi.', '4.9'],
]

const questionSamples: [string, string][] = [
  ['Incluye garantia?', 'Si, incluye garantia de 12 meses contra defectos de fabrica.'],
  ['Cuanto tarda el envio?', 'El envio estimado es de 2 a 5 dias habiles dependiendo de la ciudad.'],
  ['Se puede pagar a meses?', 'En esta vista demo se muestra como compra directa, pero se puede agregar la opcion de meses sin problema.'],
]

const views: Record<string, { kicker: string; title: string; text: string; chips: string[] }> = {
  inicio: { kicker: 'Inicio', title: 'Seleccion curada para tu setup.', text: 'Explora productos destacados, categorias populares y accesorios listos para comprar.', chips: ['Entrega rapida', 'Stock limitado', 'Garantia incluida'] },
  catalogo: { kicker: 'Catalogo', title: 'Tienda en linea con productos, precios y filtros.', text: 'Ahora se muestra como un catalogo real: barra de busqueda, categorias, cards repetibles y acciones de compra.', chips: ['8 productos', 'Filtros visibles', 'Grid ecommerce'] },
  novedades: { kicker: 'Novedades', title: 'Lanzamientos con formato editorial.', text: 'Una seccion mas aspiracional para mostrar drops recientes, preventas y productos limitados.', chips: ['Nuevo drop', 'Edicion limitada', 'Preventa'] },
  favoritos: { kicker: 'Favoritos', title: 'Wishlist con comparacion rapida.', text: 'Los productos guardados aparecen como una lista compacta con estado, precio y boton de compra.', chips: ['3 guardados', 'Comparar', 'Disponible'] },
  ofertas: { kicker: 'Ofertas', title: 'Promos con impacto visual de campana.', text: 'Bloques de descuento, bundles y piezas limitadas para que se sienta como una pagina comercial.', chips: ['Hasta 35%', 'Envio gratis', 'Ultimas piezas'] },
  carrito: { kicker: 'Carrito', title: 'Resumen de compra listo para pagar.', text: 'Una vista de checkout simulada con articulos, subtotal, envio y total.', chips: ['3 articulos', 'Total $5,370', 'Checkout'] },
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

/* ----------------------------------------------------------------------------
   Helpers
---------------------------------------------------------------------------- */
const priceValue = (price: string) => Number(price.replace(/[$,]/g, '')) || 0
const formatPrice = (value: number) => `$${value.toLocaleString('en-US')}`
const findProduct = (title: string) => products.find((p) => p[0] === title)
const bump = (el: Element) =>
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
    { duration: 220, easing: 'ease-out' },
  )

type CartEntry = { product: Product; quantity: number }

/* ----------------------------------------------------------------------------
   Componente principal
---------------------------------------------------------------------------- */
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
  const [cart, setCart] = useState<CartEntry[]>([
    { product: products[1], quantity: 1 },
    { product: products[3], quantity: 1 },
    { product: products[4], quantity: 1 },
  ])

  const gridRef = useRef<HTMLElement>(null)
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0)

  /* --- Carrusel con autoplay (5200ms) --- */
  const startCarousel = () => {
    if (slideTimer.current) clearInterval(slideTimer.current)
    slideTimer.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slides.length)
    }, 5200)
  }
  useEffect(() => {
    startCarousel()
    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const moveCarousel = (index: number) => {
    setCurrentSlide(((index % slides.length) + slides.length) % slides.length)
    startCarousel()
  }

  /* --- Navegacion / acciones --- */
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

  // Replica activateGroup(".category") / swatches: toggle de clase entre hermanos
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

  // Card clickeable que abre detalle, salvo que el click sea sobre un boton/link interno
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

  /* --- Preview header dependiente de la vista --- */
  const preview = (() => {
    if (view === 'producto') {
      const product = findProduct(detailTitle)
      const detail = product ? productDetails[detailTitle] : undefined
      return {
        kicker: product ? product[4] : 'Producto',
        title: detailTitle,
        text: detail?.summary ?? (product ? product[1] : ''),
        chips: ['Detalle', 'Galeria', 'Antes de comprar'],
      }
    }
    if (view === 'busqueda') {
      const q = searchQuery.trim()
      const nq = q.toLowerCase()
      const results = products.filter(([t, x, , , c]) => [t, x, c].some((v) => v.toLowerCase().includes(nq)))
      return {
        kicker: 'Busqueda',
        title: nq ? `Resultados para "${q}".` : 'Busca productos por nombre o categoria.',
        text: results.length
          ? `Se encontraron ${results.length} productos en esta simulacion.`
          : 'No hay coincidencias; prueba con keyboard, gaming, audio o accesorios.',
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

  /* --- Boton "agregar" reutilizable --- */
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

  /* --- Contenido del #catalogGrid por vista --- */
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

  const renderHome = () => {
    const cards: [string, string, string, string][] = [
      ['CONTROL EVERY MOVE.', 'Consola portatil con controles responsivos y pantalla amplia.', '$2,890', productImage.console],
      ['SMART LIVING DISPLAY.', 'Mini pantalla para notificaciones, calendario y musica.', '$1,650', productImage.display],
      ['SOUND WITHOUT LIMITS.', 'Audifonos compactos con cancelacion y estuche magnetico.', '$1,240', productImage.audio],
    ]
    return cards.map(([title, text, price, image], index) => (
      <article
        key={title}
        className={`product-card ${index === 1 ? 'wide' : index === 2 ? 'compact' : 'tall'}`}
        data-detail-title={title}
        onClick={(e) => onCardClick(e, title)}
      >
        {index === 1 ? (
          <>
            <div>
              <span className="pill">Preview</span>
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
              <span className="pill">{index === 2 ? 'Recomendado' : 'Producto'}</span>
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

  const renderCatalog = () => (
    <>
      <aside className="filter-panel">
        <h3>Filtros</h3>
        <button className="category active" type="button" onClick={(e) => activateInGroup(e, '.category')}><Ic n="grid-2x2" /><span>Todo</span><b>8</b></button>
        <button className="category" type="button" onClick={(e) => activateInGroup(e, '.category')}><Ic n="keyboard" /><span>Keyboards</span><b>2</b></button>
        <button className="category" type="button" onClick={(e) => activateInGroup(e, '.category')}><Ic n="gamepad-2" /><span>Gaming</span><b>2</b></button>
        <button className="category" type="button" onClick={(e) => activateInGroup(e, '.category')}><Ic n="speaker" /><span>Audio</span><b>1</b></button>
        <div className="range-card">
          <span>Rango de precio</span>
          <strong>$390 - $2,890</strong>
          <div></div>
        </div>
      </aside>
      <div className="store-grid">{products.map(ProductCard)}</div>
    </>
  )

  const renderDrops = () => (
    <>
      <article className="drop-feature" data-detail-title="RETRO GAMEPAD." onClick={(e) => onCardClick(e, 'RETRO GAMEPAD.')}>
        <img src={productImage.gamepad} alt="Consola retro" />
        <div>
          <span className="pill live"><Ic n="sparkles" /> Nuevo lanzamiento</span>
          <h3>POCKET-SIZE NOSTALGIA.</h3>
          <p>Un drop inspirado en consolas retro, preparado para preventa con unidades limitadas.</p>
          <div className="price-row">
            <strong>$2,490</strong>
            <AddButton title="RETRO GAMEPAD." dark label="Agregar lanzamiento" />
          </div>
        </div>
      </article>
      <article className="release-card"><span>01</span><h3>TYPE SMARTER.</h3><p>Teclado verde de perfil bajo.</p></article>
      <article className="release-card"><span>02</span><h3>HELLO FRIEND.</h3><p>Mini display naranja para escritorio.</p></article>
      <article className="release-card"><span>03</span><h3>POWER MINI.</h3><p>Hub compacto para accesorios.</p></article>
    </>
  )

  const renderFavorites = () =>
    products.slice(1, 5).map(([title, text, price, image, category]) => (
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
    const deals: [string, string, string, string][] = [
      ['RETRO GAMEPAD.', '$890', '$690', productImage.gamepad],
      ['FAST POWER KIT.', '$540', '$390', productImage.charger],
      ['SMART LIVING DISPLAY.', '$1,650', '$1,390', productImage.display],
    ]
    return (
      <>
        <article className="deal-hero">
          <div>
            <span className="pill live"><Ic n="sparkles" /> Flash sale</span>
            <h3>35% OFF EN GAMING.</h3>
            <p>Bundles simulados para dar sensacion real de campana promocional.</p>
          </div>
          <img src={productImage.console} alt="Promo gaming" />
        </article>
        {deals.map(([title, oldPrice, price, image]) => (
          <article key={title} className="deal-card" data-detail-title={title} onClick={(e) => onCardClick(e, title)}>
            <img src={image} alt={title} />
            <h3>{title}</h3>
            <p><s>{oldPrice}</s> <strong>{price}</strong></p>
            <button className="period-button active" type="button" onClick={(e) => { addToCart(title); bump(e.currentTarget) }}>Agregar oferta</button>
          </article>
        ))}
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
            {cart.map(({ product, quantity }) => {
              const [title, , price, image, category] = product
              return (
                <article key={title} className="cart-item">
                  <img src={image} alt={title} />
                  <div>
                    <span>{category}</span>
                    <h3>{title}</h3>
                    <p>Cantidad {quantity} x {price}</p>
                  </div>
                  <strong>{formatPrice(priceValue(price) * quantity)}</strong>
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
    const results = products.filter(([t, x, , , c]) => [t, x, c].some((v) => v.toLowerCase().includes(nq)))
    return (
      <>
        <aside className="filter-panel">
          <h3>Busqueda</h3>
          <button className="category active" type="button"><Ic n="search" /><span>{label}</span><b>{results.length}</b></button>
          <div className="range-card">
            <span>Sugerencias</span>
            <strong>keyboard, gaming, audio</strong>
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
              <p>No encontramos productos con ese termino en la muestra.</p>
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
    const detail = productDetails[title] || {
      summary: text,
      longDescription: text,
      specs: ['Disponible', 'Garantia incluida', 'Envio rapido', 'Compra segura'],
      gallery: [image],
    }
    const gallery = detail.gallery.length ? detail.gallery : [image]
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
          <p>{detail.summary}</p>
          <strong className="detail-price">{price}</strong>

          <div className="product-options" aria-label="Opciones del producto">
            <span>Color</span>
            <div>
              <button className="swatch active" type="button" aria-label="Color negro" onClick={(e) => activateInGroup(e, '.swatch')}></button>
              <button className="swatch blue" type="button" aria-label="Color azul" onClick={(e) => activateInGroup(e, '.swatch')}></button>
              <button className="swatch pink" type="button" aria-label="Color rosa" onClick={(e) => activateInGroup(e, '.swatch')}></button>
            </div>
          </div>

          <div className="detail-actions">
            <button className="period-button active" type="button" onClick={(e) => { addToCart(title); bump(e.currentTarget) }}>Agregar al carrito</button>
            <button className="period-button" type="button" onClick={() => buyNow(title)}>Comprar ahora</button>
          </div>

          <div className="product-specs">
            {detail.specs.map((spec) => (
              <span key={spec}><Ic n="check" />{spec}</span>
            ))}
          </div>
        </aside>

        <section className="detail-section product-story">
          <span>Descripcion completa</span>
          <h3>Todo lo que debes saber antes de comprar.</h3>
          <p>{detail.longDescription || detail.summary}</p>
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
              <a className="text-link" href="#">Ver coleccion <Ic n="arrow-right" /></a>
            </div>
            <img src="https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80" alt="Teclado mecanico verde" />
          </article>

          <article className="hero-card console">
            <div className="hero-copy">
              <h2>POCKET-SIZE<br />NOSTALGIA.</h2>
              <p>Juega clasicos con diseno moderno.</p>
              <a className="text-link gold" href="#">Conocer <Ic n="arrow-right" /></a>
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
