-- ============================================================
--  FIX: recursión infinita de RLS entre `ventas` y `venta_items`
--  Agregado 27/07/2026
--
--  Síntoma: 500 Internal Server Error al consultar venta_items
--  como proveedor (visible en la consola del navegador:
--  GET .../rest/v1/venta_items?select=... 500).
--
--  Causa: "venta_items select propio" hace subquery sobre `ventas`,
--  y "ventas select proveedor" hace subquery sobre `venta_items` —
--  cada política dispara la evaluación de RLS de la otra tabla,
--  que a su vez vuelve a dispararla, y Postgres corta con
--  "infinite recursion detected in policy for relation ...".
--
--  Arreglo: dos funciones security definer que resuelven la
--  pertenencia SIN pasar por RLS de la tabla contraria (estándar
--  de Postgres para romper este tipo de ciclo). Se usan en vez de
--  las subqueries directas.
-- ============================================================

create or replace function es_venta_de_mi_producto(_venta_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from venta_items vi
    join productos p on p.id = vi.producto_id
    join solicitudes_productos sp on sp.producto_sku = p.sku
    where vi.venta_id = _venta_id
      and sp.proveedor_email = auth.jwt()->>'email'
      and sp.estado = 'aprobado'
  );
$$;

create or replace function es_item_de_mi_producto(_producto_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from productos p
    join solicitudes_productos sp on sp.producto_sku = p.sku
    where p.id = _producto_id
      and sp.proveedor_email = auth.jwt()->>'email'
      and sp.estado = 'aprobado'
  );
$$;

drop policy if exists "ventas select proveedor" on ventas;
create policy "ventas select proveedor" on ventas
  for select using (
    get_my_role() = 'proveedor' and es_venta_de_mi_producto(id)
  );

drop policy if exists "venta_items select proveedor" on venta_items;
create policy "venta_items select proveedor" on venta_items
  for select using (
    get_my_role() = 'proveedor' and es_item_de_mi_producto(producto_id)
  );
