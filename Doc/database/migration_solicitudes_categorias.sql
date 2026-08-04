-- Permite que un proveedor pida una categoría o subcategoría que todavía no
-- existe en el catálogo. No se crea sola: queda pendiente hasta que el admin
-- la apruebe desde Tienda en línea > Filtros.

create table if not exists solicitudes_categorias (
  id uuid primary key default gen_random_uuid(),
  proveedor_nombre text not null,
  proveedor_email text not null,
  proveedor_empresa text,
  nombre text not null,
  -- Si parent_id tiene valor, es una solicitud de SUBcategoría de esa
  -- categoría padre (que ya debe existir). Si es null, es una categoría
  -- padre nueva.
  parent_id integer references categorias(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  -- Se llena al aprobar, con el id de la categoría real ya creada.
  categoria_creada_id integer references categorias(id) on delete set null,
  revisado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_categorias_estado_idx on solicitudes_categorias(estado);
