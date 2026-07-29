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
