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
  nombre text not null unique
);

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
                   check (estado_envio in ('Pendiente', 'En camino', 'Entregado', 'Devuelto')),
  direccion      text,
  ciudad_destino text,
  costo_envio    numeric(10, 2) default 0,
  fecha_envio    date,
  fecha_entrega  date,
  created_at     timestamptz not null default now()
);


-- ============================================================
--  TABLA: user_roles
-- ============================================================
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('admin', 'vendedor', 'bodega')),
  nombre     text not null,
  created_at timestamptz default now()
);


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

drop policy if exists "clientes select autenticado" on clientes;
create policy "clientes select autenticado" on clientes
  for select using (auth.role() = 'authenticated');

drop policy if exists "clientes update admin vendedor" on clientes;
create policy "clientes update admin vendedor" on clientes
  for update using (get_my_role() in ('admin', 'vendedor'));

drop policy if exists "clientes delete admin vendedor" on clientes;
create policy "clientes delete admin vendedor" on clientes
  for delete using (get_my_role() in ('admin', 'vendedor'));

-- ventas
drop policy if exists "ventas insert anon storefront" on ventas;
create policy "ventas insert anon storefront" on ventas for insert with check (true);

drop policy if exists "ventas select autenticado" on ventas;
create policy "ventas select autenticado" on ventas
  for select using (auth.role() = 'authenticated');

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
create policy "venta_items select autenticado" on venta_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "venta_items update admin vendedor" on venta_items;
create policy "venta_items update admin vendedor" on venta_items
  for update using (get_my_role() in ('admin', 'vendedor'));

-- envios
drop policy if exists "envios select autenticado" on envios;
create policy "envios select autenticado" on envios
  for select using (auth.role() = 'authenticated');

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
  updated_at    timestamptz default now(),
  constraint single_row_metodos check (id = 1)
);

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
