-- Corrige un error real: en algún momento se creó una segunda versión de
-- `actualizar_mi_perfil` (con `nuevo_avatar_url`) sin borrar la original de
-- un solo parámetro. Con las dos versiones coexistiendo, Postgres no puede
-- decidir cuál usar cuando el frontend llama la función pasando solo
-- `nuevo_nombre` (que es lo que hace siempre que el usuario no cambia su
-- foto) — error real visto en producción: "Could not choose the best
-- candidate function between: actualizar_mi_perfil(nuevo_nombre => text),
-- actualizar_mi_perfil(nuevo_nombre => text, nuevo_avatar_url => text)".
--
-- Se borran ambas versiones y se deja una sola función con el segundo
-- parámetro opcional, para que ambas formas de llamarla (con o sin avatar)
-- resuelvan siempre a la misma función.

drop function if exists actualizar_mi_perfil(text);
drop function if exists actualizar_mi_perfil(text, text);

create or replace function actualizar_mi_perfil(
  nuevo_nombre text,
  nuevo_avatar_url text default null
)
returns void language plpgsql security definer as $$
begin
  update user_roles
    set nombre = nuevo_nombre,
        avatar_url = coalesce(nuevo_avatar_url, avatar_url)
    where user_id = auth.uid();
end;
$$;
