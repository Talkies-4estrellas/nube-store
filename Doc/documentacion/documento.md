# Order Express — Documentación de referencia

> **Propósito:** fuente de verdad del proyecto. Consultar antes de hacer cualquier cambio para evitar duplicar lógica, pisar estados existentes o reescribir algo que ya existe. Actualizar cada vez que se agregue o modifique algo significativo.
>
> La documentación está dividida por áreas. Esta página es la portada; el contenido vive en los archivos de abajo.

---

## Áreas de la documentación

| Área | Archivo | Qué contiene |
|------|---------|--------------|
| 🏗️ **Arquitectura** | [`arquitectura.md`](./arquitectura.md) | Stack, estructura de carpetas, configuración base (env vars, colores), rutas públicas y sistema de autenticación por roles. |
| 🗃️ **Datos** | [`datos.md`](./datos.md) | Tablas de la base de datos, triggers, localStorage, mapa de operaciones Supabase por tabla y los scripts SQL de `Doc/database/`. |
| 🧩 **Módulos UI** | [`modulos-ui.md`](./modulos-ui.md) | Inventario de páginas, componentes y utilidades (`lib/`) con sus estados, constantes, funciones y operaciones Supabase. |
| ⚙️ **Operaciones y recursos** | [`operaciones.md`](./operaciones.md) | Flujos de negocio de punta a punta, manejo de imágenes/Storage, dependencias y assets. |
| 🔧 **Mantenimiento** | [`mantenimiento.md`](./mantenimiento.md) | Pendientes técnicos, convenciones obligatorias, estado de migraciones y registro diario de sesiones. |
| 🤖 **Inteligencia artificial** | [`ia.md`](./ia.md) | Cómo la IA (Claude) trabaja el proyecto: qué leer, reglas a respetar y el sistema de memoria/sesiones. |

---

## Cómo usar esta documentación

- **¿Vas a tocar una página o componente?** → [Módulos UI](./modulos-ui.md) para no pisar estados existentes.
- **¿Vas a tocar la base de datos?** → [Datos](./datos.md) para tablas, triggers y RLS.
- **¿Necesitas entender un flujo completo (compra, POS, alta de producto)?** → [Operaciones y recursos](./operaciones.md).
- **¿Dudas sobre stack, auth o estructura?** → [Arquitectura](./arquitectura.md).
- **¿Deuda técnica o convenciones?** → [Mantenimiento](./mantenimiento.md).
- **¿Cómo debe trabajar la IA este repo?** → [Inteligencia artificial](./ia.md).

> El mapa archivo por archivo de todo el proyecto está en [`Doc/indice.md`](../indice.md).
