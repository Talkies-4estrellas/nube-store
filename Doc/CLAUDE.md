# CLAUDE.md — Carpeta `Doc/`

> Contexto para cualquier agente que trabaje **dentro de `Doc/`**.
> Las instrucciones generales del proyecto están en el [`CLAUDE.md` de la raíz](../CLAUDE.md);
> este archivo cubre solo cómo está organizada y cómo se mantiene la documentación.

---

## Qué es `Doc/`

Es la fuente de verdad documental de **Order Express**. Se divide en cuatro piezas:

| Pieza | Ubicación | Función |
|-------|-----------|---------|
| **Índice** | `indice.md` | Mapa archivo por archivo del proyecto + matriz de navegación documentación ↔ sesiones. Punto de entrada. |
| **Documentación por áreas** | `documentacion/` | `documento.md` (portada) + 6 áreas: `arquitectura`, `datos`, `modulos-ui`, `operaciones`, `mantenimiento`, `ia`. Referencia técnica estable. |
| **Sesiones** | `sesiones/seccion-DD-MM-YYYY.md` | Registro diario de cambios, una entrada por commit. Historial cronológico. |
| **Base de datos** | `database/` | `schema.sql`, `auth.sql`, `seed.sql` y migraciones. |
| **Memoria** | `memoria.md` | Instrucciones del flujo de registro de sesión. |

---

## Sistema de enlazado (mantener sincronizado)

La documentación y las sesiones están **enlazadas de forma bidireccional**. Al tocar
cualquiera de las dos, hay que conservar la coherencia de los enlaces:

1. **Sesión → documentación.** Cada `sesiones/seccion-*.md` tiene, bajo su
   `## Resumen del día`, un bloque:
   ```markdown
   > **📚 Documentación relacionada:** [Área](../documentacion/area.md) (nota) · …
   ```
   Debe apuntar a las áreas que el trabajo de ese día tocó.

2. **Documentación → sesión.** Cada archivo de `documentacion/` cierra con:
   ```markdown
   ## 🕗 Sesiones relacionadas
   - [DD/MM/2026](../sesiones/seccion-DD-MM-2026.md) — hook breve
   ```

3. **Matriz central.** `indice.md` contiene la tabla "Mapa de navegación:
   documentación ↔ sesiones" que cruza las 6 áreas (columnas) con las sesiones
   (filas). Debe reflejar exactamente los dos puntos anteriores.

**Regla:** al agregar una sesión o modificar qué área toca, actualizar los tres
lugares (bloque en la sesión, sección en el/las área/s, celda en la matriz).

---

## Flujo de registro de sesión

Cuando el usuario diga **"registra el commit"** o **"actualiza la memoria"**, seguir
`memoria.md`: leer el último commit (`git log -1 --stat`), identificar o crear
`sesiones/seccion-DD-MM-YYYY.md` con la fecha del sistema, y añadir la entrada del
commit (hash, tabla de archivos, descripción). Luego enlazar la sesión nueva según
la sección "Sistema de enlazado" de arriba.

---

## Convenciones de la documentación

- **Rutas relativas** en los enlaces: desde `sesiones/` usar `../documentacion/…`;
  desde `documentacion/` usar `../sesiones/…`; desde `indice.md` usar `documentacion/…`
  y `sesiones/…`.
- **Un archivo de sesión por día**; la fecha del nombre nunca cambia.
- Las áreas de `documentacion/` comparten una barra de navegación superior entre
  ellas — mantenerla si se crea un área nueva.
- Verificar que los enlaces resuelven contra archivos reales antes de dar por
  cerrado un cambio (`grep` de las rutas nuevas contra `documentacion/*.md` y
  `sesiones/*.md`).
