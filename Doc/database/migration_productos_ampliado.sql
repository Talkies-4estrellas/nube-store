-- ============================================================
--  Migración: ampliación de la tabla productos
--  Fecha: 21/07/2026
--
--  Agrega los parámetros detectados al consolidar tres fuentes:
--    1. Export propio (Order Express)
--    2. Control tienda en línea 2023 (costos, márgenes, proveedor)
--    3. Export de Tiendanube (e-commerce, SEO, logística)
--
--  Ejecutar completo en Supabase → SQL Editor.
--  Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ---------- 1. Comercial / costos ----------
alter table productos add column if not exists costo               numeric(10, 2);
alter table productos add column if not exists precio_promocional  numeric(10, 2);

comment on column productos.costo              is 'Precio de compra sin IVA (para calcular utilidad)';
comment on column productos.precio_promocional is 'Precio de oferta; si existe, se muestra en lugar del precio';

-- ---------- 2. Identificación ----------
alter table productos add column if not exists codigo_barras text;
alter table productos add column if not exists marca         text;
alter table productos add column if not exists mpn           text;

comment on column productos.codigo_barras is 'EAN / UPC para escaneo';
comment on column productos.mpn           is 'Número de pieza del fabricante (código fabricante)';

-- ---------- 3. Logística ----------
alter table productos add column if not exists peso_kg        numeric(10, 3);
alter table productos add column if not exists alto_cm        numeric(10, 2);
alter table productos add column if not exists ancho_cm       numeric(10, 2);
alter table productos add column if not exists profundidad_cm numeric(10, 2);
alter table productos add column if not exists ubicacion      text;

comment on column productos.ubicacion is 'Ubicación física en bodega (pasillo, anaquel, sucursal)';

-- ---------- 4. SEO y tienda ----------
alter table productos add column if not exists slug            text;
alter table productos add column if not exists tags            text;
alter table productos add column if not exists seo_titulo      text;
alter table productos add column if not exists seo_descripcion text;
alter table productos add column if not exists envio_gratis    boolean not null default false;

comment on column productos.slug is 'Identificador de URL para /tienda/[slug]; si es null se usa el SKU';
comment on column productos.tags is 'Etiquetas separadas por coma para búsqueda y filtros';

-- Slug único solo cuando tiene valor (permite muchos productos sin slug)
create unique index if not exists productos_slug_key
  on productos (lower(slug))
  where slug is not null;

-- Índices para búsquedas frecuentes
create index if not exists productos_marca_idx         on productos (marca);
create index if not exists productos_codigo_barras_idx on productos (codigo_barras);


-- ============================================================
--  Recrear la VIEW productos_con_estado
--
--  IMPORTANTE: la vista usa `p.*`, que Postgres EXPANDE al momento
--  de crearla. Sin este DROP + CREATE las columnas nuevas no
--  aparecerían al consultar la vista.
-- ============================================================
drop view if exists productos_con_estado;

create view productos_con_estado as
  select
    p.*,
    c.nombre as categoria,
    case
      when p.stock = 0    then 'Sin stock'
      when p.stock <= 3   then 'Stock bajo'
      else                     'Activo'
    end as estado,
    -- Precio realmente vigente (oferta si existe)
    coalesce(p.precio_promocional, p.precio) as precio_vigente,
    -- Utilidad en pesos y en porcentaje (null si no hay costo capturado)
    case when p.costo is not null and p.costo > 0
         then round(coalesce(p.precio_promocional, p.precio) - p.costo, 2)
    end as utilidad,
    case when p.costo is not null and p.costo > 0
         then round(((coalesce(p.precio_promocional, p.precio) - p.costo) / p.costo) * 100, 2)
    end as margen_pct
  from productos p
  left join categorias c on c.id = p.categoria_id;
