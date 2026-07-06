# Módulos UI — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · [Datos](./datos.md) · **Módulos UI** · [Operaciones y recursos](./operaciones.md) · [Mantenimiento](./mantenimiento.md) · [Inteligencia artificial](./ia.md)
>
> Inventario de archivos: qué hace cada página, componente y utilidad, con sus estados, constantes, funciones y operaciones Supabase. Consultar antes de tocar un archivo para no pisar estados existentes.

---

## Layout y shell

### `app/layout.tsx`
Root layout. Envuelve en `<AuthProvider>` y `<AppChrome>`. Tiene `suppressHydrationWarning` en `<html>` y `<body>` (fix para extensión ColorZilla).

```ts
metadata = { title: 'Order Express | Panel Administrativo', description: '...' }
```

---

### `components/AppChrome.tsx`
Shell del admin.

**Constantes locales:** `NAVY`, `PINK`, `PUBLIC_PATHS`, `ROLE_LABELS`, `ROLE_HOME`

**Lógica:**
- Si pathname ∈ `PUBLIC_PATHS` → renderiza `children` sin chrome
- Si `loading` → spinner centrado
- Si no hay `user` → renderiza chrome igual (sin redirección forzada)
- Si hay `user` → verifica `canAccess()` y muestra `<AccessDenied>` si no pasa

**Componente interno:** `AccessDenied({ role })` con link a `ROLE_HOME[role]`

---

### `components/Sidebar.tsx`
Navegación lateral fija (240px).

**Constantes:** `NAVY`, `PINK`, `ALL_SECTIONS` (estructura de nav), `ROLE_BADGE`

**Estado:** `solicitudesPendientes: number` — count de `solicitudes_productos` donde `estado='pendiente'`

**Estructura de nav:**
- INICIO: Dashboard
- GESTIÓN: Ventas, Productos, Clientes, Envíos
- CANALES: Tienda en línea, Punto de venta
- Configuración (solo `admin`) con badge PINK cuando hay solicitudes pendientes

**Estilo activo:** fondo blanco + `border: 2px solid NAVY` + `boxShadow: '0 6px 16px rgba(37,40,85,0.12)'`
**Área nav:** `background: '#f1f2f6'`, `borderRadius: 22`, `padding: '12px 10px'`

---

### `components/Topbar.tsx`
Barra superior fija (56px).

**Estados:** `searchOpen`, `query`, `results`, `searching`

**Búsqueda inline:** productos (nombre/sku ilike), clientes (nombre/email ilike), ventas (numero). Debounced 280ms.

---

### `components/GlobalSearch.tsx`
Modal Ctrl+K.

**Constante:** `NAVY`

**Estados:** `open`, `query`, `resultados`, `loading`, `selIdx`

**Búsqueda:** activa cuando `query.length >= 2`. Debounced 250ms. Resultados de `productos`, `ventas`, `clientes`. Navegable con ↑↓↵.

---

## Utilidades (`lib/`)

### `lib/supabase.ts`
Exporta `supabase: SupabaseClient`. Usa `createBrowserClient` de `@supabase/ssr`. Si faltan env vars, exporta mock con stubs vacíos para `.from()`, `.auth`, `.storage`, `.channel()`, `.removeChannel()`.

---

### `lib/auth-context.tsx`
Exporta: `AuthProvider`, `useAuth()`, `canAccess()`, tipos `Role` y `AuthUser`.

`AuthUser = { id: string, email: string, nombre: string, role: Role }`

`useAuth()` devuelve `{ user: AuthUser | null, loading: boolean, signOut: () => void }`

---

### `lib/validation.ts`
Exporta `isValidEmail(email: string): boolean`. Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`

Usada en: checkout de tienda, registro en tienda, formulario de proveedores.

---

### `lib/uploadWebp.ts`
Exporta:
- `convertToWebp(file, quality=0.82): Promise<File>` — Canvas API, solo funciona en browser
- `captureFrameAsWebp(video, quality=0.82): Promise<File>` — captura frame de `<video>`
- `uploadToSupabase(file, client, bucket, path): Promise<string>` — devuelve `publicUrl`

**Sanitización de path (en `app/productos/page.tsx`):**
```ts
const safeSku = form.sku.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
const path = `${Date.now()}-${safeSku || 'producto'}.webp`
```

> El proceso completo de conversión y subida de imágenes está en [Operaciones y recursos](./operaciones.md).

---

## Páginas del panel

### `app/login/page.tsx` — `/login`
**Estados:** `email`, `password`, `loading`, `error`

**Flujo:** `signInWithPassword` → consulta `user_roles` → redirige. Al montar verifica sesión activa.

---

### `app/dashboard/page.tsx` — `/dashboard`
**Constantes:** `NAVY`, `PINK`, `BLUE`, `statusColor`, `statusText`, `periodoLabel`

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `ventas` | `Venta[]` | `[]` |
| `ventasPeriodo` | `VentaGrafica[]` | `[]` |
| `stockBajo` | `ProductoBajo[]` | `[]` |
| `totalClientes` | `number` | `0` |
| `loading` | `boolean` | `true` |
| `periodo` | `'hoy' \| 'semana' \| 'mes'` | `'semana'` |
| `loadingPeriodo` | `boolean` | `false` |
| `toasts` | `Toast[]` | `[]` |
| `topMetrics` | `TopMetric[]` | `[]` |

**Funciones:** `addToast()`, `getPeriodoStart()`, `buildChartData()`, `load()`, `loadPeriodo()`

**Componente interno:** `GraficaBarras({ data })` — SVG de barras con hover

**Realtime:** channel `dashboard-stock-realtime` escucha UPDATE en `productos` → toast cuando stock = 0 o ≤ 3

**Supabase (lecturas):**
- `ventas` select `*, clientes(nombre)` order `created_at` desc limit 5
- `productos` select `nombre, stock` where `stock <= 3`
- `clientes` count
- `venta_items` select `nombre, cantidad, productos(categorias(nombre))`
- `ventas` select `cliente_id, total, clientes(nombre)` where `estado = 'Pagado'`
- `ventas` select `total, estado, created_at` where `created_at >= periodoStart`

---

### `app/productos/page.tsx` — `/productos`
**Constantes:** `PAGE_SIZE = 12`, `estadoStyle`, `paletaColores`

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `products` | `Product[]` | `[]` |
| `categorias` | `string[]` | `[]` |
| `loading` | `boolean` | `true` |
| `search` | `string` | `''` |
| `categoria` | `string` | `'Todas'` |
| `view` | `'grid' \| 'list'` | `'grid'` |
| `showModal` | `boolean` | `false` |
| `editando` | `Product \| null` | `null` |
| `confirmDelete` | `Product \| null` | `null` |
| `page` | `number` | `1` |
| `sortBy` | `'nombre' \| 'precio' \| 'stock'` | `'nombre'` |
| `sortDir` | `'asc' \| 'desc'` | `'asc'` |

**Funciones:** `fetchCategorias()`, `fetchProducts()`, `handleSave(form)`, `handleDelete(product)`, `toggleSort(col)`

**Supabase:** Lee `categorias`, `productos_con_estado`. Escribe `categorias` (insert), `productos` (insert/update/delete). Storage bucket `productos` (upload/remove).

**Imports externos:** `ProductoModal`, `ConfirmDialog`, `Icon`, `SkeletonCard`, `SkeletonTableBody`, `uploadToSupabase`

---

### `app/ventas/page.tsx` — `/ventas`
**Constantes:**
```ts
PAGE_SIZE = 15
estadosSig = {
  Pendiente:  ['Pagado', 'Cancelado'],
  Pagado:     ['Enviado', 'Cancelado'],
  Enviado:    [],
  Cancelado:  [],
}
PIPELINE = ['Pendiente', 'Pagado', 'Enviado']
statuses = ['Todos', 'Pendiente', 'Pagado', 'Enviado', 'Cancelado']
```

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `ventas` | `Venta[]` | `[]` |
| `loading` | `boolean` | `true` |
| `search` | `string` | `''` |
| `statusFilter` | `string` | `'Todos'` |
| `showModal` | `boolean` | `false` |
| `detalle` | `Venta \| null` | `null` |
| `items` | `VentaItem[]` | `[]` |
| `loadingItems` | `boolean` | `false` |
| `cambiandoEstado` | `string \| null` | `null` |
| `page` | `number` | `1` |

**Funciones:** `fetchVentas()`, `abrirDetalle(v)`, `cambiarEstado(venta, nuevoEstado)`, `imprimirVenta(venta, items)`

**Supabase:** Lee `ventas` (con `clientes(nombre, email)`), `venta_items`. Escribe `ventas` (update estado).

---

### `app/clientes/page.tsx` — `/clientes`
**Constantes:** `PAGE_SIZE = 15`, `tagStyle`, `tags`, `AVATAR_COLORS`

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `clientes` | `Cliente[]` | `[]` |
| `loading` | `boolean` | `true` |
| `search` | `string` | `''` |
| `tagFilter` | `string` | `'Todos'` |
| `selected` | `Cliente \| null` | `null` |
| `showModal` | `boolean` | `false` |
| `editando` | `Cliente \| null` | `null` |
| `confirmDelete` | `Cliente \| null` | `null` |
| `deleting` | `boolean` | `false` |
| `page` | `number` | `1` |
| `sortBy` | `'nombre' \| 'total_gastado' \| 'total_pedidos' \| 'ultima_compra'` | `'nombre'` |
| `sortDir` | `'asc' \| 'desc'` | `'asc'` |
| `historial` | `Venta[]` | `[]` |
| `loadingHistorial` | `boolean` | `false` |
| `showHistorial` | `boolean` | `false` |

**Funciones:** `fetchClientes()` (incluye enriquecimiento con ventas — N+1 queries), `fetchHistorial(clienteId)`, `handleDelete(c)` (soft-delete: update `deleted_at`)

**Supabase:** Lee `clientes` (is `deleted_at` null), `ventas` (por cliente, estado Pagado). Escribe `clientes` (update `deleted_at`).

---

### `app/punto-de-venta/page.tsx` — `/punto-de-venta`
**Constantes:** `NAVY`, `BLUE`, `PINK`, `GREEN`, `METODOS`, `paletaColores`

```ts
METODOS = [
  { id: 'Efectivo',     icon: '💵' },
  { id: 'Tarjeta',      icon: '💳' },
  { id: 'Transferencia', icon: '🏦' },
]
```

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `productos` | `Producto[]` | `[]` |
| `categorias` | `string[]` | `[]` |
| `carrito` | `ItemCarrito[]` | `[]` |
| `search` | `string` | `''` |
| `catFilter` | `string` | `'Todas'` |
| `metodo` | `MetodoPago` | `'Efectivo'` |
| `efectivo` | `string` | `''` |
| `clienteNombre` | `string` | `''` |
| `loading` | `boolean` | `true` |
| `procesando` | `boolean` | `false` |
| `pantalla` | `'caja' \| 'exito'` | `'caja'` |
| `ventaExito` | `{ numero, total } \| null` | `null` |
| `error` | `string` | `''` |

**Funciones:** `load()`, `agregarAlCarrito(p)`, `cambiarCantidad(id, delta)`, `quitarItem(id)`, `cobrar()`, `nuevaVenta()`

**Flujo de `cobrar()`:**
1. Verifica stock actual en DB (select `id, stock, nombre` in ids del carrito)
2. Busca cliente por nombre (ilike) en `clientes` → si no existe crea uno con `email: ${Date.now()}@pos.local`
3. INSERT en `ventas` con `estado = 'Pagado'`, `notas = 'POS · {metodo}'`
4. INSERT en `venta_items` (array)

**Supabase:** Lee `productos_con_estado` (neq estado 'Sin stock'), `categorias`, `productos` (verificación pre-cobro). Escribe `clientes` (select/insert), `ventas` (insert), `venta_items` (insert).

---

### `app/proveedores/page.tsx` — `/proveedores`
**Constantes:** `NAVY`, `PINK`, `DRAFT_KEY = 'proveedor_draft_v1'`, `EMAIL_KEY = 'proveedor_email_saved'`

**Layout:** dos columnas — sidebar fija 240px (igual al admin) + área principal con topbar sticky

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `tab` | `'registro' \| 'historial'` | `'registro'` |
| `savedEmail` | `string` | `''` |
| `formState` | `'idle' \| 'loading' \| 'success' \| 'error'` | `'idle'` |
| `errorMsg` | `string` | `''` |
| `categorias` | `Categoria[]` | `[]` |
| `dragging` | `boolean` | `false` |
| `convirtiendo` | `boolean` | `false` |
| `nuevaCatMode` | `boolean` | `false` |
| `nuevaCatNombre` | `string` | `''` |
| `savingCat` | `boolean` | `false` |
| `productos` | `ProductoLocal[]` | `[]` |
| `prod` | `ProductoLocal` | `emptyProducto()` |
| `prodError` | `string` | `''` |
| `historialEmail` | `string` | `''` |
| `historialItems` | `[...] \| null` | `null` |
| `loadingHistorial` | `boolean` | `false` |
| `historialError` | `string` | `''` |
| `proveedor` | `{ nombre, empresa, email, telefono }` | todo `''` |

**Funciones:** `consultarHistorial()`, `handleFile(file)`, `guardarNuevaCat()`, `agregarProducto()`, `eliminarProducto(i)`, `handleSubmit(e)`, `resetForm()`

**Auto-carga al montar:** si `localStorage.getItem(EMAIL_KEY)` existe → `setTab('historial')` + consulta historial automáticamente

**Auto-guardado borrador:** useEffect debounced 800ms en cambios de `proveedor`/`prod` → `localStorage.setItem(DRAFT_KEY, ...)`

**Supabase:** Lee `categorias`, `solicitudes_productos` (by email). Escribe `categorias` (insert), `solicitudes_productos` (insert). Storage bucket `productos`, path `solicitudes/{timestamp}-{sku}.webp`.

---

### `app/configuracion/page.tsx` — `/configuracion`
**Constantes:** `ALL_NAV` (secciones: negocio, contacto, pagos, notificaciones, solicitudes, usuarios), `monedas`, `ROLE_LABEL`, `ROLE_BADGE`

**Secciones:** `negocio`, `contacto`, `pagos`, `notificaciones`, `solicitudes` (admin only), `usuarios` (admin only)

**Estados:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `section` | `Section` | `'negocio'` |
| `saved` | `boolean` | `false` |
| `usuarios` | `UserRow[]` | `[]` |
| `loadingUsuarios` | `boolean` | `false` |
| `editingRole` | `{ id, role } \| null` | `null` |
| `savingRole` | `boolean` | `false` |
| `solicitudes` | `Solicitud[]` | `[]` |
| `loadingSolicitudes` | `boolean` | `false` |
| `filtroEstado` | `'todas' \| 'pendiente' \| 'aprobado' \| 'rechazado'` | `'pendiente'` |
| `updatingId` | `string \| null` | `null` |
| `expandedId` | `string \| null` | `null` |
| `negocio` | `{ nombre, moneda, zona, idioma }` | cargado de `config_storefront` al montar |
| `contacto` | `{ email, telefono, whatsapp, direccion, ciudad, pais }` | cargado de `config_storefront` |
| `pagos` | `{ efectivo, transferencia, tarjeta, mercadopago }` | `true/true/false/false` |
| `notif` | `{ stock_bajo, nueva_venta, email_resumen }` | `true/true/false` |
| `heroTitulo` | `string` | cargado de `config_storefront` |
| `heroSubtitulo` | `string` | cargado de `config_storefront` |
| `heroCta` | `string` | cargado de `config_storefront` |

**Funciones:** `fetchUsuarios()`, `saveRole()`, `fetchSolicitudes()`, `cambiarEstado(id, estado)`, `deleteUser(u)`, `handleSave()` (UPDATE real en `config_storefront`)

**Supabase:** Lee `config_storefront` (id=1), `user_roles`, `solicitudes_productos` (con join `categorias`). Escribe `config_storefront` (update), `user_roles` (update role, delete), `solicitudes_productos` (update estado).

**Componentes internos:** `Card`, `Field`, `Toggle`

---

## Tienda pública

### `components/Storefront.tsx` — `/`
**Constante de cart:** `CART_KEY = 'oe_cart'`

**Config de tienda:** estado `storeConfig` cargado desde `config_storefront` (id=1) al montar. Campos: `nombre_tienda`, `hero_titulo`, `hero_subtitulo`, `hero_cta`, `color_acento`, `whatsapp`, `email_contacto`, `instagram`.

**Valores por defecto de storeConfig:**
```ts
{
  nombre_tienda: 'OrderExpress',
  hero_titulo: 'Compra tech con estilo express.',
  hero_subtitulo: 'Los mejores accesorios, periféricos y gadgets.',
  hero_cta: 'Ver productos',
  color_acento: '#e7226d',
  whatsapp: '', email_contacto: '', instagram: '',
}
```

**Datos estáticos (no en DB):**
- `reviewSamples` — 3 reseñas de ejemplo
- `questionSamples` — 3 preguntas frecuentes
- `views` — textos por sección (inicio, catálogo, novedades, favoritos, ofertas, carrito, soporte)
- `navItems` — 7 secciones de la tienda
- `slides` — 3 slides del carrusel hero

**Secciones de navegación:**
```
inicio | catalogo | novedades | favoritos | ofertas | carrito | soporte
```

**Estados principales:**
| Estado | Tipo | Inicial |
|--------|------|---------|
| `view` | `string` | `'inicio'` |
| `cart` | `CartEntry[]` | desde localStorage `oe_cart` |
| `storeConfig` | objeto | valores por defecto |
| `dbProducts` | `Product[]` | `[]` |
| `productIdMap` | `Record<string, string>` | `{}` (nombre → id) |
| `productSkuMap` | `Record<string, string>` | `{}` (nombre → sku) |
| `productStockMap` | `Record<string, number>` | `{}` (nombre → stock) |
| `categorias` | `string[]` | `[]` |
| `activeCat` | `string` | `'Todo'` |
| `loadingProducts` | `boolean` | `true` |
| `showCheckout` | `boolean` | `false` |
| `checkoutState` | `CheckoutState` | `'form'` |
| `checkoutForm` | `{ nombre, email }` | `{ '', '' }` |
| `checkoutError` | `string` | `''` |
| `ventaNumero` | `number \| null` | `null` |
| `showLogin` | `boolean` | `false` |
| `loginTab` | `'login' \| 'register'` | `'login'` |
| `storefrontUser` | `{ email, nombre } \| null` | `null` |

**Funciones principales:** `handleCheckout()`, `handleLogin()`, `handleRegister()`, `handleLogout()`, `addToCart(title)`, `findProduct(title)`

**`addToCart(title)`:** verifica `productStockMap[title]` antes de agregar — no permite superar el stock disponible

**Supabase:** Lee `productos` (activo=true, stock>0, con categorias), `config_storefront` (id=1). Escribe `clientes` (select/insert), `ventas` (insert), `venta_items` (insert). Auth: `registros` (select login, insert registro).
