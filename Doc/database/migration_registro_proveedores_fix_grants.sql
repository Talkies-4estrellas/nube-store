-- ============================================================
--  FIX: el INSERT público a solicitudes_registro_proveedor daba
--  "new row violates row-level security policy" — la policy estaba bien,
--  pero a los roles de Postgres `anon`/`authenticated` les faltaba el
--  GRANT de tabla (RLS solo filtra FILAS; sin el GRANT no hay ni acceso
--  a la tabla). Correr esto después de migration_registro_proveedores.sql.
-- ============================================================

grant select, insert on solicitudes_registro_proveedor to anon, authenticated;
grant update on solicitudes_registro_proveedor to authenticated;
