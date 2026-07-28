-- Corrección: el pedido de prueba anterior quedó en oepmshop@gmail.com
-- por error de detección automática. Esta versión usa directamente el
-- email real de la cuenta "Cliente de Prueba".

do $$
declare
  v_cliente_email text := 'cliente@ordersexpress.test';
  v_cliente_id    uuid;
  v_venta_id      uuid;
  v_producto      record;
begin
  select id, nombre, precio into v_producto from productos where sku = 'DIC-0012';
  if v_producto.id is null then
    raise exception 'No existe el producto con SKU DIC-0012';
  end if;

  insert into clientes (nombre, email, tag)
  values ('Cliente de Prueba', v_cliente_email, 'Nuevo')
  on conflict (email) do update set nombre = excluded.nombre
  returning id into v_cliente_id;

  insert into ventas (cliente_id, estado, notas)
  values (v_cliente_id, 'Pagado', 'Pedido de prueba — ver detalle y rastreo')
  returning id into v_venta_id;

  insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
  values (v_venta_id, v_producto.id, v_producto.nombre, v_producto.precio, 1);

  insert into envios (venta_id, paqueteria, numero_guia, estado_envio, costo_envio)
  values (v_venta_id, 'DHL', '1234567890', 'En tránsito', 129);

  raise notice 'Pedido de prueba creado para %: %', v_cliente_email, v_venta_id;
end $$;

-- Limpieza: borra el pedido de prueba anterior que quedó en la cuenta
-- equivocada (oepmshop@gmail.com), para no dejar basura de prueba ahí.
delete from ventas
where notas = 'Pedido de prueba — ver detalle y rastreo'
  and cliente_id = (select id from clientes where email = 'oepmshop@gmail.com');

-- Verificación
select v.numero, v.estado, v.total, c.email as cliente_email, e.paqueteria, e.numero_guia, e.estado_envio
from ventas v
join clientes c on c.id = v.cliente_id
left join envios e on e.venta_id = v.id
where c.email = 'cliente@ordersexpress.test'
order by v.created_at desc
limit 1;
