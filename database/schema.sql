-- ============================================================
--  ORDER EXPRESS — Esquema de base de datos
--  Compatible con: Supabase (PostgreSQL), Neon, Railway, PlanetScale
--  Fecha: 2026-06-28
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

-- Estado calculado como columna generada
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
  numero      serial unique,                          -- #1001, #1002 …
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
  nombre      text    not null,   -- snapshot del nombre al momento de la venta
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
  paqueteria      text,           -- DHL, FedEx, Estafeta…
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
--  FUNCIÓN: actualizar tag del cliente según pedidos
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
--  ROW LEVEL SECURITY (Supabase)
--  Habilitar para proteger datos por usuario autenticado
-- ============================================================
alter table productos  enable row level security;
alter table clientes   enable row level security;
alter table ventas     enable row level security;
alter table venta_items enable row level security;
alter table envios     enable row level security;

-- Política: solo usuarios autenticados pueden leer y escribir
create policy "Autenticados pueden leer productos"
  on productos for select using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar productos"
  on productos for insert with check (auth.role() = 'authenticated');

create policy "Autenticados pueden actualizar productos"
  on productos for update using (auth.role() = 'authenticated');

create policy "Autenticados pueden eliminar productos"
  on productos for delete using (auth.role() = 'authenticated');

create policy "Autenticados pueden leer clientes"
  on clientes for select using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar clientes"
  on clientes for insert with check (auth.role() = 'authenticated');

create policy "Autenticados pueden actualizar clientes"
  on clientes for update using (auth.role() = 'authenticated');

create policy "Autenticados pueden leer ventas"
  on ventas for select using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar ventas"
  on ventas for insert with check (auth.role() = 'authenticated');

create policy "Autenticados pueden actualizar ventas"
  on ventas for update using (auth.role() = 'authenticated');

create policy "Autenticados pueden leer venta_items"
  on venta_items for select using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar venta_items"
  on venta_items for insert with check (auth.role() = 'authenticated');

create policy "Autenticados pueden leer envios"
  on envios for select using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar envios"
  on envios for insert with check (auth.role() = 'authenticated');

create policy "Autenticados pueden actualizar envios"
  on envios for update using (auth.role() = 'authenticated');


-- ============================================================
--  STORAGE (Supabase) — bucket para imágenes de productos
--  Ejecutar desde el dashboard de Supabase o con la API
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('productos', 'productos', true);
--
-- create policy "Imágenes públicas"
--   on storage.objects for select using (bucket_id = 'productos');
--
-- create policy "Solo autenticados suben imágenes"
--   on storage.objects for insert
--   with check (bucket_id = 'productos' and auth.role() = 'authenticated');
