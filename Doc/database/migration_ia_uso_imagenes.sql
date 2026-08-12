-- ============================================================
--  Contador simple de uso diario del botón "Mejorar con IA" (Gemini
--  2.5 Flash Image / "nano banana"), para avisar si nos acercamos al
--  límite gratuito de 500 imágenes/día antes de que se corte solo.
--  Solo lo escribe el servidor (service role, ignora RLS); un admin
--  puede leerlo si hace falta revisar el consumo.
-- ============================================================

create table if not exists ia_uso_imagenes (
  fecha     date primary key,
  contador  int not null default 0
);

alter table ia_uso_imagenes enable row level security;

drop policy if exists "admin lee uso de ia" on ia_uso_imagenes;
create policy "admin lee uso de ia" on ia_uso_imagenes
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );
