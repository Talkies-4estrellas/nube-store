# Mantenimiento — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · [Datos](./datos.md) · [Módulos UI](./modulos-ui.md) · [Operaciones y recursos](./operaciones.md) · **Mantenimiento** · [Inteligencia artificial](./ia.md)
>
> Salud del proyecto: deuda técnica pendiente, convenciones que hay que respetar, estado de las migraciones y el registro diario de trabajo.

---

## Pendientes técnicos conocidos

| # | Pendiente | Impacto |
|---|-----------|---------|
| 1 | Ejecutar `Doc/database/migration_tablas_faltantes.sql` en Supabase | Sin esto, login de tienda y proveedores fallan en producción |
| 2 | Password en `registros` en texto plano | Seguridad — migrar a hash |
| 3 | Enriquecimiento de clientes hace N+1 queries | Performance — migrar a una sola query con agregaciones |
| 4 | Cart en localStorage no sincroniza entre dispositivos | UX — requiere cuenta + tabla `cart_items` en DB |
| 5 | POS crea clientes duplicados "Público en general" | Datos sucios — agregar lookup antes de insert |

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

Pendiente de ejecutar: `Doc/database/migration_tablas_faltantes.sql` (ver tabla de pendientes arriba).

---

## Registro diario de trabajo

Cada día de trabajo tiene su archivo en `Doc/sesiones/seccion-DD-MM-YYYY.md` con las entradas por commit (hash, archivos, descripción).

El flujo para generar estas entradas lo ejecuta el asistente siguiendo `Doc/memoria.md` — documentado en [Inteligencia artificial](./ia.md).
