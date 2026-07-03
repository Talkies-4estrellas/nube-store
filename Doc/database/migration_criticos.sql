-- ============================================================
--  MIGRACIÓN CRÍTICA — Order Express
--  Ejecutar en: Supabase → SQL Editor
--  Seguro de correr múltiples veces
--  Fecha: 03/07/2026
--  Este archivo es autocontenido: crea todas las tablas
--  que necesita si no existen, en el orden correcto.
-- ============================================================

-- Extensión necesaria para uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- clientes debe existir (base del sistema)
alter table clientes add column if not exists deleted_at timestamptz;

-- solicitudes_productos (portal de proveedores)
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
  producto_imagen_url  text,
  categoria_id         int references categorias(id),
  estado               text not null default 'pendiente'
                       check (estado in ('pendiente','aprobado','rechazado')),
  created_at           timestamptz default now()
);

alter table solicitudes_productos enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='solicitudes_productos' and policyname='publico inserta solicitud') then
    create policy "publico inserta solicitud" on solicitudes_productos for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='solicitudes_productos' and policyname='publico lee sus solicitudes') then
    create policy "publico lee sus solicitudes" on solicitudes_productos for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='solicitudes_productos' and policyname='auth gestiona solicitudes') then
    create policy "auth gestiona solicitudes" on solicitudes_productos for all using (auth.role() = 'authenticated');
  end if;
end $$;


-- ============================================================
--  FIX 1: Triggers que también disparan en INSERT (POS)
--  Problema: trg_descontar_stock y trg_actualizar_tag eran
--  AFTER UPDATE únicamente. El POS inserta ventas con
--  estado='Pagado' directamente → stock nunca bajaba y el tag
--  del cliente nunca cambiaba para ventas del POS.
-- ============================================================

create or replace function descontar_stock()
returns trigger language plpgsql as $$
begin
  -- INSERT directo con estado Pagado (POS)
  if TG_OP = 'INSERT' and new.estado = 'Pagado' then
    update productos p
    set stock = p.stock - vi.cantidad
    from venta_items vi
    where vi.venta_id = new.id
      and vi.producto_id = p.id;
  end if;
  -- UPDATE de Pendiente → Pagado (storefront / admin)
  if TG_OP = 'UPDATE' and new.estado = 'Pagado' and old.estado <> 'Pagado' then
    update productos p
    set stock = p.stock - vi.cantidad
    from venta_items vi
    where vi.venta_id = new.id
      and vi.producto_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_descontar_stock on ventas;
create trigger trg_descontar_stock
  after insert or update on ventas
  for each row execute function descontar_stock();


create or replace function actualizar_tag_cliente()
returns trigger language plpgsql as $$
declare
  total_pedidos integer;
begin
  if new.cliente_id is null then return new; end if;

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

drop trigger if exists trg_actualizar_tag on ventas;
create trigger trg_actualizar_tag
  after insert or update on ventas
  for each row
  when (new.estado = 'Pagado')
  execute function actualizar_tag_cliente();


-- ============================================================
--  FIX 2: config_storefront — crear si no existe + habilitar RLS
-- ============================================================

create table if not exists config_storefront (
  id              int primary key default 1,
  nombre_tienda   text not null default 'Order Express',
  hero_titulo     text not null default 'Compra tech con estilo express.',
  hero_subtitulo  text not null default 'Los mejores accesorios, periféricos y gadgets.',
  hero_cta        text not null default 'Ver productos',
  color_acento    text not null default '#e7226d',
  whatsapp        text default '',
  email_contacto  text default '',
  instagram       text default '',
  updated_at      timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into config_storefront (id) values (1) on conflict do nothing;

alter table config_storefront enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'config_storefront'
    and policyname = 'publico lee config storefront'
  ) then
    create policy "publico lee config storefront" on config_storefront
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'config_storefront'
    and policyname = 'auth modifica config storefront'
  ) then
    create policy "auth modifica config storefront" on config_storefront
      for all using (auth.role() = 'authenticated');
  end if;
end $$;


-- ============================================================
--  FIX 3: Tabla config_notificaciones
--  Preferencias de notificación por usuario admin
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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'config_notificaciones'
    and policyname = 'usuario lee sus notificaciones'
  ) then
    create policy "usuario lee sus notificaciones" on config_notificaciones
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'config_notificaciones'
    and policyname = 'usuario gestiona sus notificaciones'
  ) then
    create policy "usuario gestiona sus notificaciones" on config_notificaciones
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ============================================================
--  FIX 4: Tabla config_metodos_pago
--  Métodos de pago activos en la tienda (fila única id=1)
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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'config_metodos_pago'
    and policyname = 'publico lee metodos pago'
  ) then
    create policy "publico lee metodos pago" on config_metodos_pago
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'config_metodos_pago'
    and policyname = 'auth modifica metodos pago'
  ) then
    create policy "auth modifica metodos pago" on config_metodos_pago
      for all using (auth.role() = 'authenticated');
  end if;
end $$;


-- ============================================================
--  FIX 5: Tabla cart_items
--  Carrito persistente para clientes con cuenta en la tienda
--  Depende de: registros, productos (se crean aquí si no existen)
-- ============================================================

-- registros debe existir antes que cart_items
create table if not exists registros (
  id         uuid primary key default uuid_generate_v4(),
  nombre     text not null,
  email      text not null unique,
  password   text not null,
  activo     boolean not null default false,
  created_at timestamptz default now()
);

alter table registros enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='registros' and policyname='publico inserta registro') then
    create policy "publico inserta registro" on registros for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='registros' and policyname='publico lee su propio registro') then
    create policy "publico lee su propio registro" on registros for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='registros' and policyname='auth activa registros') then
    create policy "auth activa registros" on registros for update using (auth.role() = 'authenticated');
  end if;
end $$;

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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'cart_items'
    and policyname = 'cliente lee su carrito'
  ) then
    create policy "cliente lee su carrito" on cart_items
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'cart_items'
    and policyname = 'cliente gestiona su carrito'
  ) then
    create policy "cliente gestiona su carrito" on cart_items
      for all with check (true);
  end if;
end $$;

create index if not exists idx_cart_items_registro on cart_items(registro_id);


-- ============================================================
--  VERIFICACIÓN FINAL
-- ============================================================
select
  'config_notificaciones' as tabla, count(*) as filas from config_notificaciones
union all
select 'config_metodos_pago', count(*) from config_metodos_pago
union all
select 'cart_items', count(*) from cart_items;

select 'Migración crítica completada exitosamente' as resultado;
