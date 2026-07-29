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
