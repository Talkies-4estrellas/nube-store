-- ============================================================
--  FIX RAÍZ: un producto quedó duplicado porque su SKU tenía un espacio al
--  inicio (" LGVTM117" vs "LGVTM117") — como son strings distintos, la
--  restricción `unique` que ya existe en `productos.sku` no lo detectó, y
--  la ficha pública del producto con el SKU roto daba "Producto no
--  encontrado" (el slug llega URL-encodeado como %20LGVTM117).
--
--  Ya se fusionaron manualmente los dos productos duplicados en la base.
--  Este trigger evita que vuelva a pasar: recorta espacios del SKU ANTES
--  de guardar, en cualquier INSERT o UPDATE de `productos` — sin importar
--  si el producto se sube por CSV, alta manual del admin, o aprobación de
--  una solicitud de proveedor (todas pasan por la misma tabla al final).
-- ============================================================

create or replace function public.limpiar_sku_producto()
returns trigger language plpgsql as $$
begin
  if new.sku is not null then
    new.sku := trim(new.sku);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpiar_sku_producto on productos;
create trigger trg_limpiar_sku_producto
  before insert or update on productos
  for each row execute function public.limpiar_sku_producto();
