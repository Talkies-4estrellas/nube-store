-- ============================================================
--  ORDER EXPRESS — Autenticación y Roles
--  Ejecutar en Supabase SQL Editor DESPUÉS del schema principal
--
--  NOTA 23/07/2026: las policies "select autenticado" de clientes/ventas/
--  venta_items/envios de este archivo quedaron OBSOLETAS — dejaban ver todo
--  a cualquier cuenta logueada, incluidas las de rol 'basico' (clientes
--  reales). La versión correcta (staff vs "propio", con auth.jwt()->>'email')
--  vive en schema_completo.sql, que es la fuente de verdad actual.
-- ============================================================

-- ---- 1. Tabla de roles ----
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('admin', 'vendedor', 'bodega', 'proveedor', 'basico')),
  nombre     text not null,
  empresa    text,
  telefono   text,
  created_at timestamptz default now()
);
-- Roles agregados 22/07/2026: 'proveedor' (panel /proveedores) y 'basico' (panel /mi-cuenta),
-- para unificar en esta misma tabla la autenticación de proveedores y clientes,
-- que antes vivían fuera de Supabase Auth (localStorage + tabla `registros`).

alter table user_roles enable row level security;

-- Cada usuario puede leer su propio rol
create policy "leer rol propio" on user_roles for select
  using (auth.uid() = user_id);

-- Admin puede ver y gestionar todos los roles
create policy "admin gestiona roles" on user_roles for all
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ---- 2. Función helper de rol (usada en RLS) ----
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid()
$$;


-- ================================================================
--  3. ELIMINAR POLÍTICAS PERMISIVAS ANTIGUAS (anon total)
-- ================================================================
drop policy if exists "Acceso total productos"   on productos;
drop policy if exists "Acceso total clientes"    on clientes;
drop policy if exists "Acceso total ventas"      on ventas;
drop policy if exists "Acceso total venta_items" on venta_items;
drop policy if exists "Acceso total envios"      on envios;


-- ================================================================
--  4. PRODUCTOS
--  • Anon/público: solo SELECT (storefront)
--  • Admin + Bodega: INSERT / UPDATE / DELETE
-- ================================================================
create policy "productos select publico" on productos
  for select using (true);

create policy "productos insert admin bodega" on productos
  for insert with check (get_my_role() in ('admin', 'bodega'));

create policy "productos update admin bodega" on productos
  for update using (get_my_role() in ('admin', 'bodega'));

create policy "productos delete admin bodega" on productos
  for delete using (get_my_role() in ('admin', 'bodega'));


-- ================================================================
--  5. CLIENTES
--  • Anon: INSERT (checkout público del storefront)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE / DELETE
-- ================================================================
create policy "clientes insert anon storefront" on clientes
  for insert with check (true);

create policy "clientes select autenticado" on clientes
  for select using (auth.role() = 'authenticated');

create policy "clientes update admin vendedor" on clientes
  for update using (get_my_role() in ('admin', 'vendedor'));

create policy "clientes delete admin vendedor" on clientes
  for delete using (get_my_role() in ('admin', 'vendedor'));


-- ================================================================
--  6. VENTAS
--  • Anon: INSERT (checkout público)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE / DELETE
-- ================================================================
create policy "ventas insert anon storefront" on ventas
  for insert with check (true);

create policy "ventas select autenticado" on ventas
  for select using (auth.role() = 'authenticated');

create policy "ventas update admin vendedor" on ventas
  for update using (get_my_role() in ('admin', 'vendedor'));

create policy "ventas delete admin vendedor" on ventas
  for delete using (get_my_role() in ('admin', 'vendedor'));


-- ================================================================
--  7. VENTA_ITEMS
--  • Anon: INSERT (checkout público)
--  • Autenticado: SELECT
--  • Admin + Vendedor: UPDATE
-- ================================================================
create policy "venta_items insert anon storefront" on venta_items
  for insert with check (true);

create policy "venta_items select autenticado" on venta_items
  for select using (auth.role() = 'authenticated');

create policy "venta_items update admin vendedor" on venta_items
  for update using (get_my_role() in ('admin', 'vendedor'));


-- ================================================================
--  8. ENVIOS
--  • Autenticado: SELECT
--  • Admin + Bodega: INSERT / UPDATE / DELETE
-- ================================================================
create policy "envios select autenticado" on envios
  for select using (auth.role() = 'authenticated');

create policy "envios write admin bodega" on envios
  for all
  using     (get_my_role() in ('admin', 'bodega'))
  with check (get_my_role() in ('admin', 'bodega'));


-- ================================================================
--  9. STORAGE — imágenes de productos
--  (Mantener o actualizar según sea necesario)
-- ================================================================
-- SELECT (lectura pública del bucket productos) — ya configurado
-- INSERT/DELETE requieren autenticación con rol admin o bodega

drop policy if exists "Anon puede subir imágenes" on storage.objects;
drop policy if exists "Anon puede eliminar imágenes" on storage.objects;

create policy "auth sube imagenes productos" on storage.objects
  for insert with check (
    bucket_id = 'productos' and auth.role() = 'authenticated'
  );

create policy "auth elimina imagenes productos" on storage.objects
  for delete using (
    bucket_id = 'productos' and auth.role() = 'authenticated'
  );


-- ================================================================
--  10. CREAR PRIMER USUARIO ADMIN
--  Pasos:
--  a) Ve a Supabase → Authentication → Users → "Invite user" o "Add user"
--  b) Crea el usuario con email + contraseña
--  c) Copia el UUID del usuario creado
--  d) Ejecuta este INSERT reemplazando el UUID y nombre:
-- ================================================================

/*
insert into user_roles (user_id, role, nombre) values
  ('REEMPLAZA-CON-UUID-DEL-USUARIO', 'admin', 'Tu Nombre Completo');
*/


-- ================================================================
--  11. AUTO-ALTA EN user_roles PARA SELF-SIGNUP (proveedor / basico)
--  Agregado 23/07/2026. Usado por app/registro/page.tsx (supabase.auth.signUp).
--  El rol se SANITIZA aquí: aunque el metadata del signUp venga manipulado
--  desde el navegador, solo puede terminar en 'proveedor' o 'basico'. Nunca
--  puede autoasignarse 'admin', 'vendedor' o 'bodega' por esta vía.
-- ================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rol_solicitado text := new.raw_user_meta_data->>'role';
  rol_final text;
begin
  rol_final := case when rol_solicitado in ('proveedor', 'basico') then rol_solicitado else 'basico' end;

  insert into public.user_roles (user_id, role, nombre, empresa, telefono)
  values (
    new.id,
    rol_final,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'empresa',
    new.raw_user_meta_data->>'telefono'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ================================================================
--  PERMISOS EXTRA DE ROL (resumen)
-- ================================================================
-- admin     → Dashboard, Ventas, Productos, Clientes, Envíos,
--             Tienda en línea, Punto de venta, Configuración
-- vendedor  → Dashboard, Ventas, Clientes
-- bodega    → Productos, Envíos
-- proveedor → /proveedores (portal de proveedores)
-- basico    → /mi-cuenta (panel de cliente)
-- ================================================================
