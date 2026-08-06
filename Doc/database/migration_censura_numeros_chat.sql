-- ============================================================
--  CAMBIO DE POLÍTICA: los números de teléfono / códigos numéricos en el
--  chat ya NO bloquean el mensaje completo — se censuran en el propio
--  texto antes de guardarlo, para que el número nunca quede visible pero
--  el resto del mensaje sí llegue. Los correos y links/redes se SIGUEN
--  bloqueando por completo (no tiene sentido "censurar" un link a medias).
--
--  Dos pasadas para los números, igual que en lib/mensajeria.ts:
--   1. 6+ dígitos, tolerando también el punto como separador (números tipo
--      "44.71.72.21.46").
--   2. 4-5 dígitos, SIN tolerar el punto — para no comerse los centavos de
--      un precio como "$1,400.00" (con la pasada 1 nunca llega a 6 dígitos
--      seguidos ahí).
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
begin
  new.texto := regexp_replace(new.texto, '\d(?:[\s\-.()/]*\d){5,}', '[número oculto]', 'g');
  new.texto := regexp_replace(new.texto, '\d(?:[\s\-()/]*\d){3,}', '[número oculto]', 'g');

  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

-- El trigger ya existe (trg_validar_mensaje, before insert or update on
-- mensajes) y sigue apuntando a esta misma función — con CREATE OR REPLACE
-- queda actualizado automáticamente, no hace falta tocarlo.
