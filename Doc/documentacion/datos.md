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
| role | text | `admin`, `vendedor`, `bodega`, `proveedor`, `basico` — sanitizado en servidor por `handle_new_user` |
| nombre | text | nombre para mostrar |
| avatar_url | text | foto de perfil (WebP), agregado 24/07/2026 |
| created_at | timestamptz | |

> El uso de `user_roles` en el flujo de login y el acceso por rol está en [Arquitectura](./arquitectura.md).

---

### `conversaciones` / `mensajes` — agregado 27/07/2026

Sistema interno de mensajería. Un solo hilo continuo por cliente (no uno por incidencia).

**`conversaciones`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| tipo | text | `cliente_proveedor` o `cliente_admin` |
| cliente_email | text | |
| proveedor_email | text | null si es `cliente_admin` |
| venta_item_id | uuid FK → venta_items | null si nace desde la ficha de producto |
| producto_id | uuid FK → productos | agregado en un commit posterior del mismo día |
| created_at | timestamptz | |

Índices únicos parciales (evitan duplicar hilos): uno para conversaciones ligadas a un pedido
(`venta_item_id` no nulo), otro para las que nacen desde la ficha de producto (`producto_id` no
nulo) — separados porque un mismo cliente puede tener ambos tipos de hilo con el mismo proveedor.

**`mensajes`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| conversacion_id | uuid FK → conversaciones | |
| remitente_tipo | text | `cliente`, `proveedor` o `admin` |
| remitente_email | text | |
| remitente_nombre | text | |
| contenido | text | |
| leido | bool | usado por `marcarLeidos()` |
| created_at | timestamptz | |

Ambas tablas dadas de alta en `supabase_realtime` (`alter publication ... add table`) para que
`ChatPanel.tsx` reciba mensajes nuevos sin recargar. La resolución proveedor↔producto usa el
mismo patrón que el resto del proyecto: **por SKU** contra `solicitudes_productos` con
`estado='aprobado'` (no hay FK directa proveedor↔producto). Script completo:
`Doc/database/migration_mensajeria.sql`.

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
| `conversaciones` / `mensajes` | mi-cuenta, proveedores, configuracion, tienda/[slug] (ChatPanel, Realtime) | mi-cuenta, proveedores, configuracion, tienda/[slug] (`lib/mensajeria.ts`) | mensajes (`leido`) | — |
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
| `migration_mensajeria.sql` | Tablas `conversaciones`/`mensajes`, RLS, alta a `supabase_realtime`, columna `producto_id` e índices únicos separados (por pedido / por producto) — agregado 27/07/2026 |

> El estado de qué migraciones ya se ejecutaron en Supabase está en [Mantenimiento](./mantenimiento.md).

---

## 🕗 Sesiones relacionadas

Días de trabajo que tocaron esta área:

- [28/06/2026](../sesiones/seccion-28-06-2026.md) — schema inicial y conexión a Supabase.
- [29/06/2026](../sesiones/seccion-29-06-2026.md) — `auth.sql`, `user_roles` y categorías dinámicas.
- [30/06/2026](../sesiones/seccion-30-06-2026.md) — soporte de `solicitudes_productos`.
- [01/07/2026](../sesiones/seccion-01-07-2026.md) — tablas `config_storefront` y `solicitudes_productos`.
- [02/07/2026](../sesiones/seccion-02-07-2026.md) — ajustes de schema para robustez.
- [03/07/2026](../sesiones/seccion-03-07-2026.md) — fix de triggers INSERT+UPDATE, migraciones y tablas nuevas.
- [27/07/2026](../sesiones/seccion-27-07-2026.md) — tablas `conversaciones`/`mensajes` para el sistema de mensajería interna.
