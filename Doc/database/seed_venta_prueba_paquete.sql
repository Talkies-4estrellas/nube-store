-- Venta de prueba para poder probar el registro de medidas/peso del
-- paquete en el panel del proveedor. Crea un cliente de prueba (si no
-- existe), una venta ya "Pagado" y una línea con el producto DIC-0012
-- (Tocadiscos), que pertenece al Proveedor de Prueba.

do $$
declare
  v_cliente_id uuid;
  v_venta_id   uuid;
  v_producto   record;
begin
  select id, nombre, precio into v_producto from productos where sku = 'DIC-0012';
  if v_producto.id is null then
    raise exception 'No existe el producto con SKU DIC-0012';
  end if;

  insert into clientes (nombre, email, tag)
  values ('Cliente de Prueba', 'cliente.prueba@ordersexpress.test', 'Nuevo')
  on conflict (email) do update set nombre = excluded.nombre
  returning id into v_cliente_id;

  insert into ventas (cliente_id, estado, notas)
  values (v_cliente_id, 'Pagado', 'Venta de prueba — registro de paquete')
  returning id into v_venta_id;

  insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
  values (v_venta_id, v_producto.id, v_producto.nombre, v_producto.precio, 1);

  raise notice 'Venta creada: %', v_venta_id;
end $$;

-- Verificación
select v.numero, v.estado, v.total, vi.nombre, vi.cantidad, vi.subtotal
from ventas v
join venta_items vi on vi.venta_id = v.id
where vi.producto_id = (select id from productos where sku = 'DIC-0012')
order by v.created_at desc
limit 1;
