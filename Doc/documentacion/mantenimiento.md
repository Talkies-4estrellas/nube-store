# Mantenimiento — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · [Datos](./datos.md) · [Módulos UI](./modulos-ui.md) · [Operaciones y recursos](./operaciones.md) · **Mantenimiento** · [Inteligencia artificial](./ia.md)
>
> Salud del proyecto: deuda técnica pendiente, convenciones que hay que respetar, estado de las migraciones y el registro diario de trabajo.

---

## Pendientes técnicos conocidos

> Lista completa y siempre actualizada en la sección "Pendiente" de `CLAUDE.md` (raíz del
> proyecto) — aquí solo los de mayor impacto técnico.

| # | Pendiente | Impacto |
|---|-----------|---------|
| 1 | Confirmar que `Doc/database/migration_mensajeria.sql` corrió completo en Supabase (27/07) | Sin esto, el sistema de mensajería falla en producción |
| 2 | Confirmar Redirect URLs de OAuth en Supabase para el dominio de Vercel (27/07) | Sin esto, login con Google/Facebook falla en producción |
| 3 | Password en `registros` en texto plano | Seguridad — migrar a hash (o completar la migración a Supabase Auth ya iniciada con `/registro`) |
| 4 | Cart en localStorage no sincroniza entre dispositivos | UX — requiere tabla `cart_items` en DB (ya existe, falta conectarla) |
| 5 | Re-habilitar RLS en `productos` y `categorias` antes de producción | Sigue desactivado desde la importación CSV, por pedido explícito del usuario |

---

## Convenciones obligatorias

- **Estilos:** inline styles únicamente — `style={{ ... }}`. Sin Tailwind, sin styled-jsx, sin CSS modules.
- **Iconos panel admin:** usar `<Icon name="..." />` de `components/Icon.tsx`. `lucide-react` solo en Storefront.
- **Colores:** `NAVY = '#252855'` y `PINK = '#e7226d'` definidos localmente en cada archivo que los necesita.
- **Imágenes de productos:** convertir a WebP antes de subir. Path sanitizado: `{timestamp}-{sku-limpio}.webp`.
- **Supabase Storage:** bucket `productos`. Imágenes de proveedores en subcarpeta `solicitudes/`.
- **Commits:** los gestiona GitKraken — ver las reglas del asistente en [Inteligencia artificial](./ia.md).

---

## Estado de migraciones en Supabase

Ejecutadas el **03/07/2026**:

- ✅ `Doc/database/migration_criticos.sql` — triggers INSERT+UPDATE, RLS de `config_storefront`, tablas `config_metodos_pago` / `config_notificaciones` / `cart_items`
- ✅ `Doc/database/migration_columnas.sql` — `direccion`/`codigo_postal`/`estado_region`/`pais` en `clientes`; `telefono`/`facebook` en `config_storefront`; `updated_at` en `registros` y `solicitudes_productos`

Sin confirmación final de que corrieron completas (se fueron pasando por bloques):
`migration_mensajeria.sql` (27/07 — tablas `conversaciones`/`mensajes`), y el resto del historial
detallado en la sección "Pendiente" de `CLAUDE.md`.

---

## Registro diario de trabajo

Cada día de trabajo tiene su archivo en `Doc/sesiones/seccion-DD-MM-YYYY.md` con las entradas por commit (hash, archivos, descripción).

El flujo para generar estas entradas lo ejecuta el asistente siguiendo `Doc/memoria.md` — documentado en [Inteligencia artificial](./ia.md).

---

## 🕗 Sesiones relacionadas

Días de trabajo que tocaron esta área:

- [03/07/2026](../sesiones/seccion-03-07-2026.md) — migraciones ejecutadas en Supabase y pendientes técnicos.
- [05/07/2026](../sesiones/seccion-05-07-2026.md) — reconstrucción del registro diario de sesiones.
- [27/07/2026](../sesiones/seccion-27-07-2026.md) — migración de mensajería y Redirect URLs de OAuth pendientes de confirmar.
