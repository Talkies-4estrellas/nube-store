-- ============================================================
--  ORDER EXPRESS — Autenticación y Roles
--  Ejecutar en Supabase SQL Editor DESPUÉS del schema principal
-- ============================================================

-- ---- 1. Tabla de roles ----
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('admin', 'vendedor', 'bodega')),
  nombre     text not null,
  created_at timestamptz default now()
);

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
--  PERMISOS EXTRA DE ROL (resumen)
-- ================================================================
-- admin    → Dashboard, Ventas, Productos, Clientes, Envíos,
--            Tienda en línea, Punto de venta, Configuración
-- vendedor → Dashboard, Ventas, Clientes
-- bodega   → Productos, Envíos
-- ================================================================
