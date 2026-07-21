# Migrar de una cuenta de Supabase a otra — paso a paso

**Proyecto viejo:** `arqoyuxcugpprzjpcytg` (Talkies-4estrellas's Org) — tiene los datos
**Proyecto nuevo:** `vzpewbaipftsocbauehe` (oepmshop@gmail.com's Org) — vacío

Tiempo estimado: 30-40 minutos.

---

## PARTE 1 — Sacar los datos del proyecto viejo

### Paso 1. Conseguir la contraseña de la base

1. Entra al proyecto **viejo** en el dashboard
2. **Settings** (engrane, abajo a la izquierda) → **Database**
3. Busca **Database password**
4. Si no la recuerdas: **Reset database password** → guárdala, la vas a usar enseguida

> Resetear la contraseña de la base **no afecta** a tu app: ella usa la anon key, no esta contraseña.

### Paso 2. Copiar la cadena de conexión

1. En el proyecto viejo, botón verde **Connect** (barra superior)
2. Pestaña **Connection string** → **URI**
3. Cópiala. Se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.arqoyuxcugpprzjpcytg.supabase.co:5432/postgres
   ```
4. Reemplaza `[YOUR-PASSWORD]` por la contraseña del Paso 1

### Paso 3. Ejecutar el script de exportación

Abre PowerShell en la carpeta del proyecto:

```powershell
cd C:\nube
.\scripts\exportar-datos.ps1
```

Te va a pedir la cadena de conexión. **Pégala y presiona Enter.**
No se ve mientras la escribes (es a propósito, para que no quede en el historial).

**Qué esperar:** tarda 1-3 minutos. Al terminar verás:

```
LISTO
  Esquema: ...\respaldo\esquema-2026-07-21.sql
  Datos:   ...\respaldo\datos-2026-07-21.sql
```

### Paso 4. Verificar que salió bien

```powershell
Get-ChildItem respaldo\
```

Ambos archivos deben pesar más de 0 KB. Si `datos-*.sql` pesa muy poco,
algo falló: revisa que la contraseña de la cadena sea correcta.

---

## PARTE 2 — Crear la estructura en el proyecto nuevo

### Paso 5. Ejecutar el esquema

1. Entra al proyecto **nuevo** (`vzpewbaipftsocbauehe`)
2. **SQL Editor** (icono de terminal, barra izquierda) → **New query**
3. Abre `Doc/database/schema_completo.sql`, copia **todo** el contenido
4. Pégalo en el editor y presiona **Run** (o `Ctrl+Enter`)

**Qué esperar:** `Success. No rows returned`. Tarda unos segundos.

### Paso 6. Verificar las tablas

Ve a **Table Editor**. Deben aparecer 13 tablas: `categorias`, `productos`,
`clientes`, `ventas`, `venta_items`, `envios`, `user_roles`,
`solicitudes_productos`, `registros`, `config_storefront`,
`config_metodos_pago`, `config_notificaciones`, `cart_items`.

Están vacías — es correcto, los datos van en el siguiente paso.

---

## PARTE 3 — Cargar los datos

### Paso 7. Ejecutar el archivo de datos

1. Abre `respaldo/datos-2026-07-21.sql`
2. Copia todo y pégalo en una **nueva query** del SQL Editor del proyecto nuevo
3. **Run**

> El archivo ya empieza con `SET session_replication_role = replica;`.
> Esa línea **desactiva los triggers** durante la carga. Sin ella,
> `trg_descontar_stock` volvería a descontar inventario al insertar las
> ventas históricas y tu stock quedaría mal.

**Si el archivo es muy grande y el editor se traba:** ábrelo en un editor de
texto y pégalo por partes, respetando el orden de las tablas
(`categorias` → `productos` → `clientes` → `ventas` → `venta_items` → resto).

### Paso 8. Verificar los datos

En **SQL Editor**, corre:

```sql
select 'productos' t, count(*) from productos
union all select 'clientes', count(*) from clientes
union all select 'ventas',   count(*) from ventas
union all select 'venta_items', count(*) from venta_items;
```

Los números deben coincidir con los del proyecto viejo (misma consulta allá).

---

## PARTE 4 — Usuario administrador

Los usuarios de `auth.users` no se migran con el dump de `public`.

### Paso 9. Crear el usuario

1. Proyecto nuevo → **Authentication** → **Users** → **Add user**
2. Email y contraseña → **Create user**
3. Copia el **UUID** que aparece en la lista

### Paso 10. Asignarle el rol

En **SQL Editor**:

```sql
insert into user_roles (user_id, role, nombre)
values ('PEGA-AQUI-EL-UUID', 'admin', 'Tu Nombre');
```

---

## PARTE 5 — Imágenes del bucket

⚠️ **Las imágenes NO van en ningún dump SQL.** El dump trae las filas de
`storage.objects` pero no los archivos. Si te saltas este paso, todos los
productos aparecerán sin foto.

### Paso 11. Crear el bucket

`schema_completo.sql` ya lo crea. Verifica en **Storage** que existe
`productos` y que está marcado como **público**.

### Paso 12. Copiar los archivos

Pendiente de automatizar. Por ahora, dos opciones:

- **Manual:** Storage → bucket `productos` del proyecto viejo → descargar →
  subir al nuevo (respetando las subcarpetas `solicitudes/` e `importados/`)
- **Reimportar:** usar la importación CSV con la columna `imagen_url`
  apuntando a las URLs del proyecto viejo; el importador las descarga y
  las aloja en el bucket nuevo

---

## PARTE 6 — Apuntar la aplicación a la base nueva

### Paso 13. Sacar las llaves nuevas

Proyecto nuevo → **Settings** → **API**:

- **Project URL** → `https://vzpewbaipftsocbauehe.supabase.co`
  (sin `/rest/v1/` al final)
- **anon public** → la llave pública
- **service_role** → la llave secreta

### Paso 14. Actualizar `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vzpewbaipftsocbauehe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Probar en local antes de tocar producción:

```powershell
npm run dev
```

### Paso 15. Actualizar Vercel

1. Vercel → tu proyecto → **Settings** → **Environment Variables**
2. Editar las tres variables (marcando *Production* y *Preview*)
3. En el campo *Value* va **solo el valor**: sin comillas, sin el `NOMBRE=`
4. **Deployments** → el último → **⋯** → **Redeploy**

> Las variables `NEXT_PUBLIC_*` se incrustan al hacer el **build**.
> Guardarlas sin redesplegar no cambia nada.

---

## Checklist final

- [ ] Las 13 tablas existen en el proyecto nuevo
- [ ] Los conteos coinciden con la base vieja
- [ ] Usuario admin creado y con fila en `user_roles`
- [ ] Bucket `productos` existe y es público
- [ ] Imágenes copiadas
- [ ] `.env.local` actualizado y probado en local
- [ ] Variables de Vercel actualizadas **y redesplegado**
- [ ] La tienda muestra los productos
- [ ] Login del panel admin funciona

---

## Si algo sale mal

| Síntoma | Causa probable |
|---|---|
| "Sin productos" en la tienda | Falta redesplegar en Vercel, o los datos no se cargaron |
| `Invalid supabaseUrl` en el build | El valor incluye el `NOMBRE=` o comillas |
| Error de llave foránea al cargar datos | Se cargaron fuera de orden; respeta la secuencia de tablas |
| El stock quedó mal | Se omitió `SET session_replication_role = replica` |
| Productos sin imagen | Falta la Parte 5 |

**El proyecto viejo no se toca en ningún paso.** Si algo falla, puedes volver a
apuntar las variables al viejo y todo sigue funcionando como antes.
