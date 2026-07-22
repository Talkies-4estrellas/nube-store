# Índice de archivos — Order Express

> Mapa de cada archivo del proyecto: ubicación, ruta URL (si aplica) y función exacta.
> Mantener sincronizado con `CLAUDE.md` y `Doc/documentacion/documento.md`.

---

## Raíz del proyecto

| Archivo | Función |
|---------|---------|
| `CLAUDE.md` | Instrucciones permanentes para Claude: stack, convenciones, decisiones técnicas, pendientes |
| `next.config.ts` | Configuración de Next.js |
| `tsconfig.json` | Configuración de TypeScript |
| `package.json` | Dependencias: `next`, `@supabase/ssr`, `lucide-react` |
| `middleware.ts` | Protege rutas admin — redirige a `/login` si no hay sesión (actualmente comentado) |

---

## `app/` — Rutas del panel administrativo

| Archivo | URL | Función |
|---------|-----|---------|
| `app/layout.tsx` | — | Root layout: `<AuthProvider>` + `<AppChrome>`. `suppressHydrationWarning` en `<html>` y `<body>`. Metadata del sitio. |
| `app/page.tsx` | `/` | Redirige a `/dashboard` |
| `app/login/page.tsx` | `/login` | Login con email + password. Consulta `user_roles` para obtener rol. Redirige según `ROLE_HOME`. Ruta pública. |
| `app/dashboard/page.tsx` | `/dashboard` | Métricas en tiempo real: ventas recientes, stock bajo, top producto/categoría/cliente, gráfica SVG de ventas por período (hoy/semana/mes), toasts realtime de stock. |
| `app/productos/page.tsx` | `/productos` | CRUD de productos: alta, edición, eliminación, subida de imagen WebP a Supabase Storage. Vista grid/lista, filtro categoría, búsqueda, sort, paginación (12/pág). Usa la VIEW `productos_con_estado`. |
| `app/ventas/page.tsx` | `/ventas` | Lista de ventas con filtros y búsqueda. Panel lateral de detalle con items. Cambio de estado (Pendiente → Pagado → Enviado / Cancelado). Stepper visual del pipeline. Impresión de comprobante. |
| `app/clientes/page.tsx` | `/clientes` | Lista de clientes con filtro por tag (Nuevo/Regular/VIP), búsqueda, sort, paginación (15/pág). Panel detalle con historial de pedidos. Soft-delete vía `deleted_at`. Modal para alta/edición. |
| `app/punto-de-venta/page.tsx` | `/punto-de-venta` | POS táctil: catálogo con búsqueda + filtro categoría, carrito, 3 métodos de pago (Efectivo/Tarjeta/Transferencia), verificación de stock real antes de cobrar, find-or-create cliente, crea venta + items. |
| `app/proveedores/page.tsx` | `/proveedores` | Portal público para proveedores. Layout dos columnas (sidebar fija igual al admin). Formulario multi-producto con imagen, auto-guardado en localStorage, historial de solicitudes por email. Ruta pública. |
| `app/configuracion/page.tsx` | `/configuracion` | Configuración del negocio: datos generales, contacto, pagos, notificaciones (escribe en `config_storefront`). Gestión de usuarios y roles (admin only). Revisión de solicitudes de proveedores (admin only). |

---

## `components/` — Componentes compartidos

| Archivo | Usado en | Función |
|---------|----------|---------|
| `AppChrome.tsx` | `app/layout.tsx` | Shell del admin. Detecta rutas públicas (`/`, `/login`, `/proveedores`) y renderiza sin chrome. Muestra spinner auth. Verifica `canAccess()` por rol y muestra `<AccessDenied>` si no pasa. |
| `Sidebar.tsx` | `AppChrome.tsx` | Barra lateral fija 240px. Navegación filtrada por `ROLE_ROUTES[user.role]`. Badge PINK con contador de solicitudes pendientes sobre Configuración. Logout al fondo. Estilo activo: borde NAVY + sombra. |
| `Topbar.tsx` | `AppChrome.tsx` | Barra superior fija 56px. Buscador expandible inline con debounce 280ms (productos, clientes, ventas). Avatar del usuario con nombre y rol. |
| `GlobalSearch.tsx` | `AppChrome.tsx` | Modal de búsqueda global activado con `Ctrl+K`. Busca en productos, ventas y clientes. Navegación con ↑↓↵. Debounce 250ms. Se activa desde `q.length >= 2`. |
| `Storefront.tsx` | `app/page.tsx` (ruta `/`) | Tienda pública completa: 7 secciones (inicio, catálogo, novedades, favoritos, ofertas, carrito, soporte), carrusel hero, carrito persistido en `localStorage oe_cart`, checkout real (crea cliente + venta + items en Supabase), login/registro con tabla `registros`, config dinámica desde `config_storefront`. |
| `ProductoModal.tsx` | `app/productos/page.tsx` | Modal alta/edición de producto. Drag & drop de imagen. Selección de categoría. Usa `convertToWebp` para preview local. |
| `ClienteModal.tsx` | `app/clientes/page.tsx` | Modal alta/edición de cliente. Campos: nombre, email, teléfono, tag. |
| `VentaModal.tsx` | `app/ventas/page.tsx` | Modal nueva venta. Errors inline (sin `alert()`). |
| `Icon.tsx` | Panel admin (múltiples páginas) | Iconos SVG inline propios — sin dependencia externa. Solo para el panel admin. |
| `ConfirmDialog.tsx` | `productos`, `clientes` | Diálogo de confirmación antes de eliminar. |

---

## `lib/` — Utilidades y lógica compartida

| Archivo | Exporta | Función |
|---------|---------|---------|
| `supabase.ts` | `supabase: SupabaseClient` | Crea el cliente con `createBrowserClient` de `@supabase/ssr`. Si faltan las env vars, devuelve un mock completo (`.from()`, `.auth`, `.storage`, `.channel()`, `.removeChannel()`) que no rompe el build. |
| `auth-context.tsx` | `AuthProvider`, `useAuth()`, `canAccess()`, `Role`, `AuthUser`, `ROLE_ROUTES`, `ROLE_HOME` | Context de sesión. Carga usuario y rol desde `user_roles`. Auto-signOut si no tiene rol. |
| `validation.ts` | `isValidEmail(email): boolean` | Validación de email con regex. Usada en: checkout tienda, registro tienda, formulario proveedores. |
| `uploadWebp.ts` | `convertToWebp()`, `captureFrameAsWebp()`, `uploadToSupabase()` | Conversión de imagen a WebP vía Canvas API (solo browser). Captura de frame de video. Upload a Supabase Storage. |

---

## `Doc/` — Documentación del proyecto

| Archivo | Función |
|---------|---------|
| `Doc/indice.md` | Este archivo. Mapa de todos los archivos del proyecto. |
| `Doc/memoria.md` | Instrucciones para Claude: cómo analizar el último commit y actualizar el archivo de sesión del día. |
| `Doc/documentacion/documento.md` | Portada de la documentación por áreas. Enlaza las 6 áreas de abajo. Consultar antes de hacer cambios. |
| `Doc/documentacion/arquitectura.md` | Stack, estructura de carpetas, configuración base (env vars, colores), rutas públicas y sistema de autenticación por roles. |
| `Doc/documentacion/datos.md` | Tablas de la DB, triggers, localStorage, mapa de operaciones Supabase por tabla y los scripts SQL de `Doc/database/`. |
| `Doc/documentacion/modulos-ui.md` | Inventario de páginas, componentes y utilidades (`lib/`) con sus estados, constantes, funciones y operaciones Supabase. |
| `Doc/documentacion/operaciones.md` | Flujos de negocio de punta a punta, manejo de imágenes/Storage, dependencias y assets. |
| `Doc/documentacion/mantenimiento.md` | Pendientes técnicos, convenciones obligatorias, estado de migraciones y registro diario de sesiones. |
| `Doc/documentacion/ia.md` | Cómo la IA (Claude) trabaja el proyecto: qué leer, reglas a respetar y el sistema de memoria/sesiones. |
| `Doc/sesiones/seccion-DD-MM-YYYY.md` | Registro diario de cambios. Un archivo por día. Se actualiza cada vez que se hace un commit. Ver detalle abajo. |
| `Doc/database/schema.sql` | Esquema completo de la base de datos: tablas, triggers, RLS, categorías iniciales. |
| `Doc/database/auth.sql` | Sistema de autenticación: tabla `user_roles`, función `get_my_role()`, políticas RLS por rol. |
| `Doc/database/seed.sql` | Datos de prueba: 20 productos, 10 clientes, 10 ventas con items. |
| `Doc/database/migration_tablas_faltantes.sql` | Migración segura (`IF NOT EXISTS`): crea `registros`, `solicitudes_productos`, agrega `deleted_at` en clientes, inserta fila inicial en `config_storefront`. Ejecutar en Supabase SQL Editor. |

---

## `Doc/sesiones/` — Registro diario de cambios

Un archivo por día, en orden cronológico. Cada entrada documenta un commit: hash, tabla de archivos y descripción.

| Archivo | Día | Contenido |
|---------|-----|-----------|
| `seccion-26-06-2026.md` | 26/06/2026 | Initial commit (Create Next App): andamiaje base del proyecto. |
| `seccion-27-06-2026.md` | 27/06/2026 | Primeras páginas del panel (Envío Nube, Tienda en línea, POS), Sidebar/Topbar, ajustes Vercel. |
| `seccion-28-06-2026.md` | 28/06/2026 | Páginas Dashboard/Productos/Ventas/Clientes, conexión Supabase, schema inicial, subida WebP, modales, iconos, rebranding a Order Express. |
| `seccion-29-06-2026.md` | 29/06/2026 | Storefront público, autenticación + roles + middleware, categorías dinámicas, envíos reales, portal de proveedores, separación panel/tienda. |
| `seccion-30-06-2026.md` | 30/06/2026 | Mejoras a la subida de productos de proveedores, ajustes de configuración, `.claude/settings.json`. |
| `seccion-01-07-2026.md` | 01/07/2026 | POS completo, mejoras generales, editor de tienda en línea, buscador global Ctrl+K, tablas `config_storefront` y `solicitudes_productos`. |
| `seccion-02-07-2026.md` | 02/07/2026 | Inicio del arreglo para presentación: validación email, skeletons, página de presentación, ruta de tienda por slug. |
| `seccion-03-07-2026.md` | 03/07/2026 | Robustez, fixes críticos, rediseño portal de proveedores, migraciones DB, documentación del proyecto. |
| `seccion-05-07-2026.md` | 05/07/2026 | "Adiós nube-store": consolidación definitiva del nombre Order Express. |

---

## Mapa de navegación: documentación ↔ sesiones

Punto de entrada central que cruza cada **área de documentación** (columnas) con las **sesiones de trabajo** que la tocaron (filas). Cada área tiene al final una sección "🕗 Sesiones relacionadas" y cada sesión un bloque "📚 Documentación relacionada" — esta matriz los resume.

| Sesión | [Arquitectura](documentacion/arquitectura.md) | [Datos](documentacion/datos.md) | [Módulos UI](documentacion/modulos-ui.md) | [Operaciones](documentacion/operaciones.md) | [Mantenimiento](documentacion/mantenimiento.md) | [IA](documentacion/ia.md) |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| [26/06](sesiones/seccion-26-06-2026.md) | ✓ | | | | | |
| [27/06](sesiones/seccion-27-06-2026.md) | ✓ | | ✓ | | | |
| [28/06](sesiones/seccion-28-06-2026.md) | ✓ | ✓ | ✓ | ✓ | | |
| [29/06](sesiones/seccion-29-06-2026.md) | ✓ | ✓ | ✓ | ✓ | | |
| [30/06](sesiones/seccion-30-06-2026.md) | | ✓ | ✓ | ✓ | ✓ | |
| [01/07](sesiones/seccion-01-07-2026.md) | | ✓ | ✓ | ✓ | | |
| [02/07](sesiones/seccion-02-07-2026.md) | | ✓ | ✓ | ✓ | | |
| [03/07](sesiones/seccion-03-07-2026.md) | | ✓ | ✓ | ✓ | ✓ | ✓ |
| [05/07](sesiones/seccion-05-07-2026.md) | ✓ | | | | ✓ | ✓ |

> La portada de la documentación por áreas está en [`Doc/documentacion/documento.md`](documentacion/documento.md).

---

## `public/` — Assets estáticos

| Archivo | Función |
|---------|---------|
| `public/storefront/logo.svg` | Logo completo "OrderExpress" usado en la tienda pública |
| `public/storefront/monograma.svg` | Monograma compacto usado en versión colapsada de la tienda |
| `public/imagenes/logo-oe_1-png-300x49.avif` | Logo oficial Order Express (panel admin) |

---

## Rutas públicas (sin autenticación)

```
/              → Storefront (tienda pública)
/login         → Login del panel admin
/proveedores   → Portal de proveedores
```

Definidas en `components/AppChrome.tsx`:
```ts
const PUBLIC_PATHS = ['/', '/login', '/proveedores']
```

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL        URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY   Clave anon pública de Supabase
```

Definidas en `.env.local` (local) y en el dashboard de Vercel (producción).

---

## Dependencias clave

| Paquete | Versión | Por qué |
|---------|---------|---------|
| `next` | 16.2.9 | Framework principal — App Router + Turbopack |
| `@supabase/ssr` | latest | Cliente Supabase con soporte de cookies para middleware |
| `lucide-react` | ^1.22.0 | Iconos — **solo en `Storefront.tsx`**. El panel admin usa `Icon.tsx` propio. |
| `mercadopago` | ^3.2.0 | SDK de la pasarela de pagos (Checkout Pro). Solo servidor. Requiere Node 18+ |

---

## Archivos agregados el 20-21/07/2026

### Backend (Route Handlers)
| Archivo | Función |
|---------|---------|
| `lib/supabase-server.ts` | Cliente Supabase con service role — **solo servidor**, ignora RLS |
| `app/api/pagos/crear-preferencia/route.ts` | Crea la preferencia de Mercado Pago |
| `app/api/pagos/webhook/route.ts` | Confirma el pago y marca la venta como `Pagado` |
| `app/api/productos/importar-imagen/route.ts` | Descarga imagen de un link y la sube al bucket |

### CSV de productos
| Archivo | Función |
|---------|---------|
| `lib/csv.ts` | `toCSV`, `downloadCSV`, `parseCSV`, `detectDelimiter`, `readFileSmart`, `cleanNumber`, `stripHtml` |
| `components/ImportCSVModal.tsx` | Modal de importación: vista previa, validación, descarga de imágenes |

### Documentación y base de datos
| Archivo | Contenido |
|---------|-----------|
| `Doc/pagos-mercadopago.md` | Guía de la pasarela: flujo, variables, credenciales de prueba |
| `Doc/importacion-productos.md` | Formato estándar del CSV y tabla de sinónimos |
| `Doc/plantilla-importacion-productos.csv` | Plantilla de 25 columnas lista para usar |
| `Doc/database/schema_completo.sql` | **Esquema consolidado** — base + 7 migraciones. Para replicar en otra cuenta |
| `Doc/database/migration_productos_ampliado.sql` | 15 columnas nuevas + recreación de la vista |
| `Doc/migracion-supabase.md` | Guía paso a paso para migrar de una cuenta de Supabase a otra (datos + esquema + imágenes) |
| `scripts/exportar-datos.ps1` | Script PowerShell: exporta esquema y datos de un proyecto Supabase vía `supabase db dump` |

---

## Convenciones obligatorias

- **Estilos:** inline styles únicamente — `style={{ ... }}`. Sin Tailwind, sin styled-jsx, sin CSS modules.
- **Commits:** NO hacer `git commit` desde Claude — GitKraken gestiona todos los commits.
- **Iconos panel admin:** usar `<Icon name="..." />` de `components/Icon.tsx`. `lucide-react` solo en Storefront.
- **Colores:** `NAVY = '#252855'` y `PINK = '#e7226d'` definidos localmente en cada archivo que los necesita.
- **Imágenes de productos:** convertir a WebP antes de subir. Path sanitizado: `{timestamp}-{sku-limpio}.webp`.
- **Supabase Storage:** bucket `productos`. Imágenes de proveedores en subcarpeta `solicitudes/`.
