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
