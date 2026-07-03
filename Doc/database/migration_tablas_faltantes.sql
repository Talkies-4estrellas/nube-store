-- ============================================================
--  MIGRACIÓN: tablas faltantes
--  Ejecutar en: Supabase → SQL Editor
--  Seguro de correr múltiples veces (IF NOT EXISTS)
-- ============================================================

-- 1. Tabla registros (cuentas de clientes en la tienda)
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

-- 2. Tabla solicitudes_productos (portal de proveedores)
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

-- 3. Columna deleted_at en clientes (si no existe)
alter table clientes add column if not exists deleted_at timestamptz;

-- 4. Fila inicial de config_storefront (si no existe)
insert into config_storefront (id) values (1) on conflict do nothing;

select 'Migración completada exitosamente' as resultado;
