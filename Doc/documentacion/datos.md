# Datos — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · **Datos** · [Módulos UI](./modulos-ui.md) · [Operaciones y recursos](./operaciones.md) · [Mantenimiento](./mantenimiento.md) · [Inteligencia artificial](./ia.md)
>
> La capa de datos: tablas de Supabase, triggers, almacenamiento en localStorage, el mapa de operaciones por tabla y los scripts SQL de referencia.

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

> El uso de `user_roles` en el flujo de login y el acceso por rol está en [Arquitectura](./arquitectura.md).

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

## Scripts SQL de referencia (`Doc/database/`)

| Archivo | Función |
|---------|---------|
| `schema.sql` | Esquema completo: tablas, triggers, RLS, categorías iniciales |
| `auth.sql` | Sistema de auth: tabla `user_roles`, función `get_my_role()`, políticas RLS por rol |
| `seed.sql` | Datos de prueba: 20 productos, 10 clientes, 10 ventas con items |
| `migration_criticos.sql` | Triggers INSERT+UPDATE, RLS de `config_storefront`, tablas `config_metodos_pago` / `config_notificaciones` / `cart_items` |
| `migration_columnas.sql` | Columnas de dirección en `clientes`; `telefono`/`facebook` en `config_storefront`; `updated_at` en `registros` y `solicitudes_productos` |
| `migration_tablas_faltantes.sql` | Migración segura (`IF NOT EXISTS`): crea `registros`, `solicitudes_productos`, agrega `deleted_at` en clientes, inserta fila inicial en `config_storefront` |

> El estado de qué migraciones ya se ejecutaron en Supabase está en [Mantenimiento](./mantenimiento.md).
