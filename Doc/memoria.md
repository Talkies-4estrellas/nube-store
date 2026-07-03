# memoria.md — Instrucciones de registro de sesión

Cuando el usuario indique **"actualiza la memoria"** o **"registra el commit"** (o similar), seguir estos pasos:

## Paso 1 — Leer el último commit

```bash
git log -1 --stat
git diff HEAD~1 HEAD
```

Extraer:
- Hash y mensaje del commit
- Lista de archivos modificados
- Naturaleza de cada cambio (nuevo, editado, eliminado)

## Paso 2 — Identificar el archivo de sesión del día

El archivo de sesión tiene el formato:

```
Doc/sesiones/seccion-DD-MM-YYYY.md
```

Usar la fecha actual del sistema. Si el archivo **ya existe**, actualizarlo agregando los cambios al final. Si **no existe**, crearlo con la estructura base que se indica abajo.

## Paso 3 — Escribir o actualizar la entrada

Agregar una sección nueva con este formato:

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

Si ya existe una entrada para ese commit (mismo hash), no duplicar — solo actualizar si hay información adicional.

---

## Estructura base de un archivo de sesión nuevo

```markdown
# Sesión de trabajo — DD/MM/YYYY

## Resumen del día

{Completar al final de la sesión}

---

## Cambios realizados

{Las entradas de commits se agregan aquí}

---

## Archivos modificados hoy

| Archivo | Tipo de cambio |
|---------|---------------|
{Se completa automáticamente desde los commits}
```

---

## Notas

- Un archivo por día — la fecha del nombre nunca cambia una vez creado
- Si se hacen varios commits en el mismo día, cada uno genera su propia sección en el mismo archivo
- El resumen del día se actualiza al final de la sesión con una vista general de todo lo trabajado
