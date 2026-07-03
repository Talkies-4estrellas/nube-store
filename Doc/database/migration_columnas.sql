-- ============================================================
--  MIGRACIÓN: columnas faltantes
--  Ejecutar en: Supabase → SQL Editor
--  Seguro de correr múltiples veces (ADD COLUMN IF NOT EXISTS)
--  Fecha: 03/07/2026
-- ============================================================


-- ============================================================
--  1. clientes — dirección completa en el perfil
-- ============================================================
alter table clientes add column if not exists direccion      text;
alter table clientes add column if not exists codigo_postal  text;
alter table clientes add column if not exists estado_region  text;
alter table clientes add column if not exists pais           text default 'México';


-- ============================================================
--  2. config_storefront — teléfono y facebook
-- ============================================================
alter table config_storefront add column if not exists telefono text default '';
alter table config_storefront add column if not exists facebook  text default '';


-- ============================================================
--  3. registros — updated_at
-- ============================================================
alter table registros add column if not exists updated_at timestamptz default now();


-- ============================================================
--  4. solicitudes_productos — updated_at + trigger automático
-- ============================================================
alter table solicitudes_productos add column if not exists updated_at timestamptz default now();

-- Trigger para actualizar updated_at automáticamente al aprobar/rechazar
drop trigger if exists trg_solicitudes_updated_at on solicitudes_productos;
create trigger trg_solicitudes_updated_at
  before update on solicitudes_productos
  for each row execute function set_updated_at();


-- ============================================================
--  VERIFICACIÓN
-- ============================================================
select column_name, data_type
from information_schema.columns
where table_name = 'clientes'
  and column_name in ('direccion','codigo_postal','estado_region','pais')
order by column_name;

select column_name, data_type
from information_schema.columns
where table_name = 'config_storefront'
  and column_name in ('telefono','facebook')
order by column_name;

select column_name from information_schema.columns
where table_name in ('registros','solicitudes_productos')
  and column_name = 'updated_at';

select 'Migración de columnas completada' as resultado;
