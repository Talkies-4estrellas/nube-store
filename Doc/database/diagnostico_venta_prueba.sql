-- ¿Existe la venta de prueba con el producto DIC-0012?
select v.numero, v.estado, v.total, vi.nombre, vi.cantidad, vi.subtotal, vi.producto_id
from ventas v
join venta_items vi on vi.venta_id = v.id
where vi.producto_id = (select id from productos where sku = 'DIC-0012')
order by v.created_at desc;

-- ¿Sigue aprobada la solicitud del Proveedor de Prueba para ese SKU?
select producto_sku, proveedor_email, estado
from solicitudes_productos
where producto_sku = 'DIC-0012';
