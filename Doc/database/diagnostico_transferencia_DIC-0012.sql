-- Corrección de datos de prueba: unificar el nombre mostrado del proveedor
-- de prueba a "Proveedor de Prueba" (el que tiene su cuenta en user_roles),
-- en vez de "Talkies"/"Miguel" que quedaron de una solicitud de prueba vieja.

update productos
  set proveedor_nombre = 'Proveedor de Prueba'
  where sku = 'DIC-0012';

update solicitudes_productos
  set proveedor_nombre = 'Proveedor de Prueba',
      proveedor_empresa = null
  where producto_sku = 'DIC-0012'
    and proveedor_email = 'proveedor@ordersexpress.test';

-- Verificación
select sku, proveedor_nombre from productos where sku = 'DIC-0012';
select producto_sku, proveedor_nombre, proveedor_empresa from solicitudes_productos where producto_sku = 'DIC-0012';
