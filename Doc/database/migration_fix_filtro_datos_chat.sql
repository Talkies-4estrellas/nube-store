-- ============================================================
--  FIX: el filtro de teléfonos en el chat se podía evadir de dos formas,
--  confirmado en vivo con mensajes reales que sí se guardaron:
--    1. Separando el número con "/" (ej. "3211/212") — el trigger original
--       solo toleraba espacio, guion, punto y paréntesis entre dígitos,
--       así que la diagonal cortaba la racha de dígitos antes de llegar a 7.
--    2. Un número de exactamente 6 dígitos sin separadores (ej. "212133")
--       — se quedaba un dígito por debajo del umbral de 7.
--  Se corrige quitando los separadores comunes ANTES de contar (así "/" ya
--  no rompe la racha) y bajando el umbral a 6 dígitos seguidos.
-- ============================================================

create or replace function public.validar_mensaje_sin_datos_contacto()
returns trigger language plpgsql as $$
declare
  solo_numeros text;
begin
  -- Teléfonos / códigos numéricos: se quitan los separadores típicos antes
  -- de contar, para que no sirvan para partir el número y colarlo.
  solo_numeros := regexp_replace(new.texto, '[\s\-.()/]', '', 'g');
  if solo_numeros ~ '\d{6,}' then
    raise exception 'No se permite compartir números de teléfono u otros datos numéricos de contacto en el chat.';
  end if;

  if new.texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No se permite compartir correos electrónicos en el chat.';
  end if;

  if new.texto ~* '(wa\.me|whatsapp|t\.me|telegram|instagram|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok|@[a-z0-9_.]{3,}|https?://|www\.)' then
    raise exception 'No se permite compartir redes sociales ni enlaces externos en el chat.';
  end if;

  return new;
end;
$$;

-- El trigger ya existe (trg_validar_mensaje) y sigue apuntando a esta misma
-- función — al reemplazarla con CREATE OR REPLACE, el trigger queda
-- actualizado automáticamente, no hace falta recrearlo.
