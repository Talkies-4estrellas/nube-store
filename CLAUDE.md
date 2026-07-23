# Order Express — Panel Administrativo

## Documentación del proyecto

Antes de hacer cualquier cambio, consultar estos archivos en orden:

| Archivo | Qué contiene |
|---------|-------------|
| `Doc/indice.md` | Mapa de TODOS los archivos del proyecto: ubicación, URL y función exacta |
| `Doc/documentacion/documento.md` | Referencia técnica completa: tablas DB, estados de cada página, funciones, mapa de operaciones Supabase, flujos, pendientes |
| `Doc/memoria.md` | Instrucciones para registrar commits en el archivo de sesión — **leer siempre al iniciar sesión** |
| `Doc/sesiones/seccion-DD-MM-YYYY.md` | Historial de cambios por día |
| `Doc/database/` | schema.sql, auth.sql, migration_criticos.sql, migration_columnas.sql |

---

## Descripción
Dashboard administrativo tipo Tiendanube construido con Next.js 16 + Supabase.
Nombre del proyecto: **Order Express** (nombre anterior provisional: Nube Store).

---

## Stack
- **Framework:** Next.js 16.2.9 (App Router, Turbopack)
- **Estilos:** Inline styles — NO styled-jsx, NO Tailwind (incompatibles con App Router)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + `@supabase/ssr` (cookies) + middleware + rol en tabla `user_roles`
- **Storage:** Supabase Storage — bucket `productos` (público)
- **Deploy:** Vercel — rama `master` → `main` en GitHub
- **Repo GitHub:** `https://github.com/Talkies-4estrellas/nube-store.git`

---

## Estructura de carpetas
```
app/
  layout.tsx                ← AuthProvider wrapping AppChrome
  page.tsx                  ← Redirige a /dashboard
  login/page.tsx            ← Login con email/password + manejo de roles
  dashboard/page.tsx        ← Métricas reales + selector período + Realtime toasts
  ventas/page.tsx           ← Tabla de ventas con filtros, modal, cambio de estado
  productos/page.tsx        ← CRUD completo + upload imagen WebP a Supabase Storage
  clientes/page.tsx         ← Lista clientes + panel detalle + historial de pedidos
  envio-nube/page.tsx       ← Gestión real de envíos: crear, actualizar estado
  tienda-en-linea/page.tsx  ← Editor de configuración storefront (nombre, hero, colores, contacto) → guarda en config_storefront
  punto-de-venta/page.tsx   ← POS completo: grid productos, carrito, cobro (efectivo/tarjeta/transferencia), find-or-create cliente
  configuracion/page.tsx    ← Ajustes negocio + gestión de usuarios (admin only) + revisión de solicitudes de proveedores

components/
  Sidebar.tsx         ← Filtrada por ROLE_ROUTES[user.role]; badge de rol; logout
  Topbar.tsx          ← Buscador global + avatar usuario con nombre y rol
  AppChrome.tsx       ← Decide chrome/sin-chrome; spinner auth; AccessDenied por rol
  ProductoModal.tsx   ← Modal agregar/editar producto + drag&drop imagen
  ClienteModal.tsx    ← Modal agregar/editar cliente
  VentaModal.tsx      ← Modal nueva venta (fix: serverError en lugar de alert())
  Icon.tsx            ← SVG inline propio (sin dependencia externa para admin)
  GlobalSearch.tsx    ← Ctrl+K global search modal; busca en productos, ventas y clientes; navegación con teclado
  ConfirmDialog.tsx   ← Confirmación antes de eliminar
  Storefront.tsx      ← Tienda pública completa (productos reales + carrito localStorage)

lib/
  supabase.ts         ← createBrowserClient de @supabase/ssr (cookies+localStorage)
  auth-context.tsx    ← AuthProvider, useAuth, ROLE_ROUTES, ROLE_HOME, canAccess

middleware.ts         ← Protege rutas admin, redirige /login si no hay sesión

database/
  schema.sql          ← Schema completo: tablas + triggers + RLS actualizado + categorías
  auth.sql            ← Sistema auth: user_roles, get_my_role(), políticas por rol

public/
  imagenes/
    logo-oe_1-png-300x49.avif  ← Logo oficial Order Express
```

---

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://arqoyuxcugpprzjpcytg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Servidor únicamente — NUNCA exponer al navegador
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # webhook de pagos + descarga de imágenes CSV
MP_ACCESS_TOKEN=TEST-...            # Mercado Pago (TEST- en pruebas)
NEXT_PUBLIC_SITE_URL=https://...    # opcional; si falta se deduce del request
```

⚠️ `NEXT_PUBLIC_SUPABASE_URL` es la **Project URL**, sin `/rest/v1/` al final.
La pantalla *Data API → API URL* del dashboard muestra el endpoint REST (para curl/Postman),
no el valor que espera el SDK — el cliente le agrega `/rest/v1/` por su cuenta.

**`lib/supabase.ts` valida la URL antes de usarla** (agregado 21/07/2026, tras un
`Invalid supabaseUrl` que tumbó un build en Vercel por pegar el valor con el
nombre de la variable incluido). Si `NEXT_PUBLIC_SUPABASE_URL` viene vacía,
mal formada o sin protocolo http(s), el cliente cae al mock (`supabaseConectado
= false`, listas vacías) en lugar de romper el build, y deja un `console.error`
explicando exactamente qué variable falta. Mismo chequeo en `lib/supabase-server.ts`.

---

## Backend (Route Handlers) — agregado 21/07/2026

Hasta esta fecha el proyecto era 100% cliente con la anon key. La pasarela de pagos
obligó a introducir servidor real:

| Ruta | Función |
|---|---|
| `app/api/pagos/crear-preferencia/route.ts` | Crea la preferencia de Mercado Pago. **Recalcula los importes leyendo `venta_items`** — nunca confía en precios del navegador |
| `app/api/pagos/webhook/route.ts` | Recibe la notificación de MP, **reconsulta el pago** contra su API y marca la venta como `Pagado` |
| `app/api/productos/importar-imagen/route.ts` | Descarga una imagen de un link externo y la sube al bucket (el navegador no puede por CORS) |
| `lib/supabase-server.ts` | Cliente con **service role** — ignora RLS. Solo servidor |

**Por qué hace falta la service role key:** el RLS de `ventas` solo permite `UPDATE` a
`admin`/`vendedor`, y el webhook de Mercado Pago llega sin sesión de usuario.

**Al marcar `estado='Pagado'` se dispara `trg_descontar_stock`** y baja el inventario.
Por eso, al migrar datos entre bases hay que usar `SET session_replication_role = replica`
o el stock se descontaría dos veces.

---

## Pasarelas de pago adicionales — agregado 22/07/2026

El checkout de `Storefront.tsx` ahora tiene un selector de método de pago que lee
`config_metodos_pago` (booleanos `efectivo`, `transferencia`, `tarjeta`, `mercadopago`,
`paypal`, `bbva`) y solo muestra las opciones activas. Se agregaron dos pasarelas
más, siguiendo el mismo patrón de `crear-preferencia`/`webhook` de Mercado Pago
(recalcular importes en el servidor, nunca confiar en el navegador):

| Ruta | Función |
|---|---|
| `app/api/pagos/paypal/crear-orden/route.ts` | Crea una orden de PayPal (Orders API v2 vía `fetch`, sin SDK — no se agregó dependencia nueva) |
| `app/api/pagos/paypal/capturar/route.ts` | PayPal redirige aquí (`GET ?token=`) tras la aprobación; captura el cargo real y marca la venta `Pagado` |
| `app/api/pagos/bbva/crear-referencia/route.ts` | Genera una referencia de transferencia SPEI vía **OpenPay** — BBVA no tiene una API pública de e-commerce propia; OpenPay es su producto para negocios en México |
| `app/api/pagos/bbva/webhook/route.ts` | Recibe la notificación de OpenPay cuando se confirma la transferencia |

**Variables de entorno que faltan para que cobren de verdad** (no están en `.env.local`
todavía): `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` (`sandbox`/`live`),
`OPENPAY_MERCHANT_ID`, `OPENPAY_PRIVATE_KEY`, `OPENPAY_MODE`. Sin ellas, si el cliente
elige esa opción en el checkout, la ruta responde con error y el pedido cae al flujo
normal de `estado='Pendiente'` — no rompe nada, solo no genera el cobro real.

---

## Sistema de Autenticación

### Paquete
`@supabase/ssr` — usa `createBrowserClient` (guarda sesión en cookies Y localStorage, accesible desde middleware server-side).

### Flujo
1. `middleware.ts` intercepta todas las rutas (excepto assets y storefront `/`)
2. Lee sesión del cookie vía `createServerClient`
3. Redirige a `/login?redirect=...` si ruta protegida sin sesión
4. `AuthProvider` en `layout.tsx` carga usuario + rol desde `user_roles`
5. `AppChrome` muestra spinner mientras verifica, luego decide chrome/sin-chrome
6. Si usuario no tiene rol en `user_roles` → auto-signOut

### Roles
| Rol | Acceso |
|-----|--------|
| `admin` | Dashboard, Ventas, Productos, Clientes, Envíos, Tienda en línea, Punto de venta, Configuración |
| `vendedor` | Dashboard, Ventas, Clientes |
| `bodega` | Productos, Envíos |

### Archivos clave
- `lib/auth-context.tsx` — `AuthUser`, `Role`, `ROLE_ROUTES`, `ROLE_HOME`, `canAccess()`, `AuthProvider`, `useAuth()`
- `lib/supabase.ts` — `createBrowserClient` con mock completo (getUser, getSession, signInWithPassword, signOut, onAuthStateChange)
- `middleware.ts` — matcher excluye `_next`, imágenes y ruta raíz `/`
- `app/login/page.tsx` — branding Navy #252855 + Pink #e7226d; redirige según `ROLE_HOME`

---

## Base de datos Supabase

### Tablas
| Tabla | Descripción |
|-------|-------------|
| `categorias` | Bolsos, Cinturones, Billeteras, Estuches, Relojes, Keyboards, Gaming, Audio, Smart, Accesorios |
| `productos` | nombre, sku, precio, stock, categoria_id, imagen_url, activo |
| `productos_con_estado` | **VIEW** con estado calculado (Activo / Stock bajo / Sin stock) |
| `clientes` | nombre, email, telefono, ciudad, tag (Nuevo/Regular/VIP) |
| `ventas` | numero serial, cliente_id, estado, total, notas |
| `venta_items` | venta_id, producto_id, nombre, precio, cantidad, subtotal (generado) |
| `envios` | venta_id, paqueteria, numero_guia, estado_envio, costo_envio |
| `user_roles` | user_id (FK auth.users), role, nombre — tabla de roles del panel |
| `solicitudes_productos` | solicitudes de proveedores: datos proveedor + producto + imagen_url + estado (pendiente/aprobado/rechazado) + updated_at + detalles (jsonb opcional: colores, tallas, variantes, peso_g, dimensiones, imagenes_extra) |
| `registros` | cuentas de clientes de la tienda: email, nombre, password_hash, token |
| `config_storefront` | fila única (id=1): nombre_tienda, hero_titulo, hero_subtitulo, hero_cta, color_acento, whatsapp, email_contacto, instagram, telefono, facebook — RLS habilitado |
| `config_metodos_pago` | fila única (id=1): efectivo, transferencia, tarjeta (bool) |
| `config_notificaciones` | por user_id: ventas_nuevas, stock_bajo, solicitudes_proveedor (bool) |
| `cart_items` | carrito persistente: registro_id, producto_id, cantidad |

### Función helper de rol
```sql
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid()
$$;
```
Usada en todas las políticas RLS para verificar el rol sin romper el contexto de seguridad.

### Triggers automáticos
- `updated_at` se actualiza solo en cada cambio (tablas: ventas, productos, clientes, solicitudes_productos)
- Total de venta se recalcula al insertar/editar `venta_items`
- `trg_descontar_stock` — baja stock al INSERT con estado='Pagado' O al UPDATE que transiciona a 'Pagado' (`AFTER INSERT OR UPDATE`)
- `trg_actualizar_tag` — sube tag del cliente (Nuevo→Regular→VIP) al pagar (`AFTER INSERT OR UPDATE`, null-safe en cliente_id)
- `trg_solicitudes_updated_at` — actualiza `updated_at` al aprobar/rechazar solicitudes

### Estado de migraciones ejecutadas en Supabase (03/07/2026)
- ✅ `Doc/database/migration_criticos.sql` — triggers INSERT+UPDATE, RLS config_storefront, tablas config_metodos_pago / config_notificaciones / cart_items
- ✅ `Doc/database/migration_columnas.sql` — direccion/codigo_postal/estado_region/pais en clientes; telefono/facebook en config_storefront; updated_at en registros y solicitudes_productos

### Storage
- Bucket: `productos` (público, SELECT sin restricción)
- Path de imágenes: `{timestamp}-{SKU}.{ext}` (WebP via Canvas API)
- INSERT/DELETE requieren `auth.role() = 'authenticated'`
- Subcarpeta `solicitudes/` permite INSERT anónimo (política separada para proveedores)
- Imágenes de proveedores: path `solicitudes/{timestamp}-{sku}.webp`

---

## RLS actualizado (aplicado vía database/auth.sql)

Las políticas antiguas permisivas (`anon total`) fueron reemplazadas por políticas por rol:

| Tabla | SELECT | INSERT | UPDATE/DELETE |
|-------|--------|--------|---------------|
| `productos` | público (anon) | admin, bodega | admin, bodega |
| `clientes` | autenticado | anon (checkout storefront) | admin, vendedor |
| `ventas` | autenticado | anon (checkout storefront) | admin, vendedor |
| `venta_items` | autenticado | anon (checkout storefront) | admin, vendedor |
| `envios` | autenticado | admin, bodega | admin, bodega |
| `user_roles` | propio user_id | — | admin gestiona todos |

---

## Convenciones de trabajo
- **NO hacer git commit** — GitKraken gestiona todos los commits
- **Middleware redirect COMENTADO** — temporalmente deshabilitado hasta configurar usuarios en Supabase Auth
- **`productos_con_estado` VIEW** — usada en POS y Productos; incluye estado calculado

## Flujo de registro de sesión (memoria.md)

Al inicio de cada sesión nueva, leer `Doc/memoria.md` para recordar el flujo. El proceso es:

1. El usuario hace commits desde GitKraken
2. Cuando dice "registra el commit" o "actualiza la memoria", ejecutar:
   ```bash
   git log -1 --stat
   ```
3. Abrir `Doc/sesiones/seccion-DD-MM-YYYY.md` del día actual
4. Agregar una sección `### [HH:MM] Commit: {mensaje}` con hash, tabla de archivos y descripción
5. Si el archivo de sesión del día no existe, crearlo con la estructura base de `memoria.md`

**Probado y funcionando el 03/07/2026** — último commit registrado: `44f4595` ("agrego de documentación del proyecto y el arreglo de la base de datos")

## Decisiones técnicas importantes
- **Sin styled-jsx / sin Tailwind:** inline styles en TODOS los componentes
- **`suppressHydrationWarning` en `<html>`:** extensión Katalon inyecta atributos
- **Rama master → main:** push con `git push origin master:main --force`
- **`productos_con_estado` es una VIEW:** se consulta con `.from('productos_con_estado')`
- **Imágenes en AVIF:** logo en `.avif`, compatible con Next.js Image sin config extra
- **Canvas API para WebP:** conversión de imágenes sin librerías externas
- **`lucide-react`** solo en Storefront; `Icon.tsx` SVG propio para panel admin
- **Cart en localStorage con guard SSR:** `typeof window === 'undefined'` en `loadCartFromStorage`
- **Realtime Supabase:** canal en `productos` UPDATE para toasts de stock en dashboard

---

## Dependencias añadidas
- `lucide-react ^1.22.0` — iconos para el Storefront
- `@supabase/ssr` — cliente con soporte de cookies para middleware + AuthProvider

---

## Funcionalidades completadas
- [x] Dashboard con métricas reales + selector de período (Hoy/Esta semana/Este mes)
- [x] Dashboard con toasts Realtime al cambiar stock de productos
- [x] Productos: CRUD completo, upload WebP a Storage, filtro categoría, paginación (12/pág)
- [x] Ventas: tabla con filtros/búsqueda, modal nueva venta, cambio de estado inline
- [x] Ventas: panel detalle lateral con items, cliente y total
- [x] Clientes: tabla + panel detalle + modal + paginación (15/pág) + eliminar
- [x] Clientes: historial de pedidos (ventas por cliente_id)
- [x] Envíos: gestión real — crear envío (paquetería, guía, costo), actualizar estado
- [x] Configuración: ajustes de negocio + gestión de usuarios con roles (admin only)
- [x] Storefront: productos reales desde Supabase, categorías dinámicas, carrito localStorage
- [x] Storefront: checkout → crea cliente + venta + venta_items en Supabase
- [x] Autenticación completa: login, logout, roles, rutas protegidas, AccessDenied
- [x] Sidebar filtrada por rol; Topbar muestra usuario/rol; spinner de carga
- [x] Buscador global en Topbar con debounce 280ms
- [x] Iconos SVG propios en `Icon.tsx`; `ConfirmDialog.tsx` antes de eliminar
- [x] VentaModal: errors inline (sin alert())
- [x] Schema SQL completo en `database/schema.sql` + `database/auth.sql`
- [x] Dashboard: gráfica SVG barras con selector de período (hoy/semana/mes), agrupación por slots 4h/días/semanas
- [x] Productos: sort por nombre/precio/stock en grid y tabla; columnas clickables
- [x] Ventas: estado "En proceso" agregado; stepper visual del pipeline Pendiente→En proceso→Pagado→Enviado
- [x] Punto de Venta (POS): grid productos con búsqueda y filtro categoría, carrito, 3 métodos de pago, find-or-create cliente, crea venta+items+descuenta stock
- [x] Envíos: links de rastreo clickables por paquetería (DHL, FedEx, Estafeta, Redpack, J&T, Paquetexpress)
- [x] Clientes: columna/sort "Última compra" + sort dropdown (nombre, total gastado, total pedidos, última compra)
- [x] Configuración: sección "Solicitudes proveedor" con filter chips, cards expandibles, aprobar/rechazar
- [x] Sidebar: badge contador de solicitudes pendientes sobre ícono Configuración
- [x] Ctrl+K: modal buscador global (GlobalSearch.tsx) integrado en AppChrome
- [x] Proveedores (/proveedores): drag&drop imagen, múltiples productos, categoría inline, draft localStorage, submit bulk
- [x] Tienda en línea: editor de configuración inline (nombre, hero, colores, contacto) → `config_storefront` table

## Pendiente
- [ ] **Configurar `MP_ACCESS_TOKEN`, `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`PAYPAL_MODE`, `OPENPAY_MERCHANT_ID`/`OPENPAY_PRIVATE_KEY`/`OPENPAY_MODE`** en `.env.local` y Vercel — las 3 pasarelas ya están integradas en código pero sin credenciales reales no cobran (22/07/2026)
- [ ] **Correr en el SQL Editor de Supabase las policies de INSERT/UPDATE/DELETE de `clientes`, `ventas`, `venta_items` y `categorias`** — están en `schema_completo.sql` pero la base nueva (post-migración) no las tenía aplicadas; sin esto el checkout público falla (detectado 22/07/2026)
- [ ] **Re-habilitar RLS en `productos` y `categorias`** antes de producción — sigue desactivado desde la sesión de importación CSV, por pedido explícito del usuario
- [ ] Completar la "Parte 4" de la migración: crear usuario admin real en Supabase Auth + INSERT en `user_roles` — sigue bypaseado con RLS desactivado
- [ ] Validar la firma `x-signature` del webhook de Mercado Pago (antes de producción)
- [ ] Guardar `payment_id`/`chargeId` de MP, PayPal y OpenPay en `ventas` para conciliación
- [ ] Vista previa de Tienda en línea: el iframe tiene `src="/"` fijo — si se navega dentro (ej. clic en "Soy proveedor"), se queda ahí y el switch PC/Móvil no vuelve sola al inicio. Falta botón "🏠 Inicio" o reset automático al cambiar de tab
- [ ] Migrar sistema de login de tienda (registros) a Supabase Auth
- [ ] Carrito de tienda persistente en DB para clientes con cuenta (cart_items)
- [ ] Confirmación de pedido por email al hacer checkout en Storefront
- [ ] Exportar ventas/clientes a CSV
- [ ] Modo oscuro

## Completado (03/07/2026)
- [x] Storefront conectado a config_storefront: hero_titulo, hero_subtitulo, hero_cta, nombre_tienda, color_acento, whatsapp, instagram, email_contacto
- [x] Fix duplicados "Público en general" en POS (.maybeSingle + email fijo publico.general@pos.local)
- [x] Fix N+1 en clientes/page.tsx: 2 queries totales (clientes + ventas bulk) con agregación en JS
- [x] Tipo Cliente ampliado con campos de dirección; modal de edición los recibe correctamente
- [x] Aprobación de solicitud de proveedor crea el producto en catálogo automáticamente
- [x] Email del proveedor clickeable (mailto) + botón "Copiar" en panel de solicitudes
- [x] Rutas /envio-nube y /tienda-en-linea confirmadas existentes en app/ y funcionando correctamente
- [x] Notificaciones Realtime en Topbar: campana con badge rojo para ventas nuevas, dropdown con detalle (venta #, cliente, total, hora)
- [x] Sidebar badge de solicitudes pendientes actualizado en tiempo real (canal sidebar-solicitudes-realtime)
- [x] Dashboard, Envíos y Tienda en línea auditados — todos leen datos reales de Supabase sin problemas
- [x] Portal proveedores: tab "Mis enviados" independiente — muestra todas las solicitudes (pendiente/aprobado/rechazado) filtradas por email del proveedor; input de email cuando no hay sesión guardada
- [x] Dashboard administrativo: sección "Solicitudes de proveedores" con aprobación/rechazo individual y botón "Aprobar todos (N)" para bulk; al aprobar inserta producto en catálogo automáticamente; toast de confirmación

## Completado (06/07/2026)
- [x] Portal proveedores: flujo solicitudes end-to-end sin email manual — `savedEmail` como única fuente de verdad, Realtime Supabase actualiza estado automáticamente cuando admin aprueba/rechaza
- [x] Portal proveedores: tab "Mis solicitudes" con resumen de conteos y borde de color por estado; sin input de email
- [x] Portal proveedores: formulario de producto ampliado con sección colapsable "Datos adicionales" — colores (chips), tallas (chips), variantes con stock por combinación, peso, dimensiones, hasta 4 fotos extra; todo guarda en columna `detalles` jsonb
- [x] Ventas: eliminado botón "+ Nueva venta" del header
- [x] ProductoModal: eliminado botón "📷 Usar cámara" (innecesario en contexto de escritorio)
- [x] Punto de Venta eliminado del Sidebar (CANALES)

## Completado (07/07/2026)
- [x] Productos: distinción admin vs proveedor — columnas `origen TEXT DEFAULT 'admin'` y `proveedor_nombre TEXT` en tabla `productos`; VIEW `productos_con_estado` recreada con DROP+CREATE
- [x] Productos: filtro desplegable por proveedor (`<select>`) en la misma fila de filtros (junto a categoría y ordenamiento); solo aparece cuando hay productos de proveedores
- [x] Productos: panel "Solicitudes" colapsable con aprobación/rechazo individual y "Aprobar todos"; badge rosa con conteo en el botón; toast de confirmación
- [x] Productos: badge púrpura `📦 {proveedor_nombre}` en tarjetas de productos de proveedor
- [x] Dashboard + Configuración: INSERT a `productos` al aprobar solicitud ahora incluye `origen: 'proveedor'` y `proveedor_nombre`
- [x] Tienda en línea: botón "Ver otros temas ▼" expande 6 temas extra inline en la galería de temas

## Completado (08/07/2026)
- [x] Ventas: filtro de rango de fechas (Del / Al) con botón × para limpiar; filtro aplicado sobre `created_at`
- [x] Productos: modal detalle de solicitud — muestra imagen, precio/stock, colores, tallas, variantes con stock, peso, dimensiones y fotos extra del jsonb `detalles`; botón "Ver" en cada fila del panel
- [x] Productos: notificación por email al proveedor al aprobar/rechazar — Edge Function `notify-proveedor` (Deno + Resend); `tsconfig.json` excluye `supabase/functions`
- [x] Sidebar: badge ámbar en Productos con conteo de productos con stock ≤ 5; actualizado en tiempo real vía canal `sidebar-stock-realtime`
- [x] Diseño responsivo completo: `SidebarContext` con detección mobile; sidebar como drawer deslizante; topbar con hamburguesa y ancho completo en mobile; overlay al abrir sidebar; CSS responsivo (`stat-grid`, `grid-3`, `table-wrap`, `panel-layout`, `filter-row`) aplicado en ventas y productos

## Completado (14/07/2026)
- [x] ProductoModal: sección "Datos adicionales" colapsable — colores chips, tallas chips, variantes con stock (grid auto color×talla), peso, dimensiones, 4 slots fotos extra; guarda en `detalles JSONB`
- [x] `productos/page.tsx`: `handleSave` sube imágenes extra a Storage y construye payload `detalles` JSONB
- [x] Sidebar: botón "Ver tienda ↗" dentro del nav, arriba de Configuración, navega a `/` en misma pestaña
- [x] Tienda en línea / Diseño: temas de color funcionales — click aplica y guarda `color_acento` en DB al instante
- [x] Tienda en línea / Diseño: iframe de vista previa embebido en panel derecho (escala 55%) con botón "↺ Recargar"
- [x] Tienda en línea / Carrusel: subida de imagen directa por slide (`uploadToSupabase` de `@/lib/uploadWebp`); URL manual sigue disponible
- [x] Tienda en línea / Páginas: sección SEO — meta título (contador 60 chars), meta descripción (contador 155 chars), imagen OG con preview, mini-preview estilo Google
- [x] Tienda en línea / Legal: nueva sub-pestaña con política de envíos, devoluciones y términos; indicador OK/Vacío
- [x] Storefront: suscripción Realtime a `config_storefront` — cambios se reflejan sin recargar página; aplica `document.title` desde `meta_titulo`
- [x] Migraciones nuevas: `migration_productos_detalles.sql` + `migration_seo_legal.sql` (pendientes de ejecutar en Supabase)

## Completado (20-21/07/2026)
- [x] Tienda en línea: submenú convertido en **hamburguesa** con dropdown flotante; grid a 2 columnas sin espacio muerto; hamburguesa junto al título en las 7 sub-páginas
- [x] **Fix `AppChrome`**: `startsWith('/tienda')` capturaba también `/tienda-en-linea`, dejando el panel sin sidebar admin. Corregido a `startsWith('/tienda/')`
- [x] Vista previa de Tienda en línea: switch **PC / Móvil** (viewport simulado 1180px / 430px) y panel ampliado a 520px
- [x] Storefront móvil: nav horizontal con scroll → **hamburguesa** a la izquierda con logo centrado; la barra se oculta al bajar y reaparece al subir
- [x] **Exportar productos a CSV** (25 columnas) con diálogo de confirmación previo
- [x] **Importar productos desde CSV**: upsert por SKU, vista previa con validación, advertencia de filas sin datos requeridos (sku/nombre/precio)
- [x] Importador tolerante: separador `,` o `;`, codificación Latin-1, precios `$ 139` / `3,500.00`, HTML con entidades, categorías `Padre > Hijo`, sinónimos de encabezados (Tiendanube y control 2023)
- [x] Rescate de CSV dañados: archivos `;`-delimitados re-guardados en Excel (pasaban de 0 a 147 registros recuperados)
- [x] Descarga de imágenes por link → se alojan en el bucket propio (`app/api/productos/importar-imagen`)
- [x] **Pasarela de pagos Mercado Pago** (Checkout Pro): primer backend real del proyecto
- [x] Esquema consolidado en `Doc/database/schema_completo.sql` (base + 7 migraciones + columnas sin migración)

## Completado (21/07/2026) — auditoría y arreglos responsivos móvil
- [x] **`lib/supabase.ts` / `lib/supabase-server.ts`**: validación de URL con `new URL()` antes de instanciar el cliente; ya no truena el build de Vercel si la variable viene mal pegada (con comillas o el `NOMBRE=` incluido). Mensajes de `console.error` explícitos indicando qué falta
- [x] **Auditoría de desbordamiento horizontal en las 12 pantallas del panel** (medido con scripts inyectados que comparan `scrollWidth` vs `clientWidth` a 375px, no a ojo). 5 pantallas rotas encontradas y corregidas: `/ventas`, `/productos`, `/tienda-en-linea`, `/configuracion`, `/proveedores`
- [x] Causas raíz identificadas y documentadas con comentarios en el CSS: `1fr` no se encoge (usar `minmax(0,1fr)`), `align-items:flex-start` en `flex-direction:column` dimensiona por contenido en vez de estirar, rejillas de ancho fijo sin colapsar en móvil, `min-width:auto` heredado en flex
- [x] Nuevas clases responsivas: `.te-layout` (tienda en línea), `.config-layout` (configuración), `.page-header`/`.page-header-actions` (botones de header que envuelven en móvil)
- [x] `Doc/migracion-supabase.md` + `scripts/exportar-datos.ps1`: guía paso a paso y script PowerShell para migrar datos entre cuentas de Supabase (dump de esquema y datos vía CLI, con `session_replication_role=replica` para no duplicar el descuento de stock)
- [x] Storefront móvil: cabecera rediseñada a `[☰] [logo completo] [🔍 lupa] [🛒 carrito]` — la lupa despliega el buscador a ancho completo con autofoco; se ocultan los duplicados del buscador/carrito que vivían en el hero
- [x] Storefront móvil: franja azul del sidebar ya no asoma bajo la cabecera cuando el menú está cerrado (fondo/padding se neutralizan con `:not(.mobile-open)`)
- [x] **Fix breakpoint vista previa**: el simulador PC/Móvil de Tienda en línea usaba `vp: 1180`, exactamente el breakpoint móvil del storefront (`max-width: 1180px`, inclusivo) — la vista "PC" caía en rango móvil. Subido a `1280`
- [x] Vista previa PC/Móvil con proporciones diferenciadas: PC ahora es un rectángulo horizontal tipo monitor (~16:10, alto = `PREVIEW_W * 0.62` acotado 260–420px) en vez de un recuadro alto y angosto; Móvil sin cambios (520×640)
- [x] `/proveedores`: eliminada la barra de tabs horizontal duplicada en móvil (ya existía el mismo menú en la hamburguesa); "Mis enviados" renombrado a **"Mis productos"** en menú y título; contenido con `maxWidth: 1100` para no estirarse en pantallas anchas; título del header realineado a la izquierda (antes se iba al extremo derecho al ocultarse el stepper)

## Completado (22/07/2026)
- [x] Checkout: selector real de método de pago (efectivo/transferencia/Mercado Pago/PayPal/BBVA) leyendo `config_metodos_pago`, solo muestra los habilitados
- [x] PayPal y BBVA (OpenPay) agregados como pasarelas — ver `## Pasarelas de pago adicionales` más arriba
- [x] Fix RLS: `clientes`, `ventas`, `venta_items` no tenían policy de INSERT anónimo en la base nueva (bloqueaba todo el checkout público) — mismo patrón de policy faltante ya visto con `categorias` en la migración de BD; policies recreadas en `schema_completo.sql`
- [x] `app/tienda/[slug]/page.tsx`: **header duplicado en PC corregido** — bug heredado de la sesión móvil anterior (clases `.producto-header-mobile/-desktop` con `display:none`/`!important` cruzadas que dejaron de esconderse bien). Reescrito como una sola barra con lógica de colapso en JS (`esMovil` + `buscarAbiertoMovil`) en vez de CSS por clases: flecha atrás, logo, buscador con sugerencias en vivo (miniatura + nombre + precio, igual que el buscador desktop de `Storefront.tsx`), carrito. En móvil el buscador colapsa a un icono que se expande junto al carrito
- [x] Buscador móvil de `Storefront.tsx` (icono lupa junto al carrito en el header): tenía un bug real — actualizaba el estado de sugerencias al escribir pero nunca las renderizaba (el dropdown solo existía en la versión desktop). Agregado el mismo dropdown también ahí
- [x] `Storefront.tsx`: soporte para `?view=` (abre cualquier vista, ej. `?view=carrito`) y `?buscar=` (abre resultados de búsqueda) en la URL — usado por los links del header de `/tienda/[slug]`
- [x] Navegación de "Tienda en línea": las 7 subpáginas (Diseño, Páginas, Carrusel, Menús, Filtros, Redes sociales, Legal/Envíos) pasaron del dropdown hamburguesa (`_subnav.tsx`, eliminado) a un submenú expandible en `components/Sidebar.tsx`, visible cuando la ruta activa empieza con `/tienda-en-linea`
- [x] `/tienda-en-linea` (Diseño): eliminada la galería "Temas de color" — nombres de marca engañosos (`Cosmética`, `Deportes`, `Moda oscuro`...) que en realidad solo cambiaban `color_acento`, no un diseño completo. Eliminada también la maqueta estática "Tema actual"/editor de identidad; la página quedó solo con el panel de Vista previa real (iframe)
- [x] `/tienda-en-linea/filtros`: nuevo gestor de categorías — crear, activar/desactivar (`categorias.activo`, columna nueva), eliminar, con paginación de 10 en 10. `Storefront.tsx` filtra el listado público a solo categorías activas
- [x] `/tienda-en-linea/blog` (Carrusel): ahora se pueden agregar y eliminar diapositivas — antes eran exactamente 3 fijas (`fileRefs` pasó de array fijo de `useRef` a un `Record<number, HTMLInputElement>` para soportar cantidad variable)

## Completado (16/07/2026)
- [x] ProductoModal: rediseño "Datos adicionales" — paleta visual 12 colores con swatches, chips rosas para tallas (sin grupos predefinidos), variantes en tabla con botones −/+ y totalizador, peso con etiqueta "g" flotante, fotos ilimitadas con zona drag-and-drop y selección múltiple, badge resumen en toggle colapsable
- [x] Portal proveedores: "Datos adicionales" replicado con el mismo diseño que el modal admin (paleta colores, tallas input libre, variantes tabla, fotos drag-and-drop ilimitadas)
- [x] globals.css: spinners nativos eliminados en todos los `input[type=number]` del proyecto (Chrome/Firefox/Safari)

## Completado (10/07/2026)
- [x] AppChrome: `maxWidth: 1600` + `margin: 0 auto` en `<main>` para acotar el panel admin en pantallas anchas (laptop/escritorio/TV)
- [x] globals.css: `@media (min-width: 1600px)` → `.stat-grid` y `.grid-3` pasan a 4 columnas en pantallas muy anchas
- [x] Storefront: breakpoints `1400px / 1800px / 2200px` en `storefront.css` para `.page-shell` max-width progresivo
- [x] Storefront: topbar compacto en vistas no-inicio — CSS `:not([data-view="inicio"])` oculta el bloque h1 y reduce botones
- [x] Storefront catálogo: panel de filtros reducido a 210px; clase `.cat-sm` para botones de categoría compactos; `<select>` de salto rápido encima del botón "Todo"; eliminados chips encima del grid de productos
- [x] Storefront: imágenes de producto con `aspect-ratio: 4/3` + `object-fit: cover` sin `height` fijo; tarjetas con `overflow: hidden`
- [x] Storefront: `.store-grid` con `auto-fill minmax(200px, 1fr)` — elimina overflow en cualquier tamaño de pantalla
- [x] Portal proveedores: "Mis enviados" → solo `estado='aprobado'` (`.eq('estado', 'aprobado')`); mensaje vacío actualizado
- [x] Portal proveedores: "Mis solicitudes" → `estado!='aprobado'` (`.neq('estado', 'aprobado')`) — muestra pendientes y rechazados

## Completado (09/07/2026)
- [x] Dashboard: `className="stat-grid"` en grids de métricas; `className="dashboard-bottom"` en grid inferior `1fr 300px`; `className="sol-card"` + `className="sol-card-actions"` en cards de solicitudes — colapsables en mobile
- [x] Portal proveedores: layout mobile completo — drawer `72vw` con botón × de cierre y `box-shadow`, overlay, hamburguesa ☰, barra de tabs horizontal scrollable, `marginLeft: 0` en mobile
- [x] Portal proveedores: formulario responsive — `.prov-main-grid` (2col→1col), `.prov-2col` (SKU+Cat, Precio+Stock), `.prov-table-scroll` (tabla productos con minWidth 520 + scroll-x)
- [x] `globals.css`: 6 nuevas clases responsivas: `.dashboard-bottom`, `.sol-card`, `.sol-card-actions`, `.prov-main-grid`, `.prov-2col`, `.prov-table-scroll`
- [x] ProductoModal: fix categorías nuevas — prop `onNuevaCategoria` inserta en Supabase inmediatamente y refresca lista del padre; la opción aparece seleccionada en el `<select>` al instante
- [x] ProductoModal: eliminada toda la lógica de cámara (estados, refs, funciones, `<video>`, botones, import) — solo drag&drop + selector de archivo
- [x] Portal proveedores: error de submit ahora muestra mensaje exacto de Supabase; detecta caso columna `detalles` faltante

---

## Pasos para configurar auth en Supabase (primera vez)
1. Ejecutar `database/auth.sql` en Supabase SQL Editor
2. En Supabase → Authentication → Users → crear usuario con email + contraseña
3. Copiar UUID del usuario y ejecutar:
   ```sql
   insert into user_roles (user_id, role, nombre) values
     ('UUID-DEL-USUARIO', 'admin', 'Nombre Completo');
   ```
