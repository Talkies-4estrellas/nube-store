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
