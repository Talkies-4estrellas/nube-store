-- ============================================================
--  SEGURIDAD: claves de las pasarelas de pago (config_pagos_secretos)
--  Esta tabla nunca tuvo un archivo de migración documentado — se creó a
--  mano en algún momento y no hay forma de confirmar qué política de acceso
--  quedó configurada. Esta migración es idempotente: tira cualquier policy
--  vieja (sin importar el nombre que tuviera) y deja acceso exclusivo para
--  admin, tanto para leer como para insertar/actualizar.
-- ============================================================

alter table config_pagos_secretos enable row level security;

-- Quita TODAS las policies existentes en esta tabla, sea cual sea su nombre,
-- para no dejar una regla vieja y más permisiva conviviendo con la nueva.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'config_pagos_secretos'
  loop
    execute format('drop policy if exists %I on config_pagos_secretos', pol.policyname);
  end loop;
end $$;

create policy "admin lee claves de pago" on config_pagos_secretos
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "admin inserta claves de pago" on config_pagos_secretos
  for insert with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "admin actualiza claves de pago" on config_pagos_secretos
  for update using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- El backend (Route Handlers de checkout/webhooks) sigue leyendo con la
-- service role key, que ignora RLS por completo — no se ve afectado por esto.
