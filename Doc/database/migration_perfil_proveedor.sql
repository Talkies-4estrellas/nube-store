-- ============================================================
--  Rol Proveedor — Perfil comercial (Sub-módulo 2)
--  Agregado en la optimización del rol Proveedor + frontend (Q1)
--
--  Extiende `estado` a 4 valores para reflejar mejor el ciclo de
--  vida pedido en el prompt (Pendiente / Activo / Suspendido / En
--  revisión). El default sigue siendo 'activo' — no se cambia el
--  alta automática de /registro, sería una función distinta a lo
--  pedido ("solo mejorar experiencia").
-- ============================================================

alter table user_roles add column if not exists descripcion text;
alter table user_roles add column if not exists redes_sociales jsonb;
alter table user_roles add column if not exists metodos_envio text;

alter table user_roles drop constraint if exists user_roles_estado_check;
alter table user_roles add constraint user_roles_estado_check
  check (estado in ('pendiente', 'activo', 'suspendido', 'en_revision'));

-- No hay política de UPDATE propio en user_roles (por diseño, para que
-- nadie pueda auto-asignarse un rol) — se usa una función security
-- definer nueva y separada de `actualizar_mi_perfil` (que ya existe
-- pero cuya definición exacta no está en este repo — se agregó a mano
-- en algún momento, mismo patrón que otras columnas del proyecto).
-- Esta función solo toca las 3 columnas nuevas, nada más.
create or replace function actualizar_perfil_comercial_proveedor(
  nueva_descripcion text default null,
  nuevas_redes jsonb default null,
  nuevos_metodos_envio text default null
)
returns void language plpgsql security definer as $$
begin
  update user_roles
    set descripcion = coalesce(nueva_descripcion, descripcion),
        redes_sociales = coalesce(nuevas_redes, redes_sociales),
        metodos_envio = coalesce(nuevos_metodos_envio, metodos_envio)
    where user_id = auth.uid();
end;
$$;
