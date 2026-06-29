# Order Express — Panel Administrativo

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
  tienda-en-linea/page.tsx  ← Vista storefront embebida
  punto-de-venta/page.tsx   ← Punto de venta (informativo)
  configuracion/page.tsx    ← Ajustes negocio + gestión de usuarios (admin only)

components/
  Sidebar.tsx         ← Filtrada por ROLE_ROUTES[user.role]; badge de rol; logout
  Topbar.tsx          ← Buscador global + avatar usuario con nombre y rol
  AppChrome.tsx       ← Decide chrome/sin-chrome; spinner auth; AccessDenied por rol
  ProductoModal.tsx   ← Modal agregar/editar producto + drag&drop imagen
  ClienteModal.tsx    ← Modal agregar/editar cliente
  VentaModal.tsx      ← Modal nueva venta (fix: serverError en lugar de alert())
  Icon.tsx            ← SVG inline propio (sin dependencia externa para admin)
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

### Función helper de rol
```sql
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid()
$$;
```
Usada en todas las políticas RLS para verificar el rol sin romper el contexto de seguridad.

### Triggers automáticos
- `updated_at` se actualiza solo en cada cambio
- Total de venta se recalcula al insertar/editar `venta_items`
- Stock baja automáticamente cuando venta cambia a `Pagado`
- Tag del cliente sube (Nuevo → Regular → VIP) según pedidos pagados

### Storage
- Bucket: `productos` (público, SELECT sin restricción)
- Path de imágenes: `{timestamp}-{SKU}.{ext}` (WebP via Canvas API)
- INSERT/DELETE requieren `auth.role() = 'authenticated'`

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

## Pendiente
- [ ] Ejecutar `database/auth.sql` en Supabase SQL Editor (Step 1 del setup auth)
- [ ] Crear usuario admin en Supabase Authentication y hacer INSERT en user_roles (Steps 2-3)
- [ ] Deploy a Vercel (producción desactualizada)
- [ ] Confirmación de pedido por email al hacer checkout en Storefront
- [ ] Exportar ventas/clientes a CSV
- [ ] Modo oscuro

---

## Pasos para configurar auth en Supabase (primera vez)
1. Ejecutar `database/auth.sql` en Supabase SQL Editor
2. En Supabase → Authentication → Users → crear usuario con email + contraseña
3. Copiar UUID del usuario y ejecutar:
   ```sql
   insert into user_roles (user_id, role, nombre) values
     ('UUID-DEL-USUARIO', 'admin', 'Nombre Completo');
   ```
