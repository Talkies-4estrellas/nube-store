-- ============================================================
--  ORDER EXPRESS — ESQUEMA COMPLETO CONSOLIDADO
--  Generado: 21/07/2026
--
--  Este archivo reúne en un solo lugar:
--    • schema.sql (base)
--    • migration_criticos.sql / migration_tablas_faltantes.sql
--    • migration_columnas.sql
--    • migration_storefront_config.sql
--    • migration_productos_detalles.sql
--    • migration_seo_legal.sql
--    • migration_productos_ampliado.sql
--    • Columnas agregadas a mano en Supabase que nunca tuvieron
--      archivo de migración (productos.origen, proveedor_nombre)
--
--  USO: ejecutarlo completo en un proyecto Supabase NUEVO para
--  replicar la estructura. Después se cargan los datos aparte.
--  Es idempotente: se puede correr varias veces.
--
--  ⚠️ ADVERTENCIA IMPORTANTE
--  Este archivo se reconstruyó a partir de los .sql del repositorio.
--  Si en el proyecto original se hicieron cambios manuales desde el
--  dashboard de Supabase, podrían no estar reflejados aquí.
--  La fuente de verdad absoluta es:
--      supabase db dump --db-url "$URL_VIEJA" -f schema_real.sql
--  Se recomienda generar ese dump y comparar antes de migrar.
-- ============================================================


-- ============================================================
--  EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
--  TABLA: categorias
-- ============================================================
create table if not exists categorias (
  id     serial primary key,
  nombre text not null unique,
  activo boolean not null default true
);
alter table categorias add column if not exists activo boolean not null default true;

insert into categorias (nombre) values
  ('Bolsos'), ('Cinturones'), ('Billeteras'), ('Estuches'), ('Relojes'),
  ('Keyboards'), ('Gaming'), ('Audio'), ('Smart'), ('Accesorios')
on conflict do nothing;

-- Lectura publica (storefront la usa para el listado de filtros por
-- categoria). Existia en produccion sin politica RLS explicita en ningun
-- archivo del repo -- se detecto al migrar porque el storefront de la
-- base nueva mostraba "General" en vez del nombre real de categoria.
alter table categorias enable row level security;
drop policy if exists "categorias select publico" on categorias;
create policy "categorias select publico" on categorias for select using (true);

drop policy if exists "categorias insert admin bodega" on categorias;
create policy "categorias insert admin bodega" on categorias
  for insert with check (get_my_role() in ('admin', 'bodega'));

drop policy if exists "categorias update admin bodega" on categorias;
create policy "categorias update admin bodega" on categorias
  for update using (get_my_role() in ('admin', 'bodega'));

drop policy if exists "categorias delete admin bodega" on categorias;
create policy "categorias delete admin bodega" on categorias
  for delete using (get_my_role() in ('admin', 'bodega'));


-- ============================================================
--  TABLA: productos  (con TODAS las columnas actuales)
-- ============================================================
create table if not exists productos (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text    not null,
  sku           text    not null unique,
  descripcion   text,
  precio        numeric(10, 2) not null check (precio >= 0),
  stock         integer not null default 0 check (stock >= 0),
  categoria_id  integer references categorias(id) on delete set null,
  imagen_url    text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Origen del producto (admin vs portal de proveedores).
-- Se agregó el 07/07/2026 directo en Supabase, sin archivo de migración.
alter table productos add column if not exists origen           text default 'admin';
alter table productos add column if not exists proveedor_nombre text;

-- Datos adicionales: colores, tallas, variantes, imágenes extra
alter table productos add column if not exists detalles jsonb default null;

-- Comercial / costos
alter table productos add column if not exists costo              numeric(10, 2);
alter table productos add column if not exists precio_promocional numeric(10, 2);

-- Identificación
alter table productos add column if not exists codigo_barras text;
alter table productos add column if not exists marca         text;
alter table productos add column if not exists mpn           text;

-- Logística
alter table productos add column if not exists peso_kg        numeric(10, 3);
alter table productos add column if not exists alto_cm        numeric(10, 2);
alter table productos add column if not exists ancho_cm       numeric(10, 2);
alter table productos add column if not exists profundidad_cm numeric(10, 2);
alter table productos add column if not exists ubicacion      text;

-- SEO y tienda
alter table productos add column if not exists slug            text;
alter table productos add column if not exists tags            text;
alter table productos add column if not exists seo_titulo      text;
alter table productos add column if not exists seo_descripcion text;
alter table productos add column if not exists envio_gratis    boolean not null default false;

comment on column productos.costo              is 'Precio de compra sin IVA (para calcular utilidad)';
comment on column productos.precio_promocional is 'Precio de oferta; si existe, se muestra en lugar del precio';
comment on column productos.codigo_barras      is 'EAN / UPC para escaneo';
comment on column productos.mpn                is 'Número de pieza del fabricante';
comment on column productos.ubicacion          is 'Ubicación física en bodega';
comment on column productos.slug               is 'Identificador de URL para /tienda/[slug]; si es null se usa el SKU';
comment on column productos.tags               is 'Etiquetas separadas por coma';

-- Slug único solo cuando tiene valor
create unique index if not exists productos_slug_key
  on productos (lower(slug)) where slug is not null;


-- ============================================================
--  VISTA: productos_con_estado
--  OJO: usa p.*, que Postgres EXPANDE al crear la vista.
--  Si se agregan columnas a productos hay que volver a
--  ejecutar este DROP + CREATE o no aparecerán.
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
    coalesce(p.precio_promocional, p.precio) as precio_vigente,
    case when p.costo is not null and p.costo > 0
         then round(coalesce(p.precio_promocional, p.precio) - p.costo, 2)
    end as utilidad,
    case when p.costo is not null and p.costo > 0
         then round(((coalesce(p.precio_promocional, p.precio) - p.costo) / p.costo) * 100, 2)
    end as margen_pct
  from productos p
  left join categorias c on c.id = p.categoria_id;


-- ============================================================
--  TABLA: clientes
-- ============================================================
create table if not exists clientes (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text    not null,
  email         text    not null unique,
  telefono      text,
  ciudad        text,
  direccion     text,
  codigo_postal text,
  estado_region text,
  pais          text    default 'México',
  tag           text    not null default 'Nuevo' check (tag in ('Nuevo', 'Regular', 'VIP')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

alter table clientes add column if not exists direccion     text;
alter table clientes add column if not exists codigo_postal text;
alter table clientes add column if not exists estado_region text;
alter table clientes add column if not exists pais          text default 'México';
alter table clientes add column if not exists deleted_at    timestamptz;


-- ============================================================
--  TABLA: ventas (pedidos)
-- ============================================================
create table if not exists ventas (
  id         uuid primary key default uuid_generate_v4(),
  numero     serial unique,
  cliente_id uuid references clientes(id) on delete set null,
  estado     text not null default 'Pendiente'
               check (estado in ('Pendiente', 'Pagado', 'Enviado', 'Cancelado')),
  total      numeric(10, 2) not null default 0,
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
--  TABLA: venta_items
-- ============================================================
create table if not exists venta_items (
  id          uuid primary key default uuid_generate_v4(),
  venta_id    uuid not null references ventas(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  nombre      text    not null,
  precio      numeric(10, 2) not null,
  cantidad    integer not null default 1 check (cantidad > 0),
  subtotal    numeric(10, 2) generated always as (precio * cantidad) stored
);


-- ============================================================
--  TABLA: envios
-- ============================================================
create table if not exists envios (
  id             uuid primary key default uuid_generate_v4(),
  venta_id       uuid not null references ventas(id) on delete cascade,
  paqueteria     text,
  numero_guia    text,
  estado_envio   text not null default 'Pendiente'
                   check (estado_envio in ('Pendiente', 'En tránsito', 'Entregado', 'Cancelado')),
  direccion      text,
  ciudad_destino text,
  costo_envio    numeric(10, 2) default 0,
  fecha_envio    date,
  fecha_entrega  date,
  created_at     timestamptz not null default now()
);
-- Fix 23/07/2026: la constraint original ('Pendiente','En camino','Entregado',
-- 'Devuelto') no coincidía con los estados que la pantalla /envio-nube
-- realmente usa ('En tránsito', 'Cancelado'), así que esas transiciones
-- fallaban en silencio contra la base real.
alter table envios drop constraint if exists envios_estado_envio_check;
alter table envios add constraint envios_estado_envio_check
  check (estado_envio in ('Pendiente', 'En tránsito', 'Entregado', 'Cancelado'));


-- ============================================================
--  TABLA: user_roles
-- ============================================================
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('admin', 'vendedor', 'bodega', 'proveedor', 'basico')),
  nombre     text not null,
  empresa    text,
  telefono   text,
  created_at timestamptz default now()
);
alter table user_roles drop constraint if exists user_roles_role_check;
alter table user_roles add constraint user_roles_role_check
  check (role in ('admin', 'vendedor', 'bodega', 'proveedor', 'basico'));
alter table user_roles add column if not exists empresa  text;
alter table user_roles add column if not exists telefono text;


-- ============================================================
--  FUNCIONES Y TRIGGERS
-- ============================================================
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid()
$$;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_productos_updated_at on productos;
create trigger trg_productos_updated_at
  before update on productos for each row execute function set_updated_at();

drop trigger if exists trg_clientes_updated_at on clientes;
create trigger trg_clientes_updated_at
  before update on clientes for each row execute function set_updated_at();

drop trigger if exists trg_ventas_updated_at on ventas;
create trigger trg_ventas_updated_at
  before update on ventas for each row execute function set_updated_at();

-- Recalcular total de la venta
create or replace function recalcular_total_venta()
returns trigger language plpgsql as $$
begin
  update ventas
  set total = (
    select coalesce(sum(subtotal), 0) from venta_items
    where venta_id = coalesce(new.venta_id, old.venta_id)
  )
  where id = coalesce(new.venta_id, old.venta_id);
  return null;
end;
$$;

drop trigger if exists trg_recalcular_total on venta_items;
create trigger trg_recalcular_total
  after insert or update or delete on venta_items
  for each row execute function recalcular_total_venta();

-- Descontar stock al confirmar pago
create or replace function descontar_stock()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and new.estado = 'Pagado' then
    update productos p set stock = p.stock - vi.cantidad
    from venta_items vi where vi.venta_id = new.id and vi.producto_id = p.id;
  end if;
  if TG_OP = 'UPDATE' and new.estado = 'Pagado' and old.estado <> 'Pagado' then
    update productos p set stock = p.stock - vi.cantidad
    from venta_items vi where vi.venta_id = new.id and vi.producto_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_descontar_stock on ventas;
create trigger trg_descontar_stock
  after insert or update on ventas
  for each row execute function descontar_stock();

-- Actualizar tag del cliente
create or replace function actualizar_tag_cliente()
returns trigger language plpgsql as $$
declare total_pedidos integer;
begin
  if new.cliente_id is null then return new; end if;
  select count(*) into total_pedidos
  from ventas where cliente_id = new.cliente_id and estado = 'Pagado';
  update clientes set tag =
    case when total_pedidos >= 8 then 'VIP'
         when total_pedidos >= 3 then 'Regular'
         else 'Nuevo' end
  where id = new.cliente_id;
  return new;
end;
$$;

drop trigger if exists trg_actualizar_tag on ventas;
create trigger trg_actualizar_tag
  after insert or update on ventas
  for each row when (new.estado = 'Pagado')
  execute function actualizar_tag_cliente();


-- ============================================================
--  ÍNDICES
-- ============================================================
create index if not exists idx_productos_sku          on productos(sku);
create index if not exists idx_productos_categoria    on productos(categoria_id);
create index if not exists productos_marca_idx        on productos(marca);
create index if not exists productos_codigo_barras_idx on productos(codigo_barras);
create index if not exists idx_ventas_cliente         on ventas(cliente_id);
create index if not exists idx_ventas_estado          on ventas(estado);
create index if not exists idx_venta_items_venta      on venta_items(venta_id);
create index if not exists idx_envios_venta           on envios(venta_id);
create index if not exists idx_clientes_email         on clientes(email);


-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table productos   enable row level security;
alter table clientes    enable row level security;
alter table ventas      enable row level security;
alter table venta_items enable row level security;
alter table envios      enable row level security;
alter table user_roles  enable row level security;

-- user_roles
drop policy if exists "leer rol propio" on user_roles;
create policy "leer rol propio" on user_roles for select using (auth.uid() = user_id);

-- OJO: NO uses `exists (select 1 from user_roles where ...)` aqui.
-- Una politica en user_roles que vuelve a consultar user_roles dispara
-- "infinite recursion detected in policy for relation user_roles" en
-- cuanto una fila no coincide con "leer rol propio" (ej. al listar TODOS
-- los usuarios en Configuracion). get_my_role() es SECURITY DEFINER y
-- evita la auto-referencia.
drop policy if exists "admin gestiona roles" on user_roles;
create policy "admin gestiona roles" on user_roles for all
  using      (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- productos
drop policy if exists "productos select publico" on productos;
create policy "productos select publico" on productos for select using (true);

drop policy if exists "productos insert admin bodega" on productos;
create policy "productos insert admin bodega" on productos
  for insert with check (get_my_role() in ('admin', 'bodega'));

drop policy if exists "productos update admin bodega" on productos;
create policy "productos update admin bodega" on productos
  for update using (get_my_role() in ('admin', 'bodega'));

drop policy if exists "productos delete admin bodega" on productos;
create policy "productos delete admin bodega" on productos
  for delete using (get_my_role() in ('admin', 'bodega'));

-- clientes
drop policy if exists "clientes insert anon storefront" on clientes;
create policy "clientes insert anon storefront" on clientes for insert with check (true);

-- Fix 23/07/2026: "select autenticado" dejaba ver TODOS los clientes a
-- cualquier cuenta logueada, incluidas las de rol 'basico' (clientes reales
-- de la tienda). Se separa en acceso de staff vs acceso al propio registro.
drop policy if exists "clientes select autenticado" on clientes;
drop policy if exists "clientes select staff" on clientes;
create policy "clientes select staff" on clientes
  for select using (get_my_role() in ('admin', 'vendedor'));
drop policy if exists "clientes select propio" on clientes;
create policy "clientes select propio" on clientes
  for select using (email = auth.jwt()->>'email');

drop policy if exists "clientes update admin vendedor" on clientes;
create policy "clientes update admin vendedor" on clientes
  for update using (get_my_role() in ('admin', 'vendedor'));

drop policy if exists "clientes update propio" on clientes;
create policy "clientes update propio" on clientes
  for update using (email = auth.jwt()->>'email')
  with check (email = auth.jwt()->>'email');

drop policy if exists "clientes delete admin vendedor" on clientes;
create policy "clientes delete admin vendedor" on clientes
  for delete using (get_my_role() in ('admin', 'vendedor'));

-- ventas
drop policy if exists "ventas insert anon storefront" on ventas;
create policy "ventas insert anon storefront" on ventas for insert with check (true);

drop policy if exists "ventas select autenticado" on ventas;
drop policy if exists "ventas select staff" on ventas;
create policy "ventas select staff" on ventas
  for select using (get_my_role() in ('admin', 'vendedor'));
drop policy if exists "ventas select propio" on ventas;
create policy "ventas select propio" on ventas
  for select using (cliente_id in (select id from clientes where email = auth.jwt()->>'email'));

drop policy if exists "ventas select proveedor" on ventas;
create policy "ventas select proveedor" on ventas
  for select using (
    get_my_role() = 'proveedor'
    and id in (
      select vi.venta_id from venta_items vi
      join productos p on p.id = vi.producto_id
      join solicitudes_productos sp on sp.producto_sku = p.sku
      where sp.proveedor_email = auth.jwt()->>'email' and sp.estado = 'aprobado'
    )
  );

drop policy if exists "ventas update admin vendedor" on ventas;
create policy "ventas update admin vendedor" on ventas
  for update using (get_my_role() in ('admin', 'vendedor'));

drop policy if exists "ventas delete admin vendedor" on ventas;
create policy "ventas delete admin vendedor" on ventas
  for delete using (get_my_role() in ('admin', 'vendedor'));

-- venta_items
drop policy if exists "venta_items insert anon storefront" on venta_items;
create policy "venta_items insert anon storefront" on venta_items for insert with check (true);

drop policy if exists "venta_items select autenticado" on venta_items;
drop policy if exists "venta_items select staff" on venta_items;
create policy "venta_items select staff" on venta_items
  for select using (get_my_role() in ('admin', 'vendedor'));
drop policy if exists "venta_items select propio" on venta_items;
create policy "venta_items select propio" on venta_items
  for select using (venta_id in (
    select v.id from ventas v join clientes c on c.id = v.cliente_id
    where c.email = auth.jwt()->>'email'
  ));

drop policy if exists "venta_items select proveedor" on venta_items;
create policy "venta_items select proveedor" on venta_items
  for select using (
    get_my_role() = 'proveedor'
    and producto_id in (
      select p.id from productos p
      join solicitudes_productos sp on sp.producto_sku = p.sku
      where sp.proveedor_email = auth.jwt()->>'email' and sp.estado = 'aprobado'
    )
  );

drop policy if exists "venta_items update admin vendedor" on venta_items;
create policy "venta_items update admin vendedor" on venta_items
  for update using (get_my_role() in ('admin', 'vendedor'));

-- envios
drop policy if exists "envios select autenticado" on envios;
drop policy if exists "envios select staff" on envios;
create policy "envios select staff" on envios
  for select using (get_my_role() in ('admin', 'bodega'));
drop policy if exists "envios select propio" on envios;
create policy "envios select propio" on envios
  for select using (venta_id in (
    select v.id from ventas v join clientes c on c.id = v.cliente_id
    where c.email = auth.jwt()->>'email'
  ));

drop policy if exists "envios select proveedor" on envios;
create policy "envios select proveedor" on envios
  for select using (
    get_my_role() = 'proveedor'
    and venta_id in (
      select vi.venta_id from venta_items vi
      join productos p on p.id = vi.producto_id
      join solicitudes_productos sp on sp.producto_sku = p.sku
      where sp.proveedor_email = auth.jwt()->>'email' and sp.estado = 'aprobado'
    )
  );

drop policy if exists "envios write admin bodega" on envios;
create policy "envios write admin bodega" on envios for all
  using      (get_my_role() in ('admin', 'bodega'))
  with check (get_my_role() in ('admin', 'bodega'));


-- ============================================================
--  STORAGE — bucket 'productos'
-- ============================================================
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "imagenes publicas" on storage.objects;
create policy "imagenes publicas" on storage.objects
  for select using (bucket_id = 'productos');

drop policy if exists "auth sube imagenes productos" on storage.objects;
create policy "auth sube imagenes productos" on storage.objects
  for insert with check (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "anon sube solicitudes proveedores" on storage.objects;
create policy "anon sube solicitudes proveedores" on storage.objects
  for insert with check (
    bucket_id = 'productos'
    and auth.role() = 'anon'
    and (storage.foldername(name))[1] = 'solicitudes'
  );

drop policy if exists "auth elimina imagenes productos" on storage.objects;
create policy "auth elimina imagenes productos" on storage.objects
  for delete using (bucket_id = 'productos' and auth.role() = 'authenticated');


-- ============================================================
--  TABLA: config_storefront  (fila única id = 1)
-- ============================================================
create table if not exists config_storefront (
  id             int primary key default 1,
  nombre_tienda  text not null default 'Order Express',
  hero_titulo    text not null default 'Compra tech con estilo express.',
  hero_subtitulo text not null default 'Los mejores accesorios, periféricos y gadgets.',
  hero_cta       text not null default 'Ver productos',
  color_acento   text not null default '#e7226d',
  whatsapp       text default '',
  telefono       text default '',
  email_contacto text default '',
  instagram      text default '',
  facebook       text default '',
  updated_at     timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Personalización del storefront
alter table config_storefront add column if not exists hero_tag1   text default 'Entrega rápida';
alter table config_storefront add column if not exists hero_tag2   text default 'Stock limitado';
alter table config_storefront add column if not exists hero_tag3   text default 'Garantía incluida';
alter table config_storefront add column if not exists nav_ocultar text default '';
alter table config_storefront add column if not exists topbar_btn1 text default 'Nuevo';
alter table config_storefront add column if not exists topbar_btn2 text default 'Ofertas';
alter table config_storefront add column if not exists carrusel    jsonb default '[
  {"img": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1400&q=80", "kicker": "Setup destacado", "title": "Teclados compactos para crear y jugar."},
  {"img": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1400&q=80", "kicker": "Gaming portátil", "title": "Control total en cualquier lugar."},
  {"img": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1400&q=80", "kicker": "Audio premium", "title": "Sonido claro para concentrarte más."}
]'::jsonb;

-- SEO y textos legales
alter table config_storefront add column if not exists meta_titulo         text default '';
alter table config_storefront add column if not exists meta_descripcion    text default '';
alter table config_storefront add column if not exists og_imagen           text default '';
alter table config_storefront add column if not exists politica_envio      text default '';
alter table config_storefront add column if not exists politica_devolucion text default '';
alter table config_storefront add column if not exists terminos            text default '';

alter table config_storefront enable row level security;
insert into config_storefront (id) values (1) on conflict do nothing;

drop policy if exists "publico lee config storefront" on config_storefront;
create policy "publico lee config storefront" on config_storefront for select using (true);

drop policy if exists "auth modifica config storefront" on config_storefront;
create policy "auth modifica config storefront" on config_storefront
  for all using (auth.role() = 'authenticated');


-- ============================================================
--  TABLA: registros (cuentas de clientes de la tienda)
-- ============================================================
create table if not exists registros (
  id         uuid primary key default uuid_generate_v4(),
  nombre     text not null,
  email      text not null unique,
  password   text not null,
  activo     boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table registros add column if not exists updated_at timestamptz default now();
alter table registros enable row level security;

drop policy if exists "publico inserta registro" on registros;
create policy "publico inserta registro" on registros for insert with check (true);

drop policy if exists "publico lee su propio registro" on registros;
create policy "publico lee su propio registro" on registros for select using (true);

drop policy if exists "auth activa registros" on registros;
create policy "auth activa registros" on registros
  for update using (auth.role() = 'authenticated');


-- ============================================================
--  TABLA: solicitudes_productos (portal de proveedores)
-- ============================================================
create table if not exists solicitudes_productos (
  id                   uuid primary key default uuid_generate_v4(),
  proveedor_nombre     text not null,
  proveedor_empresa    text,
  proveedor_email      text not null,
  proveedor_telefono   text,
  producto_nombre      text not null,
  producto_sku         text not null,
  producto_precio      numeric(10,2),
  producto_stock       int,
  producto_descripcion text,
  imagen_url           text,
  categoria_id         int references categorias(id),
  estado               text not null default 'pendiente'
                         check (estado in ('pendiente','aprobado','rechazado')),
  detalles             jsonb default null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- El código de la app usa `imagen_url`. Versiones antiguas del schema
-- la llamaban `producto_imagen_url`; se crean ambas por compatibilidad.
alter table solicitudes_productos add column if not exists imagen_url text;
alter table solicitudes_productos add column if not exists detalles   jsonb default null;
alter table solicitudes_productos add column if not exists updated_at timestamptz default now();

-- Notas internas del admin al aprobar/rechazar. Existia en la base de
-- produccion sin archivo de migracion (agregada a mano); no la usa
-- ninguna pantalla del panel actual, pero el dato historico si la trae.
alter table solicitudes_productos add column if not exists notas_admin text;

drop trigger if exists trg_solicitudes_updated_at on solicitudes_productos;
create trigger trg_solicitudes_updated_at
  before update on solicitudes_productos
  for each row execute function set_updated_at();

alter table solicitudes_productos enable row level security;

drop policy if exists "publico inserta solicitud" on solicitudes_productos;
create policy "publico inserta solicitud" on solicitudes_productos for insert with check (true);

drop policy if exists "publico lee sus solicitudes" on solicitudes_productos;
create policy "publico lee sus solicitudes" on solicitudes_productos for select using (true);

drop policy if exists "auth gestiona solicitudes" on solicitudes_productos;
create policy "auth gestiona solicitudes" on solicitudes_productos
  for all using (auth.role() = 'authenticated');


-- ============================================================
--  TABLA: config_notificaciones
-- ============================================================
create table if not exists config_notificaciones (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  stock_bajo    boolean not null default true,
  nueva_venta   boolean not null default true,
  email_resumen boolean not null default false,
  updated_at    timestamptz default now()
);

alter table config_notificaciones enable row level security;

drop policy if exists "usuario lee sus notificaciones" on config_notificaciones;
create policy "usuario lee sus notificaciones" on config_notificaciones
  for select using (auth.uid() = user_id);

drop policy if exists "usuario gestiona sus notificaciones" on config_notificaciones;
create policy "usuario gestiona sus notificaciones" on config_notificaciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================
--  TABLA: config_metodos_pago (fila única id = 1)
-- ============================================================
create table if not exists config_metodos_pago (
  id            int primary key default 1,
  efectivo      boolean not null default true,
  transferencia boolean not null default true,
  tarjeta       boolean not null default false,
  mercadopago   boolean not null default false,
  paypal        boolean not null default false,
  bbva          boolean not null default false,
  updated_at    timestamptz default now(),
  constraint single_row_metodos check (id = 1)
);
alter table config_metodos_pago add column if not exists paypal boolean not null default false;
alter table config_metodos_pago add column if not exists bbva   boolean not null default false;

alter table config_metodos_pago enable row level security;
insert into config_metodos_pago (id) values (1) on conflict do nothing;

drop policy if exists "publico lee metodos pago" on config_metodos_pago;
create policy "publico lee metodos pago" on config_metodos_pago for select using (true);

drop policy if exists "auth modifica metodos pago" on config_metodos_pago;
create policy "auth modifica metodos pago" on config_metodos_pago
  for all using (auth.role() = 'authenticated');


-- ============================================================
--  TABLA: cart_items (carrito persistente)
-- ============================================================
create table if not exists cart_items (
  id          uuid primary key default uuid_generate_v4(),
  registro_id uuid not null references registros(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  cantidad    int  not null default 1 check (cantidad > 0),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (registro_id, producto_id)
);

alter table cart_items enable row level security;

drop policy if exists "cliente lee su carrito" on cart_items;
create policy "cliente lee su carrito" on cart_items for select using (true);

drop policy if exists "cliente gestiona su carrito" on cart_items;
create policy "cliente gestiona su carrito" on cart_items for all with check (true);

create index if not exists idx_cart_items_registro on cart_items(registro_id);


-- ============================================================
--  AUTO-ALTA EN user_roles PARA SELF-SIGNUP (proveedor / basico)
--  Agregado 23/07/2026. Usado por app/registro/page.tsx (supabase.auth.signUp).
--  El rol se SANITIZA aquí: aunque el metadata del signUp venga manipulado
--  desde el navegador, solo puede terminar en 'proveedor' o 'basico'. Nunca
--  puede autoasignarse 'admin', 'vendedor' o 'bodega' por esta vía.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rol_solicitado text := new.raw_user_meta_data->>'role';
  rol_final text;
begin
  rol_final := case when rol_solicitado in ('proveedor', 'basico') then rol_solicitado else 'basico' end;

  insert into public.user_roles (user_id, role, nombre, empresa, telefono)
  values (
    new.id,
    rol_final,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'empresa',
    new.raw_user_meta_data->>'telefono'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
--  MIGRACIONES CONSOLIDADAS POSTERIORES AL 23/07/2026
--  Todo lo de abajo estaba antes en archivos migration_*.sql
--  sueltos (aplicados uno por uno en Supabase con el paso del
--  tiempo) y se junta aquí para que este archivo sea de nuevo
--  una referencia completa y al día del esquema real. Cada
--  bloque conserva el nombre del archivo original y su fecha,
--  y todas las sentencias son idempotentes (create if not
--  exists / drop+create policy), igual que en el resto del
--  archivo, así que se pueden volver a correr sin problema.
-- ============================================================

-- ---- migration_mensajeria.sql (2026-07-27) ----
-- ============================================================
--  MENSAJERÍA INTERNA: cliente ↔ proveedor, cliente ↔ admin
-- ============================================================

create table if not exists conversaciones (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('cliente_proveedor', 'cliente_admin')),
  cliente_email   text not null,
  cliente_nombre  text,
  proveedor_email text,                                    -- solo para tipo = 'cliente_proveedor'
  venta_id        uuid references ventas(id) on delete set null,
  venta_item_id   uuid references venta_items(id) on delete set null,
  producto_id     uuid references productos(id) on delete set null,  -- conversación iniciada desde la ficha del producto (sin pedido de por medio)
  producto_nombre text,                                    -- snapshot, para mostrar contexto aunque cambie el pedido
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Un solo hilo continuo cliente↔admin por cliente (no uno por pedido)
create unique index if not exists idx_conv_admin_unico
  on conversaciones (cliente_email) where tipo = 'cliente_admin';

-- Evita duplicar el hilo si el cliente vuelve a dar clic en "Contactar proveedor"
-- del mismo producto dentro de un pedido ya hecho
create unique index if not exists idx_conv_prov_unico_pedido
  on conversaciones (cliente_email, proveedor_email, venta_item_id)
  where tipo = 'cliente_proveedor' and venta_item_id is not null;

-- Mismo caso pero cuando el hilo nace desde la ficha pública del producto
-- (sin pedido todavía)
create unique index if not exists idx_conv_prov_unico_producto
  on conversaciones (cliente_email, proveedor_email, producto_id)
  where tipo = 'cliente_proveedor' and venta_item_id is null and producto_id is not null;

create index if not exists idx_conv_cliente   on conversaciones(cliente_email);
create index if not exists idx_conv_proveedor on conversaciones(proveedor_email);

create table if not exists mensajes (
  id               uuid primary key default gen_random_uuid(),
  conversacion_id  uuid not null references conversaciones(id) on delete cascade,
  remitente_tipo   text not null check (remitente_tipo in ('cliente', 'proveedor', 'admin')),
  remitente_email  text,
  remitente_nombre text,
  texto            text not null,
  leido            boolean not null default false,
  created_at       timestamptz default now()
);

create index if not exists idx_mensajes_conversacion on mensajes(conversacion_id, created_at);

-- Actividad reciente: al llegar un mensaje, sube la conversación al tope de la lista
create or replace function public.bump_conversacion_actividad()
returns trigger language plpgsql security definer as $$
begin
  update conversaciones set updated_at = now() where id = new.conversacion_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_conversacion on mensajes;
create trigger trg_bump_conversacion after insert on mensajes
  for each row execute function public.bump_conversacion_actividad();

-- ============================================================
--  RLS
-- ============================================================

alter table conversaciones enable row level security;
alter table mensajes enable row level security;

drop policy if exists "conversaciones select propio" on conversaciones;
create policy "conversaciones select propio" on conversaciones for select using (
  cliente_email = auth.jwt()->>'email'
  or proveedor_email = auth.jwt()->>'email'
  or (tipo = 'cliente_admin' and exists (
    select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'vendedor')
  ))
);

drop policy if exists "conversaciones insert propio" on conversaciones;
create policy "conversaciones insert propio" on conversaciones for insert with check (
  cliente_email = auth.jwt()->>'email'
  or (tipo = 'cliente_admin' and exists (
    select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'vendedor')
  ))
);

drop policy if exists "mensajes select participante" on mensajes;
create policy "mensajes select participante" on mensajes for select using (
  exists (
    select 1 from conversaciones c
    where c.id = mensajes.conversacion_id
      and (
        c.cliente_email = auth.jwt()->>'email'
        or c.proveedor_email = auth.jwt()->>'email'
        or (c.tipo = 'cliente_admin' and exists (
          select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'vendedor')
        ))
      )
  )
);

drop policy if exists "mensajes insert participante" on mensajes;
create policy "mensajes insert participante" on mensajes for insert with check (
  exists (
    select 1 from conversaciones c
    where c.id = mensajes.conversacion_id
      and (
        c.cliente_email = auth.jwt()->>'email'
        or c.proveedor_email = auth.jwt()->>'email'
        or (c.tipo = 'cliente_admin' and exists (
          select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'vendedor')
        ))
      )
  )
);

drop policy if exists "mensajes update leido" on mensajes;
create policy "mensajes update leido" on mensajes for update using (
  exists (
    select 1 from conversaciones c
    where c.id = mensajes.conversacion_id
      and (
        c.cliente_email = auth.jwt()->>'email'
        or c.proveedor_email = auth.jwt()->>'email'
        or (c.tipo = 'cliente_admin' and exists (
          select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'vendedor')
        ))
      )
  )
);

-- Realtime: para que los mensajes nuevos lleguen sin recargar
alter publication supabase_realtime add table mensajes;
alter publication supabase_realtime add table conversaciones;


-- ---- migration_paquetes_envio.sql (2026-07-28) ----
-- ============================================================
--  PAQUETES DE ENVÍO (medidas y peso, registrados por el proveedor)
--  Agregado 27/07/2026
--
--  Un pedido puede tener productos de varios proveedores; cada
--  proveedor empaqueta y envía su propia parte por separado, así
--  que la medida/peso se guarda por línea de venta (venta_item),
--  no por venta completa.
-- ============================================================

create table if not exists paquetes_envio (
  id             uuid primary key default uuid_generate_v4(),
  venta_item_id  uuid not null unique references venta_items(id) on delete cascade,
  proveedor_email text not null,
  alto_cm        numeric(10,2),
  ancho_cm       numeric(10,2),
  peso_kg        numeric(10,2),
  updated_at     timestamptz default now()
);

create index if not exists idx_paquetes_envio_proveedor on paquetes_envio (proveedor_email);

drop trigger if exists trg_paquetes_envio_updated_at on paquetes_envio;
create trigger trg_paquetes_envio_updated_at
  before update on paquetes_envio
  for each row execute function set_updated_at();

alter table paquetes_envio enable row level security;

drop policy if exists "paquetes select admin o dueno" on paquetes_envio;
create policy "paquetes select admin o dueno" on paquetes_envio
  for select using (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

drop policy if exists "paquetes insert admin o dueno" on paquetes_envio;
create policy "paquetes insert admin o dueno" on paquetes_envio
  for insert with check (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

drop policy if exists "paquetes update admin o dueno" on paquetes_envio;
create policy "paquetes update admin o dueno" on paquetes_envio
  for update using (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

alter publication supabase_realtime add table paquetes_envio;


-- ---- migration_transferencias.sql (2026-07-28) ----
-- ============================================================
--  TRANSFERENCIAS DE PRODUCTOS (admin -> proveedor)
--  Agregado 27/07/2026
--
--  El admin puede transferir productos que subió él mismo o que
--  llegaron por importación CSV (origen != 'proveedor') a un
--  proveedor registrado. Nunca se le puede quitar un producto a
--  un proveedor para dárselo a otro (el botón "Transferir" del
--  panel solo ofrece productos con origen distinto de 'proveedor').
--
--  Flujo de doble confirmación:
--  1. Admin selecciona productos + proveedor destino, confirma en
--     un diálogo -> se crea una fila por producto con estado
--     'pendiente' en transferencias_productos. El producto NO
--     cambia de dueño todavía.
--  2. El proveedor ve las transferencias pendientes dirigidas a su
--     email y decide aceptar o rechazar (una por una o el lote
--     completo, agrupadas por lote_id).
--  3. Al aceptar: el producto pasa a origen='proveedor' con ese
--     proveedor_nombre, y se crea una fila aprobada en
--     solicitudes_productos (mismo patrón que una solicitud normal
--     aprobada) para que toda la lógica ya existente (mensajería
--     por SKU, panel "Administración" de pago/envío) funcione sin
--     cambios.
-- ============================================================

create table if not exists transferencias_productos (
  id               uuid primary key default uuid_generate_v4(),
  lote_id          uuid not null default uuid_generate_v4(),
  producto_id      uuid not null references productos(id) on delete cascade,
  producto_nombre  text not null,
  producto_sku     text not null,
  proveedor_email  text not null,
  proveedor_nombre text not null,
  creado_por       uuid references auth.users(id),
  estado           text not null default 'pendiente'
                    check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at       timestamptz default now(),
  respondida_at    timestamptz
);

create index if not exists idx_transferencias_proveedor_estado
  on transferencias_productos (proveedor_email, estado);

alter table transferencias_productos enable row level security;

drop policy if exists "admin crea transferencias" on transferencias_productos;
create policy "admin crea transferencias" on transferencias_productos
  for insert with check (get_my_role() = 'admin');

drop policy if exists "admin lee transferencias" on transferencias_productos;
create policy "admin lee transferencias" on transferencias_productos
  for select using (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

drop policy if exists "admin cancela transferencias" on transferencias_productos;
create policy "admin cancela transferencias" on transferencias_productos
  for delete using (get_my_role() = 'admin' and estado = 'pendiente');

-- ============================================================
--  aceptar_transferencia(id) — solo el proveedor destino, security
--  definer porque también necesita escribir en productos y en
--  solicitudes_productos (tablas que el rol proveedor no puede
--  tocar directamente)
-- ============================================================
create or replace function aceptar_transferencia(transferencia_id uuid)
returns void language plpgsql security definer as $$
declare
  t transferencias_productos%rowtype;
  p productos%rowtype;
begin
  select * into t from transferencias_productos where id = transferencia_id;
  if t.id is null then
    raise exception 'Transferencia no encontrada';
  end if;
  if t.proveedor_email <> (auth.jwt()->>'email') then
    raise exception 'No autorizado';
  end if;
  if t.estado <> 'pendiente' then
    raise exception 'Esta transferencia ya fue respondida';
  end if;

  select * into p from productos where id = t.producto_id;
  if p.id is null then
    raise exception 'El producto ya no existe';
  end if;

  update productos
    set origen = 'proveedor', proveedor_nombre = t.proveedor_nombre
    where id = t.producto_id;

  insert into solicitudes_productos
    (proveedor_nombre, proveedor_email, producto_nombre, producto_sku,
     producto_precio, producto_stock, categoria_id, imagen_url, estado)
  values
    (t.proveedor_nombre, t.proveedor_email, p.nombre, p.sku,
     p.precio, p.stock, p.categoria_id, p.imagen_url, 'aprobado');

  update transferencias_productos
    set estado = 'aceptada', respondida_at = now()
    where id = transferencia_id;
end;
$$;

-- ============================================================
--  rechazar_transferencia(id) — solo el proveedor destino
-- ============================================================
create or replace function rechazar_transferencia(transferencia_id uuid)
returns void language plpgsql security definer as $$
begin
  update transferencias_productos
    set estado = 'rechazada', respondida_at = now()
    where id = transferencia_id
      and proveedor_email = (auth.jwt()->>'email')
      and estado = 'pendiente';
  if not found then
    raise exception 'Transferencia no encontrada o ya respondida';
  end if;
end;
$$;

alter table transferencias_productos add column if not exists lote_id uuid default uuid_generate_v4();

-- Alta a Realtime para que el proveedor vea transferencias nuevas sin recargar
alter publication supabase_realtime add table transferencias_productos;


-- ---- migration_aprobacion_productos.sql (2026-07-29) ----
-- ============================================================
--  MÓDULO 3 — Aprobación de productos: motivo de rechazo + auditoría
--  Agregado en la auditoría del rol Administrador (Q1)
-- ============================================================

alter table solicitudes_productos add column if not exists motivo_rechazo text;
alter table solicitudes_productos add column if not exists revisado_por uuid references auth.users(id);

-- Nota: `updated_at` ya existe y ya se actualiza sola con
-- trg_solicitudes_updated_at (definido en schema_completo.sql) — se
-- reutiliza como "cuándo" se aprobó/rechazó, no hace falta otra columna.


-- ---- migration_bitacora_admin.sql (2026-07-29) ----
-- ============================================================
--  MÓDULO 7 — Bitácora de seguridad (auditoría de acciones sensibles)
--  Agregado en la auditoría del rol Administrador (Q1)
--
--  Alcance: no es una bitácora genérica de TODO el sistema (eso
--  requeriría triggers en cada tabla — cambio de arquitectura mucho
--  más grande). Cubre las acciones de control de acceso, que son las
--  de mayor riesgo real: cambio de rol de usuario, eliminación de
--  acceso, suspensión/reactivación de proveedor.
-- ============================================================

create table if not exists bitacora_admin (
  id              uuid primary key default uuid_generate_v4(),
  usuario_id      uuid references auth.users(id),
  accion          text not null,
  tabla           text not null,
  registro_id     text,
  valor_anterior  text,
  valor_nuevo     text,
  created_at      timestamptz default now()
);

create index if not exists idx_bitacora_admin_created on bitacora_admin (created_at desc);

alter table bitacora_admin enable row level security;

drop policy if exists "bitacora select admin" on bitacora_admin;
create policy "bitacora select admin" on bitacora_admin
  for select using (get_my_role() = 'admin');

drop policy if exists "bitacora insert admin" on bitacora_admin;
create policy "bitacora insert admin" on bitacora_admin
  for insert with check (get_my_role() = 'admin');


-- ---- migration_estado_proveedores.sql (2026-07-29) ----
-- ============================================================
--  MÓDULO 4 — Estado de proveedores (activo / suspendido)
--  Agregado en la auditoría del rol Administrador (Q1)
--
--  No se incluye estado "pendiente" de cuenta: el registro de
--  proveedores es self-signup inmediato (ver /registro), no hay
--  aprobación de cuenta — solo aprobación de productos individuales
--  (eso ya lo cubre solicitudes_productos, Módulo 3).
-- ============================================================

alter table user_roles add column if not exists estado text not null default 'activo';
alter table user_roles drop constraint if exists user_roles_estado_check;
alter table user_roles add constraint user_roles_estado_check check (estado in ('activo', 'suspendido'));


-- ---- migration_historial_pedidos.sql (2026-07-29) ----
-- ============================================================
--  MÓDULO 5 — Gestión de pedidos: estado "Entregado" + historial
--  Agregado en la auditoría del rol Administrador (Q1)
-- ============================================================

alter table ventas drop constraint if exists ventas_estado_check;
alter table ventas add constraint ventas_estado_check
  check (estado in ('Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'));

create table if not exists ventas_historial (
  id             uuid primary key default uuid_generate_v4(),
  venta_id       uuid not null references ventas(id) on delete cascade,
  estado_anterior text,
  estado_nuevo    text not null,
  usuario_id      uuid references auth.users(id),
  comentario      text,
  created_at      timestamptz default now()
);

create index if not exists idx_ventas_historial_venta on ventas_historial (venta_id, created_at desc);

alter table ventas_historial enable row level security;

drop policy if exists "ventas_historial select staff" on ventas_historial;
create policy "ventas_historial select staff" on ventas_historial
  for select using (get_my_role() in ('admin', 'vendedor'));

drop policy if exists "ventas_historial insert staff" on ventas_historial;
create policy "ventas_historial insert staff" on ventas_historial
  for insert with check (get_my_role() in ('admin', 'vendedor'));


-- ---- migration_perfil_proveedor.sql (2026-07-29) ----
-- ============================================================
--  Rol Proveedor — Perfil comercial (Sub-módulo 2)
--  Agregado en la optimización del rol Proveedor + frontend (Q1)
--
--  Extiende `estado` a 4 valores para reflejar mejor el ciclo de
--  vida pedido en el prompt (Pendiente / Activo / Suspendido / En
--  revisión). El default sigue siendo 'activo' — no se cambia el
--  alta automática de /registro, sería una función distinta a lo
--  pedido ("solo mejorar experiencia").
-- ============================================================

alter table user_roles add column if not exists descripcion text;
alter table user_roles add column if not exists redes_sociales jsonb;
alter table user_roles add column if not exists metodos_envio text;

alter table user_roles drop constraint if exists user_roles_estado_check;
alter table user_roles add constraint user_roles_estado_check
  check (estado in ('pendiente', 'activo', 'suspendido', 'en_revision'));

-- No hay política de UPDATE propio en user_roles (por diseño, para que
-- nadie pueda auto-asignarse un rol) — se usa una función security
-- definer nueva y separada de `actualizar_mi_perfil` (que ya existe
-- pero cuya definición exacta no está en este repo — se agregó a mano
-- en algún momento, mismo patrón que otras columnas del proyecto).
-- Esta función solo toca las 3 columnas nuevas, nada más.
create or replace function actualizar_perfil_comercial_proveedor(
  nueva_descripcion text default null,
  nuevas_redes jsonb default null,
  nuevos_metodos_envio text default null
)
returns void language plpgsql security definer as $$
begin
  update user_roles
    set descripcion = coalesce(nueva_descripcion, descripcion),
        redes_sociales = coalesce(nuevas_redes, redes_sociales),
        metodos_envio = coalesce(nuevos_metodos_envio, metodos_envio)
    where user_id = auth.uid();
end;
$$;


-- ---- migration_nav_movil.sql (2026-07-30) ----
-- ============================================================
--  Navegación móvil (barra inferior de la tienda) — editable
--  desde el panel: Tienda en línea > Navegación móvil
-- ============================================================

alter table config_storefront add column if not exists nav_movil jsonb default null;

-- Estructura esperada de nav_movil (todo opcional, con fallback en el código):
-- {
--   "inicio":  { "label": "Inicio",  "icon": "home" },
--   "buscar":  { "label": "Buscar",  "icon": "search" },
--   "rastreo": { "label": "Rastreo", "icon": "truck" },
--   "perfil":  { "label": "Perfil",  "icon": "user-circle" },
--   "extra": [ { "id": "...", "label": "WhatsApp", "icon": "message-circle", "url": "https://...", "nueva_pestana": true } ]
-- }


-- ---- migration_categorias_campos_extra.sql (2026-08-01) ----
-- Fase 2 de "campos contextuales por categoría": permite configurar desde
-- Tienda en línea > Filtros, sin tocar código, qué apartados opcionales
-- (tallas, género, material, etc.) aparecen en el formulario de productos
-- según la categoría padre elegida.

alter table categorias add column if not exists campos_extra jsonb;

-- Semilla: reproduce en la base de datos la configuración de "Ropa" que
-- antes vivía fija en el código (fase 1), para no perder el comportamiento
-- ya probado al pasar a fase 2.
update categorias
set campos_extra = '{
  "icon": "🧵",
  "titulo": "Detalles de ropa",
  "hint": "Tallas, género, material y más — todo opcional",
  "tallas": ["XS", "S", "M", "L", "XL", "XXL", "Único"],
  "grupos": [
    { "label": "Género", "opciones": ["Hombre", "Mujer", "Unisex", "Niño", "Niña"] },
    { "label": "Material / Tela", "opciones": ["Algodón", "Poliéster", "Mezclilla", "Lino", "Lana", "Seda", "Spandex"], "permitirOtro": true },
    { "label": "Temporada", "opciones": ["Primavera/Verano", "Otoño/Invierno", "Todo el año"] },
    { "label": "Tipo de manga / corte", "opciones": ["Manga corta", "Manga larga", "Sin mangas", "Entallado", "Holgado"] }
  ]
}'::jsonb
where lower(trim(nombre)) = 'ropa' and parent_id is null and campos_extra is null;


-- ---- migration_fix_actualizar_mi_perfil.sql (2026-08-04) ----
-- Corrige un error real: en algún momento se creó una segunda versión de
-- `actualizar_mi_perfil` (con `nuevo_avatar_url`) sin borrar la original de
-- un solo parámetro. Con las dos versiones coexistiendo, Postgres no puede
-- decidir cuál usar cuando el frontend llama la función pasando solo
-- `nuevo_nombre` (que es lo que hace siempre que el usuario no cambia su
-- foto) — error real visto en producción: "Could not choose the best
-- candidate function between: actualizar_mi_perfil(nuevo_nombre => text),
-- actualizar_mi_perfil(nuevo_nombre => text, nuevo_avatar_url => text)".
--
-- Se borran ambas versiones y se deja una sola función con el segundo
-- parámetro opcional, para que ambas formas de llamarla (con o sin avatar)
-- resuelvan siempre a la misma función.

drop function if exists actualizar_mi_perfil(text);
drop function if exists actualizar_mi_perfil(text, text);

create or replace function actualizar_mi_perfil(
  nuevo_nombre text,
  nuevo_avatar_url text default null
)
returns void language plpgsql security definer as $$
begin
  update user_roles
    set nombre = nuevo_nombre,
        avatar_url = coalesce(nuevo_avatar_url, avatar_url)
    where user_id = auth.uid();
end;
$$;


-- ---- migration_pausa_proveedor.sql (2026-08-04) ----
-- Permite que un PROVEEDOR pause su propia cuenta (distinto de que el admin
-- lo suspenda): mientras está en pausa, sus productos dejan de aparecer en
-- la tienda, en el catálogo del admin y en sus solicitudes pendientes —
-- pero, a diferencia de una suspensión del admin, el proveedor puede volver
-- a entrar a su portal y reactivarse él mismo en cualquier momento.
--
-- Se usa una columna nueva (`pausado_por_titular`) en vez de reutilizar
-- `estado = 'suspendido'`, porque esa columna ya dispara la pantalla de
-- bloqueo total ("cuenta suspendida, contáctanos") pensada para cuando el
-- ADMIN suspende a alguien — el proveedor no debe poder auto-levantar esa.

alter table user_roles add column if not exists pausado_por_titular boolean not null default false;

-- Liga cada producto a la cuenta de proveedor que lo publicó, para poder
-- ocultarlo/mostrarlo en bloque. Los productos aprobados antes de esta
-- migración quedan sin el enlace (no se pueden pausar retroactivo), los que
-- se aprueben de aquí en adelante sí lo traen.
alter table productos add column if not exists proveedor_email text;
-- Marca los productos que se desactivaron POR la pausa del proveedor (no
-- por una decisión manual del admin) — así, al reactivar, solo se reactivan
-- los que el sistema apagó, sin pisar productos que el admin ya había
-- desactivado por su cuenta.
alter table productos add column if not exists pausado_por_proveedor boolean not null default false;

create index if not exists productos_proveedor_email_idx on productos(proveedor_email);

-- La vista usa `p.*`, así que hay que recrearla para que traiga las columnas nuevas.
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
    coalesce(p.precio_promocional, p.precio) as precio_vigente,
    case when p.costo is not null and p.costo > 0
         then round(coalesce(p.precio_promocional, p.precio) - p.costo, 2)
    end as utilidad,
    case when p.costo is not null and p.costo > 0
         then round(((coalesce(p.precio_promocional, p.precio) - p.costo) / p.costo) * 100, 2)
    end as margen_pct
  from productos p
  left join categorias c on c.id = p.categoria_id;

-- Cuando cambia el estado de pausa de un proveedor (self-pause o suspensión
-- del admin, cualquiera de las dos), apaga/prende en bloque sus productos.
create or replace function fn_sync_pausa_proveedor() returns trigger language plpgsql as $$
declare
  estaba_pausado boolean;
  esta_pausado boolean;
begin
  if NEW.role <> 'proveedor' then
    return NEW;
  end if;
  estaba_pausado := (OLD.estado = 'suspendido' or OLD.pausado_por_titular);
  esta_pausado := (NEW.estado = 'suspendido' or NEW.pausado_por_titular);

  if esta_pausado and not estaba_pausado then
    update productos set activo = false, pausado_por_proveedor = true
      where proveedor_email = NEW.email and activo = true;
  elsif estaba_pausado and not esta_pausado then
    update productos set activo = true, pausado_por_proveedor = false
      where proveedor_email = NEW.email and pausado_por_proveedor = true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_pausa_proveedor on user_roles;
create trigger trg_sync_pausa_proveedor
  after update on user_roles
  for each row execute function fn_sync_pausa_proveedor();


-- ---- migration_solicitudes_actualizacion.sql (2026-08-04) ----
-- Permite que un proveedor pida actualizar un producto YA publicado, sin que
-- el cambio se aplique de inmediato: se guarda como una solicitud más
-- (tipo 'actualizacion'), ligada al producto original vía `producto_id`, y
-- solo se aplica al catálogo cuando el admin la aprueba.

alter table solicitudes_productos add column if not exists tipo text not null default 'nuevo';
alter table solicitudes_productos drop constraint if exists solicitudes_productos_tipo_check;
alter table solicitudes_productos add constraint solicitudes_productos_tipo_check
  check (tipo in ('nuevo', 'actualizacion'));

alter table solicitudes_productos add column if not exists producto_id uuid references productos(id) on delete set null;


-- ---- migration_solicitudes_categorias.sql (2026-08-04) ----
-- Permite que un proveedor pida una categoría o subcategoría que todavía no
-- existe en el catálogo. No se crea sola: queda pendiente hasta que el admin
-- la apruebe desde Tienda en línea > Filtros.

create table if not exists solicitudes_categorias (
  id uuid primary key default gen_random_uuid(),
  proveedor_nombre text not null,
  proveedor_email text not null,
  proveedor_empresa text,
  nombre text not null,
  -- Si parent_id tiene valor, es una solicitud de SUBcategoría de esa
  -- categoría padre (que ya debe existir). Si es null, es una categoría
  -- padre nueva.
  parent_id integer references categorias(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  -- Se llena al aprobar, con el id de la categoría real ya creada.
  categoria_creada_id integer references categorias(id) on delete set null,
  revisado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_categorias_estado_idx on solicitudes_categorias(estado);


-- ---- migration_proteccion_datos_chat.sql (2026-08-05) ----
-- ============================================================
--  PROTECCIÓN DE DATOS EN EL CHAT (cliente ↔ proveedor / admin)
--  Refuerza a nivel de base de datos el mismo filtro que ya corre
--  en el cliente (lib/mensajeria.ts -> detectarDatoDeContacto):
--  bloquea teléfonos, correos, redes sociales y links externos
--  dentro de mensajes.texto, para que nadie pueda saltárselo
--  llamando directo a la API de Supabase.
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
begin
  -- Teléfonos: 7+ dígitos seguidos, tolerando espacios/guiones/paréntesis/puntos entre ellos
  if new.texto ~ '(\d[\s\-.()]*){7,}' then
    raise exception 'No se permite compartir números de teléfono u otros datos numéricos de contacto en el chat.';
  end if;

  -- Correos electrónicos
  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  -- Redes sociales, apps de mensajería y links externos
  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_mensaje on mensajes;
create trigger trg_validar_mensaje before insert or update on mensajes
  for each row execute function public.validar_mensaje_sin_datos_contacto();


-- ---- migration_registro_proveedores.sql (2026-08-05) ----
-- ============================================================
--  REGISTRO DE NUEVOS PROVEEDORES (cuestionario por campaña)
--  Formulario público en /registro-proveedor, solo accesible cuando el
--  admin lo activa desde Configuración → Nuevos proveedores. Las respuestas
--  quedan como "solicitudes de registro" (NO crean cuenta de inmediato) para
--  que el admin las apruebe o rechace con motivo, igual que ya pasa con las
--  solicitudes de productos.
-- ============================================================

create table if not exists solicitudes_registro_proveedor (
  id               uuid primary key default gen_random_uuid(),
  nombre_contacto  text not null,
  email            text not null,
  telefono         text,
  nombre_negocio   text,
  descripcion      text,
  categoria_interes text,
  sitio_o_redes    text,
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo   text,
  revisado_por     uuid,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_solreg_estado on solicitudes_registro_proveedor(estado);
create index if not exists idx_solreg_created on solicitudes_registro_proveedor(created_at desc);

-- Interruptor de la campaña: vive en config_storefront porque ya es la tabla
-- de configuración pública de un solo renglón que usa todo el sitio.
alter table config_storefront add column if not exists registro_proveedor_activo boolean not null default false;

alter table solicitudes_registro_proveedor enable row level security;

-- Cualquiera (incluso sin sesión) puede mandar el formulario — es público por diseño.
drop policy if exists "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor;
create policy "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor
  for insert to anon, authenticated with check (true);

-- Solo admin puede leer y gestionar las solicitudes recibidas.
drop policy if exists "admin lee solicitudes registro proveedor" on solicitudes_registro_proveedor;
create policy "admin lee solicitudes registro proveedor" on solicitudes_registro_proveedor
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

drop policy if exists "admin actualiza solicitudes registro proveedor" on solicitudes_registro_proveedor;
create policy "admin actualiza solicitudes registro proveedor" on solicitudes_registro_proveedor
  for update using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ---- migration_registro_proveedores_fix_grants.sql (2026-08-05) ----
-- ============================================================
--  FIX: el INSERT público a solicitudes_registro_proveedor daba
--  "new row violates row-level security policy" — la policy estaba bien,
--  pero a los roles de Postgres `anon`/`authenticated` les faltaba el
--  GRANT de tabla (RLS solo filtra FILAS; sin el GRANT no hay ni acceso
--  a la tabla). Correr esto después de migration_registro_proveedores.sql.
-- ============================================================

grant select, insert on solicitudes_registro_proveedor to anon, authenticated;
grant update on solicitudes_registro_proveedor to authenticated;


-- ---- migration_registro_proveedores_fix_insert.sql (2026-08-05) ----
-- ============================================================
--  FIX 2: el INSERT público seguía fallando con "violates row-level
--  security policy" incluso después del GRANT. La causa real es la policy
--  en sí — se recrea aquí sin restringir por rol (PUBLIC en vez de
--  "to anon, authenticated"), que es el patrón que ya funciona en
--  mensajes_contacto (formulario de contacto, también público).
-- ============================================================

drop policy if exists "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor;
create policy "publico inserta solicitud registro proveedor"
  on solicitudes_registro_proveedor
  for insert
  with check (true);


-- ---- migration_censura_numeros_chat.sql (2026-08-06) ----
-- ============================================================
--  CAMBIO DE POLÍTICA: los números de teléfono / códigos numéricos en el
--  chat ya NO bloquean el mensaje completo — se censuran en el propio
--  texto antes de guardarlo, para que el número nunca quede visible pero
--  el resto del mensaje sí llegue. Los correos y links/redes se SIGUEN
--  bloqueando por completo (no tiene sentido "censurar" un link a medias).
--
--  Dos pasadas para los números, igual que en lib/mensajeria.ts:
--   1. 6+ dígitos, tolerando también el punto como separador (números tipo
--      "44.71.72.21.46").
--   2. 4-5 dígitos, SIN tolerar el punto — para no comerse los centavos de
--      un precio como "$1,400.00" (con la pasada 1 nunca llega a 6 dígitos
--      seguidos ahí).
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
begin
  new.texto := regexp_replace(new.texto, '\d(?:[\s\-.()/]*\d){5,}', '[número oculto]', 'g');
  new.texto := regexp_replace(new.texto, '\d(?:[\s\-()/]*\d){3,}', '[número oculto]', 'g');

  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

-- El trigger ya existe (trg_validar_mensaje, before insert or update on
-- mensajes) y sigue apuntando a esta misma función — con CREATE OR REPLACE
-- queda actualizado automáticamente, no hace falta tocarlo.


-- ---- migration_fix_filtro_datos_chat.sql (2026-08-06) ----
-- ============================================================
--  FIX: el filtro de teléfonos en el chat se podía evadir de dos formas,
--  confirmado en vivo con mensajes reales que sí se guardaron:
--    1. Separando el número con "/" (ej. "3211/212") — el trigger original
--       solo toleraba espacio, guion, punto y paréntesis entre dígitos,
--       así que la diagonal cortaba la racha de dígitos antes de llegar a 7.
--    2. Un número de exactamente 6 dígitos sin separadores (ej. "212133")
--       — se quedaba un dígito por debajo del umbral de 7.
--  Se corrige quitando los separadores comunes ANTES de contar (así "/" ya
--  no rompe la racha) y bajando el umbral a 6 dígitos seguidos.
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
declare
  solo_numeros text;
begin
  -- Teléfonos / códigos numéricos: se quitan los separadores típicos antes
  -- de contar, para que no sirvan para partir el número y colarlo.
  solo_numeros := regexp_replace(new.texto, '[\s\-.()/]', '', 'g');
  if solo_numeros ~ '\d{6,}' then
    raise exception 'No se permite compartir números de teléfono u otros datos numéricos de contacto en el chat.';
  end if;

  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

-- El trigger ya existe (trg_validar_mensaje) y sigue apuntando a esta misma
-- función — al reemplazarla con CREATE OR REPLACE, el trigger queda
-- actualizado automáticamente, no hace falta recrearlo.


-- ---- migration_seguridad_claves_pago.sql (2026-08-06) ----
-- ============================================================
--  SEGURIDAD: claves de las pasarelas de pago (config_pagos_secretos)
--  Esta tabla nunca tuvo un archivo de migración documentado — se creó a
--  mano en algún momento y no hay forma de confirmar qué política de acceso
--  quedó configurada. Esta migración es idempotente: tira cualquier policy
--  vieja (sin importar el nombre que tuviera) y deja acceso exclusivo para
--  admin, tanto para leer como para insertar/actualizar.
-- ============================================================

alter table config_pagos_secretos enable row level security;

-- Quita TODAS las policies existentes en esta tabla, sea cual sea su nombre,
-- para no dejar una regla vieja y más permisiva conviviendo con la nueva.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'config_pagos_secretos'
  loop
    execute format('drop policy if exists %I on config_pagos_secretos', pol.policyname);
  end loop;
end $$;

create policy "admin lee claves de pago" on config_pagos_secretos
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "admin inserta claves de pago" on config_pagos_secretos
  for insert with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "admin actualiza claves de pago" on config_pagos_secretos
  for update using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- El backend (Route Handlers de checkout/webhooks) sigue leyendo con la
-- service role key, que ignora RLS por completo — no se ve afectado por esto.


-- ---- migration_separar_mensajes_producto.sql (2026-08-06) ----
-- ============================================================
--  Separar mensajes de "soporte técnico / empresa" de los mensajes de
--  admin que en realidad son sobre un producto puntual (los que llegan
--  desde la ficha pública cuando el producto no tiene proveedor real
--  vinculado y se ofrece "Contactar a soporte" en su lugar).
--
--  Hoy solo puede existir UN hilo cliente↔admin por cliente sin importar
--  el motivo — hay que permitir uno general (soporte/empresa) y, aparte,
--  uno por cada producto sobre el que pregunte.
-- ============================================================

drop index if exists idx_conv_admin_unico;

-- Un solo hilo "general" (soporte/técnico/empresa) por cliente — sin producto.
create unique index if not exists idx_conv_admin_unico_general
  on conversaciones (cliente_email)
  where tipo = 'cliente_admin' and producto_id is null;

-- Un hilo por cliente + producto para las preguntas de producto sin proveedor.
create unique index if not exists idx_conv_admin_unico_producto
  on conversaciones (cliente_email, producto_id)
  where tipo = 'cliente_admin' and producto_id is not null;


-- ---- migration_toggle_resumen_inicio.sql (2026-08-06) ----
-- ============================================================
--  Interruptor para mostrar/ocultar el cuadro "Selección curada para tu
--  setup." (kicker + título + subtítulo + badges) que aparece debajo del
--  header en la vista de Inicio del storefront.
-- ============================================================

alter table config_storefront add column if not exists inicio_resumen_activo boolean not null default true;


-- ---- migration_trim_sku_productos.sql (2026-08-06) ----
-- ============================================================
--  FIX RAÍZ: un producto quedó duplicado porque su SKU tenía un espacio al
--  inicio (" LGVTM117" vs "LGVTM117") — como son strings distintos, la
--  restricción `unique` que ya existe en `productos.sku` no lo detectó, y
--  la ficha pública del producto con el SKU roto daba "Producto no
--  encontrado" (el slug llega URL-encodeado como %20LGVTM117).
--
--  Ya se fusionaron manualmente los dos productos duplicados en la base.
--  Este trigger evita que vuelva a pasar: recorta espacios del SKU ANTES
--  de guardar, en cualquier INSERT o UPDATE de `productos` — sin importar
--  si el producto se sube por CSV, alta manual del admin, o aprobación de
--  una solicitud de proveedor (todas pasan por la misma tabla al final).
-- ============================================================

create or replace function public.limpiar_sku_producto()
returns trigger language plpgsql as $$
begin
  if new.sku is not null then
    new.sku := trim(new.sku);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpiar_sku_producto on productos;
create trigger trg_limpiar_sku_producto
  before insert or update on productos
  for each row execute function public.limpiar_sku_producto();


-- ---- migration_ia_uso_imagenes.sql (2026-08-12) ----
-- ============================================================
--  Contador simple de uso diario del botón "Mejorar con IA" (Gemini
--  2.5 Flash Image / "nano banana"), para avisar si nos acercamos al
--  límite gratuito de 500 imágenes/día antes de que se corte solo.
--  Solo lo escribe el servidor (service role, ignora RLS); un admin
--  puede leerlo si hace falta revisar el consumo.
-- ============================================================

create table if not exists ia_uso_imagenes (
  fecha     date primary key,
  contador  int not null default 0
);

alter table ia_uso_imagenes enable row level security;

drop policy if exists "admin lee uso de ia" on ia_uso_imagenes;
create policy "admin lee uso de ia" on ia_uso_imagenes
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ---- migration_stripe.sql (2026-08-12) ----
-- ============================================================
--  Agrega Stripe como cuarta pasarela de pago (Payment Intents,
--  formulario de tarjeta propio con Stripe Elements — sin redirigir
--  al cliente fuera del sitio, a diferencia de Mercado Pago/PayPal).
--
--  Sigue el mismo patrón que las pasarelas existentes:
--  - config_metodos_pago: switch público de si el cliente la ve en el checkout
--  - config_pagos_secretos: credenciales, solo-admin (RLS ya la protege,
--    ver migration_seguridad_claves_pago.sql)
-- ============================================================

alter table config_metodos_pago
  add column if not exists stripe boolean not null default false;

alter table config_pagos_secretos
  add column if not exists stripe_secret_key      text,
  add column if not exists stripe_publishable_key text,
  add column if not exists stripe_webhook_secret   text,
  add column if not exists stripe_mode             text not null default 'sandbox';



-- ============================================================
--  DESPUÉS DE EJECUTAR ESTE ARCHIVO
-- ============================================================
--  1. Crear el usuario admin en Authentication → Users
--  2. Registrar su rol:
--       insert into user_roles (user_id, role, nombre)
--       values ('UUID-DEL-USUARIO', 'admin', 'Nombre Completo');
--  3. Cargar los datos:
--       psql --single-transaction --variable ON_ERROR_STOP=1 \
--            --command 'SET session_replication_role = replica' \
--            --file data.sql --dbname "$URL_NUEVA"
--     (session_replication_role = replica desactiva los triggers;
--      sin eso, trg_descontar_stock volvería a descontar inventario
--      al insertar las ventas históricas)
--  4. Copiar las imágenes del bucket 'productos' (NO van en el dump SQL)
-- ============================================================
