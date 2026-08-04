-- Permite que un PROVEEDOR pause su propia cuenta (distinto de que el admin
-- lo suspenda): mientras está en pausa, sus productos dejan de aparecer en
-- la tienda, en el catálogo del admin y en sus solicitudes pendientes —
-- pero, a diferencia de una suspensión del admin, el proveedor puede volver
-- a entrar a su portal y reactivarse él mismo en cualquier momento.
--
-- Se usa una columna nueva (`pausado_por_titular`) en vez de reutilizar
-- `estado = 'suspendido'`, porque esa columna ya dispara la pantalla de
-- bloqueo total ("cuenta suspendida, contáctanos") pensada para cuando el
-- ADMIN suspende a alguien — el proveedor no debe poder auto-levantar esa.

alter table user_roles add column if not exists pausado_por_titular boolean not null default false;

-- Liga cada producto a la cuenta de proveedor que lo publicó, para poder
-- ocultarlo/mostrarlo en bloque. Los productos aprobados antes de esta
-- migración quedan sin el enlace (no se pueden pausar retroactivo), los que
-- se aprueben de aquí en adelante sí lo traen.
alter table productos add column if not exists proveedor_email text;
-- Marca los productos que se desactivaron POR la pausa del proveedor (no
-- por una decisión manual del admin) — así, al reactivar, solo se reactivan
-- los que el sistema apagó, sin pisar productos que el admin ya había
-- desactivado por su cuenta.
alter table productos add column if not exists pausado_por_proveedor boolean not null default false;

create index if not exists productos_proveedor_email_idx on productos(proveedor_email);

-- La vista usa `p.*`, así que hay que recrearla para que traiga las columnas nuevas.
drop view if exists productos_con_estado;
create view productos_con_estado as
  select
    p.*,
    c.nombre as categoria,
    case
      when p.stock = 0    then 'Sin stock'
      when p.stock <= 3   then 'Stock bajo'
      else                     'Activo'
    end as estado,
    coalesce(p.precio_promocional, p.precio) as precio_vigente,
    case when p.costo is not null and p.costo > 0
         then round(coalesce(p.precio_promocional, p.precio) - p.costo, 2)
    end as utilidad,
    case when p.costo is not null and p.costo > 0
         then round(((coalesce(p.precio_promocional, p.precio) - p.costo) / p.costo) * 100, 2)
    end as margen_pct
  from productos p
  left join categorias c on c.id = p.categoria_id;

-- Cuando cambia el estado de pausa de un proveedor (self-pause o suspensión
-- del admin, cualquiera de las dos), apaga/prende en bloque sus productos.
create or replace function fn_sync_pausa_proveedor() returns trigger language plpgsql as $$
declare
  estaba_pausado boolean;
  esta_pausado boolean;
begin
  if NEW.role <> 'proveedor' then
    return NEW;
  end if;
  estaba_pausado := (OLD.estado = 'suspendido' or OLD.pausado_por_titular);
  esta_pausado := (NEW.estado = 'suspendido' or NEW.pausado_por_titular);

  if esta_pausado and not estaba_pausado then
    update productos set activo = false, pausado_por_proveedor = true
      where proveedor_email = NEW.email and activo = true;
  elsif estaba_pausado and not esta_pausado then
    update productos set activo = true, pausado_por_proveedor = false
      where proveedor_email = NEW.email and pausado_por_proveedor = true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_pausa_proveedor on user_roles;
create trigger trg_sync_pausa_proveedor
  after update on user_roles
  for each row execute function fn_sync_pausa_proveedor();
