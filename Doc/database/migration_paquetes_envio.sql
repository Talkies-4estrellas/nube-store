-- ============================================================
--  PAQUETES DE ENVÍO (medidas y peso, registrados por el proveedor)
--  Agregado 27/07/2026
--
--  Un pedido puede tener productos de varios proveedores; cada
--  proveedor empaqueta y envía su propia parte por separado, así
--  que la medida/peso se guarda por línea de venta (venta_item),
--  no por venta completa.
-- ============================================================

create table if not exists paquetes_envio (
  id             uuid primary key default uuid_generate_v4(),
  venta_item_id  uuid not null unique references venta_items(id) on delete cascade,
  proveedor_email text not null,
  alto_cm        numeric(10,2),
  ancho_cm       numeric(10,2),
  peso_kg        numeric(10,2),
  updated_at     timestamptz default now()
);

create index if not exists idx_paquetes_envio_proveedor on paquetes_envio (proveedor_email);

drop trigger if exists trg_paquetes_envio_updated_at on paquetes_envio;
create trigger trg_paquetes_envio_updated_at
  before update on paquetes_envio
  for each row execute function set_updated_at();

alter table paquetes_envio enable row level security;

drop policy if exists "paquetes select admin o dueno" on paquetes_envio;
create policy "paquetes select admin o dueno" on paquetes_envio
  for select using (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

drop policy if exists "paquetes insert admin o dueno" on paquetes_envio;
create policy "paquetes insert admin o dueno" on paquetes_envio
  for insert with check (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

drop policy if exists "paquetes update admin o dueno" on paquetes_envio;
create policy "paquetes update admin o dueno" on paquetes_envio
  for update using (
    get_my_role() = 'admin'
    or proveedor_email = auth.jwt()->>'email'
  );

alter publication supabase_realtime add table paquetes_envio;
