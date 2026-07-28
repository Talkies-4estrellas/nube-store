-- ============================================================
--  FIX: productos importados por CSV marcados como origen='proveedor'
--  Agregado 27/07/2026
--
--  El importador (components/ImportCSVModal.tsx) ponía
--  origen='proveedor' con solo tener texto en la columna "proveedor"
--  del CSV — sin que existiera ninguna cuenta real de proveedor
--  detrás. Eso inflaba el filtro de "Proveedores" en /productos con
--  nombres de proveedores del Excel viejo que nunca se registraron
--  en el sistema, y les daba trato de dueños reales (mensajería,
--  elegibilidad para Transferir, etc.) sin serlo.
--
--  Corregido en el importador (ya no toca `origen`, solo deja
--  `proveedor_nombre` como dato informativo). Este script arregla
--  los productos que ya habían quedado mal marcados: los regresa a
--  origen='admin' salvo los que sí tienen una solicitud aprobada
--  ligada a una cuenta real en user_roles (role='proveedor') —
--  esos SÍ son dueños reales y no se tocan.
-- ============================================================

-- Vista previa antes de aplicar: cuántos productos se van a corregir
select count(*) as productos_a_corregir
from productos p
where p.origen = 'proveedor'
  and not exists (
    select 1
    from solicitudes_productos sp
    join user_roles ur on ur.email = sp.proveedor_email and ur.role = 'proveedor'
    where sp.producto_sku = p.sku and sp.estado = 'aprobado'
  );

-- Aplicar la corrección (mantiene proveedor_nombre como dato informativo)
update productos p
set origen = 'admin'
where p.origen = 'proveedor'
  and not exists (
    select 1
    from solicitudes_productos sp
    join user_roles ur on ur.email = sp.proveedor_email and ur.role = 'proveedor'
    where sp.producto_sku = p.sku and sp.estado = 'aprobado'
  );

-- Verificación: quiénes quedaron como dueños reales después del fix
select distinct proveedor_nombre
from productos
where origen = 'proveedor'
order by proveedor_nombre;
