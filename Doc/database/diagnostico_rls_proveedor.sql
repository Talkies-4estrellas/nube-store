-- ¿Existen las políticas RLS que permiten a un proveedor ver
-- sus propias ventas / venta_items?
select tablename, policyname, cmd
from pg_policies
where tablename in ('ventas', 'venta_items')
order by tablename, policyname;
