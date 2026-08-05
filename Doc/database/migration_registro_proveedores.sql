-- ============================================================
--  REGISTRO DE NUEVOS PROVEEDORES (cuestionario por campaña)
--  Formulario público en /registro-proveedor, solo accesible cuando el
--  admin lo activa desde Configuración → Nuevos proveedores. Las respuestas
--  quedan como "solicitudes de registro" (NO crean cuenta de inmediato) para
--  que el admin las apruebe o rechace con motivo, igual que ya pasa con las
--  solicitudes de productos.
-- ============================================================

create table if not exists solicitudes_registro_proveedor (
  id               uuid primary key default gen_random_uuid(),
  nombre_contacto  text not null,
  email            text not null,
  telefono         text,
  nombre_negocio   text,
  descripcion      text,
  categoria_interes text,
  sitio_o_redes    text,
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo   text,
  revisado_por     uuid,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_solreg_estado on solicitudes_registro_proveedor(estado);
create index if not exists idx_solreg_created on solicitudes_registro_proveedor(created_at desc);

-- Interruptor de la campaña: vive en config_storefront porque ya es la tabla
-- de configuración pública de un solo renglón que usa todo el sitio.
alter table config_storefront add column if not exists registro_proveedor_activo boolean not null default false;

alter table solicitudes_registro_proveedor enable row level security;

-- Cualquiera (incluso sin sesión) puede mandar el formulario — es público por diseño.
drop policy if exists "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor;
create policy "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor
  for insert to anon, authenticated with check (true);

-- Solo admin puede leer y gestionar las solicitudes recibidas.
drop policy if exists "admin lee solicitudes registro proveedor" on solicitudes_registro_proveedor;
create policy "admin lee solicitudes registro proveedor" on solicitudes_registro_proveedor
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

drop policy if exists "admin actualiza solicitudes registro proveedor" on solicitudes_registro_proveedor;
create policy "admin actualiza solicitudes registro proveedor" on solicitudes_registro_proveedor
  for update using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );
