# Importación de productos por CSV — formato estándar

Plantilla lista para usar: **`Doc/plantilla-importacion-productos.csv`**

Este formato se definió consolidando tres fuentes reales:
1. Export propio de Order Express
2. `control tienda en linea 2023.xlsx` (costos, márgenes, proveedor)
3. Export de Tiendanube (e-commerce, SEO, logística)

---

## Columnas

Los tres primeros campos son **obligatorios**. Si a una fila le falta alguno,
se marca en la vista previa y se omite al importar.

| Columna | Req. | Tipo | Notas |
|---|:--:|---|---|
| `sku` | ✅ | texto | **Llave única.** Si ya existe, el producto se actualiza |
| `nombre` | ✅ | texto | |
| `precio` | ✅ | número | Precio de venta con IVA |
| `precio_promocional` | | número | Si existe, se muestra como oferta |
| `costo` | | número | Precio de compra; permite calcular utilidad y margen |
| `stock` | | entero | Si va vacío se asume `0` |
| `categoria` | | texto | Se crea automáticamente si no existe |
| `marca` | | texto | |
| `codigo_barras` | | texto | EAN / UPC |
| `mpn` | | texto | Código del fabricante |
| `descripcion` | | texto | Se limpia el HTML automáticamente |
| `imagen_url` | | URL | Ver sección *Imágenes* |
| `slug` | | texto | URL en `/tienda/[slug]`. Si va vacío se usa el SKU |
| `tags` | | texto | Separados por coma |
| `seo_titulo` | | texto | |
| `seo_descripcion` | | texto | |
| `peso_kg` | | número | |
| `alto_cm` `ancho_cm` `profundidad_cm` | | número | |
| `ubicacion` | | texto | Ubicación en bodega |
| `proveedor` | | texto | |
| `activo` | | SI/NO | Por defecto `SI` |
| `envio_gratis` | | SI/NO | Por defecto `NO` |
| `detalles` | | JSON | Variantes: colores, tallas, etc. |

---

## Imágenes: por qué solo funcionan por link

**No se puede pegar una imagen en el Excel e importarla.** Una imagen pegada en
una hoja de cálculo "flota" sobre las celdas: no es el valor de una celda. Al
guardar como CSV —que es texto plano— la imagen simplemente desaparece.

Por eso la única vía es la columna `imagen_url` con un enlace público.

**Qué hace el importador con ese link:** lo descarga, lo convierte a WebP y lo
sube a tu Supabase Storage. La URL que queda guardada es la tuya, no la externa.
Así, si mañana el sitio de origen borra la imagen, tu producto la conserva.

Si el link falla o no responde, el producto **igual se importa** (sin imagen) y
se reporta en el resumen para que la subas después desde el admin.

---

## Formatos que el importador tolera

Para poder cargar archivos de otras plataformas sin editarlos a mano:

| Situación | Cómo se resuelve |
|---|---|
| Separador `;` (Tiendanube, Excel en español) | Se detecta solo |
| Encoding Latin-1 / Windows-1252 | Se detecta y convierte |
| Precios `$ 139`, `3,500.00`, `1.234,56` | Se limpian símbolos y separadores |
| Descripciones con HTML y `&oacute;` | Se convierten a texto plano |
| Categorías jerárquicas `Papel Picado > Pelota` | Se toma el último nivel |
| Encabezados en mayúsculas o con espacios | Se normalizan |
| Nombres alternos de columna | Ver tabla de sinónimos abajo |

### Sinónimos de columnas reconocidos

Para importar exports de otras plataformas sin renombrar encabezados:

| Campo | También se acepta |
|---|---|
| `sku` | `SKU`, `ID Articulo`, `Codigo Fabricante` |
| `nombre` | `Nombre del Articulo`, `Nombre` |
| `precio` | `Precio`, `Precio de Venta con IVA` |
| `precio_promocional` | `Precio promocional` |
| `costo` | `Costo`, `Precio Compra Sin IVA` |
| `categoria` | `Categoría`, `Categorías` |
| `descripcion` | `Descripción` |
| `codigo_barras` | `Código de barras` |
| `peso_kg` | `Peso (kg)` |
| `alto_cm` | `Alto (cm)` |
| `ancho_cm` | `Ancho (cm)` |
| `profundidad_cm` | `Profundidad (cm)` |
| `slug` | `Identificador de URL` |
| `seo_titulo` | `Título para SEO` |
| `seo_descripcion` | `Descripción para SEO` |
| `mpn` | `MPN (Número de pieza del fabricante)` |
| `ubicacion` | `Ubicación` |
| `envio_gratis` | `Envío sin cargo` |
| `activo` | `Mostrar en mi tienda en línea` |

---

## Antes de importar

Ejecutar en Supabase → SQL Editor:
**`Doc/database/migration_productos_ampliado.sql`**

Agrega las columnas nuevas y **recrea la vista** `productos_con_estado`
(indispensable: la vista usa `p.*`, que Postgres expande al crearla, así que sin
recrearla las columnas nuevas no aparecen).

La vista además calcula: `precio_vigente`, `utilidad` y `margen_pct`.
