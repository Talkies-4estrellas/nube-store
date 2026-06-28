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

## Pendiente
- [ ] Autenticación con Supabase Auth para proteger el panel
- [ ] Modo oscuro
- [ ] Cambiar estado de pedido desde la tabla de ventas
- [ ] Vista de detalle de venta con sus items
- [ ] Historial de pedidos por cliente
- [ ] Notificaciones de stock bajo en tiempo real (Supabase Realtime)
- [ ] Página de configuración
- [ ] Descuentos y marketing
