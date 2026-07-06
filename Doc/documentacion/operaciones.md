# Operaciones y recursos — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · [Datos](./datos.md) · [Módulos UI](./modulos-ui.md) · **Operaciones y recursos** · [Mantenimiento](./mantenimiento.md) · [Inteligencia artificial](./ia.md)
>
> Los flujos de negocio de punta a punta, el manejo de imágenes/Storage y los recursos externos (dependencias y assets).

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

> Los estados de UI y las operaciones Supabase de cada página involucrada están en [Módulos UI](./modulos-ui.md); las tablas y triggers en [Datos](./datos.md).

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

**Storage:**
- Bucket: `productos` (público, SELECT sin restricción)
- INSERT/DELETE requieren `auth.role() = 'authenticated'`
- Subcarpeta `solicitudes/` permite INSERT anónimo (política separada para proveedores)

> Las funciones `convertToWebp`, `captureFrameAsWebp` y `uploadToSupabase` viven en `lib/uploadWebp.ts` — ver [Módulos UI](./modulos-ui.md).

---

## Recursos externos

### Dependencias clave

| Paquete | Versión | Por qué |
|---------|---------|---------|
| `next` | 16.2.9 | Framework principal — App Router + Turbopack |
| `@supabase/ssr` | latest | Cliente Supabase con soporte de cookies para middleware |
| `lucide-react` | ^1.22.0 | Iconos — **solo en `Storefront.tsx`**. El panel admin usa `Icon.tsx` propio. |

### Assets estáticos (`public/`)

| Archivo | Función |
|---------|---------|
| `public/storefront/logo.svg` | Logo completo "OrderExpress" usado en la tienda pública |
| `public/storefront/monograma.svg` | Monograma compacto usado en versión colapsada de la tienda |
| `public/imagenes/logo-oe_1-png-300x49.avif` | Logo oficial Order Express (panel admin) |

---

## 🕗 Sesiones relacionadas

Días de trabajo que tocaron esta área:

- [28/06/2026](../sesiones/seccion-28-06-2026.md) — subida de imágenes WebP y assets del logo.
- [29/06/2026](../sesiones/seccion-29-06-2026.md) — flujos de compra en tienda y portal de proveedores.
- [30/06/2026](../sesiones/seccion-30-06-2026.md) — flujo de subida y revisión de productos de proveedores.
- [01/07/2026](../sesiones/seccion-01-07-2026.md) — flujo de venta POS y configuración de la tienda.
- [03/07/2026](../sesiones/seccion-03-07-2026.md) — revisión de flujos de punta a punta.
