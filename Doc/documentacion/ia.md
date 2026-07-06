# Inteligencia artificial — Order Express

> [Portada](./documento.md) · [Arquitectura](./arquitectura.md) · [Datos](./datos.md) · [Módulos UI](./modulos-ui.md) · [Operaciones y recursos](./operaciones.md) · [Mantenimiento](./mantenimiento.md) · **Inteligencia artificial**
>
> Cómo la IA (Claude) trabaja este proyecto: qué debe leer, las reglas que debe respetar y el sistema de memoria/sesiones.

---

## Cómo la IA asiste el proyecto

El asistente actúa como par de programación sobre el código y la documentación. Antes de cualquier cambio debe entender el estado actual leyendo la documentación en este orden:

1. `CLAUDE.md` (raíz) — instrucciones permanentes: stack, convenciones, decisiones técnicas, pendientes.
2. `Doc/indice.md` — mapa de todos los archivos del proyecto.
3. Esta documentación de referencia (`Doc/documentacion/`) según el área que toque:
   [Arquitectura](./arquitectura.md), [Datos](./datos.md), [Módulos UI](./modulos-ui.md),
   [Operaciones y recursos](./operaciones.md), [Mantenimiento](./mantenimiento.md).
4. `Doc/sesiones/seccion-DD-MM-YYYY.md` — qué se hizo en días recientes.

**Principio rector:** entender antes de construir, diagnosticar la causa raíz, iterar en pasos pequeños verificables y documentar lo aprendido.

---

## Reglas que la IA debe respetar

- **Commits:** los gestiona **GitKraken**. La IA no hace `git commit` por su cuenta salvo que el usuario lo pida explícitamente.
- **Despliegue:** la rama `master` del repo `Talkies-4estrellas/nube-store` es la que Vercel despliega.
- **Estilos:** solo inline styles. Sin Tailwind, sin styled-jsx, sin CSS modules.
- **Iconos:** `components/Icon.tsx` (SVG propio) en el panel admin; `lucide-react` únicamente en `Storefront.tsx`.
- **No pisar estados existentes:** consultar [Módulos UI](./modulos-ui.md) antes de tocar una página, para no duplicar lógica ni romper estados.
- **Acciones irreversibles:** confirmar con el usuario antes de borrar, sobrescribir o publicar.

> El conjunto completo de convenciones técnicas está en [Mantenimiento](./mantenimiento.md).

---

## Sistema de memoria y registro de sesión

El flujo de registro está definido en `Doc/memoria.md`. Se dispara cuando el usuario dice **"actualiza la memoria"** o **"registra el commit"** (o similar):

1. **Leer el último commit** — `git log -1 --stat` y `git diff HEAD~1 HEAD`. Extraer hash, mensaje, archivos y naturaleza de cada cambio.
2. **Identificar el archivo del día** — `Doc/sesiones/seccion-DD-MM-YYYY.md` con la fecha del sistema. Si existe, se agrega al final; si no, se crea con la estructura base de `memoria.md`.
3. **Escribir la entrada** con el formato:

   ```markdown
   ### [HH:MM] Commit: {mensaje del commit}

   **Hash:** `{hash corto}`

   **Archivos modificados:**
   | Archivo | Cambio |
   |---------|--------|
   | path/archivo.tsx | Descripción del cambio |

   **Descripción:**
   {Qué se hizo, por qué, qué problema resuelve}
   ```

**Reglas del registro:**
- Un archivo por día — la fecha del nombre nunca cambia una vez creado.
- Varios commits en el mismo día → cada uno es su propia sección en el mismo archivo.
- Si ya existe una entrada para ese commit (mismo hash), no duplicar.
- El resumen del día se actualiza al final de la sesión.

---

## Documentos que la IA mantiene sincronizados

Al hacer cambios significativos, la IA debe actualizar (además del código):

- `CLAUDE.md` — si cambian stack, convenciones o pendientes.
- `Doc/indice.md` — si se agregan/eliminan/renombran archivos.
- El área correspondiente de `Doc/documentacion/` — si cambian tablas, estados de página, flujos o recursos.
- `Doc/sesiones/…` — la entrada del commit según el flujo de arriba.

---

## 🕗 Sesiones relacionadas

Días de trabajo que tocaron esta área:

- [03/07/2026](../sesiones/seccion-03-07-2026.md) — creación de `Doc/` (documentación, índice y `memoria.md`).
- [05/07/2026](../sesiones/seccion-05-07-2026.md) — reconstrucción histórica de las sesiones desde los commits.
