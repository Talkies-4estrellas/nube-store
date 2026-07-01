-- ============================================================
--  ORDER EXPRESS — Esquema completo de base de datos
--  Compatible con: Supabase (PostgreSQL)
--  Última actualización: 2026-06-29
--  NOTA: Ejecutar auth.sql DESPUÉS de este archivo para
--        aplicar el sistema de roles y RLS actualizado.
-- ============================================================

-- ============================================================
--  EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
--  TABLA: categorias
-- ============================================================
create table if not exists categorias (
  id    serial primary key,
  nombre text not null unique
);

insert into categorias (nombre) values
  ('Bolsos'),
  ('Cinturones'),
  ('Billeteras'),
  ('Estuches'),
  ('Relojes'),
  ('Keyboards'),
  ('Gaming'),
  ('Audio'),
  ('Smart'),
  ('Accesorios')
on conflict do nothing;


-- ============================================================
--  TABLA: productos
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

-- Vista con estado calculado
create or replace view productos_con_estado as
  select
    p.*,
    c.nombre as categoria,
    case
      when p.stock = 0    then 'Sin stock'
      when p.stock <= 3   then 'Stock bajo'
      else                     'Activo'
    end as estado
  from productos p
  left join categorias c on c.id = p.categoria_id;


-- ============================================================
--  TABLA: clientes
-- ============================================================
create table if not exists clientes (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text    not null,
  email       text    not null unique,
  telefono    text,
  ciudad      text,
  tag         text    not null default 'Nuevo' check (tag in ('Nuevo', 'Regular', 'VIP')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ============================================================
--  TABLA: ventas (pedidos)
-- ============================================================
create table if not exists ventas (
  id          uuid primary key default uuid_generate_v4(),
  numero      serial unique,
  cliente_id  uuid references clientes(id) on delete set null,
  estado      text not null default 'Pendiente'
                check (estado in ('Pendiente', 'Pagado', 'Enviado', 'Cancelado')),
  total       numeric(10, 2) not null default 0,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ============================================================
--  TABLA: venta_items (líneas de cada venta)
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
  id              uuid primary key default uuid_generate_v4(),
  venta_id        uuid not null references ventas(id) on delete cascade,
  paqueteria      text,
  numero_guia     text,
  estado_envio    text not null default 'Pendiente'
                    check (estado_envio in ('Pendiente', 'En camino', 'Entregado', 'Devuelto')),
  direccion       text,
  ciudad_destino  text,
  costo_envio     numeric(10, 2) default 0,
  fecha_envio     date,
  fecha_entrega   date,
  created_at      timestamptz not null default now()
);


-- ============================================================
--  TABLA: user_roles  (sistema de autenticación)
--  user_id referencia auth.users de Supabase
-- ============================================================
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('admin', 'vendedor', 'bodega')),
  nombre     text not null,
  created_at timestamptz default now()
);


-- ============================================================
--  FUNCIÓN: get_my_role() — devuelve rol del usuario actual
--  security definer: consulta user_roles saltando RLS
-- ============================================================
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid()
$$;


-- ============================================================
--  FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_productos_updated_at
  before update on productos
  for each row execute function set_updated_at();

create trigger trg_clientes_updated_at
  before update on clientes
  for each row execute function set_updated_at();

create trigger trg_ventas_updated_at
  before update on ventas
  for each row execute function set_updated_at();


-- ============================================================
--  FUNCIÓN: recalcular total de venta al agregar/editar items
-- ============================================================
create or replace function recalcular_total_venta()
returns trigger language plpgsql as $$
begin
  update ventas
  set total = (
    select coalesce(sum(subtotal), 0)
    from venta_items
    where venta_id = coalesce(new.venta_id, old.venta_id)
  )
  where id = coalesce(new.venta_id, old.venta_id);
  return null;
end;
$$;

create trigger trg_recalcular_total
  after insert or update or delete on venta_items
  for each row execute function recalcular_total_venta();


-- ============================================================
--  FUNCIÓN: descontar stock al confirmar pago
-- ============================================================
create or replace function descontar_stock()
returns trigger language plpgsql as $$
begin
  if new.estado = 'Pagado' and old.estado <> 'Pagado' then
    update productos p
    set stock = p.stock - vi.cantidad
    from venta_items vi
    where vi.venta_id = new.id
      and vi.producto_id = p.id;
  end if;
  return new;
end;
$$;

create trigger trg_descontar_stock
  after update on ventas
  for each row execute function descontar_stock();


-- ============================================================
--  FUNCIÓN: actualizar tag del cliente según pedidos pagados
-- ============================================================
create or replace function actualizar_tag_cliente()
returns trigger language plpgsql as $$
declare
  total_pedidos integer;
begin
  select count(*) into total_pedidos
  from ventas
  where cliente_id = new.cliente_id and estado = 'Pagado';

  update clientes set tag =
    case
      when total_pedidos >= 8 then 'VIP'
      when total_pedidos >= 3 then 'Regular'
      else 'Nuevo'
    end
  where id = new.cliente_id;

  return new;
end;
$$;

create trigger trg_actualizar_tag
  after update on ventas
  for each row
  when (new.estado = 'Pagado')
  execute function actualizar_tag_cliente();


-- ============================================================
--  ÍNDICES
-- ============================================================
create index if not exists idx_productos_sku        on productos(sku);
create index if not exists idx_productos_categoria  on productos(categoria_id);
create index if not exists idx_ventas_cliente       on ventas(cliente_id);
create index if not exists idx_ventas_estado        on ventas(estado);
create index if not exists idx_venta_items_venta    on venta_items(venta_id);
create index if not exists idx_envios_venta         on envios(venta_id);
create index if not exists idx_clientes_email       on clientes(email);


-- ============================================================
--  ROW LEVEL SECURITY — habilitar en todas las tablas
-- ============================================================
alter table productos    enable row level security;
alter table clientes     enable row level security;
alter table ventas       enable row level security;
alter table venta_items  enable row level security;
alter table envios       enable row level security;
alter table user_roles   enable row level security;


-- ============================================================
--  RLS: user_roles
-- ============================================================
create policy "leer rol propio" on user_roles for select
  using (auth.uid() = user_id);

create policy "admin gestiona roles" on user_roles for all
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ============================================================
--  RLS: productos
--  • Público (anon): SELECT (storefront)
--  • Admin + Bodega: INSERT / UPDATE / DELETE
-- ============================================================
create policy "productos select publico" on productos
  for select using (true);

create policy "productos insert admin bodega" on productos
  for insert with check (get_my_role() in ('admin', 'bodega'));

create policy "productos update admin bodega" on productos
  for update using (get_my_role() in ('admin', 'bodega'));

create policy "productos delete admin bodega" on productos
  for delete using (get_my_role() in ('admin', 'bodega'));


-- ============================================================
--  RLS: clientes
--  • Anon: INSERT (checkout público del storefront)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE / DELETE
-- ============================================================
create policy "clientes insert anon storefront" on clientes
  for insert with check (true);

create policy "clientes select autenticado" on clientes
  for select using (auth.role() = 'authenticated');

create policy "clientes update admin vendedor" on clientes
  for update using (get_my_role() in ('admin', 'vendedor'));

create policy "clientes delete admin vendedor" on clientes
  for delete using (get_my_role() in ('admin', 'vendedor'));


-- ============================================================
--  RLS: ventas
--  • Anon: INSERT (checkout público)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE / DELETE
-- ============================================================
create policy "ventas insert anon storefront" on ventas
  for insert with check (true);

create policy "ventas select autenticado" on ventas
  for select using (auth.role() = 'authenticated');

create policy "ventas update admin vendedor" on ventas
  for update using (get_my_role() in ('admin', 'vendedor'));

create policy "ventas delete admin vendedor" on ventas
  for delete using (get_my_role() in ('admin', 'vendedor'));


-- ============================================================
--  RLS: venta_items
--  • Anon: INSERT (checkout público)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE
-- ============================================================
create policy "venta_items insert anon storefront" on venta_items
  for insert with check (true);

create policy "venta_items select autenticado" on venta_items
  for select using (auth.role() = 'authenticated');

create policy "venta_items update admin vendedor" on venta_items
  for update using (get_my_role() in ('admin', 'vendedor'));


-- ============================================================
--  RLS: envios
--  • Autenticado: SELECT
--  • Admin + Bodega: INSERT / UPDATE / DELETE
-- ============================================================
create policy "envios select autenticado" on envios
  for select using (auth.role() = 'authenticated');

create policy "envios write admin bodega" on envios
  for all
  using     (get_my_role() in ('admin', 'bodega'))
  with check (get_my_role() in ('admin', 'bodega'));


-- ============================================================
--  STORAGE — bucket para imágenes de productos
--  Crear el bucket manualmente en Supabase Dashboard o via API:
--    insert into storage.buckets (id, name, public)
--    values ('productos', 'productos', true);
-- ============================================================

-- Lectura pública
create policy "imagenes publicas" on storage.objects
  for select using (bucket_id = 'productos');

-- Solo autenticados pueden subir imágenes de productos normales
create policy "auth sube imagenes productos" on storage.objects
  for insert with check (
    bucket_id = 'productos' and auth.role() = 'authenticated'
  );

-- Proveedores anónimos pueden subir solo bajo solicitudes/
create policy "anon sube solicitudes proveedores" on storage.objects
  for insert with check (
    bucket_id = 'productos'
    and auth.role() = 'anon'
    and (storage.foldername(name))[1] = 'solicitudes'
  );

create policy "auth elimina imagenes productos" on storage.objects
  for delete using (
    bucket_id = 'productos' and auth.role() = 'authenticated'
  );


-- ============================================================
--  TABLA: config_storefront
-- ============================================================
create table if not exists config_storefront (
  id              int primary key default 1,
  nombre_tienda   text not null default 'Order Express',
  hero_titulo     text not null default 'Productos de calidad',
  hero_subtitulo  text not null default 'Los mejores productos al mejor precio.',
  hero_cta        text not null default 'Ver productos',
  color_acento    text not null default '#e7226d',
  whatsapp        text default '',
  email_contacto  text default '',
  instagram       text default '',
  updated_at      timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Insertar fila inicial si no existe
insert into config_storefront (id) values (1) on conflict do nothing;

-- Solo admins autenticados pueden modificar; lectura pública para la storefront
create policy "publico lee config storefront" on config_storefront
  for select using (true);

create policy "auth modifica config storefront" on config_storefront
  for all using (auth.role() = 'authenticated');


-- ============================================================
--  CREAR PRIMER USUARIO ADMIN
--  1. Ve a Supabase → Authentication → Users → Add user
--  2. Crea el usuario con email + contraseña
--  3. Copia el UUID y ejecuta:
-- ============================================================

/*
insert into user_roles (user_id, role, nombre) values
  ('REEMPLAZA-CON-UUID-DEL-USUARIO', 'admin', 'Tu Nombre Completo');
*/


-- ============================================================
--  RESUMEN DE PERMISOS POR ROL
-- ============================================================
-- admin    → Dashboard, Ventas, Productos, Clientes, Envíos,
--            Tienda en línea, Punto de venta, Configuración
-- vendedor → Dashboard, Ventas, Clientes
-- bodega   → Productos, Envíos
-- ============================================================
