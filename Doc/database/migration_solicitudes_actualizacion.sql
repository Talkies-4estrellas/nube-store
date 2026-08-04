-- Permite que un proveedor pida actualizar un producto YA publicado, sin que
-- el cambio se aplique de inmediato: se guarda como una solicitud más
-- (tipo 'actualizacion'), ligada al producto original vía `producto_id`, y
-- solo se aplica al catálogo cuando el admin la aprueba.

alter table solicitudes_productos add column if not exists tipo text not null default 'nuevo';
alter table solicitudes_productos drop constraint if exists solicitudes_productos_tipo_check;
alter table solicitudes_productos add constraint solicitudes_productos_tipo_check
  check (tipo in ('nuevo', 'actualizacion'));

alter table solicitudes_productos add column if not exists producto_id uuid references productos(id) on delete set null;
