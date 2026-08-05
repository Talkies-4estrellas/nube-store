-- ============================================================
--  FIX 2: el INSERT público seguía fallando con "violates row-level
--  security policy" incluso después del GRANT. La causa real es la policy
--  en sí — se recrea aquí sin restringir por rol (PUBLIC en vez de
--  "to anon, authenticated"), que es el patrón que ya funciona en
--  mensajes_contacto (formulario de contacto, también público).
-- ============================================================

drop policy if exists "publico inserta solicitud registro proveedor" on solicitudes_registro_proveedor;
create policy "publico inserta solicitud registro proveedor"
  on solicitudes_registro_proveedor
  for insert
  with check (true);
