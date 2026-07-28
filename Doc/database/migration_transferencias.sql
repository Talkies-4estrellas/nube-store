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
