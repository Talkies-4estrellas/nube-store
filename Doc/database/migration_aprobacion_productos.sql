-- ============================================================
--  MÓDULO 3 — Aprobación de productos: motivo de rechazo + auditoría
--  Agregado en la auditoría del rol Administrador (Q1)
-- ============================================================

alter table solicitudes_productos add column if not exists motivo_rechazo text;
alter table solicitudes_productos add column if not exists revisado_por uuid references auth.users(id);

-- Nota: `updated_at` ya existe y ya se actualiza sola con
-- trg_solicitudes_updated_at (definido en schema_completo.sql) — se
-- reutiliza como "cuándo" se aprobó/rechazó, no hace falta otra columna.
