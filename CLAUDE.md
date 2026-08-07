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
- `lib/supabase.ts` — `createBrowserClient` con mock completo (getUser, getSession, signInWithPassword, signInWithOAuth, signOut, onAuthStateChange)
- `middleware.ts` — matcher excluye `_next`, imágenes y ruta raíz `/`. **Reactivado 27/07/2026** con `ROLE_ROUTES`/`ROLE_HOME` duplicados localmente (no puede importar módulos `'use client'`): redirige a `/login?redirect=` sin sesión en ruta protegida, y al home del rol si la ruta actual no le corresponde
- `app/login/page.tsx` — branding Navy #252855 + Pink #e7226d; email/password + botones **Google/Facebook** (`signInWithOAuth`); redirige según `ROLE_HOME` vía `irSegunRol()` compartido
- `app/auth/callback/route.ts` — Route Handler que intercambia el `code` de OAuth por sesión (`exchangeCodeForSession`) y redirige a `/login`. **La Redirect URL debe estar en la allowlist de Supabase** (Authentication → URL Configuration) o el `code` queda sin consumir y cae al Site URL por defecto (síntoma: `?code=...#_=_` colgado en la URL)

### Mensajería interna (27/07/2026)
Sistema cliente↔proveedor↔admin, con Realtime (`postgres_changes`), diseñado antes de implementar
a pedido explícito del usuario. Un solo hilo continuo por cliente (no uno por incidencia).
- `lib/mensajeria.ts` — helpers de conversación/mensajes; resolución proveedor↔producto **por SKU** contra `solicitudes_productos` (`estado='aprobado'`), mismo patrón que la pestaña Administración de `/proveedores`
- `components/ChatPanel.tsx` — UI de chat reutilizable, usada en `mi-cuenta`, `proveedores`, `configuracion` y `tienda/[slug]`
- Cliente↔proveedor: desde una línea de pedido (`mi-cuenta`) o desde la ficha de producto pública (`tienda/[slug]`, sin pedido previo)
- Cliente↔admin: un solo hilo, escondido como "Soporte" dentro del submenú **Configuración** de `mi-cuenta` (no vive en la pestaña Mensajes)
- Admin ve todas las conversaciones cliente↔admin en `/configuracion`, sección oculta "Comentarios" (no aparece en `Sidebar.tsx`, a propósito)
- Proveedor ve su lista de conversaciones agrupada por **cliente** (no por producto — un mismo producto puede tener varios clientes preguntando)
- Schema: `Doc/database/migration_mensajeria.sql` — tablas `conversaciones`/`mensajes`, columna `producto_id`, índices únicos separados (por pedido / por producto)

### Transferencia de productos admin→proveedor (28/07/2026)
Solo para productos con `origen != 'proveedor'` (subidos por admin o CSV) — **nunca** se le puede quitar un producto a un proveedor para dárselo a otro. Doble confirmación: el admin confirma el envío en un diálogo, y el proveedor debe aceptar o rechazar antes de que cambie el dueño.
- `lib/transferencias.ts` + `Doc/database/migration_transferencias.sql` — tabla `transferencias_productos`, RPCs `security definer` `aceptar_transferencia()`/`rechazar_transferencia()` (solo el proveedor destino puede ejecutarlas)
- Al aceptar: actualiza `productos.origen`/`proveedor_nombre` **y** crea una fila espejo aprobada en `solicitudes_productos`, para que mensajería/Administración funcionen sin cambios extra
- UI: botón "🔁 Transferir" en `/productos` (modo selección + barra flotante); pestaña "Transferencias" en `/proveedores` (con badge de pendientes)

### Bug de datos: importador CSV marcaba `origen='proveedor'` sin dueño real (28/07/2026)
`components/ImportCSVModal.tsx` ponía `origen='proveedor'` con solo tener texto en la columna "proveedor" del Excel, sin que existiera cuenta real detrás — inflaba el filtro de proveedores de `/productos` con nombres del Excel viejo. **Corregido**: ese campo ahora es solo informativo (`proveedor_nombre`, insignia gris "🏷️ Viene de X"), no toca `origen`. `Doc/database/fix_origen_csv_productos.sql` corrige los productos ya importados (compara contra `solicitudes_productos` + `user_roles` para saber quién es dueño real).

### Paquetes de envío — medidas y peso por proveedor (28/07/2026)
`lib/paquetes.ts` + `Doc/database/migration_paquetes_envio.sql` — tabla `paquetes_envio`, **una fila por `venta_item`** (no por venta completa), porque un mismo pedido puede traer productos de varios proveedores que empacan por separado.
- Proveedor captura Alto/Ancho/Peso inline en `/proveedores` → Administración, por cada producto vendido
- Admin ve lo mismo en `/envio-nube` → pestaña "Paquetes por proveedor", con filtro de proveedores (mismo patrón que Productos)

### Bug real: recursión infinita de RLS entre `ventas` y `venta_items` (28/07/2026)
Encontrado al probar el flujo de ventas para proveedores: `500 Internal Server Error` al consultar `venta_items` (visible en la consola del navegador). La política `"venta_items select propio"` hace subquery sobre `ventas`, y `"ventas select proveedor"` hace subquery sobre `venta_items` — se disparan mutuamente y Postgres corta con "infinite recursion detected in policy". **Arreglado** en `Doc/database/fix_rls_recursion_venta_items.sql` con dos funciones `security definer` (`es_venta_de_mi_producto`, `es_item_de_mi_producto`) que resuelven la pertenencia sin volver a evaluar RLS de la tabla contraria — patrón estándar de Postgres para este tipo de ciclo. **Si algo similar vuelve a pasar** (500 en una tabla con políticas que se referencian entre sí), este es el patrón de fix a aplicar.

### Seguimiento de pedido propio en `/mi-cuenta` (28/07/2026)
Reemplaza los links externos a la web de cada paquetería (DHL/FedEx/etc.) — el cliente ya no sale del proyecto para rastrear:
- Línea de tiempo de 3 pasos (Pedido recibido → En camino → Entregado) con fechas reales de `envios.fecha_envio`/`fecha_entrega`
- Mapa real embebido vía `<iframe>` de **OpenStreetMap** (sin API key, sin costo, sin dependencias nuevas) — marcador que se mueve entre origen y destino según el progreso. Coordenadas de ejemplo fijas (centro de Maravatío, Michoacán, sede real de OrdenExpress); **todavía no conectado a GPS real** del transportista, aclarado explícitamente en la UI
- Este mismo patrón de link externo (`TRACKING_URL`) sigue existiendo tal cual en `/envio-nube` (admin) y `/proveedores` (Administración) — el cambio a mapa propio se aplicó **solo** en el panel del cliente, a pedido explícito

### Optimización rol Proveedor + frontend Storefront (29/07/2026)
- **Bug real de pérdida de datos, corregido**: `lib/solicitudes.ts` → `aprobarSolicitud()` no copiaba `detalles` (colores/tallas/variantes/peso/dimensiones/fotos extra) del `solicitudes_productos` aprobado hacia el `productos` final. Ahora copia `detalles` completo y extrae `precio_promocional` desde `detalles.precio_promocional` (la tabla `solicitudes_productos` no tiene columna propia para eso, se guarda dentro del jsonb como el resto de los campos opcionales).
- **RLS de `solicitudes_productos`** permite `UPDATE` a cualquier autenticado (policy `"auth gestiona solicitudes"`) — se usó para que el proveedor reenvíe su propia solicitud rechazada a revisión sin necesitar una función RPC nueva.
- **Header de escritorio del Storefront**: `position:sticky` no servía porque su contenedor (`.home-immersive`) es más corto que el scroll real de la página (diagnosticado con `getBoundingClientRect`/`getComputedStyle`). Reemplazado por `position:fixed` replicando a mano `left`/`width`/`max-width` de `.page-shell` en cada breakpoint + CSS var `--nav-width`. Si se necesita algo "pegajoso" en este proyecto, preferir este patrón a `sticky`.
- Bottom nav bar móvil (`.oe-bottom-nav`, `storefront.css`) con Inicio/Buscar/Rastreo/Perfil.
- "Mis solicitudes" del proveedor (`/proveedores`) ahora muestra el `motivo_rechazo` real (la columna ya existía pero el `useState` no la tipaba) y tiene botón "Reenviar a revisión".
- Nueva sección "Perfil comercial" en Ajustes del proveedor (descripción, redes sociales, métodos de envío, estado de cuenta) — **requiere correr `Doc/database/migration_perfil_proveedor.sql`**, sin eso el guardado no persiste.
- **Rediseño UX/UI del formulario "Agregar producto" del admin** (`components/ProductoModal.tsx`): tarjetas (Imágenes/Información básica/Inventario y precio/Variantes/Envío/Información adicional) en layout de 2 columnas, galería de imágenes unificada con reordenar arrastrando, peso con selector de unidad (g/kg/ml/L → se guarda siempre en gramos), dimensiones con etiquetas claras, barra sticky con Guardar borrador/Guardar y agregar otro/Guardar producto. "Guardar y agregar otro" se implementó con un `modalKey` en `app/productos/page.tsx` que fuerza remount del modal sin cerrarlo.
- **Mismo rediseño aplicado al formulario "Registrar producto" del proveedor** (`app/proveedores/page.tsx`, tab `registro`), con un extra: panel lateral fijo con vista previa en vivo + % de formulario completado + campos pendientes, y recuerda la última categoría usada al agregar el siguiente producto de la lista.
- **Gotcha de encoding, importante**: nunca usar `Get-Content`/`Set-Content` de PowerShell para editar `app/proveedores/page.tsx` (ni otro archivo con tildes/emojis) — corrompió la codificación UTF-8 de todo el archivo en esta sesión (se recuperó con `git checkout` porque el commit anterior ya tenía el trabajo previo a salvo). Usar siempre el editor de archivos.
- Detalle completo del día: `Doc/sesiones/seccion-29-07-2026.md`.

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
- [ ] **Falta `git push`** — varios commits del 06/08 y 07/08 quedaron adelante de `origin/master` sin subir; un intento de push automático falló pidiendo credenciales de GitHub que este entorno no puede mostrar interactivamente. Correr `git push origin master` desde una terminal con acceso a GitHub para que Vercel despliegue.
- [ ] **Confirmar en Supabase** si ya se corrieron `migration_separar_mensajes_producto.sql` y `migration_trim_sku_productos.sql` (06/08) — sin ellas, Mensajes no separa hilo general/por producto y el trigger anti-duplicado de SKU no existe todavía en la base real.
- [x] **`Doc/database/migration_seguridad_claves_pago.sql`** (06/08) — corrida y verificada en vivo: acceso a `config_pagos_secretos` (claves de BBVA/PayPal/Mercado Pago) cerrado a solo admin. Se confirmó que `anon` sigue bloqueado y que la fila no perdió datos.
- **Nota (06/08):** se había agregado en `lib/pagos-config.ts` una restricción para ignorar llaves de producción guardadas en la BD (solo permitir sandbox ahí) — **se revirtió** a pedido explícito del usuario: el panel está diseñado para que el admin meta cualquier llave (de prueba o de producción) y funcione de inmediato, sin distinción. La única protección que queda para estas claves es la RLS de arriba (solo admin puede leer/escribir la tabla).
- [x] **Correr en Supabase `Doc/database/migration_registro_proveedores.sql`** (05/08) — creada la tabla `solicitudes_registro_proveedor` y la columna `config_storefront.registro_proveedor_activo`. Confirmado en vivo con la REST API.
- [x] **`Doc/database/migration_registro_proveedores_fix_insert.sql`** (05/08) — corrida y probada de punta a punta en vivo desde `/registro-proveedor`: el formulario público ya inserta bien en `solicitudes_registro_proveedor`. (El error de RLS que se veía antes con `curl` era un falso positivo del propio comando de prueba, que pedía `Prefer: return=representation`; el código real de la app nunca pide eso.)
- [x] **"Aprobar" en Configuración → Nuevos proveedores ya crea la cuenta real** — reutiliza `/api/admin/crear-proveedor` (mismo `PASSWORD_CUENTA_DEFAULT` que el alta manual desde "Usuarios y roles"), marca la solicitud como aprobada, y notifica al proveedor por correo con su email/contraseña y el recordatorio de cambiarla (`supabase/functions/notify-registro-proveedor`). Al rechazar, se notifica el motivo y el registro se BORRA de la base (a propósito, no se conserva el dato de alguien rechazado).
- [x] **Edge Function `notify-registro-proveedor` desplegada y probada** (05/08) — se hizo por el dashboard de Supabase (no CLI). `RESEND_API_KEY` configurada en Secrets. Remitente en `onboarding@resend.dev` (sandbox de Resend) porque la cuenta de Resend del proyecto (`oepmshop@gmail.com`) no tiene un dominio propio verificado — **mientras siga así, Resend probablemente solo entregue correos a `oepmshop@gmail.com`, NO a proveedores reales**. Probado en vivo: aprobado y rechazado ambos devolvieron `{"ok":true}`. Cuando haya un dominio real del proyecto, verificarlo en Resend → Domains y cambiar el `from` en `supabase/functions/notify-registro-proveedor/index.ts`.
- [ ] **Correr en Supabase `Doc/database/migration_proteccion_datos_chat.sql`** (05/08) — crea el trigger `trg_validar_mensaje` en `mensajes` que bloquea a nivel de base de datos teléfonos, correos, redes sociales y links dentro del chat cliente↔proveedor (respaldo del filtro ya activo en `lib/mensajeria.ts` del lado del navegador). Sin ella, alguien que llame directo a la API de Supabase podría saltarse el filtro del cliente.
- [ ] **Correr en Supabase `Doc/database/migration_pausa_proveedor.sql`** (04/08) — agrega `user_roles.pausado_por_titular`, `productos.proveedor_email`/`pausado_por_proveedor`, recrea la vista `productos_con_estado`, y crea el trigger que apaga/prende en bloque los productos de un proveedor cuando pausa o reactiva su cuenta. Sin ella, el botón "Pausar mi cuenta" en Ajustes del proveedor no hace nada real.
- [ ] **Punto de venta (`components/VentaModal.tsx`, `app/punto-de-venta/page.tsx`) no filtra por `activo`** — a diferencia de la tienda pública, el POS interno sigue mostrando productos de proveedores en pausa/inactivos. No se tocó en esta sesión porque no se revisó ese flujo; si se necesita que también los oculte ahí, hay que agregarlo aparte.
- [ ] **Correr en Supabase `Doc/database/migration_solicitudes_categorias.sql`** (04/08) — crea la tabla `solicitudes_categorias`; sin ella, el botón "🏷️ Solicitar categoría" del proveedor y la tarjeta "Solicitudes de categorías" en Filtros fallan al leer/guardar
- [ ] **Correr en Supabase `Doc/database/migration_solicitudes_actualizacion.sql`** (04/08) — agrega `tipo` ('nuevo'/'actualizacion') y `producto_id` a `solicitudes_productos`; sin ella, "🔄 Solicitar actualización" en el panel de proveedores y la edición de solicitudes pendientes fallan al guardar
- [ ] **Correr en Supabase `Doc/database/migration_fix_actualizar_mi_perfil.sql`** (03/08) — error real reproducido en vivo al guardar el nombre desde Ajustes ("Could not choose the best candidate function..."): quedaron dos versiones de `actualizar_mi_perfil` (con y sin `nuevo_avatar_url`) y Postgres no sabe cuál usar cuando se llama solo con `nuevo_nombre`; esta migración las reemplaza por una sola
- [ ] **Correr en Supabase `Doc/database/migration_categorias_campos_extra.sql`** (01/08) — agrega la columna `campos_extra` (jsonb) a `categorias` y siembra la config de "Ropa"; sin ella, el panel "Tienda en línea > Filtros > Campos contextuales por categoría" y las tarjetas contextuales de `ProductoModal.tsx`/`app/proveedores/page.tsx` fallan al leer/guardar
- [ ] **Correr en Supabase `Doc/database/migration_nav_movil.sql`** (30/07) — bloquea el guardado en `/tienda-en-linea/navegacion-movil` (columna `nav_movil` en `config_storefront`)
- [ ] El botón "Reenviar a revisión" se probó en vivo el 31/07 sobre el producto real "Prueba" (SKU `323565`) — quedó otra vez en estado "pendiente"; volver a rechazarlo desde el panel admin si se quiere esa fila de prueba como estaba
- [ ] **Correr en Supabase `Doc/database/migration_perfil_proveedor.sql`** (29/07) — bloquea el guardado de "Perfil comercial" del proveedor en Ajustes
- [ ] El botón "Reenviar a revisión" se probó en vivo el 29/07 sobre el producto real "Prueba" (SKU `323565`) — quedó en estado "pendiente"; volver a rechazarlo desde el panel admin si se quiere esa fila de prueba como estaba
- [ ] **Confirmar que se corrió en Supabase todo el SQL del 28/07**: `migration_transferencias.sql`, `fix_origen_csv_productos.sql`, `migration_paquetes_envio.sql` y sobre todo **`fix_rls_recursion_venta_items.sql`** (corrige un 500 real que afecta a cualquier proveedor consultando sus ventas — el más urgente de confirmar)
- [ ] Los scripts `Doc/database/diagnostico_*.sql` y `seed_*.sql` del 28/07 son de un solo uso (datos de prueba) — se pueden borrar cuando ya no se necesiten como referencia
- [ ] Mapa de rastreo de `/mi-cuenta` sigue con coordenadas de ejemplo fijas (Maravatío) — no conectado a GPS real de ningún transportista; el link externo a la paquetería (`TRACKING_URL`) sigue existiendo tal cual en `/envio-nube` y `/proveedores`
- [ ] **Confirmar que se corrió en Supabase todo el SQL de mensajería** (`Doc/database/migration_mensajeria.sql`) — se fue ampliando en 3 commits del 27/07 (tablas base, `producto_id`, índices únicos separados); no hay confirmación de que quedó aplicado completo
- [ ] **Confirmar en Supabase Dashboard → Authentication → URL Configuration** que la Redirect URL de producción (`https://nube-store-pi.vercel.app/auth/callback`) y el Site URL quedaron guardados — se guio paso a paso el 27/07 pero sin confirmación final
- [ ] Badge de notificación de mensajes sin leer para el admin en "Comentarios" (ofrecido el 27/07, no pedido todavía)
- [ ] **Confirmar que se corrió en Supabase todo el SQL del 24/07**: `parent_id` en `categorias` + migración automática de categorías `"Padre / Hijo"` + índice único compuesto (reemplaza al índice único case-insensitive del mismo día), y las columnas nuevas de `config_storefront` para `destacados`, "Editar perfil" (`avatar_url` en `user_roles` + función `actualizar_mi_perfil` con `nuevo_avatar_url`) y el Footer (`youtube`, `footer_telefono_2`, `footer_direccion`, `footer_copyright`, `footer_paginas`, `footer_newsletter_activo`, `footer_envios_logos`) — se fue pasando por bloques a lo largo del día, no hay confirmación de que todo quedó aplicado
- [ ] **Configurar las credenciales reales de BBVA/OpenPay, PayPal y Mercado Pago** — ya se pueden cargar desde el panel (`/tienda-en-linea/legal` → "Claves de pago", tabla `config_pagos_secretos`) o por variables de entorno; sin ellas ninguna pasarela cobra de verdad todavía (22-23/07/2026)
- [ ] **Re-habilitar RLS en `productos` y `categorias`** antes de producción — sigue desactivado desde la sesión de importación CSV, por pedido explícito del usuario
- [ ] Importar `pruebas/control-tienda-2023-LIMPIO-FINAL.csv` — el usuario no confirmó haberlo hecho todavía
- [ ] Footer de la tienda (`components/StorefrontFooter.tsx`): solo se prueba en vista de escritorio, oculto explícitamente en móvil (`display:none` en el breakpoint `max-width:1180px`) — falta diseñarlo y activarlo para móvil
- [ ] Newsletter del footer no está conectado a ningún backend real (ni tabla de suscriptores ni servicio de email) — el botón "Enviar" solo valida el formato del correo en el cliente
- [ ] Validar la firma `x-signature` del webhook de Mercado Pago (antes de producción)
- [ ] Guardar `payment_id`/`chargeId` de MP, PayPal y OpenPay en `ventas` para conciliación
- [ ] Vista previa de Tienda en línea: el iframe tiene `src="/"` fijo — si se navega dentro (ej. clic en "Soy proveedor"), se queda ahí y el switch PC/Móvil no vuelve sola al inicio. Falta botón "🏠 Inicio" o reset automático al cambiar de tab
- [ ] Migrar sistema de login de tienda (registros) a Supabase Auth
- [ ] Carrito de tienda persistente en DB para clientes con cuenta (cart_items)
- [ ] Confirmación de pedido por email al hacer checkout en Storefront
- [ ] Exportar ventas/clientes a CSV
- [ ] Modo oscuro

## Completado (07/08/2026)
- [x] **Detección real de móvil vs. PC**: toda la lógica de "¿es móvil?" (Storefront, panel admin) usaba solo el ancho de ventana — se cambió a exigir también `pointer: coarse`, para que resoluciones angostas de PC (o ventanas achicadas/zoom) nunca cambien al diseño móvil por error
- [x] Menú lateral del Home: se retrae automáticamente 2s después de cargar la página aunque nunca se le pase el mouse por encima (antes solo pasaba al entrar-y-salir con el cursor); ícono de Soporte cambiado a headset (diadema + micrófono)
- [x] Degradado detrás del encabezado del Home para asegurar contraste del título/botones sin importar qué foto suba el admin al carrusel ni cómo la recorte cada resolución
- [x] **Nav del Home se escala completo** (ancho, texto, íconos, separaciones) según la resolución/escalado real de la pantalla, usando 1600px como referencia — nunca oculta botones, solo se agranda o encoge en conjunto; `--nav-width` se recalcula igual para que el contenido de al lado quede siempre alineado sin huecos ni superposiciones. Solo aplica en PC; celular/tablet real no se toca
- [x] Barra de scroll interna del nav del Home ya no se ve por defecto, solo al pasar el mouse (el scroll sigue funcionando siempre)
- [x] Tarjetas de métricas del Dashboard convertidas en botones que llevan a la pantalla correspondiente ("Pendientes de aprobación" abre además el panel de solicitudes automático en `/productos?solicitudes=1`, "Proveedores registrados" abre la pestaña Proveedores en `/clientes?seccion=proveedores`); "Productos rechazados" y "Productos sin stock" se dejaron sin botón a propósito, no hay pantalla que liste esos datos
- [x] Aviso "No hay productos" agregado a "Mis solicitudes" del portal de proveedores cuando la lista está vacía (era la única lista del proyecto sin ese aviso)
- **Nota:** se intentó primero escalar la página COMPLETA con `zoom` (no solo el nav) — se revirtió a medio camino porque `.photo-carousel` usa `width:100vw;height:100vh`, unidades que no se llevan bien con `zoom` (se desbordaba muchísimo en pantallas grandes). Ver `Doc/sesiones/seccion-07-08-2026.md` para el detalle completo.

## Completado (31/07/2026)
- [x] Selector de categorías con autocompletado (cuadro de texto + sugerencias en vivo); nueva categoría se normaliza a "Primera mayúscula, resto minúsculas" y ya no duplica si existe con otra combinación de mayúsculas
- [x] `ProductoModal.tsx`: recuadro "+ Agregar más imágenes" dentro de la cuadrícula (en azul, con hover), "Información adicional" movida arriba de "Imágenes", panel lateral de Vista previa/Progreso/Consejo siempre visible — mismo recuadro de imágenes portado al formulario del proveedor
- [x] Menú lateral del Home en escritorio se encoge a su versión angosta tras 2s sin el cursor encima, y se restaura al instante si vuelve a entrar
- [x] Buscador del panel admin flotante en móvil (ya no se superpone con el logo); botón "×" borra el texto antes de cerrar
- [x] **Fix de bug real de CSS Grid**: la imagen de las tarjetas `.compact`/`.wide` del Home podía colapsar a 0px con títulos largos — corregido con `minmax()` en las columnas
- [x] Corregidos dos bugs de `z-index` encadenados: resultados del buscador del Storefront tapados por la tarjeta "Inicio" (escritorio) y recortados por `overflow:hidden` del sidebar (móvil)
- [x] **Fix de warning de React** `value={null}` en 4 páginas de configuración de la tienda (legal, filtros, páginas, footer) — columnas nunca llenadas en Supabase venían `null` en vez de `''`

## Completado (30/07/2026)
- [x] Nuevo apartado admin **Tienda en línea → Navegación móvil**: editar nombre/ícono de los botones fijos de la barra inferior + agregar botones extra
- [x] El fondo de la barra inferior móvil respeta el ajuste "Fondo del logo" (blanco/azul) de Diseño — antes solo aplicaba al sidebar de escritorio
- [x] Ícono de "Entrar" del bottom nav cambiado de flecha a persona en círculo
- [x] Barra de navegación inferior rediseñada como "pastilla flotante" (separada de los bordes, esquinas redondeadas, blur) que se encoge un poco al deslizar hacia abajo y vuelve a su tamaño al subir

## Completado (29/07/2026)
- [x] **Fix de bug real**: `aprobarSolicitud()` ya copia `detalles` (colores/tallas/variantes/peso/dimensiones/fotos extra) al producto aprobado — antes se perdían en silencio
- [x] Campo "Precio de promoción" en el formulario de producto del proveedor + controles ◀▶/★ Principal en fotos adicionales (igual que el modal del admin)
- [x] "Mis solicitudes" del proveedor muestra el motivo de rechazo real y permite reenviar a revisión
- [x] Dashboard del proveedor: 8 métricas + panel de alertas; nueva sección "Perfil comercial" en Ajustes
- [x] Storefront: bottom nav bar móvil, header de escritorio dinámico (fix de `sticky` roto → `fixed`), badge de oferta + últimas unidades en tarjetas, búsqueda ordenada por relevancia
- [x] Auditoría de "Pedidos del Proveedor" — ya estaba completo por trabajo de sesiones previas, sin huecos encontrados
- [x] **Rediseño UX/UI completo del formulario "Agregar producto"** del admin (`ProductoModal.tsx`): tarjetas, galería unificada, peso con unidad, dimensiones claras, borrador, guardar y agregar otro
- [x] **Mismo rediseño aplicado al formulario "Registrar producto"** del proveedor, con panel lateral de vista previa en vivo + % completado + recordar última categoría

## Completado (28/07/2026)
- [x] **Transferencia de productos admin→proveedor** con doble confirmación — ver sección "Transferencia de productos" más arriba
- [x] **Fix de bug de datos**: importador CSV inflaba el filtro de proveedores de `/productos` marcando `origen='proveedor'` sin cuenta real detrás — corregido en el importador + script de limpieza para lo ya importado
- [x] **Registro de medidas/peso de paquete** por el proveedor (alto, ancho, peso), por línea de venta — visible también en Envíos del admin con filtro de proveedores
- [x] **Fix de bug real**: recursión infinita de RLS entre `ventas`/`venta_items` que tiraba 500 al consultar ventas como proveedor — ver sección dedicada más arriba
- [x] "Mis productos" del proveedor: toggle de vista grid/lista (igual que Productos del admin)
- [x] **Seguimiento de pedido propio** en `/mi-cuenta`: línea de tiempo de 3 pasos + mapa real (OpenStreetMap embebido, sin API key) — reemplaza los links externos a la paquetería, solo en el panel del cliente

## Completado (27/07/2026)
- [x] **Login social**: botones Google/Facebook (`signInWithOAuth`) en `app/login/page.tsx` + `app/auth/callback/route.ts` nuevo. Bug real encontrado: `redirectTo` faltaba en la allowlist de Redirect URLs de Supabase, caía al Site URL sin consumir el `code` — corregido agregando `localhost:3000/auth/callback` y el equivalente de producción
- [x] **`middleware.ts` reactivado** con protección real por rol — estaba deshabilitado desde antes; se detectó el hueco al ver que el login social podía aterrizar a un cliente básico en el panel admin
- [x] **Sistema interno de mensajería** cliente↔proveedor↔admin con Supabase Realtime — diseñado con el usuario antes de implementar (ver sección "Mensajería interna" más arriba)
- [x] Mensajería: lista de conversaciones del proveedor agrupada por cliente (fix de ambigüedad cuando varios clientes preguntan por el mismo producto)
- [x] Mensajería: "Contactar a soporte" del cliente movido de la pestaña Mensajes a un submenú dentro de Configuración
- [x] Mensajería: botón "Contactar al proveedor" agregado también en la ficha pública de producto (`/tienda/[slug]`), resolviendo el proveedor automáticamente por SKU
- [x] **Fix real**: tarjetas del catálogo de tienda con distinta altura según el texto — `align-items:start` movido de `.store-grid` a `.shop-layout`, título con `line-clamp:2` + `min-height` reservado
- [x] Carrito de la tienda: botón "Quitar" (texto) → ícono de bote de basura (`Trash2`, lucide-react)
- [x] Carrito de la tienda: cantidad editable con botones +/- (respeta `productStockMap`) y clic en el artículo abre el detalle del producto (`/tienda/{sku}`)

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

## Completado (23/07/2026)
- [x] **Sistema de roles real para proveedores y clientes** — antes solo existía para el panel admin. Roles `proveedor` y `basico` agregados a `user_roles` (check constraint ampliada). Self-signup público en `/registro`: un trigger de Postgres (`handle_new_user`) crea la fila en `user_roles` automáticamente al registrarse en Supabase Auth, **sanitizando el rol en el servidor** — verificado con una prueba real forzando `role: "admin"` desde el metadata del signup, el trigger lo bajó a `basico` correctamente. Nunca se puede autoasignar admin/vendedor/bodega por esta vía
- [x] **Fix de seguridad real, encontrado de rebote**: la policy `"select autenticado"` de `clientes`/`ventas`/`venta_items`/`envios` dejaba ver **toda la base** a cualquier cuenta logueada (incluidos clientes básicos nuevos). Separada en policies de staff (admin/vendedor/bodega) vs "propio" (`auth.jwt()->>'email'` contra `clientes.email`)
- [x] `/proveedores`: pasó de ser público (acceso con solo un email, sin cuenta) a requerir sesión real + rol `proveedor`/`admin`. Nueva pestaña **"Administración"** (primer lugar del menú): panel de pago informativo (piezas vendidas / por pagar / ya pagado, sobre `costo × cantidad`) + seguimiento de envío por producto vendido — el vínculo proveedor↔producto es por SKU vía `solicitudes_productos.proveedor_email` aprobadas, porque `productos` no guarda el email del proveedor directamente
- [x] `/mi-cuenta` (nuevo panel de cliente): reescrito con el mismo layout sidebar que admin/proveedores (antes era una tarjeta suelta). Pestañas: Mis pedidos (con seguimiento de envío y link de rastreo), Datos de facturación, Configuración (editar nombre vía función `actualizar_mi_perfil` — security definer, solo toca la columna `nombre`, para no abrir una policy de UPDATE genérica en `user_roles`; cambiar contraseña vía `supabase.auth.updateUser`)
- [x] **Credenciales de pago configurables desde el panel** (`/tienda-en-linea/legal`, sección "Claves de pago"): BBVA/OpenPay, PayPal y Mercado Pago. Nueva tabla `config_pagos_secretos` con RLS **solo admin** (a propósito separada de `config_metodos_pago`, que sí es de lectura pública para que el storefront sepa qué botones mostrar — nunca deben compartir tabla). `lib/pagos-config.ts` (`getPagosConfig()`) las lee con fallback a variables de entorno; las 5 Route Handlers de pago migradas de `process.env.*` directo a este helper
- [x] **Fix: el catálogo se topaba en 1000 productos** — Supabase/PostgREST corta cualquier consulta sin `.range()` a 1000 filas por defecto. `app/productos/page.tsx` ahora pagina la lectura en lotes de 1000 hasta traer todo (1116 productos tras la importación del Excel 2023)
- [x] **Fix: paginación se salía de la pantalla** con catálogos grandes (un botón por página, sin límite). `lib/pagination.ts` (`paginasVisibles()`) — ventana de 1, última, actual±1 con "…" — aplicado en Productos, Clientes y Ventas
- [x] Campana de notificaciones (`Topbar.tsx`) generalizada — antes solo avisaba ventas nuevas. Ahora combina ventas + stock bajo/agotado + solicitudes de proveedor pendientes, cada una con su propio link. Ícono de campana real agregado a `Icon.tsx` (antes usaba el triángulo de advertencia, confuso)
- [x] Importador CSV: 18 columnas nuevas reconocidas (histórico del Excel "control tienda en línea 2023" — contacto/teléfono de proveedor, IDs originales del Excel, y todo el desglose financiero de la plataforma anterior: Open Pay, comisión Tiendanube, utilidad, etc.). A pedido explícito del usuario, **no** van al campo `detalles` (JSON) — tienen su propia columna real en `productos`, aunque el importador no las muestre en su vista previa. `pruebas/control-tienda-2023-LIMPIO-FINAL.csv`: 1116 filas, 1116 SKUs únicos, `detalles` completamente libre
- [x] Segunda ronda de ajustes al logo nuevo (subido por el usuario el 22/07): tamaño más grande en todo el proyecto, centrado real vía `position:absolute` en vez de depender del espacio libre entre íconos desiguales (hamburguesa vs. lupa+carrito), fondo de la barra intercambiable blanco/azul configurable desde Diseño (`config_storefront.fondo_logo`)
- [x] **Bug de Tailwind identificado y corregido**: el `@import "tailwindcss"` de `globals.css` trae el preflight, que fuerza `display:block` en todo `<img>` — eso invalida `text-align:center` del contenedor (que solo centra contenido inline). Rompía el centrado del logo en `/login`, `/registro` y ambos sidebars; se corrigió con `display:flex; justifyContent:center` explícito en cada uno

## Completado (24/07/2026)
- [x] Clientes: nueva pestaña "Proveedores" dentro de `/clientes` — tabla de `user_roles` filtrada por `role='proveedor'`, con conteo de productos aprobados por proveedor (join en JS contra `solicitudes_productos`)
- [x] Menús: botones personalizados (`config_storefront.menu_extra` jsonb) — el admin agrega enlaces extra al nav lateral de la tienda (a WhatsApp, redes, páginas externas), cada uno con ícono/etiqueta/URL/pestaña nueva
- [x] Filtros: toggle de activar/desactivar para los botones fijos "Nuevo"/"Ofertas" del topbar de la tienda (antes solo los botones extra personalizados lo tenían) — columnas `topbar_btn1_activo`/`topbar_btn2_activo`
- [x] **Fix real:** tarjetas del catálogo de la tienda se estiraban a lo alto cuando había pocos resultados — `.store-grid` no tenía `align-items: start`, así que las tarjetas se estiraban para igualar la altura del panel de Filtros
- [x] Sidebar del storefront: el bloque de perfil (arriba fijo "Cuenta demo") ahora muestra el usuario real de sesión (`useAuth()`) con avatar de inicial y rol correcto; en estado colapsado el avatar se queda visible en vez de desaparecer entero; se unificó con el botón de "Iniciar sesión"/perfil que antes vivía duplicado en la topbar (eliminado)
- [x] Ícono de "Soporte" del nav de la tienda cambiado de audífonos a un ícono de agente de soporte (SVG propio, lucide no trae uno adecuado)
- [x] **"Editar perfil" en Configuración/mi-cuenta/proveedores** — nueva pestaña en los 3 paneles (admin, cliente, proveedor): editar nombre, subir foto de perfil (WebP, mismo pipeline que productos) y cambiar contraseña. Columna `avatar_url` en `user_roles`; función `actualizar_mi_perfil` ampliada para aceptar `nuevo_avatar_url` opcional
- [x] `/tienda-en-linea/paginas`: sección "Destacados del inicio" — las 2 tarjetas grandes bajo el carrusel (antes hardcodeadas en `Storefront.tsx`) ahora se editan desde el panel; columna `config_storefront.destacados` jsonb, con fallback al contenido anterior si está vacía
- [x] `/dashboard`: fix del mismo bug de límite de 1000 filas de PostgREST, esta vez en la tarjeta "Productos sin stock" (usaba `.lte('stock',3)` sin `.range()` y contaba en el cliente) — ahora usa `count:'exact', head:true` directo en la base; tarjeta nueva "Proveedores registrados"
- [x] Flash de contenido viejo al recargar el home de la tienda (se veía el hero/carrusel de ejemplo por un instante antes de cargar la config real) — flag `configLoaded` con `visibility:hidden` hasta que responde Supabase
- [x] **Categorías padre/hijo (jerarquía de 2 niveles)**: columna `parent_id` en `categorias`; `lib/categorias.ts` con helpers de normalización/búsqueda case-insensitive y armado de árbol; nuevo componente `CategoriaSelector.tsx` (padre + subcategoría opcional, con alta inline) usado en ProductoModal, Proveedores y Filtros; el filtro de la tienda agrupa por padre con expandir/contraer; CSV import/export entiende `Padre / Hijo` en la columna `categoria` (antes el importador descartaba el padre y solo tomaba el último nivel)
- [x] **Fix de categorías duplicadas por mayúsculas/espacios** ("Dulces típicos" vs "DULCES TIPICOS Y ALIMENTOS") — índice único case-insensitive sobre `lower(trim(nombre))`, luego migrado a uno compuesto con `parent_id` al agregar jerarquía; limpieza de duplicados existentes vía `DO` block en SQL
- [x] Login: quitado el texto "Panel administrativo" y "¿Sin acceso al panel administrativo?..." (decisión de diseño, ya no se ocupan)
- [x] Footer de la tienda (`components/StorefrontFooter.tsx`, nuevo) — marca + redes + contacto, enlaces institucionales editables, newsletter (solo validación de cliente, sin backend), logos de paquetería, copyright con año automático. Editor nuevo en `/tienda-en-linea/footer`. Sidebar fijo del storefront corregido para no taparlo: mide la posición real del footer por JS y acorta su propio `bottom` para detenerse antes de cubrirlo — **solo activo en Inicio, vista de escritorio**
- [x] Borde blanco visible en la barra móvil del home (`.sidebar` tenía un `border` sutil pensado para el fondo navy de escritorio, quedaba marcado al reducirse a la barra superior en móvil) — `border:none` en el breakpoint móvil

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
