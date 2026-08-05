-- ============================================================
--  PROTECCIÓN DE DATOS EN EL CHAT (cliente ↔ proveedor / admin)
--  Refuerza a nivel de base de datos el mismo filtro que ya corre
--  en el cliente (lib/mensajeria.ts -> detectarDatoDeContacto):
--  bloquea teléfonos, correos, redes sociales y links externos
--  dentro de mensajes.texto, para que nadie pueda saltárselo
--  llamando directo a la API de Supabase.
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
begin
  -- Teléfonos: 7+ dígitos seguidos, tolerando espacios/guiones/paréntesis/puntos entre ellos
  if new.texto ~ '(\d[\s\-.()]*){7,}' then
    raise exception 'No se permite compartir números de teléfono u otros datos numéricos de contacto en el chat.';
  end if;

  -- Correos electrónicos
  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  -- Redes sociales, apps de mensajería y links externos
  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_mensaje on mensajes;
create trigger trg_validar_mensaje before insert or update on mensajes
  for each row execute function public.validar_mensaje_sin_datos_contacto();
