# Order Express — Documentación de referencia

> **Propósito de este archivo:** fuente de verdad del proyecto. Consultar antes de hacer cualquier cambio para evitar duplicar lógica, pisar estados existentes o reescribir algo que ya existe. Actualizar cada vez que se agregue o modifique algo significativo.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.9 — App Router + Turbopack |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth + tabla `user_roles` propia |
| Cliente Supabase | `@supabase/ssr` → `createBrowserClient` (sesión en cookies + localStorage) |
| Estilos | Inline styles únicamente — sin Tailwind, sin styled-jsx |
| Imágenes | Supabase Storage, bucket `productos` — convertidas a WebP en navegador vía Canvas API |
| Despliegue | Vercel — rama `master` del repo `Talkies-4estrellas/nube-store` |

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Si faltan, `lib/supabase.ts` devuelve un mock que no rompe el build.

---

## Constantes globales de color

Definidas localmente en cada archivo que las necesita (no hay archivo central de constantes):

```ts
const NAVY = '#252855'   // azul marino — color principal
const PINK = '#e7226d'   // rosa — color de acento / CTA
const BLUE = '#0049ff'   // azul eléctrico — usado en dashboard y POS
const GREEN = '#059669'  // verde — éxito / stock OK (solo en POS)
```

---

## Estructura de carpetas

```
C:\nube\
├── app\                          rutas del panel administrativo
│   ├── layout.tsx                root layout → AuthProvider + AppChrome
│   ├── login\page.tsx            /login  (ruta pública)
│   ├── dashboard\page.tsx        /dashboard
│   ├── productos\page.tsx        /productos
│   ├── ventas\page.tsx           /ventas
│   ├── clientes\page.tsx         /clientes
│   ├── punto-de-venta\page.tsx   /punto-de-venta
│   ├── proveedores\page.tsx      /proveedores  (ruta pública)
│   └── configuracion\page.tsx    /configuracion
├── components\
│   ├── Storefront.tsx            tienda pública completa
│   ├── AppChrome.tsx             shell del admin (Sidebar + Topbar + acceso por rol)
│   ├── Sidebar.tsx               navegación lateral fija
│   ├── Topbar.tsx                barra superior con búsqueda inline
│   └── GlobalSearch.tsx          modal de búsqueda global (Ctrl+K)
├── lib\
│   ├── supabase.ts               cliente Supabase (+ mock si faltan env vars)
│   ├── auth-context.tsx          AuthProvider, useAuth(), canAccess(), tipos Role/AuthUser
│   ├── validation.ts             isValidEmail()
│   └── uploadWebp.ts             convertToWebp(), captureFrameAsWebp(), uploadToSupabase()
├── public\storefront\            logo.svg, monograma.svg de la tienda
└── Doc\
    ├── memoria.md                instrucciones de registro de sesión
    ├── database\
    │   ├── schema.sql            esquema completo de la DB
    │   ├── auth.sql              políticas RLS y roles
    │   ├── seed.sql              datos de prueba
    │   └── migration_tablas_faltantes.sql  migración segura (IF NOT EXISTS)
    ├── documentacion\
    │   └── documento.md          este archivo
    └── sesiones\
        └── seccion-DD-MM-YYYY.md archivo por día de trabajo
```

---

## Rutas públicas (sin AppChrome)

```ts
// components/AppChrome.tsx
const PUBLIC_PATHS = ['/', '/login', '/proveedores']
```

Estas rutas renderizan sus `children` directamente sin Sidebar ni Topbar.

---

## Sistema de autenticación y roles

### Roles disponibles

```ts
// lib/auth-context.tsx
type Role = 'admin' | 'vendedor' | 'bodega'
```

### Acceso por rol

```ts
const ROLE_ROUTES: Record<Role, string[]> = {
  admin:    ['*'],   // todo
  vendedor: ['/dashboard', '/ventas', '/clientes'],
  bodega:   ['/productos', '/envio-nube'],
}

const ROLE_HOME: Record<Role, string> = {
  admin:    '/dashboard',
  vendedor: '/dashboard',
  bodega:   '/productos',
}
```

### Labels de rol (AppChrome + Sidebar)

```ts
const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_HOME_CHROME = { admin: '/dashboard', vendedor: '/dashboard', bodega: '/productos' }
```

### Flujo de login

1. `supabase.auth.signInWithPassword({ email, password })`
2. Consulta `user_roles` donde `user_id = session.user.id` → obtiene `role, nombre`
3. Redirige a `ROLE_HOME[role]` o al query param `?redirect=`
4. Si no tiene fila en `user_roles` → `signOut()` automático

---

## Tablas de la base de datos

### `categorias`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | serial PK | |
| nombre | text unique | |

---

### `productos`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| nombre | text | |
| sku | text unique | |
| descripcion | text | |
| precio | numeric(10,2) | |
| stock | int | |
| imagen_url | text | URL pública de Supabase Storage |
| activo | boolean | visible en tienda si true |
| categoria_id | int FK → categorias | |
| created_at | timestamptz | |

**Vista:** `productos_con_estado` — agrega columna calculada `estado`: `'En stock'`, `'Stock bajo'` (≤3), `'Sin stock'` (0). Usada en `/productos` y `/punto-de-venta`.

---

### `clientes`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| nombre | text | |
| email | text | |
| telefono | text | opcional |
| tag | text | `Nuevo`, `Regular`, `VIP` |
| deleted_at | timestamptz | null = activo — soft delete |
| created_at | timestamptz | |

---

### `ventas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| numero | serial | consecutivo de orden |
| cliente_id | uuid FK → clientes | |
| total | numeric(10,2) | |
| estado | text | CHECK: `Pendiente`, `Pagado`, `Enviado`, `Cancelado` |
| notas | text | POS escribe `"POS · {método}"` |
| created_at | timestamptz | |

**Estados válidos (constraint DB):** `Pendiente → Pagado → Enviado`, `Pendiente → Cancelado`, `Pagado → Cancelado`. El estado `'En proceso'` NO existe en la DB — fue eliminado del código en `ventas/page.tsx`.

---

### `venta_items`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| venta_id | uuid FK → ventas | |
| producto_id | uuid FK → productos | |
| nombre | text | snapshot del nombre al momento de la venta |
| cantidad | int | |
| precio | numeric(10,2) | snapshot del precio |
| subtotal | numeric(10,2) | cantidad × precio |

---

### `registros`
Cuentas de clientes en la tienda pública.
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| nombre | text | |
| email | text unique | |
| password | text | texto plano — pendiente migrar a hash |
| activo | boolean | admin activa la cuenta |
| created_at | timestamptz | |

---

### `solicitudes_productos`
Portal de proveedores.
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| proveedor_nombre | text | |
| proveedor_empresa | text | opcional |
| proveedor_email | text | |
| proveedor_telefono | text | opcional |
| producto_nombre | text | |
| producto_sku | text | |
| producto_precio | numeric(10,2) | |
| producto_stock | int | |
| producto_descripcion | text | |
| producto_imagen_url | text | |
| categoria_id | int FK → categorias | |
| estado | text | CHECK: `pendiente`, `aprobado`, `rechazado` |
| created_at | timestamptz | |

---

### `config_storefront`
Una sola fila (id = 1). Leída por la tienda pública al montar y editable desde `/configuracion`.
| Columna | Tipo | Notas |
|---------|------|-------|
| id | int PK default 1 | constraint: siempre 1 |
| nombre_tienda | text | default `'Order Express'` |
| hero_titulo | text | título principal del hero |
| hero_subtitulo | text | subtítulo |
| hero_cta | text | texto del botón CTA |
| color_acento | text | HEX |
| whatsapp | text | número de contacto |
| email_contacto | text | |
| instagram | text | handle |
| updated_at | timestamptz | |

---

### `user_roles`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid unique FK → auth.users | |
| role | text | `admin`, `vendedor`, `bodega` |
| nombre | text | nombre para mostrar |
| created_at | timestamptz | |

---

## Triggers de la base de datos

### `trg_descontar_stock`
- **Evento:** AFTER UPDATE en `ventas`
- **Condición:** cuando `estado` cambia a `'Pagado'`
- **Efecto:** decrementa `productos.stock` por cada fila en `venta_items` de esa venta
- **Importante:** el POS hace INSERT con `estado='Pagado'` directamente — el trigger NO se activa en INSERT, solo en UPDATE. El stock para POS queda gestionado solo por el trigger al momento del insert (Supabase ejecuta el trigger según la implementación real de la función).

### `trg_actualizar_tag`
- **Evento:** AFTER UPDATE en `ventas` cuando estado → `'Pagado'`
- **Efecto:** recalcula el `tag` del cliente: 1 compra = `Nuevo`, 2–4 = `Regular`, 5+ = `VIP`

---

## localStorage — inventario completo

| Clave | Archivo | Qué guarda | Por qué localStorage |
|-------|---------|-----------|----------------------|
| `oe_cart` | `Storefront.tsx` y `app/tienda/[slug]/page.tsx` | Items del carrito: array de `{ product, quantity }` | Sesión efímera — se limpia al completar checkout |
| `proveedor_draft_v1` | `app/proveedores/page.tsx` | Borrador del formulario: `{ proveedor, prod }` | Auto-guardado para no perder datos al recargar. Se borra al enviar. |
| `proveedor_email_saved` | `app/proveedores/page.tsx` | Email del proveedor tras envío exitoso | Conveniencia — carga historial automáticamente en próxima visita |

Todo lo demás (ventas, productos, clientes, config, solicitudes) vive en Supabase.

---

## Inventario de archivos — estados y funciones

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

---

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

---

## Mapa de operaciones Supabase por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `ventas` | dashboard, ventas, clientes, POS, topbar, GlobalSearch | POS, VentaModal | ventas (estado) | — |
| `venta_items` | ventas, dashboard | POS, VentaModal | — | — |
| `productos` | dashboard (stock≤3), topbar, GlobalSearch, realtime | productos | productos | productos |
| `productos_con_estado` | productos, POS | — | — | — |
| `categorias` | productos, POS, proveedores | productos, proveedores | — | — |
| `clientes` | clientes, POS, topbar, GlobalSearch | POS, Storefront | clientes (deleted_at) | — |
| `user_roles` | auth-context, configuracion | — | configuracion | configuracion |
| `solicitudes_productos` | configuracion, proveedores, Sidebar | proveedores | configuracion | — |
| `config_storefront` | configuracion, Storefront | — | configuracion | — |
| `registros` | Storefront (login) | Storefront (registro) | — | — |
| **Storage `productos`** | — | productos, proveedores | — | productos |

---

## Imágenes de productos

**Proceso completo:**
1. Admin selecciona archivo o usa cámara en el modal de producto
2. `convertToWebp()` (Canvas API) convierte a WebP calidad 82% — solo funciona en browser
3. SKU se sanitiza: `sku.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')`
4. Path: `${Date.now()}-${safeSku || 'producto'}.webp`
5. `uploadToSupabase()` sube a bucket `productos` con `upsert: true`
6. URL pública se guarda en `productos.imagen_url`

**Proveedores:** mismo proceso, path `solicitudes/{timestamp}-{sku}.webp`

---

## Flujos principales

### Compra en tienda pública
```
Cliente → carrito (localStorage oe_cart) → checkout (nombre + email)
→ busca cliente en DB por email → crea si no existe
→ INSERT ventas (estado: Pendiente) → INSERT venta_items
→ Admin cambia estado a Pagado → trigger descuenta stock + actualiza tag
```

### Venta POS
```
Vendedor → busca productos → agrega al carrito
→ verifica stock real en DB antes de cobrar
→ busca/crea cliente → INSERT ventas (estado: Pagado, notas: "POS · {método}")
→ INSERT venta_items → trigger descuenta stock
```

### Alta de producto
```
Admin → formulario → imagen a WebP → upload Storage → INSERT productos
```

### Portal de proveedores
```
/proveedores → si hay email guardado → tab historial + carga automática
→ formulario multi-producto → INSERT solicitudes_productos
→ Admin revisa en /configuracion → aprueba/rechaza
```

### Configuración de tienda
```
Admin → /configuracion → edita hero, nombre, contacto
→ "Guardar cambios" → UPDATE config_storefront id=1
→ Storefront lee config_storefront al montar → aplica valores
```

---

## Pendientes técnicos conocidos

| # | Pendiente | Impacto |
|---|-----------|---------|
| 1 | Ejecutar `Doc/database/migration_tablas_faltantes.sql` en Supabase | Sin esto, login de tienda y proveedores fallan en producción |
| 2 | Password en `registros` en texto plano | Seguridad — migrar a hash |
| 3 | Enriquecimiento de clientes hace N+1 queries | Performance — migrar a una sola query con agregaciones |
| 4 | Cart en localStorage no sincroniza entre dispositivos | UX — requiere cuenta + tabla `cart_items` en DB |
| 5 | POS crea clientes duplicados "Público en general" | Datos sucios — agregar lookup antes de insert |
