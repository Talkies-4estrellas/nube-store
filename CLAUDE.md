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
```

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
- [ ] Ejecutar en Supabase: `ALTER TABLE solicitudes_productos ADD COLUMN IF NOT EXISTS detalles jsonb DEFAULT NULL;`
- [ ] Ejecutar `database/auth.sql` en Supabase SQL Editor (Step 1 del setup auth)
- [ ] Crear usuario admin en Supabase Authentication y hacer INSERT en user_roles (Steps 2-3)
- [ ] Ejecutar política anon para `solicitudes/` en Storage (ver schema.sql)
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

---

## Pasos para configurar auth en Supabase (primera vez)
1. Ejecutar `database/auth.sql` en Supabase SQL Editor
2. En Supabase → Authentication → Users → crear usuario con email + contraseña
3. Copiar UUID del usuario y ejecutar:
   ```sql
   insert into user_roles (user_id, role, nombre) values
     ('UUID-DEL-USUARIO', 'admin', 'Nombre Completo');
   ```
