# Order Express — Panel Administrativo

## Descripción
Dashboard administrativo tipo Tiendanube construido con Next.js 16 + Supabase.
Nombre del proyecto: **Order Express** (nombre anterior provisional: Nube Store).

---

## Stack
- **Framework:** Next.js 16.2.9 (App Router, Turbopack)
- **Estilos:** Inline styles (se descartó styled-jsx por incompatibilidad con App Router)
- **Base de datos:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage — bucket `productos` (público)
- **Deploy:** Vercel — rama `master` → `main` en GitHub
- **Repo GitHub:** `https://github.com/Talkies-4estrellas/nube-store.git`

---

## Estructura de carpetas
```
app/
  layout.tsx               ← Layout global con Sidebar + Topbar
  page.tsx                 ← Redirige a /dashboard
  dashboard/page.tsx       ← Métricas reales desde Supabase
  ventas/page.tsx          ← Tabla de ventas con filtros y modal
  productos/page.tsx       ← Catálogo grid/lista con CRUD completo
  clientes/page.tsx        ← Lista de clientes con panel de detalle
  envio-nube/page.tsx      ← Página informativa Envío Nube
  tienda-en-linea/page.tsx ← Diseño de tienda con sub-nav
  punto-de-venta/page.tsx  ← Página informativa Punto de Venta

components/
  Sidebar.tsx         ← Sidebar fija, usa next/link + usePathname
  Topbar.tsx          ← Barra superior con logo y avatar
  ProductoModal.tsx   ← Modal agregar/editar producto + drag&drop imagen
  ClienteModal.tsx    ← Modal agregar/editar cliente
  VentaModal.tsx      ← Modal nueva venta: elige cliente + productos

lib/
  supabase.ts         ← Cliente Supabase (createClient)

database/
  schema.sql          ← Schema completo PostgreSQL (tablas, triggers, RLS)

public/
  imagenes/
    logo-oe_1-png-300x49.avif  ← Logotipo oficial de Order Express
```

---

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://arqoyuxcugpprzjpcytg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Base de datos Supabase

### Tablas
| Tabla | Descripción |
|-------|-------------|
| `categorias` | Catálogo fijo: Bolsos, Cinturones, Billeteras, Estuches, Relojes |
| `productos` | nombre, sku, precio, stock, categoria_id, imagen_url, activo |
| `productos_con_estado` | **VIEW** con estado calculado (Activo / Stock bajo / Sin stock) |
| `clientes` | nombre, email, telefono, ciudad, tag (Nuevo/Regular/VIP) |
| `ventas` | numero serial, cliente_id, estado, total, notas |
| `venta_items` | venta_id, producto_id, nombre, precio, cantidad, subtotal (generado) |
| `envios` | venta_id, paqueteria, numero_guia, estado_envio, costo_envio |

### Triggers automáticos
- `updated_at` se actualiza solo en cada cambio
- Total de venta se recalcula al insertar/editar `venta_items`
- Stock baja automáticamente cuando venta cambia a `Pagado`
- Tag del cliente sube (Nuevo → Regular → VIP) según pedidos pagados

### Storage
- Bucket: `productos` (público)
- Path de imágenes: `{timestamp}-{SKU}.{ext}`

---

## Políticas RLS aplicadas en Supabase

Las tablas y el storage usan RLS con políticas permisivas para el rol `anon` (sin autenticación). Se aplicaron las siguientes políticas vía SQL Editor:

### Tablas (todas con `for all using (true) with check (true)`)
- `productos` → "Acceso total productos"
- `clientes` → "Acceso total clientes"
- `ventas` → "Acceso total ventas"
- `venta_items` → "Acceso total venta_items"
- `envios` → "Acceso total envios"

### Storage bucket `productos`
- Bucket marcado como **público** (`public = true`)
- "Anon puede subir imágenes" → INSERT con `bucket_id = 'productos'`
- "Imágenes públicas" → SELECT con `bucket_id = 'productos'`
- "Anon puede eliminar imágenes" → DELETE con `bucket_id = 'productos'`

> Estas políticas se reemplazarán cuando se implemente Supabase Auth (las políticas pasarán a requerir `auth.role() = 'authenticated'`).

---

## Componentes nuevos (del repositorio copiado)

- **`components/Storefront.tsx`** — Tienda pública completa (ecommerce demo) con carrusel, catálogo, carrito, detalle de producto, soporte, búsqueda. Usa `lucide-react` para iconos. Se renderiza en la ruta `/` sin el chrome administrativo (Sidebar/Topbar).
- **`components/AppChrome.tsx`** — Wrapper que decide si renderizar el Sidebar+Topbar o no: en `/` muestra el Storefront a pantalla completa; en el resto del panel admin, el layout normal.
- **`components/storefront.css`** — Estilos del Storefront (CSS propio, no inline styles).

## Dependencias añadidas

- `lucide-react ^1.22.0` — Iconos para el Storefront. El panel admin usa `components/Icon.tsx` propio (SVG inline, sin dependencia).

## Errores corregidos al copiar el repositorio

1. **`lucide-react` no instalado** — estaba en `package.json` pero faltaba en `node_modules`. Fix: `npm install lucide-react`.
2. **Encoding corrupto en `tienda-en-linea/page.tsx`** — caracteres como `Ã³`, `ðŸ"`, `â€¦` por guardado en Latin-1 en vez de UTF-8. Reescrito con encoding correcto.

---

## Decisiones técnicas importantes
- **Sin styled-jsx:** Se usa inline styles en todos los componentes — incompatible con App Router de Next.js 16
- **suppressHydrationWarning en `<html>`:** La extensión Katalon del navegador inyecta atributos que causan hydration mismatch
- **Rama master → main:** El repo local usa `master`, el remoto GitHub usa `main`. Push con `git push origin master:main --force`
- **`productos_con_estado` es una VIEW:** No una tabla, se consulta con `.from('productos_con_estado')`
- **Imágenes en AVIF:** El logo está en formato `.avif`, compatible con Next.js Image sin configuración extra

---

## Funcionalidades completadas
- [x] Dashboard con métricas reales (ventas hoy, pendientes, clientes, stock bajo)
- [x] Productos: CRUD completo, upload de imagen a Supabase Storage, vista grid/lista
- [x] Ventas: tabla con filtros por estado y búsqueda, modal nueva venta con items
- [x] Clientes: tabla con panel de detalle lateral, modal agregar/editar, tag automático
- [x] Envío Nube, Tienda en línea, Punto de Venta: páginas informativas
- [x] Logo Order Express en Sidebar y Topbar
- [x] Schema SQL completo guardado en `database/schema.sql`
- [x] RLS desbloqueado para rol anon en tablas y storage (políticas permisivas temporales)
- [x] Upload de imagen WebP a Supabase Storage funcionando correctamente
- [x] Buscador global en Topbar (productos, clientes, ventas) con debounce 280ms
- [x] Editar producto funciona con UPDATE en Supabase (antes solo insertaba)
- [x] Botón Editar en vista lista de productos corregido
- [x] Cambio de estado de venta directo desde tabla (select inline con estados válidos)
- [x] Vista detalle de venta en panel lateral con items, cliente, notas y total
- [x] Categorías dinámicas desde Supabase con autocompletado y creación de nuevas
- [x] Filtro de categorías en productos como `<select>` (escalable)
- [x] Iconos SVG 2D en todo el proyecto — componente `components/Icon.tsx`
- [x] Confirmación antes de eliminar — componente `components/ConfirmDialog.tsx`
- [x] Paginación en Productos (12/pág), Ventas (15/pág) y Clientes (15/pág)
- [x] Botón Eliminar añadido a Clientes

## Pendiente
- [ ] Autenticación con Supabase Auth (reemplazar políticas anon por `auth.role() = 'authenticated'`)
- [ ] Página de configuración (nombre del negocio, moneda, datos de contacto)
- [ ] Historial de pedidos por cliente en panel lateral de Clientes
- [ ] Notificaciones de stock bajo en tiempo real (Supabase Realtime)
- [ ] Exportar ventas/clientes a CSV
- [ ] Modo oscuro
- [ ] Subir cambios a Vercel (producción desactualizada)
- [ ] Conectar Storefront (`/`) a productos reales de Supabase (actualmente usa datos hardcodeados demo)
